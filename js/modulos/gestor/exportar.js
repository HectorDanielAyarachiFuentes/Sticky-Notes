import { nativeCompressToURL, nativeDecompressFromURL, isNativeCompressionSupported } from './native-compressor.js';

/**
 * Inicializa toda la funcionalidad de compartir e importar tableros.
 * @param {object} appState - El estado global de la aplicación.
 * @param {object} callbacks - Objeto con funciones de callback (showToast, switchBoard, etc.).
 */
export function initializeShareAndImport(appState, callbacks) {
    const { showToast, switchBoard, saveState, renderBoardList } = callbacks;
    
    const shareButton = document.getElementById('share-board-btn');
    const shareLinkOutput = document.getElementById('share-link-output');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importJsonBtn = document.getElementById('import-json-btn');
    const importJsonInput = document.getElementById('import-json-input');

    if (!shareButton || !exportJsonBtn || !importJsonBtn || !importJsonInput) {
        console.warn("No se encontraron todos los elementos de import/export.");
        return;
    }

    // --- LÓGICA DE EVENTOS ---
    shareButton.addEventListener('click', handleShareLink);
    exportJsonBtn.addEventListener('click', exportBoardToJson);
    importJsonBtn.addEventListener('click', () => importJsonInput.click());
    importJsonInput.addEventListener('change', handleJsonImport);

    // --- FUNCIONES INTERNAS ---
    /**
     * Obtiene el ID del tablero activo.
     * @returns {string}
     */
    function getActiveBoardId() {
        return appState.activeBoardId;
    }

    /**
     * Recopila todos los datos relevantes del tablero activo para compartir.
     * @param {string}  boardId   - El ID del tablero a exportar.
     * @param {boolean} forUrl    - Si es true, sustituye image por imageMini y omite datos pesados.
     * @returns {object | null}
     */
    function getBoardDataForSharing(boardId, forUrl = false) {
        const board = appState.boards[boardId];
        if (!board) { showToast('Error: No se encontró el tablero.'); return null; }

        let notes = board.notes;
        if (forUrl) {
            // Para URLs: usar miniatura en lugar de imagen de alta calidad
            notes = board.notes.map(note => {
                if (!note.image && !note.imageMini) return note;
                const noteCopy = { ...note };
                if (noteCopy.imageMini) {
                    noteCopy.image = noteCopy.imageMini; // Sustituir por miniatura
                }
                delete noteCopy.imageMini; // No incluir la miniatura por separado
                return noteCopy;
            });
        }

        const boardData = {
            notes,
            connections: board.connections || [],
            background: board.background || null,
            backgroundApplyTo: board.backgroundApplyTo || { board: true, notes: false }
        };
        return boardData;
    }

    /**
     * Crea un tablero, sus notas, líneas y fondo a partir de datos importados.
     * @param {object} importedData - Los datos del tablero a crear.
     * @param {string} boardName - El nombre para el nuevo tablero.
     * @returns {string} El ID del nuevo tablero.
     */
    function createBoardFromData(importedData, boardName) {
        const newBoardId = `board-${Date.now()}`;
        
        appState.boards[newBoardId] = {
            id: newBoardId,
            name: boardName,
            ...importedData,
            connections: importedData.connections || importedData.lines || [], // Compatibilidad
        };
        
        saveState();
        renderBoardList(); // Actualizamos la lista de tableros en la UI
        return newBoardId;
    }

    /**
     * Revisa la URL al cargar la página en busca de datos para importar.
     * Soporta tres formatos (prioridad de detección):
     *   1. #gzboard=  → Gzip nativo vía hash (nuevo, sin HTTP 431)
     *   2. ?bboard=   → Gzip nativo vía query param (compatibilidad transitoria)
     *   3. ?board=    → LZ-String (legacy, retrocompatibilidad)
     */
    function handleImportFromURL() {
        // === 1. Buscar en el fragmento hash (NUNCA se envía al servidor) ===
        const rawHash = window.location.hash.substring(1); // Quitar el '#'
        const hashGzMatch = rawHash.match(/^gzboard=(.+)/);

        // === 2. Buscar en query params (legacy) ===
        const rawSearch = window.location.search;
        const queryGzMatch = rawSearch.match(/[?&]bboard=([^&]*)/);
        const lzMatch      = rawSearch.match(/[?&]board=([^&]*)/);

        // Determinar tipo y valor
        let compressionType = null; // 'gzip' | 'lzstring'
        let paramValue = null;

        if (hashGzMatch) {
            compressionType = 'gzip';
            paramValue = hashGzMatch[1]; // Ya está decodificado (hash no se encode)
        } else if (queryGzMatch) {
            compressionType = 'gzip';
            paramValue = decodeURIComponent(queryGzMatch[1]);
        } else if (lzMatch) {
            compressionType = 'lzstring';
            paramValue = decodeURIComponent(lzMatch[1]);
        }

        if (!paramValue) return;

        // Mostrar cartel de procesando
        const processingOverlay = document.getElementById('processing-overlay');
        if (processingOverlay) processingOverlay.classList.remove('hidden');

        // Usamos setTimeout para permitir que el navegador dibuje el modal
        setTimeout(async () => {
            try {
                let jsonString;

                if (compressionType === 'gzip') {
                    // Descomprimir con CompressionStream nativo del navegador
                    jsonString = await nativeDecompressFromURL(paramValue);
                } else {
                    // Descomprimir con LZ-String (legacy)
                    jsonString = LZString.decompressFromEncodedURIComponent(paramValue);
                }

                if (!jsonString) throw new Error('No se pudo descomprimir el enlace.');
                const importedData = JSON.parse(jsonString);

                // Validar datos importados
                if (!Array.isArray(importedData.notes)) throw new Error("Datos de tablero inválidos.");

                const newBoardName = `Copia de Tablero`;
                const newBoardId = createBoardFromData(importedData, newBoardName);
                
                // Cambiar a la vista del tablero recién importado.
                switchBoard(newBoardId); 

                showToast(`✨ Tablero "${newBoardName}" importado con éxito.`);

                // Limpia la URL para que no se re-importe al recargar la página.
                const cleanUrl = new URL(window.location.origin + window.location.pathname);
                window.history.replaceState({}, document.title, cleanUrl);

            } catch (error) {
                console.error('Error al importar el tablero desde la URL:', error);
                showToast('❌ El enlace de importación parece estar dañado o es inválido.');
            } finally {
                if (processingOverlay) {
                    setTimeout(() => processingOverlay.classList.add('hidden'), 800);
                }
            }
        }, 100);
    }

    /**
     * Maneja la generación y copia del enlace para compartir.
     * Usa CompressionStream nativo (Gzip) + hash fragment (#) para evitar HTTP 431.
     * El fragmento hash NUNCA se envía al servidor → sin límite de tamaño en headers.
     * Fallback a LZ-String si el navegador no soporta CompressionStream.
     */
    async function handleShareLink() {
        const activeBoardId = getActiveBoardId(); 
        if (!activeBoardId) { showToast('Primero selecciona un tablero para compartir.'); return; }

        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }

        shareLinkOutput.style.display = 'block';
        shareLinkOutput.value = '🗜️ Comprimiendo tablero...';

        try {
            const baseUrl = window.location.origin + window.location.pathname;
            // El hash fragment no tiene límite de servidor, pero los navegadores
            // manejan bien hasta ~64KB. Usamos 32KB como límite conservador.
            const MAX_HASH_LENGTH = 32000;

            // Datos completos con miniaturas de imágenes
            const boardDataWithImages = getBoardDataForSharing(activeBoardId, true);
            if (!boardDataWithImages) { showToast('Error al recopilar los datos del tablero.'); return; }

            const hasImages = boardDataWithImages.notes.some(n => n.image || n.imageMini);

            // Datos sin imágenes (fallback)
            const boardDataNoImages = {
                ...boardDataWithImages,
                notes: boardDataWithImages.notes.map(n => {
                    const c = { ...n };
                    delete c.image;
                    delete c.imageMini;
                    return c;
                })
            };

            let shareUrl;
            let imagesIncluded = false;
            let usedNative = false;

            if (isNativeCompressionSupported()) {
                // === INTENTO 1: Gzip nativo con imágenes (vía hash #) ===
                if (hasImages) {
                    shareLinkOutput.value = '🗜️ Comprimiendo con Gzip nativo (con imágenes)...';
                    const jsonWithImages = JSON.stringify(boardDataWithImages);
                    const compressedWithImages = await nativeCompressToURL(jsonWithImages);
                    const hashWithImages = `gzboard=${compressedWithImages}`;

                    if (hashWithImages.length < MAX_HASH_LENGTH) {
                        shareUrl = `${baseUrl}#${hashWithImages}`;
                        imagesIncluded = true;
                        usedNative = true;
                    }
                }

                // === INTENTO 2: Gzip nativo sin imágenes (vía hash #) ===
                if (!shareUrl) {
                    shareLinkOutput.value = '🗜️ Comprimiendo con Gzip nativo...';
                    const jsonNoImages = JSON.stringify(boardDataNoImages);
                    const compressedNoImages = await nativeCompressToURL(jsonNoImages);
                    shareUrl = `${baseUrl}#gzboard=${compressedNoImages}`;
                    usedNative = true;
                }
            } else {
                // === FALLBACK: LZ-String sin imágenes (query param legacy) ===
                console.warn('[compartir] CompressionStream no soportado, usando LZ-String.');
                shareLinkOutput.value = '🔄 Usando compresor alternativo...';
                const jsonNoImages = JSON.stringify(boardDataNoImages);
                const compressed = LZString.compressToEncodedURIComponent(jsonNoImages);
                shareUrl = `${baseUrl}?board=${encodeURIComponent(compressed)}`;
            }

            shareLinkOutput.value = shareUrl;
            shareLinkOutput.select();
            await navigator.clipboard.writeText(shareUrl);

            // Mensaje informativo según el resultado
            const compressionLabel = usedNative ? 'Gzip nativo' : 'LZ-String';
            if (imagesIncluded) {
                showToast(`✅ ¡Enlace generado con imágenes! (${compressionLabel}) 🖼️`);
            } else if (hasImages) {
                showToast(`🔗 Enlace generado con ${compressionLabel} (imágenes excluidas por tamaño). Usa «Imagen Mágica» para compartir con imágenes.`);
            } else {
                showToast(`✅ ¡Enlace generado y copiado! (${compressionLabel})`);
            }
        } catch (error) {
            console.error('Error al generar el enlace para compartir:', error);
            showToast('❌ Error al generar el enlace.');
            shareLinkOutput.value = 'Error al generar el enlace.';
        }
    }

    /**
     * Crea un enlace de descarga y lo activa.
     * @param {Blob} blob - El contenido a descargar.
     * @param {string} filename - El nombre del archivo.
     */
    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Resalta sintaxis JSON con spans coloreados.
     * @param {string} json - JSON ya formateado
     * @returns {string} HTML con spans de colores
     */
    function syntaxHighlightJson(json) {
        return json
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(
                /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
                (match) => {
                    let cls = 'n'; // number
                    if (/^"/.test(match)) {
                        cls = /:$/.test(match) ? 'k' : 's'; // key or string
                    } else if (/true|false/.test(match)) {
                        cls = 'b'; // boolean
                    } else if (/null/.test(match)) {
                        cls = 'nil';
                    }
                    return `<span class="${cls}">${match}</span>`;
                }
            );
    }

    /**
     * Exporta el tablero activo como un archivo HTML autocontenido
     * que muestra el JSON formateado con syntax highlighting.
     */
    async function exportBoardToJson() {
        const currentBoard = appState.boards[appState.activeBoardId];
        if (!currentBoard) {
            showToast('No hay un tablero activo para exportar.');
            return;
        }

        const boardData = getBoardDataForSharing(appState.activeBoardId);
        const boardJson = JSON.stringify(boardData, null, 2);
        const highlighted = syntaxHighlightJson(boardJson);

        const noteCount  = currentBoard.notes.length;
        const connCount  = (currentBoard.connections || []).length;
        // Usar currentBoard.notes para garantizar que note.image esté completo y actualizado
        const hasImages  = currentBoard.notes.some(n => n.image);
        const imageCount = currentBoard.notes.filter(n => n.image).length;
        const exportDate = new Date().toLocaleString();
        const boardName  = currentBoard.name;

        // --- URL "Abrir en App" apuntando a la app de GitHub Pages ---
        // Usa Gzip nativo + hash fragment para evitar HTTP 431.
        const APP_BASE_URL = 'https://hectordanielayarachifuentes.github.io/Sticky-Notes/';
        const APP_MAX_HASH = 32000;
        let openInAppUrl = null;
        let imagesIncludedInUrl = false;
        try {
            const urlDataWithImages = getBoardDataForSharing(appState.activeBoardId, true);
            if (urlDataWithImages && isNativeCompressionSupported()) {
                // Intentar con Gzip nativo + imágenes (vía hash)
                const gzWithImages = await nativeCompressToURL(JSON.stringify(urlDataWithImages));
                const tryHash = `gzboard=${gzWithImages}`;

                if (tryHash.length < APP_MAX_HASH) {
                    openInAppUrl = `${APP_BASE_URL}#${tryHash}`;
                    imagesIncludedInUrl = (imageCount > 0);
                } else {
                    // Gzip nativo sin imágenes
                    const safeData = {
                        ...urlDataWithImages,
                        notes: urlDataWithImages.notes.map(n => { const c = {...n}; delete c.image; delete c.imageMini; return c; })
                    };
                    const gzSafe = await nativeCompressToURL(JSON.stringify(safeData));
                    openInAppUrl = `${APP_BASE_URL}#gzboard=${gzSafe}`;
                }
            } else if (urlDataWithImages) {
                // Fallback a LZ-String (navegadores sin CompressionStream)
                const safeData = {
                    ...urlDataWithImages,
                    notes: urlDataWithImages.notes.map(n => { const c = {...n}; delete c.image; delete c.imageMini; return c; })
                };
                const compressedSafe = LZString.compressToEncodedURIComponent(JSON.stringify(safeData));
                openInAppUrl = `${APP_BASE_URL}?board=${encodeURIComponent(compressedSafe)}`;
            }
        } catch(e) {
            console.warn('[export] No se pudo generar URL para App:', e);
        }

        // Construir preview visual de cada nota
        // Usamos currentBoard.notes directamente para garantizar que note.image esté completo
        const notesPreviewHtml = currentBoard.notes.map(note => {
            const activeTab = note.tabs?.[note.activeTab ?? 0] ?? {};
            const title     = (activeTab.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const bodyRaw   = (activeTab.content || '').replace(/<[^>]*>/g, '');
            const body      = bodyRaw.replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 300);
            const color     = note.color || '#fffde7';
            // Las imágenes NO se renderizan en el preview — solo indicador de badge
            const hasImg    = !!note.image;

            // Mostrar todas las pestañas con su contenido (máx 3 pills + contador)
            const allTabs = note.tabs || [];
            const maxPills = 3;
            const tabPills = allTabs.slice(0, maxPills).map((t, i) => {
                const isActive = i === (note.activeTab ?? 0);
                const tabTitle  = (t.title || '').replace(/<[^>]*>/g, '').substring(0, 14);
                const tabBody   = (t.content || '').replace(/<[^>]*>/g, '').substring(0, 60);
                const lbl = tabTitle || tabBody || ('Tab ' + (i+1));
                return '<span class="nc-tab' + (isActive ? ' active' : '') + '" title="' + lbl + '">' + lbl + '</span>';
            }).join('');
            const extraTabs = allTabs.length > maxPills
                ? '<span class="nc-tab" style="opacity:0.5;">+' + (allTabs.length - maxPills) + '</span>'
                : '';
            const tabsHtml  = allTabs.length > 1 ? '<div class="nc-tabs">' + tabPills + extraTabs + '</div>' : '';
            const titleHtml = title ? '<div class="nc-title">' + title + '</div>' : '';
            const bodyHtml  = body  ? '<div class="nc-body">'  + body  + '</div>' : '';
            const badgeHtml = hasImg ? '<span class="nc-img-badge">\uD83D\uDDBC\uFE0F</span>' : '';
            return '<div class="note-card" style="background-color:' + color + '">'
                 + '<div class="nc-content">'
                 + titleHtml + bodyHtml + tabsHtml
                 + '</div>'
                 + badgeHtml
                 + '</div>';
        }).join('');

        // Pre-construir bloque "bomb warning" para evitar templates anidados
        const imgPlural  = imageCount > 1 ? 'es' : '';
        const imgSufixo  = imageCount > 1 ? 's' : '';
        const bombWarningHtml = (hasImages && !imagesIncludedInUrl) ? (
            '<div class="bomb-warning">'
          + '<div class="bomb-icon">'
          + '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">'
          + '<defs><radialGradient id="bombgrad" cx="35%" cy="30%" r="70%">'
          + '<stop offset="0%" stop-color="#ff6b35"/><stop offset="100%" stop-color="#c0392b"/></radialGradient></defs>'
          + '<circle cx="26" cy="30" r="18" fill="#2a1010"/>'
          + '<circle cx="26" cy="30" r="18" fill="url(#bombgrad)" opacity="0.9"/>'
          + '<path d="M26 12 Q30 6 36 4" stroke="#ffcc44" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
          + '<circle cx="36" cy="4" r="3" fill="#ffee44" opacity="0.95">'
          + '<animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite"/>'
          + '<animate attributeName="r" values="3;4.5;3" dur="0.6s" repeatCount="indefinite"/>'
          + '</circle>'
          + '<circle cx="36" cy="4" r="5" fill="#ffaa22" opacity="0.4">'
          + '<animate attributeName="opacity" values="0.4;0;0.4" dur="0.6s" repeatCount="indefinite"/>'
          + '</circle>'
          + '<circle cx="20" cy="24" r="4" fill="rgba(255,255,255,0.1)"/>'
          + '<text x="26" y="35" text-anchor="middle" fill="white" font-size="14" font-weight="900" font-family="sans-serif">!</text>'
          + '</svg></div>'
          + '<div class="bomb-text">'
          + '<div class="bomb-title">\uD83D\uDCA3 \u00a1CUIDADO! Im\u00e1genes muy pesadas a bordo</div>'
          + '<p>Este tablero tiene <strong>' + imageCount + ' imagen' + imgPlural + '</strong>'
          + ' guardada' + imgSufixo + ' en Base64 dentro de este archivo.'
          + ' Si intentaras compartirlo por enlace URL, ser\u00edan <strong>megabytes de datos puros</strong>'
          + ' disparados directamente al navegador \u2014 suficiente para ralentizarlo, congelarlo,'
          + ' o directamente hacerlo <em>crash</em>. \uD83D\uDC80</p>'
          + '<p>\u2705 <strong>Modo seguro activado:</strong> las im\u00e1genes se <strong>excluyen del enlace</strong>'
          + ' autom\u00e1ticamente para no hacerle da\u00f1o a tu navegador (ni al de quien lo reciba).'
          + ' Tus notas y conexiones s\u00ed viajan sin problema.</p>'
          + '<p style="opacity:0.6;font-size:0.79rem;">\uD83D\uDCE6 \u00bfQuieres compartir TODO incluyendo im\u00e1genes?'
          + ' Usa <strong>\u2B07\uFE0F Descargar .json</strong> y env\u00eda ese archivo directamente'
          + ' \u2014 pesa lo que pesa, pero llega completo.</p>'
          + '</div></div>'
        ) : '';

        const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sticky Notes — ${boardName}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3CradialGradient id='a' cx='40%25' cy='30%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%239ba8ff'/%3E%3Cstop offset='100%25' stop-color='%234a3aaa'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='40%25' cy='25%25' r='65%25'%3E%3Cstop offset='0%25' stop-color='%23dde2ff'/%3E%3Cstop offset='100%25' stop-color='%238a98ff'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='32' cy='32' r='32' fill='url(%23a)'/%3E%3Cg fill='url(%23b)'%3E%3Cpath d='M39 13.5l-2-3.5-4 1.4c-.9-.6-1.9-1-3-1.4L29 6h-4l-1 4c-1.1.4-2.1.8-3 1.4l-4-1.4-2 3.5 2.8 2.8C17.6 17.4 17.4 18.7 17.4 20s.2 2.6.4 3.7L15 26.5l2 3.5 4-1.4c.9.6 1.9 1 3 1.4l1 4h4l1-4c1.1-.4 2.1-.8 3-1.4l4 1.4 2-3.5-2.8-2.8c.2-1.1.4-2.4.4-3.7s-.2-2.6-.4-3.7zm-12 11.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10z'/%3E%3Cpath d='M51 34.5l-1.5-2.5-3 1c-.7-.4-1.4-.8-2.2-1l-.8-3h-3l-.8 3c-.8.2-1.5.6-2.2 1l-3-1-1.5 2.5 2.1 2.1c-.2.8-.3 1.6-.3 2.4s.1 1.6.3 2.4l-2.1 2.1 1.5 2.5 3-1c.7.4 1.4.8 2.2 1l.8 3h3l.8-3c.8-.2 1.5-.6 2.2-1l3 1 1.5-2.5-2.1-2.1c.2-.8.3-1.6.3-2.4s-.1-1.6-.3-2.4zm-8 6a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z'/%3E%3C/g%3E%3Ccircle cx='32' cy='32' r='31.5' fill='none' stroke='rgba(255,255,255,0.18)' stroke-width='1'/%3E%3C/svg%3E">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
      min-height: 100vh;
      color: #e0e0f0;
      padding: 2rem 1rem;
    }
    .wrapper { max-width: 960px; margin: 0 auto; }

    /* ── Header ── */
    header {
      display: flex; align-items: center; gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 1.2rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .logo { font-size: 2.4rem; line-height: 1; }
    header h1 { font-size: 1.6rem; font-weight: 700; }
    header h1 span { color: #7b8aff; }
    header p { font-size: 0.82rem; opacity: 0.55; margin-top: 3px; }

    /* ── Stats cards ── */
    .stats {
      display: flex; flex-wrap: wrap; gap: 0.8rem;
      margin-bottom: 1.6rem;
    }
    .stat-card {
      flex: 1 1 140px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 0.9rem 1.1rem;
    }
    .stat-card .val { font-size: 1.8rem; font-weight: 700; color: #7b8aff; }
    .stat-card .lbl { font-size: 0.78rem; opacity: 0.55; margin-top: 2px; }

    /* ── Toolbar ── */
    .toolbar {
      display: flex; gap: 0.6rem; flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 0.5rem 1rem;
      background: rgba(123,138,255,0.15);
      border: 1px solid rgba(123,138,255,0.35);
      border-radius: 7px;
      color: #b0baff;
      font-size: 0.84rem;
      cursor: pointer;
      transition: background 0.18s, transform 0.12s;
      user-select: none;
    }
    .btn:hover { background: rgba(123,138,255,0.28); transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }
    .btn.success { border-color: rgba(52,199,89,0.5); color: #5ae07e; background: rgba(52,199,89,0.1); }
    .btn-app {
      border-color: rgba(123,138,255,0.6) !important;
      background: rgba(123,138,255,0.22) !important;
      color: #d0d8ff !important;
      text-decoration: none;
      font-weight: 600;
    }
    .btn-app:hover { background: rgba(123,138,255,0.38) !important; }

    /* ── Image limitation notice ── */
    .img-notice {
      display: flex; gap: 1.2rem; align-items: flex-start;
      background: linear-gradient(135deg, rgba(255,179,60,0.08) 0%, rgba(255,140,0,0.04) 100%);
      border: 1px solid rgba(255,168,50,0.3);
      border-left: 4px solid #ffaa32;
      border-radius: 12px;
      padding: 1.2rem 1.4rem;
      margin-bottom: 1.8rem;
    }
    .img-notice svg { flex-shrink: 0; margin-top: 2px; }
    .img-notice h3 { font-size: 0.96rem; font-weight: 700; color: #ffcc70; margin-bottom: 0.4rem; }
    .img-notice p  { font-size: 0.82rem; line-height: 1.6; opacity: 0.78; margin-bottom: 0.35rem; }
    .img-notice p:last-child { margin-bottom: 0; }
    .img-notice strong { color: #ffd080; }
    .img-notice .badge {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(255,168,50,0.18); border-radius: 5px;
      padding: 1px 7px; font-size: 0.78rem; color: #ffc060; font-weight: 600;
    }

    /* ── Code block ── */
    .code-wrap {
      background: #0d0d1a;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      overflow: hidden;
    }
    .code-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.6rem 1rem;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      font-size: 0.78rem; opacity: 0.5;
    }
    pre {
      overflow-x: auto;
      padding: 1.4rem 1.2rem;
      font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
      font-size: 0.83rem;
      line-height: 1.65;
      /* Sin límite de altura — el JSON se muestra completo */
    }
    pre::-webkit-scrollbar { width: 6px; height: 6px; }
    pre::-webkit-scrollbar-track { background: transparent; }
    pre::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 10px; }

    /* Syntax colors */
    .k { color: #79b8ff; }   /* key */
    .s { color: #9ecbff; }   /* string */
    .n { color: #f8c555; }   /* number */
    .b { color: #79c0ff; }   /* boolean */
    .nil { color: #ff7b72; } /* null */

    /* ── Notes preview ── */
    .section-title {
      font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; opacity: 0.45;
      margin: 1.8rem 0 0.8rem;
    }
    .notes-grid {
      display: flex; flex-wrap: wrap; gap: 1rem;
      margin-bottom: 1.8rem;
    }
    .note-card {
      flex: 1 1 200px; max-width: 280px; min-height: 160px;
      border-radius: 10px;
      padding: 0;
      display: flex; flex-direction: column;
      position: relative; overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.45);
    }
    /* Imagen de fondo embebida como <img> — siempre visible */
    .note-card .nc-bg-img {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover; object-position: center;
      display: block;
      /* Overlay oscuro igual que en la app */
      filter: brightness(0.72);
    }
    /* Contenido por encima de la imagen */
    .nc-content {
      position: relative; z-index: 2;
      padding: 12px 14px;
      display: flex; flex-direction: column; gap: 6px;
      height: 100%;
    }
    .note-card .nc-title {
      font-weight: 700; font-size: 0.88rem; line-height: 1.3;
      color: #1a1a2e;
      overflow: hidden; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .note-card.has-img .nc-title,
    .note-card.has-img .nc-body {
      background: rgba(0,0,0,0.45); border-radius: 4px;
      padding: 2px 6px; color: #fff;
      text-shadow: 0 1px 3px rgba(0,0,0,0.9);
    }
    .note-card .nc-body {
      font-size: 0.78rem; color: #2a2a3a; line-height: 1.5;
      overflow: hidden; display: -webkit-box;
      -webkit-line-clamp: 5; -webkit-box-orient: vertical;
    }
    .note-card .nc-img-badge {
      position: absolute; top: 6px; right: 8px; z-index: 3;
      font-size: 13px; opacity: 0.85;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));
    }
    .note-card .nc-tabs {
      margin-top: auto;
      display: flex; gap: 4px; flex-wrap: nowrap; overflow: hidden;
    }
    .note-card .nc-tab {
      font-size: 0.65rem;
      color: #1a1a2e;
      background: rgba(0,0,0,0.14);
      border-radius: 4px; padding: 2px 7px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px;
    }
    .note-card.has-img .nc-tab {
      background: rgba(0,0,0,0.4); color: #fff;
    }
    .note-card .nc-tab.active { font-weight: 700; background: rgba(0,0,0,0.28); }


    /* ── Footer ── */
    footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.76rem;
      opacity: 0.3;
    }
    @keyframes blink-red {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 rgba(255,60,60,0); }
      50%       { opacity: 0.6; box-shadow: 0 0 12px rgba(255,60,60,0.5); }
    }

    /* ── Bomb warning ── */
    .bomb-warning {
      display: flex; gap: 1.2rem; align-items: flex-start;
      background: linear-gradient(135deg, rgba(192,57,43,0.12) 0%, rgba(255,107,53,0.07) 100%);
      border: 1px solid rgba(255,80,60,0.35);
      border-left: 4px solid #ff4d3a;
      border-radius: 12px;
      padding: 1.2rem 1.4rem;
      margin-bottom: 1.6rem;
      animation: bomb-pulse 2.5s ease-in-out infinite;
    }
    @keyframes bomb-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(255,77,58,0); }
      50%       { box-shadow: 0 0 18px 2px rgba(255,77,58,0.18); }
    }
    .bomb-icon { flex-shrink: 0; margin-top: 2px; }
    .bomb-title {
      font-size: 1rem; font-weight: 800; color: #ff7060;
      margin-bottom: 0.5rem; letter-spacing: 0.01em;
    }
    .bomb-text p { font-size: 0.83rem; line-height: 1.65; opacity: 0.82; margin-bottom: 0.4rem; }
    .bomb-text p:last-child { margin-bottom: 0; }
    .bomb-text strong { color: #ffa090; }
  </style>
</head>
<body>
<div class="wrapper">

  <header>
    <div class="logo">📋</div>
    <div>
      <h1>Sticky Notes — <span>${boardName}</span></h1>
      <p>Exportado el ${exportDate}</p>
    </div>
  </header>

  <div class="stats">
    <div class="stat-card"><div class="val">${noteCount}</div><div class="lbl">Notas</div></div>
    <div class="stat-card"><div class="val">${connCount}</div><div class="lbl">Conexiones</div></div>
    <div class="stat-card" style="${hasImages ? 'border-color:rgba(255,168,50,0.3);' : ''}">
      <div class="val" style="${hasImages ? 'color:#ffaa32;' : ''}">${imageCount > 0 ? imageCount : '0'}</div>
      <div class="lbl">${hasImages ? 'Im\u00e1genes (en JSON)' : 'Sin im\u00e1genes'}</div>
      ${hasImages ? '<div style="font-size:0.7rem;color:#ffaa32;margin-top:4px;opacity:0.8;">\u2139\uFE0F Ver con importaci\u00f3n JSON</div>' : ''}
    </div>
  </div>

  ${bombWarningHtml}

  ${noteCount > 0 ? '<p class="section-title">Vista previa de notas</p><div class="notes-grid">' + notesPreviewHtml + '</div>' : ''}

  ${(hasImages && !imagesIncludedInUrl) ? (
    '<div class="img-notice">'
  + '<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">'
  + '<circle cx="28" cy="28" r="28" fill="rgba(255,168,50,0.12)"/>'
  + '<path d="M14 34a7 7 0 0 1 1.2-13.8A10 10 0 0 1 34 22a6 6 0 0 1 .5 12H14z" fill="#ffb830" opacity=".7"/>'
  + '<line x1="28" y1="26" x2="28" y2="36" stroke="#ff6b6b" stroke-width="2.2" stroke-linecap="round"/>'
  + '<polyline points="24,32 28,36 32,32" fill="none" stroke="#ff6b6b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
  + '<rect x="34" y="34" width="12" height="10" rx="2" fill="#ffaa32" opacity=".9"/>'
  + '<path d="M36 34v-2a4 4 0 0 1 8 0v2" stroke="#ffaa32" stroke-width="2" fill="none" stroke-linecap="round"/>'
  + '<circle cx="40" cy="39" r="1.5" fill="#1a1a2e"/>'
  + '</svg>'
  + '<div>'
  + '<h3>\uD83D\uDDBC\uFE0F Las im\u00e1genes no aparecer\u00e1n en el enlace online</h3>'
  + '<p>Este tablero contiene <strong>' + imageCount + ' nota' + imgPlural + ' con imagen</strong>.'
  + ' Las im\u00e1genes est\u00e1n guardadas en este archivo HTML como datos en Base64,'
  + ' pero los navegadores tienen un l\u00edmite de longitud de URL de'
  + ' <strong>\u223C\u00a02\u202F000\u2013-8\u202F000 caracteres</strong>.'
  + ' Una imagen comprimida puede superar ese l\u00edmite, haciendo que el bot\u00f3n'
  + ' <span class="badge">\uD83D\uDE80 Abrir en App</span> la omita autom\u00e1ticamente.</p>'
  + '<p>\u2705 <strong>C\u00f3mo ver las im\u00e1genes en la app:</strong>'
  + ' usa el bot\u00f3n <span class="badge">\u2B07\uFE0F Descargar\u00a0.json</span>,'
  + ' luego en Sticky Notes \u2192 Compartir \u2192 <strong>&quot;Importar desde JSON&quot;</strong>'
  + ' y selecciona ese archivo. Las im\u00e1genes se restaurar\u00e1n completamente.</p>'
  + '</div>'
  + '</div>'
  ) : ''}

  <!-- Botón parpadeante que aparece al volver del tutorial -->
  <div id="replay-tutorial-btn-wrap" style="margin-bottom:1rem;">
    <button id="replay-tutorial-btn" onclick="confirmOpenApp()" style="display:none;animation:blink-red 1.1s ease-in-out infinite;align-items:center;gap:8px;padding:0.5rem 1.2rem;border-radius:9px;border:2px solid #ff4444;background:rgba(255,60,60,0.15);color:#ff7070;cursor:pointer;font-size:0.86rem;font-weight:700;">
      \uD83D\uDD34 Ver tutorial de nuevo
    </button>
  </div>

  <div class="toolbar">
    <button class="btn" id="copyBtn" onclick="copyJson()">📋 Copiar JSON</button>
    <button class="btn" onclick="downloadJson()">⬇️ Descargar .json puro</button>
    ${openInAppUrl ? `<button class="btn btn-app" onclick="openInAppModal()">🚀 Abrir en Sticky Notes App</button>` : ''}
  </div>

  <div class="code-wrap">
    <div class="code-header">
      <span>JSON · ${boardName}.json</span>
      <span id="charCount">${boardJson.length.toLocaleString()} chars</span>
    </div>
    <pre id="jsonBlock"><code>${highlighted}</code></pre>
  </div>

  <footer>Generado por Sticky Notes App &middot; HectorDanielAyarachiFuentes</footer>

  <!-- Modal de advertencia para 'Abrir en App' -->
  <div id="app-modal" style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;">
    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(255,168,50,0.35);border-top:3px solid #ffaa32;border-radius:16px;max-width:440px;width:90%;padding:2rem;box-shadow:0 20px 60px rgba(0,0,0,0.7);">
      <div style="display:flex;gap:1rem;align-items:center;margin-bottom:1rem;">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="rgba(255,150,40,0.15)"/>
          <!-- Nube -->
          <path d="M10 30a6 6 0 0 1 1-11.8A8.5 8.5 0 0 1 29.5 19a5 5 0 0 1 .5 10H10z" fill="#ffb830" opacity=".75"/>
          <!-- Imagen enmarcada -->
          <rect x="15" y="16" width="10" height="9" rx="1.5" fill="none" stroke="#fff" stroke-width="1.5" opacity=".5"/>
          <circle cx="17.5" cy="18.5" r="1" fill="#fff" opacity=".5"/>
          <path d="M15 23l3-3 2.5 2.5L23 20l2 5" stroke="#fff" stroke-width="1" fill="none" opacity=".4"/>
          <!-- Tachado rojo -->
          <line x1="27" y1="27" x2="35" y2="35" stroke="#ff5555" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="35" y1="27" x2="27" y2="35" stroke="#ff5555" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <div>
          <div style="font-size:1rem;font-weight:700;color:#ffcc70;margin-bottom:3px;">🛈 Aviso sobre las imágenes</div>
          <div style="font-size:0.78rem;opacity:0.55;">Antes de abrir la app online&hellip;</div>
        </div>
      </div>
      <p style="font-size:0.85rem;line-height:1.65;margin-bottom:0.9rem;opacity:0.82;">Las <strong style="color:#ffd080;">imágenes adjuntas a tus notas</strong> no podrán incluirse en el enlace online. Los navegadores limitan la longitud de las URLs y una foto en Base64 supera ese límite automáticamente.</p>
      <p style="font-size:0.85rem;line-height:1.65;margin-bottom:1.4rem;opacity:0.82;">✅ Las imágenes sí están guardadas en este archivo. Para verlas completas, usa <strong style="color:#ffd080;">⋯ Descargar .json</strong> e impórtalo en <em>Compartir &rarr; Importar desde JSON</em>.</p>
      <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
        <button onclick="closeModal()" style="padding:0.5rem 1.1rem;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.6);cursor:pointer;font-size:0.84rem;">Cancelar</button>
        <button onclick="confirmOpenApp()" style="padding:0.5rem 1.2rem;border-radius:8px;border:none;background:linear-gradient(135deg,#5a6aff,#8a60ff);color:#fff;font-weight:700;cursor:pointer;font-size:0.84rem;">Continuar de todas formas →</button>
      </div>
    </div>
  </div>

</div>

<!-- ====== TUTORIAL OVERLAY ====== -->
<div id="tutorial-overlay" style="display:none;position:fixed;inset:0;z-index:10000;background:linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 60%,#0d1a3a 100%);flex-direction:column;align-items:center;justify-content:flex-start;padding:3rem 1.5rem 4rem;overflow-y:auto;">

  <!-- Estado 1: Redirigiendo... (visible 2s) -->
  <div id="tut-redirecting" style="text-align:center;margin:auto;width:100%;max-width:480px;padding:2rem 0;">
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" style="margin-bottom:1.5rem;">
      <circle cx="50" cy="50" r="48" fill="rgba(123,138,255,0.1)" stroke="rgba(123,138,255,0.3)" stroke-width="2"/>
      <!-- Cohete -->
      <ellipse cx="50" cy="45" rx="9" ry="18" fill="#7b8aff"/>
      <polygon points="50,20 44,38 56,38" fill="#a0b0ff"/>
      <rect x="43" y="55" width="14" height="8" rx="2" fill="#5a6aff"/>
      <!-- Llamas -->
      <ellipse cx="47" cy="67" rx="3" ry="5" fill="#ff9f43" opacity=".9"/>
      <ellipse cx="53" cy="67" rx="3" ry="5" fill="#ff9f43" opacity=".9"/>
      <ellipse cx="50" cy="70" rx="4" ry="7" fill="#ffcc44" opacity=".7"/>
      <!-- Ventana -->
      <circle cx="50" cy="44" r="4" fill="rgba(200,220,255,0.7)"/>
      <!-- Anillo girando -->
      <circle cx="50" cy="50" r="46" stroke="rgba(123,138,255,0.2)" stroke-width="4" stroke-dasharray="30 250" fill="none">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="1.5s" repeatCount="indefinite"/>
      </circle>
    </svg>
    <h2 style="font-size:1.5rem;font-weight:700;color:#a0b0ff;margin-bottom:0.5rem;">Abriendo Sticky Notes App\u2026</h2>
    <p style="opacity:0.5;font-size:0.88rem;">La app se abri\u00f3 en una nueva pesta\u00f1a. \u00bfNo se abri\u00f3? Puede que el navegador lo bloque\u00f3.</p>
    <p style="opacity:0.35;font-size:0.78rem;margin-top:0.4rem;">En 2 segundos ver\u00e1s c\u00f3mo recuperar tus im\u00e1genes\u2026</p>
  </div>

  <!-- Estado 2: Guía paso a paso (oculta hasta los 2s) -->
  <div id="tut-guide" style="display:none;max-width:680px;width:100%;">
    <!-- Botón volver -->
    <div style="margin-bottom:1.5rem;">
      <button onclick="closeTutorial()" style="display:inline-flex;align-items:center;gap:8px;padding:0.65rem 1.4rem;border-radius:10px;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.08);color:#e0e0f0;cursor:pointer;font-size:0.92rem;font-weight:600;letter-spacing:0.01em;">
        ← Volver al tablero exportado
      </button>
    </div>
    <div style="text-align:center;margin-bottom:2.2rem;">
      <!-- Emoji con guasca -->
      <div style="font-size:2.4rem;margin-bottom:0.3rem;">\uD83D\uDE02</div>
      <h2 style="font-size:1.5rem;font-weight:900;color:#ffd080;margin-bottom:0.35rem;letter-spacing:-0.01em;">\u00a1Te lo dijimos! jeje...</h2>
      <p style="opacity:0.6;font-size:0.88rem;margin-bottom:0.25rem;">Pero no pasa nada, \u00a1aqu\u00ed est\u00e1 c\u00f3mo hacerlo bien!</p>
      <p style="opacity:0.45;font-size:0.8rem;">Las im\u00e1genes est\u00e1n guardadas en el <strong style="color:#ffd080;">.json</strong>. Sigue estos pasos:</p>
    </div>

    <!-- Paso 1 -->
    <div style="display:flex;gap:1.2rem;align-items:flex-start;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.2rem 1.4rem;margin-bottom:1rem;">
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style="flex-shrink:0;">
        <circle cx="26" cy="26" r="26" fill="rgba(255,179,60,0.12)"/>
        <rect x="14" y="12" width="24" height="28" rx="3" fill="none" stroke="#ffaa32" stroke-width="2"/>
        <text x="26" y="22" text-anchor="middle" fill="#ffaa32" font-size="7" font-family="monospace">.json</text>
        <line x1="26" y1="27" x2="26" y2="36" stroke="#ffcc44" stroke-width="2" stroke-linecap="round"/>
        <polyline points="21,33 26,38 31,33" fill="none" stroke="#ffcc44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="8" cy="8" r="7" fill="#ffaa32"/>
        <text x="8" y="12" text-anchor="middle" fill="#1a1a2e" font-size="9" font-weight="bold">1</text>
      </svg>
      <div>
        <div style="font-weight:700;color:#ffd080;font-size:0.95rem;margin-bottom:0.3rem;">Descarga el archivo .json</div>
        <p style="font-size:0.82rem;opacity:0.7;line-height:1.6;margin-bottom:0.6rem;">Necesitas el archivo <code style="background:rgba(255,168,50,0.12);padding:1px 5px;border-radius:3px;color:#ffcc70;">.json</code> que tiene <em>las im\u00e1genes completas</em>. Puedes volver al HTML o descargarlo directamente desde aqu\u00ed:</p>
        <button onclick="downloadJson()" style="display:inline-flex;align-items:center;gap:6px;padding:0.45rem 1rem;border-radius:8px;border:1px solid rgba(255,168,50,0.4);background:rgba(255,168,50,0.12);color:#ffc060;cursor:pointer;font-size:0.82rem;font-weight:600;">
          \u2B07\uFE0F Descargar .json puro desde aqu\u00ed
        </button>
      </div>
    </div>

    <!-- Paso 2 -->
    <div style="display:flex;gap:1.2rem;align-items:flex-start;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.2rem 1.4rem;margin-bottom:1rem;">
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style="flex-shrink:0;">
        <circle cx="26" cy="26" r="26" fill="rgba(100,150,255,0.12)"/>
        <rect x="10" y="16" width="32" height="20" rx="3" fill="none" stroke="#7b8aff" stroke-width="2"/>
        <rect x="10" y="16" width="32" height="6" rx="2" fill="rgba(123,138,255,0.25)"/>
        <circle cx="14" cy="19" r="1.5" fill="#ff6b6b"/>
        <circle cx="19" cy="19" r="1.5" fill="#ffd043"/>
        <circle cx="24" cy="19" r="1.5" fill="#45e06f"/>
        <line x1="14" y1="27" x2="38" y2="27" stroke="rgba(123,138,255,0.4)" stroke-width="1.5"/>
        <line x1="14" y1="30" x2="30" y2="30" stroke="rgba(123,138,255,0.3)" stroke-width="1.5"/>
        <circle cx="8" cy="8" r="7" fill="#7b8aff"/>
        <text x="8" y="12" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">2</text>
      </svg>
      <div>
        <div style="font-weight:700;color:#a0b0ff;font-size:0.95rem;margin-bottom:0.3rem;">Abre la app (ya se abri\u00f3 en una pesta\u00f1a)</div>
        <p style="font-size:0.82rem;opacity:0.7;line-height:1.6;">Ve a la pesta\u00f1a que se abri\u00f3 con Sticky Notes App. Si se cerr\u00f3 o fue bloqueada, usa el bot\u00f3n de abajo para abrirla de nuevo.</p>
      </div>
    </div>

    <!-- Paso 3 -->
    <div style="display:flex;gap:1.2rem;align-items:flex-start;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.2rem 1.4rem;margin-bottom:1rem;">
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style="flex-shrink:0;">
        <circle cx="26" cy="26" r="26" fill="rgba(80,200,120,0.1)"/>
        <!-- Sidebar -->
        <rect x="10" y="14" width="14" height="24" rx="2" fill="rgba(80,200,120,0.15)" stroke="rgba(80,200,120,0.5)" stroke-width="1.5"/>
        <!-- Tabs en sidebar -->
        <rect x="12" y="17" width="10" height="3" rx="1" fill="rgba(80,200,120,0.4)"/>
        <rect x="12" y="22" width="10" height="3" rx="1" fill="rgba(80,200,120,0.25)"/>
        <rect x="12" y="27" width="10" height="3" rx="1" fill="rgba(80,200,120,0.25)"/>
        <!-- Tab "Compartir" destacado -->
        <rect x="28" y="20" width="14" height="6" rx="2" fill="#45c87a"/>
        <text x="35" y="24.5" text-anchor="middle" fill="#fff" font-size="5" font-weight="bold">Compartir</text>
        <!-- Flecha apuntando -->
        <path d="M25 23l3-3 3 3" fill="none" stroke="#45c87a" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="8" cy="8" r="7" fill="#45c87a"/>
        <text x="8" y="12" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">3</text>
      </svg>
      <div>
        <div style="font-weight:700;color:#6fefaa;font-size:0.95rem;margin-bottom:0.3rem;">Ve a la pesta\u00f1a Compartir</div>
        <p style="font-size:0.82rem;opacity:0.7;line-height:1.6;">En la barra lateral de la app, haz click en la pesta\u00f1a <strong style="background:rgba(80,200,120,0.15);padding:1px 6px;border-radius:4px;color:#6fefaa;">\uD83D\uDD17 Compartir</strong> (el \u00edcono de cadena). Ver\u00e1s las opciones de compartir y exportar.</p>
      </div>
    </div>

    <!-- Paso 4 -->
    <div style="display:flex;gap:1.2rem;align-items:flex-start;background:rgba(255,255,255,0.04);border:1px solid rgba(123,138,255,0.25);border-radius:14px;padding:1.2rem 1.4rem;margin-bottom:2rem;">
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style="flex-shrink:0;">
        <circle cx="26" cy="26" r="26" fill="rgba(160,120,255,0.12)"/>
        <!-- Bot\u00f3n importar -->
        <rect x="10" y="20" width="32" height="12" rx="4" fill="rgba(140,100,255,0.3)" stroke="#8a60ff" stroke-width="1.5"/>
        <!-- Flecha arriba -->
        <line x1="26" y1="29" x2="26" y2="23" stroke="#c0aaff" stroke-width="2" stroke-linecap="round"/>
        <polyline points="22,26 26,22 30,26" fill="none" stroke="#c0aaff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="26" y="24" text-anchor="middle" fill="transparent" font-size="5">Importar</text>
        <!-- Check de \u00e9xito -->
        <circle cx="38" cy="14" r="8" fill="#45c87a"/>
        <polyline points="34,14 37,17 42,11" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="8" cy="8" r="7" fill="#8a60ff"/>
        <text x="8" y="12" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">4</text>
      </svg>
      <div>
        <div style="font-weight:700;color:#c0aaff;font-size:0.95rem;margin-bottom:0.3rem;">Click en \u201cImportar desde JSON\u201d y selecciona el archivo</div>
        <p style="font-size:0.82rem;opacity:0.7;line-height:1.6;">Dentro de <em>Compartir</em>, busca la tarjeta <strong style="background:rgba(140,100,255,0.15);padding:1px 6px;border-radius:4px;color:#c0aaff;">\uD83D\uDCE5 Importar desde JSON</strong>, haz click y selecciona el archivo <code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:3px;">.json</code> que descargaste. \u00a1Tus notas e im\u00e1genes se restaurar\u00e1n al 100%!</p>
      </div>
    </div>

    <!-- Botón CTA final -->
    <div style="text-align:center;">
      <a href="https://hectordanielayarachifuentes.github.io/Sticky-Notes/" target="_blank" rel="noopener"
         style="display:inline-flex;align-items:center;gap:10px;padding:0.85rem 2rem;background:linear-gradient(135deg,#5a6aff,#8a60ff);border-radius:12px;color:#fff;font-weight:800;font-size:1rem;text-decoration:none;box-shadow:0 6px 24px rgba(100,100,255,0.35);">
        \uD83D\uDE80 Ir a Sticky Notes App y aplicar lo aprendido
      </a>
      <p style="margin-top:0.8rem;font-size:0.77rem;opacity:0.35;">Recuerda descargar el .json primero (botón del paso 1).</p>
    </div>
  </div>
</div>
<script>
  const RAW_JSON = ${JSON.stringify(boardJson)};

  function copyJson() {
    navigator.clipboard.writeText(RAW_JSON).then(() => {
      const btn = document.getElementById('copyBtn');
      btn.textContent = '✅ ¡Copiado!';
      btn.classList.add('success');
      setTimeout(() => { btn.textContent = '📋 Copiar JSON'; btn.classList.remove('success'); }, 2000);
    });
  }

  function downloadJson() {
    const a = document.createElement('a');
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(RAW_JSON);
    a.download = ${JSON.stringify(boardName.replace(/ /g, '_') + '.json')};
    a.click();
  }

  const APP_URL = ${JSON.stringify(openInAppUrl || '')};
  const HAS_IMAGES = ${(hasImages && !imagesIncludedInUrl) ? 'true' : 'false'};

  function openInAppModal() {
    if (!APP_URL) return;
    // Si no hay imágenes, abrir directamente sin advertencia
    if (!HAS_IMAGES) { window.open(APP_URL, '_blank', 'noopener'); return; }
    document.getElementById('app-modal').style.display = 'flex';
  }
  function closeModal() {
    document.getElementById('app-modal').style.display = 'none';
  }
  function confirmOpenApp() {
    closeModal();
    // Abrir la app en nueva pestaña
    if (APP_URL) window.open(APP_URL, '_blank', 'noopener');

    // Bloquear scroll del body mientras el overlay esté visible
    document.body.style.overflow = 'hidden';

    // Mostrar pantalla de "Redirigiendo..." y luego la guía
    const overlay = document.getElementById('tutorial-overlay');
    overlay.style.display = 'flex';
    // Después de 2 segundos, transicionar a la guía
    setTimeout(() => {
      document.getElementById('tut-redirecting').style.display = 'none';
      document.getElementById('tut-guide').style.display = 'block';
    }, 2000);
  }

  // Cerrar al hacer click fuera del modal de advertencia
  document.getElementById('app-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('app-modal')) closeModal();
  });
  // Cerrar modal de advertencia con Escape
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  function closeTutorial() {
    // Ocultar el overlay del tutorial
    document.getElementById('tutorial-overlay').style.display = 'none';
    // Restaurar scroll del body
    document.body.style.overflow = '';
    // Resetear para la próxima vez
    document.getElementById('tut-redirecting').style.display = 'block';
    document.getElementById('tut-guide').style.display = 'none';
    // Mostrar el botón rojo parpadeante "Ver tutorial de nuevo"
    const replayBtn = document.getElementById('replay-tutorial-btn');
    if (replayBtn) replayBtn.style.display = 'inline-flex';
    // Scroll arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
<\/script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const filename = `${currentBoard.name.replace(/ /g, '_')}.html`;
        triggerDownload(blob, filename);
        showToast(`📄 Tablero "${currentBoard.name}" exportado como HTML+JSON.`);
    }

    /**
     * Maneja la selección de un archivo JSON para importar.
     * @param {Event} event 
     */
    function handleJsonImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!Array.isArray(importedData.notes)) {
                    throw new Error("El archivo JSON no tiene el formato de tablero esperado.");
                }
                const newBoardName = `Copia de ${file.name.replace('.json', '')}`;
                const newBoardId = createBoardFromData(importedData, newBoardName);
                switchBoard(newBoardId);
                showToast(`Tablero "${newBoardName}" importado con éxito.`);
            } catch (error) {
                console.error("Error al importar el JSON:", error);
                showToast("Error: El archivo no es un JSON de tablero válido.");
            } finally {
                event.target.value = ''; // Reseteamos el input
            }
        };
        reader.readAsText(file);
    }

    // --- LÓGICA PARA IMPORTAR (se ejecuta al cargar la página) ---
    handleImportFromURL();

    // Log de soporte de compresión nativa
    if (isNativeCompressionSupported()) {
        console.log('[exportar] ✅ CompressionStream nativo disponible. Los enlaces usarán Gzip + hash fragment.');
    } else {
        console.warn('[exportar] ⚠️ CompressionStream no soportado. Se usará LZ-String como fallback.');
    }
}