import { CascadingFailureModel } from '../utils/CascadingFailureModel.js';
import { ApiClient } from '../utils/api.js';
import gsap from 'gsap';
import * as d3 from 'd3';
import Plotly from 'plotly.js-dist-min';
import '../styles/components/cascading-failure.css';

export class CascadingFailureViz {
  constructor() {
    this.model = new CascadingFailureModel();
    this.api = new ApiClient();
    this.cascade = null;
    this.cascadeData = null; // Real API data
    this.isAnimating = false;
    this.currentCityId = 1; // Default to Mumbai
    this.cities = [
      { id: 1, name: 'Mumbai' },
      { id: 2, name: 'Delhi' },
      { id: 3, name: 'Bangalore' }
    ];
    this.container = null; // Store container reference for scoped queries
    this.currentTime = 0; // Current time for animation
    this.comparisonScenarios = []; // Store scenarios for comparison
    this.networkGraph = null; // D3 force simulation
    this.timeAnimationId = null; // Animation interval ID
  }

  async render(container) {
    container.innerHTML = `
      <div class="cascading-failure">
        <div class="cascade-header">
          <h2>Cascading Failure Analysis</h2>
          <p class="cascade-subtitle">How failures propagate through interconnected systems</p>
        </div>

        <!-- Control Panel -->
        <div class="cascade-control-panel">
          <div class="control-group">
            <label for="city-select">City:</label>
            <select id="city-select" class="cascade-select">
              ${this.cities.map(city =>
      `<option value="${city.id}" ${city.id === this.currentCityId ? 'selected' : ''}>${city.name}</option>`
    ).join('')}
            </select>
          </div>
          <div class="control-group">
            <label for="trigger-select">Trigger Event:</label>
            <select id="trigger-select" class="cascade-select">
              <option value="power" selected>Power Grid Failure</option>
              <option value="water">Water System Failure</option>
              <option value="traffic">Traffic System Failure</option>
              <option value="communications">Communications Failure</option>
              <option value="emergency">Emergency Services Disruption</option>
              <option value="healthcare">Healthcare System Overload</option>
              <option value="transport">Public Transport Failure</option>
              <option value="financial">Financial System Disruption</option>
            </select>
          </div>
          <div class="control-group">
            <label for="severity-slider">Severity: <span id="severity-value">0.8</span></label>
            <input type="range" id="severity-slider" min="0.1" max="1.0" step="0.1" value="0.8" class="cascade-slider">
          </div>
          <div class="control-group" style="display: flex; gap: 10px; align-items: center;">
            <button id="cascade-simulate" class="cascade-btn primary">🔄 Simulate Cascade</button>
            <button id="cascade-compare" class="cascade-btn secondary">📊 Add to Comparison</button>
          </div>
          <div class="control-group">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="monte-carlo-toggle" style="width: 18px; height: 18px;"> 
              <span>Enable Monte Carlo (Uncertainty)</span>
            </label>
          </div>
        </div>

        <!-- Loading State -->
        <div id="cascade-loading" class="cascade-loading hidden">
          <div class="loading-spinner"></div>
          <p>Calculating cascade propagation...</p>
        </div>

        <!-- Content Container -->
        <div id="cascade-content" class="cascade-content">
          <!-- Tab Navigation -->
          <div class="cascade-tabs">
            <button class="tab-btn active" data-tab="network">Network Graph</button>
            <button class="tab-btn" data-tab="timeline">Timeline</button>
            <button class="tab-btn" data-tab="charts">Charts</button>
            <button class="tab-btn" data-tab="comparison">Comparison</button>
          </div>

          <!-- Network Graph Tab -->
          <div class="tab-content active" id="tab-network">
            <div class="network-graph-container">
              <div class="graph-controls">
                <button id="play-pause-btn" class="cascade-btn small">▶️ Play</button>
                <div class="slider-wrapper">
                  <label for="time-slider">Time: <span id="time-display">0h</span></label>
                  <input type="range" id="time-slider" min="0" max="24" step="0.5" value="0" class="cascade-slider">
                </div>
                <button id="reset-animation" class="cascade-btn small">⏮️ Reset</button>
              </div>
              <div id="network-graph" class="network-graph"></div>
            </div>
          </div>

          <!-- Timeline Tab -->
          <div class="tab-content" id="tab-timeline">
            <div class="cascade-container">
              <div class="cascade-progression">
                <h3>Failure Propagation Timeline</h3>
                <div id="cascade-timeline" class="cascade-timeline"></div>
              </div>
              <div class="cascade-metrics">
                <h3>Affected Infrastructure</h3>
                <div id="cascade-metrics" class="metrics-grid"></div>
              </div>
            </div>
          </div>

          <!-- Charts Tab -->
          <div class="tab-content" id="tab-charts">
            <div class="charts-container">
              <div class="chart-section">
                <h3>Severity Over Time</h3>
                <div id="severity-chart" class="plotly-chart"></div>
              </div>
              <div class="chart-section">
                <h3>Economic Impact Over Time</h3>
                <div id="economic-chart" class="plotly-chart"></div>
              </div>
              <div class="chart-section" id="monte-carlo-charts" style="display: none;">
                <h3>Uncertainty Ranges (Monte Carlo)</h3>
                <div id="uncertainty-chart" class="plotly-chart"></div>
              </div>
            </div>
          </div>

          <!-- Comparison Tab -->
          <div class="tab-content" id="tab-comparison">
            <div class="comparison-container">
              <div class="comparison-controls">
                <button id="clear-comparison" class="cascade-btn">Clear All</button>
                <span id="comparison-count">0 scenarios</span>
              </div>
              <div id="comparison-grid" class="comparison-grid"></div>
            </div>
          </div>

          <!-- Impact Summary -->
          <div class="cascade-summary-section">
            <h3>Total Impact Assessment</h3>
            <div id="cascade-impact" class="impact-grid"></div>
          </div>

          <!-- Recommendations -->
          <div class="cascade-recommendations">
            <h3>Mitigation Recommendations</h3>
            <div id="cascade-recommendations" class="recommendations-list"></div>
          </div>

          <!-- Detailed Stages -->
          <div class="cascade-stages-section">
            <h3>Detailed Cascade Stages</h3>
            <div id="cascade-stages" class="cascade-stages"></div>
          </div>
        </div>
      </div>
    `;

    // Store container reference for scoped queries
    this.container = container;

    this.setupEventListeners(container);
    this.setupTabs();
    // Load initial cascade with default city
    await this.loadCascadeData(this.currentCityId);
  }

  setupEventListeners(container) {
    const simulateBtn = container.querySelector('#cascade-simulate');
    const compareBtn = container.querySelector('#cascade-compare');
    const clearCompareBtn = container.querySelector('#clear-comparison');
    const citySelect = container.querySelector('#city-select');
    const triggerSelect = container.querySelector('#trigger-select');
    const severitySlider = container.querySelector('#severity-slider');
    const severityValue = container.querySelector('#severity-value');

    // Update severity display
    severitySlider.addEventListener('input', (e) => {
      severityValue.textContent = e.target.value;
    });

    // Update city when changed
    citySelect.addEventListener('change', (e) => {
      this.currentCityId = parseInt(e.target.value);
    });

    // Simulate cascade with real API
    simulateBtn.addEventListener('click', async () => {
      const cityId = parseInt(citySelect.value);
      const trigger = triggerSelect.value;
      const severity = parseFloat(severitySlider.value);
      const monteCarlo = container.querySelector('#monte-carlo-toggle')?.checked || false;
      await this.loadCascadeData(cityId, trigger, severity, monteCarlo);
    });

    // Add to comparison
    if (compareBtn) {
      compareBtn.addEventListener('click', () => {
        this.addToComparison();
      });
    }

    // Clear comparison
    if (clearCompareBtn) {
      clearCompareBtn.addEventListener('click', () => {
        this.clearComparison();
      });
    }
  }

  setupTabs() {
    if (!this.container) return;
    const tabBtns = this.container.querySelectorAll('.tab-btn');
    const tabContents = this.container.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        // Update button states
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update content visibility
        tabContents.forEach(content => {
          content.classList.remove('active');
          if (content.id === `tab-${tabId}`) {
            content.classList.add('active');
          }
        });

        // Trigger resize for charts if needed
        if (tabId === 'charts') {
          window.dispatchEvent(new Event('resize'));
        }
      });
    });
  }

  addToComparison() {
    if (!this.cascadeData || !this.container) return;

    const citySelect = this.container.querySelector('#city-select');
    const triggerSelect = this.container.querySelector('#trigger-select');
    const severitySlider = this.container.querySelector('#severity-slider');

    const scenario = {
      id: Date.now(),
      city: this.cities.find(c => c.id === parseInt(citySelect.value))?.name || 'Unknown',
      trigger: triggerSelect.value,
      severity: parseFloat(severitySlider.value),
      data: JSON.parse(JSON.stringify(this.cascadeData))
    };

    this.comparisonScenarios.push(scenario);
    this.renderComparison();

    // Switch to comparison tab
    const compTabBtn = this.container.querySelector('.tab-btn[data-tab="comparison"]');
    if (compTabBtn) compTabBtn.click();
  }

  renderComparison() {
    if (!this.container) return;

    const grid = this.container.querySelector('#comparison-grid');
    const count = this.container.querySelector('#comparison-count');

    if (count) {
      count.textContent = `${this.comparisonScenarios.length} scenarios`;
    }

    if (!grid) return;

    if (this.comparisonScenarios.length === 0) {
      grid.innerHTML = '<p class="empty-state">No scenarios added for comparison. Click "Add to Comparison" to compare scenarios.</p>';
      return;
    }

    const gridHTML = this.comparisonScenarios.map(scenario => {
      const impact = scenario.data.total_impact || {};
      return `
        <div class="comparison-card">
          <div class="comparison-header">
            <h4>${scenario.city} - ${this.formatDomainName(scenario.trigger)}</h4>
            <button class="remove-btn" data-id="${scenario.id}">×</button>
          </div>
          <div class="comparison-stats">
            <div class="stat-item">
              <span class="stat-label">Severity:</span>
              <span class="stat-value">${(scenario.severity * 100).toFixed(0)}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Domains:</span>
              <span class="stat-value">${impact.affected_domains || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Cost:</span>
              <span class="stat-value">$${((impact.estimated_economic_cost || 0) / 1000000).toFixed(1)}M</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Recovery:</span>
              <span class="stat-value">${impact.recovery_time_hours || 0}h</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    grid.innerHTML = gridHTML;

    // Add remove button handlers
    grid.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        this.comparisonScenarios = this.comparisonScenarios.filter(s => s.id !== id);
        this.renderComparison();
      });
    });
  }

  clearComparison() {
    this.comparisonScenarios = [];
    this.renderComparison();
  }

  async loadCascadeData(cityId = null, trigger = 'power', severity = 0.8, monteCarlo = false) {
    if (!this.container) return;

    const loadingEl = this.container.querySelector('#cascade-loading');
    const contentEl = this.container.querySelector('#cascade-content');
    const selectedCityId = cityId !== null ? cityId : this.currentCityId;

    try {
      if (loadingEl) loadingEl.classList.remove('hidden');
      if (contentEl) contentEl.classList.add('hidden');

      console.log(`[Cascade] Fetching data: cityId=${selectedCityId}, trigger=${trigger}, severity=${severity}`);

      // Use API Client for better error handling and structure
      const timestamp = Date.now();
      let url = `/api/v1/cascading-failure?city_id=${selectedCityId}&trigger=${trigger}&severity=${severity}&duration=24&_t=${timestamp}`;
      if (monteCarlo) {
        url += '&monte_carlo=true&iterations=100';
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      this.cascadeData = await response.json();

      // Show/hide monte carlo charts
      const mcCharts = this.container.querySelector('#monte-carlo-charts');
      if (mcCharts) {
        mcCharts.style.display = monteCarlo ? 'block' : 'none';
      }

      this.renderRealCascade();

      if (loadingEl) loadingEl.classList.add('hidden');
      if (contentEl) contentEl.classList.remove('hidden');

    } catch (error) {
      console.error('[Cascade] Failed to load data:', error);
      let errorMessage = error.message || 'Unknown error occurred';
      if (error.data) errorMessage = error.data.message || error.data.error || errorMessage;

      if (loadingEl) {
        loadingEl.innerHTML = `
          <div class="error-message" style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 20px; text-align: center;">
            <p style="font-size: 1.2rem; margin-bottom: 10px;">❌ Failed to load cascade data</p>
            <p style="color: #94a3b8; margin-bottom: 15px;">${errorMessage}</p>
            <button id="retry-cascade" class="cascade-btn primary">Retry Simulation</button>
          </div>
        `;
        const retryBtn = loadingEl.querySelector('#retry-cascade');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            this.loadCascadeData(selectedCityId, trigger, severity, monteCarlo);
          });
        }
      }
    }
  }

  renderRealCascade() {
    if (!this.cascadeData) return;
    this.renderRealTimeline();
    this.renderRealMetrics();
    this.renderRealImpact();
    this.renderRealRecommendations();
    this.renderRealStages();
    this.renderNetworkGraph();
    this.renderCharts();
    this.setupTimeSlider();
  }

  renderRealTimeline() {
    if (!this.container || !this.cascadeData) return;
    const tlContainer = this.container.querySelector('#cascade-timeline');
    if (!tlContainer) return;

    const cascades = this.cascadeData.cascades || [];
    if (cascades.length === 0) {
      tlContainer.innerHTML = '<p class="empty-state">No cascade propagation detected.</p>';
      return;
    }

    tlContainer.innerHTML = cascades.slice(0, 10).map((cascade, index) => {
      const color = this.getSeverityColor(cascade.severity);
      return `
        <div class="timeline-item" style="opacity: 0; transform: translateX(-20px);">
          <div class="timeline-marker" style="background: ${color};">
            <span class="marker-number">${index + 1}</span>
          </div>
          <div class="timeline-content">
            <div class="timeline-system">${this.formatDomainName(cascade.domain)}</div>
            <div class="timeline-details">
              <span class="timeline-severity" style="color: ${color};">${(cascade.severity * 100).toFixed(0)}% severity</span>
              <span class="timeline-delay">${cascade.impact_time_hours.toFixed(1)}h delay</span>
            </div>
            <div class="timeline-cause">Triggered by ${this.formatDomainName(cascade.cause)}</div>
          </div>
        </div>
      `;
    }).join('');

    gsap.to(tlContainer.querySelectorAll('.timeline-item'), {
      opacity: 1,
      x: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: 'power2.out'
    });
  }

  renderRealMetrics() {
    if (!this.container || !this.cascadeData) return;
    const metricsContainer = this.container.querySelector('#cascade-metrics');
    if (!metricsContainer) return;

    const cascades = this.cascadeData.cascades || [];
    const domainMap = {};
    cascades.forEach(c => {
      if (!domainMap[c.domain] || domainMap[c.domain].severity < c.severity) {
        domainMap[c.domain] = c;
      }
    });

    metricsContainer.innerHTML = Object.values(domainMap).map(cascade => {
      const severity = Math.round(cascade.severity * 100);
      const color = this.getSeverityColor(cascade.severity);
      return `
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-name">${this.formatDomainName(cascade.domain)}</span>
            <span class="metric-severity" style="color: ${color};">${severity}%</span>
          </div>
          <div class="metric-bar">
            <div class="metric-fill" style="width: ${severity}%; background: ${color};"></div>
          </div>
          <div class="metric-info">
            <span>${cascade.affected_infrastructure.length} sub-systems affected</span>
          </div>
        </div>
      `;
    }).join('');
  }

  renderRealImpact() {
    if (!this.container || !this.cascadeData) return;
    const impContainer = this.container.querySelector('#cascade-impact');
    if (!impContainer) return;

    const impact = this.cascadeData.total_impact || {};
    impContainer.innerHTML = `
      <div class="impact-stat">
        <div class="impact-icon">🏙️</div>
        <div class="impact-content">
          <div class="impact-value">${impact.affected_domains || 0}</div>
          <div class="impact-label">Domains Affected</div>
        </div>
      </div>
      <div class="impact-stat">
        <div class="impact-icon">👥</div>
        <div class="impact-content">
          <div class="impact-value">${((impact.population_affected || 0) / 1000000).toFixed(1)}M</div>
          <div class="impact-label">People Affected</div>
        </div>
      </div>
      <div class="impact-stat">
        <div class="impact-icon">💰</div>
        <div class="impact-content">
          <div class="impact-value">$${((impact.estimated_economic_cost || 0) / 1000000).toFixed(1)}M</div>
          <div class="impact-label">Economic Impact</div>
        </div>
      </div>
      <div class="impact-stat">
        <div class="impact-icon">⏱️</div>
        <div class="impact-content">
          <div class="impact-value">${impact.recovery_time_hours || 0}h</div>
          <div class="impact-label">Est. Recovery</div>
        </div>
      </div>
    `;
  }

  renderRealRecommendations() {
    if (!this.container || !this.cascadeData) return;
    const recsContainer = this.container.querySelector('#cascade-recommendations');
    if (!recsContainer) return;

    const recommendations = this.cascadeData.recommendations || [];
    recsContainer.innerHTML = recommendations.map((rec, index) => {
      const isObject = typeof rec === 'object';
      const action = isObject ? rec.action : rec;
      const urgency = isObject ? rec.urgency : 'high';
      const color = urgency === 'critical' ? '#ef4444' : urgency === 'high' ? '#f59e0b' : '#10b981';

      return `
        <div class="recommendation-item">
          <div class="recommendation-header">
            <span class="priority-badge" style="background: ${color};">#${index + 1}</span>
            <span class="urgency-label" style="color: ${color};">${urgency.toUpperCase()}</span>
          </div>
          <div class="recommendation-text">${action}</div>
          ${isObject && rec.rationale ? `<div class="recommendation-rationale">💡 ${rec.rationale}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  renderRealStages() {
    if (!this.container || !this.cascadeData) return;
    const stagesContainer = this.container.querySelector('#cascade-stages');
    if (!stagesContainer) return;

    const cascades = this.cascadeData.cascades || [];
    stagesContainer.innerHTML = cascades.map((cascade, index) => {
      const color = this.getSeverityColor(cascade.severity);
      return `
        <div class="stage-card" style="opacity: 0; transform: translateY(10px);">
          <div class="stage-header">
            <div class="stage-badge" style="background: ${color};">Stage ${index + 1}</div>
            <div class="stage-title">${this.formatDomainName(cascade.domain)}</div>
            <div class="stage-time">${cascade.impact_time_hours.toFixed(1)}h</div>
          </div>
          <div class="stage-body">
            <p><strong>Severity:</strong> <span style="color: ${color};">${(cascade.severity * 100).toFixed(0)}%</span></p>
            <p><strong>Affected Systems:</strong> ${cascade.affected_infrastructure.map(i => i.replace(/_/g, ' ')).join(', ')}</p>
          </div>
        </div>
      `;
    }).join('');

    gsap.to(stagesContainer.querySelectorAll('.stage-card'), {
      opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out'
    });
  }

  renderNetworkGraph() {
    if (!this.container || !this.cascadeData) return;
    const graphContainer = this.container.querySelector('#network-graph');
    if (!graphContainer) return;

    graphContainer.innerHTML = '';
    const width = graphContainer.clientWidth || 800;
    const height = 500;

    const svg = d3.select(graphContainer).append('svg')
      .attr('width', width).attr('height', height);

    const nodes = new Map();
    const trigger = this.cascadeData.trigger || { domain: 'power', severity: 0.8 };
    nodes.set(trigger.domain, { id: trigger.domain, label: this.formatDomainName(trigger.domain), severity: trigger.severity, type: 'trigger', time: 0 });

    const cascades = this.cascadeData.cascades || [];
    const links = cascades.map(c => {
      if (!nodes.has(c.domain)) nodes.set(c.domain, { id: c.domain, label: this.formatDomainName(c.domain), severity: c.severity, type: 'cascade', time: c.impact_time_hours });
      return { source: c.cause, target: c.domain, strength: c.dependency_strength };
    }).filter(l => nodes.has(l.source));

    const simulation = d3.forceSimulation(Array.from(nodes.values()))
      .force('link', d3.forceLink(links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g').selectAll('line').data(links).enter().append('line')
      .attr('stroke', '#475569').attr('stroke-width', d => d.strength * 4).attr('stroke-opacity', 0.6);

    const node = svg.append('g').selectAll('g').data(Array.from(nodes.values())).enter().append('g')
      .call(d3.drag().on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.append('circle').attr('r', d => 15 + d.severity * 20).attr('fill', d => this.getSeverityColor(d.severity)).attr('stroke', '#fff').attr('stroke-width', 2);
    node.append('text').text(d => d.label).attr('dy', 30).attr('text-anchor', 'middle').attr('fill', '#fff').style('font-size', '12px').style('font-weight', '600');

    simulation.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }

  renderCharts() {
    if (!this.container || !this.cascadeData) return;

    // Get timeline data from the correct location in API response
    const timeline = this.cascadeData.timeline || [];
    const impact = this.cascadeData.total_impact || {};
    const econTimeline = impact.economic_timeline || [];

    // Map the data to the format Plotly expects
    const times = timeline.map(p => p.hour);
    const severities = timeline.map(p => (p.total_severity || 0) * 100);
    const econTimes = econTimeline.map(p => p.hour);
    const costs = econTimeline.map(p => (p.cumulative_cost || 0) / 1000000);

    // If no timeline data, generate from cascades
    if (times.length === 0 && this.cascadeData.cascades) {
      const cascades = this.cascadeData.cascades || [];
      cascades.forEach(c => {
        times.push(c.impact_time_hours);
        severities.push((c.severity || 0) * 100);
      });
      // Sort by time
      const sorted = times.map((t, i) => ({ time: t, severity: severities[i] }))
        .sort((a, b) => a.time - b.time);
      times.length = 0;
      severities.length = 0;
      sorted.forEach(p => {
        times.push(p.time);
        severities.push(p.severity);
      });
    }

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#94a3b8', family: 'Inter' },
      margin: { t: 20, r: 20, b: 40, l: 50 },
      xaxis: { title: 'Hours', gridcolor: 'rgba(255,255,255,0.05)' },
      yaxis: { gridcolor: 'rgba(255,255,255,0.05)', title: 'Severity (%)' }
    };

    // Render severity chart
    if (times.length > 0) {
      Plotly.newPlot('severity-chart', [{
        x: times,
        y: severities,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#ef4444', width: 3 },
        marker: { size: 6 },
        name: 'Severity'
      }], layout);
    } else {
      // Show message if no data
      const severityChart = this.container.querySelector('#severity-chart');
      if (severityChart) {
        severityChart.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 2rem;">No severity timeline data available</p>';
      }
    }

    // Render economic chart
    if (econTimes.length > 0) {
      Plotly.newPlot('economic-chart', [{
        x: econTimes,
        y: costs,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#a78bfa', width: 3 },
        marker: { size: 6 },
        name: 'Economic Cost'
      }], { ...layout, yaxis: { ...layout.yaxis, title: '$ Millions' } });
    } else if (times.length > 0) {
      // Fallback: generate estimated economic impact based on severity
      const estCosts = severities.map((s, i) => (s / 100) * 10 * (i + 1)); // Simple estimate
      Plotly.newPlot('economic-chart', [{
        x: times,
        y: estCosts,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#a78bfa', width: 3 },
        marker: { size: 6 },
        name: 'Est. Economic Cost'
      }], { ...layout, yaxis: { ...layout.yaxis, title: '$ Millions (Est.)' } });
    }

    // Monte Carlo uncertainty chart
    const monteCarloData = this.cascadeData.monte_carlo;
    if (monteCarloData && monteCarloData.sample_results && monteCarloData.sample_results.length > 0) {
      const samples = monteCarloData.sample_results;

      // Get time points from the first sample's timeline
      const firstSample = samples[0];
      const sampleTimeline = firstSample.timeline || [];
      const mcTimes = sampleTimeline.map(p => p.hour);

      // Create traces for each sample (semi-transparent lines)
      const traces = samples.slice(0, 50).map(sample => {  // Limit to 50 samples for performance
        const timeline = sample.timeline || [];
        return {
          x: timeline.map(p => p.hour),
          y: timeline.map(p => (p.total_severity || 0) * 100),
          type: 'scatter',
          mode: 'lines',
          line: { color: 'rgba(239, 68, 68, 0.15)', width: 1 },
          showlegend: false,
          hoverinfo: 'skip'
        };
      });

      // Add the mean/expected path if available from statistics
      const stats = monteCarloData.statistics;
      if (stats && stats.mean_severity_by_hour) {
        const meanHours = Object.keys(stats.mean_severity_by_hour).map(Number).sort((a, b) => a - b);
        const meanValues = meanHours.map(h => (stats.mean_severity_by_hour[h] || 0) * 100);

        traces.push({
          x: meanHours,
          y: meanValues,
          type: 'scatter',
          mode: 'lines',
          line: { color: '#ef4444', width: 3 },
          name: 'Mean Path'
        });
      } else {
        // Use the main timeline as expected path
        traces.push({
          x: times,
          y: severities,
          type: 'scatter',
          mode: 'lines',
          line: { color: '#ef4444', width: 3 },
          name: 'Expected Path'
        });
      }

      const mcLayout = {
        ...layout,
        title: { text: 'Monte Carlo Uncertainty Range', font: { color: '#e2e8f0', size: 14 } },
        yaxis: { ...layout.yaxis, title: 'Severity (%)' },
        showlegend: true,
        legend: { x: 0, y: 1, bgcolor: 'rgba(0,0,0,0)', font: { color: '#94a3b8' } }
      };

      Plotly.newPlot('uncertainty-chart', traces, mcLayout);
    } else if (this.cascadeData.uncertainty_samples) {
      // Fallback for old format
      const data = this.cascadeData.uncertainty_samples.map(s => ({
        x: times,
        y: Array.isArray(s) ? s.map(v => v * 100) : [],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'rgba(239, 68, 68, 0.1)', width: 1 },
        showlegend: false
      }));
      data.push({
        x: times,
        y: severities,
        type: 'scatter',
        mode: 'lines',
        line: { color: '#ef4444', width: 3 },
        name: 'Expected Path'
      });
      Plotly.newPlot('uncertainty-chart', data, { ...layout, title: 'Monte Carlo Uncertainty Range' });
    } else {
      // No Monte Carlo data available
      const uncertaintyChart = this.container.querySelector('#uncertainty-chart');
      if (uncertaintyChart) {
        uncertaintyChart.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 2rem;">No Monte Carlo data available. Enable Monte Carlo and run simulation.</p>';
      }
    }
  }

  setupTimeSlider() {
    const slider = this.container.querySelector('#time-slider');
    const display = this.container.querySelector('#time-display');
    if (slider && display) {
      slider.addEventListener('input', (e) => {
        const time = parseFloat(e.target.value);
        display.textContent = `${time}h`;
        this.updateGraphForTime(time);
      });
    }
  }

  updateGraphForTime(time) {
    // Dim nodes that hasn't happened yet
    d3.selectAll('#network-graph circle').style('opacity', d => d.time <= time ? 1 : 0.2);
    d3.selectAll('#network-graph line').style('opacity', d => d.target.time <= time ? 0.6 : 0.1);
  }

  formatDomainName(domain) {
    if (!domain) return 'System';
    return domain.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  getSeverityColor(severity) {
    if (severity < 0.3) return '#10b981';
    if (severity < 0.6) return '#f59e0b';
    return '#ef4444';
  }

  cleanup() {
    if (this.timeAnimationId) clearInterval(this.timeAnimationId);
  }
}
