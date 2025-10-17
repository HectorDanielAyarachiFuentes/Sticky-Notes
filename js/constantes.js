export const DEFAULT_BOARD_BACKGROUND = `repeating-linear-gradient(90deg, hsla(280,0%,67%,0.06) 0px, hsla(280,0%,67%,0.06) 1px,transparent 1px, transparent 96px),repeating-linear-gradient(0deg, hsla(280,0%,67%,0.06) 0px, hsla(280,0%,67%,0.06) 1px,transparent 1px, transparent 96px),repeating-linear-gradient(0deg, hsla(280,0%,67%,0.09) 0px, hsla(280,0%,67%,0.09) 1px,transparent 1px, transparent 12px),repeating-linear-gradient(90deg, hsla(280,0%,67%,0.09) 0px, hsla(280,0%,67%,0.09) 1px,transparent 1px, transparent 12px),linear-gradient(90deg, hsl(226,47%,26%),hsl(226,47%,26%))`;

export const NOTE_COLORS = ['#FFF9C4', '#C8E6C9', '#BBDEFB', '#FFCDD2', '#B2EBF2', '#D7CCC8', '#F8BBD0', '#E1BEE7', '#CFD8DC'];

export const EXTENDED_COLORS = [
    '#FFFFFF', '#F1F3F4', '#CFD8DC', '#E8EAED', '#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9', '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', '#C8E6C9', '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3', '#FFE0B2', '#FFCCBC', '#D7CCC8', '#424242', '#000000'
];

export const BOARD_TEMPLATES = {
    kanban: {
        name: 'Tablero Kanban',
        notes: [
            { title: 'Por Hacer', content: '', x: 50, y: 20, width: 300, height: 600, color: '#E9EBEE', rotation: 0 },
            { title: 'En Proceso', content: '', x: 400, y: 20, width: 300, height: 600, color: '#E9EBEE', rotation: 0 },
            { title: 'Hecho', content: '', x: 750, y: 20, width: 300, height: 600, color: '#E9EBEE', rotation: 0 },
        ]
    },
    swot: {
        name: 'Análisis FODA',
        notes: [
            { title: 'Fortalezas', content: '', x: 50, y: 50, width: 350, height: 250, color: '#C8E6C9', rotation: -1 },
            { title: 'Oportunidades', content: '', x: 450, y: 50, width: 350, height: 250, color: '#BBDEFB', rotation: 1 },
            { title: 'Debilidades', content: '', x: 50, y: 350, width: 350, height: 250, color: '#FFCDD2', rotation: 1 },
            { title: 'Amenazas', content: '', x: 450, y: 350, width: 350, height: 250, color: '#FFF9C4', rotation: -1.5 },
        ]
    },
    mindmap: {
        name: 'Mapa Mental',
        notes: [
            { title: 'Idea Central', content: '', x: 400, y: 300, width: 250, height: 150, color: '#B2EBF2', rotation: 0 },
        ]
    },
    eisenhower: {
        name: 'Matriz de Eisenhower',
        notes: [
            { title: 'Urgente / Importante', content: '(Hacer)', x: 50, y: 50, width: 400, height: 300, color: '#FFCDD2', rotation: 0.5 },
            { title: 'No Urgente / Importante', content: '(Planificar)', x: 500, y: 50, width: 400, height: 300, color: '#BBDEFB', rotation: -0.5 },
            { title: 'Urgente / No Importante', content: '(Delegar)', x: 50, y: 400, width: 400, height: 300, color: '#FFF9C4', rotation: -0.5 },
            { title: 'No Urgente / No Importante', content: '(Eliminar)', x: 500, y: 400, width: 400, height: 300, color: '#C8E6C9', rotation: 0.5 },
        ]
    },
    retro: {
        name: 'Retrospectiva',
        notes: [
            { title: '¿Qué salió bien? 👍', content: '', x: 50, y: 20, width: 300, height: 600, color: '#C8E6C9', rotation: 0 },
            { title: '¿Qué se puede mejorar? 🤔', content: '', x: 400, y: 20, width: 300, height: 600, color: '#BBDEFB', rotation: 0 },
            { title: 'Acciones a tomar 🎯', content: '', x: 750, y: 20, width: 300, height: 600, color: '#FFF9C4', rotation: 0 },
        ]
    }
};

export const PARTICLE_COUNT = 128;