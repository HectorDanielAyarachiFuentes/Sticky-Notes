# 🚀 Mejoras Futuras — Sticky Notes App

Listado de mejoras identificadas para implementar en el futuro, ordenadas por dificultad.

---

## 🟢 Fáciles

### 1. Indicador de uso de `localStorage`
Mostrar cuánto espacio usás del límite (~5 MB) con una barra de progreso en la sidebar.
- Calcular `JSON.stringify(appState).length` y comparar con el límite estimado de 5 MB
- Mostrar un aviso cuando supere el 80% de uso

### 2. Deshacer / Rehacer (Ctrl+Z / Ctrl+Y)
Stack de snapshots del estado para revertir acciones recientes.
- Guardar una copia del estado antes de cada acción destructiva (borrar nota, cambiar color, etc.)
- Límite sugerido: ~20 pasos hacia atrás


### 4. Renombrar tabs con doble clic
Permitir que el usuario asigne nombres personalizados a las pestañas de una nota.
- Doble clic sobre la tab → input editable inline
- Guardar el nombre en el estado de la tab

---

## 🟡 Medias

### 5. Buscador mejorado — saltar a la tab con resultado
El buscador encuentra resultados en todas las tabs pero no indica en cuál.
- Al hacer clic en un resultado, cambiar automáticamente a la tab donde se encontró la coincidencia
- Resaltar el término buscado dentro del contenido

### 6. Atajos de teclado globales
Añadir shortcuts para acciones frecuentes:
| Atajo | Acción |
|---|---|
| `Ctrl+D` | Duplicar nota seleccionada |
| `Delete` | Borrar nota seleccionada |
| `Ctrl+0` | Resetear zoom a 100% |
| `Ctrl+Shift+Z` | Rehacer |

### 7. Exportar tablero como imagen (PNG)
Usar la librería `html2canvas` para capturar el tablero completo y descargarlo como PNG.
- Útil para compartir una vista rápida del tablero sin perder el diseño visual
- Añadir botón en la pestaña "Compartir"

### 8. Modo presentación / pantalla completa
Ocultar toda la UI (sidebar, barra superior) y dejar solo el tablero visible.
- Botón de toggle en la barra de herramientas
- Útil para mostrar el tablero en reuniones o presentaciones

---

## 🔴 Complejas

### 9. Historial de versiones por tablero
Guardar snapshots del tablero con timestamp para volver a versiones anteriores.
- Guardar en `localStorage` o `IndexedDB` (ver `ALMACENAMIENTO_IMAGENES.md`)
- UI estilo "timeline" para ver y restaurar versiones

### 10. Colaboración en tiempo real
Permitir que múltiples usuarios editen el mismo tablero simultáneamente.
- Requiere backend (WebSockets o Firebase Realtime Database)
- Complejidad alta: sincronización de estado, resolución de conflictos, presencia de usuarios

---

## Ver también
- [`ALMACENAMIENTO_IMAGENES.md`](./ALMACENAMIENTO_IMAGENES.md) — Plan de migración a IndexedDB para imágenes
