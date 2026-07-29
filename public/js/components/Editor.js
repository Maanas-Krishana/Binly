import { showToast } from '../utils/toast.js';
import { saveBinContent } from '../utils/api.js';

export class Editor {
  constructor(isOwner, onContentChange = null) {
    this.isOwner = isOwner;
    this.onContentChange = onContentChange;
    this.saveDebounceTimer = null;
    this.debounceDelay = 1000;
    this.lastSaveTime = null;
    this.currentSaveState = 'none';
    this.saveStatusInterval = null;

    if (isOwner) {
      this.editor = document.getElementById('owner-editor');
      this.gutter = document.getElementById('owner-editor-gutter');
      this.btnCopy = document.getElementById('btn-copy-owner');
      this.saveStatusText = document.getElementById('owner-save-status');
      this.connectionStatus = document.getElementById('owner-connection-status');
    } else {
      this.editor = document.getElementById('viewer-editor');
      this.btnCopy = document.getElementById('btn-copy-viewer');
      this.saveStatusText = document.getElementById('viewer-save-status');
      this.connectionStatus = document.getElementById('viewer-connection-status');
    }

    this.bindEvents();
  }

  setSaveStatus(state) {
    this.currentSaveState = state;
    if (!this.saveStatusText) return;
    const indicator = this.connectionStatus ? this.connectionStatus.querySelector('.status-indicator') : null;

    if (state === 'Saving...') {
      this.saveStatusText.textContent = 'Saving...';
      if (indicator) {
        indicator.className = 'status-indicator syncing';
      }
    } else if (state === 'Saved') {
      this.lastSaveTime = Date.now();
      this.saveStatusText.textContent = 'Saved';
      if (indicator) {
        indicator.className = 'status-indicator live';
      }
      if (!this.saveStatusInterval) {
        this.saveStatusInterval = setInterval(() => this.updateSavedAgoText(), 5000);
      }
    }
  }

  updateSavedAgoText() {
    if (this.currentSaveState !== 'Saved' || !this.lastSaveTime || !this.saveStatusText) return;
    
    const seconds = Math.floor((Date.now() - this.lastSaveTime) / 1000);
    if (seconds < 5) {
      this.saveStatusText.textContent = 'Saved';
    } else if (seconds < 60) {
      this.saveStatusText.textContent = `Saved ${seconds}s ago`;
    } else {
      const minutes = Math.floor(seconds / 60);
      this.saveStatusText.textContent = `Saved ${minutes}m ago`;
    }
  }

  setConnectionStatus(status) {
    if (this.connectionStatus) {
      this.connectionStatus.innerHTML = `<span class="status-indicator ${status === 'live' ? 'live' : 'offline'}"></span> ${status === 'live' ? 'Live' : 'Offline'}`;
    }
  }

  init(code, content) {
    this.code = code;
    if (this.editor) {
      this.editor.value = content;
    }
    
    if (this.isOwner) {
      this.updateLineNumbers();
      this.setSaveStatus('Saved');
    } else {
      if (this.saveStatusText) {
        this.saveStatusText.textContent = 'Synced';
      }
    }
  }

  updateContent(content) {
    if (this.editor && this.editor.value !== content) {
      this.editor.value = content;
      if (this.isOwner) {
        this.updateLineNumbers();
      } else {
        if (this.saveStatusText) {
          this.saveStatusText.textContent = 'Synced';
        }
      }
    }
  }

  updateLineNumbers() {
    if (!this.gutter || !this.editor) return;
    const lines = this.editor.value.split('\n');
    const count = Math.max(1, lines.length);
    let html = '';
    for (let i = 1; i <= count; i++) {
      html += `<span>${i}</span>`;
    }
    this.gutter.innerHTML = html;
    this.gutter.scrollTop = this.editor.scrollTop;
  }

  bindEvents() {
    if (this.btnCopy) {
      this.btnCopy.addEventListener('click', () => this.copyContent());
    }

    if (this.isOwner && this.editor) {
      this.editor.addEventListener('scroll', () => {
        if (this.gutter) this.gutter.scrollTop = this.editor.scrollTop;
      });

      this.editor.addEventListener('input', () => {
        this.updateLineNumbers();
        this.setSaveStatus('Saving...');

        if (this.saveDebounceTimer) {
          clearTimeout(this.saveDebounceTimer);
        }

        this.saveDebounceTimer = setTimeout(async () => {
          if (!this.code) return;
          const ownerToken = localStorage.getItem(`ownerToken_${this.code}`);
          try {
            await saveBinContent(this.code, this.editor.value, ownerToken);
            this.setSaveStatus('Saved');
            if (this.onContentChange) this.onContentChange(this.editor.value);
          } catch (err) {
            console.error(err);
            showToast('Failed to save updates', 'error');
            if (this.saveStatusText) this.saveStatusText.textContent = 'Save Error';
          }
        }, this.debounceDelay);
      });
    }
  }

  copyContent() {
    if (!this.editor) return;
    navigator.clipboard.writeText(this.editor.value)
      .then(() => showToast('Copied content to clipboard', 'success'))
      .catch(() => showToast('Failed to copy to clipboard', 'error'));
  }

  destroy() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    if (this.saveStatusInterval) {
      clearInterval(this.saveStatusInterval);
      this.saveStatusInterval = null;
    }
  }
}
