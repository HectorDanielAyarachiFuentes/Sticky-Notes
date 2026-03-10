# Implementación de Deshacer (Undo) para Notas Borradas

## Objetivo
Implementar la primera fase de un sistema híbrido de Deshacer/Rehacer: interceptar la eliminación de notas para permitir su recuperación con `Ctrl+Z`.

## Cambios Propuestos

## Cambios Propuestos

### Estado Global y Gestor de Historial
- Añadir `globalHistory` al objeto `appState` en `js/modulos/script.js` (vacío por defecto).
- Crear una nueva función para registrar comandos en el historial: `registrarComando(accion)`.
- Un «comando» tendrá la estructura: `{ tipo: 'BORRAR_NOTA', datos: { nota: <copia>, boardId: <id> } }`.

### Modificar `moveNoteToTrash` (`js/modulos/gestor/papelera.js`)
- Justo antes de eliminar la nota del estado (`notes.splice(...)`), crear un snapshot de la nota.
- Llamar a `registrarComando()` pasando el snapshot.

### Implementar Atajo `Ctrl+Z` (`js/modulos/script.js`)
- Añadir un event listener global para el evento `keydown`.
- Detectar `Ctrl+Z` (o `Cmd+Z` en Mac).
- Validar que el usuario no esté editando un elemento de texto (`contentEditable`).
- Si hay comandos en `globalHistory`, extraer el último (pop).
- Si el comando es `BORRAR_NOTA`:
  - Remover la nota de `appState.trash` (para que no quede duplicada ahí).
  - Volver a insertar la nota en el `appState.boards[boardId].notes`.
  - Llamar a la lógica de renderizado para mostrar la nota nuevamente.

## Cambios Propuestos Fase 2: Historial Local (Micro-acciones)

El sistema híbrido requiere que la edición de texto dentro de una nota tanga su propio historial en lugar de usar el historial global, para evitar llenar el global con letras sueltas y permitir deshacer escritura mientras escribimos.

### Estado Local por Nota/Tab
- En `createStickyNoteElement` y `appState.boards.notes`, cada tab de una nota necesita poder guardar su propio historial de contenido: `history: []` y un `historyIndex`.

### Guardando Snapshots de Texto (Debounce)
- En el evento `input` del `contentEditable` (`.stickynote-text` y `.stickynote-title`), usaremos un setTimeout (ej. 500ms o 1000ms) que detecte cuando el usuario pausó la escritura.
- Al pausar, guardamos el `innerHTML` actual en el array `history` del tab específico.

### Interceptando `Ctrl+Z` en el Texto
- Modificar el listener de `keydown` global. Si `isEditingText` es verdadero, en lugar de invocar el comportamient nativo del navegador (que a veces e inexacto con `contentEditable`), miramos en qué nota/tab estamos.
- Retrocedemos el `historyIndex` de ese tab y restauramos el `innerHTML` manualmente.
