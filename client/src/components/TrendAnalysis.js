import { ApiClient } from '../utils/api.js';
import { SimulationEngine } from '../utils/SimulationEngine.js';
import { TrendGraph } from './TrendGraph.js';
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
    this.baselineProjection = null;
    this.simulationProjection = null;
    this.graphs = {};
    this.radarChart = null;
    this.autoRefreshInterval = null;
    this.previousRiskScores = null;
  }

  /**
   * Generate fallback data for detailed time series (local fixes)
   */
  generateFallbackData(hours = 24) {
    const fallback = {
      environmental_risk: [],
      health_risk: [],
      food_security_risk: [],
      aqi: [],
      hospital_load: [],
      crop_supply: [],
      temperature: [],
      food_price_index: [],
      timestamps: []
    };

    for (let h = 0; h < hours; h++) {
      const progress = h / hours;
      const sine = Math.sin(progress * Math.PI);

      fallback.environmental_risk.push(Math.round(40 + sine * 20));
      fallback.health_risk.push(Math.round(35 + sine * 15));
      fallback.food_security_risk.push(Math.round(25 + sine * 10));
      fallback.aqi.push(Math.round(150 + sine * 50));
      fallback.temperature.push(Math.round((25 + sine * 5) * 10) / 10);
      fallback.hospital_load.push(Math.round(50 + sine * 20));
      fallback.crop_supply.push(Math.round(70 - sine * 15));
      fallback.food_price_index.push(Math.round(100 + sine * 20));
      fallback.timestamps.push(new Date(Date.now() + h * 3600000));
    }

    console.warn('⚠ Using fallback data for graphs (localhost only)');
    return fallback;
  }

  async render(container) {
    container.innerHTML = `
      <div class="trend-analysis">
        <div class="trend-header">
          <h2>Trend Analysis</h2>
          <div class="trend-controls">
            <button id="trend-refresh" class="trend-btn">🔄 Refresh All Data</button>
            <span id="auto-refresh-status" class="status-badge" style="margin-left: 10px; padding: 5px 10px; background: #10b981; color: white; border-radius: 4px; font-size: 0.85em; font-weight: 600;">AUTO-REFRESH: ON (5min)</span>
            <span id="loading-spinner" class="spinner" style="display: none; margin-left: 10px;">🔄 Loading...</span>
            <span id="last-updated" class="timestamp" style="margin-left: 15px; font-size: 0.9em; color: #888;"></span>
          </div>
        </div>

        <div class="trend-info">
          <p id="trend-description">Baseline vs Simulation Comparison - 24 Hour Projection</p>
        </div>

        <!-- High-Level Risk Radar -->
        <div class="trend-section">
          <h3>Current Systemic Risk Profile</h3>
          <div class="radar-chart-container">
            <div id="radar-chart" style="width: 100%; height: 500px;"></div>
          </div>
        </div>

        <!-- Detailed Risk Trends -->
        <div class="trend-section">
          <h3>Temporal Risk Trends</h3>
          <div class="trend-grid">
            <div class="trend-card">
              <h4>Environmental Risk</h4>
              <canvas id="env-risk-chart" class="trend-canvas" width="400" height="280"></canvas>
            </div>
            <div class="trend-card">
              <h4>Health Risk</h4>
              <canvas id="health-risk-chart" class="trend-canvas" width="400" height="280"></canvas>
            </div>
            <div class="trend-card">
              <h4>Food Security Risk</h4>
              <canvas id="food-risk-chart" class="trend-canvas" width="400" height="280"></canvas>
            </div>
          </div>
        </div>

        <!-- Environmental Metrics -->
        <div class="trend-section">
          <h3>Environmental Metrics</h3>
          <div class="trend-grid">
            <div class="trend-card">
              <h4>Air Quality Index (AQI)</h4>
              <canvas id="aqi-chart" class="trend-canvas" width="400" height="280"></canvas>
            </div>
            <div class="trend-card">
              <h4>Temperature</h4>
              <canvas id="temperature-chart" class="trend-canvas" width="400" height="280"></canvas>
            </div>
          </div>
        </div>

        <!-- Health Metrics -->
        <div class="trend-section">
          <h3>Health Metrics</h3>
          <div class="trend-grid">
            <div class="trend-card">
              <h4>Hospital Load</h4>
              <canvas id="hospital-chart" class="trend-canvas" width="400" height="280"></canvas>
            </div>
          </div>
        </div>

        <!-- Agriculture & Food Metrics -->
        <div class="trend-section">
          <h3>Agriculture & Food Security</h3>
          <div class="trend-grid">
            <div class="trend-card">
              <h4>Crop Supply</h4>
              <canvas id="crop-chart" class="trend-canvas" width="400" height="280"></canvas>
            </div>
            <div class="trend-card">
              <h4>Food Price Index</h4>
              <canvas id="foodprice-chart" class="trend-canvas" width="400" height="280"></canvas>
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div class="trend-stats">
          <div class="stat-item">
            <span class="stat-label">Scenario Type</span>
            <span id="scenario-type" class="stat-value">—</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Projection Period</span>
            <span id="projection-period" class="stat-value">24h</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">City</span>
            <span id="city-name" class="stat-value">—</span>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners(container);
    this.initializeGraphs(container);
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

  initializeGraphs(container) {
    // Initialize Time-Series Graphs
    const graphConfigs = [
      { id: 'env-risk-chart', title: 'Environmental Risk', unit: '%', color: '#10b981' },
      { id: 'health-risk-chart', title: 'Health Risk', unit: '%', color: '#f59e0b' },
      { id: 'food-risk-chart', title: 'Food Security Risk', unit: '%', color: '#06b6d4' },
      { id: 'aqi-chart', title: 'AQI', unit: 'points', color: '#ef4444' },
      { id: 'temperature-chart', title: 'Temperature', unit: '°C', color: '#f59e0b' },
      { id: 'hospital-chart', title: 'Hospital Load', unit: '%', color: '#ef4444' },
      { id: 'crop-chart', title: 'Crop Supply', unit: '%', color: '#10b981' },
      { id: 'foodprice-chart', title: 'Food Price Index', unit: 'index', color: '#a78bfa' }
    ];

    graphConfigs.forEach(config => {
      const graph = new TrendGraph(config.id, config.title, config.unit, config.color);
      if (graph.init(container)) {
        this.graphs[config.id] = graph;
      }
    });

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
      this.baselineProjection = this.engine.generateBaseline(this.baselineState, 24);

      if (!this.baselineProjection || !this.baselineProjection.environmental_risk) {
        this.baselineProjection = this.generateFallbackData(24);
      }

      if (this.currentScenario) {
        this.simulationProjection = this.engine.runSimulation(this.baselineState, this.currentScenario, 24);
        if (!this.simulationProjection || !this.simulationProjection.environmental_risk) {
          this.simulationProjection = this.generateFallbackData(24);
        }
      } else {
        this.simulationProjection = this.baselineProjection;
      }

      this.updateGraphs();
      this.updateStatistics();
    } catch (error) {
      console.error('Failed to load trend data:', error);
      this.baselineProjection = this.generateFallbackData(24);
      this.simulationProjection = this.generateFallbackData(24);
      this.updateGraphs();
      this.updateStatistics();
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

  updateGraphs() {
    if (!this.baselineProjection || !this.simulationProjection) return;

    const updateGraph = (graphId, baselineKey, simulationKey) => {
      const graph = this.graphs[graphId];
      if (!graph) return;
      graph.updateData(this.baselineProjection[baselineKey] || [], this.simulationProjection[simulationKey] || []);
      graph.animateUpdate();
    };

    updateGraph('env-risk-chart', 'environmental_risk', 'environmental_risk');
    updateGraph('health-risk-chart', 'health_risk', 'health_risk');
    updateGraph('food-risk-chart', 'food_security_risk', 'food_security_risk');
    updateGraph('aqi-chart', 'aqi', 'aqi');
    updateGraph('temperature-chart', 'temperature', 'temperature');
    updateGraph('hospital-chart', 'hospital_load', 'hospital_load');
    updateGraph('crop-chart', 'crop_supply', 'crop_supply');
    updateGraph('foodprice-chart', 'food_price_index', 'food_price_index');
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
