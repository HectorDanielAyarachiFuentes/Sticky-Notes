import { dom } from './dom.js';
import { appState, guardarEstado, activeLines } from './estado.js';

export function actualizarZoom(newZoomLevel) {
    if (newZoomLevel !== undefined) {
        appState.zoomLevel = Math.max(0.2, Math.min(2, newZoomLevel));
    }
    dom.board.style.transform = `scale(${appState.zoomLevel})`;
    dom.zoomLevelDisplay.textContent = `${Math.round(appState.zoomLevel * 100)}%`;
    
    activeLines.forEach(l => {
        l.line.position();
    });
    guardarEstado();
}

export function handleZoomIn() {
    actualizarZoom(appState.zoomLevel + 0.1);
}

export function handleZoomOut() {
    actualizarZoom(appState.zoomLevel - 0.1);
}

export function handleZoomReset() {
    actualizarZoom(1.0);
}