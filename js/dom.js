export const dom = {
    boardContainer: document.querySelector("#board-container"),
    board: document.querySelector("#board"),
    palette: document.querySelector("#note-palette"),
    boardList: document.querySelector("#board-list"),
    pinPaletteBtn: document.querySelector("#pin-palette-btn"),
    addBoardBtn: document.querySelector("#add-board-btn"),
    searchInput: document.querySelector("#search-input"),
    boardManager: document.querySelector("#board-manager"),
    globalSearchResults: document.querySelector("#global-search-results"),
    trashCan: document.querySelector("#trash-can"),
    zoomInBtn: document.querySelector("#zoom-in-btn"),
    zoomOutBtn: document.querySelector("#zoom-out-btn"),
    zoomResetBtn: document.querySelector("#zoom-reset-btn"),
    zoomLevelDisplay: document.querySelector("#zoom-level-display"),
    // Controles de estilo de línea
    lineOpacityInput: document.querySelector("#line-opacity-input"),
    lineColorInput: document.querySelector("#line-color-input"),
    linePathSelect: document.querySelector("#line-path-select"),
    lineSizeInput: document.querySelector("#line-size-input"),
    linePlugSelect: document.querySelector("#line-plug-select"),
    templateContainer: document.querySelector("#template-container"),
    // Pestaña de fondos
    backgroundOptionsContainer: document.querySelector("#background-options-container"),
    resetBackgroundBtn: document.querySelector("#reset-background-btn"),
    bgApplyToBoardCheckbox: document.querySelector("#bg-apply-board"),
    bgApplyToNotesCheckbox: document.querySelector("#bg-apply-notes"),

    // Menú contextual
    contextMenu: document.querySelector("#context-menu"),
    ctxDuplicateBtn: document.querySelector("#ctx-duplicate"),
    ctxLockBtn: documentquerySelector("#ctx-lock"),
    ctxDeleteBtn: documentquerySelector("#ctx-delete"),
    ctxChangeColorBtn: document.querySelector("#ctx-change-color"),
    // Menú contextual de pestañas
    tabContextMenu: documentquerySelector("#tab-context-menu"),
    ctxTabDeleteBtn: document.querySelector("#ctx-tab-delete"),

    // Papelera
    trashListContainer: document.querySelector("#trash-list-container"),
    emptyTrashBtn: document.querySelector("#empty-trash-btn"),
    toastContainer: document.querySelector("#toast-container"),
    // Popover de color
    colorPopover: document.querySelector("#color-picker-popover"),
    popoverPalette: document.querySelector("#popover-color-palette"),
    closePopoverBtn: documentquerySelector("#close-popover-btn"),
};