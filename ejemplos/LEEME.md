# 📁 Ejemplos — Sticky Notes

Esta carpeta contiene archivos de ejemplo para demostrar las capacidades de la app.

## Archivos incluidos

| Archivo | Descripción |
|---|---|
| `ejemplo_tablero.json` | Tablero de ejemplo con notas, conexiones e imágenes adjuntas |

## Cómo usar el ejemplo

1. Abre [Sticky Notes App](https://hectordanielayarachifuentes.github.io/Sticky-Notes/)
2. Ve a **Compartir → Importar desde JSON**
3. Selecciona el archivo `.json` de esta carpeta
4. ¡El tablero de ejemplo se cargará con todas las notas e imágenes!

## ¿Por qué hay una carpeta de ejemplos?

Las imágenes en las notas se guardan como datos Base64 dentro del archivo `.json`.
Esto significa que el archivo es completamente **autocontenido** — no necesita archivos
externos para reproducir el tablero exactamente como fue creado.

> **Nota:** Los archivos `.json` con imágenes pueden ser grandes (varios MB).
> Esto es normal — la imagen está codificada directamente dentro del JSON.
