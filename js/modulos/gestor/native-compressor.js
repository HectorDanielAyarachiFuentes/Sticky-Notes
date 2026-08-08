/**
 * native-compressor.js
 * 
 * Compresión/descompresión usando la API nativa CompressionStream/DecompressionStream.
 * Cero dependencias externas, cero WASM, cero CDN.
 * Usa el motor C++ del propio navegador (Chromium/Gecko/WebKit).
 *
 * Pipeline:
 *   Compresión:   JSON string → TextEncoder → Uint8Array → Gzip (nativo) → Base64 URL-safe
 *   Descompresión: Base64 URL-safe → Uint8Array → Gunzip (nativo) → TextDecoder → JSON string
 *
 * ¿Por qué el fragmento hash (#)?
 *   El hash fragment NUNCA se envía al servidor HTTP, evitando errores
 *   HTTP 431 (Request Header Fields Too Large). Toda la data vive 100% en el cliente.
 */

// --- Compresión nativa con CompressionStream ---

/**
 * Comprime un Uint8Array usando la API nativa CompressionStream.
 * @param {Uint8Array} buffer - Datos binarios a comprimir.
 * @param {string} [format='gzip'] - Algoritmo: 'gzip', 'deflate', o 'deflate-raw'.
 * @returns {Promise<Uint8Array>} Datos comprimidos.
 */
async function comprimirBytes(buffer, format = 'gzip') {
    const stream = new Blob([buffer]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream(format));
    const response = new Response(compressedStream);
    return new Uint8Array(await response.arrayBuffer());
}

/**
 * Descomprime un Uint8Array usando la API nativa DecompressionStream.
 * @param {Uint8Array} buffer - Datos comprimidos.
 * @param {string} [format='gzip'] - Algoritmo: 'gzip', 'deflate', o 'deflate-raw'.
 * @returns {Promise<Uint8Array>} Datos descomprimidos.
 */
async function descomprimirBytes(buffer, format = 'gzip') {
    const stream = new Blob([buffer]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream(format));
    const response = new Response(decompressedStream);
    return new Uint8Array(await response.arrayBuffer());
}

// --- Utilidades Base64 URL-safe ---

/**
 * Convierte un Uint8Array a Base64 URL-safe (sin padding).
 * Alfabeto: A-Z, a-z, 0-9, -, _
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64Url(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Convierte un string Base64 URL-safe a Uint8Array.
 * @param {string} base64url
 * @returns {Uint8Array}
 */
function base64UrlToBytes(base64url) {
    let base64 = base64url
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(padLen);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// --- Detección de soporte ---

/**
 * Verifica si el navegador soporta CompressionStream/DecompressionStream.
 * @returns {boolean}
 */
export function isNativeCompressionSupported() {
    return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

// --- API Pública ---

/**
 * Comprime un string JSON a un string Base64 URL-safe usando Gzip nativo.
 * @param {string} jsonString - El JSON a comprimir.
 * @returns {Promise<string>} String Base64 URL-safe comprimido.
 */
export async function nativeCompressToURL(jsonString) {
    const inputBytes = new TextEncoder().encode(jsonString);
    const compressed = await comprimirBytes(inputBytes);
    return bytesToBase64Url(compressed);
}

/**
 * Descomprime un string Base64 URL-safe con Gzip nativo a un string JSON.
 * @param {string} base64url - El string comprimido en Base64 URL-safe.
 * @returns {Promise<string>} El JSON descomprimido.
 */
export async function nativeDecompressFromURL(base64url) {
    const compressedBytes = base64UrlToBytes(base64url);
    const decompressed = await descomprimirBytes(compressedBytes);
    return new TextDecoder().decode(decompressed);
}
