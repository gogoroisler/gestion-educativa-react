# Backlog

Funcionalidades evaluadas durante el desarrollo y pospuestas conscientemente para después del MVP. Cada entrada documenta el motivo del corte, para no perder el razonamiento de la decisión.

## Post-MVP

- **Umbrales de riesgo configurables por institución.** Hoy están hardcodeados en el código (promedio < 6, asistencia < 75%). Una versión configurable permitiría que cada institución defina sus propios umbrales. Requeriría una tabla `configuracion` en la DB. *(evaluado: 2026-07-08)*

- **Promedio por período en el dashboard.** Hoy el promedio de riesgo (usado para detectar alumnos en riesgo) se calcula sobre todas las notas cargadas en una comisión, sin distinguir período. El campo `periodo` en `calificaciones` queda como texto libre (no un ENUM fijo) porque distintas instituciones estructuran el año distinto (cuatrimestres en formación superior/no formal, trimestres en primaria/secundaria). Mostrar el promedio desglosado por período requeriría definir antes un sistema de períodos configurable por institución. *(evaluado: 2026-06-30)*
