import { showToast } from '../utils/toast.js';

export class MetaBlock {
  constructor(isOwner) {
    this.isOwner = isOwner;
    
    if (isOwner) {
      this.codeEl = document.getElementById('owner-bin-code');
      this.statusEl = document.getElementById('owner-status-badge');
      this.btnShare = document.getElementById('btn-share-owner');
      this.btnCopyLink = document.getElementById('btn-copy-link-owner');
    } else {
      this.codeEl = document.getElementById('viewer-bin-code');
      this.statusEl = document.getElementById('viewer-status-badge');
      this.btnShare = document.getElementById('btn-share-viewer');
      this.btnCopyLink = document.getElementById('btn-copy-link-viewer');
    }

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
    if (this.btnShare) {
      this.btnShare.addEventListener('click', () => this.share());
    }
    if (this.btnCopyLink) {
      this.btnCopyLink.addEventListener('click', () => this.copyLink());
    }
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
