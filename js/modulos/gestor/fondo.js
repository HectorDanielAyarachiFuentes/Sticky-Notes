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
            fetch('assets/data/fondo/gradients.json').then(res => res.json()),
            fetch('assets/data/fondo/gradientesraya.json').then(res => res.json())
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
        backgroundBoard: currentBoard.backgroundBoard,
        backgroundNotes: currentBoard.backgroundNotes
    };

    const applyToBoard = DOM.bgApplyToBoardCard.classList.contains('active');
    const applyToNotes = DOM.bgApplyToNotesCard.classList.contains('active');

    if (applyToBoard) {
        DOM.boardContainer.style.background = backgroundValue || Callbacks.getDefaultBackground();
    }
    if (applyToNotes) {
        document.querySelectorAll('.stickynote').forEach(noteEl => {
            noteEl.style.backgroundImage = backgroundValue || '';
        });
    }
}

/**
 * Restaura el fondo original después de que el ratón deja una previsualización.
 */
function restoreOriginalBackground() {
    if (!originalBackground) return;

    DOM.boardContainer.style.background = originalBackground.backgroundBoard || Callbacks.getDefaultBackground();
    document.querySelectorAll('.stickynote').forEach(noteEl => {
        noteEl.style.backgroundImage = originalBackground.backgroundNotes || '';
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

    const applyToBoard = DOM.bgApplyToBoardCard.classList.contains('active');
    const applyToNotes = DOM.bgApplyToNotesCard.classList.contains('active');

    if (!applyToBoard && !applyToNotes) return; // Nada seleccionado

    if (applyToBoard) {
        currentBoard.backgroundBoard = backgroundValue;
    }
    if (applyToNotes) {
        currentBoard.backgroundNotes = backgroundValue;
    }

    Callbacks.saveState();
    Callbacks.renderActiveBoard(); 
}

/**
 * Maneja el clic en las tarjetas de "Aplicar a".
 * En el nuevo modelo, estas tarjetas solo seleccionan el "objetivo" 
 * (qué se verá afectado al hacer clic en un fondo).
 * @param {Event} e - El evento de clic.
 */
function toggleApplyOption(e) {
    const card = e.currentTarget;
    card.classList.toggle('active');
    // Asegurarse de que al menos uno esté activo (opcional, pero buena UX)
    const applyToBoard = DOM.bgApplyToBoardCard.classList.contains('active');
    const applyToNotes = DOM.bgApplyToNotesCard.classList.contains('active');
    
    if (!applyToBoard && !applyToNotes) {
        // Si desactiva ambos, forzamos a que se quede activo el que intentó desactivar
        card.classList.add('active');
    }
    
    // Actualizar UI para reflejar qué fondo está activo para la nueva selección
    updateBackgroundUI(appState.boards[appState.activeBoardId]);
}

/**
 * Actualiza la UI para marcar la previsualización y las opciones activas.
 * @param {object} currentBoard - El tablero activo.
 */
export function updateBackgroundUI(currentBoard) {
    if (!currentBoard) return;

    const applyToBoard = DOM.bgApplyToBoardCard.classList.contains('active');
    const applyToNotes = DOM.bgApplyToNotesCard.classList.contains('active');

    // Actualizar previsualización de fondo activa según lo seleccionado
    document.querySelectorAll('.background-preview').forEach(p => {
        let isActive = false;
        const bgVal = p.dataset.background;
        
        if (applyToBoard && applyToNotes) {
            isActive = (bgVal === currentBoard.backgroundBoard) && (bgVal === currentBoard.backgroundNotes);
        } else if (applyToBoard) {
            isActive = (bgVal === currentBoard.backgroundBoard);
        } else if (applyToNotes) {
            isActive = (bgVal === currentBoard.backgroundNotes);
        }
        
        p.classList.toggle('active', isActive);
    });
}