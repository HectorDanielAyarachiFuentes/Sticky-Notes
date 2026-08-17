---
description: Mapa arquitectónico de la aplicación Sticky-Notes y responsabilidad de cada módulo.
---

# Mapa del Proyecto: Sticky-Notes (Vanilla JS)

Este documento es un mapa mental para la IA. Describe la arquitectura del proyecto, la ubicación de los archivos y la responsabilidad de cada módulo, para saber exactamente dónde tocar sin romper el ecosistema.

## 📁 Estructura Principal (`js/modulos/`)

*   **`script.js`**: (El Arranque). Antiguo monolito gigante, ahora actúa como *Bootstrapper*. Inicializa la aplicación, importa todos los controladores, y delega eventos entre ellos (Event Bus). Aún conserva algo de lógica legada que se irá migrando paulatinamente.
*   **`sobremi.js`**: Controlador del modal "Acerca de mí" y de la lógica del visualizador de audio (Web Audio API).
*   **`moverfondo.js`**: Gestión matemática del Paneo (Scroll infinito / arrastre del lienzo) con CSS Transforms.

---

## 📁 El Núcleo de Gestión (`js/modulos/gestor/`)

Aquí vive toda la lógica de negocio y controladores del DOM modernos:

### 🧠 Core y Estado
*   **`estadoApp.js`**: EL CEREBRO 🧠. Patrón Pub/Sub. Único archivo que tiene permitido leer o escribir en `LocalStorage`. Maneja el objeto global `appState`.
*   **`atajosTeclado.js`**: Controlador global de teclado. No ejecuta acciones directas, sino que despacha Eventos Semánticos (ej. `hotkey:delete`, `hotkey:duplicate`) para que `script.js` reaccione.

### 🖼️ Controladores de Interfaz (UI)
*   **`notasDOM.js`**: Motor de Renderizado de las Notas. Construye el HTML de cada *Sticky Note* y maneja la **Delegación de Eventos** global (clics, inputs, menús de pestañas) para no saturar la RAM.
*   **`tableros.js`**: Controlador de la *Sidebar* izquierda (gestión de la lista de proyectos/tableros).
*   **`interaccionesNotas.js`**: Motor Físico. Maneja los eventos de puntero (`pointerdown`, `pointermove`) para arrastrar y redimensionar las notas por el lienzo.

### 🎨 Personalización y Apariencia
*   **`fondo.js`**: Gestor de temas. Cambia los gradientes del lienzo, e inyecta dinámicamente variables CSS (Glassmorphism Oscuro/Claro) dependiendo de la luminosidad matemática del fondo.
*   **`cursor.js`**: Lógica de cursores personalizados en SVG (incluyendo el modo arcoíris optimizado en recursos).
*   **`lineas.js`**: Wrapper de *LeaderLine*. Dibuja las conexiones (SVG) entre dos notas.

### 🛠️ Utilidades y Herramientas
*   **`papelera.js`**: Papelera de reciclaje. Almacenamiento temporal de notas y tableros eliminados (Soft Delete).
*   **`exportar.js`**: Lógica para renderizar tableros enteros a PNG/PDF (usando librerías externas o canvas) e importar JSON.
*   **`compartir.js`**: Lógica de compartición en la nube o generación de URL dinámicas.
*   **`imagen.js`**: Maneja el *Drag & Drop* de imágenes dentro de una nota.
*   **`native-compressor.js`**: Optimización y compresión binaria de imágenes en el cliente (Browser) antes de guardarlas en estado, reduciendo peso en Base64.
*   **`crear.js`**: Herramientas extra de creación rápida de templates desde el panel superior.

---
**REGLA DE ORO DE ESTA ARQUITECTURA**:
1. **Los Módulos de Gestor** (excepto `estadoApp.js`) NUNCA acceden a `localStorage` directamente. Importan `state` de `estadoApp.js`.
2. Las funciones de dibujado / DOM **no deben añadir Listeners individuales por elemento**, deben usar **Delegación de Eventos** anclados a `#board` o `#board-container`.
