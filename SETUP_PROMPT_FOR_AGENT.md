# Wheat-Mill Project - Setup and Launch Instructions

## Project Overview
This is a **Wheat-Mill Management System** - a full-stack web application for managing wheat mill operations including sessions, sales, debts, drivers, expenses, and partners. The application uses:
- **Backend**: Django REST Framework with SQLite database
- **Frontend**: React + Vite
- **Language**: Arabic (RTL support)

---

## ⚠️ IMPORTANT: Reserved Ports
**DO NOT USE THESE PORTS** - they are already reserved by this project:
- **Port 5173**: Frontend (Vite dev server)
- **Port 8000**: Backend (Django server)

If you need to run another project, please use different ports (e.g., 5174, 8001, 3000, etc.)

---

## Project Structure
```
d:\Wheat-Mill\
├── backend/                 # Django REST API
│   ├── venv/               # Python virtual environment
│   ├── manage.py           # Django management script
│   ├── wheat_mill/         # Main Django project
│   ├── accounts/           # User authentication app
│   ├── sessions_manager/   # Core business logic app
│   └── db.sqlite3          # SQLite database
├── frontend/               # React + Vite frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── start_dev.ps1          # PowerShell startup script
└── start_dev.sh           # Bash startup script (for Linux/Mac)
```

---

## Prerequisites
Ensure the following are installed:
1. **Python 3.8+** (with pip)
2. **Node.js 16+** (with npm)
3. **Git** (optional, for version control)

---

## Setup Instructions

### 1. Backend Setup (Django)

Navigate to the backend directory:
```powershell
cd d:\Wheat-Mill\backend
```

**Create Python virtual environment** (if not exists):
```powershell
python -m venv venv
```

**Activate virtual environment**:
```powershell
.\venv\Scripts\activate
```

**Install Python dependencies**:
```powershell
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers
```

**Run migrations** (to set up the database):
```powershell
python manage.py migrate
```

**Create superuser** (optional, for admin access):
```powershell
python manage.py createsuperuser
```

---

### 2. Frontend Setup (React + Vite)

Navigate to the frontend directory:
```powershell
cd d:\Wheat-Mill\frontend
```

**Install Node dependencies**:
```powershell
npm install
```

---

## Running the Project

### Option 1: Automated Startup (Recommended)

From the project root directory (`d:\Wheat-Mill\`), run:

```powershell
.\start_dev.ps1
```

This script will:
- ✅ Start Django backend on **http://127.0.0.1:8000**
- ✅ Start Vite frontend on **http://localhost:5173**
- ✅ Automatically open the browser when ready
- ✅ Run both servers in the background (hidden windows)

**To stop the servers**, run:
```powershell
.\stop_dev.ps1
```
Or manually kill the processes via Task Manager (look for `python.exe` and `node.exe`).

---

### Option 2: Manual Startup

**Terminal 1 - Backend:**
```powershell
cd d:\Wheat-Mill\backend
.\venv\Scripts\activate
python manage.py runserver
```

**Terminal 2 - Frontend:**
```powershell
cd d:\Wheat-Mill\frontend
npm run dev
```

Then open your browser to **http://localhost:5173**

---

## Adding to Windows Startup (Auto-launch on Boot)

To make the project start automatically when Windows boots:

### Method 1: Using Task Scheduler (Recommended)

1. Press `Win + R`, type `taskschd.msc`, press Enter
2. Click **"Create Basic Task"**
3. Name: `Wheat-Mill Auto Start`
4. Trigger: **"When I log on"**
5. Action: **"Start a program"**
6. Program/script: `powershell.exe`
7. Add arguments: `-WindowStyle Hidden -ExecutionPolicy Bypass -File "d:\Wheat-Mill\start_dev.ps1"`
8. Start in: `d:\Wheat-Mill`
9. Finish and enable the task

### Method 2: Using Startup Folder

1. Press `Win + R`, type `shell:startup`, press Enter
2. Create a new shortcut in the Startup folder
3. Target: `powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "d:\Wheat-Mill\start_dev.ps1"`
4. Start in: `d:\Wheat-Mill`
5. Name it `Wheat-Mill`

---

## Configuration Details

### Backend Configuration (`backend/wheat_mill/settings.py`)
- **Port**: 8000 (default Django runserver)
- **Allowed Hosts**: `localhost`, `127.0.0.1`
- **CORS Origins**: `http://localhost:5173`, `http://127.0.0.1:5173`
- **Database**: SQLite (`db.sqlite3`)
- **Language**: Arabic (`ar`)
- **Timezone**: `Asia/Baghdad`

### Frontend Configuration (`frontend/vite.config.js`)
- **Port**: 5173
- **Proxy**: `/api` → `http://127.0.0.1:8000` (API requests are proxied to backend)

---

## Key Features
- 📊 **Session Management**: Track wheat mill sessions
- 💰 **Sales Tracking**: Record sales with payment types (cash/debts)
- 📝 **Debt Management**: Track customer debts and payments
- 🚚 **Driver Jobs**: Manage driver transport jobs
- 💸 **Expenses**: Record session expenses
- 🤝 **Partners**: Manage business partners with profit sharing
- 🖨️ **Print Reports**: Generate printable reports for all modules
- 🔐 **Authentication**: JWT-based user authentication

---

## Troubleshooting

### Port Already in Use
If you see errors about ports 5173 or 8000 being in use:
```powershell
# Find and kill process on port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Find and kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Virtual Environment Issues
If `venv` doesn't exist or is corrupted:
```powershell
cd d:\Wheat-Mill\backend
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\activate
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers
```

### Frontend Dependencies Issues
```powershell
cd d:\Wheat-Mill\frontend
Remove-Item -Recurse -Force node_modules
npm install
```

---

## API Endpoints
- **Authentication**: `/api/accounts/login/`, `/api/accounts/register/`
- **Sessions**: `/api/sessions/`
- **Sales**: `/api/sales/`
- **Debts**: `/api/debts/`
- **Drivers**: `/api/driver-jobs/`
- **Expenses**: `/api/expenses/`
- **Partners**: `/api/partners/`
- **Print Reports**: `/api/sessions/print/{type}/`

---

## Notes for Agent
1. **Always check if ports 5173 and 8000 are available** before starting
2. **If ports conflict**, modify:
   - Frontend port in `frontend/vite.config.js` (line 7)
   - Backend port in startup commands (use `python manage.py runserver 8001`)
   - Update CORS settings in `backend/wheat_mill/settings.py` to match new frontend port
3. **The database is already set up** - no need to run migrations unless schema changes
4. **The project uses Arabic language** - ensure proper RTL support in any modifications
5. **Print templates** are server-side rendered Django templates with modern styling

---

## Quick Start Summary
```powershell
# From d:\Wheat-Mill\
.\start_dev.ps1

# Access the application at:
# http://localhost:5173
```

That's it! The project should now be running and accessible.
