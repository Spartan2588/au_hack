# Urban Intelligence Platform & Risk Assessment Dashboard

**A real-time, physics-aware simulation engine and interactive dashboard for urban resilience planning.**

---

## 🚀 Key Features

### 🌎 Interactive Maps with Cascading Risks
Visualize how localized events (like a flood in one zone) trigger cascading risks across the city:
*   **Layered Impact**: Environmental stress ripples into public health and food logistics.
*   **Visual Logic**: Color-coded risk zones (Green/Yellow/Red) evolve instantly as you simulate scenarios.

### 💻 Integrated Web Interfaces
The system provides both a modern physics-aware simulation engine and a high-performance risk dashboard:
*   **Scenario Chat**: Speak to the city engine naturally (e.g., *"Simulate a 3-day heatwave"*).
*   **Live Dashboard**: Monitor real-time AQI, Hospital Load, Crop Supply, and Market Metrics.
*   **Economic Impact**: View intervention costs, savings, and ROI for different scenarios.
*   **Historical Trends**: 24-hour visualization of city metrics using Plotly.

### 🧠 Physics-Aware Simulation
Our "Scenario Delta" engine respects physical reality:
*   **Context Awareness**: Distinguishes between "Short" vs. "Prolonged" events.
*   **Real-World Physics**: Captures complex interactions like "flood-induced AQI washout" vs. "heatwave Ozone spikes."

---

## 🛠️ Installation & Setup

### 1. Backend Setup (Simulation Engine & API)
The backend powers the simulation engine, database, and risk models.
```bash
# Install dependencies
pip install -r requirements.txt

# Start the API server
python api/run.py
```
*Server starts at `http://localhost:8000`*

### 2. Frontend Setup (Interactive Interface)
```bash
cd frontend
npm install
npm run dev
```
*Access the interface at `http://localhost:5173`*

### 3. Legacy Dashboard Setup (Node.js)
If you are using the original Node.js dashboard components:
```bash
# Install root dependencies
npm install

# Build and run
npm run dev
```

---

## 📂 Repository Structure

*   **/api**: FastApi backend, simulation logic, and ML models.
*   **/frontend**: React application with Mapbox integration and GSAP animations.
*   **/model**: Risk Engine core logic and data generators.
*   **/client**: Legacy React frontend components.
*   **/scripts**: Utility scripts for data analysis and verification.
*   **/docs**: Documentation and dataset analysis.

---

## 🧪 Quick Test prompts
Try these in the Scenario Chat:
1.  *"Severe flood in Mumbai"* (Observe AQI improvement + Logistics impact)
2.  *"Toxic smog event in Delhi"* (Observe AQI spike + Health risk)
