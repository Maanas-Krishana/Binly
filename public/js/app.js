import { getBin } from './utils/api.js';
import { setupSocket, disconnectSocket } from './utils/socket.js';
import { showToast } from './utils/toast.js';
import { LandingView } from './components/LandingView.js';
import { MetaBlock } from './components/MetaBlock.js';
import { Editor } from './components/Editor.js';
import { ConfirmationDialog } from './components/ConfirmationDialog.js';

// Global variables
let currentBinCode = null;

// Views
const views = {
  landing: document.getElementById('view-landing'),
  owner: document.getElementById('view-owner'),
  viewer: document.getElementById('view-viewer'),
  error: document.getElementById('view-error')
};

// Error Page Elements
const btnErrorHome = document.getElementById('btn-error-home');
const logoHome = document.getElementById('logo-home');
const infoBtn = document.getElementById('info-btn-dialog');

// Instantiate views/components
const landingView = new LandingView(
  (code) => navigateTo(`/${code}`),
  (code) => navigateTo(`/${code}`)
);

const ownerMetaBlock = new MetaBlock(true);
const viewerMetaBlock = new MetaBlock(false);

const ownerEditor = new Editor(true);
const viewerEditor = new Editor(false);

const deleteDialog = new ConfirmationDialog(() => {
  navigateTo('/');
});

// Setup navigation helpers
export function showErrorView(title, message) {
  Object.values(views).forEach(view => view.classList.remove('active'));
  const titleEl = document.getElementById('error-view-title');
  const messageEl = document.getElementById('error-view-message');
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  views.error.classList.add('active');
}

export function navigateTo(path) {
  window.history.pushState(null, '', path);
  handleRouting();
}

async function handleRouting() {
  // Destroy editor timers
  ownerEditor.destroy();
  viewerEditor.destroy();

  // Disconnect socket
  disconnectSocket();

  const path = window.location.pathname;
  const binCodeRegex = /^\/([2-9A-Z]{6})$/i;
  const match = path.match(binCodeRegex);

  // Hide all views first
  Object.values(views).forEach(view => view.classList.remove('active'));

  if (!match) {
    if (path === '/' || path === '') {
      currentBinCode = null;
      views.landing.classList.add('active');
    } else {
      showErrorView('Bin Not Found or Expired', 'The 6-character code you entered does not exist, has expired, or was deleted.');
    }
  } else {
    const code = match[1].toUpperCase();
    currentBinCode = code;
    deleteDialog.setCode(code);

    const ownerToken = localStorage.getItem(`ownerToken_${code}`);

    try {
      const data = await getBin(code, ownerToken);

      if (data.isOwner) {
        views.owner.classList.add('active');
        ownerMetaBlock.update(code, true);
        ownerEditor.init(code, data.content);
      } else {
        views.viewer.classList.add('active');
        viewerMetaBlock.update(code, data.ownerConnected);
        viewerEditor.init(code, data.content);
      }

      // Initialize Socket connection
      setupSocket(code, data.isOwner, ownerToken, {
        onConnect: () => {
          ownerEditor.setConnectionStatus('live');
          viewerEditor.setConnectionStatus('live');
        },
        onDisconnect: () => {
          ownerEditor.setConnectionStatus('offline');
          viewerEditor.setConnectionStatus('offline');
        },
        onConnectError: () => {
          ownerEditor.setConnectionStatus('offline');
          viewerEditor.setConnectionStatus('offline');
        },
        onBinUpdated: (content) => {
          if (!data.isOwner) {
            viewerEditor.updateContent(content);
            showToast('Bin content updated in real-time', 'info');
          }
        },
        onOwnerStatusUpdated: (ownerConnected) => {
          if (!data.isOwner) {
            viewerMetaBlock.update(code, ownerConnected);
            if (ownerConnected) {
              showToast('Owner connected', 'success');
            } else {
              showToast('Owner left the page. This bin will expire in 15 minutes if they do not return.', 'error');
            }
          }
        },
        onBinDeleted: () => {
          if (!data.isOwner) {
            showErrorView('Bin Deleted', 'This bin has been deleted by the owner.');
          }
        },
        onErrorMsg: (msg) => {
          showToast(msg, 'error');
        }
      });

    } catch (err) {
      console.error(err);
      showErrorView('Bin Not Found or Expired', 'The 6-character code you entered does not exist, has expired, or was deleted.');
    }
  }
}

// Attach page-wide global listeners
window.addEventListener('popstate', handleRouting);

if (logoHome) {
  logoHome.addEventListener('click', () => navigateTo('/'));
}
if (btnErrorHome) {
  btnErrorHome.addEventListener('click', () => navigateTo('/'));
}
if (infoBtn) {
  infoBtn.addEventListener('click', () => {
    showToast('Binly v1.0.0 — Instant, temporary text and code sharing. Auto-deletes on disconnect/inactivity.', 'info');
  });
}

// Initial route trigger
handleRouting();

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('PWA Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  });
}
