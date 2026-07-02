# Pixel WhatsApp Bulk Sender Tool

A high-performance, self-hosted bulk broadcasting and campaign management system built for WhatsApp. It enables businesses to securely upload contact spreadsheets, design dynamic message templates with contact variable interpolation, schedule campaigns, and execute broadcasts via an automated anti-ban queue engine.

---

## 🚀 Key Features

*   **Secure Authentication**: Fully protected login dashboard with signed cookie sessions.
*   **WhatsApp Linking**: Instant device pairing using Baileys multi-device connection sockets with automatic QR generation.
*   **Contact Management**: Excel/CSV spreadsheet parsed uploading with phone validation, duplicate purging, and database transaction protection.
*   **Template Composer**: Dynamic variable replacement (e.g. `{name}`, `{company}`) with real-time length alerts.
*   **Broadcast Engine**: Bull-backed persistent queue managing message dispatching sequentially with pause/resume capabilities.
*   **Anti-Ban Safeguards**: Configurable anti-detection random delays, daily limit throttlers, consecutive failure safety stops, and zero-width random space injectors.
*   **System Event Timelines**: real-time polling logs console capturing system events, delivery confirmations, and connection statuses.

---

## 🛠️ Tech Stack

*   **Frontend**: React (Vite), Vanilla CSS, Lucide Icons, Axios.
*   **Backend**: Node.js, Express.js.
*   **Queue Management**: Bull Queue, Redis (ioredis).
*   **Database**: PostgreSQL / Supabase, pg-pool.
*   **WhatsApp API Wrapper**: Baileys (@whiskeysockets/baileys).

---

## 📋 Prerequisites

*   **Node.js**: version `18.0.0` or higher.
*   **Redis Server**: running locally or in cloud (default port `6379`).
*   **PostgreSQL Database**: a local PostgreSQL instance or a Supabase cloud database.

---

## ⚙️ Installation & Setup

### 1. Clone the repository and install dependencies
```bash
# Clone the repository
git clone https://github.com/Kaushikrudra/plivo-server.git pixel-whatsapp-tool
cd pixel-whatsapp-tool

# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory using the following configurations:
```env
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
DASHBOARD_USER=admin
DASHBOARD_PASS=admin123
SESSION_SECRET=pixelsecret2026
```

### 3. Database Migration
Upon server startup, the backend automatically reads and runs the SQL commands from `backend/src/config/migrations.sql` to construct the tables: `contact_lists`, `contacts`, `templates`, `campaigns`, and `campaign_logs`.

### 4. Running the Application
Ensure your **Redis server** and **PostgreSQL database** are running, then execute the startup scripts:

```bash
# Start Backend server (from backend/ directory)
npm run dev

# Start Frontend client (from frontend/ directory)
npm run dev
```

*   **Backend API URL**: `http://localhost:5000`
*   **Frontend Client URL**: `http://localhost:5173`

---

## 🔑 Environment Variables

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `PORT` | The port the Node.js API server listens on | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:pass@localhost:5432/db` |
| `DASHBOARD_USER` | Admin login username for the web panel | `admin` |
| `DASHBOARD_PASS` | Admin login password for the web panel | `admin123` |
| `SESSION_SECRET` | Secret key used to sign browser session cookies | `supersecretkey` |

---

## 📂 Folder Structure

```
pixel-whatsapp-tool/
├── backend/
│   ├── auth_info/            # WhatsApp login session credentials
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js         # PG Database connection pool
│   │   │   ├── migrations.sql # Database table schemas
│   │   │   ├── settings.js   # Settings memory store
│   │   │   └── settings.json # Persisted configuration file
│   │   ├── controllers/      # Route handler logics (CRUD, Queue)
│   │   ├── middleware/       # Auth session check middlewares
│   │   ├── queue/            # Bull dispatch engine & worker process
│   │   ├── routes/           # API endpoints routing definitions
│   │   ├── whatsapp/         # Baileys connection socket setup
│   │   └── server.js         # Entry point for the Node server
│   ├── .env                  # Backend environments configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Pages (Dashboard, Settings, Logs)
│   │   ├── App.jsx           # Main controller and Auth router
│   │   ├── App.css           # Core styling sheets
│   │   ├── Sidebar.jsx       # Layout navigation component
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md                 # Project instruction manual
```

---

## 📖 Usage Guide

1.  **Pair WhatsApp Device**: Open the web application, login (`admin` / `admin123`). Navigate to **Connection**, scan the generated QR code using your WhatsApp Linked Devices option.
2.  **Upload Contacts**: Go to **Contact Manager**, upload a spreadsheet containing columns for `phone`, `name`, and optionally `company`. The system will extract valid numbers automatically.
3.  **Draft Template**: Navigate to **Templates**, add a message draft using interpolation variables (e.g., `Hi {name}, hope you are doing well at {company}!`).
4.  **Launch Campaigns**: Click **Campaigns**, select your list and template, configure anti-ban delay overrides, and click **Launch**.
5.  **Monitor Progress**: Click on your campaign to view delivery status details, export report spreadsheets, and review real-time execution logs.

---

## 🛡️ Anti-Ban Best Practices

1.  **Random Delays**: Set a safety gap range (e.g., 3 to 8 seconds delay) between messages. Sending dozens of messages in a single second triggers spam detection.
2.  **Daily Limits**: Keep daily limits under 200 messages for new or un-warmed numbers, slowly increasing it to prevent account bans.
3.  **Account Warm-up**: Avoid using brand-new SIM cards for immediate bulk broadcasts. Ensure the phone number has regular two-way conversations first.
4.  **Spam Prevention**: Make sure your recipients expect your messages. High user-report rates will cause immediate account suspension by WhatsApp.

---

## ⚠️ Risk Disclaimer

This tool utilizes unofficial WhatsApp APIs via Baileys. It is not affiliated with or endorsed by Meta Platforms Inc. Using automated tools to send bulk messages may violate the WhatsApp Terms of Service and could lead to permanent account suspension. Use this application at your own risk. Pixel Labs assumes no responsibility for any account suspension or data loss resulting from the deployment of this tool.

---

## 🔗 Key API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Authenticate user credentials & set signed session cookie | No |
| **POST** | `/api/auth/logout` | Clear user session cookie | Yes |
| **GET** | `/api/status` | Read WhatsApp QR code and socket connection state | No |
| **GET** | `/api/contacts/lists` | Fetch uploaded spreadsheet lists metadata | Yes |
| **POST** | `/api/contacts/upload` | Parse workbook buffer and store contact list | Yes |
| **POST** | `/api/templates` | Create a message template | Yes |
| **GET** | `/api/campaigns` | List all broadcast campaigns with live delivery stats | Yes |
| **POST** | `/api/campaigns/:id/launch` | Initialize sending loop for a campaign | Yes |
| **GET** | `/api/logs` | Fetch system logs across connection events and campaigns | Yes |
| **PUT** | `/api/settings` | Modify global default anti-ban parameters | Yes |
