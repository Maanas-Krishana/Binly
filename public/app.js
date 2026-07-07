// Socket connection
let socket;
let currentBinCode = null;
let saveDebounceTimer = null;
const DEBOUNCE_DELAY = 1000; // 1 second debounce for auto-save

// DOM Elements
const views = {
  landing: document.getElementById('view-landing'),
  owner: document.getElementById('view-owner'),
  viewer: document.getElementById('view-viewer'),
  error: document.getElementById('view-error')
};

// Landing Page Elements
const btnCreateBin = document.getElementById('btn-create-bin');
const joinCodeInput = document.getElementById('join-code-input');
const btnJoinBin = document.getElementById('btn-join-bin');

// Owner Page Elements
const ownerBinCode = document.getElementById('owner-bin-code');
const ownerStatusBadge = document.getElementById('owner-status-badge');
const ownerEditor = document.getElementById('owner-editor');
const ownerGutter = document.getElementById('owner-editor-gutter');
const btnCopyOwner = document.getElementById('btn-copy-owner');
const btnUpdateBin = document.getElementById('btn-update-bin');
const btnDeleteBin = document.getElementById('btn-delete-bin');
const btnShareOwner = document.getElementById('btn-share-owner');

// Viewer Page Elements
const viewerBinCode = document.getElementById('viewer-bin-code');
const viewerStatusBadge = document.getElementById('viewer-status-badge');
const viewerEditor = document.getElementById('viewer-editor');
const btnCopyViewer = document.getElementById('btn-copy-viewer');
const btnShareViewer = document.getElementById('btn-share-viewer');

// Error Page Elements
const btnErrorHome = document.getElementById('btn-error-home');

// Custom Dialog Elements
const deleteConfirmDialog = document.getElementById('delete-confirm-dialog');
const btnConfirmDeleteCancel = document.getElementById('btn-confirm-delete-cancel');
const btnConfirmDeleteOk = document.getElementById('btn-confirm-delete-ok');

// Global Header Elements
const logoHome = document.getElementById('logo-home');
const infoBtn = document.getElementById('info-btn-dialog');

// Toast Container
const toastContainer = document.getElementById('toast-container');

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '<i class="fa-solid fa-circle-info"></i>';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
  if (type === 'error') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
  
  toast.innerHTML = `${icon} <span>${message}</span>`;
  toastContainer.appendChild(toast);
  
  // Auto-remove toast after 3 seconds
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
    }, 250);
  }, 3000);
}

/* ==========================================================================
   Router / Navigation Logic
   ========================================================================== */
function showErrorView(title, message) {
  Object.values(views).forEach(view => view.classList.remove('active'));
  const titleEl = document.getElementById('error-view-title');
  const messageEl = document.getElementById('error-view-message');
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  views.error.classList.add('active');
}

function navigateTo(path) {
  window.history.pushState(null, '', path);
  handleRouting();
}

async function handleRouting() {
  // Cancel any pending saves
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const path = window.location.pathname;
  const binCodeRegex = /^\/([2-9A-Z]{6})$/i;
  const match = path.match(binCodeRegex);

  // Reset body classes
  document.body.className = '';

  // Hide all views first
  Object.values(views).forEach(view => view.classList.remove('active'));

  if (!match) {
    if (path === '/' || path === '') {
      // Show landing
      currentBinCode = null;
      views.landing.classList.add('active');
    } else {
      // Invalid URL structure -> show error
      showErrorView('Bin Not Found or Expired', 'The 6-character code you entered does not exist, has expired, or was deleted.');
    }
  } else {
    // We have a 6-character code
    const code = match[1].toUpperCase();
    currentBinCode = code;
    
    // Fetch bin details from server
    const ownerToken = localStorage.getItem(`ownerToken_${code}`);
    const headers = { 'Content-Type': 'application/json' };
    if (ownerToken) {
      headers['owner-token'] = ownerToken;
    }

    try {
      const response = await fetch(`/api/bins/${code}`, { headers });
      
      if (!response.ok) {
        throw new Error('Bin not found');
      }

      const data = await response.json();
      
      if (data.isOwner) {
        // Render Owner View
        views.owner.classList.add('active');
        setupOwnerView(data, ownerToken);
      } else {
        // Render Viewer View
        views.viewer.classList.add('active');
        setupCleanView(data);
      }
      
      // Connect websocket for real-time updates
      setupSocket(code, data.isOwner, ownerToken);

    } catch (error) {
      console.error(error);
      showErrorView('Bin Not Found or Expired', 'The 6-character code you entered does not exist, has expired, or was deleted.');
    }
  }
}

// Handle browser navigation (back/forward buttons)
window.addEventListener('popstate', handleRouting);

/* ==========================================================================
   Socket.IO Synchronization
   ========================================================================== */
function setupSocket(code, isOwner, ownerToken) {
  socket = io();
  
  socket.on('connect', () => {
    socket.emit('join-bin', { code, isOwner, ownerToken });
  });

  // Listen for real-time edits (Viewer Only)
  socket.on('bin-updated', ({ content }) => {
    if (!isOwner && viewerEditor.value !== content) {
      viewerEditor.value = content;
      showToast('Bin content updated in real-time', 'info');
    }
  });

  // Listen for owner status change (Viewer Only)
  socket.on('owner-status-updated', ({ ownerConnected }) => {
    if (!isOwner) {
      if (ownerConnected) {
        viewerStatusBadge.textContent = 'Viewer View. Expires 1 hour from now, or 15 mins idle.';
        showToast('Owner connected', 'success');
      } else {
        viewerStatusBadge.textContent = 'Viewer View. Owner is offline (expires in 15 mins).';
        showToast('Owner left the page. This bin will expire in 15 minutes if they do not return.', 'error');
      }
    }
  });

  // Listen for bin deletion (Viewer Only)
  socket.on('bin-deleted', () => {
    if (!isOwner) {
      showErrorView('Bin Deleted', 'This bin has been deleted by the owner.');
    }
  });

  socket.on('error-msg', (msg) => {
    showToast(msg, 'error');
  });
}

/* ==========================================================================
   Owner View Setup & Events
   ========================================================================== */
function setupOwnerView(data, ownerToken) {
  ownerBinCode.textContent = data.code;
  ownerEditor.value = data.content;
  updateLineNumbers();

  // Expiry / Connection Status
  ownerStatusBadge.textContent = `Status: Owned by you. Expires in 1h / 15m idle.`;
}

// Gutter line numbers updater
function updateLineNumbers() {
  const lines = ownerEditor.value.split('\n');
  const count = Math.max(1, lines.length);
  let html = '';
  for (let i = 1; i <= count; i++) {
    html += `<span>${i}</span>`;
  }
  ownerGutter.innerHTML = html;
  
  // Keep scroll in sync
  ownerGutter.scrollTop = ownerEditor.scrollTop;
}

// Synced scroll listener
ownerEditor.addEventListener('scroll', () => {
  ownerGutter.scrollTop = ownerEditor.scrollTop;
});

// Update gutter when content changes
ownerEditor.addEventListener('input', () => {
  updateLineNumbers();
  
  // Debounce auto-save
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  
  saveDebounceTimer = setTimeout(() => {
    saveBinContent(true);
  }, DEBOUNCE_DELAY);
});

// Save Function (HTTP PUT)
async function saveBinContent(isAutoSave = false) {
  if (!currentBinCode) return;
  const ownerToken = localStorage.getItem(`ownerToken_${currentBinCode}`);
  
  try {
    const response = await fetch(`/api/bins/${currentBinCode}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'owner-token': ownerToken
      },
      body: JSON.stringify({ content: ownerEditor.value })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save content');
    }
    
    if (isAutoSave) {
      console.log('Bin auto-saved successfully');
    } else {
      showToast('Bin updated successfully', 'success');
    }
  } catch (error) {
    console.error(error);
    showToast('Failed to save updates', 'error');
  }
}

// Manual Save button click
btnUpdateBin.addEventListener('click', () => {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveBinContent(false);
});

// Delete Bin button click (Trigger UI modal)
btnDeleteBin.addEventListener('click', () => {
  if (!currentBinCode) return;
  deleteConfirmDialog.showModal();
});

// Modal Dialog Button Listeners
btnConfirmDeleteCancel.addEventListener('click', () => {
  deleteConfirmDialog.close();
});

btnConfirmDeleteOk.addEventListener('click', async () => {
  deleteConfirmDialog.close();
  if (!currentBinCode) return;
  
  const ownerToken = localStorage.getItem(`ownerToken_${currentBinCode}`);
  try {
    const response = await fetch(`/api/bins/${currentBinCode}`, {
      method: 'DELETE',
      headers: {
        'owner-token': ownerToken
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete bin');
    }
    
    showToast('Bin deleted successfully', 'success');
    localStorage.removeItem(`ownerToken_${currentBinCode}`);
    navigateTo('/');
  } catch (error) {
    console.error(error);
    showToast('Failed to delete bin', 'error');
  }
});

// Copy Owner Content
btnCopyOwner.addEventListener('click', () => {
  navigator.clipboard.writeText(ownerEditor.value)
    .then(() => showToast('Copied content to clipboard', 'success'))
    .catch(() => showToast('Failed to copy to clipboard', 'error'));
});

/* ==========================================================================
   Viewer View Setup & Events
   ========================================================================== */
function setupCleanView(data) {
  viewerBinCode.textContent = data.code;
  viewerEditor.value = data.content;
  
  // Set subtitle status
  if (data.ownerConnected) {
    viewerStatusBadge.textContent = 'Viewer View. Expires 1 hour from now, or 15 mins idle.';
  } else {
    viewerStatusBadge.textContent = 'Viewer View. Owner is offline (expires in 15 mins).';
  }
}

// Copy Viewer Content
btnCopyViewer.addEventListener('click', () => {
  navigator.clipboard.writeText(viewerEditor.value)
    .then(() => showToast('Copied content to clipboard', 'success'))
    .catch(() => showToast('Failed to copy to clipboard', 'error'));
});

/* ==========================================================================
   Landing View Events
   ========================================================================== */

// Create Bin Button
btnCreateBin.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/bins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '' })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create bin');
    }
    
    const data = await response.json();
    
    // Store owner credentials locally
    localStorage.setItem(`ownerToken_${data.code}`, data.ownerToken);
    
    showToast('Bin created successfully!', 'success');
    navigateTo(`/${data.code}`);
  } catch (error) {
    console.error(error);
    showToast('Failed to create bin', 'error');
  }
});

// Code input manipulation (Capitalize & sanitize characters)
joinCodeInput.addEventListener('input', (e) => {
  let val = e.target.value.toUpperCase();
  // Filter out non-alphanumeric chars
  val = val.replace(/[^A-Z2-9]/g, '');
  e.target.value = val;
});

// Join button click or Enter key
function performJoin() {
  const code = joinCodeInput.value.trim().toUpperCase();
  if (code.length === 6) {
    joinCodeInput.value = '';
    navigateTo(`/${code}`);
  } else {
    showToast('Please enter a valid 6-character code', 'error');
  }
}

btnJoinBin.addEventListener('click', performJoin);
joinCodeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    performJoin();
  }
});

/* ==========================================================================
   Global Header & Error Page Events & Init
   ========================================================================== */
logoHome.addEventListener('click', () => {
  navigateTo('/');
});

infoBtn.addEventListener('click', () => {
  showToast('Binly v1.0.0 — Instant, temporary text and code sharing. Auto-deletes on disconnect/inactivity.', 'info');
});

btnErrorHome.addEventListener('click', () => {
  navigateTo('/');
});

// Share Bin Link Helper
function shareBin(code) {
  if (!code) return;
  const shareUrl = `${window.location.origin}/${code}`;
  if (navigator.share) {
    navigator.share({
      title: 'Binly Instant Code Share',
      text: `Check out my shared clip on Binly: ${code}`,
      url: shareUrl
    }).catch((err) => {
      // User cancelled or share failed
    });
  } else {
    // Fallback: Copy link and toast
    navigator.clipboard.writeText(shareUrl);
    showToast('Bin link copied to clipboard!', 'success');
  }
}

btnShareOwner.addEventListener('click', () => {
  shareBin(currentBinCode);
});

btnShareViewer.addEventListener('click', () => {
  shareBin(currentBinCode);
});

// Initialize Route
handleRouting();
