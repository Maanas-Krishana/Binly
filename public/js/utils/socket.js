let socket = null;

export function setupSocket(code, isOwner, ownerToken, callbacks = {}) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io();

  socket.on('connect', () => {
    socket.emit('join-bin', { code, isOwner, ownerToken });
    if (callbacks.onConnect) callbacks.onConnect();
  });

  socket.on('disconnect', () => {
    if (callbacks.onDisconnect) callbacks.onDisconnect();
  });

  socket.on('connect_error', () => {
    if (callbacks.onConnectError) callbacks.onConnectError();
  });

  socket.on('bin-updated', ({ content }) => {
    if (callbacks.onBinUpdated) callbacks.onBinUpdated(content);
  });

  socket.on('owner-status-updated', ({ ownerConnected }) => {
    if (callbacks.onOwnerStatusUpdated) callbacks.onOwnerStatusUpdated(ownerConnected);
  });

  socket.on('bin-deleted', () => {
    if (callbacks.onBinDeleted) callbacks.onBinDeleted();
  });

  socket.on('error-msg', (msg) => {
    if (callbacks.onErrorMsg) callbacks.onErrorMsg(msg);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
