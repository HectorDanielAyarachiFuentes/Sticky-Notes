document.addEventListener('DOMContentLoaded', async () => {
    // --- IMPORTACIÓN DE MÓDULOS ---
    const { initializePanning } = await import('./moverfondo.js');
    const { initializeShareAndImport } = await import('./gestor/exportar.js');
    const { initializeAboutModalFeature } = await import('./sobremi.js');
    const {
        initializeLineManager,
        renderConnections,
        removeActiveLines,
        updateAllLinesPosition,
        handleConnectionClick,
        removeLinesForNote
    } = await import('./gestor/lineas.js');
    const {
        initializeTrashManager,
        moveNoteToTrash,
        renderTrash,
        emptyTrash
    } = await import('./gestor/papelera.js');
    const { initializeNoteInteractions } = await import('./gestor/interaccionesNotas.js');
    // ¡NUEVO! Importamos el módulo de creación
    const { initializeBackgroundManager, updateBackgroundUI } = await import('./gestor/fondo.js');
    const { initializeCreateTab } = await import('./gestor/crear.js');
    const { initializeCursorManager } = await import('./gestor/cursor.js');

    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const boardContainer = document.querySelector("#board-container");
    const board = document.querySelector("#board");
    const palette = document.querySelector("#note-palette");
    const boardList = document.querySelector("#board-list");
    const pinPaletteBtn = document.querySelector("#pin-palette-btn");
    const addBoardBtn = document.querySelector("#add-board-btn"); // Aún lo necesita crear.js
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
    const lineOpacityInput = document.querySelector("#line-opacity-input");
    const lineOpacityValue = document.querySelector("#line-opacity-value");
    const lineSizeInput = document.querySelector("#line-size-input");
    const lineSizeValue = document.querySelector("#line-size-value");
    const templateContainer = document.querySelector("#template-container"); // Aún lo necesita crear.js
    // Pestaña de fondos
    const backgroundOptionsContainer = document.getElementById("background-options-container");
    const resetBackgroundBtn = document.getElementById("reset-background-btn");
    const bgApplyToBoardCard = document.getElementById("bg-apply-board");
    const bgApplyToNotesCard = document.getElementById("bg-apply-notes");
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
    const trashNotesContainer = document.querySelector("#trash-notes-container");
    const trashBoardsContainer = document.querySelector("#trash-boards-container");
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
    const cursorColorInput = document.querySelector("#cursor-color-input");
    const resetCursorBtn = document.querySelector("#reset-cursor-btn");

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
            h = s = 0;
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
            r = g = b = l;
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
        if (!hexColor || hexColor.length < 7) return false;
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const luminance = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return luminance < 128;
    }

    // --- CONFIGURACIÓN INICIAL ---
    let popoverOriginalColor = null;

    // --- GESTIÓN DE ESTADO DE LA APLICACIÓN ---
    let appState = {};
    let contextMenuNoteId = null;
    let contextMenuTabInfo = null;
    let popoverNoteId = null;
    let maxZIndex = 0;

    // --- FUNCIONES DE ESTADO (GUARDAR Y CARGAR) ---
    function saveState() {
        localStorage.setItem('stickyNotesApp', JSON.stringify(appState));
    }

    function loadState() {
        const savedState = localStorage.getItem('stickyNotesApp');
        if (savedState) {
            const loadedState = JSON.parse(savedState);
            Object.values(loadedState.boards).forEach(board => {
                if (!board.backgroundApplyTo) board.backgroundApplyTo = { board: true, notes: false };
                board.notes.forEach(note => {
                    if (note.locked === undefined) note.locked = false;
                    if (note.tabs === undefined) {
                        const oldTabsContent = note.content ? [note.content, '', '', '', ''] : (note.tabs || ['', '', '', '', '']);
                        note.tabs = oldTabsContent.map((content, index) => ({
                            title: index === 0 ? (note.title || '') : '',
                            content: content || ''
                        }));
                        note.activeTab = 0;
                        delete note.content;
                        delete note.title;
                    }
                });
                if (!loadedState.trash) loadedState.trash = [];
                if (!loadedState.boardsTrash) loadedState.boardsTrash = [];
                board.notes.forEach(note => {
                    if (note.zIndex === undefined) {
                        note.zIndex = ++maxZIndex;
                    } else if (note.zIndex > maxZIndex) {
                        maxZIndex = note.zIndex;
                    }
                });
                if (board.lineOptions && board.lineOptions.sidebarWidth) {
                    loadedState.sidebarWidth = board.lineOptions.sidebarWidth;
                    delete board.lineOptions.sidebarWidth;
                }
            });
            if (loadedState.isSidebarCollapsed === undefined) {
                loadedState.isSidebarCollapsed = false;
                loadedState.isPalettePinned = true;
            }
            appState = loadedState;
        } else {
            const initialBoardId = `board-${Date.now()}`;
            appState = {
                boards: {
                    [initialBoardId]: {
                        id: initialBoardId, name: 'Tablero Principal', notes: [], connections: [],
                        background: null, backgroundApplyTo: { board: true, notes: false }
                    }
                },
                boardsTrash: [], trash: [], zoomLevel: 1.0, isPalettePinned: true,
                isSidebarCollapsed: false, activeBoardId: initialBoardId, sidebarWidth: 260,
                lineOptions: { color: '#4B4B4B', opacity: 0.8, size: 4, path: 'fluid', endPlug: 'arrow1' }
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
        pinPaletteBtn.title = appState.isPalettePinned ? 'Desfijar paleta' : 'Fijar paleta';
    }

    // --- CONSTANTES GLOBALES ---
    const DEFAULT_BOARD_BACKGROUND = `repeating-linear-gradient(90deg, hsla(280,0%,67%,0.06) 0px, hsla(280,0%,67%,0.06) 1px,transparent 1px, transparent 96px),repeating-linear-gradient(0deg, hsla(280,0%,67%,0.06) 0px, hsla(280,0%,67%,0.06) 1px,transparent 1px, transparent 96px),repeating-linear-gradient(0deg, hsla(280,0%,67%,0.09) 0px, hsla(280,0%,67%,0.09) 1px,transparent 1px, transparent 12px),repeating-linear-gradient(90deg, hsla(280,0%,67%,0.09) 0px, hsla(280,0%,67%,0.09) 1px,transparent 1px, transparent 12px),linear-gradient(90deg, hsl(226,47%,26%),hsl(226,47%,26%))`;

    // --- FUNCIONES DE RENDERIZADO DE LA UI ---
    function renderBoardList() {
        boardList.innerHTML = '';
        Object.values(appState.boards).forEach(boardData => {
            const li = document.createElement('li');
            li.dataset.boardId = boardData.id;
            li.className = boardData.id === appState.activeBoardId ? 'active' : '';
            const mainInfo = document.createElement('div');
            mainInfo.className = 'board-item-main';
            mainInfo.addEventListener('click', () => switchBoard(boardData.id));
            const nameSpan = document.createElement('div');
            nameSpan.className = 'board-name-text';
            nameSpan.textContent = boardData.name;
            const dateSpan = document.createElement('div');
            dateSpan.className = 'board-creation-date';
            if (boardData.createdAt) {
                const date = new Date(boardData.createdAt);
                dateSpan.textContent = date.toLocaleString(undefined, {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
                dateSpan.title = `Creado el ${date.toLocaleDateString()} a las ${date.toLocaleTimeString()}`;
            }
            mainInfo.appendChild(nameSpan);
            mainInfo.appendChild(dateSpan);
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'board-item-buttons';
            buttonsContainer.innerHTML = `<button class="board-item-btn" title="Editar nombre">✏️</button><button class="board-item-btn" title="Eliminar tablero">🗑️</button>`;
            buttonsContainer.querySelector('[title="Editar nombre"]').addEventListener('click', (e) => {
                e.stopPropagation(); editBoardName(boardData.id);
            });
            buttonsContainer.querySelector('[title="Eliminar tablero"]').addEventListener('click', (e) => {
                e.stopPropagation(); deleteBoard(boardData.id);
            });
            li.appendChild(mainInfo);
            li.appendChild(buttonsContainer);
            boardList.appendChild(li);
        });
    }

    function renderActiveBoard(shouldSave = false) {
        if (shouldSave) saveState();
        board.innerHTML = '';
        removeActiveLines();
        const currentBoard = appState.boards[appState.activeBoardId];
        if (!currentBoard) return;
        boardContainer.style.background = currentBoard.backgroundApplyTo.board ? (currentBoard.background || DEFAULT_BOARD_BACKGROUND) : DEFAULT_BOARD_BACKGROUND;
        updateBackgroundUI(currentBoard);
        updateZoom();
        if (currentBoard.notes.length === 0) {
            const welcomeMsg = document.createElement('div');
            welcomeMsg.classList.add('welcome-message');
            welcomeMsg.innerHTML = '¡Bienvenido! <br>Arrastra una nota o haz doble clic para comenzar.';
            board.appendChild(welcomeMsg);
        } else {
            currentBoard.notes.forEach(noteData => createStickyNoteElement(noteData));
        }
        renderConnections();
    }

    function updateBoardSize() {
        const currentBoardData = appState.boards[appState.activeBoardId];
        const PADDING = 1000;
        if (!currentBoardData || !currentBoardData.notes.length) {
            board.style.width = `calc(100% + ${PADDING}px)`;
            board.style.height = `calc(100% + ${PADDING}px)`;
            return;
        }
        let maxX = 0, maxY = 0;
        currentBoardData.notes.forEach(note => {
            maxX = Math.max(maxX, note.x + note.width);
            maxY = Math.max(maxY, note.y + note.height);
        });
        board.style.width = `${Math.max(boardContainer.clientWidth + PADDING, maxX + PADDING)}px`;
        board.style.height = `${Math.max(boardContainer.clientHeight + PADDING, maxY + PADDING)}px`;
    }

    // --- FUNCIONES DE ZOOM ---
    function updateZoom(newZoomLevel) {
        if (newZoomLevel !== undefined) {
            appState.zoomLevel = Math.max(0.2, Math.min(2, newZoomLevel));
        }
        board.style.transform = `scale(${appState.zoomLevel})`;
        zoomLevelDisplay.textContent = `${Math.round(appState.zoomLevel * 100)}%`;
        updateAllLinesPosition();
        saveState();
    }

    // --- FUNCIONES DE LÓGICA DE LA APP ---
    function switchBoard(boardId, noteToHighlightId = null) {
        if (boardId === appState.activeBoardId) return;
        appState.activeBoardId = boardId;
        saveState();
        renderBoardList();
        renderActiveBoard();
        updateBoardSize();
        searchInput.value = '';
        globalSearchResults.innerHTML = '';
        board.classList.remove('searching');
        if (noteToHighlightId) {
            setTimeout(() => {
                const noteEl = board.querySelector(`.stickynote[data-note-id="${noteToHighlightId}"]`);
                if (noteEl) {
                    noteEl.classList.add('highlight');
                    noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => noteEl.classList.remove('highlight'), 2500);
                }
            }, 100);
        }
    }

    function createDefaultBoard() {
        const newBoardId = `board-${Date.now()}`;
        appState.boards[newBoardId] = {
            id: newBoardId, name: "Tablero de Respaldo", notes: [], createdAt: Date.now(),
            connections: [], background: null, backgroundApplyTo: { board: true, notes: false }
        };
        return newBoardId;
    }

    function editBoardName(boardId) {
        const boardData = appState.boards[boardId];
        if (!boardData) return;
        const newName = prompt("Nuevo nombre para el tablero:", boardData.name);
        if (newName && newName.trim() !== '') {
            boardData.name = newName.trim();
            saveState();
            renderBoardList();
            showToast(`Tablero renombrado a "${boardData.name}".`);
        }
    }

    function deleteBoard(boardId) {
        const boardToDelete = appState.boards[boardId];
        const isLastBoard = Object.keys(appState.boards).length <= 1;
        const confirmMessage = isLastBoard
            ? `¿Estás seguro de que quieres eliminar el último tablero "${boardToDelete.name}"?`
            : `¿Estás seguro de que quieres mover el tablero "${boardToDelete.name}" a la papelera?`;
        if (confirm(confirmMessage)) {
            appState.boardsTrash.push(boardToDelete);
            delete appState.boards[boardId];
            if (appState.activeBoardId === boardId) {
                const firstBoardId = Object.keys(appState.boards)[0] || null;
                if (firstBoardId) {
                    switchBoard(firstBoardId);
                } else {
                    appState.activeBoardId = null;
                    saveState();
                    renderActiveBoard();
                }
            }
            saveState();
            renderBoardList();
            showToast(`Tablero "${boardToDelete.name}" movido a la papelera.`);
        }
    }

    // ¡ELIMINADAS! Las funciones addNewBoard y createBoardFromTemplate se movieron a crear.js

    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        globalSearchResults.innerHTML = '';
        if (searchTerm === '') {
            board.classList.remove('searching');
            board.querySelectorAll('.stickynote.highlight').forEach(n => n.classList.remove('highlight'));
            return;
        }
        board.classList.add('searching');
        Object.values(appState.boards).forEach(currentBoard => {
            currentBoard.notes.forEach(note => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = note.tabs.map(tab => `${tab.title} ${tab.content}`).join(' ');
                const noteText = tempDiv.textContent || tempDiv.innerText || "";
                const isMatch = noteText.toLowerCase().includes(searchTerm);
                if (currentBoard.id === appState.activeBoardId) {
                    board.querySelector(`.stickynote[data-note-id="${note.id}"]`)?.classList.toggle('highlight', isMatch);
                } else if (isMatch) {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'search-result-item';
                    resultItem.innerHTML = `<span class="board-name">${currentBoard.name}</span><span class="note-snippet">${noteText.substring(0, 100)}</span>`;
                    resultItem.addEventListener('click', () => switchBoard(currentBoard.id, note.id));
                    globalSearchResults.appendChild(resultItem);
                }
            });
        });
    }

    function createStickyNoteElement(noteData, isNew = false) {
        const sticky = document.createElement("div");
        sticky.className = `stickynote ${noteData.locked ? 'locked' : ''} ${isColorDark(noteData.color) ? 'dark-theme' : ''}`;
        sticky.dataset.noteId = noteData.id;
        sticky.style.cssText = `left:${noteData.x}px; top:${noteData.y}px; width:${noteData.width}px; height:${noteData.height}px; background-color:${noteData.color}; transform:rotate(${noteData.rotation}deg); z-index:${noteData.zIndex};`;
        const currentBoard = appState.boards[appState.activeBoardId];
        if (currentBoard.backgroundApplyTo.notes && currentBoard.background) {
            sticky.style.backgroundImage = currentBoard.background;
        }
        const title = document.createElement("div");
        title.contentEditable = !noteData.locked;
        title.className = "stickynote-title";
        title.setAttribute("placeholder", "Título...");
        title.innerHTML = noteData.tabs[noteData.activeTab].title || '';
        title.addEventListener('blur', () => {
            const newTitle = title.innerHTML;
            if (noteData.tabs[noteData.activeTab].title !== newTitle) {
                noteData.tabs[noteData.activeTab].title = newTitle;
                saveState();
                const tabPart = sticky.querySelector(`.stickynote-tab[data-tab-index="${noteData.activeTab}"] .stickynote-tab-part[data-part="title"]`);
                tabPart.classList.toggle('filled', !!newTitle.trim());
                tabPart.classList.toggle('empty', !newTitle.trim());
                handleSearch();
            }
        });
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'stickynote-content-wrapper';
        const tabContainer = document.createElement('div');
        tabContainer.className = 'stickynote-tabs';
        const contentContainer = document.createElement('div');
        contentContainer.className = 'stickynote-content-container';
        for (let i = 0; i < 5; i++) {
            const tab = document.createElement('div');
            tab.className = `stickynote-tab ${i === noteData.activeTab ? 'active' : ''}`;
            tab.dataset.tabIndex = i;
            tab.innerHTML = `<span class="stickynote-tab-part ${noteData.tabs[i]?.title?.trim() ? 'filled' : 'empty'}" data-part="title">Título</span><span class="stickynote-tab-part ${noteData.tabs[i]?.content?.trim() ? 'filled' : 'empty'}" data-part="content">Cuerpo</span>`;
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                noteData.activeTab = i;
                saveState();
                sticky.querySelector('.stickynote-tab.active')?.classList.remove('active');
                tab.classList.add('active');
                sticky.querySelector('.stickynote-text.active')?.classList.remove('active');
                sticky.querySelector(`.stickynote-text[data-tab-index="${i}"]`).classList.add('active');
                title.innerHTML = noteData.tabs[i].title || '';
            });
            tab.addEventListener('contextmenu', (e) => {
                e.preventDefault(); e.stopPropagation();
                contextMenuTabInfo = { noteId: noteData.id, tabIndex: i };
                showTabContextMenu(e.clientX, e.clientY);
            });
            tabContainer.appendChild(tab);
            const content = document.createElement("div");
            content.contentEditable = !noteData.locked;
            content.className = `stickynote-text ${i === noteData.activeTab ? 'active' : ''}`;
            content.dataset.tabIndex = i;
            content.setAttribute("placeholder", "Escribe algo...");
            content.innerHTML = noteData.tabs[i].content || '';
            content.addEventListener('blur', () => {
                const newContent = content.innerHTML;
                if (noteData.tabs[i].content !== newContent) {
                    noteData.tabs[i].content = newContent;
                    saveState();
                    const tabPart = tab.querySelector('.stickynote-tab-part[data-part="content"]');
                    tabPart.classList.toggle('filled', !!newContent.trim());
                    tabPart.classList.toggle('empty', !newContent.trim());
                    handleSearch();
                }
            });
            contentContainer.appendChild(content);
        }
        const connectBtn = document.createElement("div");
        connectBtn.className = 'connect-btn';
        connectBtn.innerHTML = '☍';
        connectBtn.title = 'Crear conexión';
        connectBtn.addEventListener('click', (e) => {
            e.stopPropagation(); handleConnectionClick(noteData.id);
        });
        const resizer = document.createElement("div");
        resizer.className = "resizer";
        sticky.appendChild(title);
        contentWrapper.appendChild(contentContainer);
        contentWrapper.appendChild(tabContainer);
        sticky.appendChild(contentWrapper);
        sticky.appendChild(connectBtn);
        sticky.appendChild(resizer);
        board.appendChild(sticky);
        if (isNew) {
            sticky.classList.add('new-note-animation');
            sticky.addEventListener('animationend', () => sticky.classList.remove('new-note-animation'), { once: true });
        }
        return sticky;
    }

    function bringToFront(noteElement, noteData) {
        if (noteData.zIndex >= maxZIndex) return;
        noteData.zIndex = ++maxZIndex;
        noteElement.style.zIndex = noteData.zIndex;
        saveState();
    }

    // --- LÓGICA DEL MENÚ CONTEXTUAL ---
    function handleContextMenu(e) {
        if (e.target.closest('.stickynote-tab')) {
            e.preventDefault(); return;
        }
        const noteElement = e.target.closest('.stickynote');
        if (noteElement) {
            e.preventDefault();
            hideTabContextMenu();
            contextMenuNoteId = noteElement.dataset.noteId;
            const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === contextMenuNoteId);
            ctxLockBtn.textContent = noteData.locked ? 'Desbloquear Nota' : 'Bloquear Nota';
            contextMenu.style.top = `${e.clientY}px`;
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.classList.remove('hidden');
        } else {
            hideContextMenu();
            hideTabContextMenu();
        }
    }

    function showTabContextMenu(x, y) {
        hideContextMenu();
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
        hideTabContextMenu();
        const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === noteId);
        const noteElement = board.querySelector(`.stickynote[data-note-id="${noteId}"]`);
        if (!noteData || !noteElement || !confirm('¿Limpiar el contenido de esta pestaña?')) return;
        const contentElement = noteElement.querySelector(`.stickynote-text[data-tab-index="${tabIndex}"]`);
        contentElement.classList.add('clearing-out');
        contentElement.addEventListener('animationend', () => {
            noteData.tabs[tabIndex] = { title: '', content: '' };
            saveState();
            contentElement.innerHTML = '';
            if (noteData.activeTab === tabIndex) noteElement.querySelector('.stickynote-title').innerHTML = '';
            const tabEl = noteElement.querySelector(`.stickynote-tab[data-tab-index="${tabIndex}"]`);
            tabEl.querySelectorAll('.stickynote-tab-part').forEach(part => {
                part.className = `stickynote-tab-part empty`;
            });
            contentElement.classList.remove('clearing-out');
        }, { once: true });
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
            ...JSON.parse(JSON.stringify(originalNoteData)),
            id: `note-${Date.now()}`,
            x: originalNoteData.x + 20,
            y: originalNoteData.y + 20,
            zIndex: ++maxZIndex,
            locked: false
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
        if (contextMenuNoteId) moveNoteToTrash(contextMenuNoteId);
    }

    function handleTabSwitching() {
        document.querySelector('.tab-nav')?.addEventListener('click', (e) => {
            const button = e.target.closest('.tab-btn');
            if (!button || button.classList.contains('active')) return;
            const tabId = button.dataset.tab;
            document.querySelector('.tab-nav .tab-btn.active')?.classList.remove('active');
            button.classList.add('active');
            boardManager.querySelector('.tab-content.active')?.classList.remove('active');
            document.getElementById(`tab-content-${tabId}`)?.classList.add('active');
            if (tabId === 'trash') renderTrash();
        });
    }

    function initializeLineStyleControls() {
        const linePathSelect = document.getElementById('line-path-select');
        const linePlugSelect = document.getElementById('line-plug-select');
    
        const updateUI = () => {
            const { color, opacity, path, size, endPlug } = appState.lineOptions;
            lineColorInput.value = color;
            lineOpacityInput.value = opacity;
            lineOpacityValue.textContent = `${Math.round(opacity * 100)}%`;
            lineSizeInput.value = size;
            lineSizeValue.textContent = size;
    
            linePathSelect.querySelector('.active')?.classList.remove('active');
            linePathSelect.querySelector(`[data-value="${path}"]`)?.classList.add('active');
    
            linePlugSelect.querySelector('.active')?.classList.remove('active');
            linePlugSelect.querySelector(`[data-value="${endPlug}"]`)?.classList.add('active');
        };
    
        const saveAndRerender = () => {
            saveState();
            renderActiveBoard();
        };
    
        lineColorInput.addEventListener('input', (e) => {
            appState.lineOptions.color = e.target.value;
            saveAndRerender();
        });
    
        lineOpacityInput.addEventListener('input', (e) => {
            const newOpacity = parseFloat(e.target.value);
            appState.lineOptions.opacity = newOpacity;
            lineOpacityValue.textContent = `${Math.round(newOpacity * 100)}%`;
            saveAndRerender();
        });
    
        lineSizeInput.addEventListener('input', (e) => {
            const newSize = parseInt(e.target.value, 10);
            appState.lineOptions.size = newSize;
            lineSizeValue.textContent = newSize;
            saveAndRerender();
        });
    
        linePathSelect.addEventListener('click', (e) => {
            const btn = e.target.closest('.visual-select-btn');
            if (btn) { appState.lineOptions.path = btn.dataset.value; updateUI(); saveAndRerender(); }
        });
    
        linePlugSelect.addEventListener('click', (e) => {
            const btn = e.target.closest('.visual-select-btn');
            if (btn) { appState.lineOptions.endPlug = btn.dataset.value; updateUI(); saveAndRerender(); }
        });
    
        updateUI(); // Carga inicial
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        toast.addEventListener('animationend', () => toast.remove());
    }

    function initializeSidebarResizing() {
        const resizer = document.getElementById('sidebar-resizer');
        if (!resizer) return;
        const minWidth = 220, maxWidth = 500;
        const handlePointerDown = (e) => {
            e.preventDefault();
            resizer.classList.add('resizing');
            document.body.classList.add('sidebar-resizing');
            document.body.style.userSelect = 'none';
            const handlePointerMove = (moveEvent) => {
                let newWidth = Math.max(minWidth, Math.min(moveEvent.clientX, maxWidth));
                boardManager.style.width = `${newWidth}px`;
                updateAllLinesPosition();
            };
            const handlePointerUp = () => {
                resizer.classList.remove('resizing');
                document.body.classList.remove('sidebar-resizing');
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

    function showColorPopover() {
        if (!contextMenuNoteId) return;
        const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === contextMenuNoteId);
        if (!noteData) return;
        popoverNoteId = contextMenuNoteId;
        popoverOriginalColor = noteData.color;
        for (const swatch of popoverPalette.children) {
            const isActive = swatch.dataset.color === noteData.color;
            swatch.className = `color-swatch ${isActive ? 'active' : ''} ${isActive ? (isColorDark(swatch.dataset.color) ? 'dark-bg' : 'light-bg') : ''}`;
        }
        const menuRect = contextMenu.getBoundingClientRect();
        colorPopover.style.top = `${menuRect.top}px`;
        colorPopover.style.left = `${menuRect.right + 10}px`;
        colorPopover.classList.remove('hidden');
        hideContextMenu();
    }

    function hideColorPopover() {
        if (!colorPopover.classList.contains('hidden') && popoverOriginalColor) {
            const noteElement = board.querySelector(`.stickynote[data-note-id="${popoverNoteId}"]`);
            if (noteElement) noteElement.style.backgroundColor = popoverOriginalColor;
        }
        colorPopover.classList.add('hidden');
        popoverOriginalColor = null;
        popoverNoteId = null;
    }

    function changeNoteColor(newColor) {
        if (!popoverNoteId) return;
        const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === popoverNoteId);
        const noteElement = board.querySelector(`.stickynote[data-note-id="${popoverNoteId}"]`);
        if (noteData && noteElement) {
            popoverOriginalColor = null;
            noteData.color = newColor;
            noteElement.style.backgroundColor = newColor;
            noteElement.classList.toggle('dark-theme', isColorDark(newColor));
            saveState();
        }
        hideColorPopover();
    }

    function initializeColorPopover() {
        const extendedColors = ['#FFFFFF', '#F1F3F4', '#CFD8DC', '#E8EAED', '#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9', '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', '#C8E6C9', '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3', '#FFE0B2', '#FFCCBC', '#D7CCC8', '#424242', '#000000'];
        const previewNoteColor = (color) => {
            if (!popoverNoteId) return;
            const noteElement = board.querySelector(`.stickynote[data-note-id="${popoverNoteId}"]`);
            if (noteElement) {
                noteElement.style.backgroundColor = color;
                noteElement.classList.toggle('dark-theme', isColorDark(color));
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
        popoverPalette.addEventListener('mouseleave', () => {
            if (popoverOriginalColor) previewNoteColor(popoverOriginalColor);
        });
        ctxChangeColorBtn.addEventListener('click', showColorPopover);
        closePopoverBtn.addEventListener('click', hideColorPopover);
    }

    // --- INICIALIZACIÓN DE LA APP ---
    function initializeApp() {
        loadState();

        initializeLineManager(appState, board, renderActiveBoard);

        const backgroundDOM = {
            backgroundOptionsContainer,
            resetBackgroundBtn,
            bgApplyToBoardCard,
            bgApplyToNotesCard,
            boardContainer
        };
        const backgroundCallbacks = {
            saveState, renderActiveBoard,
            getDefaultBackground: () => DEFAULT_BOARD_BACKGROUND
        };
        initializeBackgroundManager(appState, backgroundDOM, backgroundCallbacks);

        const trashDOM = { board, trashNotesContainer, trashBoardsContainer, emptyTrashBtn };
        const trashCallbacks = { saveState, showToast, renderBoardList, renderActiveBoard, updateBoardSize, hideContextMenu, removeLinesForNote };
        initializeTrashManager(appState, trashDOM, trashCallbacks);

        const noteInteractionDOM = { boardContainer, board, trashCan };
        const noteInteractionCallbacks = {
            handleConnectionClick, bringToFront, updateBoardSize, updateAllLinesPosition, moveNoteToTrash, saveState,
            renderActiveBoard, createDefaultBoard, switchBoard, showToast, createStickyNoteElement,
            getNewZIndex: () => ++maxZIndex
        };
        initializeNoteInteractions(appState, noteInteractionDOM, noteInteractionCallbacks);

        // ¡NUEVO! Inicializar el módulo de creación
        initializeCreateTab(appState, switchBoard, () => ++maxZIndex);
        
        const cursorDOM = { cursorColorInput, resetCursorBtn };
        const cursorCallbacks = { saveState };
        initializeCursorManager(appState, cursorDOM, cursorCallbacks);

        const collapseBtn = document.querySelector("#sidebar-collapse-btn");
        const expander = document.querySelector("#sidebar-expander");
        const setSidebarCollapsed = (collapsed) => {
            appState.isSidebarCollapsed = collapsed;
            boardManager.classList.toggle('collapsed', collapsed);
            boardManager.style.marginLeft = collapsed ? `-${boardManager.offsetWidth}px` : '';
            smoothLineUpdateOnToggle();
            saveState();
        };
        const smoothLineUpdateOnToggle = () => {
            const duration = 400; const startTime = performance.now();
            function animateLines() {
                if (performance.now() - startTime < duration) {
                    updateAllLinesPosition(); requestAnimationFrame(animateLines);
                } else { updateAllLinesPosition(); }
            }
            requestAnimationFrame(animateLines);
        };
        collapseBtn.addEventListener('click', () => setSidebarCollapsed(true));
        expander.addEventListener('click', () => setSidebarCollapsed(false));
        boardManager.style.width = `${appState.sidebarWidth || 260}px`;
        if (appState.isSidebarCollapsed) setSidebarCollapsed(true);

        handleTabSwitching();
        
        const paletteScrollContainer = document.querySelector("#palette-scroll-container");
        const scrollIndicatorUp = paletteScrollContainer.previousElementSibling;
        const scrollIndicator = paletteScrollContainer.nextElementSibling;
        const rainbowColors = ['#ff7979', '#ffbe76', '#f6e58d', '#badc58', '#7ed6df', '#54a0ff', '#be2edd', '#FFFFFF', '#808080'];
        const fullPalette = [];
        rainbowColors.forEach(color => {
            const [h, s, l] = hexToHsl(color);
            for (let i = -2; i <= 2; i++) {
                fullPalette.push(hslToHex(h, s, Math.max(0.15, Math.min(0.95, l + i * 0.08))));
            }
        });
        const extendedColors = [...fullPalette, ...fullPalette, ...fullPalette, ...fullPalette];
        const updateScrollIndicator = () => {
            const { scrollTop, scrollHeight, clientHeight } = paletteScrollContainer;
            const isScrollable = scrollHeight > clientHeight;
            scrollIndicator.style.opacity = (isScrollable && scrollTop + clientHeight < scrollHeight - 10) ? '1' : '0';
            scrollIndicatorUp.style.opacity = (isScrollable && scrollTop > 10) ? '1' : '0';
        };
        paletteScrollContainer.addEventListener('scroll', () => {
            updateScrollIndicator();
            const { scrollTop, scrollHeight, clientHeight } = paletteScrollContainer;
            const blockHeight = scrollHeight / 4;
            if (scrollTop + clientHeight >= blockHeight * 3) paletteScrollContainer.scrollTop -= blockHeight;
            else if (scrollTop <= blockHeight) paletteScrollContainer.scrollTop += blockHeight;
        }, { passive: true });
        extendedColors.forEach((color, index) => {
            const paletteNote = document.createElement("div");
            paletteNote.className = `palette-note ${isColorDark(color) ? 'dark-theme' : ''}`;
            paletteNote.style.backgroundColor = color;
            paletteNote.dataset.color = color;
            paletteNote.style.top = `${index * 25}px`;
            paletteNote.style.transform = `rotate(${(Math.random() - 0.5) * 6}deg)`;
            paletteScrollContainer.appendChild(paletteNote);
        });
        paletteScrollContainer.scrollTop = paletteScrollContainer.scrollHeight / 4;
        setTimeout(updateScrollIndicator, 100);

        pinPaletteBtn.addEventListener('click', togglePalettePin);
        searchInput.addEventListener('input', handleSearch);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#context-menu, #tab-context-menu, #color-picker-popover')) {
                hideContextMenu(); hideTabContextMenu(); hideColorPopover();
            }
        }, true);
        ctxDuplicateBtn.addEventListener('click', duplicateNote);
        ctxLockBtn.addEventListener('click', toggleLockNote);
        ctxDeleteBtn.addEventListener('click', deleteNoteFromContext);
        ctxTabDeleteBtn.addEventListener('click', clearTab);
        emptyTrashBtn.addEventListener('click', emptyTrash);

        zoomInBtn.addEventListener('click', () => updateZoom(appState.zoomLevel + 0.1));
        zoomOutBtn.addEventListener('click', () => updateZoom(appState.zoomLevel - 0.1));
        zoomResetBtn.addEventListener('click', () => updateZoom(1.0));

        renderBoardList();
        renderActiveBoard();
        updateBoardSize();
        initializeLineStyleControls();        
        initializeColorPopover();
        initializeSidebarResizing();
        updatePaletteState();
        initializeShareAndImport(appState, {
            showToast,
            switchBoard,
            saveState,
            renderBoardList
        });
        initializeAboutModalFeature();
        initializePanning(boardContainer, board, updateAllLinesPosition);
        boardContainer.addEventListener('scroll', updateAllLinesPosition);
    }

    initializeApp();
});