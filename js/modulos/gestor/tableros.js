/**
 * @module Tableros
 * @description Módulo para gestionar la lógica de los tableros.
 */

// State for the boards
let boards = [];
let activeBoardId = null;

// DOM Elements
const contenedorTableros = document.getElementById('contenedor-tableros');
const botonCrearTablero = document.getElementById('crear-tablero-btn');

/**
 * @private
 * Configura los event listeners iniciales para el módulo.
 */
const _configurarEventListeners = () => {
    if (botonCrearTablero) {
        botonCrearTablero.addEventListener('click', crearNuevoTablero);
    }
    // Add more listeners as needed
};

/**
 * Carga y renderiza los tableros existentes.
 */
const cargarTableros = () => {
    console.log('Cargando tableros...');
    const savedBoards = localStorage.getItem('boards');
    if (savedBoards) {
        boards = JSON.parse(savedBoards);
    }
    const savedActiveBoardId = localStorage.getItem('activeBoardId');
    if (savedActiveBoardId) {
        activeBoardId = savedActiveBoardId;
    }

    if (contenedorTableros) {
        // Basic render logic, can be improved
        contenedorTableros.innerHTML = boards.length ? '' : '<p>No hay tableros para mostrar.</p>';
        boards.forEach(board => {
            contenedorTableros.innerHTML += `<div>${board.name}</div>`;
        });
    }
};

/**
 * Saves all boards and the active board ID to localStorage.
 */
export const save = () => {
    localStorage.setItem('boards', JSON.stringify(boards));
    localStorage.setItem('activeBoardId', activeBoardId);
};

/**
 * Maneja la lógica para crear un nuevo tablero.
 * @returns {object} The newly created board object.
 */
export const crear = () => {
    console.log('Creando un nuevo tablero...');
    const boardId = `board-${Date.now()}`;
    const newBoard = {
        id: boardId,
        name: `Tablero ${boards.length + 1}`,
        notes: []
    };
    boards.push(newBoard);
    activeBoardId = boardId;
    save();
    console.log('Nuevo tablero creado:', newBoard);
    return newBoard;
};

/**
 * Returns the currently active board object.
 * @returns {object|undefined} The active board object or undefined if not found.
 */
export const getActiveBoard = () => {
    return boards.find(board => board.id === activeBoardId);
};

/**
 * Returns all boards.
 * @returns {Array}
 */
export const getAllBoards = () => boards;

/**
 * Switches the active board.
 * @param {string} boardId - The ID of the board to switch to.
 */
export const switchActiveBoard = (boardId) => {
    if (boards.some(b => b.id === boardId)) {
        activeBoardId = boardId;
        save();
    }
};

/**
 * Initializes the board manager module.
 */
export const init = () => {
    console.log('Módulo GestorTableros inicializado.');
    _configurarEventListeners();
    cargarTableros();
};