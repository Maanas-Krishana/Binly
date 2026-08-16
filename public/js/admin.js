/**
 * Binly Admin & Analytics Dashboard Logic
 */

// State
let adminToken = sessionStorage.getItem('binly_admin_token') || localStorage.getItem('binly_admin_token') || null;
let autoRefreshTimer = null;
let currentActiveBins = [];

// DOM Elements
const authOverlay = document.getElementById('admin-auth-overlay');
const dashboardContainer = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('admin-login-form');
const passwordInput = document.getElementById('admin-password-input');
const authErrorMsg = document.getElementById('auth-error-msg');
const btnLogout = document.getElementById('btn-admin-logout');
const btnManualRefresh = document.getElementById('btn-manual-refresh');
const autoRefreshCheck = document.getElementById('auto-refresh-check');
const searchInput = document.getElementById('bin-search-input');
const lastSyncedTime = document.getElementById('last-synced-time');
const toastContainer = document.getElementById('toast-container');

// Metric Elements
const elTotalUsers = document.getElementById('metric-total-users');
const elUniqueVisitors = document.getElementById('metric-unique-visitors');
const elActiveUsers = document.getElementById('metric-active-users');
const elActiveSockets = document.getElementById('metric-active-sockets');
const elTotalLines = document.getElementById('metric-total-lines');
const elTotalChars = document.getElementById('metric-total-chars');
const elActiveBins = document.getElementById('metric-active-bins');
const elLifetimeBins = document.getElementById('metric-lifetime-bins');

// Telemetry Elements
const elUptime = document.getElementById('telemetry-uptime');
const elMemory = document.getElementById('telemetry-memory');
const elDb = document.getElementById('telemetry-db');
const elNode = document.getElementById('telemetry-node');
const elActiveBinsBadge = document.getElementById('active-bins-badge');
const elBinsTbody = document.getElementById('active-bins-tbody');

// Toast Notification Helper
function showAdminToast(message, type = 'info') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}"></i>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Format Seconds into readable uptime string (e.g., 2d 4h 12m 30s)
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// Format Date / Relative time
function formatRelativeTime(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Format Numbers with commas
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString();
}

// Authenticate Admin
async function handleLogin(e) {
  e.preventDefault();
  const password = passwordInput.value.trim();
  if (!password) return;

  authErrorMsg.classList.add('hidden');
  const btn = document.getElementById('btn-admin-login');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      adminToken = data.token;
      sessionStorage.setItem('binly_admin_token', adminToken);
      showAdminToast('Authenticated successfully!', 'success');
      showDashboard();
      fetchTelemetry();
      setupAutoRefresh();
    } else {
      authErrorMsg.textContent = data.error || 'Authentication failed. Incorrect secret key.';
      authErrorMsg.classList.remove('hidden');
    }
  } catch (err) {
    authErrorMsg.textContent = 'Network error during authentication.';
    authErrorMsg.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Authenticate</span> <i class="fa-solid fa-arrow-right"></i>`;
  }
}

function handleLogout() {
  adminToken = null;
  sessionStorage.removeItem('binly_admin_token');
  localStorage.removeItem('binly_admin_token');
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  showAuthOverlay();
  showAdminToast('Logged out of admin session.', 'info');
}

function showDashboard() {
  authOverlay.classList.remove('active');
  dashboardContainer.classList.remove('hidden');
}

function showAuthOverlay() {
  dashboardContainer.classList.add('hidden');
  authOverlay.classList.add('active');
  passwordInput.value = '';
  passwordInput.focus();
}

// Fetch telemetry from server
async function fetchTelemetry() {
  if (!adminToken) return;

  try {
    const res = await fetch('/api/admin/analytics', {
      headers: {
        'x-admin-key': adminToken
      }
    });

    if (res.status === 401) {
      handleLogout();
      authErrorMsg.textContent = 'Session expired or invalid key. Please re-authenticate.';
      authErrorMsg.classList.remove('hidden');
      return;
    }

    const json = await res.json();
    if (json.success && json.data) {
      renderTelemetry(json.data);
      lastSyncedTime.textContent = new Date().toLocaleTimeString();
    }
  } catch (err) {
    console.error('[Admin] Telemetry fetch error:', err);
  }
}

// Render data onto dashboard
function renderTelemetry(data) {
  // Hero Metrics
  elTotalUsers.textContent = formatNumber(data.totalUsers);
  elUniqueVisitors.textContent = formatNumber(data.totalUniqueVisitors);
  
  // Realtime Active Users (Active WebSockets or min active bins)
  const realtimeActiveUsers = data.realtime ? data.realtime.activeSockets : 0;
  elActiveUsers.textContent = formatNumber(realtimeActiveUsers);
  elActiveSockets.textContent = formatNumber(realtimeActiveUsers);

  // Total Lines & Characters
  elTotalLines.textContent = formatNumber(data.totalLinesShared);
  elTotalChars.textContent = formatNumber(data.totalCharsShared);

  // Active & Lifetime Bins
  elActiveBins.textContent = formatNumber(data.activeBinsCount);
  elLifetimeBins.textContent = formatNumber(data.totalBinsCreated);

  // Telemetry Bar
  if (data.realtime) {
    elUptime.textContent = formatUptime(data.realtime.uptimeSeconds);
    elMemory.textContent = `${data.realtime.memoryMb} / ${data.realtime.totalMemoryMb} MB`;
    elDb.textContent = data.realtime.dbEngine;
    elNode.textContent = data.realtime.nodeVersion;
  }

  // Active Bins Table
  currentActiveBins = data.activeBins || [];
  elActiveBinsBadge.textContent = `${currentActiveBins.length} Live`;
  renderActiveBinsTable(currentActiveBins);
}

// Render Bins Table
function renderActiveBinsTable(bins) {
  const query = (searchInput.value || '').trim().toUpperCase();
  const filteredBins = bins.filter(b => {
    if (!query) return true;
    return b.code.toUpperCase().includes(query) || (b.snippet && b.snippet.toUpperCase().includes(query));
  });

  if (filteredBins.length === 0) {
    elBinsTbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state-cell">
          <div class="empty-state">
            <i class="fa-solid fa-inbox"></i>
            <p>${query ? 'No matching bins found.' : 'No active bins currently live in the database.'}</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  elBinsTbody.innerHTML = filteredBins.map(bin => {
    const isOwnerOnline = bin.ownerConnected;
    const cleanSnippet = bin.snippet ? bin.snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<em>Empty bin</em>';
    return `
      <tr>
        <td>
          <a href="/${bin.code}" target="_blank" class="code-cell-link" title="Open bin /${bin.code}">
            <span>${bin.code}</span>
            <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.75rem;"></i>
          </a>
        </td>
        <td><span class="num-pill">${formatNumber(bin.lines)}</span></td>
        <td><span class="num-pill">${formatNumber(bin.chars)}</span></td>
        <td>
          <span class="status-badge-inline ${isOwnerOnline ? 'online' : 'offline'}">
            <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i>
            ${isOwnerOnline ? 'Owner Online' : 'Owner Offline'}
          </span>
        </td>
        <td>${formatRelativeTime(bin.createdAt)}</td>
        <td><div class="snippet-preview" title="${cleanSnippet}">${cleanSnippet}</div></td>
        <td>
          <button class="btn-terminate-bin" onclick="terminateBin('${bin.code}')" title="Force delete bin">
            <i class="fa-solid fa-trash-can"></i>
            <span>Destroy</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Force Terminate Bin
window.terminateBin = async function(code) {
  if (!confirm(`Are you sure you want to force terminate bin ${code}? All connected viewers will be disconnected immediately.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/bins/${code}`, {
      method: 'DELETE',
      headers: {
        'x-admin-key': adminToken
      }
    });

    const json = await res.json();
    if (res.ok && json.success) {
      showAdminToast(`Bin ${code} destroyed.`, 'success');
      fetchTelemetry();
    } else {
      showAdminToast(json.error || 'Failed to delete bin.', 'error');
    }
  } catch (err) {
    showAdminToast('Network error while deleting bin.', 'error');
  }
};

// Setup Auto Refresh
function setupAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  if (autoRefreshCheck.checked) {
    autoRefreshTimer = setInterval(fetchTelemetry, 5000);
  }
}

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
btnLogout.addEventListener('click', handleLogout);
btnManualRefresh.addEventListener('click', () => {
  fetchTelemetry();
  showAdminToast('Telemetry refreshed', 'info');
});
autoRefreshCheck.addEventListener('change', setupAutoRefresh);
searchInput.addEventListener('input', () => renderActiveBinsTable(currentActiveBins));

// Initial Load Check
if (adminToken) {
  showDashboard();
  fetchTelemetry();
  setupAutoRefresh();
} else {
  showAuthOverlay();
}
