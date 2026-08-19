# 📋 Control de Asistencia Docente

Sistema web completo para gestionar el control de asistencia de docentes de una institución educativa. Reemplaza el flujo manual de fichas físicas → Excel por una plataforma integrada con registro diario, validación por coordinadores, reportes consolidados y herramientas de utilidad.

![Estado](https://img.shields.io/badge/estado-producción-green)
![Stack](https://img.shields.io/badge/stack-NestJS%20+%20React%20+%20MySQL-blue)

## 🎯 ¿Qué resuelve?

- ❌ Elimina el trabajo manual de pasar fichas físicas a Excel
- ✅ Registro rápido de asistencia diaria (presente/falta + minutos de tardanza)
- ✅ Validación de cobertura por sede (detecta salones olvidados)
- ✅ Vista semanal estilo Excel (L M M J V | Tardanza | Total)
- ✅ Consolidados por Docente/Curso/Sede/Área con exportación a Excel
- ✅ Flujo de validación: Admin registra → Coordinador valida
- ✅ Soporte de bloques (cuando los cursos cambian a mitad de período)
- ✅ Herramientas integradas: comparativa de Excels, transformación de horarios, cruce fuzzy

## 🏗️ Stack Tecnológico

### Backend
- **NestJS 11** - Framework Node.js
- **Prisma 6** - ORM
- **MySQL 8** - Base de datos
- **JWT** - Autenticación
- **ExcelJS** - Generación de reportes
- **Multer** - Upload de archivos

### Frontend
- **React 18** + **TypeScript**
- **Vite 6** - Build tool
- **Tailwind CSS 3** - Estilos
- **Axios** - HTTP client
- **React Router** - Navegación

### Infraestructura
- **Turborepo** + **pnpm workspaces** - Monorepo
- **MySQL 8** via Docker (desarrollo)

## 📁 Estructura del proyecto
```text
control-asistencia-docente/
├── apps/
│ ├── api/ # Backend NestJS (puerto 4000)
│ │ └── src/
│ │ ├── auth/ # JWT + login
│ │ ├── teachers/ # CRUD docentes
│ │ ├── academic/ # Áreas, cursos, sedes, salones, bloques, períodos
│ │ ├── teacher-classes/# Asignación de clases
│ │ ├── attendance/ # Registro diario + vista semanal
│ │ ├── validations/ # Validación del coordinador
│ │ ├── reports/ # Consolidados + Excel
│ │ ├── users/ # Gestión de usuarios
│ │ ├── imports/ # Importación masiva desde Excel
│ │ ├── dashboard/ # Resumen general
│ │ └── tools/ # Herramientas (comparar, horario, cruzar)
│ └── web/ # Frontend React (puerto 5173)
│ └── src/
│ ├── pages/
│ ├── components/
│ ├── api/
│ └── context/
├── packages/
│ └── database/ # Schema Prisma + cliente generado
├── docker-compose.yml
├── turbo.json
└── package.json
```

## 🚀 Inicio rápido (desarrollo local)

### Requisitos
- Node.js 20+
- pnpm 9+
- Docker (para MySQL)

### 1. Clonar e instalar

```bash
git clone https://github.com/tu-usuario/control-asistencia-docente.git
cd control-asistencia-docente
pnpm install
```

### 2. Levantar SQL

```bash
docker compose up -d
```

### 3. Configurar Variables de Entorno

```bash
- apps/web/.env
VITE_API_URL=http://localhost:4000

- apps/api/.env
PORT=4000
DATABASE_URL="mysql://root:root123@localhost:3307/control_asistencia"
JWT_SECRET="tu_secreto_seguro_minimo_32_caracteres"
JWT_EXPIRATION="7d"
```

### 4. Migrar y ejecutar SCRIPT para la Base de Datos

```bash
pnpm db:migrate
pnpm db:seed
```

### 3. Ejecutar

```bash
pnpm dev
```

