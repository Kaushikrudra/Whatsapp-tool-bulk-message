const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion, Browsers } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

// Path to persist session authentication information
const AUTH_INFO_DIR = path.join(__dirname, '../../auth_info');

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

/**
 * Sends a plain text message to a specific WhatsApp JID using the active socket.
 * @param {string} jid The WhatsApp JID (e.g. "1234567890@s.whatsapp.net")
 * @param {string} text The message text content
 */
async function sendTextMessage(jid, text) {
  if (!sock || connectionStatus !== 'connected') {
    throw new Error('WhatsApp not connected');
  }
  return await sock.sendMessage(jid, { text: text });
}

module.exports = {
  initWhatsApp,
  getConnectionStatus,
  getQRCode,
  logoutWhatsApp,
  sendTextMessage,
};
