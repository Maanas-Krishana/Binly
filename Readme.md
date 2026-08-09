# Binly

> A zero-friction temporary text and code sharing platform built for instant cross-device transfer and real-time collaboration.

## Overview

Binly solves a simple problem:

You have text or code on one device and need it instantly on another device without:

* Logging into messaging apps
* Sending emails
* Connecting cables
* Installing software

Example:

A student in a college lab has code on their phone and wants it on a lab computer.

Instead of logging into WhatsApp Web or email:

1. Open Binly on phone
2. Create a bin
3. Paste the code
4. Receive a short bin code
5. Enter that code on the computer
6. Instantly access the content

---

# Core Idea

A Bin is a temporary shared space containing text/code.

Every bin has:

* Unique join code
* Owner
* Expiry system
* Permission control

---

# Version 1 — Instant Bin

## Goal

Create a fast temporary clipboard between devices.

No account required.

## Features

### Create Bin

User clicks:

```
Create Bin
```

System generates:

```
BIN CODE

A7K92P
```

Creator automatically becomes the owner.

---

## Join Bin

Other device enters:

```
Enter Bin Code

A7K92P
```

The user joins as viewer.

---

## Permission System

### Owner

Can:

* Edit content
* Update bin
* Delete bin

### Viewer

Can:

* View content
* Copy content

Cannot:

* Modify bin

---

## Ownership System

No login needed.

When a bin is created:

Server generates:

* bin code
* owner token

Owner token is stored locally in the browser.

Example:

```
Browser Storage

binCode=A7K92P
ownerToken=random-secret-key
```

The token proves ownership.

---

## Expiry Rules

A bin is temporary.

Destroy conditions:

1. Owner leaves for 15 minutes

or

2. No activity for 1 hour

---

# Version 1.5 — Binly FTP as a Service (File Transfer Protocol)

## Goal

Extend Binly beyond text/code to zero-friction temporary file hosting and transfers up to 100 MB.

No registration. No credentials. No complex FTP clients required.

---

## Try Binly FTP (Landing Page Section)

On the landing page, users can choose between standard text/code clipboards and **Binly FTP**:

1. **Host & Upload**: Simply drag & drop or upload any PDF, image, video, document, or binary asset **under 100 MB**.
2. **Generate Code**: Binly automatically provisions a unique 6-digit bin access code (e.g. `F9K32X`).
3. **Viewer Access & Download**: The receiver enters the 6-digit bin code on any device and instantly streams or downloads the hosted file.

```
+--------------------------------------------------------+
|                   TRY BINLY FTP                       |
|                                                        |
|  [ Upload File (PDF, Image, Video < 100MB) ]           |
|                           ↓                            |
|             Generated Bin Code: F9K32X                 |
|                           ↓                            |
|  Viewer enters code "F9K32X" ---> Downloads file       |
+--------------------------------------------------------+
```

---

## Core Binly FTP Feature Matrix

### 1. Zero-Friction Transfer Modes
* **One-Click Web FTP**: Drag & drop or pick any file up to 100 MB directly in the browser.
* **Terminal / CLI FTP (cURL & HTTP)**: Upload files straight from your terminal without opening a browser:
  ```bash
  # Upload via CLI
  curl -F "file=@presentation.pdf" https://binly.app/api/ftp/upload
  # Output: {"code":"F9K32X","expiresIn":"1h"}

  # Download via CLI
  curl -O https://binly.app/api/ftp/F9K32X/download
  ```
* **Instant QR Beam**: Generate dynamic QR codes for uploaded files so mobile devices can scan and download media instantly without typing codes.

---

### 2. File Streaming & Native Preview Engine
* **Instant Media Streaming**: Stream MP4, WebM, MP3, and WAV files directly inside the viewer modal before downloading.
* **PDF & Document Reader**: Integrated in-browser renderer for PDFs, markdown files, and image assets (PNG, JPG, SVG, WebP, GIF).
* **Archive Inspector**: Preview zip contents without unpacking to verify contents before downloading.

---

### 3. Security, Privacy & Control
* **Burn-on-Read / Self-Destruct**: Host can toggle "Delete file after first download" for sensitive single-use transfers.
* **Password / PIN Lock**: Host can set a 4-digit PIN for sensitive FTP bins.
* **Granular Download Counter & Logs**: Real-time Socket.IO notification when a viewer starts downloading or finishes fetching the file.
* **End-to-End Encryption (Optional)**: In-browser AES-256 client-side encryption before uploading, decrypting in recipient browser with explicit secret key.

---

### 4. Storage & Lifecycle Rules
* **Strict Size Limit**: Up to **100 MB** per file/bin.
* **Auto-Cleanup / Ephemeral Storage**: Files reside in high-speed ephemeral object storage / memory cache. Files auto-destruct on:
  - 1 hour total lifetime
  - 15 minutes of host disconnect
  - Explicit manual deletion by host
* **Resumable & Chunked Uploads**: Reliable chunked upload pipeline for unstable mobile/wifi connections.

---


# Version 2 — Accounts and Private Bins

## User Accounts

Accounts unlock advanced features.

Logged users receive:

* Permanent profile
* Unique display ID
* Saved bins
* Recent history

Example:

```
⭐ Maanas#2047
```

---

# Bin Types

## Public Bin

Same as Version 1.

Fast sharing.

Anyone with the code can join.

---

## Private Bin

Controlled sharing.

Rules:

* Login required
* Host approval needed
* Maximum 20 members including host

Flow:

User joins:

```
Enter Private Code
```

Status:

```
Waiting for host approval...
```

Host receives:

```
Join Request

Alex#1842 wants access

Accept | Reject
```

---

## Private Bin Permissions

Host:

* Edit content
* Remove users
* Approve requests
* Save permanently

Members:

* View
* Copy
* Save

---

# History System

Every logged user stores their last 5 joined bins.

Example:

```
Recent:

1. Java Project Code
2. SQL Queries
3. Python Notes
```

---

# Save Bin

Temporary bins can become permanent.

Flow:

```
Temporary Storage

        ↓

Save Bin

        ↓

Permanent Storage
```

---

# Version 3 — Collaboration

## EquiBin

A collaborative bin where everyone is equal.

Rules:

* Maximum 10 users
* Login required
* Everyone can edit

Features:

* Live editing
* Cursor presence
* User activity
* Conflict-free updates

Example:

```
EquiBin

Online:

🟢 Alex
🟢 Sam
🟢 Maanas


Everyone Editing
```

---

# Public Multi Host Mode

Public bins can enable:

```
Allow Multiple Editors: ON
```

Rules:

* Only logged users can become editors
* Owner controls access

---

# Additional Features & Roadmap

* **QR Code Quick Join**: Mobile scan-to-open for instant zero-type transfers across devices.
* **File Upload & Drag-and-Drop**: Direct drop file uploads into bins for text, code, or FTP files.
* **Live Socket Sync**: Real-time broadcast notification on content updates, owner disconnects, or bin deletions.
* **Smart Line Gutter & Syntax Highlighting**: Auto line-numbering and formatting tailored for developer snippet sharing.
* **PWA & Offline UI Capabilities**: Installable progressive web app experience for quick access.
* **Binly FTP Storage**: High-speed ephemeral binary storage (< 100 MB) for media, docs, and archives.

---

# System Architecture

Frontend:

* React / Modern HTML5 Vanilla JS UI
* Monaco Editor / Custom Code Editor
* Tailwind CSS / CSS3 Glassmorphism System

Backend:

* Node.js
* Express

Realtime:

* Socket.IO
* WebSockets

Collaboration:

* Yjs CRDT

Temporary Storage:

* Redis / SQLite ephemera

Permanent Storage:

* PostgreSQL

---

# Database Design

## Users

Fields:

```
id
username
display_id
email
password_hash
created_at
```

---

## Bins

Fields:

```
id
code
content
file_url
file_name
file_size
file_type
type
owner_id
owner_token
created_at
last_activity
expires_at
```

---

## Bin Members

Fields:

```
id
bin_id
user_id
role
joined_at
```

---

## Saved Bins

Fields:

```
id
user_id
bin_id
saved_at
```

---

# Future Ideas

* QR code joining
* Code formatting
* Syntax highlighting
* File sharing & Binly FTP Service
* Version history
* Fork bins
* Team workspaces

---

# Vision

Binly is not just a Pastebin clone.

It is:

"A temporary browser-based workspace for instant transfer, FTP file hosting, and collaboration."

