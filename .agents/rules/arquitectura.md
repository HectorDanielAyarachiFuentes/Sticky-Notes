# Reglas de Arquitectura (HTML/JS)

- **Tecnología Principal**: Usa **JavaScript (ES6+) Vanilla** y **HTML5** semántico.
- **Sin Build Step**: Este proyecto no utiliza empaquetadores (como Webpack o Vite) ni preprocesadores. Todo el JavaScript se debe ejecutar de forma nativa en el navegador usando ES Modules (`<script type="module">`).
- **Modularidad**: Organiza el código JavaScript en módulos pequeños, reutilizables y con una única responsabilidad (clases, utilidades, controladores) ubicados en la carpeta `js/`.
- **Manipulación del DOM**: Mantén una separación clara de responsabilidades. La lógica de interfaz de usuario (manipulación del DOM) debe estar separada de la lógica de negocio (gestión de datos de tableros y notas).
- **Persistencia de Datos**: El estado y los datos de la aplicación se gestionan en el cliente (Local Storage o exportación a `.json`). No asumas la existencia de una base de datos backend.
- **Librerías Externas**: Utiliza bibliotecas de terceros únicamente cuando sea estrictamente necesario (ej. `Leader-Line.js` para conexiones). Prefiere soluciones nativas siempre que sea posible.
