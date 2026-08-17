import { state } from './estadoApp.js';

let dom = {};
let debounceTimers = {};

export function initializeNotasDOM(elements) {
    dom = elements;
    
    // Escuchar cambios de tablero para renderizar el nuevo tablero
    document.addEventListener('boardSwitched', (e) => {
        renderActiveBoard(true, true);
        const noteToHighlightId = e.detail?.noteToHighlightId;
        if (noteToHighlightId) {
            setTimeout(() => {
                const noteEl = dom.board.querySelector(`.stickynote[data-note-id="${noteToHighlightId}"]`);
                if (noteEl) {
                    noteEl.classList.add('highlight');
                    noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => noteEl.classList.remove('highlight'), 2500);
                }
            }, 100);
        }
    });

    // --- EVENT DELEGATION GLOBAL EN EL TABLERO ---
    if (dom.board) {
        // 1. Manejo de inputs (Title y Content)
        dom.board.addEventListener('input', handleNoteInput);
        
        // 2. Manejo de Blur / Focusout (Guardar estado al salir)
        dom.board.addEventListener('focusout', handleNoteFocusOut);
        
        // 3. Manejo de Clicks (Pestañas y Botón Conectar)
        dom.board.addEventListener('click', handleNoteClick);

        // 4. Manejo de ContextMenu (Pestañas)
        dom.board.addEventListener('contextmenu', handleNoteContextMenu);
    }
}

// --- HANDLERS DE DELEGACIÓN ---

function getNoteData(element) {
    const sticky = element.closest('.stickynote');
    if (!sticky) return null;
    const noteId = sticky.dataset.noteId;
    const appState = state.get();
    const currentBoard = appState.boards[appState.activeBoardId];
    return currentBoard?.notes.find(n => n.id === noteId) || null;
}

function handleNoteInput(e) {
    const isTitle = e.target.classList.contains('stickynote-title');
    const isContent = e.target.classList.contains('stickynote-text');
    if (!isTitle && !isContent) return;

    const noteData = getNoteData(e.target);
    if (!noteData) return;

    const noteId = noteData.id;
    if (debounceTimers[noteId]) clearTimeout(debounceTimers[noteId]);

    debounceTimers[noteId] = setTimeout(() => {
        const activeTab = noteData.activeTab;
        if (isTitle) {
            noteData.tabs[activeTab].title = e.target.innerHTML;
        } else {
            noteData.tabs[activeTab].content = e.target.innerHTML;
        }
        state.save();
    }, 800);
}

function handleNoteFocusOut(e) {
    const isTitle = e.target.classList.contains('stickynote-title');
    const isContent = e.target.classList.contains('stickynote-text');
    if (!isTitle && !isContent) return;

    const sticky = e.target.closest('.stickynote');
    const noteData = getNoteData(e.target);
    if (!noteData || !sticky) return;

    const activeTab = noteData.activeTab;
    const newValue = e.target.innerHTML;
    let changed = false;

    if (isTitle && noteData.tabs[activeTab].title !== newValue) {
        noteData.tabs[activeTab].title = newValue;
        changed = true;
        const tabPart = sticky.querySelector(`.stickynote-tab[data-tab-index="${activeTab}"] .stickynote-tab-part[data-part="title"]`);
        if(tabPart) {
            tabPart.classList.toggle('filled', !!newValue.trim());
            tabPart.classList.toggle('empty', !newValue.trim());
        }
    } else if (isContent && noteData.tabs[activeTab].content !== newValue) {
        noteData.tabs[activeTab].content = newValue;
        changed = true;
        const tabPart = sticky.querySelector(`.stickynote-tab[data-tab-index="${activeTab}"] .stickynote-tab-part[data-part="content"]`);
        if(tabPart) {
            tabPart.classList.toggle('filled', !!newValue.trim());
            tabPart.classList.toggle('empty', !newValue.trim());
        }
    }

    if (changed) {
        state.save();
        document.dispatchEvent(new CustomEvent('handleSearch'));
    }
}

function handleNoteClick(e) {
    // A) Clic en Pestaña
    const tabEl = e.target.closest('.stickynote-tab');
    if (tabEl) {
        e.stopPropagation();
        const sticky = tabEl.closest('.stickynote');
        const noteData = getNoteData(tabEl);
        if (!noteData || !sticky) return;

        const i = parseInt(tabEl.dataset.tabIndex, 10);
        if (noteData.activeTab === i) return;

        // Blur manual del contenido actual
        const activeContent = sticky.querySelector('.stickynote-text.active');
        if (activeContent) activeContent.blur();

        noteData.activeTab = i;
        state.save();
        
        sticky.querySelector('.stickynote-tab.active')?.classList.remove('active');
        tabEl.classList.add('active');
        
        const content = sticky.querySelector('.stickynote-text');
        const title = sticky.querySelector('.stickynote-title');
        if (content) {
            content.dataset.tabIndex = i;
            content.innerHTML = noteData.tabs[i].content || '';
        }
        if (title) {
            title.innerHTML = noteData.tabs[i].title || '';
        }
        return;
    }

    // B) Clic en Botón Conectar
    const connectBtn = e.target.closest('.connect-btn');
    if (connectBtn) {
        e.stopPropagation(); 
        const noteData = getNoteData(connectBtn);
        if (noteData) {
            document.dispatchEvent(new CustomEvent('handleConnectionClick', { detail: { noteId: noteData.id } }));
        }
        return;
    }
}

function handleNoteContextMenu(e) {
    const tabEl = e.target.closest('.stickynote-tab');
    if (tabEl) {
        e.preventDefault(); e.stopPropagation();
        const noteData = getNoteData(tabEl);
        if (noteData) {
            const i = parseInt(tabEl.dataset.tabIndex, 10);
            document.dispatchEvent(new CustomEvent('showTabContextMenu', { 
                detail: { x: e.clientX, y: e.clientY, noteId: noteData.id, tabIndex: i } 
            }));
        }
    }
}

// --- RENDERIZADO DOM ---

export function renderActiveBoard(shouldSave = false, fullRedraw = true) {
    if (shouldSave) state.save();
    if (!fullRedraw) return;
    if (!dom.board) return;
    
    dom.board.innerHTML = '';
    document.dispatchEvent(new CustomEvent('removeActiveLines'));
    
    const appState = state.get();
    const currentBoard = appState.boards[appState.activeBoardId];
    
    if (!currentBoard) { 
        dom.board.style.transform = 'scale(1) translate(0,0)'; 
        return; 
    }
    
    const DEFAULT_BOARD_BACKGROUND = `repeating-linear-gradient(90deg, hsla(280,0%,67%,0.06) 0px, hsla(280,0%,67%,0.06) 1px,transparent 1px, transparent 96px),repeating-linear-gradient(0deg, hsla(280,0%,67%,0.06) 0px, hsla(280,0%,67%,0.06) 1px,transparent 1px, transparent 96px),repeating-linear-gradient(0deg, hsla(280,0%,67%,0.09) 0px, hsla(280,0%,67%,0.09) 1px,transparent 1px, transparent 12px),repeating-linear-gradient(90deg, hsla(280,0%,67%,0.09) 0px, hsla(280,0%,67%,0.09) 1px,transparent 1px, transparent 12px),linear-gradient(90deg, hsl(226,47%,26%),hsl(226,47%,26%))`;
    
    if (dom.boardContainer) {
        dom.boardContainer.style.background = currentBoard.backgroundBoard || DEFAULT_BOARD_BACKGROUND;
    }
    
    document.dispatchEvent(new CustomEvent('updateBackgroundUI', { detail: currentBoard }));
    document.dispatchEvent(new CustomEvent('updateZoom'));

    if (currentBoard.notes.length === 0) {
        const welcomeMsg = document.createElement('div');
        welcomeMsg.classList.add('welcome-message');
        welcomeMsg.innerHTML = '¡Bienvenido! <br>Arrastra una nota o haz doble clic para comenzar.';
        dom.board.appendChild(welcomeMsg);
    } else {
        const fragment = document.createDocumentFragment();
        currentBoard.notes.forEach(noteData => createStickyNoteElement(noteData, false, fragment));
        dom.board.appendChild(fragment);
    }
    
    document.dispatchEvent(new CustomEvent('renderConnections'));
}

export function isColorDark(hexColor) {
    if (!hexColor || hexColor.length < 7) return false;
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return luminance < 128;
}

export function createStickyNoteElement(noteData, isNew = false, container = null) {
    if (!container) container = dom.board;
    if (!container) return; 
    
    const appState = state.get();
    
    const sticky = document.createElement("div");
    // Añadimos una clase base 'stickynote'
    sticky.className = `stickynote ${noteData.locked ? 'locked' : ''} ${isColorDark(noteData.color) ? 'dark-theme' : ''}`;
    sticky.dataset.noteId = noteData.id;
    sticky.style.cssText = `left:${noteData.x}px; top:${noteData.y}px; width:${noteData.width}px; height:${noteData.height}px; background-color:${noteData.color}; transform:rotate(${noteData.rotation}deg); z-index:${noteData.zIndex};`;
    
    const currentBoard = appState.boards[appState.activeBoardId];
    if (currentBoard && currentBoard.backgroundNotes) {
        sticky.style.backgroundImage = currentBoard.backgroundNotes;
    }
    
    if (noteData.image) {
        sticky.style.setProperty('--note-image', `url('${noteData.image}')`);
        sticky.classList.add('has-image');
    }
    
    // Título (ahora sin Event Listeners directos)
    const title = document.createElement("div");
    title.contentEditable = !noteData.locked;
    title.className = "stickynote-title";
    title.setAttribute("placeholder", "Título...");
    title.innerHTML = noteData.tabs[noteData.activeTab].title || '';
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'stickynote-content-wrapper';
    
    const tabContainer = document.createElement('div');
    tabContainer.className = 'stickynote-tabs';
    
    const contentContainer = document.createElement('div');
    contentContainer.className = 'stickynote-content-container';
    
    // Contenido (ahora sin Event Listeners directos)
    const content = document.createElement("div");
    content.contentEditable = !noteData.locked;
    content.className = `stickynote-text active`;
    content.dataset.tabIndex = noteData.activeTab;
    content.setAttribute("placeholder", "Escribe algo...");
    content.innerHTML = noteData.tabs[noteData.activeTab].content || '';
    contentContainer.appendChild(content);

    // Pestañas (ahora sin Event Listeners directos)
    for (let i = 0; i < 5; i++) {
        const tab = document.createElement('div');
        tab.className = `stickynote-tab ${i === noteData.activeTab ? 'active' : ''}`;
        tab.dataset.tabIndex = i;
        tab.innerHTML = `<span class="stickynote-tab-part ${noteData.tabs[i]?.title?.trim() ? 'filled' : 'empty'}" data-part="title">Título</span><span class="stickynote-tab-part ${noteData.tabs[i]?.content?.trim() ? 'filled' : 'empty'}" data-part="content">Cuerpo</span>`;
        tabContainer.appendChild(tab);
    }
    
    const connectionBtnsContainer = document.createElement("div");
    connectionBtnsContainer.className = 'connection-buttons-container';

    // Botón de conexión (ahora manejado por delegación)
    const connectBtn = document.createElement("div");
    connectBtn.className = 'connect-btn';
    connectBtn.innerHTML = '☍';
    connectBtn.title = 'Crear conexión';
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

export function bringToFront(noteElement, noteData) {
    if (noteData.zIndex >= state.maxZIndex) return;
    noteData.zIndex = state.getNewZIndex();
    noteElement.style.zIndex = noteData.zIndex;
    state.save();
}
