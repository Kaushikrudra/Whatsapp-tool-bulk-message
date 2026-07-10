const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authMiddleware = require('./middleware/auth');
const statusRouter = require('./routes/status');
const contactsRouter = require('./routes/contacts');
const templatesRouter = require('./routes/templates');
const campaignsRouter = require('./routes/campaigns');
const settingsRouter = require('./routes/settings');
const logsRouter = require('./routes/logs');
const authRouter = require('./routes/auth');
const chatsRouter = require('./routes/chats');
const mediaRouter = require('./routes/media');
const analyticsRouter = require('./routes/analytics');
const botRulesRouter = require('./routes/botRules');
const { initWhatsApp } = require('./whatsapp/connection');
const { testConnection, runMigrations } = require('./config/db');
const { initQueue } = require('./queue/campaignQueue');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS middleware to allow requests from frontend clients
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : true,
  credentials: true
}));

// Enable cookie parser middleware with signed cookie secrets
app.use(cookieParser(process.env.SESSION_SECRET || 'pixelsecret2026'));

// Enable JSON parsing middleware for post body parsing
app.use(express.json());

// Apply authentication middleware globally to all /api endpoints
app.use('/api', authMiddleware);

// Mount the connection status routes under /api
app.use('/api', statusRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/auth', authRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/bot-rules', botRulesRouter);

// Start the Express server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test connection to the PostgreSQL database
  await testConnection();
  await runMigrations();
  
  // Initialize the WhatsApp connection setup
  await initWhatsApp();

  // Initialize the Bull campaign sending queue
  initQueue();
});
