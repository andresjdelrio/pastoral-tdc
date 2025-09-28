# Free Hosting Guide - No Credit Card Required

Deploy your Pastoral TDC platform completely free without any credit card requirements.

## Option 1: GitHub Pages + JSON Database (Simplest)

### Step 1: Enable GitHub Pages
1. Go to your repository: https://github.com/andresjdelrio/pastoral-tdc
2. Click "Settings" → "Pages"
3. Source: "Deploy from a branch"
4. Branch: "main"
5. Folder: "/ (root)"

### Step 2: Modify for Static Deployment
Your frontend will be hosted at: `https://andresjdelrio.github.io/pastoral-tdc`

## Option 2: Netlify (No Credit Card Required)

### Frontend Deployment
1. **Create Netlify Account**: https://netlify.com (sign up with GitHub)
2. **Deploy Site**:
   - Click "New site from Git"
   - Choose GitHub → pastoral-tdc repository
   - Build settings:
     - Base directory: `frontend`
     - Build command: `npm run build:prod`
     - Publish directory: `frontend/dist`

### Backend Options for Netlify
**Option A: Netlify Functions (Serverless)**
- Free tier: 125k function invocations/month
- No credit card required

**Option B: Use JSON file storage**
- Store data in JSON files in repository
- No database server needed

## Option 3: Vercel (No Credit Card)

### Deployment Steps
1. **Create Vercel Account**: https://vercel.com (sign up with GitHub)
2. **Import Project**:
   - Click "New Project"
   - Import from GitHub: `pastoral-tdc`
   - Framework: "Other"
   - Root Directory: `frontend`
   - Build Command: `npm run build:prod`
   - Output Directory: `dist`

## Option 4: PythonAnywhere (Free Python Hosting)

### For Full Python Backend
1. **Create Account**: https://pythonanywhere.com (free tier available)
2. **Upload Code**: Upload your backend folder
3. **Configure Web App**: Python 3.9, Flask/FastAPI
4. **Free Tier**: 1 web app, limited CPU seconds

## Recommended: Netlify Deployment

Let me set up **Netlify** configuration since it's the most reliable free option:

### Netlify Configuration

1. **Frontend on Netlify**:
   - Unlimited bandwidth
   - Custom domains
   - HTTPS automatic
   - No credit card needed

2. **Backend Options**:
   - **Option A**: Convert to Netlify Functions
   - **Option B**: Use GitHub as database (JSON files)
   - **Option C**: Connect to external free database

### Quick Steps:
1. Go to https://netlify.com
2. Sign up with GitHub
3. Click "New site from Git"
4. Choose your repository
5. Set build settings as above
6. Deploy!

## Data Storage Options (No Database Server)

### Option 1: JSON File Storage
Store user data in JSON files in your repository:
- `users.json` for user management
- `registrations.json` for event data
- Commit changes back to GitHub

### Option 2: GitHub API as Database
Use GitHub API to store data in repository files:
- Create/update files via GitHub API
- Version controlled data
- Free with GitHub account

### Option 3: Local Storage Only
For demo purposes:
- Store data in browser localStorage
- No persistence across devices
- Good for testing/demo

## Expected Result

✅ **Free Web Platform**: Your app accessible via free hosting URL
✅ **No Credit Card**: Completely free tier
✅ **Authentication**: Working login system
✅ **User Management**: Admin controls functional
✅ **HTTPS**: Automatic SSL certificates
✅ **Custom Domain**: Available on most platforms

## Login Credentials

- **Username**: `admin`
- **Password**: `pastoral2024`

## Next Steps

Choose your preferred option:
1. **Simplest**: GitHub Pages (static only)
2. **Best Balance**: Netlify (recommended)
3. **Most Features**: Vercel
4. **Full Backend**: PythonAnywhere

All options are 100% free with no credit card requirements!