# Deployment Guide - Pastoral TDC Platform

This guide explains how to deploy the Event Registration Management Platform to a free hosting service with authentication.

## Platform Overview

The application consists of:
- **Backend**: FastAPI with SQLAlchemy (Python)
- **Frontend**: React with TypeScript (Vite)
- **Database**: PostgreSQL (Railway managed)
- **Authentication**: JWT-based login system

## Free Hosting Options

### Option 1: Railway (Recommended)
- **Cost**: Free tier with 500 hours/month
- **Features**: Automatic deployments, managed PostgreSQL, custom domains
- **Best for**: Full-stack applications

### Option 2: Render + Vercel
- **Cost**: Free tier
- **Features**: Backend on Render, Frontend on Vercel
- **Best for**: Separate service deployment

## Railway Deployment (Recommended)

### Prerequisites
1. GitHub account
2. Railway account (sign up at railway.app)
3. Git repository with your code

### Step 1: Prepare Your Repository
```bash
# Ensure your code is committed to GitHub
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 2: Deploy Backend
1. Go to [Railway](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will detect the backend automatically

### Step 3: Configure Environment Variables
In Railway dashboard, add these variables:
```
DATABASE_URL=<automatically provided by Railway>
JWT_SECRET_KEY=<generate a strong 32+ character secret>
PORT=8000
```

### Step 4: Deploy Frontend
1. Create a new service in the same Railway project
2. Set source as your repository
3. Set build command: `cd frontend && npm run build`
4. Set start command: `cd frontend && npm run preview`

### Step 5: Configure Frontend Environment
Set these variables for the frontend service:
```
VITE_API_URL=<your backend Railway URL>
```

### Step 6: Set up Custom Domain (Optional)
1. In Railway dashboard, go to Settings
2. Add your custom domain
3. Update DNS records as instructed

## Authentication System

The platform includes JWT-based authentication with the following credentials:

### Default Login Credentials
- **Username**: `admin`
- **Password**: `pastoral2024`

### Security Features
- JWT tokens with 24-hour expiration
- SHA256 password hashing
- Protected routes and API endpoints
- Automatic logout on token expiration

## Manual Deployment Steps

### Backend Requirements
Create `requirements.txt` if not present:
```
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
psycopg2-binary==2.9.9
python-multipart==0.0.6
pandas==2.1.3
pydantic==2.5.0
python-jose[cryptography]==3.3.0
PyJWT==2.8.0
redis==5.0.1
python-dotenv==1.0.0
```

### Frontend Build
```bash
cd frontend
npm install
npm run build
```

### Environment Setup
1. Copy `.env.production` files to your deployment environment
2. Replace placeholder values with actual production values
3. Ensure database URL and JWT secret are properly set

## Database Setup

Railway automatically provides PostgreSQL. Your `DATABASE_URL` will be in format:
```
postgresql://user:password@host:port/database
```

The application will automatically create tables on first run.

## Security Considerations

1. **Change Default Password**: Update the admin password in production
2. **JWT Secret**: Use a strong, unique secret key
3. **HTTPS**: Railway provides HTTPS automatically
4. **CORS**: Configure allowed origins for production
5. **Database**: Use managed PostgreSQL, not SQLite

## Monitoring and Logs

- **Railway Logs**: Available in the Railway dashboard
- **Health Check**: `/health` endpoint for monitoring
- **Error Tracking**: Built-in error logging

## Cost Estimation

### Railway Free Tier
- 500 execution hours/month
- 1GB RAM
- 1GB storage
- PostgreSQL included
- **Cost**: $0/month

### After Free Tier
- $5/month for additional resources
- Pay-as-you-scale pricing

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check `requirements.txt` is complete
   - Verify Python version compatibility

2. **Database Connection**
   - Ensure DATABASE_URL is set correctly
   - Check PostgreSQL service is running

3. **Frontend API Calls**
   - Verify VITE_API_URL points to backend
   - Check CORS configuration

4. **Authentication Issues**
   - Verify JWT_SECRET_KEY is set
   - Check password hash generation

### Debug Commands
```bash
# Check backend health
curl https://your-backend-url.railway.app/health

# Test authentication
curl -X POST https://your-backend-url.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "pastoral2024"}'
```

## Alternative Free Hosting

### Render (Backend) + Vercel (Frontend)

#### Render Backend
1. Connect GitHub repository
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

#### Vercel Frontend
1. Connect GitHub repository
2. Set framework preset: Vite
3. Set build command: `npm run build`
4. Set output directory: `dist`

## Support

For deployment issues:
1. Check Railway/Render documentation
2. Review application logs
3. Verify environment variables
4. Test locally first

The platform is ready for production deployment with authentication and should work seamlessly on any of these hosting platforms.