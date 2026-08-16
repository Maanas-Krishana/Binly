# 📋 BIP: Binly Improvement Proposal & Version Specifications

```
BIP Number : 0001
Title      : Binly Architectural Specification & Version Roadmap
Status     : Active / Living Document
Author(s)  : Maanas Krishana (@Maanas-Krishana), Ranayudh (@RanayudhShukla)
Created    : 2026-08-13
Target Repo: Binly Core
```

---

## 🎯 Executive Summary & Vision

**Binly** is an open-source, temporary, browser-based workspace designed for instant cross-device transfer, high-speed ephemeral file hosting (Binly FTP), and real-time collaborative editing.

### The Problem
Users frequently need to transfer text, code snippets, logs, or files from one device to another (e.g. mobile phone to a shared lab computer) without:
- ❌ Logging into personal messaging platforms (WhatsApp, Discord, Telegram)
- ❌ Sending emails to themselves
- ❌ Connecting physical USB drives or cables
- ❌ Installing native apps or configuring SSH/FTP credentials

### The Solution
Binly provides instant, ephemeral clipboards ("Bins") accessible via short, human-readable 6-character access codes (`A7K92P`) or dynamic QR codes, backed by client-side browser tokens and automated lifecycle cleanup.

```
+-------------------------------------------------------------------------+
|                              CORE FLOW                                  |
|                                                                         |
|  Device A (Phone) -------> Create Bin -------> Receive Code: A7K92P     |
|                                                               ↓         |
|  Device B (PC/Lab) <------- Enter Code <------- Enter Code: A7K92P      |
+-------------------------------------------------------------------------+
```

---

## 🏛️ Core Architectural Concepts

Every **Bin** is a temporary, permissioned shared space with:
1. **Unique Access Code**: 6-character uppercase base-32 string (e.g., `A7K92P`).
2. **Cryptographic Ownership Token**: Generated server-side and stored in creator's browser `localStorage`.
3. **Automated Expiry Engine**: Auto-destruction triggered by inactivity or host disconnect.
4. **Role-Based Access Control**: Distinguishes between Owner/Host, Editors, and Viewers.

---

## 📌 Version Roadmap & Architectural Proposals

---

### 1. Version 1 — Instant Ephemeral Clipboards (Core Implemented)

#### Goal
Provide a zero-friction, passwordless clipboard between devices without requiring account registration.

#### Functional Specifications
- **Bin Creation**: Server provisions a unique bin code and secret `ownerToken`. The creator automatically becomes the Bin Owner.
- **Bin Joining**: Secondary devices enter the 6-character code to join the session in Viewer mode.
- **Ownership Security**: No login required. The `ownerToken` stored in browser `localStorage` acts as a bearer token for administrative actions (`PUT`, `DELETE`).

#### Permission System Matrix
| Role | View Content | Copy Snippets | Edit Content | Delete Bin | Save Permanently |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Viewer** | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Expiry & Cleanup Rules
- Bins are inherently ephemeral.
- **Destruction Condition**: Bin self-destructs after 15 minutes of owner inactivity or disconnection.

---

### 2. Version 1.5 — Binly FTP as a Service (File Transfer Protocol)

#### Goal
Extend Binly beyond text/code to zero-friction temporary file hosting and binary asset transfers up to **100 MB**, eliminating the need for traditional FTP clients or cloud sign-ins.

#### User Flow & Interface
Users on the landing page can toggle between text clipboard mode and **Binly FTP**:

```
+------------------------------------------------------------------+
|                        BINLY FTP ENGINE                          |
|                                                                  |
|  [ Upload File (PDF, Image, Video, Zip < 100MB) ]                |
|                           ↓                                      |
|             Generated Bin Code: F9K32X                           |
|                           ↓                                      |
|  Viewer enters code "F9K32X" ---> Downloads / Streams File       |
+------------------------------------------------------------------+
```

#### Core Feature Matrix

##### 1. Zero-Friction Transfer Modes
* **One-Click Web FTP**: Drag & drop or pick any file up to 100 MB directly in the browser.
* **Terminal / CLI FTP (cURL & HTTP API)**:
  ```bash
  # Upload via CLI
  curl -F "file=@presentation.pdf" https://binly.app/api/ftp/upload
  # Response: {"code":"F9K32X","expiresIn":"15m idle"}

  # Download via CLI
  curl -O https://binly.app/api/ftp/F9K32X/download
  ```
* **Instant QR Beam**: Generate dynamic QR codes for uploaded files so mobile devices can scan and download media instantly without typing access codes.

##### 2. File Streaming & Native Preview Engine
* **Instant Media Streaming**: Stream MP4, WebM, MP3, and WAV files directly inside the viewer modal before downloading.
* **PDF & Document Reader**: In-browser preview renderer for PDFs, markdown files, and image formats (PNG, JPG, SVG, WebP, GIF).
* **Archive Inspector**: Preview zip file trees without unpacking to verify contents before downloading.

##### 3. Security, Privacy & Control
* **Burn-on-Read / Self-Destruct**: Host can toggle *"Delete file after first download"* for sensitive single-use transfers.
* **Password / PIN Lock**: Host can set a 4-digit PIN for sensitive FTP bins.
* **Granular Download Counter & Logs**: Real-time Socket.IO notifications when a viewer begins or finishes fetching the file.
* **End-to-End Encryption (Optional)**: In-browser AES-256 client-side encryption prior to upload, decrypted in recipient browser with explicit secret key.

##### 4. Storage & Lifecycle Rules
* **Size Limit**: Maximum **100 MB** per file/bin.
* **Ephemeral Cache**: Files auto-destruct after 15 minutes of host disconnect, host inactivity, or explicit manual deletion.

---

### 3. Version 2 — User Accounts & Private Bins

#### Goal
Unlock persistent user profiles, access management, saved bins, and private controlled rooms.

#### User Accounts & Display Identity
Authenticated users receive a permanent profile and unique display handle:
> Example: `⭐ Maanas#2047`

#### Bin Classifications

##### A. Public Bins
- Open access via 6-character code.
- Ephemeral lifecycle.

##### B. Private Bins
- **Requirements**: Login required for host and members.
- **Capacity**: Maximum 20 members (including host).
- **Access Flow**:
  1. Member inputs private code: `Enter Private Code`.
  2. Member state: `Waiting for host approval...`.
  3. Host receives interactive prompt:
     ```
     Join Request: Alex#1842 wants access [Accept | Reject]
     ```

#### Private Bin Permissions Matrix
- **Host**: Edit content, kick users, approve/reject access requests, save bin permanently.
- **Members**: View content, copy text/files, save bin to personal history.

#### User History & Permanent Saving
- **Recent History**: Stores last 5 joined bins per user account.
- **Save Bin Flow**: Converts an ephemeral temporary bin into permanent cloud storage under user profile:
  ```
  Temporary Ephemeral Storage ---> [ Save Bin Action ] ---> Permanent User Database
  ```

---

### 4. Version 3 — Real-Time Collaboration & Multi-Host

#### Goal
Transform Binly into a multi-user real-time collaborative workspace.

#### EquiBin (Equal Collaborative Bins)
A peer-to-peer style room where all participants share editing rights.

- **Member Limit**: Maximum 10 concurrent editors.
- **Authentication**: User login required.
- **Features**:
  - Real-time collaborative text editing (Yjs / Operational Transformation)
  - Live multi-user cursor presence & color-coded name tags
  - User activity log & real-time socket updates

```
+--------------------------------------------------------+
|                      EQUIBIN ROOM                      |
|                                                        |
|  Online Participants:                                  |
|  🟢 Alex (Editing line 12)                              |
|  🟢 Sam (Editing line 45)                              |
|  🟢 Maanas (Viewing)                                   |
|                                                        |
|  [ Live Real-Time Document Editor ]                    |
+--------------------------------------------------------+
```

#### Public Multi-Host Mode
Public bins can optionally enable `Allow Multiple Editors: ON`, allowing logged-in viewers to request edit privileges granted by the owner.

---

## 🗄️ Database Schemas & Data Models

### 1. Users Table
```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  display_id VARCHAR(10) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Bins Table
```sql
CREATE TABLE bins (
  id VARCHAR PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  file_type VARCHAR(100),
  type VARCHAR(20) DEFAULT 'public', -- 'public', 'private', 'equibin', 'ftp'
  owner_id VARCHAR REFERENCES users(id),
  owner_token VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);
```

### 3. Bin Members Table
```sql
CREATE TABLE bin_members (
  id VARCHAR PRIMARY KEY,
  bin_id VARCHAR REFERENCES bins(id) ON DELETE CASCADE,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'host', 'editor', 'viewer'
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Saved Bins Table
```sql
CREATE TABLE saved_bins (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  bin_id VARCHAR REFERENCES bins(id) ON DELETE CASCADE,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔮 Roadmap Summary & Additional Features

- [x] **v1.0**: Instant 6-code bins, localStorage owner tokens, 15m idle cleanup, Socket.IO sync.
- [x] **v1.2**: PWA installability, service worker caching, line numbers, glassmorphic UI.
- [ ] **v1.5 (Binly FTP)**: 100MB file transfers, CLI `curl` upload endpoint, QR beam, file previews.
- [ ] **v2.0 (Accounts & Privacy)**: User sign-up, display IDs (`Name#1234`), private access requests.
- [ ] **v3.0 (Collaboration)**: EquiBin room, live multi-cursor presence, CRDT conflict resolution.

---

<p align="center">
  <b>Binly Improvement Proposal (BIP-0001)</b> • Standard Documentation for Binly Specification & Roadmap
</p>
