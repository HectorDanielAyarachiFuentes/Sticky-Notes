document.addEventListener('DOMContentLoaded', () => {
    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const boardContainer = document.querySelector("#board-container");
    const board = document.querySelector("#board");
    const palette = document.querySelector("#note-palette");
    const boardList = document.querySelector("#board-list");
    const pinPaletteBtn = document.querySelector("#pin-palette-btn");
    const addBoardBtn = document.querySelector("#add-board-btn");
    const searchInput = document.querySelector("#search-input");
    const boardManager = document.querySelector("#board-manager");
    const globalSearchResults = document.querySelector("#global-search-results");
    const trashCan = document.querySelector("#trash-can");
    const zoomInBtn = document.querySelector("#zoom-in-btn");
    const zoomOutBtn = document.querySelector("#zoom-out-btn");
    const zoomResetBtn = document.querySelector("#zoom-reset-btn");
    const zoomLevelDisplay = document.querySelector("#zoom-level-display");
    // Controles de estilo de línea
    const lineOpacityInput = document.querySelector("#line-opacity-input");
    const lineColorInput = document.querySelector("#line-color-input");
    const linePathSelect = document.querySelector("#line-path-select");
    const lineSizeInput = document.querySelector("#line-size-input");
    const linePlugSelect = document.querySelector("#line-plug-select");
    const templateContainer = document.querySelector("#template-container");
    // Pestaña de fondos
    const backgroundOptionsContainer = document.querySelector("#background-options-container");
    const resetBackgroundBtn = document.querySelector("#reset-background-btn");
    const bgApplyToBoardCheckbox = document.querySelector("#bg-apply-board");
    const bgApplyToNotesCheckbox = document.querySelector("#bg-apply-notes");

    // Menú contextual
    const contextMenu = document.querySelector("#context-menu");
    const ctxDuplicateBtn = document.querySelector("#ctx-duplicate");
    const ctxLockBtn = document.querySelector("#ctx-lock");
    const ctxDeleteBtn = document.querySelector("#ctx-delete");
    const ctxChangeColorBtn = document.querySelector("#ctx-change-color");
    // Menú contextual de pestañas
    const tabContextMenu = document.querySelector("#tab-context-menu");
    const ctxTabDeleteBtn = document.querySelector("#ctx-tab-delete");

    // Papelera
    const trashListContainer = document.querySelector("#trash-list-container");
    const emptyTrashBtn = document.querySelector("#empty-trash-btn");
    const toastContainer = document.querySelector("#toast-container");
    // Popover de color
    const colorPopover = document.querySelector("#color-picker-popover");
    const popoverPalette = document.querySelector("#popover-color-palette");
    const closePopoverBtn = document.querySelector("#close-popover-btn");

    // Modal "Sobre mí"
    const aboutBtn = document.querySelector("#about-btn");
    const aboutModal = document.querySelector("#about-modal");
    const closeAboutModalBtn = aboutModal.querySelector(".modal-close-btn");
    const aboutModalAudio = document.querySelector("#about-modal-audio");
    const audioVisualizerCanvas = document.querySelector("#audio-visualizer");

    // --- Configuración de Web Audio API para el modal "Sobre Mí" ---
    let audioContext;
    let analyser;
    let source;
    let dataArray;
    let particles = [];
    const PARTICLE_COUNT = 128; // Número de partículas en el anillo
    let canvasCtx;
    let isVisualizerActive = false;


        // --- FUNCIONES AUXILIARES PARA MANEJO DE COLOR ---

    /**
     * Convierte un color HEX a HSL.
     * @param {string} hex - El color en formato #RRGGBB.
     * @returns {Array<number>} - Un array [h, s, l].
     */
    function hexToHsl(hex) {
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h, s, l];
    }

    /**
     * Convierte un color HSL a HEX.
     * @param {number} h - Hue (0-1).
     * @param {number} s - Saturation (0-1).
     * @param {number} l - Lightness (0-1).
     * @returns {string} - El color en formato #RRGGBB.
     */
    function hslToHex(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            let p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        const toHex = x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    /**
     * Determina si un color de fondo es oscuro para decidir el color del texto.
     * @param {string} hexColor - El color en formato #RRGGBB.
     * @returns {boolean} - True si el color es oscuro, false si es claro.
     */
    function isColorDark(hexColor) {
        if (!hexColor || hexColor.length < 7) return false; // Manejar colores inválidos
        // Quitar el #
        const hex = hexColor.replace('#', '');
        // Convertir a RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Fórmula de luminancia YIQ (un estándar para la percepción humana)
        const luminance = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return luminance < 128; // El umbral 128 es un buen punto de partida (0-255)
    }
    // --- CONFIGURACIÓN INICIAL ---
    let popoverOriginalColor = null; // Para guardar el color original al previsualizar
    const noteColors = ['#FFF9C4', '#C8E6C9', '#BBDEFB', '#FFCDD2', '#B2EBF2', '#D7CCC8', '#F8BBD0', '#E1BEE7', '#CFD8DC'];
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
        // El mapa mental es más complejo por los conectores, se deja como base.
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

    // --- GESTIÓN DE ESTADO DE LA APLICACIÓN ---
    let appState = {};
    let activeNote = null;      // Elemento del DOM que se está arrastrando/redimensionando
    let activeNoteData = null;  // Objeto de la nota en el 'appState'
    let offsetX = 0;
    let offsetY = 0;
    let isResizing = false;

    let contextMenuNoteId = null; // ID de la nota para el menú contextual    
    let contextMenuTabInfo = null; // {noteId, tabIndex} para el menú de pestañas

    let popoverNoteId = null; // ID de la nota para el popover de color
    let maxZIndex = 0; // Para gestionar el apilamiento de las notas
    let activeLines = []; // Almacena las instancias de LeaderLine activas
    let connectionState = { startNoteId: null }; // Para gestionar la creación de conexiones
    // --- FUNCIONES DE ESTADO (GUARDAR Y CARGAR) ---
    function saveState() {
        localStorage.setItem('stickyNotesApp', JSON.stringify(appState));
    }

    function loadState() {
        const savedState = localStorage.getItem('stickyNotesApp');
        if (savedState) {
            const loadedState = JSON.parse(savedState);
            // Migración: Asegurarse de que los tableros viejos tengan la nueva propiedad
            Object.values(loadedState.boards).forEach(board => {
                if (!board.backgroundApplyTo) {
                    board.backgroundApplyTo = { board: true, notes: false };
                }
                board.notes.forEach(note => {
                    if (note.locked === undefined) note.locked = false;
                    // Migración para la nueva estructura de pestañas (título + contenido)
                    if (note.tabs === undefined) {
                        // Si la nota viene del formato antiguo (title + content) o (title + tabs[string])
                        const oldTabsContent = note.content ? [note.content, '', '', '', ''] : (note.tabs || ['', '', '', '', '']);
                        note.tabs = oldTabsContent.map((content, index) => ({
                            // La primera pestaña hereda el título principal, las demás quedan vacías.
                            title: index === 0 ? (note.title || '') : '',
                            content: content || ''
                        }));
                        note.activeTab = 0;
                        delete note.content; // Eliminar propiedades antiguas
                        delete note.title;
                    }
                });
                if (!loadedState.trash) {
                    loadedState.trash = [];
                }
                // Migración para zIndex y cálculo del maxZIndex
                board.notes.forEach(note => {
                    if (note.zIndex === undefined) {
                        note.zIndex = ++maxZIndex;
                    } else if (note.zIndex > maxZIndex) {
                        maxZIndex = note.zIndex;
                    }
                });
            });
            appState = loadedState;

        } else {
            // Estado inicial si no hay nada guardado
            const initialBoardId = `board-${Date.now()}`;
            appState = {
                boards: {
                    [initialBoardId]: {
                        id: initialBoardId,
                        name: 'Tablero Principal',
                        notes: [
                            // Nota de ejemplo con la nueva estructura
                            // { id: 'note-init', title: '¡Hola!', tabs: ['Este es un ejemplo de nota con pestañas.', 'Contenido de la pestaña 2', '', '', ''], activeTab: 0, x: 100, y: 100, width: 250, height: 250, color: '#FFF9C4', rotation: -2, zIndex: 1, locked: false }
                        ],
                        connections: [], // Array para las conexiones
                        background: null,
                        // A dónde se aplica el fondo
                        backgroundApplyTo: { board: true, notes: false }
                    }
                },
                trash: [], // Papelera de reciclaje
                zoomLevel: 1.0,                isPalettePinned: true, // Nuevo estado para la paleta
                activeBoardId: initialBoardId,
                lineOptions: { // Opciones por defecto para las líneas
                    color: '#4B4B4B', // Gris oscuro en formato HEX
                    opacity: 0.8,
                    sidebarWidth: 260, // Ancho inicial del panel
                    size: 4,
                    path: 'fluid',
                    endPlug: 'arrow1'
                }
            };
        }
    }

    // --- FUNCIONES DE LA PALETA DE NOTAS ---
    function togglePalettePin() {
        appState.isPalettePinned = !appState.isPalettePinned;
        updatePaletteState();
        saveState();
    }

    function updatePaletteState() {
        document.body.classList.toggle('palette-pinned', appState.isPalettePinned);
        pinPaletteBtn.classList.toggle('active', appState.isPalettePinned);
        pinPaletteBtn.title = appState.isPalettePinned ?
            'Desfijar paleta (permanecerá visible)' :
            'Fijar paleta (se ocultará con el panel)';
    }
    
    // --- CONSTANTES GLOBALES ---
    const DEFAULT_BOARD_BACKGROUND = `repeating-linear-gradient(90deg, hsla(280,0%,67%,0.06) 0px, hsla(280,0%,67%,0.06) 1px,transparent 1px, transparent 96px),repeating-linear-gradient(0deg, hsla(280,0%,67%,0.06) 0px, hsla(280,0%,67%,0.06) 1px,transparent 1px, transparent 96px),repeating-linear-gradient(0deg, hsla(280,0%,67%,0.09) 0px, hsla(280,0%,67%,0.09) 1px,transparent 1px, transparent 12px),repeating-linear-gradient(90deg, hsla(280,0%,67%,0.09) 0px, hsla(280,0%,67%,0.09) 1px,transparent 1px, transparent 12px),linear-gradient(90deg, hsl(226,47%,26%),hsl(226,47%,26%))`;



    // --- FUNCIONES DE RENDERIZADO DE LA UI ---
    function renderBoardList() {
        boardList.innerHTML = '';
        Object.values(appState.boards).forEach(b => {
            const li = document.createElement('li');
            li.textContent = b.name;
            li.dataset.boardId = b.id;
            if (b.id === appState.activeBoardId) {
                li.classList.add('active');
            }
            li.addEventListener('click', () => switchBoard(b.id));
            boardList.appendChild(li);
        });
    }

    function renderActiveBoard() {
        board.innerHTML = ''; // Limpiar tablero
        removeActiveLines(); // Limpiar líneas existentes
        const currentBoard = appState.boards[appState.activeBoardId];
        if (!currentBoard) return;

        // Sincronizar checkboxes de aplicación de fondo
        bgApplyToBoardCheckbox.checked = currentBoard.backgroundApplyTo.board;
        bgApplyToNotesCheckbox.checked = currentBoard.backgroundApplyTo.notes;

        // Aplicar fondo al tablero si corresponde
        if (currentBoard.backgroundApplyTo.board) {
            boardContainer.style.background = currentBoard.background || DEFAULT_BOARD_BACKGROUND;
        } else {
            boardContainer.style.background = DEFAULT_BOARD_BACKGROUND;
        }

        // Actualizar la previsualización activa
        updateActiveBackgroundPreview(currentBoard.background);

        updateZoom(); // Aplicar el zoom guardado al renderizar
        if (currentBoard.notes.length === 0) {
            const welcomeMsg = document.createElement('div');
            welcomeMsg.classList.add('welcome-message');
            welcomeMsg.textContent = '¡Bienvenido! Arrastra una nota para comenzar.';
            board.appendChild(welcomeMsg);
        } else {
            currentBoard.notes.forEach(noteData => {
                createStickyNoteElement(noteData);
            });
        }
        renderConnections();
    }

    function renderConnections() {
        const currentBoard = appState.boards[appState.activeBoardId];
        if (!currentBoard.connections) currentBoard.connections = [];

        currentBoard.connections.forEach(conn => {
            const startEl = board.querySelector(`.stickynote[data-note-id="${conn.from}"]`);
            const endEl = board.querySelector(`.stickynote[data-note-id="${conn.to}"]`);

            if (startEl && endEl) {
                const { color, opacity, ...restOptions } = appState.lineOptions;
                
                // Función para convertir HEX a RGBA
                const hexToRgba = (hex, alpha) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                };

                const line = new LeaderLine(startEl, endEl, {
                    ...restOptions,
                    color: hexToRgba(color, opacity),
                    startSocket: 'auto',
                    endSocket: 'auto'
                });
                activeLines.push({ line, from: conn.from, to: conn.to });
            }
        });
    }
    function removeActiveLines() {
        activeLines.forEach(l => l.line.remove());
        activeLines = [];
    }

    // --- FUNCIONES DE ZOOM ---
    function updateZoom(newZoomLevel) {
        if (newZoomLevel !== undefined) {
            // Limitar el zoom entre 20% y 200%
            appState.zoomLevel = Math.max(0.2, Math.min(2, newZoomLevel));
        }
        board.style.transform = `scale(${appState.zoomLevel})`;
        zoomLevelDisplay.textContent = `${Math.round(appState.zoomLevel * 100)}%`;
        // ¡CORRECCIÓN! Actualizar la posición de todas las líneas al hacer zoom.
        activeLines.forEach(l => {
            l.line.position();
        });
        saveState();
    }

    function handleZoomIn() {
        updateZoom(appState.zoomLevel + 0.1);
    }
    function handleZoomOut() {
        updateZoom(appState.zoomLevel - 0.1);
    }
    function handleZoomReset() {
        updateZoom(1.0);
    }

    // --- FUNCIONES DE LÓGICA DE LA APP ---
    function switchBoard(boardId, noteToHighlightId = null) {
        if (boardId === appState.activeBoardId) return;
        appState.activeBoardId = boardId;
        saveState();
        renderBoardList();
        renderActiveBoard();
        searchInput.value = ''; // Limpiar búsqueda al cambiar de tablero
        globalSearchResults.innerHTML = ''; // Limpiar resultados globales
        board.classList.remove('searching');

        if (noteToHighlightId) {
            // Pequeño delay para asegurar que la nota está en el DOM
            setTimeout(() => {
                const noteEl = board.querySelector(`.stickynote[data-note-id="${noteToHighlightId}"]`);
                if (noteEl) {
                    noteEl.classList.add('highlight');
                    noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Quitar el resaltado después de un tiempo
                    setTimeout(() => noteEl.classList.remove('highlight'), 2500);
                }
            }, 100);
        }
    }

    function addNewBoard() {
        const boardName = prompt("Nombre del nuevo tablero:", "Nuevo Proyecto");
        if (boardName) {
            const newBoardId = `board-${Date.now()}`;
            appState.boards[newBoardId] = {
                id: newBoardId,
                name: boardName,
                notes: [],
                connections: [],
                background: null // Fondo por defecto para nuevos tableros
            };
            switchBoard(newBoardId);
        }
    }

    function createBoardFromTemplate(templateType) {
        const template = boardTemplates[templateType];
        if (!template) return;

        const boardName = prompt(`Nombre para el tablero "${template.name}":`, template.name);
        if (boardName) {
            const newBoardId = `board-${Date.now()}`;
            const newNotes = template.notes.map((note, index) => ({
                ...note,
                id: `note-${Date.now()}-${index}`,
                // Si la plantilla no especifica rotación, se añade una aleatoria
                zIndex: ++maxZIndex,
                locked: false,
                rotation: note.rotation !== undefined ? note.rotation : (Math.random() - 0.5) * 4,
                // Convertir la estructura de la plantilla a la nueva estructura de pestañas
                tabs: Array(5).fill(null).map((_, tabIndex) => ({
                    title: tabIndex === 0 ? (note.title || '') : '',
                    content: tabIndex === 0 ? (note.content || '') : ''
                })),
                activeTab: 0,
                // Eliminar propiedades antiguas para evitar confusiones
                ...('title' in note && { title: undefined }),
                ...('content' in note && { content: undefined }),
            }));

            appState.boards[newBoardId] = {
                id: newBoardId,
                name: boardName,
                notes: newNotes,
                connections: [], // Las plantillas aún no definen conexiones
                background: null,
                backgroundApplyTo: { board: true, notes: false }
            };
            switchBoard(newBoardId);
        }
    }

    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        globalSearchResults.innerHTML = ''; // Limpiar resultados anteriores

        if (searchTerm === '') {
            board.classList.remove('searching');
            board.querySelectorAll('.stickynote').forEach(noteEl => {
                noteEl.classList.remove('highlight');
            });
            return;
        }

        board.classList.add('searching');
        
        // Recorrer TODOS los tableros
        Object.values(appState.boards).forEach(currentBoard => {
            currentBoard.notes.forEach(note => {
                // Usamos un div temporal para quitar el HTML y buscar solo en el texto
                const tempDiv = document.createElement('div');
                // Buscar en todos los títulos y contenidos de todas las pestañas
                const searchableText = note.tabs.map(tab => `${tab.title} ${tab.content}`).join(' ');

                tempDiv.innerHTML = searchableText;
                const noteText = tempDiv.textContent || tempDiv.innerText || "";

                if (noteText.toLowerCase().includes(searchTerm)) {
                    // Si la nota está en el tablero ACTIVO, la resaltamos
                    if (currentBoard.id === appState.activeBoardId) {
                        const noteEl = board.querySelector(`.stickynote[data-note-id="${note.id}"]`);
                        noteEl?.classList.add('highlight');
                    } 
                    // Si la nota está en OTRO tablero, la mostramos en los resultados globales
                    else {
                        const resultItem = document.createElement('div');
                        resultItem.classList.add('search-result-item');
                        resultItem.innerHTML = `
                            <span class="board-name">${currentBoard.name}</span>
                            <span class="note-snippet">${noteText.substring(0, 100)}</span>
                        `;
                        resultItem.addEventListener('click', () => {
                            switchBoard(currentBoard.id, note.id);
                        });
                        globalSearchResults.appendChild(resultItem);
                    }
                } else {
                    // Si no coincide, nos aseguramos de que no esté resaltada (en el tablero activo)
                    if (currentBoard.id === appState.activeBoardId) {
                        const noteEl = board.querySelector(`.stickynote[data-note-id="${note.id}"]`);
                        noteEl?.classList.remove('highlight');
                    }
                }
            });
        });
    }

    function autoLink(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
    }

    function createStickyNoteElement(noteData, isNew = false) {
        const sticky = document.createElement("div");
        sticky.classList.add("stickynote");
        if (noteData.locked) {
            sticky.classList.add("locked");
        }
        sticky.dataset.noteId = noteData.id;
        sticky.style.left = `${noteData.x}px`;
        sticky.style.top = `${noteData.y}px`;
        sticky.style.width = `${noteData.width}px`;
        sticky.style.height = `${noteData.height}px`;
        sticky.style.backgroundColor = noteData.color;
        sticky.style.transform = `rotate(${noteData.rotation}deg)`;
        sticky.style.zIndex = noteData.zIndex;

        // --- MEJORA DE CONTRASTE ---
        // Añadir clase si el fondo es oscuro para cambiar el color del texto
        if (isColorDark(noteData.color)) {
            sticky.classList.add('dark-theme');
        }

        // Aplicar fondo de tablero a la nota si está activado
        const currentBoard = appState.boards[appState.activeBoardId];
        if (currentBoard.backgroundApplyTo.notes && currentBoard.background) {
            sticky.style.backgroundImage = currentBoard.background;
        }

        // --- TÍTULO ---
        const title = document.createElement("div");
        title.contentEditable = !noteData.locked;
        title.classList.add("stickynote-title");
        title.setAttribute("placeholder", "Título...");
        // Mostrar el título de la pestaña activa
        title.innerHTML = noteData.tabs[noteData.activeTab].title || '';
        title.addEventListener('blur', () => {
            const newTitle = title.innerHTML;
            if (noteData.tabs[noteData.activeTab].title !== newTitle) {
                noteData.tabs[noteData.activeTab].title = newTitle;
                saveState();

                // Actualizar la parte del título de la pestaña activa
                const activeTabElement = sticky.querySelector(`.stickynote-tab[data-tab-index="${noteData.activeTab}"]`);
                const titlePart = activeTabElement.querySelector('.stickynote-tab-part[data-part="title"]');
                titlePart.classList.toggle('filled', !!newTitle.trim());
                titlePart.classList.toggle('empty', !newTitle.trim());

                handleSearch();
            }
        });

        // --- CONTENEDOR DE PESTAÑAS Y CONTENIDO ---
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'stickynote-content-wrapper';

        const tabContainer = document.createElement('div');
        tabContainer.className = 'stickynote-tabs';

        const contentContainer = document.createElement('div');
        contentContainer.className = 'stickynote-content-container';

        for (let i = 0; i < 5; i++) {
            // Crear pestaña
            const tab = document.createElement('div');
            tab.className = 'stickynote-tab';
            tab.dataset.tabIndex = i;

            // --- RE-DISEÑO: Pestaña inteligente con texto ---
            const tabTitlePart = document.createElement('span');
            tabTitlePart.className = 'stickynote-tab-part';
            tabTitlePart.dataset.part = 'title';
            tabTitlePart.textContent = 'Título';
            tabTitlePart.classList.add(noteData.tabs[i]?.title?.trim() ? 'filled' : 'empty');

            const tabContentPart = document.createElement('span');
            tabContentPart.className = 'stickynote-tab-part';
            tabContentPart.dataset.part = 'content';
            tabContentPart.textContent = 'Cuerpo';
            tabContentPart.classList.add(noteData.tabs[i]?.content?.trim() ? 'filled' : 'empty');

            tab.appendChild(tabTitlePart);
            tab.appendChild(tabContentPart);

            if (i === noteData.activeTab) {
                tab.classList.add('active');
            }
            tab.addEventListener('click', (e) => { // Clic izquierdo para cambiar de pestaña
                e.stopPropagation();
                // Cambiar de pestaña
                noteData.activeTab = i;
                saveState();
                
                // Actualizar clases de pestañas y contenido
                const currentActiveTab = sticky.querySelector('.stickynote-tab.active');
                if (currentActiveTab) currentActiveTab.classList.remove('active');
                tab.classList.add('active');
                const currentActiveContent = sticky.querySelector('.stickynote-text.active');
                if (currentActiveContent) currentActiveContent.classList.remove('active');
                sticky.querySelector(`.stickynote-text[data-tab-index="${i}"]`).classList.add('active');

                // ¡NUEVO! Actualizar el título principal de la nota
                title.innerHTML = noteData.tabs[i].title || '';
            });
            tab.addEventListener('contextmenu', (e) => { // Clic derecho para menú
                e.preventDefault();
                e.stopPropagation();
                contextMenuTabInfo = { noteId: noteData.id, tabIndex: i };
                showTabContextMenu(e.clientX, e.clientY);
            });
            tabContainer.appendChild(tab);

            // Crear área de contenido para la pestaña
            const content = document.createElement("div");
            content.contentEditable = !noteData.locked;
            content.classList.add("stickynote-text");
            if (i === noteData.activeTab) {
                content.classList.add('active');
            }
            content.dataset.tabIndex = i;
            content.setAttribute("placeholder", "Escribe algo...");
            content.innerHTML = noteData.tabs[i].content || '';
            content.addEventListener('blur', () => {
                const newContent = content.innerHTML;
                if (noteData.tabs[i].content !== newContent) {
                    noteData.tabs[i].content = newContent;
                    saveState();
                    // Actualizar la parte de contenido de la pestaña (UX)
                    const tabEl = sticky.querySelector(`.stickynote-tab[data-tab-index="${i}"]`);
                    if (tabEl) {
                        const contentPart = tabEl.querySelector('.stickynote-tab-part[data-part="content"]');
                        contentPart.classList.toggle('filled', !!newContent.trim());
                        contentPart.classList.toggle('empty', !newContent.trim());
                    }
                    handleSearch();
                }
            });
            contentContainer.appendChild(content);
        }

        const connectBtn = document.createElement("div");
        connectBtn.className = 'connect-btn';
        connectBtn.innerHTML = '☍'; // Símbolo de enlace
        connectBtn.title = 'Crear conexión';

        // Evento para el botón de conexión
        connectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleConnectionClick(noteData.id);
        });

        const resizer = document.createElement("div");
        resizer.classList.add("resizer");

        sticky.appendChild(title);
        contentWrapper.appendChild(contentContainer);
        contentWrapper.appendChild(tabContainer);
        sticky.appendChild(contentWrapper);

        sticky.appendChild(connectBtn);
        sticky.appendChild(resizer);
        board.appendChild(sticky);

        if (isNew) {
            // Añade la clase para la animación y la quita cuando termina
            sticky.classList.add('new-note-animation');
            sticky.addEventListener('animationend', () => {
                sticky.classList.remove('new-note-animation');
            }, { once: true });
        }

        return sticky;
    }

    function handleConnectionClick(noteId) {
        const startNoteEl = board.querySelector(`.stickynote[data-note-id="${connectionState.startNoteId}"]`);
        if (startNoteEl) startNoteEl.classList.remove('connection-start');

        if (!connectionState.startNoteId) {
            // Iniciar conexión
            connectionState.startNoteId = noteId;
            const noteEl = board.querySelector(`.stickynote[data-note-id="${noteId}"]`);
            noteEl.classList.add('connection-start');
        } else {
            // Finalizar conexión
            if (connectionState.startNoteId !== noteId) {
                const currentBoard = appState.boards[appState.activeBoardId];
                currentBoard.connections.push({ from: connectionState.startNoteId, to: noteId });
                saveState();
                renderActiveBoard(); // Re-renderizar para mostrar la nueva línea
            }
            // Resetear estado de conexión
            connectionState.startNoteId = null;
        }
    }

    function bringToFront(noteElement, noteData) {
        if (noteData.zIndex >= maxZIndex) return; // Ya está al frente
        noteData.zIndex = ++maxZIndex;
        noteElement.style.zIndex = noteData.zIndex;
        saveState();
    }

    // --- LÓGICA DE ARRASTRAR Y SOLTAR (DRAG & DROP) CORREGIDA ---

    function handlePointerDown(e) {
        const target = e.target;
        const boardRect = boardContainer.getBoundingClientRect();

        // CASO 1: Iniciar redimensión
        if (target.classList.contains('resizer')) {
            e.preventDefault();
            isResizing = true;
            activeNote = target.closest('.stickynote');
            activeNoteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === activeNote.dataset.noteId);
            if (activeNoteData.locked) { isResizing = false; activeNote = null; return; }
            bringToFront(activeNote, activeNoteData);
            activeNote.classList.add('dragging');
            trashCan.classList.add('visible');
            return;
        }

        // Si estamos en modo conexión, un clic en una nota crea la conexión
        if (connectionState.startNoteId && e.target.closest('.stickynote')) {
            const noteEl = e.target.closest('.stickynote');
            if (noteEl) {
                e.preventDefault();
                handleConnectionClick(noteEl.dataset.noteId);
            }
            return;
        }

        // CASO 2: Iniciar arrastre para CREAR una nota nueva
        if (target.classList.contains('palette-note')) {
            e.preventDefault();
            board.querySelector('.welcome-message')?.remove();

            const color = target.dataset.color;
            // **CORRECCIÓN:** Calcular posición inicial relativa al tablero
            const mouseXInBoard = (e.clientX - boardRect.left) / appState.zoomLevel;
            const mouseYInBoard = (e.clientY - boardRect.top) / appState.zoomLevel;

            const newNoteData = {
                id: `note-${Date.now()}`,
                // Nueva estructura de pestañas
                tabs: Array(5).fill(null).map(() => ({
                    title: '',
                    content: ''
                })),
                activeTab: 0,
                width: 200, height: 200, color: color,
                rotation: (Math.random() - 0.5) * 8,
                locked: false,
                zIndex: ++maxZIndex,
                x: mouseXInBoard - (100 / appState.zoomLevel), // Centrar la nota en el cursor, ajustado al zoom
                y: mouseYInBoard - (100 / appState.zoomLevel),
            };

            appState.boards[appState.activeBoardId].notes.push(newNoteData);
            activeNote = createStickyNoteElement(newNoteData, true);
            activeNoteData = newNoteData;
            
            // **CORRECCIÓN:** El desfase ahora es desde el centro de la nota
            offsetX = 100 / appState.zoomLevel;
            offsetY = 100 / appState.zoomLevel;

            activeNote.classList.add('dragging');
            trashCan.classList.add('visible');
        }

        // CASO 3: Iniciar arrastre para MOVER una nota existente
        const noteToDrag = target.closest('.stickynote');
        if (noteToDrag && !target.classList.contains('resizer') && !target.classList.contains('connect-btn')) {
            activeNote = noteToDrag;
            activeNoteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === activeNote.dataset.noteId);
            if (activeNoteData.locked) { activeNote = null; return; }

            // Solo prevenimos el comportamiento por defecto (y empezamos a arrastrar) si no es el área de texto.
            if (!target.classList.contains('stickynote-text') && !target.classList.contains('stickynote-title')) e.preventDefault();

            // **CORRECCIÓN:** Calcular el desfase relativo al tablero y AJUSTADO AL ZOOM
            const mouseXInBoard = (e.clientX - boardRect.left) / appState.zoomLevel;
            const mouseYInBoard = (e.clientY - boardRect.top) / appState.zoomLevel;
            offsetX = mouseXInBoard - activeNote.offsetLeft;
            offsetY = mouseYInBoard - activeNote.offsetTop;

            bringToFront(activeNote, activeNoteData);
            if (!target.classList.contains('stickynote-text') && !target.classList.contains('stickynote-title')) {
                activeNote.classList.add('dragging');
                trashCan.classList.add('visible');
            }
        }
    }

    function handlePointerMove(e) {
        if (!activeNote || (activeNoteData && activeNoteData.locked)) return;
        e.preventDefault();

        const boardRect = boardContainer.getBoundingClientRect();

        if (isResizing) {
            // Lógica de redimensionamiento
            const newWidth = (e.clientX - activeNote.getBoundingClientRect().left) / appState.zoomLevel;
            const newHeight = (e.clientY - activeNote.getBoundingClientRect().top) / appState.zoomLevel;
            activeNoteData.width = Math.max(150, newWidth);
            activeNoteData.height = Math.max(150, newHeight);
            activeNote.style.width = `${activeNoteData.width}px`;
            activeNote.style.height = `${activeNoteData.height}px`;
        } else {
            // Lógica de arrastre
            // **CORRECCIÓN:** Calcular la nueva posición relativa al tablero y AJUSTADA AL ZOOM
            const mouseXInBoard = (e.clientX - boardRect.left) / appState.zoomLevel;
            const mouseYInBoard = (e.clientY - boardRect.top) / appState.zoomLevel;
            const newX = mouseXInBoard - offsetX;
            const newY = mouseYInBoard - offsetY;

            activeNoteData.x = newX;
            activeNoteData.y = newY;
            activeNote.style.left = `${newX}px`;
            activeNote.style.top = `${newY}px`;
            // Actualizar líneas conectadas
            activeLines.forEach(l => {
                if (l.from === activeNoteData.id || l.to === activeNoteData.id) {
                    l.line.position();
                }
            });
            activeNote.style.transform = `rotate(${activeNoteData.rotation}deg) scale(1.05)`; // Mantener rotación al arrastrar
        }

        // Lógica de la papelera
        const trashRect = trashCan.getBoundingClientRect();
        if (e.clientX > trashRect.left && e.clientX < trashRect.right && e.clientY > trashRect.top && e.clientY < trashRect.bottom) {
            trashCan.classList.add('active');
        } else {
            trashCan.classList.remove('active');
        }
    }

    function handlePointerUp() {
        if (!activeNote) return;

        if (trashCan.classList.contains('active')) {
            moveNoteToTrash(activeNoteData.id);
        } else {
            if (!isResizing) activeLines.forEach(l => l.line.position()); // Reposicionar al soltar
            activeNote.style.transform = `rotate(${activeNoteData.rotation}deg) scale(1)`;
        }
        
        activeNote.classList.remove('dragging');
        trashCan.classList.remove('visible', 'active');
        
        // Limpiar variables de estado
        activeNote = null;
        activeNoteData = null;
        isResizing = false;
        offsetX = 0;
        offsetY = 0;
        
        saveState();
        if (appState.boards[appState.activeBoardId].notes.length === 0) {
            renderActiveBoard(); // Volver a mostrar mensaje de bienvenida si es necesario
        }
    }

    function handleWheelRotate(e) {
        // Rotar la nota activa con la rueda del ratón mientras se arrastra
        if (!activeNote || isResizing || (activeNoteData && activeNoteData.locked)) return;

        e.preventDefault(); // Evitar el scroll de la página

        const rotationIncrement = e.deltaY > 0 ? 2 : -2; // Grados a rotar por cada "tick" de la rueda
        activeNoteData.rotation = (activeNoteData.rotation + rotationIncrement) % 360;

        activeNote.style.transform = `rotate(${activeNoteData.rotation}deg) scale(1.05)`;
    }
    
    // --- LÓGICA DEL MENÚ CONTEXTUAL ---
    function handleContextMenu(e) {
        // Primero, verificar si el clic es en una pestaña de nota
        const tabElement = e.target.closest('.stickynote-tab');
        if (tabElement) {
            // El evento 'contextmenu' en la pestaña ya se maneja al crearla.
            // Prevenimos que se abra el menú contextual principal.
            e.preventDefault();
            return;
        }

        // Si no es una pestaña, verificar si es en una nota
        const noteElement = e.target.closest('.stickynote');
        if (noteElement) {
            e.preventDefault();
            hideTabContextMenu(); // Ocultar el otro menú por si acaso
            contextMenuNoteId = noteElement.dataset.noteId;
            
            const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === contextMenuNoteId);
            ctxLockBtn.textContent = noteData.locked ? 'Desbloquear Nota' : 'Bloquear Nota';

            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.classList.remove('hidden');
        } else {
            // Si se hace clic en cualquier otro lugar, ocultar ambos menús
            hideContextMenu();
            hideTabContextMenu();
        }
    }

    function showTabContextMenu(x, y) {
        hideContextMenu(); // Ocultar el menú principal
        tabContextMenu.style.top = `${y}px`;
        tabContextMenu.style.left = `${x}px`;
        tabContextMenu.classList.remove('hidden');
    }

    function hideTabContextMenu() {
        tabContextMenu.classList.add('hidden');
        contextMenuTabInfo = null;
    }

    function clearTab() {
        if (!contextMenuTabInfo) return;
        const { noteId, tabIndex } = contextMenuTabInfo;
        hideTabContextMenu(); // Ocultar menú inmediatamente

        const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === noteId);
        const noteElement = board.querySelector(`.stickynote[data-note-id="${noteId}"]`);
        if (!noteData || !noteElement) return;

        // UX: Pedir confirmación antes de borrar
        if (!confirm('¿Estás seguro de que quieres limpiar el título y el contenido de esta pestaña?')) {
            return;
        }

        const titleElement = noteElement.querySelector('.stickynote-title');
        const contentElement = noteElement.querySelector(`.stickynote-text[data-tab-index="${tabIndex}"]`);
        const tabElement = noteElement.querySelector(`.stickynote-tab[data-tab-index="${tabIndex}"]`);

        // Aplicar animación de desvanecimiento
        contentElement.classList.add('clearing-out');

        // Esperar a que la animación termine para limpiar los datos
        contentElement.addEventListener('animationend', () => {
            // Limpiar datos en el estado de la aplicación
            noteData.tabs[tabIndex] = { title: '', content: '' };
            saveState();

            // Limpiar el DOM
            contentElement.innerHTML = '';
            if (noteData.activeTab === tabIndex) {
                titleElement.innerHTML = '';
            }
            // Actualizar las dos partes de la pestaña a 'empty'
            const titlePart = tabElement.querySelector('.stickynote-tab-part[data-part="title"]');
            const contentPart = tabElement.querySelector('.stickynote-tab-part[data-part="content"]');
            titlePart.className = 'stickynote-tab-part empty';
            contentPart.className = 'stickynote-tab-part empty';
            contentElement.classList.remove('clearing-out'); // Limpiar clase para futuras animaciones
        }, { once: true }); // El listener se ejecuta solo una vez
    }

    function hideContextMenu() {
        contextMenu.classList.add('hidden');
        contextMenuNoteId = null;
    }

    function duplicateNote() {
        if (!contextMenuNoteId) return;
        const originalNoteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === contextMenuNoteId);
        if (!originalNoteData) return;

        const newNoteData = {
            id: `note-${Date.now()}`,
            ...JSON.parse(JSON.stringify(originalNoteData)), // Deep copy para las pestañas
            x: originalNoteData.x + 20, // Pequeño desfase
            y: originalNoteData.y + 20,
            zIndex: ++maxZIndex,
            locked: false // La nota duplicada nunca está bloqueada
        };

        appState.boards[appState.activeBoardId].notes.push(newNoteData);
        createStickyNoteElement(newNoteData, true);
        saveState();
        hideContextMenu();
    }

    function toggleLockNote() {
        if (!contextMenuNoteId) return;
        const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === contextMenuNoteId);
        const noteElement = board.querySelector(`.stickynote[data-note-id="${contextMenuNoteId}"]`);
        if (!noteData || !noteElement) return;

        noteData.locked = !noteData.locked;
        noteElement.classList.toggle('locked');
        noteElement.querySelector('.stickynote-title').contentEditable = !noteData.locked;
        noteElement.querySelectorAll('.stickynote-text').forEach(el => el.contentEditable = !noteData.locked);

        saveState();
        hideContextMenu();
    }

    function deleteNoteFromContext() {
        if (!contextMenuNoteId) return;
        moveNoteToTrash(contextMenuNoteId);
    }

    function handleTabSwitching() {
        const tabNav = document.querySelector('.tab-nav');
        if (!tabNav) return;

        tabNav.addEventListener('click', (e) => {
            const button = e.target.closest('.tab-btn');
            if (!button || button.classList.contains('active')) return;

            const tabId = button.dataset.tab;

            tabNav.querySelector('.tab-btn.active')?.classList.remove('active');
            button.classList.add('active');

            boardManager.querySelector('.tab-content.active')?.classList.remove('active');
            document.getElementById(`tab-content-${tabId}`)?.classList.add('active');

            if (tabId === 'trash') renderTrash();
        });
    }

    function initializeLineStyleControls() {
        const { color, opacity, path, size, endPlug } = appState.lineOptions;
        lineColorInput.value = color;
        lineOpacityInput.value = opacity;
        linePathSelect.value = path;
        lineSizeInput.value = size;
        linePlugSelect.value = endPlug;

        const updateLineStyle = () => {
            appState.lineOptions.color = lineColorInput.value;
            appState.lineOptions.opacity = parseFloat(lineOpacityInput.value);
            appState.lineOptions.path = linePathSelect.value;
            appState.lineOptions.size = parseInt(lineSizeInput.value, 10);
            appState.lineOptions.endPlug = linePlugSelect.value;
            saveState();
            renderActiveBoard(); // Re-renderizar para aplicar cambios
        };

        [lineColorInput, lineOpacityInput, linePathSelect, lineSizeInput, linePlugSelect].forEach(el => 
            el.addEventListener('change', updateLineStyle));
    }

    function buildGradient(colors) {
        return `linear-gradient(45deg, ${colors.join(', ')})`;
    }

    function createBackgroundPreviews(title, gradients, isRaw = false) {
        const categoryTitle = document.createElement('p');
        categoryTitle.className = 'tab-title';
        categoryTitle.textContent = title;
        backgroundOptionsContainer.appendChild(categoryTitle);

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
        backgroundOptionsContainer.appendChild(categoryContainer);
    }

    async function initializeBackgroundOptions() {
        try {
            const [gradientsRes, stripesRes] = await Promise.all([
                fetch('fondo/gradients.json'),
                fetch('fondo/gradientesraya.json')
            ]);

            if (gradientsRes.ok) {
                const gradients = await gradientsRes.json();
                createBackgroundPreviews('Gradientes', gradients, false);
            }
            if (stripesRes.ok) {
                const stripes = await stripesRes.json();
                createBackgroundPreviews('Rayas', stripes, true);
            }

        } catch (error) {
            console.error("Error al cargar los fondos:", error);
            backgroundOptionsContainer.innerHTML = '<p>No se pudieron cargar los fondos.</p>';
        }

        resetBackgroundBtn.addEventListener('click', () => applyBackground(null));
        // Añadir listeners a los checkboxes para aplicar cambios inmediatamente
        bgApplyToBoardCheckbox.addEventListener('change', () => applyBackground(appState.boards[appState.activeBoardId].background));
        bgApplyToNotesCheckbox.addEventListener('change', () => applyBackground(appState.boards[appState.activeBoardId].background));
    }

    function applyBackground(backgroundValue) {
        const currentBoard = appState.boards[appState.activeBoardId];
        if (!currentBoard) return;

        // Guardar la configuración de a qué se aplica
        currentBoard.backgroundApplyTo = {
            board: bgApplyToBoardCheckbox.checked,
            notes: bgApplyToNotesCheckbox.checked
        };

        currentBoard.background = backgroundValue;

        // Aplicar al tablero
        if (currentBoard.backgroundApplyTo.board) {
            boardContainer.style.background = backgroundValue || DEFAULT_BOARD_BACKGROUND;
        } else {
            boardContainer.style.background = DEFAULT_BOARD_BACKGROUND; // Restaurar si no se aplica
        }

        // Aplicar a todas las notas del tablero actual
        document.querySelectorAll('.stickynote').forEach(noteEl => {
            noteEl.style.backgroundImage = currentBoard.backgroundApplyTo.notes ? backgroundValue : '';
        });

        saveState();
        updateActiveBackgroundPreview(backgroundValue);
    }

    function updateActiveBackgroundPreview(backgroundValue) {
        document.querySelectorAll('.background-preview').forEach(p => {
            if (p.dataset.background === backgroundValue || (!backgroundValue && !p.dataset.background)) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });
    }

    // --- LÓGICA DE LA PAPELERA Y NOTIFICACIONES ---

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);

        // El toast se elimina a sí mismo después de que la animación termina
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }

    function moveNoteToTrash(noteId) {
        const boardId = appState.activeBoardId;
        const notes = appState.boards[boardId].notes;
        const noteIndex = notes.findIndex(n => n.id === noteId);

        if (noteIndex > -1) {
            const [noteToTrash] = notes.splice(noteIndex, 1);
            noteToTrash.originalBoardId = boardId; // Guardar de dónde vino
            appState.trash.push(noteToTrash);

            // Eliminar conexiones asociadas
            appState.boards[boardId].connections = appState.boards[boardId].connections.filter(
                conn => conn.from !== noteId && conn.to !== noteId
            );

            saveState();
            renderActiveBoard(); // Re-renderizar el tablero actual
            showToast('Nota movida a la papelera.');
        }
        hideContextMenu();
    }

    function renderTrash() {
        trashListContainer.innerHTML = '';
        if (appState.trash.length === 0) {
            trashListContainer.innerHTML = '<p style="opacity: 0.7; text-align: center;">La papelera está vacía.</p>';
            return;
        }

        appState.trash.forEach(note => {
            const item = document.createElement('div');
            item.className = 'trash-item';

            const activeTabData = note.tabs[note.activeTab] || { title: '', content: '' };
            const titleText = activeTabData.title || 'Nota sin título';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = note.tabs.map(t => t.content).join(' ');
            const noteText = (tempDiv.textContent || tempDiv.innerText || "").trim() || 'Nota vacía';

            item.innerHTML = `
                <div class="trash-item-title">${titleText}</div>
                <div class="trash-item-content">${noteText || 'Nota vacía'}</div>
                <div class="trash-item-actions">
                    <button class="restore" data-note-id="${note.id}">Restaurar</button>
                    <button data-note-id="${note.id}">Borrar</button>
                </div>
            `;
            trashListContainer.appendChild(item);
        });

        trashListContainer.querySelectorAll('.restore').forEach(btn => {
            btn.addEventListener('click', () => restoreNote(btn.dataset.noteId));
        });
        trashListContainer.querySelectorAll('button:not(.restore)').forEach(btn => {
            btn.addEventListener('click', () => deletePermanently(btn.dataset.noteId));
        });
    }

    function restoreNote(noteId) {
        const trashIndex = appState.trash.findIndex(n => n.id === noteId);
        if (trashIndex > -1) {
            const [noteToRestore] = appState.trash.splice(trashIndex, 1);
            const targetBoard = appState.boards[noteToRestore.originalBoardId];
            if (targetBoard) {
                targetBoard.notes.push(noteToRestore);
                delete noteToRestore.originalBoardId; // Limpiar la propiedad
                saveState();
                renderTrash();
                // Si la nota pertenece al tablero actual, re-renderizarlo
                if (targetBoard.id === appState.activeBoardId) {
                    renderActiveBoard();
                }
                showToast('Nota restaurada.');
            }
        }
    }

    function deletePermanently(noteId) {
        appState.trash = appState.trash.filter(n => n.id !== noteId);
        saveState();
        renderTrash();
    }

    function emptyTrash() {
        if (confirm('¿Estás seguro de que quieres vaciar la papelera? Esta acción no se puede deshacer.')) {
            appState.trash = [];
            saveState();
            renderTrash();
        }
    }

    function initializeSidebarResizing() {
        const resizer = document.getElementById('sidebar-resizer');
        if (!resizer) return;

        const minWidth = 220;
        const maxWidth = 500;

        // Aplicar el ancho guardado al iniciar
        boardManager.style.width = `${appState.sidebarWidth || 260}px`;

        const handlePointerDown = (e) => {
            e.preventDefault();
            resizer.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            const handlePointerMove = (moveEvent) => {
                let newWidth = moveEvent.clientX;
                if (newWidth < minWidth) newWidth = minWidth;
                if (newWidth > maxWidth) newWidth = maxWidth;

                boardManager.style.width = `${newWidth}px`;
                // Actualizar la posición de las líneas en tiempo real
                activeLines.forEach(l => l.line.position());
            };

            const handlePointerUp = () => {
                resizer.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                appState.sidebarWidth = parseInt(boardManager.style.width, 10);
                saveState();

                document.removeEventListener('pointermove', handlePointerMove);
                document.removeEventListener('pointerup', handlePointerUp);
            };

            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener('pointerup', handlePointerUp);
        };

        resizer.addEventListener('pointerdown', handlePointerDown);
    }

    // --- LÓGICA DE LA PALETA DE COLORES (POPOVER) ---

    function showColorPopover() {
        if (!contextMenuNoteId) return;

        const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === contextMenuNoteId);
        if (!noteData) return;

        // --- SOLUCIÓN: Guardar el ID en la variable del popover ---
        popoverNoteId = contextMenuNoteId;
        popoverOriginalColor = noteData.color; // Guardar color original

        // Resaltar el color actual
        for (const swatch of popoverPalette.children) {
            const isActive = swatch.dataset.color === noteData.color;
            swatch.classList.toggle('active', isActive);
            swatch.classList.toggle('light-bg', isActive && !isColorDark(swatch.dataset.color));
            swatch.classList.toggle('dark-bg', isActive && isColorDark(swatch.dataset.color));
        }
        
        const menuRect = contextMenu.getBoundingClientRect();
        colorPopover.style.top = `${menuRect.top}px`;
        colorPopover.style.left = `${menuRect.right + 10}px`;
        colorPopover.classList.remove('hidden');
        hideContextMenu(); // Ahora esto es seguro, porque ya guardamos el ID
    }

    function hideColorPopover() {
        if (!colorPopover.classList.contains('hidden') && popoverOriginalColor) {
            // Restaurar el color original si se cierra sin seleccionar
            // --- SOLUCIÓN: Usar popoverNoteId ---
            const noteElement = board.querySelector(`.stickynote[data-note-id="${popoverNoteId}"]`);
            if (noteElement) {
                noteElement.style.backgroundColor = popoverOriginalColor;
            }
        }
        colorPopover.classList.add('hidden');
        popoverOriginalColor = null;
        // --- SOLUCIÓN: Limpiar el ID del popover ---
        popoverNoteId = null;
    }

    function changeNoteColor(newColor) {
        // --- SOLUCIÓN: Usar popoverNoteId ---
        if (!popoverNoteId) return;

        const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === popoverNoteId);
        const noteElement = board.querySelector(`.stickynote[data-note-id="${popoverNoteId}"]`);

        if (noteData && noteElement) {
            popoverOriginalColor = null; // Marcar que el color ha sido elegido, para no restaurarlo.
            noteData.color = newColor;
            noteElement.style.backgroundColor = newColor;
            
            // --- MEJORA DE CONTRASTE ---
            // Actualizar la clase de tema claro/oscuro al cambiar el color
            noteElement.classList.toggle('dark-theme', isColorDark(newColor));

            saveState();
        }
        hideColorPopover();
    }

    function initializeColorPopover() {
        // Paleta extendida de colores
        const extendedColors = [
            '#FFFFFF', '#F1F3F4', '#CFD8DC', '#E8EAED', '#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9', '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', '#C8E6C9', '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3', '#FFE0B2', '#FFCCBC', '#D7CCC8', '#424242', '#000000'
        ];

        // Función para previsualizar el color en la nota
        const previewNoteColor = (color) => {
            // --- SOLUCIÓN: Usar popoverNoteId ---
            if (!popoverNoteId) return;
            const noteElement = board.querySelector(`.stickynote[data-note-id="${popoverNoteId}"]`);
            if (noteElement) {
                noteElement.style.backgroundColor = color;
                // MEJORA DE CONTRASTE: Actualizar la clase de tema claro/oscuro también en la previsualización
                noteElement.classList.toggle('dark-theme', isColorDark(color)); // Esta línea ya estaba, la muevo para agrupar.
            }
        };

        extendedColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.addEventListener('click', () => changeNoteColor(color));
            swatch.addEventListener('mouseenter', () => previewNoteColor(color));
            popoverPalette.appendChild(swatch);
        });

        // Restablecer el color de la nota cuando el cursor sale de la paleta
        popoverPalette.addEventListener('mouseleave', () => {
            if (popoverOriginalColor) {
                // Al salir, restauramos el color y también el tema de contraste original
                const noteElement = board.querySelector(`.stickynote[data-note-id="${popoverNoteId}"]`);
                if (noteElement) previewNoteColor(popoverOriginalColor);
            }
        });

        ctxChangeColorBtn.addEventListener('click', showColorPopover);
        closePopoverBtn.addEventListener('click', hideColorPopover);
    }

    // --- Lógica del visualizador de audio con Canvas (Modal "Sobre Mí") ---
    function setupAudioVisualizer() {
        if (audioContext) return; // Evitar inicializar múltiples veces

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        source = audioContext.createMediaElementSource(aboutModalAudio);
        canvasCtx = audioVisualizerCanvas.getContext('2d');

        source.connect(analyser);
        analyser.connect(audioContext.destination);

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // Inicializar partículas
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
            particles.push({
                angle,
                radius: 80, // Radio base del anillo
                energy: 0,
                color: `hsl(${i / PARTICLE_COUNT * 360}, 100%, 70%)`
            });
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        const container = audioVisualizerCanvas.parentElement;
        if (!container) return;
        const size = Math.min(container.clientWidth, container.clientHeight);
        audioVisualizerCanvas.width = size;
        audioVisualizerCanvas.height = size;
    }

    function animateVisualizer() {
        if (!isVisualizerActive) return;

        requestAnimationFrame(animateVisualizer);

        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, audioVisualizerCanvas.width, audioVisualizerCanvas.height);
        const centerX = audioVisualizerCanvas.width / 2;
        const centerY = audioVisualizerCanvas.height / 2;

        particles.forEach((p, i) => {
            // Mapear la frecuencia a la partícula
            const dataIndex = Math.floor(i * (dataArray.length / PARTICLE_COUNT));
            const dataValue = dataArray[dataIndex];

            // La energía de la partícula decae suavemente
            p.energy = Math.max(dataValue / 4, p.energy * 0.92);

            const displayRadius = p.radius + p.energy;
            const x = centerX + Math.cos(p.angle) * displayRadius;
            const y = centerY + Math.sin(p.angle) * displayRadius;

            // Dibujar la partícula
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 2, 0, Math.PI * 2);
            canvasCtx.fillStyle = p.color;
            canvasCtx.globalAlpha = Math.min(1, p.energy / 30); // La opacidad depende de la energía
            canvasCtx.fill();
        });

        canvasCtx.globalAlpha = 1; // Restaurar opacidad global
    }

    // --- LÓGICA DEL MODAL "SOBRE MÍ" ---
    function initializeAboutModal() {
        aboutBtn.addEventListener('click', () => {
            // Mostrar modal y reproducir música
            if (!audioContext) {
                setupAudioVisualizer(); // Asegurarse de que el audio context esté listo
            }
            aboutModal.classList.remove('hidden');
            isVisualizerActive = true;
            aboutModalAudio.play().catch(error => {
                // Los navegadores pueden bloquear el autoplay si no hay interacción previa.
                // Esto evita un error en la consola en esos casos.
                console.log("La reproducción automática fue bloqueada por el navegador.");
            });
            animateVisualizer(); // Iniciar la animación del visualizador
        });

        const closeModal = () => {
            aboutModal.classList.add('hidden');
            isVisualizerActive = false;
            aboutModalAudio.pause(); // Pausar la música
            aboutModalAudio.currentTime = 0; // Reiniciar para la próxima vez
        };

        closeAboutModalBtn.addEventListener('click', closeModal);
        // Cerrar también si se hace clic en el fondo oscuro
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) closeModal();
        });
    }

    // --- INICIALIZACIÓN DE LA APP ---
    function initializeApp() {
        loadState();

        // Lógica para los botones de ocultar/mostrar panel
        const collapseBtn = document.querySelector("#sidebar-collapse-btn");
        const expander = document.querySelector("#sidebar-expander");

        const updateCollapsedMargin = () => {
            const currentWidth = boardManager.offsetWidth;
            const padding = parseInt(getComputedStyle(boardManager).paddingLeft, 10) * 2;
            boardManager.style.setProperty('--collapsed-margin', `-${currentWidth + padding}px`);
        };

        const smoothLineUpdateOnToggle = () => {
            const duration = 400; // Debe coincidir con la duración de la transición en CSS
            const startTime = performance.now();

            function animateLines() {
                const elapsed = performance.now() - startTime;
                if (elapsed < duration) {
                    activeLines.forEach(l => l.line.position());
                    requestAnimationFrame(animateLines);
                } else {
                    // Una última actualización para asegurar la posición final perfecta
                    activeLines.forEach(l => l.line.position());
                }
            }
            requestAnimationFrame(animateLines);
        };

        collapseBtn.addEventListener('click', () => {
            boardManager.style.marginLeft = `-${boardManager.offsetWidth}px`;
            boardManager.classList.add('collapsed');
            smoothLineUpdateOnToggle();
        });
        expander.addEventListener('click', () => {
            boardManager.style.marginLeft = '';
            boardManager.classList.remove('collapsed');
            smoothLineUpdateOnToggle();
        });

        // Configurar UI
        addBoardBtn.innerHTML = '<span class="icon">🎪</span> Nuevo Tablero';
        handleTabSwitching();

        // Crear botones de plantillas dinámicamente
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

        // --- MEJORA UX/UI: Paleta de notas con scroll infinito y circular ---
        const paletteScrollContainer = document.querySelector("#palette-scroll-container");
        const scrollIndicatorUp = paletteScrollContainer.previousElementSibling;
        const scrollIndicator = paletteScrollContainer.nextElementSibling;
        
        let lastScrollTop = 0; // Para detectar la dirección del scroll

        // 1. Generar una paleta de colores rica con matices
        const rainbowColors = [
            '#ff7979', // Rojo pastel
            '#ffbe76', // Naranja pastel
            '#f6e58d', // Amarillo pastel
            '#badc58', // Verde lima
            '#7ed6df', // Turquesa
            '#54a0ff', // Azul cielo
            '#be2edd', // Violeta
            '#FFFFFF', // Blanco (generará grises claros)
            '#808080'  // Gris (generará grises oscuros y negro)
        ];
        
        const fullPalette = [];
        rainbowColors.forEach(color => {
            const [h, s, l] = hexToHsl(color);
            // Generar 2 tonos más claros y 2 más oscuros
            for (let i = -2; i <= 2; i++) {
                // Ajustar la luminosidad, asegurando que se mantenga entre 15% y 95%
                const newL = Math.max(0.15, Math.min(0.95, l + i * 0.08));
                fullPalette.push(hslToHex(h, s, newL));
            }
        });

        // 2. Duplicar la paleta (más veces) para un scroll infinito más robusto
        const extendedColors = [...fullPalette, ...fullPalette, ...fullPalette, ...fullPalette];

        // Función para mostrar/ocultar el indicador de scroll
        const updateScrollIndicator = () => {
            const { scrollTop, scrollHeight, clientHeight } = paletteScrollContainer;
            const isScrollable = scrollHeight > clientHeight;
            
            // Indicador hacia abajo: se muestra si hay scroll y no se ha llegado al final.
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // Pequeño umbral
            scrollIndicator.style.opacity = (isScrollable && !isAtBottom) ? '1' : '0';
            // Indicador hacia arriba: se muestra si hay scroll y no se está en el principio.
            scrollIndicatorUp.style.opacity = (isScrollable && scrollTop > 10) ? '1' : '0';
        };

        // 3. Lógica para el scroll circular
        paletteScrollContainer.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = paletteScrollContainer;

            // --- NUEVO: Lógica para detectar dirección y animar la flecha ---
            if (scrollTop > lastScrollTop && scrollTop > 0) {
                // Scroll hacia abajo
                scrollIndicator.classList.add('scrolling-down');
                // Quitar la clase después de la animación para poder volver a activarla
                setTimeout(() => scrollIndicator.classList.remove('scrolling-down'), 500);
            } else if (scrollTop < lastScrollTop) {
                // Scroll hacia arriba
                scrollIndicatorUp.classList.add('scrolling-up');
                // Quitar la clase después de la animación
                setTimeout(() => scrollIndicatorUp.classList.remove('scrolling-up'), 500);
            }
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // Para manejar el rebote en iOS/Mac
            // --- FIN NUEVO ---

            const scrollContentHeight = scrollHeight / 4; // Altura de un bloque de colores
            updateScrollIndicator();

            // Si el scroll se acerca al final, lo movemos al bloque anterior
            if (scrollTop + clientHeight >= scrollContentHeight * 3) {
                paletteScrollContainer.scrollTop -= scrollContentHeight;
                lastScrollTop = paletteScrollContainer.scrollTop; // Actualizar después del salto
            } // Si el scroll se acerca al principio, lo movemos al bloque siguiente
            else if (scrollTop <= scrollContentHeight) {
                paletteScrollContainer.scrollTop += scrollContentHeight;
            }
        }, { passive: true });

        extendedColors.forEach((color, index) => {
            const paletteNote = document.createElement("div");
            paletteNote.classList.add("palette-note");
            paletteNote.style.backgroundColor = color;
            paletteNote.dataset.color = color;

            // --- MEJORA DE CONTRASTE EN PALETA ---
            if (isColorDark(color)) {
                paletteNote.classList.add('dark-theme');
            }
            
            // Aumentamos el desplazamiento vertical para mayor separación
            paletteNote.style.top = `${index * 25}px`;
            // Una rotación sutil y aleatoria para un look más natural
            paletteNote.style.transform = `rotate(${(Math.random() - 0.5) * 6}deg)`;

            paletteScrollContainer.appendChild(paletteNote);
        });
        
        // 4. Posicionar el scroll en el medio para empezar
        paletteScrollContainer.scrollTop = paletteScrollContainer.scrollHeight / 4;
        // 5. Actualizar el indicador de scroll al inicio
        // Usamos un pequeño timeout para asegurar que el DOM está completamente renderizado
        setTimeout(updateScrollIndicator, 100);

        pinPaletteBtn.addEventListener('click', togglePalettePin);
        addBoardBtn.addEventListener('click', addNewBoard);
        searchInput.addEventListener('input', handleSearch);
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('contextmenu', handleContextMenu);
        // Ocultar menús si se hace clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#context-menu') && !e.target.closest('#tab-context-menu') && !e.target.closest('#color-picker-popover')) {
                hideContextMenu();
                hideTabContextMenu();
                hideColorPopover();
            }
        }, true); // Usar captura para que se ejecute antes que otros clics
        ctxDuplicateBtn.addEventListener('click', duplicateNote);
        ctxLockBtn.addEventListener('click', toggleLockNote);
        ctxDeleteBtn.addEventListener('click', deleteNoteFromContext);
        ctxTabDeleteBtn.addEventListener('click', clearTab);
        emptyTrashBtn.addEventListener('click', emptyTrash);
        document.addEventListener('wheel', handleWheelRotate, { passive: false });
        
        // Eventos de zoom
        zoomInBtn.addEventListener('click', handleZoomIn);
        zoomOutBtn.addEventListener('click', handleZoomOut);
        zoomResetBtn.addEventListener('click', handleZoomReset);

        renderBoardList();
        renderActiveBoard();
        initializeLineStyleControls();
        initializeBackgroundOptions();
        initializeColorPopover();
        initializeSidebarResizing();
        updatePaletteState();
        initializeAboutModal();
    }

    initializeApp();
});
