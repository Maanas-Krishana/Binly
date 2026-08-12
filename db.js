const { v4: uuidv4 } = require('uuid');
const path = require('path');

const usePostgres = !!process.env.DATABASE_URL;

let db; // SQLite connection
let pool; // Postgres connection pool

if (usePostgres) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  // Initialize table
  pool.query(`
    CREATE TABLE IF NOT EXISTS bins (
      code TEXT PRIMARY KEY,
      content TEXT,
      owner_token TEXT,
      created_at BIGINT,
      last_activity BIGINT,
      owner_connected INTEGER DEFAULT 1,
      owner_disconnect_time BIGINT
    )
  `).catch(err => console.error('[Postgres] Table creation error:', err));
} else {
  const Database = require('better-sqlite3');
  const fs = require('fs');
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'binly.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new Database(dbPath);
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
}

// Helper to generate a unique 6-character code
// Uses uppercase letters and numbers, excluding confusing ones: 0, O, 1, I
const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
async function generateUniqueCode() {
  let attempts = 0;
  while (attempts < 1000) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * CHARS.length);
      code += CHARS[randomIndex];
    }
    
    let exists;
    if (usePostgres) {
      const res = await pool.query('SELECT 1 FROM bins WHERE code = $1', [code]);
      exists = res.rowCount > 0;
    } else {
      const row = db.prepare('SELECT 1 FROM bins WHERE code = ?').get(code);
      exists = !!row;
    }
    
    if (!exists) {
      return code;
    }
    attempts++;
  }
  throw new Error('Failed to generate a unique bin code');
}

function mapRow(row) {
  if (!row) return null;
  return {
    code: row.code,
    content: row.content,
    ownerToken: row.owner_token !== undefined ? row.owner_token : row.ownerToken,
    createdAt: new Date(Number(row.created_at !== undefined ? row.created_at : row.createdAt)),
    lastActivity: new Date(Number(row.last_activity !== undefined ? row.last_activity : row.lastActivity)),
    ownerConnected: (row.owner_connected !== undefined ? row.owner_connected : row.ownerConnected) === 1,
    ownerDisconnectTime: (row.owner_disconnect_time !== undefined ? row.owner_disconnect_time : row.ownerDisconnectTime) ? new Date(Number(row.owner_disconnect_time !== undefined ? row.owner_disconnect_time : row.ownerDisconnectTime)) : null
  };
}

/**
 * Create a new bin
 * @param {string} content 
 * @returns {Promise<object>} The created bin object
 */
async function createBin(content = '') {
  const code = await generateUniqueCode();
  const ownerToken = uuidv4();
  const now = Date.now();
  
  if (usePostgres) {
    await pool.query(`
      INSERT INTO bins (code, content, owner_token, created_at, last_activity, owner_connected, owner_disconnect_time)
      VALUES ($1, $2, $3, $4, $5, 1, NULL)
    `, [code, content, ownerToken, now, now]);
  } else {
    db.prepare(`
      INSERT INTO bins (code, content, ownerToken, createdAt, lastActivity, ownerConnected, ownerDisconnectTime)
      VALUES (?, ?, ?, ?, ?, 1, NULL)
    `).run(code, content, ownerToken, now, now);
  }
  
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
 * @returns {Promise<object|null>} The bin or null
 */
async function getBin(code) {
  let row;
  const now = Date.now();
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM bins WHERE code = $1', [code]);
    row = res.rows[0];
    if (row) {
      await pool.query('UPDATE bins SET last_activity = $1 WHERE code = $2', [now, code]);
    }
  } else {
    row = db.prepare('SELECT * FROM bins WHERE code = ?').get(code);
    if (row) {
      db.prepare('UPDATE bins SET lastActivity = ? WHERE code = ?').run(now, code);
    }
  }
  
  if (row) {
    const mapped = mapRow(row);
    mapped.lastActivity = new Date(now);
    return mapped;
  }
  return null;
}

/**
 * Update bin content
 * @param {string} code 
 * @param {string} content 
 * @param {string} ownerToken 
 * @returns {Promise<boolean>} Success
 */
async function updateBin(code, content, ownerToken) {
  let dbOwnerToken;
  if (usePostgres) {
    const res = await pool.query('SELECT owner_token FROM bins WHERE code = $1', [code]);
    dbOwnerToken = res.rows[0]?.owner_token;
  } else {
    const row = db.prepare('SELECT ownerToken FROM bins WHERE code = ?').get(code);
    dbOwnerToken = row?.ownerToken;
  }
  
  if (!dbOwnerToken) return false;
  if (dbOwnerToken !== ownerToken) {
    throw new Error('Unauthorized update request');
  }
  
  const now = Date.now();
  if (usePostgres) {
    await pool.query('UPDATE bins SET content = $1, last_activity = $2 WHERE code = $3', [content, now, code]);
  } else {
    db.prepare('UPDATE bins SET content = ?, lastActivity = ? WHERE code = ?').run(content, now, code);
  }
  return true;
}

/**
 * Delete a bin
 * @param {string} code 
 * @param {string} ownerToken 
 * @returns {Promise<boolean>} Success
 */
async function deleteBin(code, ownerToken) {
  let dbOwnerToken;
  if (usePostgres) {
    const res = await pool.query('SELECT owner_token FROM bins WHERE code = $1', [code]);
    dbOwnerToken = res.rows[0]?.owner_token;
  } else {
    const row = db.prepare('SELECT ownerToken FROM bins WHERE code = ?').get(code);
    dbOwnerToken = row?.ownerToken;
  }
  
  if (!dbOwnerToken) return false;
  if (dbOwnerToken !== ownerToken) {
    throw new Error('Unauthorized delete request');
  }
  
  if (usePostgres) {
    await pool.query('DELETE FROM bins WHERE code = $1', [code]);
  } else {
    db.prepare('DELETE FROM bins WHERE code = ?').run(code);
  }
  return true;
}

/**
 * Update the owner's socket connection status for a bin
 * @param {string} code 
 * @param {boolean} isConnected 
 */
async function setOwnerStatus(code, isConnected) {
  const now = Date.now();
  if (usePostgres) {
    if (isConnected) {
      await pool.query('UPDATE bins SET owner_connected = 1, owner_disconnect_time = NULL WHERE code = $1', [code]);
    } else {
      await pool.query('UPDATE bins SET owner_connected = 0, owner_disconnect_time = $1 WHERE code = $2', [now, code]);
    }
  } else {
    if (isConnected) {
      db.prepare('UPDATE bins SET ownerConnected = 1, ownerDisconnectTime = NULL WHERE code = ?').run(code);
    } else {
      db.prepare('UPDATE bins SET ownerConnected = 0, ownerDisconnectTime = ? WHERE code = ?').run(now, code);
    }
  }
}

// Background cleanup job for expired bins
// Checks every 10 seconds
setInterval(async () => {
  const now = Date.now();
  const fifteenMinsAgo = now - 15 * 60 * 1000;
  
  if (usePostgres) {
    try {
      // 1. Owner disconnected for > 15 minutes OR inactive for > 15 minutes
      const res = await pool.query(`
        SELECT code FROM bins 
        WHERE (owner_connected = 0 AND owner_disconnect_time IS NOT NULL AND owner_disconnect_time < $1)
           OR (last_activity < $1)
      `, [fifteenMinsAgo]);
      
      for (const row of res.rows) {
        console.log(`[Expiry] Bin ${row.code} deleted due to 15m idle / disconnect.`);
        await pool.query('DELETE FROM bins WHERE code = $1', [row.code]);
      }
    } catch (err) {
      console.error('[Postgres] Expiry check error:', err);
    }
  } else {
    // SQLite Cleanups
    const expiredBins = db.prepare(`
      SELECT code FROM bins 
      WHERE (ownerConnected = 0 AND ownerDisconnectTime IS NOT NULL AND ownerDisconnectTime < ?)
         OR (lastActivity < ?)
    `).all(fifteenMinsAgo, fifteenMinsAgo);
    
    for (const row of expiredBins) {
      console.log(`[Expiry] Bin ${row.code} deleted due to 15m idle / disconnect.`);
      db.prepare('DELETE FROM bins WHERE code = ?').run(row.code);
    }
  }
}, 10000);

// Mock bins Map export for debugging/compatibility purposes
const bins = {
  async has(code) {
    if (usePostgres) {
      const res = await pool.query('SELECT 1 FROM bins WHERE code = $1', [code]);
      return res.rowCount > 0;
    } else {
      const row = db.prepare('SELECT 1 FROM bins WHERE code = ?').get(code);
      return !!row;
    }
  },
  async get(code) {
    let row;
    if (usePostgres) {
      const res = await pool.query('SELECT * FROM bins WHERE code = $1', [code]);
      row = res.rows[0];
    } else {
      row = db.prepare('SELECT * FROM bins WHERE code = ?').get(code);
    }
    return mapRow(row);
  },
  async delete(code) {
    if (usePostgres) {
      await pool.query('DELETE FROM bins WHERE code = $1', [code]);
    } else {
      db.prepare('DELETE FROM bins WHERE code = ?').run(code);
    }
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
