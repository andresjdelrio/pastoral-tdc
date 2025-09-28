# Railway Deployment Guide - Step by Step

Follow these exact steps to deploy your Pastoral TDC platform to Railway.

## Prerequisites ✅
- Your code is saved in a GitHub repository
- You have a Railway account (https://railway.app)
- The platform is working locally

## Step 1: Prepare for Deployment

1. **Commit all changes to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment with authentication"
   git push origin main
   ```

2. **Verify files are in place:**
   - ✅ `railway.toml` (deployment configuration)
   - ✅ `backend/requirements.txt` (Python dependencies)
   - ✅ `backend/.env.production` (environment template)
   - ✅ `frontend/.env.production` (frontend environment)
   - ✅ `DEPLOYMENT.md` (full documentation)

## Step 2: Deploy Backend to Railway

1. **Go to Railway Dashboard:**
   - Visit https://railway.app
   - Sign in with GitHub
   - Click "New Project"

2. **Deploy from GitHub:**
   - Click "Deploy from GitHub repo"
   - Select your repository: `Pastoral_tdc`
   - Railway will detect the services automatically

3. **Configure Backend Service:**
   - Railway will create a service for the backend
   - Go to the backend service settings
   - Add these environment variables:

   ```
   PORT=8000
   JWT_SECRET_KEY=your-super-secure-secret-key-change-this-in-production
   DATABASE_URL=${DATABASE_URL}
   ```

4. **Add PostgreSQL Database:**
   - In your Railway project, click "New"
   - Select "PostgreSQL"
   - Railway will automatically provide DATABASE_URL

## Step 3: Deploy Frontend to Railway

1. **Add Frontend Service:**
   - In the same Railway project, click "New"
   - Select "GitHub Repo"
   - Choose the same repository
   - Set the source directory to `frontend`

2. **Configure Frontend Build:**
   - Set Build Command: `npm run build:prod`
   - Set Start Command: `npm run preview`
   - Add environment variable:
   ```
   VITE_API_URL=https://YOUR-BACKEND-URL.railway.app
   ```

## Step 4: Get Your URLs

1. **Backend URL:**
   - Go to your backend service
   - Click "Settings" → "Domains"
   - Copy the public domain (e.g., `https://backend-production-xxxx.railway.app`)

2. **Update Frontend Environment:**
   - Go to frontend service variables
   - Update `VITE_API_URL` with your backend URL

3. **Frontend URL:**
   - Go to your frontend service
   - Click "Settings" → "Domains"
   - Copy the public domain (e.g., `https://frontend-production-xxxx.railway.app`)

## Step 5: Test Your Deployment

1. **Visit your frontend URL**
2. **Test login with credentials:**
   - Username: `admin`
   - Password: `pastoral2024`
3. **Verify all modules work:**
   - Dashboard
   - Upload functionality
   - Database management
   - Admin panel with user management

## Step 6: Set Up Custom Domain (Optional)

1. **In Railway Dashboard:**
   - Go to frontend service
   - Click "Settings" → "Domains"
   - Click "Custom Domain"
   - Enter your domain (e.g., `pastoral.yourdomain.com`)

2. **Update DNS:**
   - Add CNAME record pointing to Railway's domain
   - Wait for DNS propagation (5-60 minutes)

## Troubleshooting

### Backend Issues
- **Check Logs:** Railway Dashboard → Backend Service → "View Logs"
- **Database Connection:** Ensure PostgreSQL service is running
- **Environment Variables:** Verify all required variables are set

### Frontend Issues
- **Build Errors:** Check build logs in Railway dashboard
- **API Connection:** Verify VITE_API_URL is correct
- **CORS Issues:** Backend automatically allows Railway domains

### Authentication Issues
- **Login Failed:** Check JWT_SECRET_KEY is set
- **No Users:** Database automatically creates admin user

## Expected Result

After successful deployment, you'll have:

✅ **Secure Web Platform** accessible at your Railway URL
✅ **User Authentication** with admin access
✅ **User Management** in the admin panel
✅ **All Modules Working:** Upload, Database, Indicators, etc.
✅ **PostgreSQL Database** with automatic table creation
✅ **HTTPS Security** provided by Railway

## Cost Information

- **Free Tier:** 500 execution hours/month
- **After Free Tier:** $5/month for additional resources
- **Total Cost:** $0/month for development, ~$5-10/month for production

## Login Credentials

- **Username:** `admin`
- **Password:** `pastoral2024`

**IMPORTANT:** Change the password after first login using the User Management feature!

## Support

If you encounter issues:
1. Check Railway logs first
2. Verify environment variables
3. Test locally to ensure code works
4. Review Railway documentation

Your platform is now deployed and accessible worldwide! 🚀