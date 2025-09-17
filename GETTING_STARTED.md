# 🚀 Getting Started with Pastoral_tdc

## Welcome to Your First Claude Code Project!

This guide will help you continue working with your Event Registration Management Platform.

## 📍 **Your Project Location**
```
C:\Users\chica\Pastoral_tdc\
```

## 🔄 **How to Resume This Project**

### **Option 1: Using Claude Code (Recommended)**
1. Open a new Claude Code session
2. Navigate to your project: `cd C:\Users\chica\Pastoral_tdc`
3. Claude will automatically understand your project structure
4. Continue asking Claude for help with modifications

### **Option 2: Using VS Code or Other IDEs**
1. Open VS Code
2. File → Open Folder → Select `C:\Users\chica\Pastoral_tdc`
3. Install recommended extensions for React and Python

### **Option 3: Command Line**
1. Open PowerShell or Command Prompt
2. Run: `cd C:\Users\chica\Pastoral_tdc`
3. Use the development commands below

## 🛠️ **Development Commands**

### **Start the Full Application**
```bash
# Install dependencies (first time only)
npm run install:all

# Start both frontend and backend
npm run dev
```

### **Start Components Separately**
```bash
# Frontend only (React + Vite)
cd frontend
npm run dev

# Backend only (FastAPI)
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### **Access Your Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📁 **Project Structure**
```
Pastoral_tdc/
├── backend/          # FastAPI + SQLAlchemy
├── frontend/         # React + TypeScript + TailwindCSS
├── CLAUDE.md        # Instructions for Claude
├── README.md        # Project documentation
└── package.json     # Development scripts
```

## 🎯 **What Your Platform Can Do**

### **Core Features Built:**
✅ CSV Upload with intelligent column mapping
✅ Metadata enrichment (Strategic Lines, Activities, Years)
✅ Real-time attendance management
✅ Comprehensive analytics and indicators
✅ Controlled vocabularies management
✅ Data quality monitoring
✅ Audit trail for all changes
✅ Walk-in registration support

### **Key Pages:**
- **Home**: Welcome and overview
- **Upload CSV**: Process Google Forms exports
- **Dashboard**: Key metrics and charts
- **Indicators**: Detailed analytics by audience
- **Attendance**: Manage event attendance
- **Admin**: Catalog management and data quality

## 🔧 **Making Modifications**

### **Common Tasks:**

1. **Add New Features:**
   - Ask Claude: "Add a new feature to export attendance reports"
   - Claude will guide you through the implementation

2. **Fix Issues:**
   - Ask Claude: "The upload is not working, help me debug"
   - Share error messages for specific help

3. **Customize Appearance:**
   - Ask Claude: "Change the color scheme to match our branding"
   - Modify components in `frontend/src/components/`

4. **Add New Data Fields:**
   - Ask Claude: "Add a 'department' field to registrants"
   - Claude will update database, validation, and UI

### **Working with Claude Code:**

**Best Practices:**
- Be specific about what you want to change
- Share error messages when things don't work
- Ask for explanations if you want to understand the code
- Request step-by-step guides for complex changes

**Example Requests:**
- "Add email notifications when someone registers"
- "Create a report showing attendance by strategic line"
- "Add user authentication and login system"
- "Export data to PDF format"

## 🗃️ **Database & Data**

Your SQLite database will be created automatically at:
```
C:\Users\chica\Pastoral_tdc\backend\database.db
```

**To reset/start fresh:**
```bash
cd backend
rm database.db
# Restart the backend - tables will be recreated
```

## 📝 **Key Files to Know**

### **Backend (Python/FastAPI):**
- `backend/main.py` - Main application entry point
- `backend/app/models.py` - Database structure
- `backend/app/routers/` - API endpoints

### **Frontend (React/TypeScript):**
- `frontend/src/pages/` - Main application pages
- `frontend/src/components/` - Reusable UI components
- `frontend/src/types/index.ts` - Data type definitions

## 🆘 **Getting Help**

### **From Claude Code:**
- Start a new session and navigate to your project
- Ask specific questions about features or issues
- Request explanations for any code you don't understand

### **Error Troubleshooting:**
1. Check the browser console (F12) for frontend errors
2. Check the terminal where backend is running for API errors
3. Share error messages with Claude for help

### **Learning Resources:**
- React: https://react.dev/
- FastAPI: https://fastapi.tiangolo.com/
- TailwindCSS: https://tailwindcss.com/

## 🎉 **Next Steps**

1. **Test the current features** - Start the app and explore all pages
2. **Customize for your needs** - Ask Claude to modify features
3. **Add new functionality** - Think about what else you need
4. **Deploy** - Ask Claude about deployment options when ready

## 📞 **Need Help?**

Just start a new Claude Code session and ask! Claude will remember your project structure and can help with any modifications or issues.

Remember: This is YOUR project now. Feel free to experiment and make changes. Claude is here to help you grow it into exactly what you need for your pastoral work!