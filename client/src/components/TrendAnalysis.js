import { ApiClient } from '../utils/api.js';
import { SimulationEngine } from '../utils/SimulationEngine.js';
import { SimpleRadarChart } from './SimpleRadarChart.js';
import { RiskDomainCalculator } from '../utils/RiskDomainCalculator.js';
import { LiveDataService } from '../utils/LiveDataService.js';
import gsap from 'gsap';
import '../styles/components/trend-analysis.css';

export class TrendAnalysis {
  constructor() {
    this.api = new ApiClient();
    this.engine = new SimulationEngine();
    this.riskCalculator = new RiskDomainCalculator();
    this.liveDataService = new LiveDataService();
    this.currentCity = 1;
    this.currentScenario = null;
    this.baselineState = null;
    this.radarChart = null;
    this.autoRefreshInterval = null;
    this.previousRiskScores = null;
  }

  async render(container) {
    container.innerHTML = `
      <div class="trend-analysis">
        <div class="trend-header">
          <h2>Trend Analysis</h2>
          <div class="trend-controls">
            <button id="trend-refresh" class="trend-btn">🔄 Refresh Data</button>
            <span id="auto-refresh-status" class="status-badge" style="margin-left: 10px; padding: 5px 10px; background: #10b981; color: white; border-radius: 4px; font-size: 0.85em; font-weight: 600;">AUTO-REFRESH: ON (5min)</span>
            <span id="loading-spinner" class="spinner" style="display: none; margin-left: 10px;">🔄 Loading...</span>
            <span id="last-updated" class="timestamp" style="margin-left: 15px; font-size: 0.9em; color: #888;"></span>
          </div>
        </div>

        <div class="trend-info">
          <p id="trend-description">Real-time risk monitoring and analysis dashboard</p>
        </div>

        <!-- High-Level Risk Radar -->
        <div class="trend-section">
          <h3>Current Systemic Risk Profile</h3>
          <div class="radar-chart-container">
            <div id="radar-chart" style="width: 100%; height: 500px;"></div>
          </div>
        </div>

        <!-- Statistics -->
        <div class="trend-stats">
          <div class="stat-item">
            <span class="stat-label">Scenario Type</span>
            <span id="scenario-type" class="stat-value">—</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Monitoring Status</span>
            <span id="projection-period" class="stat-value">Active</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">City</span>
            <span id="city-name" class="stat-value">—</span>
          </div>
        </div>

        <div class="trend-message">
          <h3>Advanced Risk Intelligence</h3>
          <p>The radar chart above displays real-time systemic risk assessment across multiple domains including environmental, health, infrastructure, and security factors. This comprehensive view enables proactive decision-making for urban resilience.</p>
        </div>
      </div>
    `;

    this.setupEventListeners(container);
    this.initializeRadarChart(container);
    await this.loadData();
    await this.loadLiveData();
  }

  setupEventListeners(container) {
    const refreshBtn = container.querySelector('#trend-refresh');

    refreshBtn.addEventListener('click', async () => {
      console.log('Refresh button clicked');
      gsap.to(refreshBtn, { rotation: 360, duration: 0.6 });
      await this.loadData();
      await this.loadLiveData();
    });

    window.addEventListener('scenario-updated', (e) => {
      this.currentScenario = e.detail;
      this.loadData();
    });

    window.addEventListener('city-changed', (e) => {
      this.currentCity = e.detail.cityId;
      this.loadData();
      this.loadLiveData();
    });

    window.addEventListener('sliders-changed', (e) => {
      this.currentScenario = e.detail;
      this.loadData();
    });

    window.addEventListener('chat-simulation', (e) => {
      this.currentScenario = e.detail;
      this.loadData();
    });
  }

  initializeRadarChart(container) {
    // Initialize Radar Chart
    this.radarChart = new SimpleRadarChart('radar-chart');
    if (this.radarChart.init(container)) {
      this.startAutoRefresh();
    }
  }

  startAutoRefresh() {
    if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
    this.autoRefreshInterval = setInterval(() => {
      this.loadLiveData();
    }, 5 * 60 * 1000);
  }

  async loadData() {
    try {
      this.baselineState = await this.api.getCurrentState(this.currentCity);
      this.updateStatistics();
      this.startAutoRefresh();
    } catch (error) {
      console.error('Failed to load trend data:', error);
      this.updateStatistics();
      this.startAutoRefresh();
    }
  }

  async loadLiveData() {
    const spinner = document.querySelector('#loading-spinner');
    const timestampEl = document.querySelector('#last-updated');

    try {
      if (spinner) spinner.style.display = 'inline';
      const liveData = await this.liveDataService.fetchLiveData();
      const riskScores = this.liveDataService.calculateRiskScores(liveData, this.previousRiskScores);
      this.previousRiskScores = riskScores;

      const chartData = {
        heat_index_risk: [riskScores.heatwave],
        extreme_rainfall_prob: [riskScores.rainfall],
        coastal_flooding_risk: [riskScores.flood],
        power_grid_failure: [riskScores.power],
        traffic_congestion: [riskScores.traffic],
        hospital_capacity_stress: [riskScores.hospital],
        telecom_failure_risk: [riskScores.telecom],
        environmental_risk: [riskScores.airQuality],
        fire_hazard_risk: [riskScores.fire],
        public_health_outbreak: [riskScores.publicHealth]
      };

      if (this.radarChart) {
        this.radarChart.render(chartData, { isLive: true, timestamp: liveData.timestamp });
      }

      if (timestampEl) {
        const now = new Date();
        timestampEl.textContent = `Last Updated: ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        timestampEl.style.color = '#10b981';
      }
    } catch (error) {
      console.error('Failed to load live data:', error);
      if (timestampEl) {
        timestampEl.textContent = 'Failed to load live data';
        timestampEl.style.color = '#ef4444';
      }
    } finally {
      if (spinner) spinner.style.display = 'none';
    }
  }

  updateStatistics() {
    const scenarioType = document.querySelector('#scenario-type');
    const cityName = document.querySelector('#city-name');

    if (scenarioType) {
      scenarioType.textContent = this.currentScenario ?
        (this.currentScenario.trigger || 'Custom') : 'Baseline';
    }

    if (cityName) {
      const cities = { 1: 'Mumbai', 2: 'Delhi', 3: 'Bangalore' };
      cityName.textContent = cities[this.currentCity] || 'Mumbai';
    }
  }

  cleanup() {
    if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
  }
}
