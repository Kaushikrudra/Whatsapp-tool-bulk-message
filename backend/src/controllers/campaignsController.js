const { pool } = require('../config/db');
const { enqueueCampaign } = require('../queue/campaignQueue');

/**
 * Helper to safely escape CSV fields according to standard specifications (RFC 4180).
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) return '';
  const stringVal = String(value);
  if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
}

/**
 * Creates a new campaign record.
 * POST /api/campaigns
 */
async function createCampaign(req, res) {
  try {
    const {
      name,
      template_id,
      list_id,
      scheduled_at,
      min_delay_seconds = 3,
      max_delay_seconds = 8,
      daily_limit = 200,
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Campaign name is required.' });
    }
    if (!template_id) {
      return res.status(400).json({ error: 'Template ID is required.' });
    }
    if (!list_id) {
      return res.status(400).json({ error: 'Contact List ID is required.' });
    }

    // Verify template exists
    const templateCheck = await pool.query('SELECT id FROM templates WHERE id = $1', [template_id]);
    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    // Verify contact list exists
    const listCheck = await pool.query('SELECT id FROM contact_lists WHERE id = $1', [list_id]);
    if (listCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contact List not found.' });
    }

    // Determine starting status: scheduled if in the future, else draft
    let status = 'draft';
    let scheduleTime = null;
    if (scheduled_at) {
      const parsedDate = new Date(scheduled_at);
      if (!isNaN(parsedDate.getTime()) && parsedDate > new Date()) {
        status = 'scheduled';
        scheduleTime = parsedDate;
      }
    }

    const result = await pool.query(
      `INSERT INTO campaigns (name, template_id, list_id, status, scheduled_at, min_delay_seconds, max_delay_seconds, daily_limit, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
       RETURNING *`,
      [
        name.trim(),
        template_id,
        list_id,
        status,
        scheduleTime,
        parseInt(min_delay_seconds, 10),
        parseInt(max_delay_seconds, 10),
        parseInt(daily_limit, 10),
      ]
    );

    const campaign = result.rows[0];

    // Log campaign creation
    await pool.query(
      "INSERT INTO campaign_logs (campaign_id, event_type, message) VALUES ($1, 'info', $2)",
      [campaign.id, `Campaign created in status: ${status}`]
    );

    return res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    return res.status(500).json({ error: 'Failed to create campaign.' });
  }
}

/**
 * Retrieves all campaigns with aggregated contact stats, template name, and list name.
 * GET /api/campaigns
 */
async function getCampaigns(req, res) {
  try {
    const queryText = `
      SELECT 
        c.*,
        t.name as template_name,
        cl.name as list_name,
        COALESCE((SELECT COUNT(*) FROM contacts WHERE list_id = c.list_id), 0)::int as total_contacts,
        COALESCE((SELECT COUNT(*) FROM contacts WHERE list_id = c.list_id AND status = 'sent'), 0)::int as sent_count,
        COALESCE((SELECT COUNT(*) FROM contacts WHERE list_id = c.list_id AND status = 'failed'), 0)::int as failed_count,
        COALESCE((SELECT COUNT(*) FROM contacts WHERE list_id = c.list_id AND status = 'queued'), 0)::int as pending_count
      FROM campaigns c
      LEFT JOIN templates t ON c.template_id = t.id
      LEFT JOIN contact_lists cl ON c.list_id = cl.id
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(queryText);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return res.status(500).json({ error: 'Failed to retrieve campaigns list.' });
  }
}

/**
 * Retrieves details of a specific campaign including paginated contacts and last 50 logs.
 * GET /api/campaigns/:id
 */
async function getCampaignById(req, res) {
  try {
    const campaignId = req.params.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 100;
    const offset = (page - 1) * limit;

    // Fetch the campaign details
    const campaignRes = await pool.query(
      `SELECT c.*, t.name as template_name, cl.name as list_name
       FROM campaigns c
       LEFT JOIN templates t ON c.template_id = t.id
       LEFT JOIN contact_lists cl ON c.list_id = cl.id
       WHERE c.id = $1`,
      [campaignId]
    );

    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }
    const campaign = campaignRes.rows[0];

    // Fetch total count of contacts associated with this list
    const countRes = await pool.query(
      'SELECT COUNT(*) FROM contacts WHERE list_id = $1',
      [campaign.list_id]
    );
    const totalContacts = parseInt(countRes.rows[0].count, 10);

    // Fetch paginated contacts list
    const contactsRes = await pool.query(
      `SELECT phone_number, name, company, status, sent_at, failure_reason 
       FROM contacts 
       WHERE list_id = $1 
       ORDER BY id ASC 
       LIMIT $2 OFFSET $3`,
      [campaign.list_id, limit, offset]
    );

    // Fetch last 50 logs of the campaign
    const logsRes = await pool.query(
      `SELECT * FROM campaign_logs 
       WHERE campaign_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [campaignId]
    );

    return res.json({
      campaign,
      contacts: contactsRes.rows,
      logs: logsRes.rows,
      pagination: {
        page,
        limit,
        total: totalContacts,
        totalPages: Math.ceil(totalContacts / limit),
      }
    });
  } catch (error) {
    console.error('Error fetching campaign details:', error);
    return res.status(500).json({ error: 'Failed to retrieve campaign details.' });
  }
}

/**
 * Triggers/starts a campaign.
 * POST /api/campaigns/:id/launch
 */
async function launchCampaign(req, res) {
  try {
    const campaignId = req.params.id;

    // Fetch campaign details
    const campaignRes = await pool.query('SELECT status, list_id FROM campaigns WHERE id = $1', [campaignId]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const campaign = campaignRes.rows[0];

    // Only allow starting draft or scheduled campaigns
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return res.status(400).json({ error: `Cannot launch a campaign in '${campaign.status}' status.` });
    }

    // Update status to running
    await pool.query(
      "UPDATE campaigns SET status = 'running', updated_at = now() WHERE id = $1",
      [campaignId]
    );

    // Log the start event
    await pool.query(
      "INSERT INTO campaign_logs (campaign_id, event_type, message) VALUES ($1, 'info', 'Campaign launched by user')",
      [campaignId]
    );

    // Enqueue job into Bull queue
    await enqueueCampaign(campaignId);

    return res.json({ success: true, message: 'Campaign launched.' });
  } catch (error) {
    console.error('Error launching campaign:', error);
    return res.status(500).json({ error: 'Failed to launch campaign.' });
  }
}

/**
 * Pauses a running campaign.
 * PATCH /api/campaigns/:id/pause
 */
async function pauseCampaign(req, res) {
  try {
    const campaignId = req.params.id;

    const campaignRes = await pool.query('SELECT status FROM campaigns WHERE id = $1', [campaignId]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const campaign = campaignRes.rows[0];
    if (campaign.status !== 'running') {
      return res.status(400).json({ error: `Cannot pause a campaign that is in '${campaign.status}' status.` });
    }

    await pool.query(
      "UPDATE campaigns SET status = 'paused', updated_at = now() WHERE id = $1",
      [campaignId]
    );

    await pool.query(
      "INSERT INTO campaign_logs (campaign_id, event_type, message) VALUES ($1, 'info', 'Campaign paused by user')",
      [campaignId]
    );

    return res.json({ success: true, message: 'Campaign paused successfully.' });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    return res.status(500).json({ error: 'Failed to pause campaign.' });
  }
}

/**
 * Resumes a paused campaign.
 * PATCH /api/campaigns/:id/resume
 */
async function resumeCampaign(req, res) {
  try {
    const campaignId = req.params.id;

    const campaignRes = await pool.query('SELECT status FROM campaigns WHERE id = $1', [campaignId]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const campaign = campaignRes.rows[0];
    if (campaign.status !== 'paused') {
      return res.status(400).json({ error: `Cannot resume a campaign that is in '${campaign.status}' status.` });
    }

    await pool.query(
      "UPDATE campaigns SET status = 'running', updated_at = now() WHERE id = $1",
      [campaignId]
    );

    await pool.query(
      "INSERT INTO campaign_logs (campaign_id, event_type, message) VALUES ($1, 'info', 'Campaign resumed by user')",
      [campaignId]
    );

    // Re-enqueue the campaign
    await enqueueCampaign(campaignId);

    return res.json({ success: true, message: 'Campaign resumed successfully.' });
  } catch (error) {
    console.error('Error resuming campaign:', error);
    return res.status(500).json({ error: 'Failed to resume campaign.' });
  }
}

/**
 * Deletes a campaign. Only draft or completed campaigns can be deleted.
 * DELETE /api/campaigns/:id
 */
async function deleteCampaign(req, res) {
  try {
    const campaignId = req.params.id;

    const campaignRes = await pool.query('SELECT status FROM campaigns WHERE id = $1', [campaignId]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const campaign = campaignRes.rows[0];
    if (campaign.status === 'running' || campaign.status === 'scheduled') {
      return res.status(400).json({
        error: 'Cannot delete a running or scheduled campaign. Please pause it first.'
      });
    }

    await pool.query('DELETE FROM campaigns WHERE id = $1', [campaignId]);
    return res.json({ success: true, message: 'Campaign deleted successfully.' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return res.status(500).json({ error: 'Failed to delete campaign.' });
  }
}

/**
 * Duplicates an existing campaign configuration as a new draft.
 * POST /api/campaigns/:id/duplicate
 */
async function duplicateCampaign(req, res) {
  try {
    const campaignId = req.params.id;

    const campaignRes = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const original = campaignRes.rows[0];
    const copyName = `${original.name} (Copy)`;

    const duplicateRes = await pool.query(
      `INSERT INTO campaigns (name, template_id, list_id, status, scheduled_at, last_sent_index, min_delay_seconds, max_delay_seconds, daily_limit, consecutive_fail_threshold, created_at, updated_at)
       VALUES ($1, $2, $3, 'draft', NULL, 0, $4, $5, $6, $7, now(), now())
       RETURNING *`,
      [
        copyName,
        original.template_id,
        original.list_id,
        original.min_delay_seconds,
        original.max_delay_seconds,
        original.daily_limit,
        original.consecutive_fail_threshold,
      ]
    );

    const duplicatedCampaign = duplicateRes.rows[0];

    // Log the duplication event
    await pool.query(
      "INSERT INTO campaign_logs (campaign_id, event_type, message) VALUES ($1, 'info', $2)",
      [duplicatedCampaign.id, `Campaign duplicated from original ID: ${campaignId}`]
    );

    return res.status(201).json(duplicatedCampaign);
  } catch (error) {
    console.error('Error duplicating campaign:', error);
    return res.status(500).json({ error: 'Failed to duplicate campaign.' });
  }
}

/**
 * Exports all contacts of the campaign as a CSV file.
 * GET /api/campaigns/:id/export
 */
async function exportCampaignReport(req, res) {
  try {
    const campaignId = req.params.id;

    const campaignRes = await pool.query('SELECT list_id, name FROM campaigns WHERE id = $1', [campaignId]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }
    const campaign = campaignRes.rows[0];

    // Fetch all contacts in list ordered by ID
    const contactsRes = await pool.query(
      `SELECT phone_number, name, company, status, sent_at, failure_reason 
       FROM contacts 
       WHERE list_id = $1 
       ORDER BY id ASC`,
      [campaign.list_id]
    );
    const contacts = contactsRes.rows;

    // Header row
    let csvContent = 'phone_number,name,company,status,sent_at,failure_reason\n';

    // Data rows
    for (const row of contacts) {
      const formattedSentAt = row.sent_at ? new Date(row.sent_at).toISOString() : '';
      csvContent += [
        escapeCSVValue(row.phone_number),
        escapeCSVValue(row.name),
        escapeCSVValue(row.company),
        escapeCSVValue(row.status),
        escapeCSVValue(formattedSentAt),
        escapeCSVValue(row.failure_reason),
      ].join(',') + '\n';
    }

    const sanitizedName = campaign.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${campaignId}-${sanitizedName}-report.csv"`);
    
    return res.send(csvContent);
  } catch (error) {
    console.error('Error exporting campaign report:', error);
    return res.status(500).json({ error: 'Failed to export campaign report.' });
  }
}

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  launchCampaign,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
  duplicateCampaign,
  exportCampaignReport,
};
