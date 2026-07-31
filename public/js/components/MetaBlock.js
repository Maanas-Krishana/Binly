import { showToast } from '../utils/toast.js';

export class MetaBlock {
  constructor(isOwner) {
    this.isOwner = isOwner;
    
    if (isOwner) {
      this.codeEl = document.getElementById('owner-bin-code');
      this.statusEl = document.getElementById('owner-status-badge');
      this.btnQr = document.getElementById('btn-qr-owner');
      this.btnShare = document.getElementById('btn-share-owner');
      this.btnCopyLink = document.getElementById('btn-copy-link-owner');
    } else {
      this.codeEl = document.getElementById('viewer-bin-code');
      this.statusEl = document.getElementById('viewer-status-badge');
      this.btnQr = document.getElementById('btn-qr-viewer');
      this.btnShare = document.getElementById('btn-share-viewer');
      this.btnCopyLink = document.getElementById('btn-copy-link-viewer');
    }

    this.qrModal = document.getElementById('qr-modal-dialog');
    this.qrContainer = document.getElementById('qr-code-canvas-container');
    this.btnQrClose = document.getElementById('btn-qr-close');

    this.bindEvents();
  }

  update(code, ownerConnected) {
    this.code = code;
    if (this.codeEl) {
      this.codeEl.textContent = code;
    }
    
    if (this.statusEl) {
      if (this.isOwner) {
        this.statusEl.textContent = `Status: Owned by you. Expires in 1h / 15m idle.`;
      } else {
        if (ownerConnected) {
          this.statusEl.textContent = 'Viewer View. Expires 1 hour from now, or 15 mins idle.';
        } else {
          this.statusEl.textContent = 'Viewer View. Owner is offline (expires in 15 mins).';
        }
      }
    }
  }

  bindEvents() {
    if (this.btnQr) {
      this.btnQr.addEventListener('click', () => this.showQRCode());
    }
    if (this.btnShare) {
      this.btnShare.addEventListener('click', () => this.share());
    }
    if (this.btnCopyLink) {
      this.btnCopyLink.addEventListener('click', () => this.copyLink());
    }
    if (this.btnQrClose && this.qrModal) {
      this.btnQrClose.addEventListener('click', () => this.qrModal.close());
    }
  }

  showQRCode() {
    if (!this.code || !this.qrModal || !this.qrContainer) return;

    this.qrContainer.innerHTML = '';
    const targetUrl = `${window.location.origin}/${this.code}`;

    if (window.QRCode) {
      // Create modern QR Code
      new window.QRCode(this.qrContainer, {
        text: targetUrl,
        width: 240,
        height: 240,
        colorDark: "#0d1117",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.H
      });

      // Add center Binly Logo Overlay
      const logoBadge = document.createElement('div');
      logoBadge.className = 'qr-center-logo-badge';
      logoBadge.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="28" height="28">
          <circle cx="20" cy="20" r="20" fill="#0d1117"/>
          <g transform="translate(6, 6) scale(0.7)">
            <path d="M 4 10 L 32 10 L 28 38 L 8 38 Z" fill="#FFFFFF" stroke="#c5b3e6" stroke-width="2.5" stroke-linejoin="round"/>
            <rect x="-2" y="-2" width="40" height="8" fill="#c5b3e6" stroke="#ffffff" stroke-width="2.5" rx="1"/>
            <path d="M 12 18 L 8 24 L 12 30 M 24 18 L 28 24 L 24 30" fill="none" stroke="#0d1117" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
        </svg>
      `;
      this.qrContainer.appendChild(logoBadge);
    } else {
      this.qrContainer.textContent = 'QR Code Generator unavailable';
    }

    this.qrModal.showModal();
  }

  share() {
    if (!this.code) return;
    const shareUrl = `${window.location.origin}/${this.code}`;
    if (navigator.share) {
      navigator.share({
        title: 'Binly Instant Code Share',
        text: `Check out my shared clip on Binly: ${this.code}`,
        url: shareUrl
      }).catch(() => {});
    } else {
      this.copyLink();
    }
  }

  copyLink() {
    if (!this.code) return;
    const shareUrl = `${window.location.origin}/${this.code}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => showToast('Bin link copied to clipboard!', 'success'))
      .catch(() => showToast('Failed to copy link', 'error'));
  }
}

