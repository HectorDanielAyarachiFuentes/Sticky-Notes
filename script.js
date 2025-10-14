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
                        notes: []
                    }
                },
                activeBoardId: initialBoardId
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
        const currentBoard = appState.boards[appState.activeBoardId];
        if (!currentBoard) return;

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
                notes: []
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
                notes: newNotes
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

        const resizer = document.createElement("div");
        resizer.classList.add("resizer");

        sticky.appendChild(content);
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

        // CASO 2: Iniciar arrastre para CREAR una nota nueva
        if (target.classList.contains('palette-note')) {
            e.preventDefault();
            board.querySelector('.welcome-message')?.remove();

            const color = target.dataset.color;
            // **CORRECCIÓN:** Calcular posición inicial relativa al tablero
            const mouseXInBoard = e.clientX - boardRect.left;
            const mouseYInBoard = e.clientY - boardRect.top;

            const newNoteData = {
                id: `note-${Date.now()}`,
                content: '',
                width: 200, height: 200, color: color,
                rotation: (Math.random() - 0.5) * 8,
                x: mouseXInBoard - 100, // Centrar la nota en el cursor
                y: mouseYInBoard - 100,
            };

            appState.boards[appState.activeBoardId].notes.push(newNoteData);
            activeNote = createStickyNoteElement(newNoteData, true);
            activeNoteData = newNoteData;
            
            // **CORRECCIÓN:** El desfase ahora es desde el centro de la nota
            offsetX = 100;
            offsetY = 100;

            activeNote.classList.add('dragging');
            trashCan.classList.add('visible');
        }

        // CASO 3: Iniciar arrastre para MOVER una nota existente
        if (target.closest('.stickynote') && !target.classList.contains('stickynote-text') && !target.classList.contains('resizer')) {
            e.preventDefault();
            activeNote = target.closest('.stickynote');
            activeNoteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === activeNote.dataset.noteId);

            // **CORRECCIÓN:** Calcular el desfase relativo al tablero
            const mouseXInBoard = e.clientX - boardRect.left;
            const mouseYInBoard = e.clientY - boardRect.top;
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
            const newWidth = e.clientX - activeNote.getBoundingClientRect().left;
            const newHeight = e.clientY - activeNote.getBoundingClientRect().top;
            activeNoteData.width = Math.max(150, newWidth);
            activeNoteData.height = Math.max(150, newHeight);
            activeNote.style.width = `${activeNoteData.width}px`;
            activeNote.style.height = `${activeNoteData.height}px`;
        } else {
            // Lógica de arrastre
            // **CORRECCIÓN:** Calcular la nueva posición relativa al tablero
            const mouseXInBoard = e.clientX - boardRect.left;
            const mouseYInBoard = e.clientY - boardRect.top;
            const newX = mouseXInBoard - offsetX;
            const newY = mouseYInBoard - offsetY;

            activeNoteData.x = newX;
            activeNoteData.y = newY;
            activeNote.style.left = `${newX}px`;
            activeNote.style.top = `${newY}px`;
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
            const noteIndex = notes.findIndex(n => n.id === activeNoteData.id);
            if (noteIndex > -1) {
                notes.splice(noteIndex, 1);
            }
            activeNote.remove();
        } else {
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

    // --- INICIALIZACIÓN DE LA APP ---
    function initializeApp() {
        loadState();

        // Lógica para los botones de ocultar/mostrar panel
        const collapseBtn = document.querySelector("#sidebar-collapse-btn");
        const expander = document.querySelector("#sidebar-expander");
        collapseBtn.addEventListener('click', () => boardManager.classList.add('collapsed'));
        expander.addEventListener('click', () => boardManager.classList.remove('collapsed'));

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

        renderBoardList();
        renderActiveBoard();
    }

    initializeApp();
});