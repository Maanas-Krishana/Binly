# 🚀 Binly

> **A zero-friction, real-time temporary text, code, and file sharing platform built for instant cross-device transfers.**

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](LICENSE)
[![Database](https://img.shields.io/badge/Database-SQLite%20%7C%20PostgreSQL-003B57?style=flat-square&logo=sqlite)](https://sqlite.org/)
[![WebSockets](https://img.shields.io/badge/Realtime-Socket.IO-010101?style=flat-square&logo=socketdotio)](https://socket.io/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)](public/manifest.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

---

## 📖 Overview

**Binly** solves a everyday developer & student pain point: transferring text, code snippets, or files from one device to another instantly **without**:

- ❌ Signing up or logging into messaging apps (WhatsApp, Telegram, Discord)
- ❌ Sending emails to yourself
- ❌ Connecting physical cables or configuring SSH/FTP clients
- ❌ Installing third-party software

### 💡 Example Workflow

1. Open **Binly** on your phone.
2. Click **Create Bin** and paste your code snippet or drop a file.
3. Get a unique, easy-to-read **6-character Bin Code** (e.g. `A7K92P`).
4. Type `A7K92P` into Binly on your computer or scan the generated QR code.
5. Access, view, edit, or copy your content instantly!

---

## ✨ Key Features

- **⚡ Zero-Friction Bins**: Instant clipboard creation with 6-character access codes.
- **🔒 Passwordless Ownership**: Client-side `ownerToken` stored in browser `localStorage` grants administrative controls without requiring user accounts.
- **🔄 Real-Time Bidirectional Sync**: Powered by WebSockets (`Socket.IO`). Edits made by the owner stream instantly to all connected viewers.
- **⏳ Ephemeral & Auto-Expiring**: Bins automatically self-destruct after 15 minutes of host inactivity or disconnect to ensure privacy and server efficiency.
- **📁 Binly FTP Service**: Supports file uploads up to 100 MB via browser drag-and-drop or terminal `curl` CLI commands.
- **📱 PWA & Offline Support**: Fully installable Progressive Web App with Service Worker asset caching for native-like performance.
- **🎨 Glassmorphic UI & Developer Tools**: Dark-mode interface featuring dynamic line gutters, copy shortcuts, connection status indicators, and modal confirmations.

---

## 🛠️ Tech Stack

### Frontend Architecture
- **Language & Logic**: Vanilla JavaScript (ES6+ Modular Component Pattern)
- **Styling**: Modern CSS3 (Custom Design System, Glassmorphism, CSS Grid & Flexbox)
- **Real-Time Layer**: `Socket.IO Client`
- **PWA Capabilities**: Web App Manifest (`manifest.json`) & Service Worker (`sw.js`)

### Backend Architecture
- **Runtime & Server**: Node.js & Express.js
- **Real-Time Communication**: `Socket.IO` engine handling room-based broadcasting (`bin:<CODE>`) and connection lifecycle management

### Persistence & Ephemeral Storage
- **Development**: `better-sqlite3` (Zero-config embedded SQLite)
- **Production Support**: `pg` (PostgreSQL driver for scaled multi-node deployments)

### Devops & Tooling
- **Containerization**: Docker (`Dockerfile` & `.dockerignore`)
- **Development Monitor**: `nodemon`

---

## 📂 Folder Structure

Below is the annotated directory layout of the repository:

```
Binly/
├── Dockerfile                  # Container build instructions for production
├── Readme.md                   # Project documentation & developer guide
├── binly.db                    # Embedded SQLite database (generated at runtime)
├── db.js                       # Universal Database Abstraction Layer (SQLite & Postgres)
├── package.json                # Project manifest, dependencies, and NPM scripts
├── package-lock.json           # Locked dependency tree
├── server.js                   # Node.js server, REST API endpoints, and Socket.IO events
│
├── public/                     # Public web assets (Served statically by Express)
│   ├── index.html              # Main single-page app HTML template
│   ├── style.css               # Comprehensive Glassmorphic CSS design system
│   ├── manifest.json           # Progressive Web App (PWA) manifest
│   ├── sw.js                   # Service Worker script for PWA offline caching
│   ├── robots.txt              # Search engine indexing directives
│   │
│   ├── icons/                  # PWA application icons & brand assets
│   │   ├── icon-192.svg
│   │   └── icon-512.svg
│   │
│   └── js/                     # Frontend JavaScript application architecture
│       ├── app.js              # Application entry point, router, and state manager
│       │
│       ├── components/         # Modular UI Component Layer
│       │   ├── ConfirmationDialog.js # Modal dialog for destruction confirmation
│       │   ├── Editor.js            # Main code/text input editor component
│       │   ├── LandingView.js       # Welcome view, creation & join code inputs
│       │   └── MetaBlock.js         # Header metadata, status badge, & owner actions
│       │
│       └── utils/              # Client Utilities & Helpers
│           ├── api.js           # REST API HTTP fetch wrapper
│           ├── socket.js        # Socket.IO connection & event handlers
│           └── toast.js         # Non-blocking alert & notification toasts
│
└── .github/                    # GitHub repository templates & workflows
```

---

## 🚀 Getting Started (Local Development)

Follow these steps to get a local development instance of **Binly** up and running on your machine.

### Prerequisites

Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (`v18.x` or higher recommended)
- [npm](https://www.npmjs.com/) (bundled with Node.js)
- [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/Maanas-Krishana/Binly.git
cd Binly/Binly
```

### 2. Install Dependencies

Install required backend packages:

```bash
npm install
```

### 3. Start the Server

#### Development Mode (Auto-reloads on file changes)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

> 💡 **Tip:** Open `http://localhost:3000` in two separate browser windows (or one incognito window) to test real-time Socket.IO content updates and owner disconnect notifications!

---

## 🐳 Running with Docker

You can also run Binly in an isolated container using Docker:

```bash
# Build the Docker image
docker build -t binly .

# Run the container mapping port 3000
docker run -p 3000:3000 --name binly-app binly
```

Now visit `http://localhost:3000` in your web browser.

---

## 📡 REST API & Socket Reference

### REST Endpoints

| Method | Endpoint | Description | Auth Header Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/bins` | Create a new Bin | None |
| **GET** | `/api/bins/:code` | Retrieve Bin content and status | `owner-token` *(optional)* |
| **PUT** | `/api/bins/:code` | Update Bin content | `owner-token` *(Required for owner)* |
| **DELETE** | `/api/bins/:code` | Delete Bin immediately | `owner-token` *(Required for owner)* |

#### 1. Create Bin Sample Payload (`POST /api/bins`)
```json
// Request Body
{
  "content": "function helloWorld() {\n  console.log('Hello from Binly!');\n}"
}

// Response (201 Created)
{
  "code": "A7K92P",
  "content": "function helloWorld() {\n  console.log('Hello from Binly!');\n}",
  "ownerToken": "550e8400-e29b-41d4-a716-446655440000",
  "expiresIn": "15m idle / disconnect"
}
```

---

### Socket.IO Real-time Events

| Event Name | Direction | Payload / Description |
| :--- | :--- | :--- |
| `join-bin` | Client ➔ Server | `{ code: "A7K92P", isOwner: true, ownerToken: "..." }` |
| `bin-updated` | Server ➔ Client | `{ content: "Updated text..." }` |
| `owner-status-updated` | Server ➔ Client | `{ ownerConnected: true / false }` |
| `bin-deleted` | Server ➔ Client | Emitted when owner explicitly destroys the bin |

---

## 🔐 Database & Ownership Security Model

```
+-----------------------------------------------------------------------+
|                            CREATOR BROWSER                            |
|                                                                       |
| 1. POST /api/bins  --------------------------------> Server           |
| 2. Receives { code: "A7K92P", ownerToken: "UUID" }                    |
| 3. Stores ownerToken in localStorage: bin_owner_A7K92P = "UUID"       |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|                            VIEWER BROWSER                             |
|                                                                       |
| 1. Joins code "A7K92P" without ownerToken                             |
| 2. Server verifies ownerToken header on PUT/DELETE operations        |
| 3. Read-only viewer mode enabled unless valid ownerToken presented    |
+-----------------------------------------------------------------------+
```

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**!

### How to Contribute

1. **Fork the Project**
2. **Create your Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your Changes** (`git commit -m 'feat: Add some AmazingFeature'`)
4. **Push to the Branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Contribution Guidelines
- Maintain clean, readable JavaScript and standard formatting.
- Ensure all existing REST endpoints and Socket events work without breaking changes.
- Provide descriptive commit messages adhering to standard conventions (e.g. `feat:`, `fix:`, `docs:`, `style:`).

---

## 📄 License

Distributed under the **ISC License**. See `LICENSE` for more information.

---

## 👨‍💻 Maintainer

Created & maintained with ❤️ by **[Maanas Krishana](https://github.com/Maanas-Krishana)**.

---

<p center align="center">
  <i>Binly — Fast, frictionless, real-time sharing for developers everywhere.</i>
</p>
