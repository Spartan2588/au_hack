# Windows Setup Guide

## 🪟 Windows-Specific Instructions

This guide is for Windows users. If you're on Mac/Linux, see the main documentation.

---

## ⚠️ Important: PowerShell Syntax

Windows PowerShell uses **`;`** instead of **`&&`** to chain commands.

### Examples
```powershell
# ❌ WRONG (will error)
cd client && npm install

# ✅ RIGHT (use semicolon)
cd client; npm install

# ✅ ALSO RIGHT (run separately)
cd client
npm install
```

---

## 🚀 Step-by-Step Setup

### Step 1: Open PowerShell
1. Press `Win + R`
2. Type `powershell`
3. Press Enter

### Step 2: Navigate to Project
```powershell
cd C:\Users\YourUsername\Desktop\AU_anti
```

Replace `YourUsername` with your actual username.

### Step 3: Install Backend Dependencies
```powershell
npm install
```

Wait for it to complete (1-2 minutes).

### Step 4: Start Backend Server
```powershell
npm start
```

You should see:
```
Running on http://localhost:5000
```

**Keep this terminal open!**

### Step 5: Open New PowerShell Window
1. Press `Win + R`
2. Type `powershell`
3. Press Enter

### Step 6: Navigate to Client Directory
```powershell
cd C:\Users\YourUsername\Desktop\AU_anti\client
```

### Step 7: Install Frontend Dependencies
```powershell
npm install
```

Wait for it to complete (1-2 minutes).

### Step 8: Start Frontend Server
```powershell
npm run dev
```

You should see:
```
Local: http://localhost:5173/
```

### Step 9: Open Browser
1. Open your browser (Chrome, Edge, Firefox, etc.)
2. Go to: `http://localhost:5173`
3. Click on the map to see real-time AQI data!

---

## 🧪 Testing

### Test 1: Backend Health
```powershell
curl http://localhost:5000/api/v1/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

### Test 2: Real-Time AQI
```powershell
curl "http://localhost:5000/api/v1/aqi?lat=19.0760&lng=72.8777"
```

Expected response: Real AQI data

### Test 3: Browser Console
1. Open DevTools: Press `F12`
2. Go to Console tab
3. Click on map
4. Look for: `✅ Real-time AQI data from OpenWeatherMap: [VALUE]`

---

## 📁 File Locations

### Project Root
```
C:\Users\YourUsername\Desktop\AU_anti\
```

### Configuration File
```
C:\Users\YourUsername\Desktop\AU_anti\.env
```

### Backend
```
C:\Users\YourUsername\Desktop\AU_anti\server.js
```

### Frontend
```
C:\Users\YourUsername\Desktop\AU_anti\client\
```

---

## 🔧 Useful PowerShell Commands

### Check Current Directory
```powershell
Get-Location
```

### List Files
```powershell
Get-ChildItem
```

### View .env File
```powershell
Get-Content .env
```

### Go to Client Directory
```powershell
cd client
```

### Go Back to Root
```powershell
cd ..
```

### Open File in Notepad
```powershell
notepad .env
```

---

## 🐛 Troubleshooting

### Problem: "npm is not recognized"
**Solution:**
1. Install Node.js from: https://nodejs.org/
2. Restart PowerShell
3. Try again

### Problem: "Port 5000 already in use"
**Solution:**
```powershell
# Find process using port 5000
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

### Problem: "Port 5173 already in use"
**Solution:**
```powershell
# Find process using port 5173
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
```

### Problem: "Permission denied"
**Solution:**
1. Right-click PowerShell
2. Select "Run as administrator"
3. Try again

### Problem: "No AQI data showing"
**Solution:**
1. Check backend is running (Terminal 1)
2. Check frontend is running (Terminal 2)
3. Check `.env` file has API key
4. Open DevTools (F12) and check Console for errors

### Problem: "CORS error"
**Solution:**
1. Ensure backend on :5000
2. Ensure frontend on :5173
3. Restart both servers

---

## 📊 Verification Checklist

- [ ] PowerShell open
- [ ] Node.js installed (`node --version` works)
- [ ] npm installed (`npm --version` works)
- [ ] Backend dependencies installed
- [ ] Backend running on :5000
- [ ] Frontend dependencies installed
- [ ] Frontend running on :5173
- [ ] Browser shows map
- [ ] Clicking map shows AQI marker
- [ ] Console shows success message

---

## 🎯 Quick Reference

### Backend
- **Start:** `npm start`
- **Port:** 5000
- **Test:** `curl http://localhost:5000/api/v1/health`

### Frontend
- **Start:** `npm run dev` (in client/)
- **Port:** 5173
- **URL:** `http://localhost:5173`

### Configuration
- **File:** `.env`
- **View:** `Get-Content .env`
- **API Key:** `OPENWEATHERMAP_API_KEY=3102aff4b425585604ec803633c37fcd`

---

## 💡 Windows Tips

### Use Windows Terminal (Better than PowerShell)
1. Download from Microsoft Store
2. Supports multiple tabs
3. Better performance
4. Better copy/paste

### Keep Multiple Terminals Open
1. Terminal 1: Backend
2. Terminal 2: Frontend
3. Terminal 3: Testing/Commands

### Quick Browser Open
```powershell
Start-Process "http://localhost:5173"
```

### Copy/Paste in PowerShell
- Right-click to paste
- Or use Ctrl+Shift+V

---

## 📞 Support

### Documentation
- **START_HERE.md** - Quick overview
- **QUICK_COMMANDS.md** - All commands
- **WINDOWS_COMMANDS.md** - Windows-specific commands
- **API_DOCS_INDEX.md** - Full documentation

### API Documentation
- OpenWeatherMap: https://openweathermap.org/api/air-pollution
- IQAir: https://www.iqair.com/air-quality-api
- WAQI: https://waqi.info/api

---

## ✅ Success Indicators

### Backend Running
```
Running on http://localhost:5000
```

### Frontend Running
```
Local: http://localhost:5173/
```

### Browser Console
```
✅ Real-time AQI data from OpenWeatherMap: [VALUE]
```

### Map Display
- Colored marker appears on map
- Marker color matches AQI level
- Popup shows AQI details

---

## 🎉 You're Ready!

Follow the step-by-step setup above and you'll have real-time AQI data running in ~10 minutes.

**Next action:** Open PowerShell and run `npm install`!

---

**Last Updated:** January 18, 2026
**Platform:** Windows PowerShell
**Status:** ✅ Ready to Use
