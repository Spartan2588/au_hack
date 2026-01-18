import { Auth, PortalType } from '../utils/auth.js';
import { LoginModal } from '../components/LoginModal.js';
import { ApiClient } from '../utils/api.js';
import gsap from 'gsap';
import '../styles/pages/hospital-dashboard.css';

/**
 * Hospital Dashboard Page
 * Healthcare-focused view with hospital_load and health_risk metrics
 */
export class HospitalDashboardPage {
    constructor() {
        this.api = new ApiClient();
        this.currentCity = 1;
        this.currentState = null;
        this.currentRisks = null;
        this.historicalData = null;
        this.updateInterval = null;
    }

    async render(container) {
        // Check authentication
        if (!Auth.isLoggedIn(PortalType.HOSPITAL)) {
            this.showLoginRequired(container);
            return;
        }

        const session = Auth.getSession(PortalType.HOSPITAL);

        container.innerHTML = `
      <div class="hospital-dashboard">
        <div class="dashboard-topbar">
          <div class="topbar-info">
            <span class="portal-badge">🏥 Hospital Portal</span>
            <span class="session-info">Logged in as: ${session.hospitalName}</span>
          </div>
          <button class="btn btn-logout" id="logout-btn">Logout</button>
        </div>

        <div class="dashboard-header">
          <h1>Healthcare Intelligence Dashboard</h1>
          <p>Real-time health risk monitoring and capacity planning</p>
        </div>

        <div class="alert-banner" id="surge-alert" style="display: none;">
          <span class="alert-icon">⚠️</span>
          <span class="alert-text">SURGE ALERT: Hospital capacity exceeds 70%</span>
        </div>

        <div class="dashboard-grid">
          <!-- Hospital Load Card -->
          <div class="metric-card glass hospital-load-card">
            <div class="card-header">
              <span class="card-icon">🏥</span>
              <h3>Hospital Load</h3>
            </div>
            <div class="metric-value" id="hospital-load-value">--</div>
            <div class="metric-label">Current Capacity</div>
            <div class="metric-bar">
              <div class="metric-bar-fill" id="hospital-load-bar"></div>
            </div>
          </div>

          <!-- Health Risk Card -->
          <div class="metric-card glass health-risk-card">
            <div class="card-header">
              <span class="card-icon">❤️</span>
              <h3>Health Risk Level</h3>
            </div>
            <div class="metric-value" id="health-risk-value">--</div>
            <div class="metric-label" id="health-risk-label">Calculating...</div>
          </div>

          <!-- AQI Impact Card -->
          <div class="metric-card glass aqi-impact-card">
            <div class="card-header">
              <span class="card-icon">💨</span>
              <h3>AQI Health Impact</h3>
            </div>
            <div class="metric-value" id="aqi-value">--</div>
            <div class="metric-label">Air Quality Index</div>
            <div class="impact-note" id="aqi-impact-note">Loading impact analysis...</div>
          </div>

          <!-- Temperature Card -->
          <div class="metric-card glass temp-card">
            <div class="card-header">
              <span class="card-icon">🌡️</span>
              <h3>Temperature</h3>
            </div>
            <div class="metric-value" id="temp-value">--</div>
            <div class="metric-label">Current Temperature</div>
          </div>
        </div>

        <!-- Historical Chart Section -->
        <div class="chart-section glass">
          <div class="section-header">
            <h3>24-Hour Hospital Load Trend</h3>
            <select id="city-select" class="city-select">
              <option value="1">Mumbai</option>
              <option value="2">Delhi</option>
              <option value="3">Bangalore</option>
            </select>
          </div>
          <div class="chart-container">
            <canvas id="historical-chart"></canvas>
          </div>
        </div>

        <!-- Recommendations Section -->
        <div class="recommendations-section glass">
          <h3>Health Recommendations</h3>
          <div id="recommendations-list" class="recommendations-list"></div>
        </div>
      </div>
    `;

        this.setupEventListeners(container);
        await this.loadData();
        this.startAutoRefresh();
    }

    showLoginRequired(container) {
        container.innerHTML = `
      <div class="login-required">
        <div class="login-required-content glass">
          <span class="lock-icon">🔒</span>
          <h2>Hospital Portal Access Required</h2>
          <p>Please login with your medical license to access the Hospital Dashboard.</p>
          <button class="btn btn-primary" id="login-trigger">Login to Hospital Portal</button>
          <a href="/" class="back-link" data-link>← Back to Home</a>
        </div>
      </div>
    `;

        container.querySelector('#login-trigger').addEventListener('click', () => {
            const modal = new LoginModal(PortalType.HOSPITAL, () => {
                // Re-render after successful login
                this.render(container);
            });
            modal.render();
        });
    }

    setupEventListeners(container) {
        const logoutBtn = container.querySelector('#logout-btn');
        const citySelect = container.querySelector('#city-select');

        logoutBtn.addEventListener('click', () => {
            Auth.logout(PortalType.HOSPITAL);
            window.location.href = '/';
        });

        citySelect.addEventListener('change', (e) => {
            this.currentCity = parseInt(e.target.value);
            this.loadData();
        });
    }

    async loadData() {
        try {
            const [state, risks, historical] = await Promise.all([
                this.api.getCurrentState(this.currentCity),
                this.api.getRiskAssessment(this.currentCity),
                this.api.getHistoricalData(this.currentCity, 24)
            ]);

            this.currentState = state;
            this.currentRisks = risks;
            this.historicalData = historical;

            this.updateDisplay();
            this.renderChart();
            this.updateRecommendations();
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    updateDisplay() {
        const state = this.currentState;
        const risks = this.currentRisks;

        // Hospital Load
        const loadValue = document.getElementById('hospital-load-value');
        const loadBar = document.getElementById('hospital-load-bar');
        const surgeAlert = document.getElementById('surge-alert');

        loadValue.textContent = `${state.hospital_load}%`;
        loadBar.style.width = `${state.hospital_load}%`;
        loadBar.style.background = state.hospital_load > 70 ? '#dc2626' :
            state.hospital_load > 50 ? '#f59e0b' : '#10b981';

        // Surge alert
        if (state.hospital_load > 70) {
            surgeAlert.style.display = 'flex';
            gsap.fromTo(surgeAlert, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        } else {
            surgeAlert.style.display = 'none';
        }

        // Health Risk
        const riskValue = document.getElementById('health-risk-value');
        const riskLabel = document.getElementById('health-risk-label');
        const healthRisk = risks.health_risk;

        riskValue.textContent = `${healthRisk.probability}%`;
        riskValue.style.color = this.getRiskColor(healthRisk.level);
        riskLabel.textContent = healthRisk.level.toUpperCase();

        // AQI
        const aqiValue = document.getElementById('aqi-value');
        const aqiNote = document.getElementById('aqi-impact-note');

        aqiValue.textContent = state.aqi;
        aqiValue.style.color = this.getAqiColor(state.aqi);
        aqiNote.textContent = this.getAqiHealthImpact(state.aqi);

        // Temperature
        const tempValue = document.getElementById('temp-value');
        tempValue.textContent = `${state.temperature}°C`;
    }

    renderChart() {
        const canvas = document.getElementById('historical-chart');
        if (!canvas || !this.historicalData) return;

        const ctx = canvas.getContext('2d');
        const data = this.historicalData.hospital_load;

        const width = canvas.parentElement.clientWidth;
        const height = 200;
        canvas.width = width;
        canvas.height = height;

        const padding = 40;

        // Clear
        ctx.fillStyle = 'rgba(10, 10, 26, 0.5)';
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (height - padding * 2) * (i / 4);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Data line
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        const range = maxValue - minValue || 1;

        data.forEach((point, index) => {
            const x = padding + (width - padding * 2) * (index / (data.length - 1));
            const y = height - padding - (height - padding * 2) * ((point.value - minValue) / range);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Hospital Load (24h)', width / 2, height - 8);
    }

    updateRecommendations() {
        const container = document.getElementById('recommendations-list');
        if (!container) return;

        const state = this.currentState;
        const recommendations = [];

        if (state.hospital_load > 70) {
            recommendations.push({ icon: '🚨', text: 'Activate emergency overflow protocols' });
            recommendations.push({ icon: '📞', text: 'Contact nearby facilities for patient redistribution' });
        }

        if (state.aqi > 150) {
            recommendations.push({ icon: '😷', text: 'Prepare for increased respiratory cases' });
            recommendations.push({ icon: '💊', text: 'Stock up on asthma and COPD medications' });
        }

        if (state.temperature > 35) {
            recommendations.push({ icon: '🌡️', text: 'Expect heat-related illness admissions' });
            recommendations.push({ icon: '💧', text: 'Ensure adequate hydration supplies' });
        }

        if (recommendations.length === 0) {
            recommendations.push({ icon: '✅', text: 'All metrics within normal range' });
        }

        container.innerHTML = recommendations.map(r => `
      <div class="recommendation-item">
        <span class="recommendation-icon">${r.icon}</span>
        <span class="recommendation-text">${r.text}</span>
      </div>
    `).join('');
    }

    getRiskColor(level) {
        const colors = { low: '#10b981', medium: '#f59e0b', high: '#dc2626' };
        return colors[level] || '#6b7280';
    }

    getAqiColor(aqi) {
        if (aqi <= 50) return '#10b981';
        if (aqi <= 100) return '#f59e0b';
        if (aqi <= 150) return '#f97316';
        if (aqi <= 200) return '#dc2626';
        return '#7f1d1d';
    }

    getAqiHealthImpact(aqi) {
        if (aqi <= 50) return 'Good - Minimal respiratory cases expected';
        if (aqi <= 100) return 'Moderate - Some sensitive individuals may be affected';
        if (aqi <= 150) return 'Unhealthy for Sensitive - Expect increased asthma cases';
        if (aqi <= 200) return 'Unhealthy - Significant respiratory admissions likely';
        return 'Hazardous - Prepare for surge in respiratory emergencies';
    }

    startAutoRefresh() {
        this.updateInterval = setInterval(() => {
            this.loadData();
        }, 30000);
    }

    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}
