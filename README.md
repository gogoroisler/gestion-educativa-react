# Gestión Educativa React

Sistema de gestión académica full-stack para institutos de formación superior. Permite registrar alumnos, comisiones, calificaciones y asistencia, con un dashboard de riesgo académico por comisión y por materia.

Proyecto de portfolio — carrera Técnico en Desarrollo de Software.

## Stack

| Capa       | Tecnología                                              |
|------------|---------------------------------------------------------|
| Backend    | Node.js 20 · Express · SQLite (better-sqlite3)          |
| Auth       | JWT con roles `admin` / `docente`                       |
| Frontend   | React 19 · Vite · React Router v6                       |
| UI         | Tailwind CSS v4 · shadcn/ui · Lucide React              |

## Funcionalidades

- **Autenticación** por roles con JWT almacenado en `localStorage`
- **Alumnos** — CRUD completo (admin); exportación CSV con BOM para Excel
- **Comisiones** — creación, edición y padrón de inscriptos (admin); consulta (docente)
- **Calificaciones** — carga por comisión; notas en rojo si el promedio es menor a 6
- **Asistencia** — registro bulk por fecha con upsert; marcado masivo presente/ausente
- **Dashboard admin** — stats globales + tasa de aprobación por materia con barra visual
- **Dashboard docente** — cards por comisión con lista de alumnos en riesgo
- **Modo oscuro** — toggle en el sidebar, persiste en `localStorage`
- **Control de acceso** — el docente solo puede escribir en sus propias comisiones

## Instalación

Requiere **Node.js 20+**.

```bash
git clone https://github.com/gogoroisler/gestion-educativa-react.git
cd gestion-educativa-react
```

### Backend

```bash
cd backend
npm install

# Crear archivo de entorno
cp .env.example .env
# Editar .env y cambiar JWT_SECRET por un secreto propio

# Inicializar base de datos y datos de prueba
npm run seed

# Iniciar servidor de desarrollo (nodemon)
npm run dev
```

El servidor queda en `http://localhost:4000`.

### Frontend

En otra terminal, desde la raíz del proyecto:

```bash
cd frontend
npm install
npm run dev
```

La app queda en `http://localhost:5173`. Las llamadas a `/api` se redirigen automáticamente al backend vía proxy de Vite.

## Variables de entorno (backend)

Crear `backend/.env` basándose en `backend/.env.example`:

```env
PORT=4000
JWT_SECRET=reemplazar-por-un-secreto-largo-y-aleatorio
JWT_EXPIRES_IN=8h
DB_PATH=./data/gestion_educativa.db
```

## Credenciales de prueba

El comando `npm run seed` crea dos usuarios y datos de ejemplo:

| Rol     | Email               | Contraseña    |
|---------|---------------------|---------------|
| Admin   | admin@demo.com      | admin1234     |
| Docente | docente@demo.com    | docente1234   |

## Endpoints principales

### Auth
| Método | Ruta              | Acceso  | Descripción          |
|--------|-------------------|---------|----------------------|
| POST   | `/api/auth/login` | Público | Login, devuelve JWT  |

### Alumnos
| Método | Ruta               | Acceso | Descripción  |
|--------|--------------------|--------|--------------|
| GET    | `/api/alumnos`     | Ambos  | Lista activos |
| POST   | `/api/alumnos`     | Admin  | Crear alumno  |
| PUT    | `/api/alumnos/:id` | Admin  | Editar alumno |
| DELETE | `/api/alumnos/:id` | Admin  | Baja lógica   |

### Comisiones
| Método | Ruta                               | Acceso  | Descripción                     |
|--------|------------------------------------|---------|---------------------------------|
| GET    | `/api/comisiones`                  | Ambos   | Lista activas                   |
| POST   | `/api/comisiones`                  | Admin   | Crear comisión                  |
| PUT    | `/api/comisiones/:id`              | Admin   | Editar comisión                 |
| DELETE | `/api/comisiones/:id`              | Admin   | Baja lógica                     |
| GET    | `/api/comisiones/:id/alumnos`      | Ambos   | Padrón de inscriptos            |
| POST   | `/api/comisiones/:id/alumnos`      | Admin   | Inscribir alumno                |
| DELETE | `/api/comisiones/:id/alumnos/:id`  | Admin   | Dar de baja inscripción         |
| GET    | `/api/comisiones/:id/dashboard`    | Ambos¹  | Métricas y riesgo de la comisión|

¹ El docente solo puede acceder a sus propias comisiones.

### Calificaciones
| Método | Ruta                                 | Acceso  | Descripción       |
|--------|--------------------------------------|---------|-------------------|
| GET    | `/api/comisiones/:id/calificaciones` | Ambos   | Notas del grupo   |
| POST   | `/api/comisiones/:id/calificaciones` | Ambos¹  | Cargar nota       |
| PUT    | `/api/calificaciones/:id`            | Ambos¹  | Editar nota       |
| DELETE | `/api/calificaciones/:id`            | Admin   | Eliminar nota     |

### Asistencia
| Método | Ruta                              | Acceso  | Descripción                     |
|--------|-----------------------------------|---------|---------------------------------|
| GET    | `/api/comisiones/:id/asistencias` | Ambos   | Registros; `?fecha=YYYY-MM-DD`  |
| POST   | `/api/comisiones/:id/asistencias` | Ambos¹  | Registro bulk del día (upsert)  |

### Dashboard
| Método | Ruta                         | Acceso | Descripción                    |
|--------|------------------------------|--------|--------------------------------|
| GET    | `/api/dashboard`             | Admin  | Stats globales                 |
| GET    | `/api/dashboard/por-materia` | Admin  | Tasa de aprobación por materia |

### Usuarios (docentes)
| Método | Ruta               | Acceso | Descripción                          |
|--------|--------------------|--------|--------------------------------------|
| GET    | `/api/usuarios`    | Admin  | Lista docentes activos               |
| POST   | `/api/usuarios`    | Admin  | Crear cuenta docente                 |
| PUT    | `/api/usuarios/:id`| Admin  | Editar docente (contraseña opcional) |
| DELETE | `/api/usuarios/:id`| Admin  | Desactivar docente                   |

## Estructura del proyecto

```
gestion-educativa-react/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql        # Definición de tablas
│   │   │   ├── seed.js           # Datos de prueba
│   │   │   └── connection.js     # Instancia de better-sqlite3
│   │   ├── middleware/
│   │   │   └── auth.js           # verifyToken · requireRole
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── alumnos.js
│   │   │   ├── comisiones.js
│   │   │   ├── calificaciones.js
│   │   │   ├── asistencias.js
│   │   │   ├── dashboard.js
│   │   │   └── usuarios.js
│   │   └── server.js
│   └── .env.example
└── frontend/
    └── src/
        ├── contexts/
        │   └── AuthContext.jsx    # Token + user en localStorage
        ├── components/
        │   ├── ProtectedRoute.jsx
        │   └── ui/                # Componentes shadcn/ui
        ├── layouts/
        │   └── AppLayout.jsx      # Sidebar con modo oscuro
        ├── lib/
        │   └── api.js             # apiFetch — wrapper autenticado
        └── pages/
            ├── LoginPage.jsx
            ├── DashboardPage.jsx
            ├── AlumnosPage.jsx
            ├── ComisionesPage.jsx
            ├── ComisionDetailPage.jsx
            ├── CalificacionesPage.jsx
            ├── AsistenciaPage.jsx
            └── UsuariosPage.jsx
```

## Criterios de riesgo académico

Los umbrales se calculan por inscripción en el backend:

| Indicador         | Umbral | Etiqueta          |
|-------------------|--------|-------------------|
| Promedio de notas | < 6    | `baja_nota`       |
| Asistencia        | < 75 % | `baja_asistencia` |
| Ambos             | —      | `ambos`           |

Ver `BACKLOG.md` para las funcionalidades planificadas fuera del MVP.

---

Santiago Gonzalez · [github.com/gogoroisler](https://github.com/gogoroisler)
