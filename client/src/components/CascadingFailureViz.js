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
          <div class="control-group">
            <button id="cascade-simulate" class="cascade-btn primary">🔄 Simulate Cascade</button>
            <button id="cascade-compare" class="cascade-btn secondary">📊 Add to Comparison</button>
          </div>
          <div class="control-group">
            <label>
              <input type="checkbox" id="monte-carlo-toggle"> Enable Monte Carlo (Uncertainty)
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
                <label for="time-slider">Time: <span id="time-display">0h</span></label>
                <input type="range" id="time-slider" min="0" max="24" step="0.5" value="0" class="cascade-slider">
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
              <div class="chart-section" id="monte-carlo-charts">
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
    const citySelect = container.querySelector('#city-select');
    const triggerSelect = container.querySelector('#trigger-select');
    const severitySlider = container.querySelector('#severity-slider');
    const severityValue = container.querySelector('#severity-value');
    const clearCompareBtn = container.querySelector('#clear-comparison');

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

  /**
   * Add current scenario to comparison
   */
  addToComparison() {
    if (!this.cascadeData) return;

    const citySelect = this.container.querySelector('#city-select');
    const triggerSelect = this.container.querySelector('#trigger-select');
    const severitySlider = this.container.querySelector('#severity-slider');

    const scenario = {
      id: Date.now(),
      city: this.cities.find(c => c.id === parseInt(citySelect.value))?.name || 'Unknown',
      trigger: triggerSelect.value,
      severity: parseFloat(severitySlider.value),
      data: { ...this.cascadeData }
    };

    this.comparisonScenarios.push(scenario);
    this.renderComparison();
  }

  /**
   * Render comparison view
   */
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
              <span class="stat-value">$${((impact.estimated_economic_cost || 0) / 1000000).toFixed(0)}M</span>
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

  /**
   * Clear all comparisons
   */
  clearComparison() {
    this.comparisonScenarios = [];
    this.renderComparison();
  }

  async loadCascadeData(cityId = null, trigger = 'power', severity = 0.8, monteCarlo = false) {
    if (!this.container) {
      console.error('Container not initialized');
      return;
    }

    const loadingEl = this.container.querySelector('#cascade-loading');
    const contentEl = this.container.querySelector('#cascade-content');

    // Use provided cityId or current cityId
    const selectedCityId = cityId !== null ? cityId : this.currentCityId;

    try {
      // Show loading state
      if (loadingEl) loadingEl.classList.remove('hidden');
      if (contentEl) contentEl.classList.add('hidden');

      console.log(`[Cascade] Loading cascade data: cityId=${selectedCityId}, trigger=${trigger}, severity=${severity}`);

      // Fetch real cascade data from API with cache-busting
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

      console.log('[Cascade] Data received:', this.cascadeData);

      // Render the data
      this.renderRealCascade();

      // Hide loading, show content
      if (loadingEl) loadingEl.classList.add('hidden');
      if (contentEl) contentEl.classList.remove('hidden');

    } catch (error) {
      console.error('[Cascade] Failed to load cascade data:', error);

      // Extract error message - fetch errors don't have response property
      let errorMessage = error.message || 'Unknown error occurred';

      // If error has data property (from our API client), use it
      if (error.data) {
        errorMessage = error.data.message || error.data.error || errorMessage;
      }

      if (loadingEl) {
        loadingEl.innerHTML = `
          <div class="error-message">
            <p>❌ Failed to load cascade data</p>
            <p class="error-detail">${errorMessage}</p>
            <p class="error-hint">Please ensure the backend server is running on port 5000</p>
            <button id="retry-cascade" class="cascade-btn">Retry</button>
          </div>
        `;

        // Add retry button handler
        const retryBtn = loadingEl.querySelector('#retry-cascade');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            this.loadCascadeData(selectedCityId, trigger, severity);
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

    // New interactive visualizations
    this.renderNetworkGraph();
    this.renderCharts();
    this.setupTimeSlider();
    this.setupTabs();
  }

  renderRealTimeline() {
    if (!this.container || !this.cascadeData) return;
    const container = this.container.querySelector('#cascade-timeline');
    if (!container) return;

    const cascades = this.cascadeData.cascades || [];

    if (cascades.length === 0) {
      container.innerHTML = '<p class="empty-state">No cascade propagation detected.</p>';
      return;
    }

    const timelineHTML = cascades.slice(0, 10).map((cascade, index) => {
      const severity = Math.round(cascade.severity * 100);
      const color = this.getSeverityColor(cascade.severity);

      return `
        <div class="timeline-item">
          <div class="timeline-marker" style="background: ${color};">
            <span class="marker-number">${index + 1}</span>
          </div>
          <div class="timeline-content">
            <div class="timeline-system">${this.formatDomainName(cascade.domain)}</div>
            <div class="timeline-details">
              <span class="timeline-severity">${severity}% severity</span>
              <span class="timeline-delay">${cascade.impact_time_hours.toFixed(1)}h</span>
            </div>
            <div class="timeline-cause">from ${this.formatDomainName(cascade.cause)}</div>
          </div>
          ${index < Math.min(cascades.length, 10) - 1 ? '<div class="timeline-arrow">→</div>' : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = timelineHTML;

    // Animate items in
    gsap.to(container.querySelectorAll('.timeline-item'), {
      opacity: 1,
      x: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out'
    });
  }

  renderRealMetrics() {
    if (!this.container || !this.cascadeData) return;
    const container = this.container.querySelector('#cascade-metrics');
    if (!container) return;

    const cascades = this.cascadeData.cascades || [];

    // Group by domain and find max severity
    const domainMap = {};
    cascades.forEach(c => {
      if (!domainMap[c.domain] || domainMap[c.domain].severity < c.severity) {
        domainMap[c.domain] = c;
      }
    });

    const metricsHTML = Object.values(domainMap).map(cascade => {
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
            <span>${cascade.affected_infrastructure.length} components affected</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = metricsHTML || '<p class="empty-state">No metrics available.</p>';
  }

  renderRealImpact() {
    if (!this.container || !this.cascadeData) return;
    const container = this.container.querySelector('#cascade-impact');
    if (!container) return;

    const impact = this.cascadeData.total_impact;

    const impactHTML = `
      <div class="impact-stat">
        <div class="impact-icon">🏙️</div>
        <div class="impact-content">
          <div class="impact-value">${impact.affected_domains}</div>
          <div class="impact-label">Domains Affected</div>
        </div>
      </div>
      <div class="impact-stat">
        <div class="impact-icon">👥</div>
        <div class="impact-content">
          <div class="impact-value">${(impact.population_affected / 1000000).toFixed(1)}M</div>
          <div class="impact-label">People Affected</div>
        </div>
      </div>
      <div class="impact-stat">
        <div class="impact-icon">💰</div>
        <div class="impact-content">
          <div class="impact-value">$${(impact.estimated_economic_cost / 1000000).toFixed(0)}M</div>
          <div class="impact-label">Economic Cost</div>
        </div>
      </div>
      <div class="impact-stat">
        <div class="impact-icon">⏱️</div>
        <div class="impact-content">
          <div class="impact-value">${impact.recovery_time_hours}h</div>
          <div class="impact-label">Recovery Time</div>
        </div>
      </div>
    `;

    container.innerHTML = impactHTML;
  }

  renderRealRecommendations() {
    if (!this.container || !this.cascadeData) return;
    const container = this.container.querySelector('#cascade-recommendations');
    if (!container) return;

    const recommendations = this.cascadeData.recommendations || [];

    const recsHTML = recommendations.map((rec, index) => {
      // Handle both old format (string) and new format (object)
      const isObject = typeof rec === 'object';
      const priority = isObject ? rec.priority : index + 1;
      const action = isObject ? rec.action : rec;
      const cost = isObject ? rec.cost_usd : null;
      const roi = isObject ? rec.cost_effectiveness : null;
      const timeline = isObject ? rec.implementation_time_hours : null;
      const urgency = isObject ? rec.urgency : null;
      const rationale = isObject ? rec.rationale : null;

      const urgencyColor = urgency === 'critical' ? '#ef4444' : urgency === 'high' ? '#f59e0b' : '#10b981';

      return `
        <div class="recommendation-item">
          <div class="recommendation-header">
            <div class="recommendation-priority">
              <span class="priority-badge" style="background: ${urgencyColor};">#${priority}</span>
              ${urgency ? `<span class="urgency-label" style="color: ${urgencyColor};">${urgency.toUpperCase()}</span>` : ''}
            </div>
            ${timeline ? `<div class="recommendation-timeline">⏱️ ${timeline.toFixed(1)}h</div>` : ''}
          </div>
          <div class="recommendation-text">${action}</div>
          ${(cost || roi) ? `
            <div class="recommendation-metrics">
              ${cost ? `<span class="metric-cost">💰 $${(cost / 1000).toFixed(0)}K</span>` : ''}
              ${roi ? `<span class="metric-roi">📈 ROI: ${roi.toFixed(1)}x</span>` : ''}
            </div>
          ` : ''}
          ${rationale ? `<div class="recommendation-rationale">💡 ${rationale}</div>` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = recsHTML || '<p class="empty-state">No recommendations available.</p>';
  }

  renderRealStages() {
    if (!this.container || !this.cascadeData) return;
    const container = this.container.querySelector('#cascade-stages');
    if (!container) return;

    const cascades = this.cascadeData.cascades || [];

    const stagesHTML = cascades.map((cascade, index) => {
      const severity = Math.round(cascade.severity * 100);
      const color = this.getSeverityColor(cascade.severity);

      return `
        <div class="stage-card">
          <div class="stage-header">
            <div class="stage-badge" style="background: ${color};">
              Stage ${index + 1}
            </div>
            <div class="stage-title">${this.formatDomainName(cascade.domain)}</div>
            <div class="stage-time">${cascade.impact_time_hours.toFixed(1)}h</div>
          </div>
          <div class="stage-body">
            <div class="stage-metrics">
              <div class="metric-row">
                <span class="metric-key">Severity:</span>
                <span class="metric-val" style="color: ${color};">${severity}%</span>
              </div>
              <div class="metric-row">
                <span class="metric-key">Caused by:</span>
                <span class="metric-val">${this.formatDomainName(cascade.cause)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-key">Dependency:</span>
                <span class="metric-val">${Math.round(cascade.dependency_strength * 100)}%</span>
              </div>
            </div>
            <div class="stage-infrastructure">
              <strong>Affected Infrastructure:</strong>
              <ul>
                ${cascade.affected_infrastructure.map(i => `<li>${i.replace(/_/g, ' ')}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = stagesHTML || '<p class="empty-state">No cascade stages to display.</p>';

    // Animate stages in
    gsap.to(container.querySelectorAll('.stage-card'), {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out'
    });
  }

  formatDomainName(domain) {
    return domain.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  // Deprecated old methods (kept for backwards compatibility)
  initializeCascade() { }
  updateCascadeFromScenario() { }
  renderCascade() { }
  renderTimeline() { }
  renderMetricsImpact() { }
  renderStages() { }
  renderSummary() { }
  animateCascade() { }
  resetCascade() { }

  getSeverityColor(severity) {
    if (severity < 0.33) return '#10b981';
    if (severity < 0.66) return '#f59e0b';
    return '#ef4444';
  }

  // ===== NEW INTERACTIVE VISUALIZATION METHODS =====

  /**
   * Render interactive force-directed network graph using D3.js
   */
  renderNetworkGraph() {
    if (!this.container || !this.cascadeData) return;

    const container = this.container.querySelector('#network-graph');
    if (!container) return;

    // Clear previous graph
    container.innerHTML = '';
    const width = container.clientWidth || 800;
    const height = 600;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Build graph from cascade data
    const nodes = new Map();
    const links = [];

    // Add trigger node
    const trigger = this.cascadeData?.trigger;
    if (!trigger || !trigger.domain) {
      container.innerHTML = '<p class="empty-state">No cascade data available</p>';
      return;
    }

    nodes.set(trigger.domain, {
      id: trigger.domain,
      label: this.formatDomainName(trigger.domain),
      severity: trigger.severity || 0.8,
      type: 'trigger',
      time: 0
    });

    // Add cascade nodes and links
    const cascades = this.cascadeData?.cascades || [];
    cascades.forEach(cascade => {
      if (!nodes.has(cascade.domain)) {
        nodes.set(cascade.domain, {
          id: cascade.domain,
          label: this.formatDomainName(cascade.domain),
          severity: cascade.severity,
          type: 'cascade',
          time: cascade.impact_time_hours
        });
      }

      links.push({
        source: cascade.cause,
        target: cascade.domain,
        strength: cascade.dependency_strength,
        type: cascade.cascade_type || 'direct'
      });
    });

    const nodeArray = Array.from(nodes.values());
    const linkArray = links
      .filter(link => nodes.has(link.source) && nodes.has(link.target)) // Filter invalid links
      .map(link => ({
        ...link,
        source: nodes.get(link.source),
        target: nodes.get(link.target)
      }));

    // Create force simulation
    const simulation = d3.forceSimulation(nodeArray)
      .force('link', d3.forceLink(linkArray).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(linkArray)
      .enter()
      .append('line')
      .attr('stroke', d => {
        if (d.type === 'feedback_loop') return '#ef4444';
        if (d.type === 'reverse') return '#f59e0b';
        return '#94a3b8';
      })
      .attr('stroke-width', d => d.strength * 3)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#94a3b8');

    // Draw nodes
    const node = svg.append('g')
      .selectAll('circle')
      .data(nodeArray)
      .enter()
      .append('circle')
      .attr('r', d => 15 + d.severity * 20)
      .attr('fill', d => this.getSeverityColor(d.severity))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .call(this.drag(simulation))
      .on('mouseover', function (event, d) {
        d3.select(this).attr('stroke-width', 4);
        tooltip.style('display', 'block')
          .html(`<strong>${d.label}</strong><br>Severity: ${(d.severity * 100).toFixed(0)}%<br>Time: ${d.time.toFixed(1)}h`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke-width', 2);
        tooltip.style('display', 'none');
      })
      .on('mousemove', function (event) {
        tooltip.style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      });

    // Labels
    const labels = svg.append('g')
      .selectAll('text')
      .data(nodeArray)
      .enter()
      .append('text')
      .text(d => d.label)
      .attr('font-size', '12px')
      .attr('dx', 25)
      .attr('dy', 5)
      .attr('fill', '#334155');

    // Tooltip
    const tooltip = d3.select(container)
      .append('div')
      .attr('class', 'network-tooltip')
      .style('display', 'none')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      labels
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    this.networkGraph = simulation;
  }

  drag(simulation) {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  /**
   * Render charts using Plotly
   */
  renderCharts() {
    if (!this.container || !this.cascadeData) return;

    const timeline = this.cascadeData.timeline || [];
    const monteCarlo = this.cascadeData.monte_carlo;

    // Severity over time chart
    this.renderSeverityChart(timeline);

    // Economic impact chart
    this.renderEconomicChart(timeline);

    // Monte Carlo uncertainty ranges
    if (monteCarlo) {
      this.renderUncertaintyChart(monteCarlo);
    }
  }

  renderSeverityChart(timeline) {
    const container = this.container.querySelector('#severity-chart');
    if (!container || timeline.length === 0) return;

    const hours = timeline.map(t => t.hour);
    const totalSeverity = timeline.map(t => t.total_severity);
    const domains = timeline.map(t => t.affected_domains);

    const trace1 = {
      x: hours,
      y: totalSeverity,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Total Severity',
      line: { color: '#ef4444', width: 3 }
    };

    const trace2 = {
      x: hours,
      y: domains,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Affected Domains',
      yaxis: 'y2',
      line: { color: '#f59e0b', width: 2 }
    };

    const layout = {
      title: 'Cascade Progression Over Time',
      xaxis: { title: 'Time (hours)' },
      yaxis: { title: 'Total Severity', side: 'left' },
      yaxis2: { title: 'Domains Affected', overlaying: 'y', side: 'right' },
      hovermode: 'x unified',
      height: 400
    };

    Plotly.newPlot(container, [trace1, trace2], layout, { responsive: true });
  }

  renderEconomicChart(timeline) {
    const container = this.container.querySelector('#economic-chart');
    if (!container || !this.cascadeData || !this.cascadeData.total_impact) return;

    const economicTimeline = this.cascadeData.total_impact.economic_timeline || [];

    if (economicTimeline.length === 0) {
      // Fallback if backend doesn't provide it yet
      const impact = this.cascadeData.total_impact;
      const duration = timeline.length;
      const costPerHour = (impact.estimated_economic_cost || 0) / duration;
      const hours = timeline.map(t => t.hour);
      const cumulativeCost = hours.map((h, i) => costPerHour * (i + 1) * (1 + h / 24));

      const trace = {
        x: hours,
        y: cumulativeCost.map(c => c / 1000000),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Cumulative Economic Cost (Est)',
        fill: 'tozeroy',
        line: { color: '#06b6d4', width: 3 },
        fillcolor: 'rgba(6, 182, 212, 0.2)'
      };

      const layout = {
        title: 'Economic Impact Over Time (Backend Link Pending)',
        xaxis: { title: 'Time (hours)' },
        yaxis: { title: 'Cost (Millions USD)' },
        hovermode: 'x unified',
        height: 400
      };

      Plotly.newPlot(container, [trace], layout, { responsive: true });
      return;
    }

    const hours = economicTimeline.map(t => t.hour);
    const cumulativeCost = economicTimeline.map(t => t.cumulative_cost / 1000000); // Millions

    const trace = {
      x: hours,
      y: cumulativeCost,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Cumulative Economic Cost',
      fill: 'tozeroy',
      line: { color: '#0891b2', width: 3 },
      fillcolor: 'rgba(8, 145, 178, 0.2)'
    };

    const layout = {
      title: 'Economic Impact Over Time (Real-Time Modeling)',
      xaxis: { title: 'Time (hours)' },
      yaxis: { title: 'Cost (Millions USD)' },
      hovermode: 'x unified',
      height: 400,
      margin: { t: 40, b: 40, l: 60, r: 20 }
    };

    Plotly.newPlot(container, [trace], layout, { responsive: true });
  }

  renderUncertaintyChart(monteCarlo) {
    const container = this.container.querySelector('#uncertainty-chart');
    if (!container || !monteCarlo.statistics) return;

    const stats = monteCarlo.statistics.total_economic_cost;
    if (!stats) return;

    const trace = {
      x: ['p5', 'p25', 'Median', 'p75', 'p95'],
      y: [
        stats.percentiles.p5 / 1000000,
        stats.percentiles.p25 / 1000000,
        stats.median / 1000000,
        stats.percentiles.p75 / 1000000,
        stats.percentiles.p95 / 1000000
      ],
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Economic Cost Distribution',
      fill: 'tonexty',
      line: { color: '#a78bfa', width: 2 },
      fillcolor: 'rgba(167, 139, 250, 0.2)'
    };

    const layout = {
      title: 'Uncertainty Ranges (Monte Carlo Simulation)',
      xaxis: { title: 'Percentile' },
      yaxis: { title: 'Economic Cost (Millions USD)' },
      height: 400
    };

    Plotly.newPlot(container, [trace], layout, { responsive: true });
  }

  /**
   * Setup time slider for animation
   */
  setupTimeSlider() {
    if (!this.container || !this.cascadeData) return;

    const slider = this.container.querySelector('#time-slider');
    const display = this.container.querySelector('#time-display');
    const playBtn = this.container.querySelector('#play-pause-btn');
    const resetBtn = this.container.querySelector('#reset-animation');

    if (!slider || !display) return;

    const timeline = this.cascadeData.timeline || [];
    const maxTime = timeline.length > 0 ? Math.max(...timeline.map(t => t.hour)) : 24;

    slider.max = maxTime;
    this.currentTime = 0;

    slider.addEventListener('input', (e) => {
      this.currentTime = parseFloat(e.target.value);
      display.textContent = `${this.currentTime.toFixed(1)}h`;
      this.updateNetworkGraphForTime(this.currentTime);
    });

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (this.isAnimating) {
          this.stopAnimation();
          playBtn.textContent = '▶️ Play';
        } else {
          this.startAnimation(maxTime);
          playBtn.textContent = '⏸️ Pause';
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.stopAnimation();
        this.currentTime = 0;
        slider.value = 0;
        display.textContent = '0h';
        this.updateNetworkGraphForTime(0);
        if (playBtn) playBtn.textContent = '▶️ Play';
      });
    }
  }

  startAnimation(maxTime) {
    this.isAnimating = true;
    const slider = this.container.querySelector('#time-slider');
    const display = this.container.querySelector('#time-display');

    this.timeAnimationId = setInterval(() => {
      this.currentTime += 0.5;
      if (this.currentTime > maxTime) {
        this.stopAnimation();
        return;
      }
      if (slider) slider.value = this.currentTime;
      if (display) display.textContent = `${this.currentTime.toFixed(1)}h`;
      this.updateNetworkGraphForTime(this.currentTime);
    }, 500); // Update every 500ms
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.timeAnimationId) {
      clearInterval(this.timeAnimationId);
      this.timeAnimationId = null;
    }
  }

  updateNetworkGraphForTime(time) {
    // Update node colors/sizes based on time
    // This would require storing time-based severity data
    // Simplified implementation
    if (this.networkGraph && this.cascadeData) {
      const cascades = this.cascadeData.cascades || [];
      // Would update node visualizations based on current time
    }
  }

  /**
   * Setup tab navigation
   */
  setupTabs() {
    if (!this.container) return;

    const tabs = this.container.querySelectorAll('.tab-btn');
    const contents = this.container.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;

        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const content = this.container.querySelector(`#tab-${tabId}`);
        if (content) content.classList.add('active');
      });
    });
  }

  cleanup() {
    this.stopAnimation();
    if (this.networkGraph) {
      this.networkGraph.stop();
    }
  }
}
