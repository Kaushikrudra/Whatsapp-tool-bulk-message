const Bull = require('bull');
const { pool } = require('../config/db');
const { sendTextMessage } = require('../whatsapp/connection');

// Initialize the Bull queue backed by local Redis (redis://localhost:6379)
const campaignQueue = new Bull('campaign-sender', {
  redis: { host: 'localhost', port: 6379 }
});

/**
 * Appends a zero-width space (\u200B) at a random index in the message.
 * Used for anti-detection variation when bulk campaigns are >= 50 contacts.
 */
function injectZeroWidthSpace(text) {
  if (!text) return '';
  const len = text.length;
  const randomIndex = Math.floor(Math.random() * (len + 1));
  return text.substring(0, randomIndex) + '\u200B' + text.substring(randomIndex);
}

/**
 * Adds a campaign ID to the processing queue.
 * @param {number} campaignId The ID of the campaign to start/resume
 */
async function enqueueCampaign(campaignId) {
  await campaignQueue.add({ campaignId });
}

/**
 * Registers the Bull queue processor.
 * Set concurrency to 1 to guarantee sequential sending as per PRD.
 */
function initQueue() {
  campaignQueue.process(1, async (job) => {
    const { campaignId } = job.data;
    console.log(`[Queue] Starting processing for campaign ID: ${campaignId}`);

    // Fetch the campaign details from the database
    const campaignRes = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1',
      [campaignId]
    );

    if (campaignRes.rows.length === 0) {
      console.warn(`[Queue] Campaign ${campaignId} not found in database.`);
      return;
    }

    const campaign = campaignRes.rows[0];

    // Auto-update status to 'running' on start if it was not running already
    if (campaign.status !== 'running') {
      await pool.query(
        "UPDATE campaigns SET status = 'running', updated_at = now() WHERE id = $1",
        [campaignId]
      );
      await pool.query(
        "INSERT INTO campaign_logs (campaign_id, event_type, message, created_at) VALUES ($1, 'info', 'Campaign started running', now())",
        [campaignId]
      );
    }

    // Fetch the template details
    const templateRes = await pool.query(
      'SELECT body FROM templates WHERE id = $1',
      [campaign.template_id]
    );

    if (templateRes.rows.length === 0) {
      const errorMsg = `Template ID ${campaign.template_id} not found for campaign ${campaignId}.`;
      await pool.query(
        "UPDATE campaigns SET status = 'failed', updated_at = now() WHERE id = $1",
        [campaignId]
      );
      await pool.query(
        "INSERT INTO campaign_logs (campaign_id, event_type, message, created_at) VALUES ($1, 'error', $2, now())",
        [campaignId, errorMsg]
      );
      return;
    }

    const templateBody = templateRes.rows[0].body;

    // Fetch the total number of contacts in this campaign's list to determine size limits (FR-20)
    const totalCountRes = await pool.query(
      'SELECT COUNT(*) FROM contacts WHERE list_id = $1',
      [campaign.list_id]
    );
    const totalContactsInCampaign = parseInt(totalCountRes.rows[0].count, 10);

    // Fetch all contacts in list starting from the last_sent_index offset
    const contactsRes = await pool.query(
      `SELECT * FROM contacts 
       WHERE list_id = $1 AND status = 'queued' 
       ORDER BY id ASC 
       OFFSET $2`,
      [campaign.list_id, campaign.last_sent_index]
    );
    const contacts = contactsRes.rows;

    if (contacts.length === 0) {
      // All contacts already processed
      await pool.query(
        "UPDATE campaigns SET status = 'completed', updated_at = now() WHERE id = $1",
        [campaignId]
      );
      await pool.query(
        "INSERT INTO campaign_logs (campaign_id, event_type, message, created_at) VALUES ($1, 'success', 'Campaign completed successfully (all contacts processed)', now())",
        [campaignId]
      );
      console.log(`[Queue] Campaign ${campaignId} completed. No queued contacts left.`);
      return;
    }

    let consecutiveFails = 0;
    let totalProcessedSoFar = 0;

    for (const contact of contacts) {
      // 1. Re-fetch current campaign status in case it was paused or deleted via UI
      const currentStatusRes = await pool.query(
        'SELECT status FROM campaigns WHERE id = $1',
        [campaignId]
      );
      if (currentStatusRes.rows.length === 0) {
        console.log(`[Queue] Campaign ${campaignId} was deleted. Exiting.`);
        return;
      }
      const currentStatus = currentStatusRes.rows[0].status;
      if (currentStatus === 'paused' || currentStatus === 'completed') {
        console.log(`[Queue] Campaign ${campaignId} is now ${currentStatus}. Exiting processing loop.`);
        return;
      }

      // 2. Check daily messages sent limit (sent_at::date = CURRENT_DATE)
      const dailySentRes = await pool.query(
        "SELECT COUNT(*) FROM contacts WHERE status = 'sent' AND sent_at::date = CURRENT_DATE"
      );
      const dailySent = parseInt(dailySentRes.rows[0].count, 10);
      if (dailySent >= campaign.daily_limit) {
        await pool.query(
          "UPDATE campaigns SET status = 'paused', updated_at = now() WHERE id = $1",
          [campaignId]
        );
        await pool.query(
          `INSERT INTO campaign_logs (campaign_id, event_type, message, created_at) 
           VALUES ($1, 'warning', 'Daily limit reached, campaign paused', now())`,
          [campaignId]
        );
        console.log(`[Queue] Campaign ${campaignId} paused: Daily limit of ${campaign.daily_limit} reached.`);
        return;
      }

      // 3. Resolve template message variables
      let resolvedMessage = templateBody
        .replace(/{name}/g, contact.name || '')
        .replace(/{company}/g, contact.company || '')
        .replace(/{custom1}/g, contact.custom1 || '')
        .replace(/{custom2}/g, contact.custom2 || '');

      // 4. Zero-width space variation for anti-ban if campaign list size is large
      if (totalContactsInCampaign >= 50) {
        resolvedMessage = injectZeroWidthSpace(resolvedMessage);
      }

      totalProcessedSoFar++;

      try {
        // 5. Send message via WhatsApp connection JID (phoneNumber@s.whatsapp.net)
        const recipientJid = `${contact.phone_number}@s.whatsapp.net`;
        await sendTextMessage(recipientJid, resolvedMessage);

        // 6. On success: Update contact status to 'sent'
        await pool.query(
          "UPDATE contacts SET status = 'sent', sent_at = now(), failure_reason = NULL WHERE id = $1",
          [contact.id]
        );
        consecutiveFails = 0;
      } catch (err) {
        // 7. On failure: Update contact status to 'failed' and log
        console.error(`[Queue] Failed to send message to contact ID ${contact.id}:`, err.message);

        await pool.query(
          "UPDATE contacts SET status = 'failed', failure_reason = $1 WHERE id = $2",
          [err.message, contact.id]
        );
        consecutiveFails++;

        await pool.query(
          `INSERT INTO campaign_logs (campaign_id, event_type, message, created_at) 
           VALUES ($1, 'error', $2, now())`,
          [campaignId, `Failed to send to ${contact.phone_number}: ${err.message}`]
        );
      }

      // 8. Update campaign progress index
      await pool.query(
        "UPDATE campaigns SET last_sent_index = last_sent_index + 1, updated_at = now() WHERE id = $1",
        [campaignId]
      );

      // 9. Check consecutive failure safety thresholds
      const failRatio = consecutiveFails / totalProcessedSoFar;
      const thresholdRatio = campaign.consecutive_fail_threshold / 100;
      if (totalProcessedSoFar >= 5 && failRatio > thresholdRatio) {
        await pool.query(
          "UPDATE campaigns SET status = 'paused', updated_at = now() WHERE id = $1",
          [campaignId]
        );
        await pool.query(
          `INSERT INTO campaign_logs (campaign_id, event_type, message, created_at) 
           VALUES ($1, 'warning', 'Consecutive failure threshold exceeded, pausing for safety', now())`,
          [campaignId]
        );
        console.warn(`[Queue] Campaign ${campaignId} paused: safety failure threshold exceeded.`);
        return;
      }

      // 10. Wait random anti-ban delay (unless it's the last contact processed)
      if (totalProcessedSoFar < contacts.length) {
        const delayMs = Math.floor(
          Math.random() * (campaign.max_delay_seconds - campaign.min_delay_seconds + 1) + campaign.min_delay_seconds
        ) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // Check if there are any remaining queued contacts left for this campaign
    const remainingCountRes = await pool.query(
      "SELECT COUNT(*) FROM contacts WHERE list_id = $1 AND status = 'queued'",
      [campaign.list_id]
    );
    const remainingCount = parseInt(remainingCountRes.rows[0].count, 10);

    if (remainingCount === 0) {
      // f. Update campaign status to 'completed'
      await pool.query(
        "UPDATE campaigns SET status = 'completed', updated_at = now() WHERE id = $1",
        [campaignId]
      );
      await pool.query(
        `INSERT INTO campaign_logs (campaign_id, event_type, message, created_at) 
         VALUES ($1, 'success', 'Campaign completed successfully', now())`,
        [campaignId]
      );
      console.log(`[Queue] Campaign ${campaignId} finished processing all contacts successfully.`);
    }
  });
}

module.exports = {
  enqueueCampaign,
  initQueue,
};
