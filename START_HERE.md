# 🚀 How to Start the Project

## Quick Start

### Option 1: Start Everything at Once (Recommended)
```powershell
# In PowerShell, navigate to this directory:
cd C:\Users\thumm\Downloads\au_hack-main\au_hack-main\au_hack-main

# Install dependencies (if not already installed)
npm install
cd client
npm install
cd ..

# Start both server and client
npm run dev
```

This will start:
- ✅ Backend API on **http://localhost:5000**
- ✅ Frontend on **http://localhost:5173** (Vite default port)

### Option 2: Start Separately (Better for Debugging)

**Terminal 1 - Backend Server:**
```powershell
cd C:\Users\thumm\Downloads\au_hack-main\au_hack-main\au_hack-main
npm run server
```

**Terminal 2 - Frontend:**
```powershell
cd C:\Users\thumm\Downloads\au_hack-main\au_hack-main\au_hack-main
npm run client
```

### Option 3: Use PowerShell Scripts

I've created helper scripts for you:

```powershell
# Start backend only
.\start-server.ps1

# Start frontend only
.\start-client.ps1

# Start both
.\start-all.ps1
```

---

## 📋 Prerequisites Check

Before starting, make sure you have:

1. **Node.js installed**: 
   ```powershell
   node --version  # Should be v16+ 
   npm --version
   ```

2. **Dependencies installed**:
   ```powershell
   # Backend dependencies
   npm install
   
   # Frontend dependencies
   cd client
   npm install
   ```

---

## 🔍 Troubleshooting

### Server won't start?

1. **Check for port conflicts:**
   ```powershell
   netstat -ano | findstr ":5000"
   ```
   If port 5000 is in use, kill the process or change PORT in server.js

2. **Check for errors:**
   - Open PowerShell in a new window
   - Run `node server.js` to see error messages
   - Common issues:
     - Missing dependencies → run `npm install`
     - Port already in use → kill existing process
     - Syntax errors → check server.js for issues

### Frontend won't start?

1. **Check client dependencies:**
   ```powershell
   cd client
   npm install
   ```

2. **Check Vite:**
   ```powershell
   cd client
   npx vite --version
   ```

### Can't access localhost?

1. **Backend Health Check:**
   Open browser: http://localhost:5000/api/v1/health
   Should return: `{"status":"ok"}`

2. **Frontend:**
   Check terminal output for the actual port (usually 5173)
   Look for: `Local: http://localhost:5173`

---

## 📍 Access URLs

Once running:
- **Frontend**: http://localhost:5173 (or port shown in terminal)
- **Backend API**: http://localhost:5000
- **API Health**: http://localhost:5000/api/v1/health

---

## 🧪 Test the Server

After starting, test with:

```powershell
# Test health endpoint
curl http://localhost:5000/api/v1/health

# Test current state
curl http://localhost:5000/api/v1/current-state?city_id=1

# Test cascade endpoint
curl "http://localhost:5000/api/v1/cascading-failure?city_id=1&trigger=power&severity=0.8"
```

---

## ⚠️ Still Having Issues?

1. **Check Windows Firewall** - may be blocking localhost
2. **Check Antivirus** - may be blocking Node.js
3. **Run as Administrator** - sometimes helps with port binding
4. **Check error messages** - the terminal will show what's wrong

---

## 📞 Quick Command Reference

```powershell
# Navigate to project
cd C:\Users\thumm\Downloads\au_hack-main\au_hack-main\au_hack-main

# Install all dependencies
npm install && cd client && npm install && cd ..

# Start everything
npm run dev

# Or separately:
npm run server    # Backend only
npm run client    # Frontend only
```
