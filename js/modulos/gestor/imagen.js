/**
 * Módulo de Gestión de Imágenes en Notas.
 * Permite adjuntar imágenes a notas individuales via:
 *   1. Menú contextual → "🖼️ Añadir Imagen"
 *   2. Drag-and-drop de un archivo de imagen sobre una nota
 *
 * Pipeline de compresión:
 *   - Full quality:  maxWidth=500, JPEG 0.7 → noteData.image    (persistencia / JSON)
 *   - Miniatura:     maxWidth=200, JPEG 0.4 → noteData.imageMini (URL compartida)
 */

/**
 * Comprime una imagen usando el Canvas API.
 * @param {File|Blob} file            - El archivo de imagen a comprimir.
 * @param {number}    maxWidth        - Ancho máximo en px.
 * @param {number}    quality         - Calidad JPEG (0–1).
 * @returns {Promise<string>} dataURL comprimido.
 */
function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Error al leer el archivo.'));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Error al cargar la imagen.'));
            img.onload = () => {
                const scale = Math.min(1, maxWidth / img.width);
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Aplica los datos de imagen al elemento DOM de una nota y al estado.
 * @param {HTMLElement} noteEl        - El elemento .stickynote en el DOM.
 * @param {object}      noteData      - El objeto de datos de la nota en appState.
 * @param {string}      fullDataUrl   - DataURL de alta calidad.
 * @param {string}      miniDataUrl   - DataURL en miniatura para URLs.
 * @param {Function}    saveState     - Callback para persistir el estado.
 */
function applyImageToNote(noteEl, noteData, fullDataUrl, miniDataUrl, saveState) {
    noteData.image = fullDataUrl;
    noteData.imageMini = miniDataUrl;
    saveState();

    if (noteEl) {
        noteEl.style.setProperty('--note-image', `url('${fullDataUrl}')`);
        noteEl.classList.add('has-image');
    }
}

/**
 * Procesa un archivo de imagen y lo adjunta a la nota correspondiente.
 * @param {File}     file
 * @param {object}   noteData
 * @param {HTMLElement} noteEl
 * @param {Function} saveState
 * @param {Function} showToast
 */
async function processAndAttachImage(file, noteData, noteEl, saveState, showToast) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('❌ Solo se aceptan archivos de imagen.');
        return;
    }
    try {
        showToast('🔄 Procesando imagen...');
        const [fullDataUrl, miniDataUrl] = await Promise.all([
            compressImage(file, 500, 0.7),
            compressImage(file, 200, 0.4),
        ]);
        applyImageToNote(noteEl, noteData, fullDataUrl, miniDataUrl, saveState);
        showToast('🖼️ Imagen adjuntada a la nota.');
    } catch (err) {
        console.error('Error al procesar imagen:', err);
        showToast('❌ No se pudo procesar la imagen.');
    }
}

/**
 * Inicializa la funcionalidad de imágenes en notas.
 *
 * @param {object}   appState  - Estado global de la app.
 * @param {object}   domRefs   - { board, ctxAddImageBtn, noteImageInput }
 * @param {object}   callbacks - { saveState, showToast, getContextMenuNoteId }
 */
export function initializeNoteImageFeature(appState, domRefs, callbacks) {
    const { board, ctxAddImageBtn, noteImageInput } = domRefs;
    const { saveState, showToast, getContextMenuNoteId } = callbacks;

    if (!ctxAddImageBtn || !noteImageInput || !board) {
        console.warn('[imagen.js] Elementos del DOM no encontrados. Funcionalidad de imágenes deshabilitada.');
        return;
    }

    // ─── 1. Input de archivo (se activa desde script.js al clicar el menú) ───
    noteImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const noteId = noteImageInput.dataset.targetNoteId;
        if (!noteId) { showToast('❌ No hay nota seleccionada.'); return; }

        const noteData = getNoteData(appState, noteId);
        const noteEl = board.querySelector(`.stickynote[data-note-id="${noteId}"]`);
        if (!noteData) { showToast('❌ No se encontró la nota.'); return; }

        await processAndAttachImage(file, noteData, noteEl, saveState, showToast);
        // Resetear input para poder cargar el mismo archivo de nuevo
        e.target.value = '';
    });

    // ─── 2. Drag-and-Drop sobre una nota ──────────────────────────────────────
    board.addEventListener('dragover', (e) => {
        // Solo activar si hay un archivo de imagen siendo arrastrado
        const hasImageFile = Array.from(e.dataTransfer.types).includes('Files');
        if (!hasImageFile) return;

        const targetNote = e.target.closest('.stickynote');
        if (!targetNote) return;

        e.preventDefault(); // Necesario para habilitar el drop
        e.dataTransfer.dropEffect = 'copy';
        targetNote.classList.add('image-drop-active');
    });

    board.addEventListener('dragleave', (e) => {
        const targetNote = e.target.closest('.stickynote');
        if (targetNote) targetNote.classList.remove('image-drop-active');
    });

    board.addEventListener('drop', async (e) => {
        const targetNote = e.target.closest('.stickynote');
        if (!targetNote) return;

        targetNote.classList.remove('image-drop-active');

        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find(f => f.type.startsWith('image/'));
        if (!imageFile) return;

        e.preventDefault();
        e.stopPropagation();

        const noteId = targetNote.dataset.noteId;
        const noteData = getNoteData(appState, noteId);
        if (!noteData) return;

        await processAndAttachImage(imageFile, noteData, targetNote, saveState, showToast);
    });
}

/**
 * Elimina la imagen de una nota.
 * @param {object}   appState
 * @param {string}   noteId
 * @param {HTMLElement} board
 * @param {Function} saveState
 */
export function removeNoteImage(appState, noteId, board, saveState) {
    const noteData = getNoteData(appState, noteId);
    if (!noteData) return;
    delete noteData.image;
    delete noteData.imageMini;
    saveState();
    const noteEl = board.querySelector(`.stickynote[data-note-id="${noteId}"]`);
    if (noteEl) {
        noteEl.style.removeProperty('--note-image');
        noteEl.classList.remove('has-image');
    }
}

/**
 * Obtiene el objeto noteData desde appState.
 * @param {object} appState
 * @param {string} noteId
 * @returns {object|undefined}
 */
function getNoteData(appState, noteId) {
    const board = appState.boards[appState.activeBoardId];
    return board?.notes.find(n => n.id === noteId);
}
