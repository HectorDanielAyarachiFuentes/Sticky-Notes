/**
 * Convierte un color HEX a HSL.
 * @param {string} hex - El color en formato #RRGGBB.
 * @returns {Array<number>} - Un array [h, s, l].
 */
export function hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

/**
 * Convierte un color HSL a HEX.
 * @param {number} h - Hue (0-1).
 * @param {number} s - Saturation (0-1).
 * @param {number} l - Lightness (0-1).
 * @returns {string} - El color en formato #RRGGBB.
 */
export function hslToHex(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Determina si un color de fondo es oscuro para decidir el color del texto.
 * @param {string} hexColor - El color en formato #RRGGBB.
 * @returns {boolean} - True si el color es oscuro, false si es claro.
 */
export function isColorDark(hexColor) {
    if (!hexColor || hexColor.length < 7) return false; // Manejar colores inválidos
    // Quitar el #
    const hex = hexColor.replace('#', '');
    // Convertir a RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Fórmula de luminancia YIQ (un estándar para la percepción humana)
    const luminance = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return luminance < 128; // El umbral 128 es un buen punto de partida (0-255)
}

export function autoLink(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
}