# Backend Deployment to Render

## Why Render?

- ✅ Free tier available
- ✅ Automatic deployments from GitHub
- ✅ Built-in HTTPS
- ✅ Environment variables management
- ✅ Easy setup (5-10 minutes)
- ✅ Perfect for Node.js backends

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Backend

Your backend is already Render-ready! But let's verify:

#### Check `package.json` has start script:

File: `backend/package.json`

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  }
}
```

✅ **Already correct!**

---

### Step 2: Push to GitHub

```bash
cd "c:\Users\Keerthana R\Downloads\UX"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/medicotabs-ehr.git
git push -u origin main
```

✅ **Your code is now on GitHub!**

---

### Step 3: Deploy to Render

#### A. Create Render Account
1. Go to https://render.com
2. Click **Get Started for Free**
3. Sign up with GitHub (recommended)
4. Authorize Render to access your repositories

#### B. Create New Web Service
1. Click **New +** → **Web Service**
2. Connect your GitHub repository:
   - Search for: `medicotabs-ehr` (or your repo name)
   - Click **Connect**

#### C. Configure Service

**Basic Settings:**
```
Name: medicotabs-backend
Region: Choose closest to you (e.g., Oregon, Frankfurt)
Branch: main
Root Directory: backend
```

**Build & Deploy Settings:**
```
Runtime: Node
Build Command: npm install
Start Command: npm start
```

**Instance Type:**
```
Free (for testing)
or
Starter ($7/month - for production)
```

---

### Step 4: Add Environment Variables

In Render dashboard, go to **Environment** section and add these:

#### Required Variables:

```env
NODE_ENV=production

# Supabase
SUPABASE_URL=https://xhojlbaryvxrddyndwor.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhob2psYmFyeXZ4cmRkeW5kd29yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIxMzY2OCwiZXhwIjoyMTAyNzg5NjY4fQ.NMfX7hcZ1-kDeS0tkJyMGi-BcmPSCbroJX9PiPsilgY
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhob2psYmFyeXZ4cmRkeW5kd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMTM2NjgsImV4cCI6MjEwMjc4OTY2OH0.ugXQmdeKTpLxiYGC7XPvoznlvhqebitdSHjmW25RqpU

# YOXA Integration (will add after YOXA setup)
YOXA_TRIGGER_URL=
YOXA_DEPLOYMENT_SECRET=
YOXA_DEPLOYMENT_ID=
YOXA_API_BASE=
YOXA_HITL_WEBHOOK_SIGNING_SECRET=
YOXA_HITL_RESPONSE_SECRET=

# CORS (IMPORTANT!)
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-url.vercel.app

# Other
PORT=5000
WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS=300
```

**⚠️ Important:** Leave YOXA variables empty for now. You'll add them after YOXA configuration.

---

### Step 5: Deploy!

1. Click **Create Web Service**
2. Render will:
   - Clone your repository
   - Install dependencies
   - Start your server
   - Provide HTTPS URL

**Wait 2-3 minutes...**

You'll get a URL like:
```
https://medicotabs-backend.onrender.com
```

✅ **Your backend is now live!**

---

### Step 6: Verify Deployment

#### Test Health Endpoint:

Open in browser:
```
https://medicotabs-backend.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-...",
  "service": "MedicoTabs Backend API"
}
```

✅ **Backend is working!**

#### Check Logs:

In Render dashboard:
- Click **Logs** tab
- Should see:
  ```
  ✓ Database connection successful
  ✓ Server running
  ```

---

### Step 7: Update Frontend to Use Deployed Backend

#### Option A: Keep Frontend Local (Testing)

Update `frontend/.env`:
```env
VITE_BACKEND_API_URL=https://medicotabs-backend.onrender.com
```

Restart frontend:
```bash
cd frontend
npm run dev
```

Now your local frontend connects to deployed backend!

#### Option B: Deploy Frontend to Vercel (Production)

See `VERCEL_DEPLOYMENT.md` (I can create this if needed)

---

## 🎯 Your Deployed Backend URL

After deployment, you'll have:

```
https://medicotabs-backend.onrender.com
```

**Use this URL for:**
- ✅ YOXA OpenAPI connector files (`servers.url`)
- ✅ YOXA HITL webhook URL
- ✅ Frontend API connection
- ✅ Mobile app integration (future)

---

## 📝 Update OpenAPI Connector Files

When creating OpenAPI YAML files for YOXA, use:

```yaml
openapi: 3.0.0
info:
  title: Tool Name
  version: 1.0.0

servers:
  - url: https://medicotabs-backend.onrender.com
    description: Production backend

paths:
  /api/your-endpoint:
    post:
      # ... your operation
```

✅ **YOXA can now reach your backend!**

---

## 🔧 Render Configuration File (Optional)

Create `backend/render.yaml` for easier redeployment:

```yaml
services:
  - type: web
    name: medicotabs-backend
    env: node
    region: oregon
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
```

---

## 🆓 Render Free Tier Limits

**What you get:**
- ✅ 750 hours/month (enough for testing)
- ✅ Automatic HTTPS
- ✅ Automatic deployments
- ✅ Custom domain support

**Limitations:**
- ⚠️ Spins down after 15 min inactivity
- ⚠️ Cold start (~30 sec to wake up)
- ⚠️ 512 MB RAM

**For production:** Upgrade to Starter ($7/month)
- ✅ Always on
- ✅ No cold starts
- ✅ More resources

---

## 🔄 Automatic Deployments

Every time you push to GitHub:
```bash
git add .
git commit -m "Update backend"
git push
```

Render automatically:
1. Detects the push
2. Rebuilds the backend
3. Deploys the new version

✅ **Continuous deployment!**

---

## 🔒 Security Checklist

- [x] `.env` not in repository (in .gitignore)
- [x] Environment variables in Render dashboard
- [x] HTTPS enabled automatically
- [x] CORS configured
- [x] Service role key in environment variables only

---

## 📊 Monitoring

**Render Dashboard:**
- **Logs:** Real-time server logs
- **Metrics:** CPU, Memory, Response time
- **Events:** Deployment history

**Check logs for:**
```
✓ Database connection successful
✓ YOXA configuration validated
✓ Server running
```

---

## 🆘 Troubleshooting

### "Database connection failed"
**Fix:** Check environment variables in Render dashboard
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check Supabase is not blocking Render IP

### "Build failed"
**Fix:** Check build logs
- Verify `package.json` is correct
- Ensure all dependencies are listed

### "Service unavailable"
**Fix:** Check if service is running
- Look at logs for errors
- Verify `npm start` works locally

### "CORS error" from frontend
**Fix:** Update `ALLOWED_ORIGINS`
```env
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
```

---

## ✅ Deployment Checklist

Before deploying:
- [x] Code pushed to GitHub
- [x] `.gitignore` includes `.env`
- [x] `package.json` has `start` script
- [x] Database migration run in Supabase

After deploying:
- [ ] Test health endpoint
- [ ] Check logs for errors
- [ ] Verify database connection
- [ ] Test API endpoints with Postman
- [ ] Update frontend URL
- [ ] Configure CORS

For YOXA integration:
- [ ] Use deployed URL in OpenAPI files
- [ ] Configure HITL webhook URL
- [ ] Add YOXA secrets to Render environment
- [ ] Test HITL webhook delivery

---

## 🎉 You're Ready!

Your backend will be:
- ✅ Publicly accessible
- ✅ Secure (HTTPS)
- ✅ Connected to Supabase
- ✅ Ready for YOXA integration
- ✅ Auto-deploying from GitHub

**Next steps:**
1. Deploy to Render
2. Get your public URL
3. Create OpenAPI connector files with that URL
4. Upload to YOXA
5. Test the workflow!

---

## 📚 Additional Resources

- Render Docs: https://render.com/docs
- Node.js on Render: https://render.com/docs/deploy-node-express-app
- Environment Variables: https://render.com/docs/environment-variables
- Custom Domains: https://render.com/docs/custom-domains

---

**Estimated time:** 10-15 minutes for first deployment
**Cost:** Free (or $7/month for production)
