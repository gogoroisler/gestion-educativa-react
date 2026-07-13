# Backlog

Funcionalidades evaluadas durante el desarrollo y pospuestas conscientemente para después del MVP. Cada entrada documenta el motivo del corte, para no perder el razonamiento de la decisión.

## MVP — Pendiente de implementar

- **Reporte institucional por materia (admin).** `GET /api/dashboard/por-materia` — compara la tasa de aprobación y el porcentaje de alumnos en riesgo entre todas las materias (cursos) activas. Responde la pregunta de gestión: "¿qué materia tiene más alumnos con dificultades?", habilitando decisiones sobre refuerzo curricular o apoyo docente. No requiere cambios de schema — el dato ya existe en calificaciones + comisiones + cursos. *(evaluado: 2026-07-08, implementado en MVP)*

## Post-MVP

- **Reporte comparativo por turno (admin).** Compara tasa de aprobación y asistencia promedio entre turnos (mañana/tarde/noche). Habilita decisiones de asignación de recursos docentes y horarios. El campo `turno` en `comisiones` ya existe para soportarlo. *(evaluado: 2026-07-08)*

- **Reporte interanual (admin).** Compara tasa de aprobación por año lectivo (`anio` en `comisiones`). Permite seguimiento de tendencia institucional año a año. Requiere datos de al menos dos años para ser útil — viable desde el año 2 de uso del sistema. *(evaluado: 2026-07-08)*

- **Reporte de deserción (admin).** Alumnos con `estado = 'inactivo'` agrupados por mes/período, con la comisión de la que se dieron de baja. Permite detectar si la deserción se concentra en un tramo del año. Requeriría guardar la fecha de baja en `inscripciones` (hoy no está). *(evaluado: 2026-07-08)*

- **Reporte de ocupación de comisiones (admin).** Inscriptos vs cupo por comisión, con porcentaje de utilización. Habilita decisiones sobre apertura o cierre de comisiones. El dato ya existe en `comisiones.cupo` e `inscripciones`. *(evaluado: 2026-07-08)*

- **Reporte por docente (admin).** Tasa de aprobación y alumnos en riesgo agrupados por docente asignado. Información sensible — útil para coordinación y apoyo, no como evaluación punitiva. Requiere definir con cuidado cómo se presenta. *(evaluado: 2026-07-08)*

- **Umbrales de riesgo configurables por institución.** Hoy están hardcodeados en el código (promedio < 6, asistencia < 75%). Una versión configurable permitiría que cada institución defina sus propios umbrales. Requeriría una tabla `configuracion` en la DB. *(evaluado: 2026-07-08)*

- **Promedio por período en el dashboard.** Hoy el promedio de riesgo (usado para detectar alumnos en riesgo) se calcula sobre todas las notas cargadas en una comisión, sin distinguir período. El campo `periodo` en `calificaciones` queda como texto libre (no un ENUM fijo) porque distintas instituciones estructuran el año distinto (cuatrimestres en formación superior/no formal, trimestres en primaria/secundaria). Mostrar el promedio desglosado por período requeriría definir antes un sistema de períodos configurable por institución. *(evaluado: 2026-06-30)*
