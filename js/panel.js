import { dom } from './dom.js';
import { appState, guardarEstado, activeLines } from './estado.js';
import { renderizarPapelera } from './papelera.js';

export function inicializarPestanasPanel() {
    const tabNav = document.querySelector('.tab-nav');
    if (!tabNav) return;

    tabNav.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-btn');
        if (!button || button.classList.contains('active')) return;

        const tabId = button.dataset.tab;

        tabNav.querySelector('.tab-btn.active')?.classList.remove('active');
        button.classList.add('active');

        dom.boardManager.querySelector('.tab-content.active')?.classList.remove('active');
        document.getElementById(`tab-content-${tabId}`)?.classList.add('active');

        if (tabId === 'trash') renderizarPapelera();
    });
}

export function inicializarRedimensionPanel() {
    const resizer = document.getElementById('sidebar-resizer');
    if (!resizer) return;

    const minWidth = 220;
    const maxWidth = 500;

    dom.boardManager.style.width = `${appState.lineOptions.sidebarWidth || 260}px`;

    const handlePointerDown = (e) => {
        e.preventDefault();
        resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const handlePointerMove = (moveEvent) => {
            let newWidth = moveEvent.clientX;
            if (newWidth < minWidth) newWidth = minWidth;
            if (newWidth > maxWidth) newWidth = maxWidth;

            dom.boardManager.style.width = `${newWidth}px`;
            activeLines.forEach(l => l.line.position());
        };

        const handlePointerUp = () => {
            resizer.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            appState.lineOptions.sidebarWidth = parseInt(dom.boardManager.style.width, 10);
            guardarEstado();

            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
        };

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
    };

    resizer.addEventListener('pointerdown', handlePointerDown);
}

export function smoothLineUpdateOnToggle() {
    const duration = 400;
    const startTime = performance.now();

    function animateLines() {
        const elapsed = performance.now() - startTime;
        if (elapsed < duration) {
            activeLines.forEach(l => l.line.position());
            requestAnimationFrame(animateLines);
        } else {
            activeLines.forEach(l => l.line.position());
        }
    }
    requestAnimationFrame(animateLines);
}