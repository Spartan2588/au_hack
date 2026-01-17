import { LeafletMapView } from '../components/LeafletMapView.js';
import '../styles/pages/map.css';

export class MapPage {
  constructor() {
    this.mapView = null;
  }

  async render(container) {
    container.innerHTML = `
      <div class="map-page">
        <div class="map-hero">
          <div class="map-hero-content">
            <h1>MUMBAI CITY MAP</h1>
            <p>Click anywhere on the map to view real-time Air Quality Index (AQI) for that location</p>
          </div>
        </div>

        <section class="map-section">
          <div id="map-container" style="width: 100%; height: 600px; min-height: 600px; position: relative; background: #0a0a1a; border: 1px solid rgba(167, 139, 250, 0.2); border-radius: 0.5rem; overflow: hidden;">
            <div id="map-loading-indicator" style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 10;">
              <div style="text-align: center;">
                <div class="loading" style="margin: 0 auto 1rem;"></div>
                <p>Loading Mumbai map...</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize LeafletMapView for interactive Mumbai map with AQI
    const mapContainer = container.querySelector('#map-container');
    if (mapContainer) {
      this.mapView = new LeafletMapView();
      await this.mapView.render(mapContainer);
    } else {
      console.error('Map container not found');
    }
  }

  cleanup() {
    if (this.mapView) {
      this.mapView.cleanup();
    }
  }
}
