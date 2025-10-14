document.addEventListener('DOMContentLoaded', () => {
    const board = document.querySelector("#board");
    const palette = document.querySelector("#note-palette");
    const boardManager = document.querySelector("#board-manager");
    const boardList = document.querySelector("#board-list");
    const addBoardBtn = document.querySelector("#add-board-btn");
    const trashCan = document.querySelector("#trash-can");
    const noteColors = ['#ffc', '#cfc', '#ccf', '#fcc', '#cff'];

    // --- GESTIÓN DE ESTADO ---
    let appState = {
        boards: {},
        activeBoardId: null
    };

    let activeNote = null;
    let activeNoteData = null; // Referencia al objeto de la nota en el estado
    let offsetX = 0;
    let offsetY = 0;
    let isResizing = false;

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

    // --- RENDERIZADO DE LA UI ---
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
        board.innerHTML = ''; // Limpiar el tablero
        const activeBoard = appState.boards[appState.activeBoardId];
        if (activeBoard && activeBoard.notes) {
            activeBoard.notes.forEach(noteData => {
                createStickyNoteElement(noteData);
            });
        }
    }

    function switchBoard(boardId) {
        if (boardId === appState.activeBoardId) return;
        appState.activeBoardId = boardId;
        saveState();
        renderBoardList();
        renderActiveBoard();
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
            switchBoard(newBoardId); // Cambia al nuevo tablero
        }
    }

    function initializeApp() {
        loadState();
        renderBoardList();
        renderActiveBoard();
    }

    // --- INICIALIZACIÓN ---
    initializeApp();

    // --- 1. Crear las plantillas de notas en el cajón ---
    noteColors.forEach(color => {
        const paletteNote = document.createElement("div");
        paletteNote.classList.add("palette-note");
        paletteNote.style.backgroundColor = color;
        paletteNote.dataset.color = color; // Guardamos el color para usarlo después
        palette.appendChild(paletteNote);
    });

    addBoardBtn.addEventListener('click', addNewBoard);

    // --- Función para convertir URLs en enlaces ---
    function autoLink(element) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        // Usamos un TreeWalker para procesar solo los nodos de texto
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
            if (node.parentElement.tagName === 'A') continue; // Ya es un enlace

            const text = node.textContent;
            if (urlRegex.test(text)) {
                const fragment = document.createDocumentFragment();
                fragment.innerHTML = text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
                node.replaceWith(...fragment.childNodes);
            }
        }
    }
    // --- 2. Función para crear una nueva nota adhesiva en el tablero ---
    function createStickyNoteElement(noteData) {
        const sticky = document.createElement("div");
        sticky.classList.add("stickynote");
        sticky.dataset.noteId = noteData.id; // Vincular DOM con el estado
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

        // Lógica para auto-enlazar URLs al escribir o pegar
        content.addEventListener('input', () => {
            autoLink(content);
            noteData.content = content.innerHTML;
            saveState();
        });

        const resizer = document.createElement("div");
        resizer.classList.add("resizer");

        sticky.appendChild(content);
        sticky.appendChild(resizer);
        board.appendChild(sticky);

        return sticky;
    }

    // --- 3. Lógica para arrastrar y soltar ---
    document.addEventListener('pointerdown', (e) => {
        const target = e.target;

        // CASO 0: Iniciar redimensión de una nota
        if (target.classList.contains('resizer')) {
            isResizing = true;
            activeNote = target.closest('.stickynote');
            activeNoteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === activeNote.dataset.noteId);
            activeNote.classList.add('dragging'); // Reutilizamos el estilo para z-index
            return; // No hacer nada más
        }
        // CASO A: Iniciar arrastre desde el cajón para CREAR una nota
        if (target.classList.contains('palette-note') && !target.closest('.stickynote')) {
            // La condición !target.closest('.stickynote') evita que se cree una nota
            // si por accidente el cajón está sobre una nota existente.

            const color = target.dataset.color;
            const newNoteData = {
                id: `note-${Date.now()}`,
                content: '',
                x: e.clientX,
                y: e.clientY,
                width: 200,
                height: 200,
                color: color,
                rotation: (Math.random() - 0.5) * 10
            };

            appState.boards[appState.activeBoardId].notes.push(newNoteData);
            saveState();

            activeNote = createStickyNoteElement(newNoteData);
            activeNoteData = newNoteData;
            activeNote.classList.add('dragging');

            // Centramos la nota nueva en el cursor
            offsetX = activeNote.offsetWidth / 2;
            offsetY = activeNote.offsetHeight / 2;

            // Movemos la nota a la posición inicial correcta
            activeNote.style.left = `${e.clientX - offsetX}px`;
            activeNote.style.top = `${e.clientY - offsetY}px`;

        // CASO B: Iniciar arrastre de una nota existente en el tablero para MOVERLA
        } else if (target.classList.contains('stickynote') && !target.classList.contains('stickynote-text')) {
            // Solo se puede mover si se hace clic en la nota, no en el área de texto.

            activeNote = target.closest('.stickynote');
            activeNoteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === activeNote.dataset.noteId);
            activeNote.classList.add('dragging');

            // Calcula el desfase entre el clic y la esquina superior izquierda de la nota
            offsetX = e.clientX - activeNote.getBoundingClientRect().left;
            offsetY = e.clientY - activeNote.getBoundingClientRect().top;
        }
    });

    document.addEventListener('pointermove', (e) => {
        if (!activeNote) return;

        if (isResizing) {
            // Lógica de redimensionamiento
            const noteRect = activeNote.getBoundingClientRect();
            const newWidth = e.clientX - noteRect.left;
            const newHeight = e.clientY - noteRect.top;
            const finalWidth = Math.max(150, newWidth);
            const finalHeight = Math.max(150, newHeight);

            activeNote.style.width = `${finalWidth}px`;
            activeNote.style.height = `${finalHeight}px`;

            activeNoteData.width = finalWidth;
            activeNoteData.height = finalHeight;

        } else { // Lógica de arrastre
            // Mover la nota
            activeNoteData.x = e.clientX - offsetX;
            activeNoteData.y = e.clientY - offsetY;
            activeNote.style.left = `${activeNoteData.x}px`;
            activeNote.style.top = `${activeNoteData.y}px`;
            
            // Comprobar si la nota está sobre la papelera
            const trashRect = trashCan.getBoundingClientRect();
            if (
                e.clientX > trashRect.left &&
                e.clientX < trashRect.right &&
                e.clientY > trashRect.top &&
                e.clientY < trashRect.bottom
            ) {
                trashCan.classList.add('active');
            } else {
                trashCan.classList.remove('active');
            }
        }
    });

    document.addEventListener('pointerup', (e) => {
        if (activeNote) { // Si hay una nota activa (moviendo o redimensionando)
            // Si la nota se suelta sobre la papelera activa, se elimina
            if (trashCan.classList.contains('active')) {
                const notes = appState.boards[appState.activeBoardId].notes;
                const noteIndex = notes.findIndex(n => n.id === activeNote.dataset.noteId);
                if (noteIndex > -1) {
                    notes.splice(noteIndex, 1);
                }
                activeNote.remove();
            }
            activeNote.classList.remove('dragging');
            saveState(); // Guardar el estado final (posición, tamaño o eliminación)
            isResizing = false;
            activeNote = null;
            activeNoteData = null;
            trashCan.classList.remove('active');
        }
    });
});
