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
      this.btnUpload = document.getElementById('btn-upload-owner');
      this.btnDownload = document.getElementById('btn-download-owner');
      this.fileInput = document.getElementById('owner-file-input');
      this.editorCard = this.editor ? this.editor.closest('.editor-card') : null;
      this.saveStatusText = document.getElementById('owner-save-status');
      this.connectionStatus = document.getElementById('owner-connection-status');
      this.btnClear = document.getElementById('btn-clear-owner');
      this.clearDialog = document.getElementById('clear-confirm-dialog');
      this.btnConfirmClearCancel = document.getElementById('btn-confirm-clear-cancel');
      this.btnConfirmClearOk = document.getElementById('btn-confirm-clear-ok');
    } else {
      this.editor = document.getElementById('viewer-editor');
      this.btnCopy = document.getElementById('btn-copy-viewer');
      this.btnDownload = document.getElementById('btn-download-viewer');
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

    if (this.btnDownload) {
      this.btnDownload.addEventListener('click', () => this.downloadContent());
    }

    if (this.isOwner) {
      if (this.btnUpload && this.fileInput) {
        this.btnUpload.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) this.readAndPopulateFile(file);
          this.fileInput.value = ''; // Reset input
        });
      }

      // Drag and Drop support on Editor Card
      if (this.editorCard) {
        ['dragenter', 'dragover'].forEach(eventName => {
          this.editorCard.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.editorCard.classList.add('drag-over');
          }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
          this.editorCard.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.editorCard.classList.remove('drag-over');
          }, false);
        });

        this.editorCard.addEventListener('drop', (e) => {
          const dt = e.dataTransfer;
          const files = dt.files;
          if (files && files.length > 0) {
            this.readAndPopulateFile(files[0]);
          }
        });
      }

      if (this.editor) {
        this.editor.addEventListener('scroll', () => {
          if (this.gutter) this.gutter.scrollTop = this.editor.scrollTop;
        });

        this.editor.addEventListener('input', () => this.triggerSave());
      }

      if (this.btnClear && this.clearDialog) {
        this.btnClear.addEventListener('click', () => {
          if (!this.editor || this.editor.value === '') {
            showToast('Bin is already empty', 'info');
            return;
          }
          this.clearDialog.showModal();
        });
      }

      if (this.btnConfirmClearCancel && this.clearDialog) {
        this.btnConfirmClearCancel.addEventListener('click', () => {
          this.clearDialog.close();
        });
      }

      if (this.btnConfirmClearOk && this.clearDialog) {
        this.btnConfirmClearOk.addEventListener('click', () => {
          this.clearDialog.close();
          this.clearContent();
        });
      }
    }
  }

  readAndPopulateFile(file) {
    if (file.size > 5 * 1024 * 1024) { // 5MB Limit
      showToast('File size too large (Max 5MB)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (this.editor) {
        this.editor.value = content;
        this.updateLineNumbers();
        this.triggerSave();
        showToast(`Loaded "${file.name}" into bin`, 'success');
      }
    };
    reader.onerror = () => {
      showToast('Failed to read file', 'error');
    };
    reader.readAsText(file);
  }

  triggerSave() {
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
  }

  clearContent() {
    if (!this.editor) return;
    this.editor.value = '';
    this.updateLineNumbers();
    this.triggerSave();
    showToast('Content cleared', 'success');
  }

  copyContent() {
    if (!this.editor) return;
    navigator.clipboard.writeText(this.editor.value)
      .then(() => showToast('Copied content to clipboard', 'success'))
      .catch(() => showToast('Failed to copy to clipboard', 'error'));
  }

  downloadContent() {
    if (!this.editor || !this.editor.value) {
      showToast('Bin is empty, nothing to download', 'error');
      return;
    }

    const text = this.editor.value;
    let ext = 'txt';

    // Simple language detection for extension
    if (text.includes('function') || text.includes('const ') || text.includes('let ') || text.includes('=>')) {
      ext = 'js';
    } else if (text.includes('def ') || text.includes('import ') && text.includes(':')) {
      ext = 'py';
    } else if (text.includes('<html>') || text.includes('</div>') || text.includes('<!DOCTYPE')) {
      ext = 'html';
    } else if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        JSON.parse(text);
        ext = 'json';
      } catch (e) {}
    }

    const fileName = `bin-${this.code || 'snippet'}.${ext}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${fileName}`, 'success');
  }

  destroy() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    if (this.saveStatusInterval) {
      clearInterval(this.saveStatusInterval);
      this.saveStatusInterval = null;
    }
    if (this.clearDialog && this.clearDialog.open) {
      this.clearDialog.close();
    }
  }
}

