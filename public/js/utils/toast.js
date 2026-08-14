const toastContainer = document.getElementById('toast-container');

export function showToast(message, type = 'info', options = {}) {
  if (!toastContainer) return null;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '<i class="fa-solid fa-circle-info"></i>';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
  if (type === 'error') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
  
  let contentHtml = `${icon} <span>${message}</span>`;
  if (options.action) {
    contentHtml += ` <button class="toast-action-btn" id="${options.action.id || 'toast-action-btn'}">${options.action.text}</button>`;
  }
  
  toast.innerHTML = contentHtml;
  toastContainer.appendChild(toast);
  
  const duration = options.duration || 3000;
  let actionClicked = false;
  let isCancelled = false;

  if (options.action && options.action.onClick) {
    const btn = toast.querySelector('.toast-action-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        actionClicked = true;
        options.action.onClick(e);
        removeToast();
      });
    }
  }

  let removeTimeout = setTimeout(() => {
    removeToast();
  }, duration);

  function removeToast(cancelled = false) {
    if (cancelled) isCancelled = true;
    clearTimeout(removeTimeout);
    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
      if (!actionClicked && !isCancelled && options.onExpire) {
        options.onExpire();
      }
    }, 250);
  }

  return {
    dismiss: () => removeToast(true)
  };
}
