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

*(Este archivo se actualiza a medida que avanza el proyecto, no se redacta retroactivamente al final.)*
