/**
 * SUMMARY OF DEBUG LOGS ADDED IN INBOX AUTOMATION SYSTEM HANDLER:
 * Total console.log/console.error statements added/modified: 12
 * 
 * 1. Log at the start of incoming message process (displays phoneNumber and incoming text).
 * 2. Log after thread fetch/create (displays is_ai_enabled, is_manual_override, and ivr_state).
 * 3. Log when manual override is active (skips automation for phoneNumber).
 * 4. Section A: Log checking Away Mode (displays settings.awayModeEnabled) & Log when away message is sent.
 * 5. Section B: Log checking Greeting (displays settings.globalGreetingEnabled and thread.isFirstMessage).
 * 6. Section C: Log checking IVR (displays incomingText and current thread.ivr_state).
 * 7. Section D: Log when bot keyword rule is matched & Log when no keyword rule is matched.
 * 8. Section E: Log checking Gemini AI preconditions (displays is_ai_enabled and geminiApiKey presence).
 * 9. Section E: Log when Gemini AI reply is successfully generated (displays clean aiText length).
 * 10. Section E: Log updated when Gemini API returns response.ok false (displays status code and full error text).
 * 11. Section E: Log when Gemini responds but text is empty/missing.
 * 12. Section F: Log when automation chain finishes without sending any auto-reply.
 */
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion, Browsers } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

// Path to persist session authentication information
const AUTH_INFO_DIR = path.join(__dirname, '../../auth_info');

function randomDelay(minMs, maxMs) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

let sock = null;
let connectionStatus = 'disconnected'; // "connecting", "connected", "disconnected", "reconnecting"
let qrCodeBase64 = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 999;

/**
 * Initializes the WhatsApp socket connection and configures event listeners.
 * @param {boolean} isReconnect Indicates whether this is an automatic reconnect attempt
 */
async function initWhatsApp(isReconnect = false) {
  // Prevent duplicate connection attempts unless it's a planned auto-reconnect
  if (!isReconnect && (connectionStatus === 'connecting' || connectionStatus === 'connected' || connectionStatus === 'reconnecting')) {
    return;
  }

  // Update status
  if (!isReconnect) {
    const credsExist = fs.existsSync(path.join(AUTH_INFO_DIR, 'creds.json'));
    connectionStatus = credsExist ? 'connecting' : 'disconnected';
  }
  qrCodeBase64 = null;

  // Clean up any existing socket event listeners to prevent memory leaks
  if (sock) {
    try {
      sock.ev.removeAllListeners('connection.update');
      sock.ev.removeAllListeners('creds.update');
    } catch (err) {
      // Ignore cleanup errors
    }
  }

  // Ensure the auth_info folder exists
  if (!fs.existsSync(AUTH_INFO_DIR)) {
    fs.mkdirSync(AUTH_INFO_DIR, { recursive: true });
  }

  // Retrieve existing auth state or initialize new state
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_INFO_DIR);

  // Fetch the latest WhatsApp Web version to avoid outdated client connection failure (Error 405)
  let version = [2, 3000, 1015970007]; // Default fallback
  try {
    const { version: latestVersion } = await fetchLatestWaWebVersion({});
    if (latestVersion) {
      version = latestVersion;
    }
  } catch (err) {
    console.warn('Failed to fetch latest WhatsApp Web version dynamically, using fallback:', err.message);
  }

  try {
    // Create WhatsApp socket connection with silent logger and stable browser settings
    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.macOS('Desktop'),
      logger: pino({ level: 'silent' }),
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 30000,
    });

    // Listen for connection state changes (connecting, QR generation, open, close)
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Handle QR Code generation
      if (qr) {
        try {
          qrCodeBase64 = await QRCode.toDataURL(qr);
          console.log('Waiting for QR scan...');
        } catch (err) {
          console.error('Failed to generate QR base64 data URL:', err);
        }
      }

      // Handle Connection States
      if (connection === 'connecting') {
        if (connectionStatus !== 'reconnecting') {
          connectionStatus = 'connecting';
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        qrCodeBase64 = null; // Clear QR code as connection is established
        reconnectAttempts = 0; // Reset reconnection attempts counter
        console.log('WhatsApp connected!');
        
        // Log connection to database
        try {
          const { pool } = require('../config/db');
          await pool.query(
            "INSERT INTO campaign_logs (campaign_id, event_type, message, created_at) VALUES (NULL, 'success', 'WhatsApp connection established successfully', now())"
          );
        } catch (dbErr) {
          console.error('Failed to log WhatsApp connection event:', dbErr.message);
        }
      } else if (connection === 'close') {
        qrCodeBase64 = null;
        const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          reconnectAttempts++;
          connectionStatus = 'reconnecting';
          const delayMs = reconnectAttempts <= 3 ? 5000 : 10000;
          console.log(`Connection closed. Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delayMs / 1000} seconds...`);
          
          // Wait before trying to reconnect
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          initWhatsApp(true);
        } else {
          connectionStatus = 'disconnected';
          console.log('WhatsApp disconnected (logged out). Cleaning session credentials and generating new QR...');
          
          // Log logout
          try {
            const { pool } = require('../config/db');
            await pool.query(
              "INSERT INTO campaign_logs (campaign_id, event_type, message, created_at) VALUES (NULL, 'info', 'WhatsApp session unlinked/logged out', now())"
            );
          } catch (dbErr) {
            console.error('Failed to log WhatsApp logout event:', dbErr.message);
          }

          // Clean up auth credentials files after phone logout
          if (fs.existsSync(AUTH_INFO_DIR)) {
            try {
              fs.rmSync(AUTH_INFO_DIR, { recursive: true, force: true });
              fs.mkdirSync(AUTH_INFO_DIR, { recursive: true });
            } catch (err) {
              console.error('Failed to clear auth_info folder after phone logout:', err);
            }
          }
          
          // Re-initialize to generate a new QR code automatically
          initWhatsApp();
        }
      }
    });

    // Listen for credential changes and save them
    sock.ev.on('creds.update', saveCreds);

    // Listen for messages to save to the database
    sock.ev.on('messages.upsert', async (upsert) => {
      const { messages: upsertMessages, type } = upsert;
      if (type !== 'notify') return;

      for (const msg of upsertMessages) {
        const jid = msg.key.remoteJid;

        // Accept both standard phone JIDs (@s.whatsapp.net) and new privacy JIDs (@lid)
        if (!jid || (!jid.endsWith('@s.whatsapp.net') && !jid.endsWith('@lid'))) continue;

        // Extract message text content using a recursive helper
        const getMessageText = (message) => {
          if (!message) return '';
          if (message.conversation) return message.conversation;
          if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
          if (message.imageMessage?.caption) return message.imageMessage.caption;
          if (message.videoMessage?.caption) return message.videoMessage.caption;
          if (message.ephemeralMessage?.message) return getMessageText(message.ephemeralMessage.message);
          if (message.viewOnceMessage?.message) return getMessageText(message.viewOnceMessage.message);
          if (message.viewOnceMessageV2?.message) return getMessageText(message.viewOnceMessageV2.message);
          if (message.documentWithCaptionMessage?.message) return getMessageText(message.documentWithCaptionMessage.message);
          return '';
        };

        const text = getMessageText(msg.message);
        if (!text || !text.trim()) continue;

        // Resolve phone number
        let phoneNumber = '';
        if (msg.key.senderPn) {
          // If Baileys provides the sender's Phone Number JID directly
          phoneNumber = msg.key.senderPn.split('@')[0].split(':')[0];
        } else if (jid.endsWith('@s.whatsapp.net')) {
          phoneNumber = jid.split('@')[0].split(':')[0];
        } else if (jid.endsWith('@lid')) {
          let resolvedJid = null;
          
          if (sock.signalRepository?.lidMapping?.getPNForLID) {
            try {
              resolvedJid = await sock.signalRepository.lidMapping.getPNForLID(jid);
            } catch (err) {
              console.warn('[Connection] Error calling getPNForLID repository lookup:', err.message);
            }
          }

          if (resolvedJid) {
            phoneNumber = resolvedJid.split('@')[0].split(':')[0];
            console.log(`[Connection] Successfully resolved LID ${jid} to Phone Number: ${phoneNumber}`);
          } else {
            phoneNumber = jid.split('@')[0].split(':')[0];
            console.warn(`[Connection] Fallback occurred: Could not resolve LID "${jid}" to PN. Storing raw LID identifier: ${phoneNumber}`);
          }
        }

        // If it is fromMe, it's an outgoing message sent from the connected phone
        const isFromMe = !!msg.key.fromMe;
        const direction = isFromMe ? 'outgoing' : 'incoming';
        const isRead = isFromMe ? true : false;

        try {
          const { pool } = require('../config/db');
          await pool.query(
            "INSERT INTO messages (phone_number, direction, message_text, is_read, timestamp) VALUES ($1, $2, $3, $4, now())",
            [phoneNumber, direction, text.trim(), isRead]
          );
          console.log(`[Connection] Saved message to database. PhoneNumber: ${phoneNumber}, Direction: ${direction}`);
          
          // Trigger Webhook if configured (only for incoming messages)
          if (!isFromMe) {
            const { getSettings } = require('../config/settings');
            const settings = getSettings();
            if (settings.webhookUrl) {
              fetch(settings.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event: 'message_received',
                  timestamp: new Date().toISOString(),
                  data: {
                    phone_number: phoneNumber,
                    message_text: text.trim(),
                    direction: 'incoming'
                  }
                })
              }).catch(webhookErr => console.error('[Webhook] Failed to dispatch received message alert:', webhookErr.message));
            }

            // --- INBOX AUTOMATION SYSTEM HANDLER ---
            try {
              console.log(`[INBOX] New message from ${phoneNumber}: ${text}`);
              // 1. Fetch or initialize chat_threads state for metadata
              let threadRes = await pool.query('SELECT * FROM chat_threads WHERE phone_number = $1', [phoneNumber]);
              let thread = null;
              if (threadRes.rows.length === 0) {
                // Check if this is the first message ever from this number
                const msgCountRes = await pool.query('SELECT COUNT(*) FROM messages WHERE phone_number = $1', [phoneNumber]);
                const isFirstMessage = parseInt(msgCountRes.rows[0].count, 10) <= 1;

                const insertRes = await pool.query(
                  `INSERT INTO chat_threads (phone_number, is_ai_enabled, ivr_state, tags, is_manual_override, last_interaction)
                   VALUES ($1, true, 'idle', '{}', false, now())
                   ON CONFLICT (phone_number) DO UPDATE SET last_interaction = now()
                   RETURNING *`,
                  [phoneNumber]
                );
                thread = insertRes.rows[0];
                thread.isFirstMessage = isFirstMessage;
              } else {
                thread = threadRes.rows[0];
                thread.isFirstMessage = false;
                await pool.query('UPDATE chat_threads SET last_interaction = now() WHERE phone_number = $1', [phoneNumber]);
              }

              console.log(`[INBOX][${phoneNumber}] Thread state -> is_ai_enabled: ${thread.is_ai_enabled}, is_manual_override: ${thread.is_manual_override}, ivr_state: ${thread.ivr_state}`);

              // Only run automation if Manual Override/Takeover is NOT active
              if (!thread.is_manual_override) {
                
                // A. Away Mode Response (Time-window based)
                console.log(`[INBOX][${phoneNumber}] Checking Away Mode -> enabled: ${settings.awayModeEnabled}`);
                if (settings.awayModeEnabled && settings.awayModeText) {
                  if (checkIfWithinWindow(settings.awayModeStart, settings.awayModeEnd)) {
                    // Prevent spam: only reply away once every 12 hours
                    const recentAwayRes = await pool.query(
                      `SELECT COUNT(*) FROM messages 
                       WHERE phone_number = $1 
                         AND direction = 'outgoing' 
                         AND message_text = $2 
                         AND timestamp > now() - interval '12 hours'`,
                      [phoneNumber, settings.awayModeText]
                    );
                    const recentAwayCount = parseInt(recentAwayRes.rows[0].count, 10);
                    
                    if (recentAwayCount === 0) {
                      await sendTextMessage(jid, settings.awayModeText);
                      await pool.query(
                        "INSERT INTO messages (phone_number, direction, message_text, is_read, timestamp) VALUES ($1, 'outgoing', $2, true, now())",
                        [phoneNumber, settings.awayModeText]
                      );
                      console.log(`[INBOX][${phoneNumber}] Away message sent, stopping further automation`);
                    }
                    return; // Stop processing further automations since business is away
                  }
                }

                // Opt-out / Stop request handler
                const incomingText = text.trim().toLowerCase();
                const optOutKeywords = ['stop', 'unsubscribe', 'band karo', 'band karein', 'remove me', 'opt out', 'optout'];
                if (optOutKeywords.includes(incomingText)) {
                  const replyText = "Aapko ab hamari taraf se koi WhatsApp message nahi bheja jayega. Dhanyawad!";
                  await sendTextMessage(jid, replyText);
                  await pool.query(
                    "INSERT INTO messages (phone_number, direction, message_text, is_read, timestamp) VALUES ($1, 'outgoing', $2, true, now())",
                    [phoneNumber, replyText]
                  );
                  await pool.query(
                    "UPDATE contacts SET has_consent = false WHERE phone_number = $1",
                    [phoneNumber]
                  );
                  await pool.query(
                    "UPDATE chat_threads SET ivr_state = 'idle' WHERE phone_number = $1",
                    [phoneNumber]
                  );
                  console.log(`[INBOX] Consent withdrawn via STOP keyword for ${phoneNumber}, has_consent set to false`);
                  return;
                }

                // B. Global Greeting Message (Sent on very first message)
                console.log(`[INBOX][${phoneNumber}] Checking Greeting -> enabled: ${settings.globalGreetingEnabled}, isFirstMessage: ${thread.isFirstMessage}`);
                if (settings.globalGreetingEnabled && settings.globalGreetingText && thread.isFirstMessage) {
                  await sendTextMessage(jid, settings.globalGreetingText);
                  await pool.query(
                    "INSERT INTO messages (phone_number, direction, message_text, is_read, timestamp) VALUES ($1, 'outgoing', $2, true, now())",
                    [phoneNumber, settings.globalGreetingText]
                  );
                }

                // C. IVR Interactive Menu Chatbot
                console.log(`[INBOX][${phoneNumber}] Checking IVR -> incomingText: ${incomingText}, current ivr_state: ${thread.ivr_state}`);
                
                if (incomingText === 'menu' || thread.ivr_state === 'menu_sent') {
                  const menuText = `Hi! Options select karne ke liye number reply karein:\n\n1. Order status check karein\n2. Product list dekhein\n3. Chat Support (Agent se baat karein)`;
                  
                  if (incomingText === 'menu') {
                    await sendTextMessage(jid, menuText);
                    await pool.query(
                      "INSERT INTO messages (phone_number, direction, message_text, is_read, timestamp) VALUES ($1, 'outgoing', $2, true, now())",
                      [phoneNumber, menuText]
                    );
                    await pool.query("UPDATE chat_threads SET ivr_state = 'menu_sent' WHERE phone_number = $1", [phoneNumber]);
                    return;
                  } else if (thread.ivr_state === 'menu_sent') {
                    if (incomingText === '1') {
                      const reply = "Aapka latest order status: Dispatched hai aur transit me hai. Delivery expected within 2 days.";
                      await sendTextMessage(jid, reply);
                      await pool.query(
                        "INSERT INTO messages (phone_number, direction, message_text, is_read, timestamp) VALUES ($1, 'outgoing', $2, true, now())",
                        [phoneNumber, reply]
                      );
                      await pool.query("UPDATE chat_threads SET ivr_state = 'idle' WHERE phone_number = $1", [phoneNumber]);
                      return;
                    } else if (incomingText === '2') {
                      const reply = "Humare main products:\n1. Bulk messaging API\n2. Chatbot builder\n3. CRM Integrations\n4. Two-Way Inbox Automation";
                      await sendTextMessage(jid, reply);
                      await pool.query(
                        "INSERT INTO messages (phone_number, direction, message_text, is_read, timestamp) VALUES ($1, 'outgoing', $2, true, now())",
                        [phoneNumber, reply]
                      );
                      await pool.query("UPDATE chat_threads SET ivr_state = 'idle' WHERE phone_number = $1", [phoneNumber]);
                      return;
                    } else if (incomingText === '3') {
                      const reply = "Aapko humare support agent se connect kiya ja raha hai. Please wait... Aap yahan direct message type kar sakte hain.";
                      await sendTextMessage(jid, reply);
                      await pool.query(
                        "INSERT INTO messages (phone_number, direction, message_text, is_read, timestamp) VALUES ($1, 'outgoing', $2, true, now())",
                        [phoneNumber, reply]
                      );
                      
                      // Transition to human: Set manual override = true, and attach tags
                      const currentTags = thread.tags || [];
                      const newTags = Array.from(new Set([...currentTags, 'Agent Required', 'High Priority']));
                      await pool.query(
                        `UPDATE chat_threads 
                         SET ivr_state = 'idle', 
                             is_manual_override = true, 
                             tags = $2
                         WHERE phone_number = $1`,
                        [phoneNumber, newTags]
                      );
                      return;
                    } else {
                      // Re-send IVR Menu if invalid response
                      await sendTextMessage(jid, "Invalid choice. Please select from the menu:\n\n" + menuText);
                      await pool.query(
                        "INSERT INTO messages (phone_number, direction, message_text, is_read, timestamp) VALUES ($1, 'outgoing', $2, true, now())",
                        [phoneNumber, "Invalid choice. Please select from the menu:\n\n" + menuText]
                      );
                      return;
                    }
                  }
                }

                // D. Keyword-Triggered Rules (Rules-Based matching)
                const rulesRes = await pool.query('SELECT * FROM bot_rules WHERE is_active = true');
                let matchedRule = null;
                for (const rule of rulesRes.rows) {
                  const kw = rule.keyword.toLowerCase();
                  if (rule.match_type === 'exact') {
                    if (incomingText === kw) {
                      matchedRule = rule;
                      break;
                    }
                  } else {
                    if (incomingText.includes(kw)) {
                      matchedRule = rule;
                      break;
                    }
                  }
                }

                if (matchedRule) {
                  console.log(`[INBOX][${phoneNumber}] Keyword rule matched: '${matchedRule.keyword}' -> stopping automation, Gemini will NOT run`);
                  await sendTextMessage(jid, matchedRule.response_text);
                  await pool.query(
                    "INSERT INTO messages (phone_number, direction, message_text, is_read, timestamp) VALUES ($1, 'outgoing', $2, true, now())",
                    [phoneNumber, matchedRule.response_text]
                  );
                  return;
                }

                console.log(`[INBOX][${phoneNumber}] No keyword rule matched, proceeding to Gemini AI check`);

                // E. Gemini AI Chatbot Integration
                console.log(`[INBOX][${phoneNumber}] Gemini check -> is_ai_enabled: ${thread.is_ai_enabled}, geminiApiKey present: ${settings.geminiApiKey ? 'YES' : 'NO'}`);
                if (thread.is_ai_enabled && settings.geminiApiKey) {
                  try {
                    // Retrieve past 10 messages for contextual background
                    const historyRes = await pool.query(
                      `SELECT direction, message_text FROM messages 
                       WHERE phone_number = $1 
                       ORDER BY timestamp DESC LIMIT 10`,
                      [phoneNumber]
                    );
                    const history = historyRes.rows.reverse();

                    let contextText = `Instructions:\n${settings.geminiPromptInstructions}\n\nConversation history:\n`;
                    for (const h of history) {
                      contextText += `${h.direction === 'incoming' ? 'Customer' : 'Assistant'}: ${h.message_text}\n`;
                    }
                    contextText += `Assistant:`;

                    // Generate AI reply using direct REST API fetch call
                    const response = await fetch(
                      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${settings.geminiApiKey}`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          contents: [{ parts: [{ text: contextText }] }]
                        })
                      }
                    );

                    if (response.ok) {
                      const resJson = await response.json();
                      const aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (aiText && aiText.trim()) {
                        const cleanAiText = aiText.trim();
                        console.log(`[INBOX][${phoneNumber}] Simulating natural reply delay before sending...`);
                        await randomDelay(2000, 4500);
                        console.log(`[INBOX][${phoneNumber}] Gemini AI reply generated successfully, length: ${aiText.length} chars`);
                        await sendTextMessage(jid, cleanAiText);
                        await pool.query(
                          "INSERT INTO messages (phone_number, direction, message_text, is_read, timestamp) VALUES ($1, 'outgoing', $2, true, now())",
                          [phoneNumber, cleanAiText]
                        );
                        return;
                      } else {
                        console.log(`[INBOX][${phoneNumber}] Gemini responded but text was empty or missing in response`);
                      }
                    } else {
                      const errTxt = await response.text();
                      console.error(`[Gemini API Error][${phoneNumber}] response status: ${response.status} - error text: ${errTxt}`);
                    }
                  } catch (geminiErr) {
                    console.error('Error invoking Gemini AI:', geminiErr.message);
                  }
                }

                // F. Auto-Tagging & Chat Assignment (Negative keywords check)
                const lowerText = text.toLowerCase();
                const highPriorityKeywords = ['complain', 'refund', 'fraud', 'fail', 'error', 'kharab', 'bekar', 'galat'];
                let shouldTagHighPriority = false;
                for (const kw of highPriorityKeywords) {
                  if (lowerText.includes(kw)) {
                    shouldTagHighPriority = true;
                    break;
                  }
                }

                if (shouldTagHighPriority) {
                  const currentTags = thread.tags || [];
                  const newTags = Array.from(new Set([...currentTags, 'High Priority', 'Agent Required']));
                  await pool.query(
                    `UPDATE chat_threads SET tags = $2 WHERE phone_number = $1`,
                    [phoneNumber, newTags]
                  );
                }

                console.log(`[INBOX] Reached end of automation chain without any auto-reply being sent for ${phoneNumber}`);
              } else {
                console.log(`[INBOX] Manual override active, skipping all automation for ${phoneNumber}`);
              }

            } catch (autoErr) {
              console.error('Error processing inbox automation waterfall:', autoErr.message);
            }
          }
        } catch (err) {
          console.error('[Connection] Failed to log WhatsApp message:', err.message);
        }
      }
    });

  } catch (error) {
    console.error('Error during WhatsApp socket initialization:', error);
    connectionStatus = 'disconnected';
  }
}

/**
 * Returns the current connection status.
 * @returns {string} Status string: "connecting", "connected", "disconnected", "reconnecting"
 */
function getConnectionStatus() {
  return connectionStatus;
}

/**
 * Returns the generated QR code as a base64 data URL.
 * @returns {string|null} Base64 QR code or null
 */
function getQRCode() {
  return qrCodeBase64;
}

/**
 * Logs out of the current WhatsApp session and deletes authentication credentials.
 */
async function logoutWhatsApp() {
  qrCodeBase64 = null;
  reconnectAttempts = 0;

  if (sock) {
    try {
      await sock.logout();
    } catch (err) {
      console.warn('Socket logout error (might already be disconnected):', err.message);
    }
    try {
      sock.end(undefined);
    } catch (err) {
      // Ignore
    }
    sock = null;
  }

  connectionStatus = 'disconnected';

  // Wait briefly for disk operations to complete, then clean up auth files
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (fs.existsSync(AUTH_INFO_DIR)) {
    try {
      fs.rmSync(AUTH_INFO_DIR, { recursive: true, force: true });
      fs.mkdirSync(AUTH_INFO_DIR, { recursive: true });
      console.log('Session credentials cleared successfully.');
    } catch (err) {
      console.error('Failed to clear auth_info session folder:', err);
    }
  }

  // Re-initialize a new WhatsApp socket to generate a new QR code for login
  initWhatsApp();
}

async function sendTextMessage(jid, text) {
  if (!sock || connectionStatus !== 'connected') {
    throw new Error('WhatsApp not connected');
  }
  return await sock.sendMessage(jid, { text: text });
}

/**
 * Sends a media message (image, pdf, video) to a specific WhatsApp JID using the active socket.
 */
async function sendMediaMessage(jid, mediaUrl, mediaType, captionText) {
  if (!sock || connectionStatus !== 'connected') {
    throw new Error('WhatsApp not connected');
  }

  if (mediaType === 'image') {
    return await sock.sendMessage(jid, { image: { url: mediaUrl }, caption: captionText });
  } else if (mediaType === 'pdf') {
    return await sock.sendMessage(jid, { 
      document: { url: mediaUrl }, 
      mimetype: 'application/pdf', 
      fileName: 'document.pdf', 
      caption: captionText 
    });
  } else if (mediaType === 'video') {
    return await sock.sendMessage(jid, { video: { url: mediaUrl }, caption: captionText });
  } else {
    return await sock.sendMessage(jid, { text: captionText });
  }
}

function checkIfWithinWindow(start, end) {
  if (!start || !end) return false;
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  if (start <= end) {
    return currentTimeStr >= start && currentTimeStr <= end;
  } else {
    // Over midnight case
    return currentTimeStr >= start || currentTimeStr <= end;
  }
}

module.exports = {
  initWhatsApp,
  getConnectionStatus,
  getQRCode,
  logoutWhatsApp,
  sendTextMessage,
  sendMediaMessage,
};
