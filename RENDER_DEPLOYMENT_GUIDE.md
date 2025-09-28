# Render Deployment Guide - Free Hosting

Deploy your Pastoral TDC platform to Render for free with PostgreSQL database included.

## Prerequisites ✅
- GitHub repository is ready and pushed
- Render account (https://render.com - sign up with GitHub)

## Step 1: Create Render Account
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub account
4. Authorize Render to access your repositories

## Step 2: Deploy Using Blueprint (Recommended)

### Option A: Deploy with render.yaml (Automated)
1. **Push render.yaml to GitHub**:
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Create Blueprint in Render**:
   - Go to Render dashboard
   - Click "New" → "Blueprint"
   - Connect your GitHub account if not done
   - Select repository: `andresjdelrio/pastoral-tdc`
   - Click "Connect"
   - Render will automatically detect `render.yaml` and create services

### Option B: Manual Service Creation

#### Deploy Backend First
1. **Create Web Service**:
   - Click "New" → "Web Service"
   - Connect GitHub repo: `andresjdelrio/pastoral-tdc`
   - Set these values:
     - **Name**: `pastoral-backend`
     - **Root Directory**: `backend`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

2. **Add Environment Variables**:
   - `JWT_SECRET_KEY`: Click "Generate" for auto-generated secure key
   - `PORT`: `10000` (Render sets this automatically)

#### Create Database
1. **Add PostgreSQL Database**:
   - Click "New" → "PostgreSQL"
   - Name: `pastoral-db`
   - Database Name: `pastoral_tdc`
   - User: `pastoral_user`
   - Click "Create Database"

2. **Link Database to Backend**:
   - Go to backend service → Environment
   - Add environment variable:
     - Key: `DATABASE_URL`
     - Value: Link to `pastoral-db` database

#### Deploy Frontend
1. **Create Static Site**:
   - Click "New" → "Static Site"
   - Connect same GitHub repo: `andresjdelrio/pastoral-tdc`
   - Set these values:
     - **Name**: `pastoral-frontend`
     - **Root Directory**: `frontend`
     - **Build Command**: `npm install && npm run build:prod`
     - **Publish Directory**: `dist`

2. **Add Environment Variable**:
   - `VITE_API_URL`: `https://pastoral-backend.onrender.com`
   - (Replace with your actual backend URL from step 1)

## Step 3: Get Your URLs

After deployment completes:

1. **Backend URL**: `https://pastoral-backend.onrender.com`
2. **Frontend URL**: `https://pastoral-frontend.onrender.com`
3. **Database**: Automatically connected via `DATABASE_URL`

## Step 4: Update Frontend with Backend URL

1. Go to Frontend service → Environment
2. Update `VITE_API_URL` with your actual backend URL
3. Trigger redeploy

## Step 5: Test Your Deployment

Visit your frontend URL and test:
- Login with: `admin` / `pastoral2024`
- User management in Admin panel
- All platform features

## Configuration Files

### render.yaml (Blueprint)
✅ Already created in your repository
- Configures both services and database
- Automatic deployment and linking

### Environment Variables
- `JWT_SECRET_KEY`: Auto-generated secure key
- `DATABASE_URL`: Auto-linked to PostgreSQL
- `VITE_API_URL`: Points to backend service

## Free Tier Limits

- **750 hours/month** for web services
- **90 days** of inactivity before sleep
- **PostgreSQL**: 1GB storage, 97 connection limit
- **Bandwidth**: 100GB/month

## Troubleshooting

### Build Issues
- Check logs in Render dashboard
- Verify `requirements.txt` in backend
- Verify `package.json` in frontend

### CORS Issues
- Backend already configured for Render domains
- Check `allow_origins` in `main.py`

### Database Connection
- Verify `DATABASE_URL` environment variable
- Check PostgreSQL service status
- Tables are created automatically on first run

## Expected Result

✅ **Live Platform**: Your app accessible at Render URLs
✅ **PostgreSQL Database**: Persistent data storage
✅ **Authentication**: JWT-based login system
✅ **User Management**: Admin controls working
✅ **HTTPS**: Automatic SSL certificates
✅ **Custom Domains**: Available in Render dashboard

## Login Credentials

- **Username**: `admin`
- **Password**: `pastoral2024`

**IMPORTANT**: Change password after first login using User Management!

## Cost: $0/month

Render's free tier provides everything needed for development and small production use.

---

Your platform will be live at:
- **Frontend**: https://pastoral-frontend.onrender.com
- **Backend API**: https://pastoral-backend.onrender.com
- **Admin Login**: Use credentials above

🚀 **Ready to deploy!**