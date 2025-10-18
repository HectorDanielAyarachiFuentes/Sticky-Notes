// fondo.js

/**
 * Módulo para gestionar los fondos del tablero y de las notas.
 * Funcionalidades:
 * - Carga las opciones de fondo desde archivos JSON.
 * - Renderiza las previsualizaciones de los fondos.
 * - Aplica el fondo seleccionado al tablero y/o a las notas.
 * - Gestiona el reseteo del fondo.
 * - Actualiza la UI para mostrar el fondo activo.
 */

// --- Variables del Módulo ---
let appState;
let DOM;
let Callbacks;

/**
 * Inicializa el gestor de fondos.
 * @param {object} appStateRef - Referencia al estado global de la app.
 * @param {object} domRefs - Objeto con referencias a elementos del DOM.
 * @param {object} callbackFuncs - Objeto con funciones de callback para interactuar con la app principal.
 */
export async function initializeBackgroundManager(appStateRef, domRefs, callbackFuncs) {
    appState = appStateRef;
    DOM = domRefs;
    Callbacks = callbackFuncs;

    if (!DOM.backgroundOptionsContainer || !DOM.resetBackgroundBtn || !DOM.bgApplyToBoardCheckbox || !DOM.bgApplyToNotesCheckbox) {
        console.warn("No se encontraron los elementos de la pestaña 'Fondo'.");
        return;
    }

    try {
        // Carga los gradientes y rayas en paralelo
        const [gradients, stripes] = await Promise.all([
            fetch('fondo/gradients.json').then(res => res.json()),
            fetch('fondo/gradientesraya.json').then(res => res.json())
        ]);
        createBackgroundPreviews('Gradientes', gradients, false);
        createBackgroundPreviews('Rayas', stripes, true);
    } catch (error) {
        console.error("Error al cargar los fondos:", error);
        DOM.backgroundOptionsContainer.innerHTML = '<p>No se pudieron cargar los fondos.</p>';
    }

    // Asigna los listeners a los controles
    DOM.resetBackgroundBtn.addEventListener('click', () => applyBackground(null));
    DOM.bgApplyToBoardCheckbox.addEventListener('change', () => applyBackground(appState.boards[appState.activeBoardId].background));
    DOM.bgApplyToNotesCheckbox.addEventListener('change', () => applyBackground(appState.boards[appState.activeBoardId].background));
}

/**
 * Crea las previsualizaciones de una categoría de fondos.
 * @param {string} title - El título de la categoría (ej. 'Gradientes').
 * @param {Array} gradients - El array de datos de fondo.
 * @param {boolean} isRaw - Indica si el valor del fondo es un string CSS directo.
 */
function createBackgroundPreviews(title, gradients, isRaw = false) {
    const categoryTitle = document.createElement('p');
    categoryTitle.className = 'tab-title';
    categoryTitle.textContent = title;
    DOM.backgroundOptionsContainer.appendChild(categoryTitle);

    const categoryContainer = document.createElement('div');
    categoryContainer.className = 'background-category';

    gradients.forEach(grad => {
        const backgroundValue = isRaw ? grad : `linear-gradient(45deg, ${grad.colors.join(', ')})`;
        const preview = document.createElement('div');
        preview.className = 'background-preview';
        preview.style.background = backgroundValue;
        preview.dataset.background = backgroundValue;
        preview.title = isRaw ? 'Fondo de rayas' : grad.name;
        preview.addEventListener('click', () => applyBackground(backgroundValue));
        categoryContainer.appendChild(preview);
    });
    DOM.backgroundOptionsContainer.appendChild(categoryContainer);
}

/**
 * Aplica un nuevo fondo al tablero y/o a las notas.
 * @param {string|null} backgroundValue - El valor CSS del fondo a aplicar, o null para resetear.
 */
function applyBackground(backgroundValue) {
    const currentBoard = appState.boards[appState.activeBoardId];
    if (!currentBoard) return;

    // Actualiza el estado de la aplicación
    currentBoard.backgroundApplyTo = {
        board: DOM.bgApplyToBoardCheckbox.checked,
        notes: DOM.bgApplyToNotesCheckbox.checked
    };
    currentBoard.background = backgroundValue;

    // Aplica los estilos al DOM
    // La constante DEFAULT_BOARD_BACKGROUND la gestiona el script principal
    DOM.boardContainer.style.background = currentBoard.backgroundApplyTo.board ? backgroundValue : '';
    document.querySelectorAll('.stickynote').forEach(noteEl => {
        noteEl.style.backgroundImage = currentBoard.backgroundApplyTo.notes ? backgroundValue : '';
    });

    Callbacks.saveState();
    updateActiveBackgroundPreview(backgroundValue);
}

/**
 * Actualiza la UI de las previsualizaciones para marcar cuál está activa.
 * Esta función se exporta para que el script principal pueda llamarla al cambiar de tablero.
 * @param {string|null} backgroundValue - El valor del fondo activo.
 */
export function updateActiveBackgroundPreview(backgroundValue) {
    document.querySelectorAll('.background-preview').forEach(p => {
        // Compara el data-attribute. El 'null' se maneja implícitamente si `backgroundValue` es null o undefined.
        p.classList.toggle('active', p.dataset.background === backgroundValue);
    });
}