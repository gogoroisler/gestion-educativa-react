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

---

### 010 — `bcryptjs` en vez de `bcrypt` nativo para hashear contraseñas
**Fecha:** 2026-06-30
**Decisión:** Se usa `bcryptjs` (implementación JavaScript pura) en vez del paquete `bcrypt` (bindings nativos en C++).
**Por qué:** `better-sqlite3` ya requiere compilación nativa. Agregar `bcrypt` sumaría una segunda dependencia nativa, aumentando la complejidad de instalación en distintos entornos. `bcryptjs` logra el mismo resultado (mismo algoritmo, mismos hashes compatibles) sin ese costo. La diferencia de performance es despreciable para el volumen de logins de este sistema.
**Alternativas consideradas:** `bcrypt` nativo — descartado por sumar dependencia de compilación sin beneficio real a esta escala.

---

### 011 — Mismo mensaje de error para email inexistente y contraseña incorrecta
**Fecha:** 2026-06-30
**Decisión:** `POST /api/auth/login` responde `Credenciales inválidas` en ambos casos, sin distinguir cuál de los dos falló.
**Por qué:** Si el mensaje dijera "email no registrado", un atacante podría usar el endpoint para confirmar qué emails existen en la base (enumeración de usuarios). Usar el mismo mensaje en ambos casos elimina esa superficie de ataque.

---

### 013 — Visibilidad de comisiones filtrada por rol
**Fecha:** 2026-07-07
**Decisión:** `GET /api/comisiones` devuelve todas las comisiones activas para admin, y solo las comisiones donde `docente_id = req.user.id` para docente. El filtro se resuelve en la query SQL condicionalmente, no con dos rutas separadas.
**Por qué:** Un docente no tiene por qué ver las comisiones de sus colegas. El filtrado en SQL (vs. filtrar el array en JS) es más eficiente y no expone datos al servidor para descartarlos después.
**Alternativas consideradas:** ambos roles ven todo — descartado por no modelar el acceso real de una institución.

---

### 012 — Permisos por rol en el módulo Alumnos
**Fecha:** 2026-07-07
**Decisión:** `GET /api/alumnos` y `GET /api/alumnos/:id`: ambos roles (admin y docente). `POST`, `PUT`, `DELETE` lógico: solo admin.
**Por qué:** En una institución real, la gestión del padrón de alumnos (altas, modificaciones, bajas) es tarea administrativa. El docente necesita consultar el listado de su comisión pero no debería poder crear ni dar de baja alumnos.
**Alternativas consideradas:** acceso completo para ambos roles — descartado porque no refleja los permisos reales de un sistema educativo.

---

### 009 — `docente_id` en comisiones es opcional
**Fecha:** 2026-06-30
**Decisión:** `comisiones.docente_id` permite `NULL`.
**Por qué:** Refleja un caso real de gestión administrativa — la planificación de comisiones (curso, turno, cupo) suele definirse antes de tener un docente asignado. Forzar `NOT NULL` obligaría a asignar docente en el mismo momento de crear la comisión, lo cual no siempre es así en la práctica.
**Alternativas consideradas:** `NOT NULL` — descartado porque simplifica queries pero no refleja el flujo real de trabajo.
