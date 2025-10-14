document.addEventListener('DOMContentLoaded', () => {
    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const boardContainer = document.querySelector("#board-container");
    const board = document.querySelector("#board");
    const palette = document.querySelector("#note-palette");
    const boardList = document.querySelector("#board-list");
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
    // Papelera
    const trashListContainer = document.querySelector("#trash-list-container");
    const emptyTrashBtn = document.querySelector("#empty-trash-btn");
    const toastContainer = document.querySelector("#toast-container");

    // --- CONFIGURACIÓN INICIAL ---
    const noteColors = ['#FFF9C4', '#C8E6C9', '#BBDEFB', '#FFCDD2', '#B2EBF2'];
    const boardTemplates = {
        kanban: {
            name: 'Tablero Kanban',
            notes: [
                { content: '<h3>Por Hacer</h3>', x: 50, y: 20, width: 300, height: 600, color: '#E9EBEE', rotation: 0 },
                { content: '<h3>En Proceso</h3>', x: 400, y: 20, width: 300, height: 600, color: '#E9EBEE', rotation: 0 },
                { content: '<h3>Hecho</h3>', x: 750, y: 20, width: 300, height: 600, color: '#E9EBEE', rotation: 0 },
            ]
        },
        swot: {
            name: 'Análisis FODA',
            notes: [
                { content: '<h3>Fortalezas</h3>', x: 50, y: 50, width: 350, height: 250, color: '#C8E6C9', rotation: -1 },
                { content: '<h3>Oportunidades</h3>', x: 450, y: 50, width: 350, height: 250, color: '#BBDEFB', rotation: 1 },
                { content: '<h3>Debilidades</h3>', x: 50, y: 350, width: 350, height: 250, color: '#FFCDD2', rotation: 1 },
                { content: '<h3>Amenazas</h3>', x: 450, y: 350, width: 350, height: 250, color: '#FFF9C4', rotation: -1.5 },
            ]
        },
        // El mapa mental es más complejo por los conectores, se deja como base.
        mindmap: {
            name: 'Mapa Mental',
            notes: [
                { content: '<h2>Idea Central</h2>', x: 400, y: 300, width: 250, height: 150, color: '#B2EBF2', rotation: 0 },
            ]
        },
        eisenhower: {
            name: 'Matriz de Eisenhower',
            notes: [
                { content: '<h3>Urgente / Importante</h3><p>(Hacer)</p>', x: 50, y: 50, width: 400, height: 300, color: '#FFCDD2', rotation: 0.5 },
                { content: '<h3>No Urgente / Importante</h3><p>(Planificar)</p>', x: 500, y: 50, width: 400, height: 300, color: '#BBDEFB', rotation: -0.5 },
                { content: '<h3>Urgente / No Importante</h3><p>(Delegar)</p>', x: 50, y: 400, width: 400, height: 300, color: '#FFF9C4', rotation: -0.5 },
                { content: '<h3>No Urgente / No Importante</h3><p>(Eliminar)</p>', x: 500, y: 400, width: 400, height: 300, color: '#C8E6C9', rotation: 0.5 },
            ]
        },
        retro: {
            name: 'Retrospectiva',
            notes: [
                { content: '<h3>¿Qué salió bien? 👍</h3>', x: 50, y: 20, width: 300, height: 600, color: '#C8E6C9', rotation: 0 },
                { content: '<h3>¿Qué se puede mejorar? 🤔</h3>', x: 400, y: 20, width: 300, height: 600, color: '#BBDEFB', rotation: 0 },
                { content: '<h3>Acciones a tomar 🎯</h3>', x: 750, y: 20, width: 300, height: 600, color: '#FFF9C4', rotation: 0 },
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
                        notes: [],
                        connections: [], // Array para las conexiones
                        background: null,
                        // A dónde se aplica el fondo
                        backgroundApplyTo: { board: true, notes: false }
                    }
                },
                trash: [], // Papelera de reciclaje
                zoomLevel: 1.0,
                activeBoardId: initialBoardId,
                lineOptions: { // Opciones por defecto para las líneas
                    color: 'rgba(75, 75, 75, 0.8)',
                    size: 4,
                    path: 'fluid',
                    endPlug: 'arrow1'
                }
            };
        }
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
                const lineOptions = { ...appState.lineOptions }; // Copia de las opciones
                const line = new LeaderLine(startEl, endEl, {
                    ...lineOptions,
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
                tempDiv.innerHTML = note.content;
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

        // Aplicar fondo de tablero a la nota si está activado
        const currentBoard = appState.boards[appState.activeBoardId];
        if (currentBoard.backgroundApplyTo.notes && currentBoard.background) {
            sticky.style.backgroundImage = currentBoard.background;
        }


        const content = document.createElement("div");
        content.contentEditable = true;
        if (noteData.locked) content.contentEditable = false;
        content.classList.add("stickynote-text");
        content.setAttribute("placeholder", "Escribe algo...");
        content.innerHTML = noteData.content;

        content.addEventListener('blur', () => {
            const newContent = content.innerHTML;
            if (noteData.content !== newContent) {
                noteData.content = newContent;
                saveState();
                handleSearch(); // Re-evaluar la búsqueda si el contenido cambia
            }
        });

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
        sticky.appendChild(content);
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
                content: '',
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
            if (!target.classList.contains('stickynote-text')) e.preventDefault();

            // **CORRECCIÓN:** Calcular el desfase relativo al tablero y AJUSTADO AL ZOOM
            const mouseXInBoard = (e.clientX - boardRect.left) / appState.zoomLevel;
            const mouseYInBoard = (e.clientY - boardRect.top) / appState.zoomLevel;
            offsetX = mouseXInBoard - activeNote.offsetLeft;
            offsetY = mouseYInBoard - activeNote.offsetTop;

            bringToFront(activeNote, activeNoteData);
            if (!target.classList.contains('stickynote-text')) {
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
        const noteElement = e.target.closest('.stickynote');
        if (noteElement) {
            e.preventDefault();
            contextMenuNoteId = noteElement.dataset.noteId;
            
            const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === contextMenuNoteId);
            ctxLockBtn.textContent = noteData.locked ? 'Desbloquear Nota' : 'Bloquear Nota';

            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.classList.remove('hidden');
        } else {
            hideContextMenu();
        }
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
            ...originalNoteData, // Copia todas las propiedades
            id: `note-${Date.now()}`,
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
        noteElement.querySelector('.stickynote-text').contentEditable = !noteData.locked;

        saveState();
        hideContextMenu();
    }

    function deleteNoteFromContext() {
        if (!contextMenuNoteId) return;
        moveNoteToTrash(contextMenuNoteId);
    }

    function handleTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;

                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(`tab-content-${tabId}`).classList.add('active');

                if (tabId === 'trash') {
                    renderTrash();
                }
            });
        });
    }

    function initializeLineStyleControls() {
        const { color, path, size, endPlug } = appState.lineOptions;
        lineColorInput.value = color;
        linePathSelect.value = path;
        lineSizeInput.value = size;
        linePlugSelect.value = endPlug;

        const updateLineStyle = () => {
            appState.lineOptions.color = lineColorInput.value;
            appState.lineOptions.path = linePathSelect.value;
            appState.lineOptions.size = parseInt(lineSizeInput.value, 10);
            appState.lineOptions.endPlug = linePlugSelect.value;
            saveState();
            renderActiveBoard(); // Re-renderizar para aplicar cambios
        };

        [lineColorInput, linePathSelect, lineSizeInput, linePlugSelect].forEach(el => 
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

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = note.content;
            const noteText = (tempDiv.textContent || tempDiv.innerText || "").trim();

            item.innerHTML = `
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

    // --- INICIALIZACIÓN DE LA APP ---
    function initializeApp() {
        loadState();

        // Lógica para los botones de ocultar/mostrar panel
        const collapseBtn = document.querySelector("#sidebar-collapse-btn");
        const expander = document.querySelector("#sidebar-expander");

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
            boardManager.classList.add('collapsed');
            smoothLineUpdateOnToggle();
        });
        expander.addEventListener('click', () => {
            boardManager.classList.remove('collapsed');
            smoothLineUpdateOnToggle();
        });

        // Configurar UI
        addBoardBtn.innerHTML = '<span class="icon">🎪</span> Nuevo Tablero';
        handleTabSwitching();

        // Crear botones de plantillas dinámicamente
        const templateTitle = document.createElement('p');
        templateTitle.textContent = 'O crea desde una plantilla:';
        templateContainer.appendChild(templateTitle);
        Object.keys(boardTemplates).forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'template-btn';
            btn.dataset.template = key;
            btn.textContent = boardTemplates[key].name;
            btn.addEventListener('click', () => createBoardFromTemplate(key));
            templateContainer.appendChild(btn);
        });

        noteColors.forEach(color => {
            const paletteNote = document.createElement("div");
            paletteNote.classList.add("palette-note");
            paletteNote.style.backgroundColor = color;
            paletteNote.dataset.color = color;
            palette.appendChild(paletteNote);
        });

        addBoardBtn.addEventListener('click', addNewBoard);
        searchInput.addEventListener('input', handleSearch);
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#context-menu')) hideContextMenu();
        });
        ctxDuplicateBtn.addEventListener('click', duplicateNote);
        ctxLockBtn.addEventListener('click', toggleLockNote);
        ctxDeleteBtn.addEventListener('click', deleteNoteFromContext);
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
    }

    initializeApp();
});