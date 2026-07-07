const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists if DB_PATH is specified inside a subdirectory
const dbPath = process.env.DB_PATH || path.join(__dirname, 'binly.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database
const db = new Database(dbPath);

// Create Bins table
db.exec(`
  CREATE TABLE IF NOT EXISTS bins (
    code TEXT PRIMARY KEY,
    content TEXT,
    ownerToken TEXT,
    createdAt INTEGER,
    lastActivity INTEGER,
    ownerConnected INTEGER DEFAULT 1,
    ownerDisconnectTime INTEGER
  )
`);

// Helper to generate a unique 6-character code
// Uses uppercase letters and numbers, excluding confusing ones: 0, O, 1, I
const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function generateUniqueCode() {
  let attempts = 0;
  const stmt = db.prepare('SELECT 1 FROM bins WHERE code = ?');
  while (attempts < 1000) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * CHARS.length);
      code += CHARS[randomIndex];
    }
    const row = stmt.get(code);
    if (!row) {
      return code;
    }
    attempts++;
  }
  throw new Error('Failed to generate a unique bin code');
}

/**
 * Create a new bin
 * @param {string} content 
 * @returns {object} The created bin object
 */
function createBin(content = '') {
  const code = generateUniqueCode();
  const ownerToken = uuidv4();
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO bins (code, content, ownerToken, createdAt, lastActivity, ownerConnected, ownerDisconnectTime)
    VALUES (?, ?, ?, ?, ?, 1, NULL)
  `).run(code, content, ownerToken, now, now);
  
  return {
    code,
    content,
    ownerToken,
    createdAt: new Date(now),
    lastActivity: new Date(now),
    ownerConnected: true,
    ownerDisconnectTime: null
  };
}

/**
 * Get a bin by its code
 * @param {string} code 
 * @returns {object|null} The bin or null
 */
function getBin(code) {
  const row = db.prepare('SELECT * FROM bins WHERE code = ?').get(code);
  if (row) {
    const now = Date.now();
    // Update last activity on access
    db.prepare('UPDATE bins SET lastActivity = ? WHERE code = ?').run(now, code);
    
    return {
      code: row.code,
      content: row.content,
      ownerToken: row.ownerToken,
      createdAt: new Date(row.createdAt),
      lastActivity: new Date(now),
      ownerConnected: row.ownerConnected === 1,
      ownerDisconnectTime: row.ownerDisconnectTime ? new Date(row.ownerDisconnectTime) : null
    };
  }
  return null;
}

/**
 * Update bin content
 * @param {string} code 
 * @param {string} content 
 * @param {string} ownerToken 
 * @returns {boolean} Success
 */
function updateBin(code, content, ownerToken) {
  const row = db.prepare('SELECT ownerToken FROM bins WHERE code = ?').get(code);
  if (!row) return false;
  if (row.ownerToken !== ownerToken) {
    throw new Error('Unauthorized update request');
  }
  const now = Date.now();
  db.prepare('UPDATE bins SET content = ?, lastActivity = ? WHERE code = ?').run(content, now, code);
  return true;
}

/**
 * Delete a bin
 * @param {string} code 
 * @param {string} ownerToken 
 * @returns {boolean} Success
 */
function deleteBin(code, ownerToken) {
  const row = db.prepare('SELECT ownerToken FROM bins WHERE code = ?').get(code);
  if (!row) return false;
  if (row.ownerToken !== ownerToken) {
    throw new Error('Unauthorized delete request');
  }
  db.prepare('DELETE FROM bins WHERE code = ?').run(code);
  return true;
}

/**
 * Update the owner's socket connection status for a bin
 * @param {string} code 
 * @param {boolean} isConnected 
 */
function setOwnerStatus(code, isConnected) {
  const now = Date.now();
  if (isConnected) {
    db.prepare('UPDATE bins SET ownerConnected = 1, ownerDisconnectTime = NULL WHERE code = ?').run(code);
  } else {
    db.prepare('UPDATE bins SET ownerConnected = 0, ownerDisconnectTime = ? WHERE code = ?').run(now, code);
  }
}

// Background cleanup job for expired bins
// Checks every 10 seconds
setInterval(() => {
  const now = Date.now();
  
  // Rule 1: Owner leaves for 15 minutes (900000 ms)
  const fifteenMinsAgo = now - 15 * 60 * 1000;
  const expiredOwners = db.prepare(`
    SELECT code FROM bins 
    WHERE ownerConnected = 0 
      AND ownerDisconnectTime IS NOT NULL 
      AND ownerDisconnectTime < ?
  `).all(fifteenMinsAgo);
  
  for (const row of expiredOwners) {
    console.log(`[Expiry] Bin ${row.code} deleted because owner was disconnected for > 15 mins.`);
    db.prepare('DELETE FROM bins WHERE code = ?').run(row.code);
  }
  
  // Rule 2: No activity for 1 hour (3600000 ms)
  const oneHourAgo = now - 60 * 60 * 1000;
  const expiredIdle = db.prepare(`
    SELECT code FROM bins 
    WHERE lastActivity < ?
  `).all(oneHourAgo);
  
  for (const row of expiredIdle) {
    console.log(`[Expiry] Bin ${row.code} deleted due to inactivity for > 1 hour.`);
    db.prepare('DELETE FROM bins WHERE code = ?').run(row.code);
  }
}, 10000);

// Mock bins Map export for debugging/compatibility purposes
const bins = {
  has(code) {
    const row = db.prepare('SELECT 1 FROM bins WHERE code = ?').get(code);
    return !!row;
  },
  get(code) {
    const row = db.prepare('SELECT * FROM bins WHERE code = ?').get(code);
    if (!row) return null;
    return {
      code: row.code,
      content: row.content,
      ownerToken: row.ownerToken,
      createdAt: new Date(row.createdAt),
      lastActivity: new Date(row.lastActivity),
      ownerConnected: row.ownerConnected === 1,
      ownerDisconnectTime: row.ownerDisconnectTime ? new Date(row.ownerDisconnectTime) : null
    };
  },
  delete(code) {
    db.prepare('DELETE FROM bins WHERE code = ?').run(code);
  }
};

module.exports = {
  createBin,
  getBin,
  updateBin,
  deleteBin,
  setOwnerStatus,
  bins
};
