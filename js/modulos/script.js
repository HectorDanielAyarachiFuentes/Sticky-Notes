document.addEventListener('DOMContentLoaded', async () => {
    // --- IMPORTACIÓN DE MÓDULOS ---
    // Optimización de Carga: Cargar todos los módulos en paralelo
    const [
        panningModule,
        shareModule,
        aboutModalModule,
        lineManagerModule,
        trashManagerModule,
        noteInteractionsModule,
        backgroundManagerModule,
        createTabModule,
        cursorManagerModule,
        noteImageModule
    ] = await Promise.all([
        import('./moverfondo.js'),
        import('./gestor/exportar.js'),
        import('./sobremi.js'),
        import('./gestor/lineas.js'),
        import('./gestor/papelera.js'),
        import('./gestor/interaccionesNotas.js'),
        import('./gestor/fondo.js'),
        import('./gestor/crear.js'),
        import('./gestor/cursor.js'),
        import('./gestor/imagen.js')
    ]);

    const { initializePanning } = panningModule;
    const { initializeShareAndImport } = shareModule;
    const { initializeAboutModalFeature } = aboutModalModule;
    const {
        initializeLineManager,
        renderConnections,
        removeActiveLines,
        updateAllLinesPosition,
        handleConnectionClick,
        removeLinesForNote
    } = lineManagerModule;
    const {
        initializeTrashManager,
        moveNoteToTrash,
        renderTrash,
        emptyTrash
    } = trashManagerModule;
    const { initializeNoteInteractions } = noteInteractionsModule;
    const { initializeBackgroundManager, updateBackgroundUI } = backgroundManagerModule;
    const { initializeCreateTab } = createTabModule;
    const { initializeCursorManager } = cursorManagerModule;
    const { initializeNoteImageFeature, removeNoteImage } = noteImageModule;

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
    const globalUndoBtn = document.querySelector("#global-undo-btn");
    const globalRedoBtn = document.querySelector("#global-redo-btn");
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
    const ctxDeleteLinesBtn = document.querySelector("#ctx-delete-lines");
    const ctxChangeColorBtn = document.querySelector("#ctx-change-color");
    const ctxAddImageBtn = document.querySelector("#ctx-add-image");
    const ctxRemoveImageBtn = document.querySelector("#ctx-remove-image");
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
    // Elementos para el nuevo modal de confirmación (se crearán dinámicamente)
    let confirmationModal, confirmYesBtn, confirmNoBtn, confirmDontAskAgain;
    let resolveConfirmationPromise = null;


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
        const stateString = JSON.stringify(appState, (key, value) => {
            if (key === 'history' || key === 'historyTitle' || key === 'historyIndex' || key === 'historyTitleIndex') {
                return undefined;
            }
            return value;
        });
        localStorage.setItem('stickyNotesApp', stateString);
        updateStorageIndicator();
    }

    /**
     * Calcula el uso del localStorage y actualiza la barra de progreso en la sidebar.
     * Límite estimado: 5 MB (5,120 KB).
     */
    function updateStorageIndicator() {
        const LIMIT_BYTES = 5 * 1024 * 1024; // 5 MB
        let usedBytes = 0;
        try {
            for (const key in localStorage) {
                if (!localStorage.hasOwnProperty(key)) continue;
                usedBytes += (localStorage[key].length + key.length) * 2; // UTF-16: 2 bytes por char
            }
        } catch (e) { /* seguro */ }

        const pct = Math.min(100, (usedBytes / LIMIT_BYTES) * 100);
        const usedKB  = (usedBytes / 1024).toFixed(1);
        const totalMB = (LIMIT_BYTES / 1024 / 1024).toFixed(0);

        const bar  = document.getElementById('storage-bar-fill');
        const text = document.getElementById('storage-text');
        const track = bar?.closest('[role="progressbar"]');

        if (!bar || !text) return;

        bar.style.width = `${pct.toFixed(1)}%`;
        bar.classList.remove('warn', 'danger');
        if (pct >= 90)      bar.classList.add('danger');
        else if (pct >= 70) bar.classList.add('warn');

        text.textContent = `${usedKB} KB / ${totalMB} MB`;
        track?.setAttribute('aria-valuenow', Math.round(pct));

        // Toast de advertencia cuando supera el 90%
        if (pct >= 90) {
            showToast('⚠️ ¡Almacenamiento casi lleno! Considera borrar tableros o notas.');
        }
    }

    function loadState() {
        const savedState = localStorage.getItem('stickyNotesApp');
        if (savedState) {
            const loadedState = JSON.parse(savedState);
            Object.values(loadedState.boards).forEach(board => {
                // Migración a fondos separados
                if (board.background !== undefined) {
                    board.backgroundBoard = board.backgroundApplyTo?.board ? board.background : null;
                    board.backgroundNotes = board.backgroundApplyTo?.notes ? board.background : null;
                    delete board.background;
                    delete board.backgroundApplyTo;
                }
                
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
            if (!loadedState.globalHistory) loadedState.globalHistory = [];
            if (!loadedState.globalRedoHistory) loadedState.globalRedoHistory = [];
            appState = loadedState;
        } else {
            const initialBoardId = `board-${Date.now()}`;
            appState = {
                boards: {
                    [initialBoardId]: {
                        id: initialBoardId, name: 'Tablero Principal', notes: [], connections: [],
                        backgroundBoard: null,
                        backgroundNotes: null
                    }
                },
                boardsTrash: [], trash: [], zoomLevel: 1.0, isPalettePinned: true,
                isSidebarCollapsed: false, activeBoardId: initialBoardId, sidebarWidth: 260,
                globalHistory: [], globalRedoHistory: [],
                lineOptions: { color: '#4B4B4B', opacity: 0.8, size: 4, path: 'fluid', startPlug: 'behind', endPlug: 'arrow1', dash: false, dropShadow: false, label: '' }
            };
        }
        if (appState.lineOptions.promptBeforeDelete === undefined) {
            appState.lineOptions.promptBeforeDelete = true;
        }
        // Inicializar posición de paleta si no existe
        if (!appState.palettePosition) {
            appState.palettePosition = 'left';
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

    // --- POSICIÓN DE LA PALETA (solo escritorio) ---
    function setPalettePosition(position) {
        // Suprimir transiciones → cambio instantáneo sin animación lenta
        document.body.classList.add('no-palette-transition');
        appState.palettePosition = position;
        updatePalettePositionUI();
        saveState();
        // Re-habilitar después de 2 frames (DOM ya pintado)
        requestAnimationFrame(() => requestAnimationFrame(() => {
            document.body.classList.remove('no-palette-transition');
        }));
    }

    function updatePalettePositionUI() {
        const pos = appState.palettePosition || 'left';
        document.body.classList.toggle('palette-right',  pos === 'right');
        document.body.classList.toggle('palette-top',    pos === 'top');
        document.body.classList.toggle('palette-bottom', pos === 'bottom');

        // En modos horizontales: limpiar estilos inline que el modo lateral
        // pudo haber dejado (margin-left del collapse animation, etc.)
        const palette = document.getElementById('note-palette');
        if (palette && (pos === 'top' || pos === 'bottom')) {
            palette.style.marginLeft   = '';
            palette.style.marginRight  = '';
            palette.style.marginTop    = '';
            palette.style.marginBottom = '';
            palette.style.width        = '';
            // Forzar visible (no colapsado) para que no se oculte lateralmente
            palette.classList.remove('palette-collapsed');
            palette.classList.add('palette-visible');
        }

        ['left', 'right', 'top', 'bottom'].forEach(p => {
            const btn = document.getElementById(`palette-pos-${p}`);
            if (!btn) return;
            btn.classList.toggle('active', pos === p);
            btn.setAttribute('aria-pressed', String(pos === p));
        });
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

    function renderActiveBoard(shouldSave = false, fullRedraw = true) {
        if (shouldSave) saveState();

        // Si no se necesita un redibujado completo (ej. al añadir una línea), solo salimos.
        if (!fullRedraw) {
            return;
        }

        board.innerHTML = '';
        removeActiveLines();
        const currentBoard = appState.boards[appState.activeBoardId];
        if (!currentBoard) { board.style.transform = 'scale(1) translate(0,0)'; return; }
        boardContainer.style.background = currentBoard.backgroundBoard || DEFAULT_BOARD_BACKGROUND;
        updateBackgroundUI(currentBoard);
        updateZoom();
        if (currentBoard.notes.length === 0) {
            const welcomeMsg = document.createElement('div');
            welcomeMsg.classList.add('welcome-message');
            welcomeMsg.innerHTML = '¡Bienvenido! <br>Arrastra una nota o haz doble clic para comenzar.';
            board.appendChild(welcomeMsg);
        } else {
            const fragment = document.createDocumentFragment();
            currentBoard.notes.forEach(noteData => createStickyNoteElement(noteData, false, fragment));
            board.appendChild(fragment);
        }
        renderConnections();
    }

    // --- FUNCIONES DE ZOOM ---
    function updateZoom(newZoomLevel) {
        if (newZoomLevel !== undefined) {
            appState.zoomLevel = Math.max(0.2, Math.min(2, newZoomLevel));
        }
        const currentBoard = appState.boards[appState.activeBoardId];
        const panX = currentBoard?.panX || 0;
        const panY = currentBoard?.panY || 0;

        // Ahora el transform combina la escala del zoom y la traslación del paneo
        board.style.transform = `translate(${panX}px, ${panY}px) scale(${appState.zoomLevel})`;
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
        renderActiveBoard(); // renderActiveBoard ya llama a updateZoom que aplica el paneo
        searchInput.value = '';
        globalSearchResults.innerHTML = '';
        board.classList.remove('searching');
        if (noteToHighlightId) {
            setTimeout(() => {
                const noteEl = board.querySelector(`.stickynote[data-note-id="${noteToHighlightId}"]`); // Esto puede no funcionar como se espera con el paneo
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
            id: newBoardId, name: "Tablero de Respaldo", notes: [], createdAt: Date.now(), panX: 0, panY: 0,
            connections: [], backgroundBoard: null, backgroundNotes: null
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

    async function deleteBoard(boardId) {
        const boardToDelete = appState.boards[boardId];
        const isLastBoard = Object.keys(appState.boards).length <= 1;
        const confirmMessage = isLastBoard
            ? `¿Estás seguro de que quieres eliminar el último tablero "${boardToDelete.name}"?`
            : `¿Estás seguro de que quieres mover el tablero "${boardToDelete.name}" a la papelera?`;
        const userRes = await showConfirmationModal('Alerta', confirmMessage);
        if (userRes.confirmed) {
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

    /**
     * Elimina todas las conexiones asociadas a una nota específica.
     * Ahora maneja una confirmación opcional.
     * @param {string} noteId - El ID de la nota.
     */
    async function deleteConnectionsForNote(noteId) {
        const performDelete = () => {
            const currentBoard = appState.boards[appState.activeBoardId];
            if (!currentBoard) return;

            // Eliminar conexiones del estado
            currentBoard.connections = currentBoard.connections.filter(
                conn => conn.from !== noteId && conn.to !== noteId
            );

            removeLinesForNote(noteId); // Elimina las líneas visuales
            renderActiveBoard(true); // Re-renderiza el tablero para quitar el botón de borrado y guarda el estado
            showToast('Conexiones eliminadas.');
        };

        if (appState.lineOptions.promptBeforeDelete) {
            const userResponse = await showConfirmationModal(
                '¿Estás seguro de que quieres borrar todas las conexiones de esta nota?',
                'Esta acción no se puede deshacer.'
            );

            if (userResponse.confirmed) {
                performDelete();
            }
            // La lógica para 'dontAskAgain' se maneja dentro de showConfirmationModal
        } else {
            performDelete();
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

    function createStickyNoteElement(noteData, isNew = false, container = board) {
        const sticky = document.createElement("div");
        sticky.className = `stickynote ${noteData.locked ? 'locked' : ''} ${isColorDark(noteData.color) ? 'dark-theme' : ''}`;
        sticky.dataset.noteId = noteData.id;
        sticky.style.cssText = `left:${noteData.x}px; top:${noteData.y}px; width:${noteData.width}px; height:${noteData.height}px; background-color:${noteData.color}; transform:rotate(${noteData.rotation}deg); z-index:${noteData.zIndex};`;
        const currentBoard = appState.boards[appState.activeBoardId];
        if (currentBoard.backgroundNotes) {
            sticky.style.backgroundImage = currentBoard.backgroundNotes;
        }
        // --- IMAGEN: Aplicar imagen de fondo de la nota si existe ---
        if (noteData.image) {
            sticky.style.setProperty('--note-image', `url('${noteData.image}')`);
            sticky.classList.add('has-image');
        }
        const title = document.createElement("div");
        title.contentEditable = !noteData.locked;
        title.className = "stickynote-title";
        title.setAttribute("placeholder", "Título...");
        title.innerHTML = noteData.tabs[noteData.activeTab].title || '';
        
        // --- INICIO SISTEMA DESHACER LOCAL (TÍTULO) ---
        let titleDebounceTimer;
        const guardarHistorialTitulo = (newTitle) => {
            const activeTab = noteData.activeTab;
            if (!noteData.tabs[activeTab].historyTitle) {
                noteData.tabs[activeTab].historyTitle = [noteData.tabs[activeTab].title || ''];
                noteData.tabs[activeTab].historyTitleIndex = 0;
            }
            const historyArr = noteData.tabs[activeTab].historyTitle;
            let currentIndex = noteData.tabs[activeTab].historyTitleIndex;
            
            if (currentIndex < historyArr.length - 1) {
                historyArr.length = currentIndex + 1;
            }
            if (historyArr[historyArr.length - 1] !== newTitle) {
                historyArr.push(newTitle);
                if (historyArr.length > 30) historyArr.shift();
                noteData.tabs[activeTab].historyTitleIndex = historyArr.length - 1;
            }
        };

        title.addEventListener('input', () => {
            clearTimeout(titleDebounceTimer);
            titleDebounceTimer = setTimeout(() => {
                guardarHistorialTitulo(title.innerHTML);
                noteData.tabs[noteData.activeTab].title = title.innerHTML;
                saveState();
            }, 800);
        });
        // --- FIN SISTEMA DESHACER LOCAL ---

        title.addEventListener('blur', () => {
            const newTitle = title.innerHTML;
            if (noteData.tabs[noteData.activeTab].title !== newTitle) {
                noteData.tabs[noteData.activeTab].title = newTitle;
                guardarHistorialTitulo(newTitle);
                saveState();
                const tabPart = sticky.querySelector(`.stickynote-tab[data-tab-index="${noteData.activeTab}"] .stickynote-tab-part[data-part="title"]`);
                if(tabPart) {
                    tabPart.classList.toggle('filled', !!newTitle.trim());
                    tabPart.classList.toggle('empty', !newTitle.trim());
                }
                handleSearch();
            }
        });
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'stickynote-content-wrapper';
        const tabContainer = document.createElement('div');
        tabContainer.className = 'stickynote-tabs';
        const contentContainer = document.createElement('div');
        contentContainer.className = 'stickynote-content-container';
        const content = document.createElement("div");
        content.contentEditable = !noteData.locked;
        content.className = `stickynote-text active`;
        content.dataset.tabIndex = noteData.activeTab;
        content.setAttribute("placeholder", "Escribe algo...");
        content.innerHTML = noteData.tabs[noteData.activeTab].content || '';
        
        let debounceTimer;
        const guardarHistorialTexto = (newContent, tabIndex) => {
            if (!noteData.tabs[tabIndex].history) {
                noteData.tabs[tabIndex].history = [noteData.tabs[tabIndex].content || ''];
                noteData.tabs[tabIndex].historyIndex = 0;
            }
            const historyArr = noteData.tabs[tabIndex].history;
            let currentIndex = noteData.tabs[tabIndex].historyIndex;
            
            if (currentIndex < historyArr.length - 1) {
                historyArr.length = currentIndex + 1;
            }
            if (historyArr[historyArr.length - 1] !== newContent) {
                historyArr.push(newContent);
                if (historyArr.length > 30) historyArr.shift();
                noteData.tabs[tabIndex].historyIndex = historyArr.length - 1;
            }
        };

        content.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const currentTab = noteData.activeTab;
            debounceTimer = setTimeout(() => {
                guardarHistorialTexto(content.innerHTML, currentTab);
                noteData.tabs[currentTab].content = content.innerHTML;
                saveState();
            }, 800);
        });

        content.addEventListener('blur', () => {
            const newContent = content.innerHTML;
            const currentTab = noteData.activeTab;
            if (noteData.tabs[currentTab].content !== newContent) {
                noteData.tabs[currentTab].content = newContent;
                guardarHistorialTexto(newContent, currentTab);
                saveState();
                const tabPart = sticky.querySelector(`.stickynote-tab[data-tab-index="${currentTab}"] .stickynote-tab-part[data-part="content"]`);
                if(tabPart) {
                    tabPart.classList.toggle('filled', !!newContent.trim());
                    tabPart.classList.toggle('empty', !newContent.trim());
                }
                handleSearch();
            }
        });

        contentContainer.appendChild(content);

        for (let i = 0; i < 5; i++) {
            const tab = document.createElement('div');
            tab.className = `stickynote-tab ${i === noteData.activeTab ? 'active' : ''}`;
            tab.dataset.tabIndex = i;
            tab.innerHTML = `<span class="stickynote-tab-part ${noteData.tabs[i]?.title?.trim() ? 'filled' : 'empty'}" data-part="title">Título</span><span class="stickynote-tab-part ${noteData.tabs[i]?.content?.trim() ? 'filled' : 'empty'}" data-part="content">Cuerpo</span>`;
            
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                if (noteData.activeTab === i) return;

                content.blur();
                
                noteData.activeTab = i;
                saveState();
                
                sticky.querySelector('.stickynote-tab.active')?.classList.remove('active');
                tab.classList.add('active');
                
                content.dataset.tabIndex = i;
                content.innerHTML = noteData.tabs[i].content || '';
                title.innerHTML = noteData.tabs[i].title || '';
            });
            
            tab.addEventListener('contextmenu', (e) => {
                e.preventDefault(); e.stopPropagation();
                contextMenuTabInfo = { noteId: noteData.id, tabIndex: i };
                showTabContextMenu(e.clientX, e.clientY);
            });
            tabContainer.appendChild(tab);
        }
        const connectionBtnsContainer = document.createElement("div");
        connectionBtnsContainer.className = 'connection-buttons-container';

        const connectBtn = document.createElement("div");
        connectBtn.className = 'connect-btn';
        connectBtn.innerHTML = '☍';
        connectBtn.title = 'Crear conexión';
        connectBtn.addEventListener('click', (e) => {
            e.stopPropagation(); handleConnectionClick(noteData.id);
        });
        connectionBtnsContainer.appendChild(connectBtn);

        const resizer = document.createElement("div");
        resizer.className = "resizer";
        sticky.appendChild(title);
        contentWrapper.appendChild(contentContainer);
        contentWrapper.appendChild(tabContainer);
        sticky.appendChild(contentWrapper);
        sticky.appendChild(connectionBtnsContainer);
        sticky.appendChild(resizer);
        container.appendChild(sticky);
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
            if (noteData.locked) {
                ctxLockBtn.innerHTML = `<span class="ctx-icon">🔓</span>Desbloquear Nota`;
            } else {
                ctxLockBtn.innerHTML = `<span class="ctx-icon">🔒</span>Bloquear Nota`;
            }

            // --- NUEVO: Mostrar/ocultar la opción de eliminar líneas ---
            const currentBoard = appState.boards[appState.activeBoardId];
            const hasConnections = currentBoard.connections.some(conn => conn.from === contextMenuNoteId || conn.to === contextMenuNoteId);
            ctxDeleteLinesBtn.style.display = hasConnections ? 'flex' : 'none';
            // --- FIN NUEVO ---

            // --- IMAGEN: Mostrar/ocultar opciones de imagen según si la nota tiene imagen ---
            const hasImage = !!noteData.image;
            ctxAddImageBtn.style.display = hasImage ? 'none' : 'flex';
            ctxRemoveImageBtn.classList.toggle('hidden', !hasImage);
            ctxRemoveImageBtn.style.display = hasImage ? 'flex' : 'none';
            // --- FIN IMAGEN ---
            contextMenu.classList.remove('hidden');
            const rect = contextMenu.getBoundingClientRect();
            
            let topPosition = e.clientY;
            let leftPosition = e.clientX;

            // Adjust if it goes outside the viewport
            if (leftPosition + rect.width > window.innerWidth) {
                leftPosition = window.innerWidth - rect.width - 5;
            }
            if (topPosition + rect.height > window.innerHeight) {
                topPosition = window.innerHeight - rect.height - 5;
            }

            contextMenu.style.top = `${topPosition}px`;
            contextMenu.style.left = `${leftPosition}px`;
        } else {
            hideContextMenu();
            hideTabContextMenu();
        }
    }

    function showTabContextMenu(x, y) {
        hideContextMenu();
        tabContextMenu.classList.remove('hidden');
        
        const rect = tabContextMenu.getBoundingClientRect();
        let topPosition = y;
        let leftPosition = x;

        // Adjust if it goes outside the viewport
        if (leftPosition + rect.width > window.innerWidth) {
            leftPosition = window.innerWidth - rect.width - 5;
        }
        if (topPosition + rect.height > window.innerHeight) {
            topPosition = window.innerHeight - rect.height - 5;
        }

        tabContextMenu.style.top = `${topPosition}px`;
        tabContextMenu.style.left = `${leftPosition}px`;
    }

    function hideTabContextMenu() {
        tabContextMenu.classList.add('hidden');
        contextMenuTabInfo = null;
    }

    async function clearTab() {
        if (!contextMenuTabInfo) return;
        const { noteId, tabIndex } = contextMenuTabInfo;
        hideTabContextMenu();
        const noteData = appState.boards[appState.activeBoardId].notes.find(n => n.id === noteId);
        const noteElement = board.querySelector(`.stickynote[data-note-id="${noteId}"]`);
        if (!noteData || !noteElement) return;
        const userRes = await showConfirmationModal('Alerta', '¿Limpiar el contenido de esta pestaña?');
        if (!userRes.confirmed) return;
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

    async function deleteNoteFromContext() {
        if (!contextMenuNoteId) return;
        
        const noteId = contextMenuNoteId;
        hideContextMenu();
        
        const userRes = await showConfirmationModal("Eliminar Nota", "¿Estás seguro de que quieres eliminar esta nota? No te preocupes, puedes recuperarla después desde la pestaña de Papelera o usando el botón Deshacer.");
        if (userRes.confirmed) {
            moveNoteToTrash(noteId);
        }
    }

    /**
     * Inicia la eliminación de conexiones desde el menú contextual.
     */
    function deleteLinesFromContext() {
        if (contextMenuNoteId) deleteConnectionsForNote(contextMenuNoteId);
        hideContextMenu();
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
        const lineStartPlugSelect = document.getElementById('line-start-plug-select');
        const linePlugSelect = document.getElementById('line-plug-select');
        const lineDashInput = document.getElementById('line-dash-input');
        const lineShadowInput = document.getElementById('line-shadow-input');
        const lineLabelInput = document.getElementById('line-label-input');
        const promptDeleteCheckbox = document.getElementById('prompt-delete-connections');

        const updateUI = () => {
            const { color, opacity, path, size, startPlug, endPlug, dash, dropShadow, label } = appState.lineOptions;
            lineColorInput.value = color;
            lineOpacityInput.value = opacity;
            lineOpacityValue.textContent = `${Math.round(opacity * 100)}%`;
            lineSizeInput.value = size;
            lineSizeValue.textContent = size;

            linePathSelect.querySelector('.active')?.classList.remove('active');
            linePathSelect.querySelector(`[data-value="${path}"]`)?.classList.add('active');

            lineStartPlugSelect.querySelector('.active')?.classList.remove('active');
            lineStartPlugSelect.querySelector(`[data-value="${startPlug || 'behind'}"]`)?.classList.add('active');

            linePlugSelect.querySelector('.active')?.classList.remove('active');
            linePlugSelect.querySelector(`[data-value="${endPlug}"]`)?.classList.add('active');

            if (lineDashInput) lineDashInput.checked = dash || false;
            if (lineShadowInput) lineShadowInput.checked = dropShadow || false;
            if (lineLabelInput) lineLabelInput.value = label || '';

            // Actualizar el nuevo checkbox
            promptDeleteCheckbox.checked = appState.lineOptions.promptBeforeDelete;
        };

        const saveAndRerender = () => {
            saveState();
            renderActiveBoard(true); // CORREGIDO: Asegurarse de guardar el estado
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

        lineStartPlugSelect.addEventListener('click', (e) => {
            const btn = e.target.closest('.visual-select-btn');
            if (btn) { appState.lineOptions.startPlug = btn.dataset.value; updateUI(); saveAndRerender(); }
        });

        linePlugSelect.addEventListener('click', (e) => {
            const btn = e.target.closest('.visual-select-btn');
            if (btn) { appState.lineOptions.endPlug = btn.dataset.value; updateUI(); saveAndRerender(); }
        });

        if (lineDashInput) {
            lineDashInput.addEventListener('change', (e) => {
                appState.lineOptions.dash = e.target.checked;
                saveAndRerender();
            });
        }

        if (lineShadowInput) {
            lineShadowInput.addEventListener('change', (e) => {
                appState.lineOptions.dropShadow = e.target.checked;
                saveAndRerender();
            });
        }

        if (lineLabelInput) {
            lineLabelInput.addEventListener('input', (e) => {
                appState.lineOptions.label = e.target.value;
                saveAndRerender();
            });
        }

        promptDeleteCheckbox.addEventListener('change', (e) => {
            appState.lineOptions.promptBeforeDelete = e.target.checked;
            saveState();
            showToast(e.target.checked ? 'Se volverá a pedir confirmación al borrar conexiones.' : 'No se pedirá confirmación al borrar conexiones.');
        });

        updateUI(); // Carga inicial
    }

    /**
     * Muestra un modal de confirmación personalizable y devuelve una promesa.
     * @param {string} title - El título del modal.
     * @param {string} message - El mensaje del cuerpo del modal.
     * @returns {Promise<{confirmed: boolean, dontAskAgain: boolean}>}
     */
    function showConfirmationModal(title, message) {
        confirmationModal.querySelector('.modal-title').textContent = title;
        confirmationModal.querySelector('.modal-body p').textContent = message;
        confirmationModal.classList.remove('hidden');
        confirmDontAskAgain.checked = false; // Reset checkbox

        return new Promise(resolve => {
            resolveConfirmationPromise = resolve;
        });
    }

    function handleConfirmation(confirmed) {
        if (!resolveConfirmationPromise) return;

        const dontAskAgain = confirmDontAskAgain.checked;
        if (dontAskAgain) {
            appState.lineOptions.promptBeforeDelete = false;
            saveState();
            // Actualizar la UI de la pestaña de líneas si está visible
            const promptDeleteCheckbox = document.getElementById('prompt-delete-connections');
            if (promptDeleteCheckbox) promptDeleteCheckbox.checked = false;
        }

        resolveConfirmationPromise({ confirmed, dontAskAgain });
        confirmationModal.classList.add('hidden');
        resolveConfirmationPromise = null;
    }

    function createConfirmationModal() {
        const modalHTML = `
            <div class="modal-content confirmation-modal-content">
                <div class="modal-header">
                    <div class="modal-icon-container"><div class="modal-icon-text">!</div></div>
                    <h3 class="modal-title">Alerta</h3>
                </div>
                <div class="modal-body"><p></p></div>
                <div class="modal-footer">
                    <div class="dont-ask-again-container">
                        <label for="confirm-dont-ask-again">No volver a preguntar</label>
                        <label class="switch">
                            <input type="checkbox" id="confirm-dont-ask-again"><span class="slider round"></span>
                        </label>
                    </div>
                    <div class="confirmation-buttons"><button id="confirm-no-btn" class="modal-btn secondary">Cancelar</button><button id="confirm-yes-btn" class="modal-btn danger">Sí, borrar</button></div>
                </div>
            </div>`;
        confirmationModal = document.createElement('div');
        confirmationModal.id = 'confirmation-modal';
        confirmationModal.className = 'modal-overlay hidden';
        confirmationModal.innerHTML = modalHTML;
        document.body.appendChild(confirmationModal);

        confirmYesBtn = document.getElementById('confirm-yes-btn');
        confirmNoBtn = document.getElementById('confirm-no-btn');
        confirmDontAskAgain = document.getElementById('confirm-dont-ask-again');

        confirmYesBtn.addEventListener('click', () => handleConfirmation(true));
        confirmNoBtn.addEventListener('click', () => handleConfirmation(false));
        confirmationModal.addEventListener('click', (e) => {
            if (e.target === confirmationModal) handleConfirmation(false);
        });
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
        colorPopover.classList.remove('hidden');
        
        const popoverRect = colorPopover.getBoundingClientRect();
        let topPosition = menuRect.top;
        let leftPosition = menuRect.right + 10;
        
        // Adjust if it goes outside the viewport right edge (show on the left side of menu instead)
        if (leftPosition + popoverRect.width > window.innerWidth) {
            leftPosition = menuRect.left - popoverRect.width - 10;
        }
        // Adjust if it goes outside the viewport bottom edge
        if (topPosition + popoverRect.height > window.innerHeight) {
            topPosition = window.innerHeight - popoverRect.height - 5;
        }

        colorPopover.style.top = `${topPosition}px`;
        colorPopover.style.left = `${leftPosition}px`;
        
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
    async function initializeApp() {
        loadState();
        createConfirmationModal();

        // Inicializar módulos principales que no dependen de otros
        initializeLineManager(appState, board, renderActiveBoard, showConfirmationModal);
        initializePanning(boardContainer, board, appState, () => { updateZoom(); });
        initializeColorPopover();
        initializeSidebarResizing();
        initializeLineStyleControls();
        initializeAboutModalFeature();

        // Inicializar módulos de gestión que necesitan callbacks
        const backgroundDOM = { backgroundOptionsContainer, resetBackgroundBtn, bgApplyToBoardCard, bgApplyToNotesCard, boardContainer };
        const backgroundCallbacks = { saveState, renderActiveBoard, getDefaultBackground: () => DEFAULT_BOARD_BACKGROUND };
        await initializeBackgroundManager(appState, backgroundDOM, backgroundCallbacks);

        const trashDOM = { board, trashNotesContainer, trashBoardsContainer, emptyTrashBtn };
        const trashCallbacks = { saveState, showToast, renderBoardList, renderActiveBoard, hideContextMenu, removeLinesForNote, showConfirmationModal };
        initializeTrashManager(appState, trashDOM, trashCallbacks);

        const noteInteractionDOM = { boardContainer, board, trashCan };
        const noteInteractionCallbacks = {
            handleConnectionClick, bringToFront, updateAllLinesPosition, moveNoteToTrash, saveState,
            renderActiveBoard, createDefaultBoard, switchBoard, showToast, createStickyNoteElement, showConfirmationModal,
            getNewZIndex: () => ++maxZIndex
        };
        initializeNoteInteractions(appState, noteInteractionDOM, noteInteractionCallbacks);

        initializeCreateTab(appState, switchBoard, () => ++maxZIndex);

        const cursorDOM = { cursorColorInput, resetCursorBtn };
        initializeCursorManager(appState, cursorDOM, { saveState });

        initializeShareAndImport(appState, { showToast, switchBoard, saveState, renderBoardList });

        // --- MÓDULO DE IMÁGENES EN NOTAS ---
        const noteImageInput = document.getElementById('note-image-input');
        initializeNoteImageFeature(
            appState,
            { board, ctxAddImageBtn, noteImageInput },
            {
                saveState,
                showToast,
                getContextMenuNoteId: () => contextMenuNoteId
            }
        );
        ctxRemoveImageBtn.addEventListener('click', () => {
            if (contextMenuNoteId) {
                removeNoteImage(appState, contextMenuNoteId, board, saveState);
                showToast('🗑️ Imagen eliminada de la nota.');
            }
            hideContextMenu();
        });
        // Cuando se hace clic en "Añadir Imagen": capturar el ID de la nota ANTES
        // de que hideContextMenu() lo borre, configurar el input y abrir el file picker.
        ctxAddImageBtn.addEventListener('click', () => {
            const noteImageInput = document.getElementById('note-image-input');
            if (noteImageInput && contextMenuNoteId) {
                noteImageInput.dataset.targetNoteId = contextMenuNoteId;
            }
            hideContextMenu();
            if (noteImageInput) noteImageInput.click();
        });

        // --- SISTEMA DESHACER (UNDO) / REHACER (REDO) GLOBAL ---
        // Exponer registrarComando globalmente para que lo usen otros módulos (como papelera.js)
        window.registrarComando = function(comando) {
            appState.globalHistory.push(comando);
            appState.globalRedoHistory = []; // Si se hace una nueva acción, se pierde el futuro
            // Limitar a los últimos 50 comandos para evitar sobreconsumo de memoria
            if (appState.globalHistory.length > 50) {
                appState.globalHistory.shift();
            }
            saveState(); // Guardar el historial en localStorage
        };

        const deshacerGlobal = () => {
            if (appState.globalHistory && appState.globalHistory.length > 0) {
                const ultimoComando = appState.globalHistory.pop();
                
                // Lógica para deshacer BORRAR_NOTA
                if (ultimoComando.tipo === 'BORRAR_NOTA') {
                    const noteToRestore = ultimoComando.datos.nota;
                    const boardId = ultimoComando.datos.boardId;
                    const connectionsToRestore = ultimoComando.datos.conexiones || [];
                    
                    // Buscar en la papelera y removerla (si sigue ahí)
                    appState.trash = appState.trash.filter(n => n.id !== noteToRestore.id);
                    
                    // Insertar de vuelta en el tablero correspondiente
                    if (appState.boards[boardId]) {
                        appState.boards[boardId].notes.push(noteToRestore);
                        
                        // Restaurar conexiones si las había
                        if (connectionsToRestore.length > 0) {
                            if (!appState.boards[boardId].connections) {
                                appState.boards[boardId].connections = [];
                            }
                            appState.boards[boardId].connections.push(...connectionsToRestore);
                        }
                        
                        // Guardar para rehacer
                        if (!appState.globalRedoHistory) appState.globalRedoHistory = [];
                        appState.globalRedoHistory.push(ultimoComando);

                        saveState();
                        showToast('Deshacer global: Nota restaurada', 1500);
                        
                        // Si el tablero activo es donde se restauró, renderizar notas y líneas
                        if (appState.activeBoardId === boardId) {
                            renderActiveBoard(); 
                            if (typeof renderConnections === 'function') {
                                renderConnections();
                            } else {
                                updateAllLinesPosition();
                            }
                        }
                    } else {
                        showToast('⚠️ No se puede restaurar: Tablero eliminado', 2000);
                        appState.globalHistory.push(ultimoComando); // Devolverlo si falla
                    }
                }
            } else {
                showToast('Nada que deshacer', 1500); 
            }
        };

        const rehacerGlobal = () => {
            if (appState.globalRedoHistory && appState.globalRedoHistory.length > 0) {
                const ultimoDeshacer = appState.globalRedoHistory.pop();
                
                if (ultimoDeshacer.tipo === 'BORRAR_NOTA') {
                    const noteId = ultimoDeshacer.datos.nota.id;
                    const boardId = ultimoDeshacer.datos.boardId;
                    
                    if (appState.boards[boardId]) {
                        // Volver a borrar la nota
                        const index = appState.boards[boardId].notes.findIndex(n => n.id === noteId);
                        if (index !== -1) {
                            const noteParaBorrar = appState.boards[boardId].notes.splice(index, 1)[0];
                            
                            // Remover conexiones nuevamente
                            if (appState.boards[boardId].connections) {
                                appState.boards[boardId].connections = appState.boards[boardId].connections.filter(c => c.from !== noteId && c.to !== noteId);
                            }
                            
                            appState.trash.push(noteParaBorrar);
                            
                            // Devolver a globalHistory
                            appState.globalHistory.push(ultimoDeshacer);
                            
                            saveState();
                            showToast('Rehacer global: Nota eliminada', 1500);
                            
                            if (appState.activeBoardId === boardId) {
                                renderActiveBoard();
                                if (typeof renderConnections === 'function') {
                                    renderConnections();
                                } else {
                                    updateAllLinesPosition();
                                }
                            }
                        }
                    } else {
                        showToast('⚠️ No se puede rehacer: Tablero eliminado', 2000);
                        appState.globalRedoHistory.push(ultimoDeshacer); // Devolverlo si falla
                    }
                }
            } else {
                showToast('Nada que rehacer', 1500);
            }
        };

        const deshacerLocal = (activeEditor) => {
            const noteElement = activeEditor.closest('.stickynote');
            if (noteElement) {
                const noteId = noteElement.dataset.noteId;
                const currentBoard = appState.boards[appState.activeBoardId];
                const noteData = currentBoard.notes.find(n => n.id === noteId);
                
                // Determinar si es título o contenido
                let historyArr, historyIndexKey, updateFieldKey;
                const isText = activeEditor.classList.contains('stickynote-text');
                const isTitle = activeEditor.classList.contains('stickynote-title');
                let tabIndex = noteData.activeTab;
                
                if (isText) {
                    tabIndex = parseInt(activeEditor.dataset.tabIndex, 10);
                    const tabD = noteData.tabs[tabIndex];
                    if(!tabD.history) { tabD.history = [tabD.content || '']; tabD.historyIndex = 0; }
                    historyArr = tabD.history; historyIndexKey = 'historyIndex'; updateFieldKey = 'content';
                } else if (isTitle) {
                    const tabD = noteData.tabs[tabIndex];
                    if(!tabD.historyTitle) { tabD.historyTitle = [tabD.title || '']; tabD.historyTitleIndex = 0; }
                    historyArr = tabD.historyTitle; historyIndexKey = 'historyTitleIndex'; updateFieldKey = 'title';
                }
                
                if (historyArr) {
                    const tabData = noteData.tabs[tabIndex];
                    const currentText = activeEditor.innerHTML;
                    let idx = tabData[historyIndexKey];
                    
                    // Si hay texto no guardado, lo guardamos antes de retroceder
                    if (currentText !== historyArr[idx]) {
                        // Cortamos el futuro si existía (no debería, porque estamos tipeando de nuevo)
                        if (idx < historyArr.length - 1) historyArr.length = idx + 1;
                        historyArr.push(currentText);
                        idx = historyArr.length - 1;
                        tabData[historyIndexKey] = idx;
                    }
                    
                    if (idx > 0) {
                        idx--;
                        tabData[historyIndexKey] = idx;
                        const restoredText = historyArr[idx];
                        activeEditor.innerHTML = restoredText;
                        tabData[updateFieldKey] = restoredText;
                        
                        // Cursor al final
                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(activeEditor);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        
                        saveState();
                        showToast('Deshacer local', 800);
                    }
                }
            }
        };

        const rehacerLocal = (activeEditor) => {
            const noteElement = activeEditor.closest('.stickynote');
            if (noteElement) {
                const noteId = noteElement.dataset.noteId;
                const currentBoard = appState.boards[appState.activeBoardId];
                const noteData = currentBoard.notes.find(n => n.id === noteId);
                
                let historyArr, historyIndexKey, updateFieldKey;
                const isText = activeEditor.classList.contains('stickynote-text');
                const isTitle = activeEditor.classList.contains('stickynote-title');
                let tabIndex = noteData.activeTab;
                
                if (isText) {
                    tabIndex = parseInt(activeEditor.dataset.tabIndex, 10);
                    historyArr = noteData.tabs[tabIndex].history; 
                    historyIndexKey = 'historyIndex'; updateFieldKey = 'content';
                } else if (isTitle) {
                    historyArr = noteData.tabs[tabIndex].historyTitle; 
                    historyIndexKey = 'historyTitleIndex'; updateFieldKey = 'title';
                }
                
                if (historyArr) {
                    const tabData = noteData.tabs[tabIndex];
                    let idx = tabData[historyIndexKey];
                    
                    if (idx < historyArr.length - 1) {
                        idx++;
                        tabData[historyIndexKey] = idx;
                        const restoredText = historyArr[idx];
                        activeEditor.innerHTML = restoredText;
                        tabData[updateFieldKey] = restoredText;
                        
                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(activeEditor);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        
                        saveState();
                        showToast('Rehacer local', 800);
                    }
                }
            }
        };

        const ejecutarDeshacer = () => {
            const isEditingText = document.activeElement && 
                                (document.activeElement.tagName === 'INPUT' || 
                                 document.activeElement.tagName === 'TEXTAREA' || 
                                 document.activeElement.isContentEditable);
            
            if (!isEditingText) {
                deshacerGlobal();
            } else {
                deshacerLocal(document.activeElement);
            }
        };

        const ejecutarRehacer = () => {
            const isEditingText = document.activeElement && 
                                (document.activeElement.tagName === 'INPUT' || 
                                 document.activeElement.tagName === 'TEXTAREA' || 
                                 document.activeElement.isContentEditable);
            if (isEditingText) {
                rehacerLocal(document.activeElement);
            } else {
                rehacerGlobal();
            }
        };

        // Escuchar Ctrl+Z y Ctrl+Y
        document.addEventListener('keydown', (e) => {
            // Prevenir Ctrl+Z si estamos editando texto (para no interferir con el Undo nativo del navegador)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                ejecutarDeshacer();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                ejecutarRehacer();
            }
        });

        // --- EVENT LISTENERS GLOBALES ---
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
        if (appState.isSidebarCollapsed || window.innerWidth <= 768) setSidebarCollapsed(true);

        // --- Paleta de notas: colapso móvil ---
        const notePalette = document.querySelector('#note-palette');
        const paletteCollapseExpander = document.querySelector('#palette-expander');
        const setPaletteCollapsed = (collapsed) => {
            notePalette.classList.toggle('palette-collapsed', collapsed);
            if (paletteCollapseExpander) {
                paletteCollapseExpander.classList.toggle('palette-visible', !collapsed);
                paletteCollapseExpander.setAttribute('aria-expanded', String(!collapsed));
            }
        };
        if (paletteCollapseExpander) {
            paletteCollapseExpander.addEventListener('click', () => setPaletteCollapsed(false));
        }
        // Pin-header btn en móvil colapsa la paleta cuando está abierta
        const pinPaletteBtn = document.querySelector('#pin-palette-btn');
        if (pinPaletteBtn && window.innerWidth <= 768) {
            const collapseFromHeader = () => {
                if (window.innerWidth <= 768) setPaletteCollapsed(true);
            };
            // Click en el icono de la nota (create icon) colapsa en móvil
            document.querySelector('.palette-create-icon')?.addEventListener('click', collapseFromHeader);
            pinPaletteBtn.addEventListener('click', collapseFromHeader);
        }
        // En móvil: la paleta empieza colapsada
        if (window.innerWidth <= 768) setPaletteCollapsed(true);

        // Auto-colapsar en móvil al hacer clic en el tablero y desenfocar inputs
        boardContainer.addEventListener('pointerdown', (e) => {
            if (e.target === boardContainer || e.target.classList.contains('connection-line') || e.target.id === 'board-container') {
                if (document.activeElement && document.activeElement !== document.body) {
                    document.activeElement.blur();
                }
            }
            if (window.innerWidth <= 768 && !appState.isSidebarCollapsed) {
                setSidebarCollapsed(true);
            }
        });

        handleTabSwitching();

        const paletteScrollContainer = document.querySelector("#palette-scroll-container");
        const scrollIndicatorUp = paletteScrollContainer.previousElementSibling;
        const scrollIndicator = paletteScrollContainer.nextElementSibling;
        const updateScrollIndicator = () => {
            const { scrollTop, scrollHeight, clientHeight } = paletteScrollContainer;
            const isScrollable = scrollHeight > clientHeight;
            const showDown = isScrollable && scrollTop + clientHeight < scrollHeight - 10;
            const showUp = isScrollable && scrollTop > 10;
            scrollIndicator.style.opacity = showDown ? '1' : '0';
            scrollIndicatorUp.style.opacity = showUp ? '1' : '0';
            scrollIndicator.classList.toggle('visible', showDown);
            scrollIndicatorUp.classList.toggle('visible', showUp);
        };
        let lastScrollTop = paletteScrollContainer.scrollTop;
        paletteScrollContainer.addEventListener('scroll', () => {
            const currentScrollTop = paletteScrollContainer.scrollTop;
            const direction = currentScrollTop > lastScrollTop ? 'down' : 'up';
            lastScrollTop = currentScrollTop;

            // Trigger cinematic animation in the correct direction
            if (direction === 'down') {
                scrollIndicator.classList.remove('scrolling-down');
                void scrollIndicator.offsetWidth; // reflow to restart animation
                scrollIndicator.classList.add('scrolling-down');
                scrollIndicator.addEventListener('animationend', () => scrollIndicator.classList.remove('scrolling-down'), { once: true });
            } else {
                scrollIndicatorUp.classList.remove('scrolling-up');
                void scrollIndicatorUp.offsetWidth;
                scrollIndicatorUp.classList.add('scrolling-up');
                scrollIndicatorUp.addEventListener('animationend', () => scrollIndicatorUp.classList.remove('scrolling-up'), { once: true });
            }

            updateScrollIndicator();
            const { scrollTop, scrollHeight, clientHeight } = paletteScrollContainer;
            const blockHeight = scrollHeight / 4;
            if (scrollTop + clientHeight >= blockHeight * 3) paletteScrollContainer.scrollTop -= blockHeight;
            else if (scrollTop <= blockHeight) paletteScrollContainer.scrollTop += blockHeight;
        }, { passive: true });

        // Si el contenedor está vacío (no se cargó del caché en HTML), generamos la paleta
        if (paletteScrollContainer.children.length === 0) {
            const rainbowColors = ['#ff7979', '#ffbe76', '#f6e58d', '#badc58', '#7ed6df', '#54a0ff', '#be2edd', '#FFFFFF', '#808080'];
            const fullPalette = [];
            rainbowColors.forEach(color => {
                const [h, s, l] = hexToHsl(color);
                for (let i = -2; i <= 2; i++) {
                    fullPalette.push(hslToHex(h, s, Math.max(0.15, Math.min(0.95, l + i * 0.08))));
                }
            });
            const extendedColors = [...fullPalette, ...fullPalette, ...fullPalette, ...fullPalette];
            
            extendedColors.forEach((color, index) => {
                const paletteNote = document.createElement("div");
                paletteNote.className = `palette-note ${isColorDark(color) ? 'dark-theme' : ''}`;
                paletteNote.style.backgroundColor = color;
                paletteNote.dataset.color = color;
                paletteNote.style.top = `${index * 22}px`;
                paletteNote.style.zIndex = extendedColors.length - index;
                paletteNote.style.transform = `perspective(600px) rotateX(25deg) rotateZ(${(Math.random() - 0.5) * 4}deg)`;
                paletteNote.style.animationDelay = `${Math.min(index * 0.015, 0.5)}s`;
                paletteScrollContainer.appendChild(paletteNote);
            });

            // Guardar en caché para la próxima vez
            try {
                localStorage.setItem('stickyNotesPaletteCache', paletteScrollContainer.innerHTML);
            } catch(e) {}
        }
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
        ctxDeleteLinesBtn.addEventListener('click', deleteLinesFromContext);
        ctxTabDeleteBtn.addEventListener('click', clearTab);
        emptyTrashBtn.addEventListener('click', emptyTrash);

        zoomInBtn.addEventListener('click', () => updateZoom(appState.zoomLevel + 0.1));
        zoomOutBtn.addEventListener('click', () => updateZoom(appState.zoomLevel - 0.1));
        zoomResetBtn.addEventListener('click', () => updateZoom(1.0));
        
        // Evitamos que los botones roben el foco del texto para que el activeElement siga siendo el editor
        globalUndoBtn.addEventListener('mousedown', (e) => e.preventDefault());
        globalRedoBtn.addEventListener('mousedown', (e) => e.preventDefault());
        
        globalUndoBtn.addEventListener('click', () => { ejecutarDeshacer(); });
        globalRedoBtn.addEventListener('click', () => { ejecutarRehacer(); });
        // Ya no se necesita el listener de scroll en boardContainer

        // --- BOTONES DE POSICIÓN DE PALETA ---
        const palettePosLeftBtn   = document.getElementById('palette-pos-left');
        const palettePosRightBtn  = document.getElementById('palette-pos-right');
        const palettePosTopBtn    = document.getElementById('palette-pos-top');
        const palettePosBottomBtn = document.getElementById('palette-pos-bottom');
        if (palettePosLeftBtn)   palettePosLeftBtn.addEventListener('click',   () => setPalettePosition('left'));
        if (palettePosRightBtn)  palettePosRightBtn.addEventListener('click',  () => setPalettePosition('right'));
        if (palettePosTopBtn)    palettePosTopBtn.addEventListener('click',    () => setPalettePosition('top'));
        if (palettePosBottomBtn) palettePosBottomBtn.addEventListener('click', () => setPalettePosition('bottom'));

        // Scroll horizontal con rueda del ratón cuando la paleta está arriba/abajo
        const notePaletteEl = document.querySelector('#note-palette');
        const scrollContainer = document.querySelector('#palette-scroll-container');
        if (notePaletteEl && scrollContainer) {
            notePaletteEl.addEventListener('wheel', (e) => {
                const pos = appState.palettePosition;
                if (pos === 'top' || pos === 'bottom') {
                    e.preventDefault();
                    scrollContainer.scrollLeft += e.deltaY || e.deltaX;
                }
            }, { passive: false });
        }

        // --- RENDERIZADO INICIAL ---
        renderBoardList();
        renderActiveBoard();
        updatePaletteState();
        updatePalettePositionUI();

        // Actualizar el indicador de almacenamiento al cargar
        updateStorageIndicator();
    }

    initializeApp();
});