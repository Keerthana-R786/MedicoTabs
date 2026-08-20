# Quick Upload Guide for YOXA

## 🎯 Quick Start (5 Minutes)

### 1. Open YOXA Platform
Go to: **Release → API Configuration**

### 2. Upload All 11 Files

Click **"Upload Connector"** and upload each file in this order:

```
✅ 1. get-patient-data.yaml
✅ 2. get-clinical-summary.yaml
✅ 3. generate-referral-letter.yaml
✅ 4. check-insurance-eligibility.yaml
✅ 5. get-specialist-availability.yaml
✅ 6. book-appointment.yaml
✅ 7. send-secure-message.yaml
✅ 8. get-treatment-guidelines.yaml
✅ 9. update-patient-record.yaml
✅ 10. generate-prior-auth.yaml
✅ 11. notify-patient.yaml
```

### 3. Map to Workflow Tools

After each upload, YOXA will ask you to map the connector to a simulated tool in your workflow. Match them like this:

| YAML File | Map To Workflow Tool |
|-----------|---------------------|
| `get-patient-data.yaml` | Get Patient Data |
| `get-clinical-summary.yaml` | Get Clinical Summary |
| `generate-referral-letter.yaml` | Generate Referral Letter |
| `check-insurance-eligibility.yaml` | Check Insurance Eligibility |
| `get-specialist-availability.yaml` | Get Specialist Availability |
| `book-appointment.yaml` | Book Appointment |
| `send-secure-message.yaml` | Send Secure Message |
| `get-treatment-guidelines.yaml` | Get Treatment Guidelines |
| `update-patient-record.yaml` | Update Patient Record |
| `generate-prior-auth.yaml` | Generate Prior Auth |
| `notify-patient.yaml` | Notify Patient |

### 4. Configure Authentication

For each uploaded connector:
1. Click **"Configure"**
2. Select **"Bearer Token"** authentication
3. Enter your API token (get from backend team)
4. Save

### 5. Test Each Connector

For each connector:
1. Click **"Test Connection"**
2. Fill in sample request data
3. Click **"Run Test"**
4. Verify 200 OK response
5. Fix any errors

---

## ⚠️ Common Issues

### ❌ "Server URL contains path"
**Error**: `servers[0].url` has a path prefix

**Fix**: Server URL should be `https://medicotabs.onrender.com` only, no `/api/` prefix

---

### ❌ "Connection timeout"
**Problem**: YOXA can't reach backend

**Fix**: 
- Verify backend is running: https://medicotabs.onrender.com/health
- Check if Render service is awake (cold start delay)
- Wait 30 seconds and retry

---

### ❌ "Authentication failed"
**Problem**: Bearer token is invalid

**Fix**:
- Get fresh token from backend team
- Verify token has correct format
- Check token hasn't expired

---

## ✅ Success Checklist

Before activating workflow:

- [ ] All 11 connectors uploaded
- [ ] All connectors mapped to tools
- [ ] All authentication configured
- [ ] All connection tests passing
- [ ] Backend endpoints implemented
- [ ] HITL webhook configured

---

## 🔗 Backend Status

**Deployed URL**: https://medicotabs.onrender.com

**Health Check**: 
```bash
curl https://medicotabs.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-08-20T...",
  "service": "MedicoTabs Backend API"
}
```

---

## 📞 Need Help?

- Check `README.md` in this directory for detailed docs
- Review `../YOXA_INTEGRATION_GUIDE.md` for backend setup
- Contact backend team if endpoints aren't responding

---

**Ready to upload?** Start with file #1 and work through the list! 🚀
