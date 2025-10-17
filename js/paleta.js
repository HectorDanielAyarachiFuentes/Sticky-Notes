import { dom } from './dom.js';
import { appState, guardarEstado } from './estado.js';
import { hexToHsl, hslToHex, isColorDark } from './utilidades.js';

export function togglePalettePin() {
    appState.isPalettePinned = !appState.isPalettePinned;
    updatePaletteState();
    guardarEstado();
}

export function updatePaletteState() {
    document.body.classList.toggle('palette-pinned', appState.isPalettePinned);
    dom.pinPaletteBtn.classList.toggle('active', appState.isPalettePinned);
    dom.pinPaletteBtn.title = appState.isPalettePinned ?
        'Desfijar paleta (permanecerá visible)' :
        'Fijar paleta (se ocultará con el panel)';
}

export function inicializarPaletaNotas() {
    const paletteScrollContainer = document.querySelector("#palette-scroll-container");
    const scrollIndicatorUp = paletteScrollContainer.previousElementSibling;
    const scrollIndicator = paletteScrollContainer.nextElementSibling;
    
    let lastScrollTop = 0;

    const rainbowColors = [
        '#ff7979', '#ffbe76', '#f6e58d', '#badc58', '#7ed6df', '#54a0ff', '#be2edd', '#FFFFFF', '#808080'
    ];
    
    const fullPalette = [];
    rainbowColors.forEach(color => {
        const [h, s, l] = hexToHsl(color);
        for (let i = -2; i <= 2; i++) {
            const newL = Math.max(0.15, Math.min(0.95, l + i * 0.08));
            fullPalette.push(hslToHex(h, s, newL));
        }
    });

    const extendedColors = [...fullPalette, ...fullPalette, ...fullPalette, ...fullPalette];

    const updateScrollIndicator = () => {
        const { scrollTop, scrollHeight, clientHeight } = paletteScrollContainer;
        const isScrollable = scrollHeight > clientHeight;
        
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        scrollIndicator.style.opacity = (isScrollable && !isAtBottom) ? '1' : '0';
        scrollIndicatorUp.style.opacity = (isScrollable && scrollTop > 10) ? '1' : '0';
    };

    paletteScrollContainer.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = paletteScrollContainer;

        if (scrollTop > lastScrollTop && scrollTop > 0) {
            scrollIndicator.classList.add('scrolling-down');
            setTimeout(() => scrollIndicator.classList.remove('scrolling-down'), 500);
        } else if (scrollTop < lastScrollTop) {
            scrollIndicatorUp.classList.add('scrolling-up');
            setTimeout(() => scrollIndicatorUp.classList.remove('scrolling-up'), 500);
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;

        const scrollContentHeight = scrollHeight / 4;
        updateScrollIndicator();

        if (scrollTop + clientHeight >= scrollContentHeight * 3) {
            paletteScrollContainer.scrollTop -= scrollContentHeight;
            lastScrollTop = paletteScrollContainer.scrollTop;
        } else if (scrollTop <= scrollContentHeight) {
            paletteScrollContainer.scrollTop += scrollContentHeight;
        }
    }, { passive: true });

    extendedColors.forEach((color, index) => {
        const paletteNote = document.createElement("div");
        paletteNote.classList.add("palette-note");
        paletteNote.style.backgroundColor = color;
        paletteNote.dataset.color = color;

        if (isColorDark(color)) {
            paletteNote.classList.add('dark-theme');
        }
        
        paletteNote.style.top = `${index * 25}px`;
        paletteNote.style.transform = `rotate(${(Math.random() - 0.5) * 6}deg)`;

        paletteScrollContainer.appendChild(paletteNote);
    });
    
    paletteScrollContainer.scrollTop = paletteScrollContainer.scrollHeight / 4;
    setTimeout(updateScrollIndicator, 100);
}