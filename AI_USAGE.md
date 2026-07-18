# Uso de IA en este proyecto

Este proyecto se desarrolló usando [Claude Code](https://claude.com/claude-code) como asistente. Este documento registra **con qué criterio** se usó la herramienta — qué se delegó, qué se decidió de forma deliberada, y los momentos en que se corrigió o cuestionó el rumbo propuesto por la IA. El objetivo es que se pueda evaluar el uso de la herramienta, no solo el código resultante.

## Metodología acordada

Antes de escribir la primera línea de código se definió explícitamente el modo de trabajo (no fue una sugerencia de la IA sin pedir validación, sino un acuerdo explícito):

- Avanzar paso a paso, evaluando cada decisión antes de seguir — no generar el proyecto de una sola vez.
- Explicar el "por qué" de cualquier código o decisión no obvia, sin asumir conocimiento previo.
- Ante un error, diagnosticarlo en conjunto en vez de que la IA entregue el fix directo.
- Dejar explícitas las bifurcaciones de diseño y decidirlas en conjunto, no en silencio.
- Commits frecuentes y descriptivos como parte del proceso, no como prolijidad de último momento.

## Qué se delegó a la IA

- Redacción de boilerplate (`.gitignore`, estructura inicial de README).
- Propuestas de modelado de datos, con explicación de las opciones y trade-offs de cada una.
- Generación de SQL / código de scaffolding, una vez validada la decisión de diseño correspondiente.
- Explicación de conceptos técnicos nuevos a medida que aparecían en el código (ej. índices parciales, constraints `CHECK`, diferencias SQLite vs. otros motores, funcionamiento de JWT y bcrypt).

## Qué se decidió de forma humana

- Nombre del repositorio y de la carpeta del proyecto.
- Todas las bifurcaciones de modelado de datos (curso/comisión separados, borrado lógico, estructura de `periodo`).
- Alcance del MVP (qué módulos entran, cuáles se postergan — ver `BACKLOG.md`).
- Organización de la documentación del proyecto (este archivo y `DECISIONS.md` surgieron de una pregunta del desarrollador, no de una sugerencia inicial de la IA).
- Incorporar la revisión de los archivos `.md` como paso obligatorio antes de cada push — decisión de proceso propuesta por el desarrollador y adoptada como metodología fija a partir del módulo de auth.

## Momentos en que se corrigió el rumbo propuesto por la IA

- **2026-06-29** — Antes de que se generara cualquier archivo de scaffolding, se interrumpió el proceso para acordar la metodología de trabajo paso a paso (ver arriba). La IA había arrancado a crear la estructura de carpetas sin que esa conversación hubiera ocurrido todavía.
- **2026-06-30** — Ante la propuesta inicial de modelar `periodo` como cuatrimestre o trimestre fijo, se cuestionó la premisa preguntando primero quién usaría el sistema y con qué propósito, notando que distintos tipos de institución estructuran el año lectivo de forma distinta. Esto llevó a modelar `periodo` como texto libre en vez de un valor fijo — una decisión de modelado más correcta que la propuesta original.

- **2026-07-17** — La IA asumió incorrectamente que el schema de `alumnos` tenía un único campo `nombre` (nombre completo), cuando en realidad tiene `nombre` y `apellido` separados. Basándose en esa suposición, removió `a.apellido` de varias queries SQL (comisiones, calificaciones, asistencias, dashboard) y cambió el `ORDER BY`. El error fue detectado al leer el schema real (`schema.sql`) durante la revisión de AlumnosPage. Se corrigió usando `a.nombre || ' ' || a.apellido AS nombre` en las queries de JOIN, restaurando el orden correcto. Ver decisión 023 en `DECISIONS.md`.

- **2026-07-18** — El endpoint `POST /api/auth/login` no devolvía el `id` del usuario en el body de la respuesta, y `AuthContext` tampoco lo persistía en `localStorage`. Esto hacía que `user?.id` fuera siempre `undefined` en el frontend, rompiendo silenciosamente el control de permisos del docente (`com.docente_id === user?.id` siempre era `false`). El error no tenía un síntoma visible en el MVP porque la lógica de permisos del docente no había sido probada con una cuenta de docente real. Se detectó al analizar el código de autenticación antes de implementar el Dashboard. Se corrigió en dos pasos: el backend devuelve `id` en la respuesta del login, y `AuthContext` incluye `id` en el objeto `user` que guarda en `localStorage`.

- **2026-07-18** — `AlumnosPage` fue construida con un campo `telefono` en el formulario y en la tabla, campo que no existe en el schema de `alumnos`. Además faltaba el campo `apellido`, que el backend requiere como obligatorio al crear un alumno (`dni, nombre y apellido son requeridos`). Esto hacía que el formulario de alta fallara silenciosamente o devolviera 400. El error fue detectado al leer `backend/src/routes/alumnos.js` y contrastar con el schema. Se corrigió reemplazando `telefono` por `apellido` en el formulario y ajustando la tabla y el CSV.

- **2026-07-18 — Dos bugs de sesiones anteriores detectados por los tests de integración:**

  - *Nota fuera de rango devolvía 500.* La ruta `POST /api/comisiones/:id/calificaciones` no validaba el rango de la nota antes de intentar el INSERT. SQLite rechazaba el valor con un CHECK constraint violation que Express convertía en un 500 sin mensaje útil. El test que esperaba un 400 lo hizo visible de inmediato. Corrección: validación explícita en el handler antes de tocar la base de datos.

  - *Turno en mayúsculas rechazado por la base de datos.* `ComisionesPage` definía `TURNOS = ['Mañana', 'Tarde', 'Noche']` (con mayúscula inicial), pero el schema tiene `CHECK (turno IN ('mañana', 'tarde', 'noche'))` en minúsculas. Crear una comisión desde el formulario habría fallado con un error de constraint. El bug pasó desapercibido porque la demo usaba datos del seed (cargados directamente en minúsculas) y el formulario nunca fue ejercitado antes de los tests. Corrección: `TURNOS` en minúsculas.

  Ambos bugs existían en el código desde sesiones anteriores y no fueron detectados durante la revisión de código ni durante el desarrollo. La suite de integración los encontró en la primera corrida.

*(Este archivo se actualiza a medida que avanza el proyecto, no se redacta retroactivamente al final.)*
