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

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check / Keep-alive endpoint
app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});

// API Routes

// Create a new bin
app.post('/api/bins', async (req, res) => {
  try {
    const { content } = req.body;
    const bin = await db.createBin(content || '');
    res.status(201).json({
      code: bin.code,
      content: bin.content,
      ownerToken: bin.ownerToken,
      expiresIn: '1h / 15m idle'
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
  
  // Calculate expiry estimate
  const now = new Date();
  const timeSinceLastActivity = now - bin.lastActivity;
  const hourMs = 60 * 60 * 1000;
  const timeRemaining = Math.max(0, hourMs - timeSinceLastActivity);
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

// Socket.IO Logic
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);
  
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
    console.log(`[Socket] Disconnected: ${socket.id}`);
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
  console.log(`========================================`);
});
