const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authMiddleware = require('./middleware/auth');
const subscriptionGuard = require('./middleware/subscriptionGuard');
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
const subscriptionRouter = require('./routes/subscription');
const userRouter = require('./routes/user');
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

// Public/gate API endpoints (accessible before active subscription)
app.use('/api', statusRouter);
app.use('/api/auth', authRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/user', userRouter);

// Protected dashboard API endpoints (require active subscription)
app.use('/api/contacts', subscriptionGuard, contactsRouter);
app.use('/api/templates', subscriptionGuard, templatesRouter);
app.use('/api/campaigns', subscriptionGuard, campaignsRouter);
app.use('/api/settings', subscriptionGuard, settingsRouter);
app.use('/api/logs', subscriptionGuard, logsRouter);
app.use('/api/chats', subscriptionGuard, chatsRouter);
app.use('/api/media', subscriptionGuard, mediaRouter);
app.use('/api/analytics', subscriptionGuard, analyticsRouter);
app.use('/api/bot-rules', subscriptionGuard, botRulesRouter);

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
