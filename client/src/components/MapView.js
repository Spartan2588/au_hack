import { ApiClient } from '../utils/api.js';
import gsap from 'gsap';
import '../styles/components/map-view.css';

/**
 * Map View Component - Unified Visualization Layer
 * Designed to show urban risks, city markers, and cascade impacts.
 */
export class MapView {
  constructor() {
    this.api = new ApiClient();
    this.currentCity = 1;
    this.currentState = null;
    this.currentRisks = null;
    this.cascadeData = null;
    this.selectedLayer = 'environmental';
    this.canvas = null;
    this.ctx = null;
    this.cities = [
      { id: 1, name: 'Mumbai', lat: 19.0760, lng: 72.8777, x: 0.3, y: 0.5 },
      { id: 2, name: 'Delhi', lat: 28.7041, lng: 77.1025, x: 0.6, y: 0.3 },
      { id: 3, name: 'Bangalore', lat: 12.9716, lng: 77.5946, x: 0.5, y: 0.7 }
    ];
  }

  async render(container) {
    container.innerHTML = `
      <div class="map-view">
        <div class="map-header">
          <h2 id="map-title">City Risk Map</h2>
          <div class="map-controls">
            <select id="map-layer" class="map-select">
              <option value="environmental">Environmental Risk</option>
              <option value="health">Health Infrastructure</option>
              <option value="agriculture">Agricultural Zones</option>
              <option value="combined">Combined Risk</option>
            </select>
            <button id="map-refresh" class="map-btn">↻ Refresh</button>
          </div>
        </div>

        <div class="map-container">
          <canvas id="map-canvas" class="map-canvas"></canvas>
          <div class="map-overlay">
            <div class="map-info">
              <div id="map-city-info" class="info-panel"></div>
              <div id="map-legend" class="legend-panel"></div>
            </div>
          </div>
        </div>

        <div class="map-api-hooks">
          <div class="hook-info">
            <h4>Visualization Intelligence</h4>
            <p>Interactive city markers, real-time risk overlays, and cascading impact analysis.</p>
          </div>
        </div>
      </div>
    `;

    this.canvas = container.querySelector('#map-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.setupCanvas();
    this.setupEventListeners(container);
    await this.loadData();
  }

  setupCanvas() {
    const updateSize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.draw();
    };
    updateSize();
    window.addEventListener('resize', updateSize);
  }

  setupEventListeners(container) {
    const layerSelect = container.querySelector('#map-layer');
    const refreshBtn = container.querySelector('#map-refresh');

    layerSelect.addEventListener('change', (e) => {
      this.selectedLayer = e.target.value;
      this.draw();
    });

    refreshBtn.addEventListener('click', () => {
      this.loadData();
      gsap.to(refreshBtn, { rotation: 360, duration: 0.6 });
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleCityClick(x, y);
    });

    window.addEventListener('city-changed', (e) => {
      this.currentCity = e.detail.cityId;
      this.loadData();
    });

    window.addEventListener('scenario-updated', (e) => {
      this.syncWithScenario(e.detail);
    });
  }

  async loadData() {
    try {
      const [state, risks, cascade] = await Promise.all([
        this.api.getCurrentState(this.currentCity),
        this.api.getRiskAssessment(this.currentCity),
        this.api.getCascadingFailure(this.currentCity, 'power', 0.7, 24).catch(() => null)
      ]);

      this.currentState = state;
      this.currentRisks = risks;
      this.cascadeData = cascade;

      this.updateCityInfo();
      this.draw();
    } catch (error) {
      console.error('Failed to load map data:', error);
    }
  }

  draw() {
    if (!this.ctx) return;
    const { width, height } = this.canvas;

    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, width, height);

    this.drawMapBackground();

    switch (this.selectedLayer) {
      case 'environmental': this.drawEnvironmentalLayer(); break;
      case 'health': this.drawHealthLayer(); break;
      case 'agriculture': this.drawAgricultureLayer(); break;
      case 'combined': this.drawCombinedLayer(); break;
    }

    this.drawCityMarkers();
    this.drawGrid();
    this.drawLabels();
  }

  drawMapBackground() {
    const { width, height } = this.canvas;
    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(30, 30, 60, 0.3)');
    gradient.addColorStop(1, 'rgba(15, 15, 35, 0.3)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.strokeStyle = 'rgba(167, 139, 250, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, 0, width, height);
  }

  drawEnvironmentalLayer() {
    const { width, height } = this.canvas;
    const padding = 40;
    const zones = [
      { x: 0.2, y: 0.2, w: 0.3, h: 0.3, name: 'Industrial', risk: this.currentRisks?.environmental_risk?.score || 0.5 },
      { x: 0.6, y: 0.2, w: 0.3, h: 0.3, name: 'Residential', risk: 0.3 },
      { x: 0.2, y: 0.6, w: 0.3, h: 0.3, name: 'Commercial', risk: 0.4 },
      { x: 0.6, y: 0.6, w: 0.3, h: 0.3, name: 'Green Space', risk: 0.2 }
    ];

    zones.forEach(zone => {
      const x = padding + zone.x * (width - padding * 2);
      const y = padding + zone.y * (height - padding * 2);
      const w = zone.w * (width - padding * 2);
      const h = zone.h * (height - padding * 2);
      const color = this.getRiskColor(zone.risk);
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = 0.4;
      this.ctx.fillRect(x, y, w, h);
      this.ctx.globalAlpha = 1;
      this.ctx.strokeStyle = color;
      this.ctx.strokeRect(x, y, w, h);
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '10px Inter';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(zone.name, x + w / 2, y + h / 2);
    });
  }

  drawHealthLayer() {
    const { width, height } = this.canvas;
    const padding = 40;
    const facilities = [
      { x: 0.3, y: 0.3, name: 'Hospital A', load: this.currentRisks?.health_risk?.score || 0.5 },
      { x: 0.7, y: 0.7, name: 'Clinic B', load: 0.3 }
    ];

    facilities.forEach(f => {
      const x = padding + f.x * (width - padding * 2);
      const y = padding + f.y * (height - padding * 2);
      const radius = 20 + f.load * 20;
      const color = this.getRiskColor(f.load);
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = 0.3;
      this.ctx.beginPath(); this.ctx.arc(x, y, radius, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.globalAlpha = 1;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath(); this.ctx.arc(x, y, radius, 0, Math.PI * 2); this.ctx.stroke();
      this.ctx.fillStyle = '#fff'; this.ctx.font = '14px Arial'; this.ctx.fillText('🏥', x, y + 5);
    });
  }

  drawAgricultureLayer() {
    const { width, height } = this.canvas;
    const padding = 40;
    const zones = [
      { x: 0.4, y: 0.4, w: 0.2, h: 0.2, name: 'Central SupplyHub', supply: 0.8 }
    ];
    zones.forEach(zone => {
      const x = padding + zone.x * (width - padding * 2);
      const y = padding + zone.y * (height - padding * 2);
      const w = zone.w * (width - padding * 2);
      const h = zone.h * (height - padding * 2);
      const color = '#10b981';
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = 0.3; this.ctx.fillRect(x, y, w, h); this.ctx.globalAlpha = 1;
      this.ctx.strokeStyle = color; this.ctx.strokeRect(x, y, w, h);
    });
  }

  drawCombinedLayer() {
    this.ctx.globalAlpha = 0.3;
    this.drawEnvironmentalLayer();
    this.drawHealthLayer();
    this.drawAgricultureLayer();
    this.ctx.globalAlpha = 1;
  }

  drawCityMarkers() {
    const { width, height } = this.canvas;
    const padding = 40;
    this.cities.forEach(city => {
      const x = padding + city.x * (width - padding * 2);
      const y = padding + city.y * (height - padding * 2);
      const isSelected = city.id === this.currentCity;
      if (isSelected) {
        this.ctx.shadowColor = '#06b6d4'; this.ctx.shadowBlur = 15;
      }
      this.ctx.fillStyle = isSelected ? '#06b6d4' : '#6366f1';
      this.ctx.beginPath(); this.ctx.arc(x, y, isSelected ? 12 : 8, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#fff'; this.ctx.font = 'bold 12px Inter';
      this.ctx.fillText(city.name, x, y - 20);
      city.hitArea = { x, y, radius: 20 };
    });
  }

  handleCityClick(clickX, clickY) {
    for (const city of this.cities) {
      if (!city.hitArea) continue;
      const dist = Math.sqrt((clickX - city.hitArea.x) ** 2 + (clickY - city.hitArea.y) ** 2);
      if (dist <= city.hitArea.radius) {
        this.currentCity = city.id;
        window.dispatchEvent(new CustomEvent('city-changed', { detail: { cityId: city.id, name: city.name } }));
        break;
      }
    }
  }

  drawGrid() {
    const { width, height } = this.canvas;
    this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width; const y = (i / 10) * height;
      this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, height); this.ctx.stroke();
      this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(width, y); this.ctx.stroke();
    }
  }

  drawLabels() {
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.ctx.font = '10px Inter';
    this.ctx.fillText('N', this.canvas.width / 2, 20);
    this.ctx.fillText('S', this.canvas.width / 2, this.canvas.height - 10);
  }

  updateCityInfo() {
    const panel = document.querySelector('#map-city-info');
    if (!panel || !this.currentState) return;
    const env = this.currentRisks?.environmental_risk || { probability: 40 };
    panel.innerHTML = `
      <div style="padding: 15px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(167, 139, 250, 0.2); border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; font-size: 1.1rem; color: #a78bfa;">${this.currentState.city}</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9rem;">
            <div>AQI: <span style="color: #fff;">${this.currentState.aqi}</span></div>
            <div>Temp: <span style="color: #fff;">${this.currentState.temperature}°C</span></div>
            <div>Env Risk: <span style="color: #ef4444;">${env.probability}%</span></div>
            <div>Health: <span style="color: #10b981;">${Math.round(this.currentState.hospital_load)}%</span></div>
        </div>
      </div>
    `;

    const legend = document.querySelector('#map-legend');
    if (legend && this.cascadeData) {
      legend.innerHTML = `<div style="padding: 10px; margin-top: 10px; background: rgba(30, 41, 59, 0.6); border-radius: 4px; font-size: 0.8rem;">
            <strong>Cascade Detected:</strong> ${this.cascadeData.cascades?.length || 0} stages
        </div>`;
    }
  }

  getRiskColor(risk) {
    if (risk < 0.3) return '#10b981';
    if (risk < 0.6) return '#f59e0b';
    return '#ef4444';
  }

  syncWithScenario(scenario) {
    if (scenario.intervention) {
      this.currentRisks = scenario.intervention;
      this.draw();
    }
  }

  cleanup() { }
}
