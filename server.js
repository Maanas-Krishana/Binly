require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const db = require('./db');


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const ADMIN_KEY = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Admin authentication middleware
function requireAdminAuth(req, res, next) {
  if (!ADMIN_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration: ADMIN_PASSWORD is not configured in .env' });
  }
  const authHeader = req.headers['x-admin-key'] || req.headers['authorization'];
  let token = authHeader;
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  }
  if (!token || token !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin key' });
  }
  next();
}


// ----------------------------------------------------
// Public & Core API Routes
// ----------------------------------------------------

// Record unique visitor telemetry
app.post('/api/analytics/visit', async (req, res) => {
  try {
    const { visitorId } = req.body;
    if (visitorId) {
      await db.recordVisitor(visitorId);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new bin
app.post('/api/bins', async (req, res) => {
  try {
    const { content } = req.body;
    const bin = await db.createBin(content || '');
    res.status(201).json({
      code: bin.code,
      content: bin.content,
      ownerToken: bin.ownerToken,
      expiresIn: '15m idle / disconnect'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a bin's data
app.get('/api/bins/:code', async (req, res) => {
  const { code } = req.params;
  const ownerTokenHeader = req.headers['owner-token'];
  
  const bin = await db.getBin(code.toUpperCase());
  if (!bin) {
    return res.status(404).json({ error: 'Bin not found or expired' });
  }
  
  const isOwner = bin.ownerToken === ownerTokenHeader;
  
  // Calculate expiry estimate (15 mins idle)
  const now = new Date();
  const timeSinceLastActivity = now - bin.lastActivity;
  const fifteenMinsMs = 15 * 60 * 1000;
  const timeRemaining = Math.max(0, fifteenMinsMs - timeSinceLastActivity);
  const minutesRemaining = Math.round(timeRemaining / 1000 / 60);

  res.json({
    code: bin.code,
    content: bin.content,
    isOwner,
    expiresInMins: minutesRemaining,
    ownerConnected: bin.ownerConnected
  });
});

// Update a bin's content (Owner only)
app.put('/api/bins/:code', async (req, res) => {
  const { code } = req.params;
  const { content } = req.body;
  const ownerToken = req.headers['owner-token'];
  
  const bin = await db.getBin(code.toUpperCase());
  if (!bin) {
    return res.status(404).json({ error: 'Bin not found or expired' });
  }
  
  if (bin.ownerToken !== ownerToken) {
    return res.status(403).json({ error: 'Unauthorized: Invalid owner token' });
  }
  
  try {
    await db.updateBin(code.toUpperCase(), content, ownerToken);
    
    // Notify all other clients in the bin room that content has changed
    io.to(`bin:${bin.code}`).emit('bin-updated', { content });
    
    res.json({ success: true, content });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a bin (Owner only)
app.delete('/api/bins/:code', async (req, res) => {
  const { code } = req.params;
  const ownerToken = req.headers['owner-token'];
  
  const bin = await db.getBin(code.toUpperCase());
  if (!bin) {
    return res.status(404).json({ error: 'Bin not found or expired' });
  }
  
  if (bin.ownerToken !== ownerToken) {
    return res.status(403).json({ error: 'Unauthorized: Invalid owner token' });
  }
  
  try {
    await db.deleteBin(code.toUpperCase(), ownerToken);
    
    // Notify viewers that the bin was deleted
    io.to(`bin:${bin.code}`).emit('bin-deleted');
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Admin & Analytics API Endpoints
// ----------------------------------------------------

// Admin Login verification
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!ADMIN_KEY) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured in .env' });
  }
  if (password && password === ADMIN_KEY) {
    res.json({ success: true, token: ADMIN_KEY });
  } else {
    res.status(401).json({ error: 'Invalid admin credentials' });
  }
});


// Admin Analytics Telemetry
app.get('/api/admin/analytics', requireAdminAuth, async (req, res) => {
  try {
    const analytics = await db.getAnalytics();
    
    // Calculate active Socket.IO connections & rooms
    const activeSockets = io.engine.clientsCount || 0;
    const rooms = io.sockets.adapter.rooms;
    let activeBinRooms = 0;
    rooms.forEach((_, roomName) => {
      if (roomName.startsWith('bin:')) activeBinRooms++;
    });

    const uptimeSeconds = Math.floor(process.uptime());
    const mem = process.memoryUsage();

    res.json({
      success: true,
      data: {
        ...analytics,
        realtime: {
          activeSockets,
          activeBinRooms,
          uptimeSeconds,
          memoryMb: Math.round(mem.heapUsed / 1024 / 1024),
          totalMemoryMb: Math.round(mem.heapTotal / 1024 / 1024),
          nodeVersion: process.version,
          dbEngine: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Force Delete Bin
app.delete('/api/admin/bins/:code', requireAdminAuth, async (req, res) => {
  const { code } = req.params;
  const uppercaseCode = code.toUpperCase();
  try {
    await db.adminDeleteBin(uppercaseCode);
    io.to(`bin:${uppercaseCode}`).emit('bin-deleted');
    res.json({ success: true, message: `Bin ${uppercaseCode} terminated by admin.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Page Routes
// ----------------------------------------------------

// Admin Dashboard page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fallback routing: Match 6-character codes and serve index.html
app.get('/:code', (req, res, next) => {
  const code = req.params.code;
  if (/^[2-9A-Z]{6}$/i.test(code)) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// For any other route, redirect to home or serve index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------------------------------------
// Socket.IO Logic
// ----------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id} (Active total: ${io.engine.clientsCount})`);
  
  socket.on('join-bin', async ({ code, isOwner, ownerToken }) => {
    const uppercaseCode = code.toUpperCase();
    const bin = await db.getBin(uppercaseCode);
    
    if (!bin) {
      socket.emit('error-msg', 'Bin not found');
      return;
    }
    
    socket.binCode = uppercaseCode;
    socket.isOwner = isOwner && (bin.ownerToken === ownerToken);
    
    socket.join(`bin:${uppercaseCode}`);
    console.log(`[Socket] Socket ${socket.id} joined room bin:${uppercaseCode} (Owner: ${socket.isOwner})`);
    
    if (socket.isOwner) {
      await db.setOwnerStatus(uppercaseCode, true);
      // Broadcast owner status update to room
      io.to(`bin:${uppercaseCode}`).emit('owner-status-updated', { ownerConnected: true });
    }
  });
  
  socket.on('disconnect', async () => {
    console.log(`[Socket] Disconnected: ${socket.id} (Remaining: ${io.engine.clientsCount})`);
    if (socket.binCode && socket.isOwner) {
      await db.setOwnerStatus(socket.binCode, false);
      console.log(`[Socket] Owner disconnected from bin ${socket.binCode}. Expiry timer started.`);
      // Broadcast owner status update to room
      io.to(`bin:${socket.binCode}`).emit('owner-status-updated', { ownerConnected: false });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`Binly Server running on http://localhost:${PORT}`);
  console.log(`Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`========================================`);
});
