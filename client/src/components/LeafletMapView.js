import { AqiService } from '../utils/AqiService.js';
import '../styles/components/leaflet-map.css';

/**
 * Leaflet Map View Component
 * Interactive map for Mumbai with AQI display on click
 * Extends existing map functionality without modifying MapView.js core
 */
export class LeafletMapView {
    constructor() {
        this.map = null;
        this.aqiService = new AqiService();
        this.currentMarker = null;
        this.currentPopup = null;
        this.isLoading = false;

        // Mumbai center coordinates
        this.mumbaiCenter = [19.0760, 72.8777];
        this.defaultZoom = 11;
    }

    async render(container) {
        if (!container) {
            console.error('Container is null or undefined');
            return;
        }

        // Clean up existing map if re-rendering
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        // Create container structure with explicit height
        container.innerHTML = `
      <div class="leaflet-map-wrapper" style="width: 100%; height: 600px; min-height: 600px; position: relative;">
        <div id="leaflet-map" class="leaflet-map-container" style="width: 100%; height: 100%; min-height: 600px;"></div>
        <div id="aqi-loading" class="aqi-loading-overlay" style="display: none;">
          <div class="loading"></div>
          <span>Fetching AQI data...</span>
        </div>
        <div id="aqi-error" class="aqi-error-overlay" style="display: none;"></div>
      </div>
    `;

        // Wait for Leaflet to be available (with retry mechanism)
        await this.waitForLeaflet();

        // Check both window.L and global L
        const Leaflet = typeof window !== 'undefined' && window.L ? window.L : (typeof L !== 'undefined' ? L : null);

        if (!Leaflet || !Leaflet.map) {
            console.error('Leaflet library not loaded. Available:', {
                hasWindow: typeof window !== 'undefined',
                hasWindowL: typeof window !== 'undefined' && typeof window.L !== 'undefined',
                hasGlobalL: typeof L !== 'undefined'
            });
            container.innerHTML = `
        <div class="error-message" style="padding: 2rem; text-align: center; color: #ef4444;">
          <p>Map library failed to load. Please refresh the page.</p>
          <p style="font-size: 0.9rem; color: #94a3b8; margin-top: 0.5rem;">If the problem persists, check your internet connection.</p>
          <p style="font-size: 0.8rem; color: #64748b; margin-top: 0.5rem;">Make sure Leaflet CDN is accessible.</p>
        </div>
      `;
            return;
        }

        // Make L available globally for this component
        if (typeof window !== 'undefined' && !window.L) {
            window.L = Leaflet;
        }

        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 50));

        // Initialize Leaflet map
        this.initializeMap();
    }

    /**
     * Wait for Leaflet library to be available
     * Retries up to 20 times with 100ms intervals (2 seconds total)
     */
    async waitForLeaflet() {
        const maxRetries = 20;
        const retryDelay = 100;

        for (let i = 0; i < maxRetries; i++) {
            if (typeof window !== 'undefined' && typeof window.L !== 'undefined' && window.L.map) {
                console.log('Leaflet loaded successfully');
                return;
            }
            if (typeof L !== 'undefined' && L.map) {
                console.log('Leaflet loaded successfully (global L)');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        console.warn('Leaflet not found after waiting');
    }

    initializeMap() {
        const mapContainer = document.getElementById('leaflet-map');
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }

        // Ensure container has dimensions
        if (mapContainer.offsetHeight === 0) {
            mapContainer.style.height = '600px';
            mapContainer.style.minHeight = '600px';
        }

        try {
            // Get Leaflet reference
            const L = typeof window !== 'undefined' && window.L ? window.L : (typeof L !== 'undefined' ? L : null);
            
            if (!L) {
                throw new Error('Leaflet not available');
            }

            console.log('Initializing map with Leaflet version:', L.version || 'unknown');

            // Create map centered on Mumbai
            this.map = L.map('leaflet-map', {
                center: this.mumbaiCenter,
                zoom: this.defaultZoom,
                zoomControl: true,
                scrollWheelZoom: true,
                preferCanvas: false
            });

            console.log('Map created, adding tiles...');

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                tileSize: 256,
                zoomOffset: 0
            }).addTo(this.map);

            console.log('Tiles added, setting up events...');

            // Hide loading indicator
            const loadingIndicator = document.getElementById('map-loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }

            // Force map to invalidate size after a short delay to ensure tiles load
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                    console.log('Map size invalidated');
                }
            }, 200);

            // Add click event listener
            this.map.on('click', (e) => {
                console.log('Map clicked at:', e.latlng);
                this.handleMapClick(e);
            });

            // Add Mumbai boundary indicator
            this.addMumbaiBoundary();

            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Error initializing map:', error);
            console.error('Error stack:', error.stack);
            mapContainer.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #ef4444;">
                    <p>Error initializing map: ${error.message}</p>
                    <p style="font-size: 0.9rem; color: #94a3b8; margin-top: 0.5rem;">Please check the browser console for details.</p>
                    <p style="font-size: 0.8rem; color: #64748b; margin-top: 0.5rem;">Error: ${error.toString()}</p>
                </div>
            `;
        }
    }

    addMumbaiBoundary() {
        try {
            const L = typeof window !== 'undefined' && window.L ? window.L : (typeof L !== 'undefined' ? L : null);
            if (!L || !this.map) return;

            // Approximate Mumbai metropolitan area
            const mumbaiPolygon = L.circle(this.mumbaiCenter, {
                radius: 25000, // 25km radius
                color: 'rgba(167, 139, 250, 0.3)',
                fillColor: 'rgba(167, 139, 250, 0.1)',
                fillOpacity: 0.2,
                weight: 1,
                dashArray: '5, 5'
            });

            mumbaiPolygon.addTo(this.map);
        } catch (error) {
            console.warn('Could not add Mumbai boundary:', error);
        }
    }

    async handleMapClick(e) {
        const { lat, lng } = e.latlng;

        // Remove previous marker and popup
        this.clearMarkers();

        // Show loading state
        this.showLoading();

        try {
            // Fetch AQI data
            const aqiData = await this.aqiService.fetchAqiByCoords(lat, lng);

            // Hide loading
            this.hideLoading();

            // Add marker at clicked location
            this.addMarker(lat, lng, aqiData);

            // Show AQI popup
            this.showAqiPopup(lat, lng, aqiData);

        } catch (error) {
            this.hideLoading();
            this.showError('Unable to fetch AQI data. Please try again.');

            // Auto-hide error after 3 seconds
            setTimeout(() => this.hideError(), 3000);
        }
    }

    addMarker(lat, lng, aqiData) {
        // Create custom marker icon with AQI color
        const markerIcon = L.divIcon({
            className: 'aqi-marker',
            html: `
        <div class="aqi-marker-pin" style="background-color: ${aqiData.color};">
          <span class="aqi-marker-value">${aqiData.aqi || '?'}</span>
        </div>
        <div class="aqi-marker-pulse" style="background-color: ${aqiData.color};"></div>
      `,
            iconSize: [40, 50],
            iconAnchor: [20, 50],
            popupAnchor: [0, -50]
        });

        this.currentMarker = L.marker([lat, lng], { icon: markerIcon }).addTo(this.map);
    }

    showAqiPopup(lat, lng, aqiData) {
        const popupContent = this.createPopupContent(aqiData);

        this.currentPopup = L.popup({
            maxWidth: 320,
            className: 'aqi-popup-container'
        })
            .setLatLng([lat, lng])
            .setContent(popupContent)
            .openOn(this.map);
    }

    createPopupContent(aqiData) {
        const pollutantsHtml = this.createPollutantsHtml(aqiData.pollutants);

        // Show clicked location prominently
        const locationHtml = aqiData.clickedLocation
            ? `<div class="aqi-clicked-location">📍 ${aqiData.clickedLocation}</div>`
            : '';

        // Show station info with distance if it's from a nearby station
        const stationHtml = aqiData.isNearestStation && aqiData.distanceKm
            ? `<div class="aqi-station-note">Data from: ${aqiData.stationName} (${aqiData.distanceKm}km away)</div>`
            : `<div class="aqi-station-note">Station: ${aqiData.stationName}</div>`;

        return `
      <div class="aqi-popup glass">
        ${locationHtml}
        <div class="aqi-popup-header">
          <div class="aqi-value-large" style="background-color: ${aqiData.color};">
            ${aqiData.aqi !== null ? aqiData.aqi : 'N/A'}
          </div>
          <div class="aqi-info">
            <div class="aqi-category" style="color: ${aqiData.color};">${aqiData.category}</div>
            ${stationHtml}
          </div>
        </div>
        ${pollutantsHtml}
        <div class="aqi-time">Updated: ${new Date(aqiData.time).toLocaleTimeString()}</div>
      </div>
    `;
    }

    createPollutantsHtml(pollutants) {
        const pollutantLabels = {
            pm25: 'PM2.5',
            pm10: 'PM10',
            o3: 'O₃',
            no2: 'NO₂',
            so2: 'SO₂',
            co: 'CO'
        };

        const items = Object.entries(pollutants)
            .filter(([_, value]) => value !== null)
            .map(([key, value]) => `
        <div class="pollutant-item">
          <span class="pollutant-name">${pollutantLabels[key] || key}</span>
          <span class="pollutant-value">${value}</span>
        </div>
      `)
            .join('');

        if (!items) return '';

        return `
      <div class="aqi-pollutants">
        <div class="pollutants-title">Pollutant Levels</div>
        <div class="pollutants-grid">${items}</div>
      </div>
    `;
    }

    clearMarkers() {
        if (this.currentMarker) {
            this.map.removeLayer(this.currentMarker);
            this.currentMarker = null;
        }
        if (this.currentPopup) {
            this.map.closePopup(this.currentPopup);
            this.currentPopup = null;
        }
    }

    showLoading() {
        this.isLoading = true;
        const loadingEl = document.getElementById('aqi-loading');
        if (loadingEl) loadingEl.style.display = 'flex';
    }

    hideLoading() {
        this.isLoading = false;
        const loadingEl = document.getElementById('aqi-loading');
        if (loadingEl) loadingEl.style.display = 'none';
    }

    showError(message) {
        const errorEl = document.getElementById('aqi-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'flex';
        }
    }

    hideError() {
        const errorEl = document.getElementById('aqi-error');
        if (errorEl) errorEl.style.display = 'none';
    }

    cleanup() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}
