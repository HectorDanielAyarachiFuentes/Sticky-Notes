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
     */
    function handleImportFromURL() {
        // Usamos directamente window.location.search con decodeURIComponent para evitar
        // que URLSearchParams convierta los '+' en espacios (rompe el dato de LZ-String).
        const rawSearch = window.location.search;
        const boardMatch = rawSearch.match(/[?&]board=([^&]*)/);
        const boardDataParam = boardMatch ? decodeURIComponent(boardMatch[1]) : null;

        if (boardDataParam) {
            try {
                // Descomprimir con LZ-String y parsear el JSON.
                const jsonString = LZString.decompressFromEncodedURIComponent(boardDataParam);
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
            }
        }
    }

    /**
     * Maneja la generación y copia del enlace para compartir.
     * Pipeline de imágenes:
     *   1. Intenta con miniaturas (imageMini) en el payload.
     *   2. Si aún supera 8000 chars, descarta las imágenes del enlace.
     */
    async function handleShareLink() {
        const activeBoardId = getActiveBoardId(); 
        if (!activeBoardId) { showToast('Primero selecciona un tablero para compartir.'); return; }

        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }

        shareLinkOutput.style.display = 'block';
        shareLinkOutput.value = 'Generando enlace...';

        try {
            const baseUrl = window.location.origin + window.location.pathname;
            let boardData;
            let imagesWereStripped = false;

            // --- Intento 1: Con miniaturas ---
            boardData = getBoardDataForSharing(activeBoardId, true);
            if (!boardData) { showToast('Error al recopilar los datos del tablero.'); return; }

            let jsonString = JSON.stringify(boardData);
            let compressed = LZString.compressToEncodedURIComponent(jsonString);
            let shareUrl  = `${baseUrl}?board=${encodeURIComponent(compressed)}`;

            // --- Intento 2: Demasiado largo → quitar todas las imágenes ---
            if (shareUrl.length > 8000) {
                const strippedData = getBoardDataForSharing(activeBoardId, false);
                // Eliminar imágenes de todas las notas
                strippedData.notes = strippedData.notes.map(note => {
                    const n = { ...note };
                    delete n.image;
                    delete n.imageMini;
                    return n;
                });
                jsonString = JSON.stringify(strippedData);
                compressed = LZString.compressToEncodedURIComponent(jsonString);
                shareUrl   = `${baseUrl}?board=${encodeURIComponent(compressed)}`;
                imagesWereStripped = true;
            }

            shareLinkOutput.value = shareUrl;
            shareLinkOutput.select();
            await navigator.clipboard.writeText(shareUrl);

            if (imagesWereStripped) {
                showToast('🔗 Enlace generado. Las imágenes se omitieron por su tamaño — usa «Exportar a JSON» para el tablero completo.');
            } else {
                showToast('✅ ¡Enlace generado y copiado al portapapeles!');
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
    function exportBoardToJson() {
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
        // Se genera aquí (en tiempo de exportación) porque LZString está disponible en el contexto de la app.
        const APP_BASE_URL = 'https://hectordanielayarachifuentes.github.io/Sticky-Notes/';
        let openInAppUrl = null;
        try {
            const urlData = getBoardDataForSharing(appState.activeBoardId, true); // usar miniaturas
            if (urlData) {
                const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(urlData));
                openInAppUrl = `${APP_BASE_URL}?board=${encodeURIComponent(compressed)}`;
                // Si supera ~8000 chars, quitar imágenes para que el link funcione
                if (openInAppUrl.length > 8000) {
                    const stripped = { ...urlData, notes: urlData.notes.map(n => { const c = {...n}; delete c.image; delete c.imageMini; return c; }) };
                    const comp2 = LZString.compressToEncodedURIComponent(JSON.stringify(stripped));
                    openInAppUrl = `${APP_BASE_URL}?board=${encodeURIComponent(comp2)}`;
                }
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

            // Imagen: se usa <img src="base64"> con overlay, más confiable que background-image inline
            const imgTag    = note.image
                ? `<img class="nc-bg-img" src="${note.image}" alt="Imagen adjunta">`
                : '';
            const hasImg    = !!note.image;

            const tabPills  = (note.tabs || []).map((t, i) => {
                const isActive = i === (note.activeTab ?? 0);
                const lbl = (t.title || t.content || '').replace(/<[^>]*>/g, '').substring(0, 14) || `Tab ${i+1}`;
                return `<span class="nc-tab${isActive ? ' active' : ''}">${lbl}</span>`;
            }).join('');

            return `
              <div class="note-card${hasImg ? ' has-img' : ''}" style="background-color:${color}">
                ${imgTag}
                <div class="nc-content">
                  ${title ? `<div class="nc-title">${title}</div>` : ''}
                  ${body  ? `<div class="nc-body">${body}</div>`   : ''}
                  ${note.tabs?.length > 1 ? `<div class="nc-tabs">${tabPills}</div>` : ''}
                </div>
                ${hasImg ? '<span class="nc-img-badge">\uD83D\uDDBC\uFE0F</span>' : ''}
              </div>`;
        }).join('');

        const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sticky Notes — ${boardName}</title>
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
      font-size: 0.78rem; opacity: 0.8; line-height: 1.5;
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
      display: flex; gap: 3px; flex-wrap: wrap;
    }
    .note-card .nc-tab {
      font-size: 0.65rem; opacity: 0.6;
      background: rgba(0,0,0,0.18);
      border-radius: 4px; padding: 1px 6px;
    }
    .note-card.has-img .nc-tab {
      background: rgba(0,0,0,0.4); color: #fff;
    }
    .note-card .nc-tab.active { opacity: 1; background: rgba(0,0,0,0.35); font-weight: 700; }


    /* ── Footer ── */
    footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.76rem;
      opacity: 0.3;
    }
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
    <div class="stat-card"><div class="val">${hasImages ? imageCount : '\u2014'}</div><div class="lbl">Con imagen</div></div>
  </div>

  ${noteCount > 0 ? `<p class="section-title">Vista previa de notas</p>
  <div class="notes-grid">${notesPreviewHtml}</div>` : ''}

  ${hasImages ? `
  <div class="img-notice">
    <!-- SVG: nube con flecha de descarga + candado -->
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="28" fill="rgba(255,168,50,0.12)"/>
      <!-- Nube -->
      <path d="M14 34a7 7 0 0 1 1.2-13.8A10 10 0 0 1 34 22a6 6 0 0 1 .5 12H14z" fill="#ffb830" opacity=".7"/>
      <!-- Flecha abajo con tachado (X) -->
      <line x1="28" y1="26" x2="28" y2="36" stroke="#ff6b6b" stroke-width="2.2" stroke-linecap="round"/>
      <polyline points="24,32 28,36 32,32" fill="none" stroke="#ff6b6b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Candado -->
      <rect x="34" y="34" width="12" height="10" rx="2" fill="#ffaa32" opacity=".9"/>
      <path d="M36 34v-2a4 4 0 0 1 8 0v2" stroke="#ffaa32" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="40" cy="39" r="1.5" fill="#1a1a2e"/>
    </svg>
    <div>
      <h3>\uD83D\uDDBC\uFE0F Las im\u00e1genes no aparecer\u00e1n en el enlace online</h3>
      <p>Este tablero contiene <strong>${imageCount} nota${imageCount > 1 ? 's' : ''} con imagen</strong>. Las im\u00e1genes est\u00e1n guardadas en este archivo HTML como datos en Base64, pero los navegadores tienen un l\u00edmite de longitud de URL de <strong>\u223C 2&nbsp;000&ndash;8&nbsp;000 caracteres</strong>. Una imagen comprimida puede superar ese l\u00edmite, haciendo que el bot\u00f3n <span class="badge">\uD83D\uDE80 Abrir en App</span> la omita autom\u00e1ticamente.</p>
      <p>\u2705 <strong>C\u00f3mo ver las im\u00e1genes en la app:</strong> usa el bot\u00f3n <span class="badge">\u2B07\uFE0F Descargar&nbsp;.json</span>, luego en Sticky Notes → Compartir → <strong>\"Importar desde JSON\"</strong> y selecciona ese archivo. Las im\u00e1genes se restaurar\u00e1n completamente.</p>
    </div>
  </div>` : ''}

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

  function openInAppModal() {
    const modal = document.getElementById('app-modal');
    if (!APP_URL) return;
    modal.style.display = 'flex';
  }
  function closeModal() {
    document.getElementById('app-modal').style.display = 'none';
  }
  function confirmOpenApp() {
    closeModal();
    window.open(APP_URL, '_blank', 'noopener');
  }
  // Cerrar al hacer click fuera del modal
  document.getElementById('app-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('app-modal')) closeModal();
  });
  // Cerrar con Escape
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
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
}