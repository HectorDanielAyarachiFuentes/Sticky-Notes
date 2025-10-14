document.addEventListener('DOMContentLoaded', () => {
    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
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

    let activeLines = []; // Almacena las instancias de LeaderLine activas
    let connectionState = { startNoteId: null }; // Para gestionar la creación de conexiones
    // --- FUNCIONES DE ESTADO (GUARDAR Y CARGAR) ---
    function saveState() {
        localStorage.setItem('stickyNotesApp', JSON.stringify(appState));
    }

    function loadState() {
        const savedState = localStorage.getItem('stickyNotesApp');
        if (savedState) {
            appState = JSON.parse(savedState);
        } else {
            // Estado inicial si no hay nada guardado
            const initialBoardId = `board-${Date.now()}`;
            appState = {
                boards: {
                    [initialBoardId]: {
                        id: initialBoardId,
                        name: 'Tablero Principal',
                        notes: [],
                        connections: [] // Array para las conexiones
                    }
                },
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
                connections: []
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
                rotation: note.rotation !== undefined ? note.rotation : (Math.random() - 0.5) * 4,
            }));

            appState.boards[newBoardId] = {
                id: newBoardId,
                name: boardName,
                notes: newNotes,
                connections: [] // Las plantillas aún no definen conexiones
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
        sticky.dataset.noteId = noteData.id;
        sticky.style.left = `${noteData.x}px`;
        sticky.style.top = `${noteData.y}px`;
        sticky.style.width = `${noteData.width}px`;
        sticky.style.height = `${noteData.height}px`;
        sticky.style.backgroundColor = noteData.color;
        sticky.style.transform = `rotate(${noteData.rotation}deg)`;

        const content = document.createElement("div");
        content.contentEditable = true;
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

    // --- LÓGICA DE ARRASTRAR Y SOLTAR (DRAG & DROP) CORREGIDA ---

    function handlePointerDown(e) {
        const target = e.target;
        const boardRect = board.getBoundingClientRect();

        // CASO 1: Iniciar redimensión
        if (target.classList.contains('resizer')) {
            e.preventDefault();
            isResizing = true;
            activeNote = target.closest('.stickynote');
            activeNoteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === activeNote.dataset.noteId);
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
        if (target.closest('.stickynote') && !target.classList.contains('stickynote-text') && !target.classList.contains('resizer') && !target.classList.contains('connect-btn')) {
            e.preventDefault();
            activeNote = target.closest('.stickynote');
            activeNoteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === activeNote.dataset.noteId);

            // **CORRECCIÓN:** Calcular el desfase relativo al tablero y AJUSTADO AL ZOOM
            const mouseXInBoard = (e.clientX - boardRect.left) / appState.zoomLevel;
            const mouseYInBoard = (e.clientY - boardRect.top) / appState.zoomLevel;
            offsetX = mouseXInBoard - activeNote.offsetLeft;
            offsetY = mouseYInBoard - activeNote.offsetTop;

            activeNote.classList.add('dragging');
            trashCan.classList.add('visible');
        }
    }

    function handlePointerMove(e) {
        if (!activeNote) return;
        e.preventDefault();

        const boardRect = board.getBoundingClientRect();

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
            activeNote.style.transform = `scale(1.05)`; // Se endereza al arrastrar
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
            const notes = appState.boards[appState.activeBoardId].notes;
            const connections = appState.boards[appState.activeBoardId].connections;
            const noteIndex = notes.findIndex(n => n.id === activeNoteData.id);
            
            if (noteIndex > -1) {
                notes.splice(noteIndex, 1);
            }

            // Eliminar conexiones asociadas a la nota
            appState.boards[appState.activeBoardId].connections = connections.filter(
                conn => conn.from !== activeNoteData.id && conn.to !== activeNoteData.id
            );

            activeNote.remove();
            // Re-renderizar para eliminar las líneas de la UI
            renderActiveBoard();

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
        
        // Eventos de zoom
        zoomInBtn.addEventListener('click', handleZoomIn);
        zoomOutBtn.addEventListener('click', handleZoomOut);
        zoomResetBtn.addEventListener('click', handleZoomReset);

        renderBoardList();
        renderActiveBoard();
        initializeLineStyleControls();
    }

    initializeApp();
});