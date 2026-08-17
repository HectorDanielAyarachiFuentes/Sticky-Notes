// estadoApp.js
// Gestor centralizado del estado de la aplicación (Store)
// Implementa un patrón Pub/Sub básico para notificar cambios.

export const state = {
    appState: {},
    maxZIndex: 0,
    listeners: [],

    // --- SUSCRIPCIONES ---
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    },

    notify() {
        this.listeners.forEach(listener => listener(this.appState));
    },

    // --- MANEJO DE ESTADO ---
    get() {
        return this.appState;
    },

    set(newState) {
        this.appState = { ...this.appState, ...newState };
        this.save();
        this.notify();
    },

    updateBoard(boardId, updates) {
        if (this.appState.boards[boardId]) {
            this.appState.boards[boardId] = { ...this.appState.boards[boardId], ...updates };
            this.save();
            this.notify();
        }
    },

    // --- PERSISTENCIA (LOCAL STORAGE) ---
    save() {
        const stateString = JSON.stringify(this.appState, (key, value) => {
            if (key === 'history' || key === 'historyTitle' || key === 'historyIndex' || key === 'historyTitleIndex') {
                return undefined;
            }
            return value;
        });
        localStorage.setItem('stickyNotesApp', stateString);
        this.updateStorageIndicator();
    },

    load() {
        const savedState = localStorage.getItem('stickyNotesApp');
        if (savedState) {
            const loadedState = JSON.parse(savedState);
            this.migrateState(loadedState);
            this.appState = loadedState;
        } else {
            this.initDefaultState();
        }

        // Valores por defecto asegurados post-carga
        if (this.appState.lineOptions.promptBeforeDelete === undefined) {
            this.appState.lineOptions.promptBeforeDelete = true;
        }
        if (this.appState.promptBeforeDeleteNote === undefined) {
            this.appState.promptBeforeDeleteNote = true;
        }
        if (!this.appState.palettePosition) {
            this.appState.palettePosition = 'left';
        }
        
        this.notify();
    },

    initDefaultState() {
        const initialBoardId = `board-${Date.now()}`;
        this.appState = {
            boards: {
                [initialBoardId]: {
                    id: initialBoardId, name: 'Tablero Principal', notes: [], connections: [],
                    backgroundBoard: null,
                    backgroundNotes: null,
                    panX: 0, panY: 0
                }
            },
            boardsTrash: [], trash: [], zoomLevel: 1.0, isPalettePinned: true,
            isSidebarCollapsed: false, activeBoardId: initialBoardId, sidebarWidth: 260,
            globalHistory: [], globalRedoHistory: [],
            lineOptions: { color: '#4B4B4B', opacity: 0.8, size: 4, path: 'fluid', startPlug: 'behind', endPlug: 'arrow1', dash: false, dropShadow: false, label: '' },
            palettePosition: 'left'
        };
    },

    migrateState(loadedState) {
        Object.values(loadedState.boards).forEach(board => {
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
                if (note.zIndex === undefined) {
                    note.zIndex = ++this.maxZIndex;
                } else if (note.zIndex > this.maxZIndex) {
                    this.maxZIndex = note.zIndex;
                }
            });

            if (!loadedState.trash) loadedState.trash = [];
            if (!loadedState.boardsTrash) loadedState.boardsTrash = [];
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
    },

    // --- UTILIDADES DE ALMACENAMIENTO ---
    updateStorageIndicator() {
        const LIMIT_BYTES = 5 * 1024 * 1024; // 5 MB
        let usedBytes = 0;
        try {
            for (const key in localStorage) {
                if (!localStorage.hasOwnProperty(key)) continue;
                usedBytes += (localStorage[key].length + key.length) * 2;
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

        if (pct >= 90) {
            document.dispatchEvent(new CustomEvent('showToast', { detail: '⚠️ ¡Almacenamiento casi lleno!' }));
        }
    },
    
    getNewZIndex() {
        return ++this.maxZIndex;
    }
};
