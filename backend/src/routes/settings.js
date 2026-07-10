const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../config/settings');

// GET /api/settings - Fetch current settings config
router.get('/', (req, res) => {
  return res.json(getSettings());
});

// PUT /api/settings - Update settings config with validation checks
router.put('/', (req, res) => {
  try {
    const {
      minDelaySec,
      maxDelaySec,
      dailyLimit,
      defaultCountryCode,
      sendWindowEnabled,
      sendWindowStart,
      sendWindowEnd,
      webhookUrl,
      globalGreetingEnabled,
      globalGreetingText,
      awayModeEnabled,
      awayModeStart,
      awayModeEnd,
      awayModeText,
      geminiApiKey,
      geminiPromptInstructions,
    } = req.body;

    const updates = {};

    // Validate minDelaySec: number, 1 - 30
    if (minDelaySec !== undefined) {
      const val = parseInt(minDelaySec, 10);
      if (isNaN(val) || val < 1 || val > 30) {
        return res.status(400).json({ error: 'Minimum delay must be a number between 1 and 30 seconds.' });
      }
      updates.minDelaySec = val;
    }

    // Validate maxDelaySec: number, 5 - 120
    if (maxDelaySec !== undefined) {
      const val = parseInt(maxDelaySec, 10);
      if (isNaN(val) || val < 5 || val > 120) {
        return res.status(400).json({ error: 'Maximum delay must be a number between 5 and 120 seconds.' });
      }
      updates.maxDelaySec = val;
    }

    // Validate dailyLimit: number, 50 - 1000
    if (dailyLimit !== undefined) {
      const val = parseInt(dailyLimit, 10);
      if (isNaN(val) || val < 50 || val > 1000) {
        return res.status(400).json({ error: 'Daily message limit must be between 50 and 1000 messages.' });
      }
      updates.dailyLimit = val;
    }

    // Validate defaultCountryCode: 1 to 4 digits
    if (defaultCountryCode !== undefined) {
      const val = String(defaultCountryCode).trim();
      if (!/^\d{1,4}$/.test(val)) {
        return res.status(400).json({ error: 'Default country code must be a number between 1 and 4 digits.' });
      }
      updates.defaultCountryCode = val;
    }

    // Validate sendWindowEnabled: boolean
    if (sendWindowEnabled !== undefined) {
      updates.sendWindowEnabled = !!sendWindowEnabled;
    }

    // HH:MM regex validator
    const timeFormatRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;

    // Validate sendWindowStart: HH:MM
    if (sendWindowStart !== undefined) {
      const val = String(sendWindowStart).trim();
      if (!timeFormatRegex.test(val)) {
        return res.status(400).json({ error: 'Start time must be in valid HH:MM format (24-hour style).' });
      }
      updates.sendWindowStart = val;
    }

    // Validate sendWindowEnd: HH:MM
    if (sendWindowEnd !== undefined) {
      const val = String(sendWindowEnd).trim();
      if (!timeFormatRegex.test(val)) {
        return res.status(400).json({ error: 'End time must be in valid HH:MM format (24-hour style).' });
      }
      updates.sendWindowEnd = val;
    }

    // Validate webhookUrl
    if (webhookUrl !== undefined) {
      const val = String(webhookUrl).trim();
      if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
        return res.status(400).json({ error: 'Webhook URL must be a valid HTTP or HTTPS URL.' });
      }
      updates.webhookUrl = val;
    }

    // Validate globalGreetingEnabled: boolean
    if (globalGreetingEnabled !== undefined) {
      updates.globalGreetingEnabled = !!globalGreetingEnabled;
    }

    // Validate globalGreetingText: string
    if (globalGreetingText !== undefined) {
      updates.globalGreetingText = String(globalGreetingText).trim();
    }

    // Validate awayModeEnabled: boolean
    if (awayModeEnabled !== undefined) {
      updates.awayModeEnabled = !!awayModeEnabled;
    }

    // Validate awayModeStart: HH:MM
    if (awayModeStart !== undefined) {
      const val = String(awayModeStart).trim();
      if (!timeFormatRegex.test(val)) {
        return res.status(400).json({ error: 'Away mode start time must be in valid HH:MM format.' });
      }
      updates.awayModeStart = val;
    }

    // Validate awayModeEnd: HH:MM
    if (awayModeEnd !== undefined) {
      const val = String(awayModeEnd).trim();
      if (!timeFormatRegex.test(val)) {
        return res.status(400).json({ error: 'Away mode end time must be in valid HH:MM format.' });
      }
      updates.awayModeEnd = val;
    }

    // Validate awayModeText: string
    if (awayModeText !== undefined) {
      updates.awayModeText = String(awayModeText).trim();
    }

    // Validate geminiApiKey: string
    if (geminiApiKey !== undefined) {
      updates.geminiApiKey = String(geminiApiKey).trim();
    }

    // Validate geminiPromptInstructions: string
    if (geminiPromptInstructions !== undefined) {
      updates.geminiPromptInstructions = String(geminiPromptInstructions).trim();
    }

    // Perform updates
    const updated = updateSettings(updates);
    return res.json(updated);
  } catch (error) {
    console.error('Error updating settings route:', error);
    return res.status(500).json({ error: 'Failed to update settings.' });
  }
});

module.exports = router;
