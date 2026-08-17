# Reglas de Estilos y Diseño (CSS)

- **Tecnología Principal**: Usa siempre **CSS Vanilla (CSS3)**. Está estrictamente prohibido utilizar frameworks o librerías de utilidades como Tailwind CSS, Bootstrap, Bulma, etc., a menos que se indique lo contrario.
- **Variables Globales**: Haz uso intensivo de Variables CSS (`:root { --color-primario: #... }`) definidas en `css/variables.css` para asegurar consistencia en temas, colores, espaciados y sombras.
- **Arquitectura de Archivos CSS**: Mantén la modularidad. Los estilos deben separarse de forma lógica (ej. variables globales, layout principal, componentes individuales como `notas.css` o `botones.css`).
- **Estética Moderna (Glassmorphism)**: Prioriza diseños premium. Utiliza fondos semitransparentes (`rgba`, `hsla`), desenfoques de fondo (`backdrop-filter: blur()`), bordes sutiles y gradientes para dar profundidad visual.
- **Micro-interacciones y Animaciones**: Toda interacción (hover, focus, drag & drop) debe sentirse fluida. Utiliza transiciones y keyframes (`@keyframes`) para enriquecer la experiencia de usuario sin sobrecargarla.
- **Responsividad Nativa**: Usa Flexbox y CSS Grid para crear layouts fluidos en lugar de depender excesivamente de media queries estáticas o anchos fijos.
