import '../styles/components/metrics-display.css';

export class MetricsDisplay {
  formatValue(value, type) {
    if (value === null || value === undefined) return '—';
    
    const num = parseFloat(value);
    if (isNaN(num)) return '—';
    
    switch (type) {
      case 'temperature':
        return num.toFixed(1);
      case 'percentage':
        return Math.round(num);
      case 'aqi':
        return Math.round(num);
      case 'index':
        return Math.round(num);
      default:
        return Math.round(num);
    }
  }

  render(container, metrics) {
    const metricsList = [
      { label: 'AQI', value: this.formatValue(metrics.aqi, 'aqi'), unit: '', icon: '💨', type: 'aqi' },
      { label: 'Hospital Load', value: this.formatValue(metrics.hospital_load, 'percentage'), unit: '%', icon: '🏥', type: 'percentage' },
      { label: 'Temperature', value: this.formatValue(metrics.temperature, 'temperature'), unit: '°C', icon: '🌡️', type: 'temperature' },
      { label: 'Crop Supply', value: this.formatValue(metrics.crop_supply, 'percentage'), unit: '%', icon: '🌾', type: 'percentage' },
      { label: 'Food Price Index', value: this.formatValue(metrics.food_price_index, 'index'), unit: '', icon: '💹', type: 'index' },
      { label: 'Traffic Density', value: this.formatValue(metrics.traffic_density, 'percentage'), unit: '%', icon: '🚗', type: 'percentage' }
    ];

    container.innerHTML = `
      <div class="metrics-display">
        <h2>Current Metrics</h2>
        <div class="metrics-grid">
          ${metricsList.map(metric => `
            <div class="metric-card glass" data-type="${metric.type}">
              <div class="metric-icon">${metric.icon}</div>
              <div class="metric-label">${metric.label}</div>
              <div class="metric-value">
                ${metric.value}
                <span class="metric-unit">${metric.unit}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}
