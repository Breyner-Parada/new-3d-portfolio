# Developer Island

Portafolio 3D interactivo de **Breyner Parada** (Full Stack & Mobile Developer). En lugar de una página con secciones, el portafolio es una isla flotante de estilo low-poly que se recorre con la cámara: cada zona de la isla es una sección del portafolio.

## Zonas

| Zona | Sección | Contenido |
| --- | --- | --- |
| Base Camp | About | Quién soy, qué hago y dónde he trabajado |
| Project Outpost | Projects | Apps publicadas y proyectos web destacados |
| Skill Crystals | Skills | Tecnologías agrupadas por categoría |
| Systems Lab | Engineering | Backend, APIs, bases de datos y despliegues |
| Contact Portal | Contact | Email, LinkedIn, GitHub y formulario de contacto |

## Características

- **Navegación por zonas**: el menú (arriba en móviles) y los objetos de la isla mueven la cámara con GSAP hasta la zona elegida; `Esc` vuelve a la vista general. Fuera de las transiciones se puede orbitar libremente.
- **Paneles de contenido** en HTML sobre el canvas, con el detalle de cada objeto seleccionado.
- **Tema claro / oscuro**: respeta `prefers-color-scheme`, se guarda en `localStorage` y cambia la escena completa (sol y luna que se ocultan y salen, nubes low-poly de día, estrellas titilantes y neón suave de noche).
- **Isla con vida**: un avatar recorre la isla por sus caminos y escaleras (saluda, se sienta en la fogata, trabaja en el escritorio), lo sigue un Shiba Inu, hay venado, ciervo y zorro, tres habitantes y un águila que sobrevuela. Hay cascadas animadas, farolas a lo largo de los caminos y la bandera de Colombia en el Base Camp.
- **Accesibilidad y rendimiento**: respeta `prefers-reduced-motion`, resalta los objetos clicables al pasar el cursor y muestra una pantalla de carga mientras se descargan los modelos.
- **Formulario de contacto** que envía mediante [FormSubmit](https://formsubmit.co).

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack, `cacheComponents`) y React 19
- [Three.js](https://threejs.org), [React Three Fiber](https://r3f.docs.pmnd.rs), [drei](https://github.com/pmndrs/drei) y [postprocessing](https://github.com/pmndrs/postprocessing)
- [GSAP](https://gsap.com) para las transiciones de cámara
- Tailwind CSS 4
- TypeScript y ESLint

> Esta versión de Next.js tiene cambios incompatibles con versiones anteriores. Antes de tocar código del framework, consulta la guía correspondiente en `node_modules/next/dist/docs/` (ver [AGENTS.md](AGENTS.md)).

## Empezar

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | Ejecuta ESLint |

## Estructura

```
src/
├── app/                    # Layout, página y estilos globales
├── components/
│   ├── portfolio/          # Escena 3D: isla, cámara, cielo, nubes, compañeros, farolas, shaders
│   └── ui/                 # Interfaz HTML: navbar, paneles, formulario, carga, selector de tema
├── features/
│   ├── navigation/         # Store compartido entre la escena R3F y la UI (zona, selección, hover)
│   ├── projects/           # projectData.ts: todo el contenido del portafolio
│   └── theme/              # Tema claro / oscuro
└── types/                  # Tipos del portafolio
public/
├── models/                 # Modelos .glb (isla, vistas de cámara, avatar, animales, habitantes)
└── draco/                  # Decodificador Draco para los modelos comprimidos
```

### Cómo funciona la navegación

El estado de navegación vive en un store fuera de React ([useIslandNavigation.ts](src/features/navigation/useIslandNavigation.ts)) para que la escena dentro de `<Canvas>` y la UI HTML lean lo mismo. Las posiciones de cámara de cada zona no están en el código: se crean en Blender como pares de empties (`EMPTY_Cam_<zona>` / `EMPTY_Target_<zona>`), se exportan en `island-nav-new.glb` y se leen en [CameraTargets.ts](src/components/portfolio/CameraTargets.ts). Si falta alguno, se usa una vista de respaldo para que la escena nunca se rompa.

El recorrido del avatar se calcula sobre el terreno caminable con un script de Python y se guarda en [avatarRoute.json](src/components/portfolio/avatarRoute.json).

## Editar el contenido

Todo el contenido (perfil, experiencia, proyectos, skills, temas de ingeniería y enlaces de contacto) está en [projectData.ts](src/features/projects/projectData.ts). Para añadir un proyecto basta con agregar una entrada a `PROJECTS`.

## Créditos

- Animaciones del avatar y los animales: [Quaternius](https://quaternius.com) (Universal Animation Library y Ultimate Animated Animals).
- Habitantes de la isla: Microsoft Rocketbox.
