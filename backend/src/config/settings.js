const fs = require('fs');
const path = require('path');

const SETTINGS_FILE_PATH = path.join(__dirname, 'settings.json');

const defaultSettings = {
  minDelaySec: 3,
  maxDelaySec: 8,
  dailyLimit: 200,
  defaultCountryCode: '91',
  sendWindowEnabled: false,
  sendWindowStart: '10:00',
  sendWindowEnd: '19:00',
  webhookUrl: '',
  globalGreetingEnabled: false,
  globalGreetingText: 'Welcome to Pixel Labs! How can we help you today?',
  awayModeEnabled: false,
  awayModeStart: '18:00',
  awayModeEnd: '09:00',
  awayModeText: 'We are currently offline. We will get back to you at 9:00 AM.',
  geminiApiKey: '',
  geminiPromptInstructions: 'You are a helpful customer assistant. Keep replies short and concise.',
};

let currentSettings = { ...defaultSettings };

// On startup: Load from settings.json if it exists, else use defaults
try {
  if (fs.existsSync(SETTINGS_FILE_PATH)) {
    const rawData = fs.readFileSync(SETTINGS_FILE_PATH, 'utf8');
    const parsedData = JSON.parse(rawData);
    currentSettings = { ...defaultSettings, ...parsedData };
    console.log('[Settings] Loaded settings from settings.json');
  } else {
    console.log('[Settings] No settings.json found, using defaults.');
    saveSettingsToFile(currentSettings);
  }
} catch (err) {
  console.error('[Settings] Failed to load settings file, using defaults:', err.message);
}

/**
 * Saves settings memory store to disk.
 */
function saveSettingsToFile(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf8');
  } catch (err) {
    console.error('[Settings] Failed to write settings.json to disk:', err.message);
  }
}

/**
 * Returns current application settings.
 */
function getSettings() {
  return currentSettings;
}

/**
 * Updates application settings in memory and persists to disk.
 * @param {object} newSettings Partial settings object
 */
function updateSettings(newSettings) {
  currentSettings = { ...currentSettings, ...newSettings };
  saveSettingsToFile(currentSettings);
  return currentSettings;
}

module.exports = {
  getSettings,
  updateSettings,
};
