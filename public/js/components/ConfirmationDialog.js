import { deleteBin } from '../utils/api.js';
import { showToast } from '../utils/toast.js';

export class ConfirmationDialog {
  constructor(onDeleteSuccess) {
    this.onDeleteSuccess = onDeleteSuccess;

    this.dialog = document.getElementById('delete-confirm-dialog');
    this.btnCancel = document.getElementById('btn-confirm-delete-cancel');
    this.btnOk = document.getElementById('btn-confirm-delete-ok');
    this.btnOpenTrigger = document.getElementById('btn-delete-bin');

    this.bindEvents();
  }

  setCode(code) {
    this.code = code;
  }

  bindEvents() {
    if (this.btnOpenTrigger) {
      this.btnOpenTrigger.addEventListener('click', () => {
        if (this.dialog) this.dialog.showModal();
      });
    }

    if (this.btnCancel) {
      this.btnCancel.addEventListener('click', () => {
        if (this.dialog) this.dialog.close();
      });
    }

    if (this.btnOk) {
      this.btnOk.addEventListener('click', () => this.handleConfirm());
    }
  }

  async handleConfirm() {
    if (this.dialog) this.dialog.close();
    if (!this.code) return;

    const ownerToken = localStorage.getItem(`ownerToken_${this.code}`);
    try {
      await deleteBin(this.code, ownerToken);
      showToast('Bin deleted successfully', 'success');
      localStorage.removeItem(`ownerToken_${this.code}`);
      this.onDeleteSuccess();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete bin', 'error');
    }
  }
}
