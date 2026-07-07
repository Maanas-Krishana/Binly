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

# System Architecture

Frontend:

* React
* Monaco Editor
* Tailwind CSS

Backend:

* Node.js
* Express

Realtime:

* Socket.IO
* WebSockets

Collaboration:

* Yjs CRDT

Temporary Storage:

* Redis

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
* File sharing
* Version history
* Fork bins
* Team workspaces

---

# Vision

Binly is not just a Pastebin clone.

It is:

"A temporary browser-based workspace for instant transfer and collaboration."
