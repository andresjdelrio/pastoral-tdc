# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Pastoral_tdc** - an Event Registration Management Platform for managing registrations and participation in in-person events. The platform processes CSV uploads from Google Forms, enriches data with metadata, and provides comprehensive analytics and administration tools.

## Development Commands

### Backend (FastAPI + SQLAlchemy)
- **Start development server**: `cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- **Run tests**: `cd backend && pytest`
- **Install dependencies**: `cd backend && pip install -r requirements.txt`
- **Create virtual environment**: `cd backend && python -m venv venv`
- **Activate virtual environment**:
  - Windows: `cd backend && venv\Scripts\activate`
  - macOS/Linux: `cd backend && source venv/bin/activate`
- **Database migrations**:
  - Create migration: `cd backend && alembic revision --autogenerate -m "description"`
  - Apply migrations: `cd backend && alembic upgrade head`

### Frontend (React)
- **Start development server**: `cd frontend && npm start` (runs on http://localhost:3000)
- **Build for production**: `cd frontend && npm run build`
- **Run tests**: `cd frontend && npm test`
- **Lint code**: `cd frontend && npm run lint`
- **Install dependencies**: `cd frontend && npm install`

### Full Stack Development
- **Start both servers**: `npm run dev` (requires `npm install` in root first)
- **Install all dependencies**: `npm run install:all`

## Project Architecture

### Backend Structure (FastAPI)
- **FastAPI Framework**: Modern async API with automatic OpenAPI documentation
- **Database**: SQLAlchemy ORM with SQLite (configurable to PostgreSQL/MySQL)
- **Migrations**: Alembic for database schema versioning
- **File Upload**: python-multipart for CSV file handling
- **Data Processing**: pandas for CSV parsing and manipulation
- **CORS**: Enabled for frontend communication at localhost:3000

### Database Schema
- **Events**: Strategic line, activity, year metadata
- **Registrations**: Canonical fields (name, RUT, email, career, phone) + additional data + attendance tracking
- **Uploads**: Upload history with column mappings
- **MetadataValues**: Autocomplete suggestions for strategic lines and activities

### API Endpoints Structure
- `/api/ingest/` - CSV preview and upload with intelligent mapping
- `/api/uploads/` - Legacy upload functionality (deprecated)
- `/api/dashboard/` - Statistics and analytics
- `/api/registrations/` - Registration CRUD operations
- `/api/admin/` - Administrative tools and bulk operations

### Frontend Structure (React + Additional Libraries)
- **React Router**: Client-side navigation
- **Axios**: HTTP requests to FastAPI backend
- **recharts**: Charts and data visualization
- **react-dropzone**: File upload interface
- **papaparse**: CSV parsing for preview

### Key Features Implementation

#### CSV Upload Module
- **Intelligent Preview**: `POST /api/ingest/preview` analyzes CSV and returns first 20 rows
- **Spanish-Aware Detection**: Case/accent-insensitive matching for Spanish field variants
- **Auto-Suggestions**: Smart mapping suggestions for canonical fields
- **Validation**: Blocks upload unless all 5 required fields are mapped
- **Workflow**: Upload → Metadata → Mapping → Confirmation → Complete

#### Canonical Fields System
The platform extracts these 5 REQUIRED fields from any CSV:
- `full_name` - Full name of registrant
- `rut` - Chilean national ID
- `university_email` - University email address
- `career_or_area` - Academic program/career
- `phone` - Phone number

**Field Detection**: The system intelligently maps Spanish variants:
- "nombre completo", "estudiante", "participante" → `full_name`
- "rut", "cedula", "documento de identidad" → `rut`
- "correo universitario", "email institucional" → `university_email`
- "carrera", "programa", "área de estudios" → `career_or_area`
- "teléfono", "celular", "número de contacto" → `phone`

#### Metadata Enrichment
- **Required Fields**: Strategic line, Activity, Year
- **Autocomplete**: Suggests previously used values based on usage frequency
- **Strategic Lines**: Fixed categories (Apostolado, Sacramentos, Crecimiento Espiritual, Identidad y Comunidad)

#### Database Integration
- **Attendance Tracking**: Boolean field for marking actual participation
- **Additional Data**: JSON storage for extra CSV columns
- **Duplicate Detection**: Admin tools to identify potential duplicates

### Development Workflow
1. **Backend**: Start FastAPI server on port 8000
2. **Frontend**: Start React dev server on port 3000 (proxies API calls to backend)
3. **Database**: SQLAlchemy creates tables automatically on first run
4. **Migrations**: Use Alembic for schema changes in production

### Environment Configuration
- **Backend**: Uses `.env` file (copy from `.env.example`)
- **Database**: Configurable via `DATABASE_URL` environment variable
- **CORS**: Configured for development (localhost:3000)

### Testing Strategy
- **Backend**: pytest with FastAPI test client
- **Frontend**: React Testing Library + Jest
- **API Testing**: Use FastAPI's automatic OpenAPI docs at `/docs`

### Key Strategic Lines
The platform is designed for these specific strategic lines:
1. **Apostolado** - Apostolic activities
2. **Sacramentos** - Sacramental activities
3. **Crecimiento Espiritual** - Spiritual growth activities
4. **Identidad y Comunidad** - Identity and community activities

### Production Considerations
- **Database**: Migrate from SQLite to PostgreSQL for production
- **File Storage**: Consider cloud storage for CSV files
- **Authentication**: Add user authentication system
- **CORS**: Restrict origins for production deployment
- **Environment**: Use environment variables for all configuration