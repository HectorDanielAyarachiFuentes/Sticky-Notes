// crear.js

/**
 * Módulo para gestionar la creación de nuevos tableros.
 * Funcionalidades:
 * - Crear un tablero en blanco.
 * - Crear un tablero a partir de plantillas predefinidas (Kanban, FODA, etc.).
 */

// --- Variables y Plantillas del Módulo ---
let appState;
let switchBoard;
let maxZIndexProvider; // Será una función que nos dé el siguiente z-index

const boardTemplates = {
    kanban: {
        name: 'Tablero Kanban',
        notes: [
            { title: 'Por Hacer', content: '', x: 50, y: 20, width: 300, height: 600, color: '#E9EBEE', rotation: 0 },
            { title: 'En Proceso', content: '', x: 400, y: 20, width: 300, height: 600, color: '#E9EBEE', rotation: 0 },
            { title: 'Hecho', content: '', x: 750, y: 20, width: 300, height: 600, color: '#E9EBEE', rotation: 0 },
        ]
    },
    swot: {
        name: 'Análisis FODA',
        notes: [
            { title: 'Fortalezas', content: '', x: 50, y: 50, width: 350, height: 250, color: '#C8E6C9', rotation: -1 },
            { title: 'Oportunidades', content: '', x: 450, y: 50, width: 350, height: 250, color: '#BBDEFB', rotation: 1 },
            { title: 'Debilidades', content: '', x: 50, y: 350, width: 350, height: 250, color: '#FFCDD2', rotation: 1 },
            { title: 'Amenazas', content: '', x: 450, y: 350, width: 350, height: 250, color: '#FFF9C4', rotation: -1.5 },
        ]
    },
    mindmap: {
        name: 'Mapa Mental',
        notes: [
            { title: 'Idea Central', content: '', x: 400, y: 300, width: 250, height: 150, color: '#B2EBF2', rotation: 0 },
        ]
    },
    eisenhower: {
        name: 'Matriz de Eisenhower',
        notes: [
            { title: 'Urgente / Importante', content: '(Hacer)', x: 50, y: 50, width: 400, height: 300, color: '#FFCDD2', rotation: 0.5 },
            { title: 'No Urgente / Importante', content: '(Planificar)', x: 500, y: 50, width: 400, height: 300, color: '#BBDEFB', rotation: -0.5 },
            { title: 'Urgente / No Importante', content: '(Delegar)', x: 50, y: 400, width: 400, height: 300, color: '#FFF9C4', rotation: -0.5 },
            { title: 'No Urgente / No Importante', content: '(Eliminar)', x: 500, y: 400, width: 400, height: 300, color: '#C8E6C9', rotation: 0.5 },
        ]
    },
    retro: {
        name: 'Retrospectiva',
        notes: [
            { title: '¿Qué salió bien? 👍', content: '', x: 50, y: 20, width: 300, height: 600, color: '#C8E6C9', rotation: 0 },
            { title: '¿Qué se puede mejorar? 🤔', content: '', x: 400, y: 20, width: 300, height: 600, color: '#BBDEFB', rotation: 0 },
            { title: 'Acciones a tomar 🎯', content: '', x: 750, y: 20, width: 300, height: 600, color: '#FFF9C4', rotation: 0 },
        ]
    }
};


/**
 * Inicializa el gestor de creación de tableros.
 * @param {object} appStateRef - Referencia al estado global de la app.
 * @param {function} switchBoardFunc - Función para cambiar de tablero.
 * @param {function} maxZIndexProviderFunc - Función que devuelve el siguiente z-index disponible.
 */
export function initializeCreateTab(appStateRef, switchBoardFunc, maxZIndexProviderFunc) {
    appState = appStateRef;
    switchBoard = switchBoardFunc;
    maxZIndexProvider = maxZIndexProviderFunc;

    const addBoardBtn = document.querySelector("#add-board-btn");
    const templateContainer = document.querySelector("#template-container");

    if (!addBoardBtn || !templateContainer) {
        console.warn("No se encontraron los elementos de la pestaña 'Crear'.");
        return;
    }

    // Configurar botón de nuevo tablero en blanco
    addBoardBtn.innerHTML = '<span class="icon">🎪</span> Nuevo Tablero';
    addBoardBtn.addEventListener('click', addNewBoard);

    // Renderizar botones de plantillas dinámicamente
    const templateTitle = document.createElement('p');
    templateTitle.className = 'tab-title';
    templateTitle.textContent = 'Crear desde plantilla:';
    templateContainer.appendChild(templateTitle);

    Object.keys(boardTemplates).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'template-btn';
        btn.dataset.template = key;
        btn.textContent = boardTemplates[key].name;
        btn.addEventListener('click', () => createBoardFromTemplate(key));
        templateContainer.appendChild(btn);
    });
}

/**
 * Crea un nuevo tablero en blanco.
 */
function addNewBoard() {
    const boardName = prompt("Nombre del nuevo tablero:", "Nuevo Proyecto");
    if (boardName) {
        const newBoardId = `board-${Date.now()}`;
        appState.boards[newBoardId] = {
            id: newBoardId,
            name: boardName,
            notes: [],
            createdAt: Date.now(),
            connections: [],
            background: null,
            backgroundApplyTo: { board: true, notes: false }
        };
        // Llama a la función del script principal para cambiar de tablero y renderizarlo
        switchBoard(newBoardId);
    }
}

/**
 * Crea un nuevo tablero a partir de una plantilla seleccionada.
 * @param {string} templateType - La clave de la plantilla (ej. 'kanban', 'swot').
 */
function createBoardFromTemplate(templateType) {
    const template = boardTemplates[templateType];
    if (!template) return;

    const boardName = prompt(`Nombre para el tablero "${template.name}":`, template.name);
    if (boardName) {
        const newBoardId = `board-${Date.now()}`;
        
        const newNotes = template.notes.map((note, index) => ({
            ...note,
            id: `note-${Date.now()}-${index}`,
            zIndex: maxZIndexProvider(), // Obtenemos el z-index del script principal
            locked: false,
            rotation: note.rotation !== undefined ? note.rotation : (Math.random() - 0.5) * 4,
            tabs: Array(5).fill(null).map((_, tabIndex) => ({
                title: tabIndex === 0 ? (note.title || '') : '',
                content: tabIndex === 0 ? (note.content || '') : ''
            })),
            activeTab: 0,
            // Eliminamos las propiedades antiguas si existen en la plantilla
            ...('title' in note && { title: undefined }),
            ...('content' in note && { content: undefined }),
        }));

        appState.boards[newBoardId] = {
            id: newBoardId,
            name: boardName,
            createdAt: Date.now(),
            notes: newNotes,
            connections: [],
            background: null,
            backgroundApplyTo: { board: true, notes: false }
        };
        
        // Llama a la función del script principal para cambiar de tablero y renderizarlo
        switchBoard(newBoardId);
    }
}