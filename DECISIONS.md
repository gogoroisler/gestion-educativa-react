# Decisiones técnicas

Registro de decisiones de diseño relevantes, con el contexto y las alternativas consideradas. A diferencia de `BACKLOG.md` (qué pospusimos), esto documenta el "por qué" de lo que sí se construyó.

---

### 001 — Nombre del repositorio incluye el stack
**Fecha:** 2026-06-29
**Decisión:** `gestion-educativa-react` en vez de `gestion-educativa` o `sistema-gestion-educativa`.
**Por qué:** En un portfolio en transición laboral, que el nombre muestre el stack permite identificar la tecnología de un vistazo. Mantiene consistencia con la convención usada en el proyecto contable (`gestion-pyme-django`).

---

### 002 — Asistencia incluida desde el MVP
**Fecha:** 2026-06-29
**Decisión:** El módulo de Asistencia se construye desde el MVP, no se pospone a v2.
**Por qué:** El dashboard de "alumnos en riesgo" (feature diferencial del proyecto) depende de cruzar promedio de notas con porcentaje de asistencia. Sin asistencia, el dashboard pierde su valor diferencial.

---

### 003 — Seed script en vez de versionar el archivo .db
**Fecha:** 2026-06-30
**Decisión:** La base SQLite se ignora en git (`.gitignore`); se versiona un script de seed que crea el schema y carga datos de prueba.
**Por qué:** SQLite guarda el archivo en binario — git no puede diffearlo línea a línea, así que cada cambio reemplaza el archivo entero en el historial (repo crece sin que el historial cuente nada útil). El seed script logra el mismo resultado para quien clona el repo (un comando, demo funcionando) sin ese costo, y de paso documenta el esquema en código ejecutable.
**Alternativas consideradas:** versionar un `.db` con datos de ejemplo directamente — descartado por el problema de binarios en git.

---

### 004 — Curso y Comisión como entidades separadas
**Fecha:** 2026-06-30
**Decisión:** `cursos` (la materia en abstracto, ej. "Matemática") y `comisiones` (una instancia concreta con turno/cupo/docente/año) son tablas distintas, relacionadas 1-a-muchos.
**Por qué:** Modela el caso real de una misma materia dictada en múltiples turnos o comisiones en paralelo. Un alumno se inscribe a una comisión, no al curso directamente.
**Alternativas consideradas:** fusionar ambos conceptos en una sola tabla — más simple, pero no soporta múltiples comisiones de la misma materia.

---

### 005 — Inscripciones como entidad central; notas y asistencia cuelgan de la inscripción
**Fecha:** 2026-06-30
**Decisión:** `calificaciones` y `asistencias` referencian `inscripcion_id`, no `alumno_id` + `comision_id` directamente.
**Por qué:** Si un alumno se da de baja de una comisión y se reinscribe más adelante, son dos inscripciones distintas — sus notas/asistencias no se mezclan entre períodos de cursada.

---

### 006 — Borrado lógico (soft delete) en toda la base
**Fecha:** 2026-06-30
**Decisión:** Ninguna tabla usa `DELETE` físico; todas tienen un campo `estado` (`activo`/`inactivo`).
**Por qué:** Es lo esperable en un sistema educativo real — un alumno que se va sigue teniendo legajo, y borrar en cascada notas/asistencias de años anteriores destruiría historial real.
**Alternativas consideradas:** `DELETE` físico en cascada — descartado por pérdida de historial.

---

### 007 — `periodo` en calificaciones es texto libre, no un ENUM fijo
**Fecha:** 2026-06-30
**Decisión:** El campo `periodo` de `calificaciones` es `TEXT` sin restricción de valores.
**Por qué:** La estructura del año lectivo varía según el tipo de institución (cuatrimestres en formación superior/no formal, trimestres en primaria/secundaria). Fijar el valor en el schema sería imponer una decisión de negocio que no corresponde a la base de datos. Ver detalle de la consecuencia (promedio sin desglose por período) en `BACKLOG.md`.

---

### 008 — Índice único parcial para permitir reinscripción histórica
**Fecha:** 2026-06-30
**Decisión:** `inscripciones` usa un índice único parcial (`WHERE estado = 'activo'`) en vez de un `UNIQUE` de tabla sobre `(alumno_id, comision_id)`.
**Por qué:** Con borrado lógico, un alumno que se reinscribe a la misma comisión generaría una fila duplicada del par alumno+comisión. El índice parcial exige unicidad solo entre inscripciones activas, preservando el historial de inscripciones inactivas.
