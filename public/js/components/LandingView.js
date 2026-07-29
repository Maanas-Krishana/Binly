import { createBin } from '../utils/api.js';
import { showToast } from '../utils/toast.js';

export class LandingView {
  constructor(onCreateSuccess, onJoin) {
    this.onCreateSuccess = onCreateSuccess;
    this.onJoin = onJoin;

    this.btnCreate = document.getElementById('btn-create-bin');
    this.joinInput = document.getElementById('join-code-input');
    this.btnJoin = document.getElementById('btn-join-bin');

    this.bindEvents();
  }

  bindEvents() {
    if (this.btnCreate) {
      this.btnCreate.addEventListener('click', () => this.handleCreate());
    }

    if (this.joinInput) {
      this.joinInput.addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase();
        val = val.replace(/[^A-Z2-9]/g, '');
        e.target.value = val;
      });

      this.joinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.handleJoin();
        }
      });
    }

    if (this.btnJoin) {
      this.btnJoin.addEventListener('click', () => this.handleJoin());
    }
  }

  async handleCreate() {
    try {
      const data = await createBin();
      localStorage.setItem(`ownerToken_${data.code}`, data.ownerToken);
      showToast('Bin created successfully!', 'success');
      this.onCreateSuccess(data.code);
    } catch (err) {
      console.error(err);
      showToast('Failed to create bin', 'error');
    }
  }

  handleJoin() {
    if (!this.joinInput) return;
    const code = this.joinInput.value.trim().toUpperCase();
    if (code.length === 6) {
      this.joinInput.value = '';
      this.onJoin(code);
    } else {
      showToast('Please enter a valid 6-character code', 'error');
    }
  }
}
