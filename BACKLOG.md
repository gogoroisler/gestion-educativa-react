# Backlog

Funcionalidades evaluadas durante el desarrollo y pospuestas conscientemente para después del MVP. Cada entrada documenta el motivo del corte, para no perder el razonamiento de la decisión.

## Post-MVP

- **Vista de regularidad por alumno en la página padrón (admin).** Enriquecer la tabla de Alumnos con una columna de estado académico calculado (regular / en riesgo) basado en promedio y asistencia de sus inscripciones activas. Hoy esa información vive en el Dashboard por comisión, que es donde tiene más contexto. Agregarla al padrón requiere un endpoint nuevo o extender `GET /api/alumnos` para incluir métricas de rendimiento. *(evaluado: 2026-07-17)*

- **Filtro por año de inscripción en la página Alumnos (admin).** Permitir filtrar el padrón por el año de la comisión en que el alumno tiene inscripciones activas (`comisiones.anio`). Útil para ver cuántos alumnos ingresaron por ciclo lectivo. Requiere extender `GET /api/alumnos` con un query param `anio` y hacer el join con `inscripciones` + `comisiones` en el backend. La descarga CSV client-side ya está implementada y se beneficiaría automáticamente del filtro. *(evaluado: 2026-07-17)*

- **Módulo de carreras y plan de estudios.** El modelo actual no tiene el concepto de carrera ni de plan de estudios (qué materias corresponden a qué año de qué carrera). Esto impide saber si un alumno está inscripto en las materias correctas para su etapa, ni calcular su avance en la carrera. Requiere nuevas tablas: `carreras`, `plan_de_estudios` (carrera + curso + año + cuatrimestre), `alumno_carrera` (qué carrera cursa cada alumno y desde qué año). Habilita correlatividades y validaciones de inscripción. *(evaluado: 2026-07-17)*

- **Regularidad institucional.** En instituciones de formación superior y universitarias (alcance de LES y reglamentos internos), un alumno que no aprueba un mínimo de materias durante un período definido pierde su condición de alumno regular de la institución y debe solicitar formalmente su reincorporación. Este concepto es distinto de la regularidad por materia (que ya modelamos) y requiere: definir el umbral mínimo de materias aprobadas por período, calcular si cada alumno lo cumple, y gestionar el estado de regularidad institucional (regular / irregular / reincorporado). Depende del módulo de carreras para ser significativo — sin plan de estudios no se puede saber cuántas materias debería haber aprobado. *(evaluado: 2026-07-17)*


- **Reporte comparativo por turno (admin).** Compara tasa de aprobación y asistencia promedio entre turnos (mañana/tarde/noche). Habilita decisiones de asignación de recursos docentes y horarios. El campo `turno` en `comisiones` ya existe para soportarlo. *(evaluado: 2026-07-08)*

- **Reporte interanual (admin).** Compara tasa de aprobación por año lectivo (`anio` en `comisiones`). Permite seguimiento de tendencia institucional año a año. Requiere datos de al menos dos años para ser útil — viable desde el año 2 de uso del sistema. *(evaluado: 2026-07-08)*

- **Reporte de deserción (admin).** Alumnos con `estado = 'inactivo'` agrupados por mes/período, con la comisión de la que se dieron de baja. Permite detectar si la deserción se concentra en un tramo del año. Requeriría guardar la fecha de baja en `inscripciones` (hoy no está). *(evaluado: 2026-07-08)*

- **Reporte de ocupación de comisiones (admin).** Inscriptos vs cupo por comisión, con porcentaje de utilización. Habilita decisiones sobre apertura o cierre de comisiones. El dato ya existe en `comisiones.cupo` e `inscripciones`. *(evaluado: 2026-07-08)*

- **Reporte por docente (admin).** Tasa de aprobación y alumnos en riesgo agrupados por docente asignado. Información sensible — útil para coordinación y apoyo, no como evaluación punitiva. Requiere definir con cuidado cómo se presenta. *(evaluado: 2026-07-08)*

- **Umbrales de riesgo configurables por institución.** Hoy están hardcodeados en el código (promedio < 6, asistencia < 75%). Una versión configurable permitiría que cada institución defina sus propios umbrales. Requeriría una tabla `configuracion` en la DB. *(evaluado: 2026-07-08)*

- **Promedio por período en el dashboard.** Hoy el promedio de riesgo (usado para detectar alumnos en riesgo) se calcula sobre todas las notas cargadas en una comisión, sin distinguir período. El campo `periodo` en `calificaciones` queda como texto libre (no un ENUM fijo) porque distintas instituciones estructuran el año distinto (cuatrimestres en formación superior/no formal, trimestres en primaria/secundaria). Mostrar el promedio desglosado por período requeriría definir antes un sistema de períodos configurable por institución. *(evaluado: 2026-06-30)*
