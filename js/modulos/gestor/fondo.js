// fondo.js

/**
 * Módulo para gestionar los fondos del tablero y de las notas.
 * Funcionalidades:
 * - Carga las opciones de fondo desde archivos JSON.
 * - Renderiza las previsualizaciones de los fondos.
 * - Aplica el fondo seleccionado al tablero y/o a las notas.
 * - Gestiona el reseteo del fondo.
 * - Actualiza la UI para mostrar el fondo activo.
 * - Implementa previsualización en vivo al pasar el ratón.
 */

// --- Variables del Módulo ---
let appState;
let DOM;
let Callbacks;
let originalBackground = null; // Para restaurar en la previsualización

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

    if (!DOM.backgroundOptionsContainer || !DOM.resetBackgroundBtn || !DOM.bgApplyToBoardCard || !DOM.bgApplyToNotesCard) {
        console.warn("No se encontraron los elementos de la pestaña 'Fondo'.");
        return;
    }

    try {
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
    DOM.bgApplyToBoardCard.addEventListener('click', toggleApplyOption);
    DOM.bgApplyToNotesCard.addEventListener('click', toggleApplyOption);
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
        preview.addEventListener('mouseenter', () => previewBackground(backgroundValue));
        preview.addEventListener('mouseleave', restoreOriginalBackground);

        categoryContainer.appendChild(preview);
    });
    DOM.backgroundOptionsContainer.appendChild(categoryContainer);
}

/**
 * Previsualiza un fondo temporalmente al pasar el ratón.
 * @param {string|null} backgroundValue - El valor del fondo a previsualizar.
 */
function previewBackground(backgroundValue) {
    const currentBoard = appState.boards[appState.activeBoardId];
    if (!currentBoard) return;

    originalBackground = {
        background: currentBoard.background,
        applyTo: { ...currentBoard.backgroundApplyTo }
    };

    const applyToBoard = DOM.bgApplyToBoardCard.classList.contains('active');
    const applyToNotes = DOM.bgApplyToNotesCard.classList.contains('active');

    DOM.boardContainer.style.background = applyToBoard ? backgroundValue : Callbacks.getDefaultBackground();
    document.querySelectorAll('.stickynote').forEach(noteEl => {
        noteEl.style.backgroundImage = applyToNotes ? backgroundValue : '';
    });
}

/**
 * Restaura el fondo original después de que el ratón deja una previsualización.
 */
function restoreOriginalBackground() {
    if (!originalBackground) return;

    DOM.boardContainer.style.background = originalBackground.applyTo.board ? originalBackground.background : Callbacks.getDefaultBackground();
    document.querySelectorAll('.stickynote').forEach(noteEl => {
        noteEl.style.backgroundImage = originalBackground.applyTo.notes ? originalBackground.background : '';
    });
    originalBackground = null;
}

/**
 * Aplica un nuevo fondo al tablero y/o a las notas de forma permanente.
 * @param {string|null} backgroundValue - El valor CSS del fondo a aplicar, o null para resetear.
 */
function applyBackground(backgroundValue) {
    const currentBoard = appState.boards[appState.activeBoardId];
    if (!currentBoard) return;

    currentBoard.backgroundApplyTo = {
        board: DOM.bgApplyToBoardCard.classList.contains('active'),
        notes: DOM.bgApplyToNotesCard.classList.contains('active')
    };
    currentBoard.background = backgroundValue;

    Callbacks.saveState();
    Callbacks.renderActiveBoard(); // Dejamos que el renderizador principal se encargue
}

/**
 * Maneja el clic en las tarjetas de "Aplicar a".
 * @param {Event} e - El evento de clic.
 */
function toggleApplyOption(e) {
    const card = e.currentTarget;
    card.classList.toggle('active');
    // Aplicamos el cambio inmediatamente con el fondo actual
    applyBackground(appState.boards[appState.activeBoardId].background);
}

/**
 * Actualiza la UI para marcar la previsualización y las opciones activas.
 * Esta función se exporta para que el script principal pueda llamarla.
 * @param {object} currentBoard - El tablero activo.
 */
export function updateBackgroundUI(currentBoard) {
    if (!currentBoard) return;

    // Actualizar tarjetas de "Aplicar a"
    DOM.bgApplyToBoardCard.classList.toggle('active', currentBoard.backgroundApplyTo.board);
    DOM.bgApplyToNotesCard.classList.toggle('active', currentBoard.backgroundApplyTo.notes);

    // Actualizar previsualización de fondo activa
    document.querySelectorAll('.background-preview').forEach(p => {
        const isActive = p.dataset.background === currentBoard.background || (!currentBoard.background && !p.dataset.background);
        p.classList.toggle('active', isActive);
    });
}