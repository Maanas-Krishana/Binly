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
      // 1. Generate matrix data into hidden temporary container
      const tempDiv = document.createElement('div');
      const qrObj = new window.QRCode(tempDiv, {
        text: targetUrl,
        width: 240,
        height: 240,
        correctLevel: window.QRCode.CorrectLevel.H
      });

      // Allow qrcodejs to compute matrix
      setTimeout(() => {
        const sourceCanvas = tempDiv.querySelector('canvas');
        if (!sourceCanvas) return;

        const ctx = sourceCanvas.getContext('2d');
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const imgData = ctx.getImageData(0, 0, width, height);

        // Find module size by inspecting top-left eye pattern
        // Eyes are 7 modules wide
        let moduleSize = 8;
        // Count black pixels along top row
        let firstBlack = -1;
        let firstWhite = -1;
        for (let x = 0; x < width; x++) {
          const isBlack = imgData.data[(x) * 4 + 3] > 128 && imgData.data[(x) * 4] < 128;
          if (isBlack && firstBlack === -1) firstBlack = x;
          if (!isBlack && firstBlack !== -1 && firstWhite === -1) {
            firstWhite = x;
            break;
          }
        }
        if (firstBlack !== -1 && firstWhite !== -1) {
          moduleSize = (firstWhite - firstBlack) / 7;
        }

        const gridCount = Math.round(width / moduleSize);

        // 2. Render modern SVG with rounded dots & circular eye targets
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "250");
        svg.setAttribute("height", "250");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

        const isEyeArea = (r, c) => {
          // Top-Left Eye (0..7, 0..7)
          if (r < 7 && c < 7) return true;
          // Top-Right Eye (0..7, N-7..N)
          if (r < 7 && c >= gridCount - 7) return true;
          // Bottom-Left Eye (N-7..N, 0..7)
          if (r >= gridCount - 7 && c < 7) return true;
          return false;
        };

        const radius = moduleSize * 0.42; // Dot radius

        // Draw matrix dots
        for (let r = 0; r < gridCount; r++) {
          for (let c = 0; c < gridCount; c++) {
            if (isEyeArea(r, c)) continue;

            const px = Math.round((c + 0.5) * moduleSize);
            const py = Math.round((r + 0.5) * moduleSize);

            // Sample pixel color from imgData
            const imgX = Math.min(width - 1, Math.max(0, Math.floor(px)));
            const imgY = Math.min(height - 1, Math.max(0, Math.floor(py)));
            const idx = (imgY * width + imgX) * 4;
            const rVal = imgData.data[idx];
            const gVal = imgData.data[idx + 1];
            const bVal = imgData.data[idx + 2];
            const isDark = (rVal + gVal + bVal) / 3 < 128;

            if (isDark) {
              const circle = document.createElementNS(svgNS, "circle");
              circle.setAttribute("cx", px);
              circle.setAttribute("cy", py);
              circle.setAttribute("r", radius);
              circle.setAttribute("fill", "#1f2328");
              svg.appendChild(circle);
            }
          }
        }

        // Draw 3 Circular Eyes (QuickShare / Modern Style)
        const drawCircularEye = (cx, cy) => {
          // Outer Ring
          const outerRing = document.createElementNS(svgNS, "circle");
          outerRing.setAttribute("cx", cx);
          outerRing.setAttribute("cy", cy);
          outerRing.setAttribute("r", moduleSize * 3.2);
          outerRing.setAttribute("fill", "none");
          outerRing.setAttribute("stroke", "#24292e");
          outerRing.setAttribute("stroke-width", moduleSize * 1.0);
          svg.appendChild(outerRing);

          // Inner Solid Circle
          const innerDot = document.createElementNS(svgNS, "circle");
          innerDot.setAttribute("cx", cx);
          innerDot.setAttribute("cy", cy);
          innerDot.setAttribute("r", moduleSize * 1.5);
          innerDot.setAttribute("fill", "#24292e");
          svg.appendChild(innerDot);
        };

        // Top-Left
        drawCircularEye(3.5 * moduleSize, 3.5 * moduleSize);
        // Top-Right
        drawCircularEye((gridCount - 3.5) * moduleSize, 3.5 * moduleSize);
        // Bottom-Left
        drawCircularEye(3.5 * moduleSize, (gridCount - 3.5) * moduleSize);

        this.qrContainer.appendChild(svg);

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
      }, 50);
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

