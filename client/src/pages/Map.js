import { LeafletMapView } from '../components/LeafletMapView.js';
import '../styles/pages/map.css';

export class MapPage {
  constructor() {
    this.mapView = null;
    this.cities = {
      1: { id: 1, name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
      2: { id: 2, name: 'Delhi', lat: 28.7041, lng: 77.1025 },
      3: { id: 3, name: 'Bangalore', lat: 12.9716, lng: 77.5946 }
    };
    this.currentCity = 1;
  }

  async render(container) {
    const currentCityData = this.cities[this.currentCity];

    container.innerHTML = `
      <div class="map-page">
        <div class="map-hero">
          <div class="map-hero-content">
            <h1 id="city-title">${currentCityData.name.toUpperCase()} CITY MAP</h1>
            <p>Click anywhere on the map to view real-time Air Quality Index (AQI) for that location</p>
          </div>
        </div>

        <!-- City Selector -->
        <div class="city-selector-container">
          <label for="city-dropdown" class="city-label">Select City:</label>
          <select id="city-dropdown" class="city-dropdown">
            <option value="1" ${this.currentCity === 1 ? 'selected' : ''}>Mumbai</option>
            <option value="2" ${this.currentCity === 2 ? 'selected' : ''}>Delhi</option>
            <option value="3" ${this.currentCity === 3 ? 'selected' : ''}>Bangalore</option>
          </select>
        </div>

        <section class="map-section">
          <div id="map-container" style="width: 100%; height: 600px; min-height: 600px; position: relative; background: #0a0a1a; border: 1px solid rgba(167, 139, 250, 0.2); border-radius: 0.5rem; overflow: hidden;">
            <div id="map-loading-indicator" style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 10;">
              <div style="text-align: center;">
                <div class="loading" style="margin: 0 auto 1rem;"></div>
                <p>Loading ${currentCityData.name} map...</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    // Set up city dropdown listener
    const cityDropdown = container.querySelector('#city-dropdown');
    cityDropdown.addEventListener('change', (e) => {
      this.handleCityChange(e.target.value, container);
    });

    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize LeafletMapView for interactive map with AQI
    const mapContainer = container.querySelector('#map-container');
    if (mapContainer) {
      this.mapView = new LeafletMapView(currentCityData);
      await this.mapView.render(mapContainer);
    } else {
      console.error('Map container not found');
    }
  }

  handleCityChange(cityId, container) {
    const newCity = this.cities[parseInt(cityId)];
    if (!newCity) return;

    this.currentCity = parseInt(cityId);

    // Update title
    const titleEl = container.querySelector('#city-title');
    if (titleEl) {
      titleEl.textContent = `${newCity.name.toUpperCase()} CITY MAP`;
    }

    // Update map
    if (this.mapView) {
      this.mapView.setCity(newCity);
    }
  }

  cleanup() {
    if (this.mapView) {
      this.mapView.cleanup();
    }
  }
}
