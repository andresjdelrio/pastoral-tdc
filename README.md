# Event Registration Management Platform

A complete monorepo for managing registrations and participation in in-person events. Features CSV upload from Google Forms, intelligent column mapping, metadata enrichment, and comprehensive analytics.

## 🏗️ Architecture

- **Backend**: FastAPI + SQLAlchemy + Alembic + SQLite
- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui + Recharts
- **Database**: SQLite (development) / PostgreSQL (production)

## 📁 Project Structure

```
my-fullstack-app/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── routers/           # API endpoint modules
│   │   ├── models.py          # Database models
│   │   ├── schemas.py         # Pydantic schemas
│   │   └── database.py        # Database configuration
│   ├── alembic/               # Database migrations
│   ├── main.py                # FastAPI entry point
│   └── requirements.txt       # Python dependencies
├── frontend/                   # React + Vite application
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── pages/             # Page components
│   │   ├── types/             # TypeScript types
│   │   └── lib/               # Utilities
│   ├── package.json           # Node.js dependencies
│   └── vite.config.ts         # Vite configuration
└── package.json               # Monorepo scripts
```

## 🗄️ Database Models

### Core Tables
- **activities**: Strategic line, activity name, and year
- **registrants**: Person information with canonical fields
- **registrations**: Links registrants to activities with attendance tracking
- **forms_uploads**: CSV upload history and column mappings

### Canonical Fields
The platform extracts these standard fields from any CSV:
- `full_name` - Full name of registrant
- `rut` - Chilean national ID
- `university_email` - University email address
- `career` - Academic program/career
- `phone` - Phone number

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.8+ and pip
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-fullstack-app
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up backend environment**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize database**
   ```bash
   cd backend
   # Create initial migration
   alembic revision --autogenerate -m "Initial migration"
   # Apply migrations
   alembic upgrade head
   ```

### Development

**Start both servers** (recommended):
```bash
npm run dev
```

This runs both backend (port 8000) and frontend (port 3000) concurrently.

**Or start individually:**

**Backend only:**
```bash
npm run dev:backend
# or
cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend only:**
```bash
npm run dev:frontend
# or
cd frontend && npm run dev
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)

## 🛠️ Development Commands

### Backend Commands
```bash
cd backend

# Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Database migrations
alembic revision --autogenerate -m "Description"
alembic upgrade head

# Run tests
pytest
```

### Frontend Commands
```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Install dependencies
npm install
```

### Monorepo Commands
```bash
# Start both servers
npm run dev

# Install all dependencies
npm run install:all

# Build frontend
npm run build:frontend

# Test frontend
npm run test:frontend

# Lint frontend
npm run lint:frontend
```

## 🔧 Configuration

### Backend Configuration (.env)
```env
DATABASE_URL=sqlite:///./event_platform.db
SECRET_KEY=your-secret-key-here
ENVIRONMENT=development
```

### Frontend Configuration
- **Proxy**: Automatically proxies `/api/*` requests to backend
- **TypeScript**: Strict mode enabled
- **Tailwind**: Custom design system with shadcn/ui components

## 📊 Key Features

### 1. CSV Upload Module
- Intelligent column mapping to canonical fields
- Preview system before confirmation
- Metadata enrichment (strategic line, activity, year)
- Support for additional CSV columns

### 2. Analytics Dashboard
- Registration and participation statistics
- Conversion rate tracking
- Strategic line breakdowns
- Year-over-year comparisons
- Interactive charts with Recharts

### 3. Database Management
- Edit registrant information
- Mark attendance for events
- Bulk operations for administrators
- Duplicate detection and resolution

### 4. Strategic Lines
The platform supports four main categories:
- **Apostolado** - Apostolic activities
- **Sacramentos** - Sacramental activities
- **Crecimiento Espiritual** - Spiritual growth activities
- **Identidad y Comunidad** - Identity and community activities

## 🔌 API Endpoints

### Main Routes
- `GET /` - API health check
- `GET /docs` - Interactive API documentation

### Upload Endpoints
- `POST /api/uploads/preview-csv` - Preview CSV and get column suggestions
- `POST /api/uploads/upload-csv` - Upload CSV with confirmed mappings
- `GET /api/uploads/metadata/{field_name}` - Get autocomplete suggestions

### Dashboard Endpoints
- `GET /api/dashboard/stats` - Get analytics statistics
- `GET /api/dashboard/events` - Get events with basic stats

### Registration Endpoints
- `GET /api/registrations/` - List registrations with filtering
- `PUT /api/registrations/{id}` - Update registration
- `PATCH /api/registrations/{id}/attendance` - Toggle attendance

### Admin Endpoints
- `GET /api/admin/registrations` - Admin view of all registrations
- `PATCH /api/admin/registrations/bulk-attendance` - Bulk attendance updates
- `GET /api/admin/stats/duplicates` - Find duplicate registrations

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest                          # Run all tests
pytest tests/test_uploads.py    # Run specific test file
pytest -v                       # Verbose output
```

### Frontend Testing
```bash
cd frontend
npm test                        # Run tests in watch mode
npm run test:coverage          # Run with coverage report
```

## 🚀 Production Deployment

### Backend
1. Set up PostgreSQL database
2. Update `DATABASE_URL` in production environment
3. Run database migrations: `alembic upgrade head`
4. Use a production WSGI server like Gunicorn
5. Set up proper CORS origins

### Frontend
1. Build the application: `npm run build:frontend`
2. Serve static files with nginx or similar
3. Configure API proxy to backend server

### Environment Variables
```env
# Production
DATABASE_URL=postgresql://user:password@localhost/dbname
SECRET_KEY=secure-random-string
ENVIRONMENT=production
CORS_ORIGINS=https://yourdomain.com
```

## 📈 Performance Considerations

- **Database**: Use connection pooling for production
- **Caching**: Consider Redis for frequently accessed data
- **File Storage**: Use cloud storage for CSV files in production
- **Monitoring**: Add logging and monitoring for production

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.