import { ApiClient } from '../utils/api.js';
import { authService } from '../utils/auth.js';
import { LoginModal } from '../components/LoginModal.js';
import gsap from 'gsap';
import '../styles/pages/gov-dashboard.css';

export class GovDashboardPage {
  constructor() {
    this.api = new ApiClient();
    this.cities = [];
    this.citiesData = {};
    this.scenarioResult = null;
    this.updateInterval = null;
  }

  async render(container) {
    // Check authentication
    if (!authService.isSignedIn() || authService.getUserRole() !== 'government') {
      this.showLoginRequired(container);
      return;
    }

    const user = authService.getCurrentUser();

    container.innerHTML = `
      <div class="gov-dashboard">
        <!-- Top Bar with Logout -->
        <div class="dashboard-topbar gov-topbar">
          <div class="topbar-info">
            <span class="portal-badge gov-badge">🏛️ Government Portal</span>
            <span class="session-info">Department: ${user.displayName}</span>
          </div>
          <button class="btn btn-logout gov-logout" id="logout-btn">Logout</button>
        </div>

        <!-- Hero Section -->
        <div class="gov-hero">
          <div class="gov-hero-content">
            <h1>Government Dashboard</h1>
            <p>City-wide risk assessment and policy recommendations</p>
          </div>
        </div>

        <!-- City Overview Section -->
        <section class="gov-section">
          <h2>City Overview</h2>
          <div class="cities-grid" id="cities-grid">
            <!-- City cards will be rendered here -->
          </div>
        </section>

        <!-- Aggregated Risk Statistics -->
        <section class="gov-section">
          <h2>Aggregated Risk Statistics</h2>
          <div class="risk-stats-grid" id="risk-stats">
            <!-- Risk stats will be rendered here -->
          </div>
        </section>

        <!-- Scenario Simulation Controls -->
        <section class="gov-section">
          <h2>Scenario Simulation</h2>
          <div class="scenario-controls">
            <div class="slider-group">
              <label>AQI: <span id="aqi-value">150</span></label>
              <input type="range" id="aqi-slider" min="0" max="500" value="150" class="slider">
            </div>
            <div class="slider-group">
              <label>Hospital Load: <span id="hospital-value">50</span>%</label>
              <input type="range" id="hospital-slider" min="0" max="100" value="50" class="slider">
            </div>
            <div class="slider-group">
              <label>Crop Supply: <span id="crop-value">70</span>%</label>
              <input type="range" id="crop-slider" min="0" max="100" value="70" class="slider">
            </div>
            <div class="slider-group">
              <label>Temperature: <span id="temp-value">25</span>°C</label>
              <input type="range" id="temp-slider" min="20" max="50" step="0.1" value="25" class="slider">
            </div>
            <button id="simulate-btn" class="btn btn-primary">Simulate Scenario</button>
          </div>
          <div id="comparison-results" class="comparison-results"></div>
        </section>

        <!-- Economic Impact Projections -->
        <section class="gov-section">
          <h2>Economic Impact Projections</h2>
          <div id="economic-impact" class="economic-impact-container"></div>
        </section>

        <!-- Policy Recommendations -->
        <section class="gov-section">
          <h2>Policy Recommendations</h2>
          <div id="policy-recommendations" class="policy-recommendations"></div>
        </section>

        <!-- Historical Trends -->
        <section class="gov-section">
          <h2>24-Hour Trends</h2>
          <div id="historical-trends" class="historical-trends"></div>
        </section>
      </div>
    `;

    this.setupEventListeners(container);
    await this.loadData();
    this.startAutoRefresh();
  }

  showLoginRequired(container) {
    container.innerHTML = `
      <div class="login-required">
        <div class="login-required-content glass gov-login-box">
          <span class="lock-icon">🔒</span>
          <h2>Government Portal Access Required</h2>
          <p>Please login with your Government ID to access the Government Dashboard.</p>
          <button class="btn btn-primary gov-login-btn" id="login-trigger">Login with Government ID</button>
          <a href="/" class="back-link" data-link>← Back to Home</a>
        </div>
      </div>
    `;

    container.querySelector('#login-trigger').addEventListener('click', () => {
      const modal = new LoginModal();
      modal.show();
    });
  }

  setupEventListeners(container) {
    const sliders = container.querySelectorAll('.slider');
    const simulateBtn = container.querySelector('#simulate-btn');
    const logoutBtn = container.querySelector('#logout-btn');

    // Logout handler
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        authService.signOut();
        window.location.href = '/';
      });
    }

    // Update slider values
    sliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
        const valueSpan = container.querySelector(`#${e.target.id.replace('-slider', '-value')}`);
        if (valueSpan) {
          valueSpan.textContent = e.target.value;
        }
      });
    });

    // Simulate scenario
    simulateBtn.addEventListener('click', () => {
      this.simulateScenario(container);
    });
  }

  async loadData() {
    try {
      // Load cities
      const citiesResponse = await this.api.getCities();
      this.cities = citiesResponse;

      // Load data for each city
      for (const city of this.cities) {
        const state = await this.api.getCurrentState(city.id);
        const risks = await this.api.getRiskAssessment(city.id);
        const historical = await this.api.getHistoricalData(city.id, 24);

        this.citiesData[city.id] = {
          state,
          risks,
          historical
        };
      }

      // Render all sections
      this.renderCitiesOverview();
      this.renderRiskStatistics();
      this.renderPolicyRecommendations();
      this.renderHistoricalTrends();
    } catch (error) {
      console.error('Error loading government dashboard data:', error);
    }
  }

  renderCitiesOverview() {
    const container = document.querySelector('#cities-grid');
    if (!container) return;

    container.innerHTML = this.cities.map(city => {
      const data = this.citiesData[city.id];
      if (!data) return '';

      const state = data.state;
      const risks = data.risks;

      return `
        <a href="/map" class="city-card city-card-link" data-link data-city-id="${city.id}">
          <div class="city-header">
            <h3>${city.name}</h3>
            <span class="city-coords">${city.lat.toFixed(2)}, ${city.lng.toFixed(2)}</span>
            <span class="view-map-hint">Click to view on map →</span>
          </div>
          <div class="city-metrics">
            <div class="metric">
              <span class="metric-label">AQI</span>
              <span class="metric-value">${state.aqi}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Temperature</span>
              <span class="metric-value">${parseFloat(state.temperature).toFixed(1)}°C</span>
            </div>
            <div class="metric">
              <span class="metric-label">Hospital Load</span>
              <span class="metric-value">${state.hospital_load}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Crop Supply</span>
              <span class="metric-value">${state.crop_supply}%</span>
            </div>
          </div>
          <div class="city-risks">
            <div class="risk-item ${risks.environmental_risk.level}">
              <span>Environmental</span>
              <span>${risks.environmental_risk.probability}%</span>
            </div>
            <div class="risk-item ${risks.health_risk.level}">
              <span>Health</span>
              <span>${risks.health_risk.probability}%</span>
            </div>
            <div class="risk-item ${risks.food_security_risk.level}">
              <span>Food Security</span>
              <span>${risks.food_security_risk.probability}%</span>
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  renderRiskStatistics() {
    const container = document.querySelector('#risk-stats');
    if (!container) return;

    // Calculate aggregated statistics
    let totalEnvRisk = 0;
    let totalHealthRisk = 0;
    let totalFoodRisk = 0;
    let cityCount = 0;

    for (const city of this.cities) {
      const data = this.citiesData[city.id];
      if (data && data.risks) {
        totalEnvRisk += data.risks.environmental_risk.score;
        totalHealthRisk += data.risks.health_risk.score;
        totalFoodRisk += data.risks.food_security_risk.score;
        cityCount++;
      }
    }

    const avgEnvRisk = (totalEnvRisk / cityCount * 100).toFixed(1);
    const avgHealthRisk = (totalHealthRisk / cityCount * 100).toFixed(1);
    const avgFoodRisk = (totalFoodRisk / cityCount * 100).toFixed(1);

    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">🌍</div>
        <div class="stat-content">
          <h4>Environmental Risk</h4>
          <div class="stat-value">${avgEnvRisk}%</div>
          <div class="stat-bar">
            <div class="stat-fill" style="width: ${avgEnvRisk}%"></div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏥</div>
        <div class="stat-content">
          <h4>Health Risk</h4>
          <div class="stat-value">${avgHealthRisk}%</div>
          <div class="stat-bar">
            <div class="stat-fill" style="width: ${avgHealthRisk}%"></div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🌾</div>
        <div class="stat-content">
          <h4>Food Security Risk</h4>
          <div class="stat-value">${avgFoodRisk}%</div>
          <div class="stat-bar">
            <div class="stat-fill" style="width: ${avgFoodRisk}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  async simulateScenario(container) {
    const aqi = parseInt(container.querySelector('#aqi-slider').value);
    const hospitalLoad = parseInt(container.querySelector('#hospital-slider').value);
    const cropSupply = parseInt(container.querySelector('#crop-slider').value);
    const temperature = parseFloat(container.querySelector('#temp-slider').value);

    try {
      const result = await this.api.simulateScenario({
        aqi,
        hospital_load: hospitalLoad,
        crop_supply: cropSupply,
        temperature
      });

      this.scenarioResult = result;
      this.renderComparisonResults(container, result);
      this.renderEconomicImpact(container, result.economic_impact);
    } catch (error) {
      console.error('Error simulating scenario:', error);
    }
  }

  renderComparisonResults(container, result) {
    const resultsContainer = container.querySelector('#comparison-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <div class="comparison-grid">
        <div class="comparison-column">
          <h4>Baseline</h4>
          <div class="risk-comparison">
            <div class="risk-item">
              <span>Environmental</span>
              <span class="risk-level ${result.baseline.environmental_risk.level}">
                ${result.baseline.environmental_risk.probability}%
              </span>
            </div>
            <div class="risk-item">
              <span>Health</span>
              <span class="risk-level ${result.baseline.health_risk.level}">
                ${result.baseline.health_risk.probability}%
              </span>
            </div>
            <div class="risk-item">
              <span>Food Security</span>
              <span class="risk-level ${result.baseline.food_security_risk.level}">
                ${result.baseline.food_security_risk.probability}%
              </span>
            </div>
          </div>
        </div>
        <div class="comparison-column">
          <h4>With Intervention</h4>
          <div class="risk-comparison">
            <div class="risk-item">
              <span>Environmental</span>
              <span class="risk-level ${result.intervention.environmental_risk.level}">
                ${result.intervention.environmental_risk.probability}%
              </span>
            </div>
            <div class="risk-item">
              <span>Health</span>
              <span class="risk-level ${result.intervention.health_risk.level}">
                ${result.intervention.health_risk.probability}%
              </span>
            </div>
            <div class="risk-item">
              <span>Food Security</span>
              <span class="risk-level ${result.intervention.food_security_risk.level}">
                ${result.intervention.food_security_risk.probability}%
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderEconomicImpact(container, impact) {
    const impactContainer = container.querySelector('#economic-impact');
    if (!impactContainer) return;

    const formatCurrency = (value) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(value);
    };

    impactContainer.innerHTML = `
      <div class="impact-cards">
        <div class="impact-card">
          <div class="impact-icon">💰</div>
          <div class="impact-label">Intervention Cost</div>
          <div class="impact-value">${formatCurrency(impact.intervention_cost)}</div>
        </div>
        <div class="impact-card">
          <div class="impact-icon">💵</div>
          <div class="impact-label">Total Savings</div>
          <div class="impact-value">${formatCurrency(impact.total_savings)}</div>
        </div>
        <div class="impact-card highlight">
          <div class="impact-icon">📈</div>
          <div class="impact-label">ROI</div>
          <div class="impact-value">${impact.roi}x</div>
        </div>
        <div class="impact-card">
          <div class="impact-icon">⏱️</div>
          <div class="impact-label">Payback Period</div>
          <div class="impact-value">${impact.payback_period_months} months</div>
        </div>
      </div>
    `;
  }

  renderPolicyRecommendations() {
    const container = document.querySelector('#policy-recommendations');
    if (!container) return;

    const recommendations = this.generateRecommendations();

    container.innerHTML = `
      <div class="recommendations-list">
        ${recommendations.map((rec, index) => `
          <div class="recommendation-item priority-${rec.priority}">
            <div class="rec-icon">${rec.icon}</div>
            <div class="rec-content">
              <h4>${rec.title}</h4>
              <p>${rec.description}</p>
              <div class="rec-impact">
                <span class="impact-badge">Impact: ${rec.impact}</span>
                <span class="timeline-badge">Timeline: ${rec.timeline}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  generateRecommendations() {
    const recommendations = [];

    // Find city-specific issues
    let worstAqiCity = null;
    let worstHospitalCity = null;
    let worstCropCity = null;
    let maxAqi = 0;
    let maxHospital = 0;
    let minCrop = 100;

    for (const city of this.cities) {
      const data = this.citiesData[city.id];
      if (!data) continue;

      if (data.state.aqi > maxAqi) {
        maxAqi = data.state.aqi;
        worstAqiCity = city.name;
      }
      if (data.state.hospital_load > maxHospital) {
        maxHospital = data.state.hospital_load;
        worstHospitalCity = city.name;
      }
      if (data.state.crop_supply < minCrop) {
        minCrop = data.state.crop_supply;
        worstCropCity = city.name;
      }
    }

    // City-specific AQI recommendations
    if (maxAqi > 200) {
      recommendations.push({
        icon: '🚨',
        title: `URGENT: Air Quality Emergency in ${worstAqiCity}`,
        description: `AQI of ${maxAqi} is hazardous. Issue public health advisory, restrict outdoor activities, deploy air purifiers in public spaces.`,
        priority: 'high',
        impact: 'Critical',
        timeline: 'Immediate'
      });
    } else if (maxAqi > 150) {
      recommendations.push({
        icon: '⚠️',
        title: `Air Quality Warning: ${worstAqiCity}`,
        description: `AQI of ${maxAqi} is unhealthy. Consider odd-even vehicle scheme, increase metro frequency, alert sensitive groups.`,
        priority: 'high',
        impact: 'High',
        timeline: '24-48 hours'
      });
    } else if (maxAqi > 100) {
      recommendations.push({
        icon: '💨',
        title: `Monitor Air Quality in ${worstAqiCity}`,
        description: `AQI of ${maxAqi} is moderate. Continue monitoring, prepare contingency plans if conditions worsen.`,
        priority: 'medium',
        impact: 'Medium',
        timeline: '1 week'
      });
    }

    // Hospital capacity recommendations
    if (maxHospital > 80) {
      recommendations.push({
        icon: '🏥',
        title: `CRITICAL: Hospital Overflow Risk in ${worstHospitalCity}`,
        description: `Hospital load at ${maxHospital}%. Activate overflow facilities, redistribute patients to nearby cities, deploy mobile medical units.`,
        priority: 'high',
        impact: 'Critical',
        timeline: 'Immediate'
      });
    } else if (maxHospital > 60) {
      recommendations.push({
        icon: '🩺',
        title: `Healthcare Strain in ${worstHospitalCity}`,
        description: `Hospital load at ${maxHospital}%. Pre-position additional staff, prepare elective surgery deferrals, coordinate with private hospitals.`,
        priority: 'medium',
        impact: 'High',
        timeline: '48-72 hours'
      });
    }

    // Food security recommendations
    if (minCrop < 50) {
      recommendations.push({
        icon: '🌾',
        title: `Food Supply Alert: ${worstCropCity}`,
        description: `Crop supply at ${minCrop}%. Activate strategic reserves, coordinate inter-state grain movement, monitor price stabilization.`,
        priority: 'high',
        impact: 'High',
        timeline: '1 week'
      });
    } else if (minCrop < 70) {
      recommendations.push({
        icon: '🚜',
        title: `Agriculture Support for ${worstCropCity}`,
        description: `Crop supply at ${minCrop}%. Assess irrigation needs, provide farmer subsidies, prepare import contingencies.`,
        priority: 'medium',
        impact: 'Medium',
        timeline: '2-4 weeks'
      });
    }

    // General proactive recommendations
    recommendations.push({
      icon: '📱',
      title: 'Deploy Citizen Alert System',
      description: 'Send real-time SMS/app notifications to citizens in affected areas with safety guidelines and evacuation routes.',
      priority: 'medium',
      impact: 'High',
      timeline: '1-2 days'
    });

    recommendations.push({
      icon: '🤝',
      title: 'Inter-City Resource Sharing',
      description: 'Establish mutual aid agreements between Mumbai, Delhi, and Bangalore for emergency resource sharing.',
      priority: 'low',
      impact: 'Medium',
      timeline: '2-4 weeks'
    });

    return recommendations;
  }

  renderHistoricalTrends() {
    const container = document.querySelector('#historical-trends');
    if (!container) return;

    // Render trends for each city with canvas charts
    container.innerHTML = `
      <div class="trends-grid">
        ${this.cities.map(city => {
      const data = this.citiesData[city.id];
      if (!data || !data.historical) return '';

      const aqiData = data.historical.aqi || [];
      const hospitalData = data.historical.hospital_load || [];
      const cropData = data.historical.crop_supply || [];

      const avgAqi = aqiData.length > 0
        ? Math.round(aqiData.reduce((sum, d) => sum + d.value, 0) / aqiData.length)
        : 0;
      const avgHospital = hospitalData.length > 0
        ? Math.round(hospitalData.reduce((sum, d) => sum + d.value, 0) / hospitalData.length)
        : 0;

      return `
            <div class="trend-card" data-city-id="${city.id}">
              <h4>${city.name}</h4>
              <div class="trend-metrics-row">
                <div class="trend-metric">
                  <span class="trend-label">Avg AQI</span>
                  <span class="trend-value">${avgAqi}</span>
                </div>
                <div class="trend-metric">
                  <span class="trend-label">Avg Load</span>
                  <span class="trend-value">${avgHospital}%</span>
                </div>
              </div>
              <div class="trend-chart-container">
                <canvas id="chart-${city.id}" class="trend-canvas"></canvas>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;

    // Draw charts after DOM is ready
    setTimeout(() => this.drawTrendCharts(), 50);
  }

  drawTrendCharts() {
    for (const city of this.cities) {
      const data = this.citiesData[city.id];
      if (!data || !data.historical) continue;

      const canvas = document.getElementById(`chart-${city.id}`);
      if (!canvas) continue;

      const ctx = canvas.getContext('2d');
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = 100;

      const aqiData = data.historical.aqi || [];
      const hospitalData = data.historical.hospital_load || [];

      // Clear canvas
      ctx.fillStyle = 'rgba(30, 30, 60, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (canvas.height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw AQI line (purple)
      this.drawLineChart(ctx, aqiData, canvas.width, canvas.height, '#a78bfa', 500);

      // Draw Hospital Load line (cyan)
      this.drawLineChart(ctx, hospitalData, canvas.width, canvas.height, '#06b6d4', 100);

      // Legend
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#a78bfa';
      ctx.fillText('● AQI', 5, 12);
      ctx.fillStyle = '#06b6d4';
      ctx.fillText('● Hospital', 45, 12);
    }
  }

  drawLineChart(ctx, data, width, height, color, maxScale) {
    if (data.length < 2) return;

    const padding = 5;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    data.forEach((point, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = height - padding - (point.value / maxScale) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }

  startAutoRefresh() {
    this.updateInterval = setInterval(() => {
      this.loadData();
    }, 30000); // Refresh every 30 seconds
  }

  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
