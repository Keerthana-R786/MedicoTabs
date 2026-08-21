# Team Setup Guide - MedicoTabs EHR

## For New Team Members

### Prerequisites
- Node.js v16+ installed
- Git installed
- Code editor (VS Code recommended)

---

## 🚀 Quick Start (2 Options)

### Option 1: Frontend Only (Easiest)

If you only need to work on the UI and use the deployed backend:

**1. Clone the repository**
```bash
git clone <your-repo-url>
cd UX
```

**2. Setup frontend**
```bash
cd frontend
npm install
```

**3. Create `frontend/.env` file**
```env
VITE_BACKEND_API_URL=https://medicotabs.onrender.com
```

**4. Run frontend**
```bash
npm run dev
```

**5. Open browser**
Go to: http://localhost:5173

**Login credentials:**
- Email: `doctor@medicotabs.com`
- Password: `password123`

✅ **Done!** You're using the deployed backend.

---

### Option 2: Full Stack (Frontend + Backend)

If you need to run both frontend and backend locally:

#### Step 1: Clone Repository
```bash
git clone <your-repo-url>
cd UX
```

#### Step 2: Setup Backend

**A. Install dependencies**
```bash
cd backend
npm install
```

**B. Create `backend/.env` file**

**IMPORTANT:** Contact your team lead for the Supabase credentials!

Create `backend/.env` with:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase Configuration (GET THESE FROM TEAM LEAD)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

# YOXA Integration (leave empty for now)
YOXA_TRIGGER_URL=
YOXA_DEPLOYMENT_SECRET=
YOXA_DEPLOYMENT_ID=
YOXA_API_BASE=
YOXA_HITL_WEBHOOK_SIGNING_SECRET=
YOXA_HITL_RESPONSE_SECRET=

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Security
WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS=300
```

**C. Start backend**
```bash
npm start
```

You should see:
```
✓ Server running
  Local: http://localhost:5000
```

#### Step 3: Setup Frontend

**A. Install dependencies**
```bash
cd ../frontend
npm install
```

**B. Create `frontend/.env` file**
```env
VITE_BACKEND_API_URL=http://localhost:5000
```

**C. Start frontend**
```bash
npm run dev
```

**D. Open browser**
Go to: http://localhost:5173

**Login credentials:**
- Email: `doctor@medicotabs.com`
- Password: `password123`

✅ **Done!** Both frontend and backend running locally.

---

## 🔧 Troubleshooting

### Backend won't start

**Error: "Database connection failed"**
- ✅ Check that you have the correct Supabase credentials in `backend/.env`
- ✅ Contact team lead for credentials

**Error: "Port 5000 already in use"**
- Change PORT in `backend/.env` to `5001` or another free port
- Update `frontend/.env` to match: `VITE_BACKEND_API_URL=http://localhost:5001`

**Error: "Cannot find module"**
- Run `npm install` again in the backend folder

### Frontend won't start

**Error: "Cannot connect to backend"**
- ✅ Check backend is running at http://localhost:5000/health
- ✅ Check `frontend/.env` has correct backend URL

**Error: Module not found**
- Run `npm install` again in the frontend folder

**Port already in use**
- Vite will automatically use next available port (5174, 5175, etc.)

---

## 📁 Project Structure

```
UX/
├── frontend/              # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── pages/        # All UI pages
│   │   ├── components/   # Reusable components
│   │   ├── services/     # API calls
│   │   └── types/        # TypeScript types
│   ├── .env              # Frontend config (CREATE THIS)
│   └── package.json
│
├── backend/              # Node.js + Express
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── config/       # Database, YOXA config
│   │   └── utils/        # Helper functions
│   ├── .env              # Backend config (CREATE THIS)
│   └── package.json
│
└── README.md
```

---

## 🔐 Security - IMPORTANT!

**NEVER commit these files:**
- ❌ `backend/.env`
- ❌ `frontend/.env`
- ❌ `node_modules/`

These are already in `.gitignore` - **do not remove them!**

**Supabase credentials are sensitive:**
- Share via secure channels (Slack DM, password manager, etc.)
- Never post in public channels
- Never commit to Git

---

## 🆘 Getting Help

**Cannot get backend credentials?**
- Contact team lead for Supabase access

**Backend not working?**
- Use Option 1 (deployed backend) instead

**Other issues?**
- Check the troubleshooting section above
- Ask in team chat
- Check backend logs for error messages

---

## 📚 Additional Documentation

- `START_HERE.md` - Project overview and launch instructions
- `README.md` - Project description and architecture
- `DEPLOYMENT.md` - How the system is deployed
- `backend/YOXA_INTEGRATION_GUIDE.md` - YOXA workflow integration

---

## ✅ Verification Checklist

Before starting work, verify:

- [ ] Node.js v16+ installed (`node --version`)
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install` in frontend and/or backend)
- [ ] `.env` files created with correct values
- [ ] Backend starts without errors (if running locally)
- [ ] Frontend starts without errors
- [ ] Can access http://localhost:5173
- [ ] Can login to the application
- [ ] Can see patient records page

**All checked?** You're ready to start developing! 🚀
