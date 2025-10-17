import { dom } from './dom.js';
import { appState, guardarEstado, activeLines } from './estado.js';
import { isColorDark } from './utilidades.js';
import { DEFAULT_BOARD_BACKGROUND } from './constantes.js';
import { actualizarZoom } from './zoom.js';
import { crearElementoNotaAdhesiva } from './interacciones.js';
import { removeActiveLines, renderConnections } from './conexiones.js';
import { updateActiveBackgroundPreview } from './estilos.js';

export function renderizarListaTableros() {
    dom.boardList.innerHTML = '';
    Object.values(appState.boards).forEach(b => {
        const li = document.createElement('li');
        li.textContent = b.name;
        li.dataset.boardId = b.id;
        if (b.id === appState.activeBoardId) {
            li.classList.add('active');
        }
        // Necesitamos importar switchBoard o pasar la función como argumento.
        // Por ahora, lo dejamos así y lo conectaremos en el archivo principal.
        // li.addEventListener('click', () => switchBoard(b.id));
        dom.boardList.appendChild(li);
    });
}

export function renderizarTableroActivo() {
    dom.board.innerHTML = ''; // Limpiar tablero
    removeActiveLines(); // Limpiar líneas existentes
    const currentBoard = appState.boards[appState.activeBoardId];
    if (!currentBoard) return;

    // Sincronizar checkboxes de aplicación de fondo
    dom.bgApplyToBoardCheckbox.checked = currentBoard.backgroundApplyTo.board;
    dom.bgApplyToNotesCheckbox.checked = currentBoard.backgroundApplyTo.notes;

    // Aplicar fondo al tablero si corresponde
    if (currentBoard.backgroundApplyTo.board) {
        dom.boardContainer.style.background = currentBoard.background || DEFAULT_BOARD_BACKGROUND;
    } else {
        dom.boardContainer.style.background = DEFAULT_BOARD_BACKGROUND;
    }

    // Actualizar la previsualización activa
    updateActiveBackgroundPreview(currentBoard.background);

    actualizarZoom(); // Aplicar el zoom guardado al renderizar
    if (currentBoard.notes.length === 0) {
        const welcomeMsg = document.createElement('div');
        welcomeMsg.classList.add('welcome-message');
        welcomeMsg.textContent = '¡Bienvenido! Arrastra una nota para comenzar.';
        dom.board.appendChild(welcomeMsg);
    } else {
        currentBoard.notes.forEach(noteData => {
            crearElementoNotaAdhesiva(noteData);
        });
    }
    renderConnections();
}

export function crearElementoNotaAdhesiva(noteData, isNew = false) {
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

    if (isColorDark(noteData.color)) {
        sticky.classList.add('dark-theme');
    }

    const currentBoard = appState.boards[appState.activeBoardId];
    if (currentBoard.backgroundApplyTo.notes && currentBoard.background) {
        sticky.style.backgroundImage = currentBoard.background;
    }

    const title = document.createElement("div");
    title.contentEditable = !noteData.locked;
    title.classList.add("stickynote-title");
    title.setAttribute("placeholder", "Título...");
    title.innerHTML = noteData.tabs[noteData.activeTab].title || '';
    title.addEventListener('blur', () => {
        const newTitle = title.innerHTML;
        if (noteData.tabs[noteData.activeTab].title !== newTitle) {
            noteData.tabs[noteData.activeTab].title = newTitle;
            guardarEstado();

            const activeTabElement = sticky.querySelector(`.stickynote-tab[data-tab-index="${noteData.activeTab}"]`);
            const titlePart = activeTabElement.querySelector('.stickynote-tab-part[data-part="title"]');
            titlePart.classList.toggle('filled', !!newTitle.trim());
            titlePart.classList.toggle('empty', !newTitle.trim());

            // handleSearch(); // Esta función debe ser importada o pasada
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
        tab.className = 'stickynote-tab';
        tab.dataset.tabIndex = i;

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
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            noteData.activeTab = i;
            guardarEstado();
            
            const currentActiveTab = sticky.querySelector('.stickynote-tab.active');
            if (currentActiveTab) currentActiveTab.classList.remove('active');
            tab.classList.add('active');
            const currentActiveContent = sticky.querySelector('.stickynote-text.active');
            if (currentActiveContent) currentActiveContent.classList.remove('active');
            sticky.querySelector(`.stickynote-text[data-tab-index="${i}"]`).classList.add('active');

            title.innerHTML = noteData.tabs[i].title || '';
        });
        // El contextmenu se manejará en menuContextual.js
        tabContainer.appendChild(tab);

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
                guardarEstado();
                const tabEl = sticky.querySelector(`.stickynote-tab[data-tab-index="${i}"]`);
                if (tabEl) {
                    const contentPart = tabEl.querySelector('.stickynote-tab-part[data-part="content"]');
                    contentPart.classList.toggle('filled', !!newContent.trim());
                    contentPart.classList.toggle('empty', !newContent.trim());
                }
                // handleSearch();
            }
        });
        contentContainer.appendChild(content);
    }

    const connectBtn = document.createElement("div");
    connectBtn.className = 'connect-btn';
    connectBtn.innerHTML = '☍';
    connectBtn.title = 'Crear conexión';
    // El evento click se manejará en conexiones.js

    const resizer = document.createElement("div");
    resizer.classList.add("resizer");

    sticky.appendChild(title);
    contentWrapper.appendChild(contentContainer);
    contentWrapper.appendChild(tabContainer);
    sticky.appendChild(contentWrapper);

    sticky.appendChild(connectBtn);
    sticky.appendChild(resizer);
    dom.board.appendChild(sticky);

    if (isNew) {
        sticky.classList.add('new-note-animation');
        sticky.addEventListener('animationend', () => {
            sticky.classList.remove('new-note-animation');
        }, { once: true });
    }

    return sticky;
}