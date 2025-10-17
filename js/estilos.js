import { dom } from './dom.js';
import { appState, guardarEstado } from './estado.js';
import { renderizarTableroActivo } from './renderizado.js';
import { DEFAULT_BOARD_BACKGROUND } from './constantes.js';

export function inicializarControlesEstiloLinea() {
    const { color, opacity, path, size, endPlug } = appState.lineOptions;
    dom.lineColorInput.value = color;
    dom.lineOpacityInput.value = opacity;
    dom.linePathSelect.value = path;
    dom.lineSizeInput.value = size;
    dom.linePlugSelect.value = endPlug;

    const updateLineStyle = () => {
        appState.lineOptions.color = dom.lineColorInput.value;
        appState.lineOptions.opacity = parseFloat(dom.lineOpacityInput.value);
        appState.lineOptions.path = dom.linePathSelect.value;
        appState.lineOptions.size = parseInt(dom.lineSizeInput.value, 10);
        appState.lineOptions.endPlug = dom.linePlugSelect.value;
        guardarEstado();
        renderizarTableroActivo();
    };

    [dom.lineColorInput, dom.lineOpacityInput, dom.linePathSelect, dom.lineSizeInput, dom.linePlugSelect].forEach(el => 
        el.addEventListener('change', updateLineStyle));
}

function buildGradient(colors) {
    return `linear-gradient(45deg, ${colors.join(', ')})`;
}

function createBackgroundPreviews(title, gradients, isRaw = false) {
    const categoryTitle = document.createElement('p');
    categoryTitle.className = 'tab-title';
    categoryTitle.textContent = title;
    dom.backgroundOptionsContainer.appendChild(categoryTitle);

    const categoryContainer = document.createElement('div');
    categoryContainer.className = 'background-category';

    gradients.forEach(grad => {
        const preview = document.createElement('div');
        preview.className = 'background-preview';
        
        const backgroundValue = isRaw ? grad : buildGradient(grad.colors);
        preview.style.background = backgroundValue;
        preview.dataset.background = backgroundValue;
        preview.title = isRaw ? 'Fondo de rayas' : grad.name;

        preview.addEventListener('click', () => {
            applyBackground(backgroundValue);
        });

        categoryContainer.appendChild(preview);
    });
    dom.backgroundOptionsContainer.appendChild(categoryContainer);
}

export async function initializeBackgroundOptions() {
    try {
        const [gradientsRes, stripesRes] = await Promise.all([
            fetch('fondo/gradients.json'),
            fetch('fondo/gradientesraya.json')
        ]);

        if (gradientsRes.ok) createBackgroundPreviews('Gradientes', await gradientsRes.json(), false);
        if (stripesRes.ok) createBackgroundPreviews('Rayas', await stripesRes.json(), true);

    } catch (error) {
        console.error("Error al cargar los fondos:", error);
        dom.backgroundOptionsContainer.innerHTML = '<p>No se pudieron cargar los fondos.</p>';
    }

    dom.resetBackgroundBtn.addEventListener('click', () => applyBackground(null));
    dom.bgApplyToBoardCheckbox.addEventListener('change', () => applyBackground(appState.boards[appState.activeBoardId].background));
    dom.bgApplyToNotesCheckbox.addEventListener('change', () => applyBackground(appState.boards[appState.activeBoardId].background));
}

function applyBackground(backgroundValue) {
    const currentBoard = appState.boards[appState.activeBoardId];
    if (!currentBoard) return;

    currentBoard.backgroundApplyTo = { board: dom.bgApplyToBoardCheckbox.checked, notes: dom.bgApplyToNotesCheckbox.checked };
    currentBoard.background = backgroundValue;

    dom.boardContainer.style.background = currentBoard.backgroundApplyTo.board ? backgroundValue || DEFAULT_BOARD_BACKGROUND : DEFAULT_BOARD_BACKGROUND;
    document.querySelectorAll('.stickynote').forEach(noteEl => {
        noteEl.style.backgroundImage = currentBoard.backgroundApplyTo.notes ? backgroundValue : '';
    });

    guardarEstado();
    updateActiveBackgroundPreview(backgroundValue);
}

export function updateActiveBackgroundPreview(backgroundValue) {
    document.querySelectorAll('.background-preview').forEach(p => {
        p.classList.toggle('active', p.dataset.background === backgroundValue || (!backgroundValue && !p.dataset.background));
    });
}