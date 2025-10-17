import { dom } from './dom.js';

export function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}