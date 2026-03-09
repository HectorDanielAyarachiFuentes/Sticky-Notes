# 🖼️ Almacenamiento de Imágenes — Notas Técnicas

## Cómo funciona la compresión actual

Cuando el usuario sube una imagen, `imagen.js` genera **dos versiones** usando el Canvas API:

| Versión | Ancho máx. | Calidad JPEG | Uso |
|---|---|---|---|
| **Full** | 500 px | 0.7 (70%) | Guardada en localStorage (persistencia) |
| **Mini** | 200 px | 0.4 (40%) | Incluida en URLs compartidas |

### Reducción típica de tamaño

Una imagen original de **2 MB** queda aproximadamente en:
- **~80–120 KB** en versión Full (reducción del ~94%)
- **~5–20 KB** en versión Mini

La compresión se logra por dos factores combinados:
1. **Redimensionamiento** al ancho máximo configurado
2. **Compresión JPEG** según el factor de calidad

---

## Límite de almacenamiento actual

Las imágenes se guardan como **dataURL base64 dentro del JSON** en `localStorage`.

| Dato | Valor |
|---|---|
| Límite de `localStorage` por origen | ~5 MB |
| Overhead de base64 | +33% sobre el tamaño comprimido |
| Imágenes de 2 MB → ~100 KB → ~133 KB en base64 | **~38 imágenes** antes de llegar al límite |

> ⚠️ Al llenarse `localStorage`, el `saveState()` lanza `QuotaExceededError` y los datos **no se guardan silenciosamente**.

---

## Mejora futura: Migración a IndexedDB

### ¿Por qué?
IndexedDB permite guardar hasta **~1 GB+** (porcentaje del disco disponible) y almacena imágenes como **Blob binario**, eliminando el overhead del 33% de base64.

### Plan de implementación

1. **Crear `js/modulos/gestor/imageStore.js`** con las siguientes funciones:
   ```js
   saveImage(id, blob)   // guarda en IndexedDB
   loadImage(id)         // devuelve un Blob/URL
   deleteImage(id)       // limpia al borrar nota
   ```

2. **Modificar `imagen.js`**: en lugar de guardar el dataURL en `noteData.image`, guardar solo `noteData.imageId` y llamar a `saveImage()`.

3. **Modificar la carga inicial**: reconstruir las URL de imágenes desde IndexedDB antes de renderizar el tablero.

4. **Modificar `papelera.js`**: al eliminar una nota, llamar a `deleteImage(noteData.imageId)`.

5. **Modificar `exportar.js` y `compartir.js`**: leer los blobs desde IndexedDB para incluirlos al exportar / compartir.

### Consideración
Esta migración agrega complejidad real (operaciones asíncronas, transacciones, migración de datos existentes). Se recomienda implementarla **solo si los usuarios reportan problemas** con el límite de `localStorage`.

---

## Estado actual: ✅ Suficiente para uso normal

Con ~38 imágenes de 2 MB por tablero antes de llegar al límite, el sistema actual cubre la gran mayoría de casos de uso sin necesidad de migración.
