import { Auth, PortalType } from '../utils/auth.js';
import { LoginModal } from '../components/LoginModal.js';
import { ApiClient } from '../utils/api.js';
import gsap from 'gsap';
import '../styles/pages/user-portal.css';

/**
 * User/Citizen Portal Page
 * Personal safety dashboard with local AQI and health recommendations
 */
export class UserPortalPage {
    constructor() {
        this.api = new ApiClient();
        this.currentCity = 1;
        this.currentState = null;
        this.currentRisks = null;
        this.userLocation = null;
        this.updateInterval = null;
    }

    async render(container) {
        // Check authentication
        if (!Auth.isLoggedIn(PortalType.USER)) {
            this.showLoginRequired(container);
            return;
        }

        const session = Auth.getSession(PortalType.USER);

        container.innerHTML = `
      <div class="user-portal">
        <!-- Top Bar -->
        <div class="dashboard-topbar user-topbar">
          <div class="topbar-info">
            <span class="portal-badge user-badge">👤 Citizen Portal</span>
            <span class="session-info">Welcome, ${session.name}</span>
          </div>
          <button class="btn btn-logout user-logout" id="logout-btn">Logout</button>
        </div>

        <!-- Safety Status Hero -->
        <div class="safety-hero" id="safety-hero">
          <div class="safety-status-indicator" id="safety-indicator">
            <div class="status-icon" id="status-icon">⏳</div>
            <h1 id="status-text">Checking your area...</h1>
            <p id="status-subtitle">Analyzing environmental conditions</p>
          </div>
        </div>

        <!-- City Selector -->
        <div class="city-selector-bar">
          <span class="city-label">Your City:</span>
          <select id="city-select" class="city-select">
            <option value="1">Mumbai</option>
            <option value="2">Delhi</option>
            <option value="3">Bangalore</option>
          </select>
        </div>

        <!-- Quick Stats -->
        <div class="quick-stats" id="quick-stats">
          <div class="stat-tile glass" id="aqi-tile">
            <span class="stat-icon">💨</span>
            <div class="stat-info">
              <span class="stat-label">Air Quality</span>
              <span class="stat-value" id="aqi-value">--</span>
            </div>
          </div>
          <div class="stat-tile glass" id="temp-tile">
            <span class="stat-icon">🌡️</span>
            <div class="stat-info">
              <span class="stat-label">Temperature</span>
              <span class="stat-value" id="temp-value">--</span>
            </div>
          </div>
          <div class="stat-tile glass" id="health-tile">
            <span class="stat-icon">❤️</span>
            <div class="stat-info">
              <span class="stat-label">Health Risk</span>
              <span class="stat-value" id="health-value">--</span>
            </div>
          </div>
        </div>

        <!-- Health Tips Section -->
        <section class="tips-section glass">
          <h2>🏥 Health Tips for Today</h2>
          <div class="tips-list" id="health-tips">
            <!-- Tips will be rendered here -->
          </div>
        </section>

        <!-- Safety Actions -->
        <section class="actions-section">
          <h2>Quick Actions</h2>
          <div class="actions-grid">
            <a href="/map" class="action-card glass" data-link>
              <span class="action-icon">🗺️</span>
              <span class="action-text">View Map</span>
              <span class="action-desc">See real-time AQI in your area</span>
            </a>
            <div class="action-card glass" id="share-location-btn">
              <span class="action-icon">📍</span>
              <span class="action-text">Share Location</span>
              <span class="action-desc">Get hyperlocal updates</span>
            </div>
            <div class="action-card glass" id="emergency-btn">
              <span class="action-icon">🚨</span>
              <span class="action-text">Emergency Info</span>
              <span class="action-desc">Helpline numbers & resources</span>
            </div>
            <a href="/trends" class="action-card glass" data-link>
              <span class="action-icon">📊</span>
              <span class="action-text">View Trends</span>
              <span class="action-desc">Historical data analysis</span>
            </a>
          </div>
        </section>

        <!-- Emergency Modal (hidden) -->
        <div class="emergency-modal" id="emergency-modal" style="display: none;">
          <div class="emergency-content glass">
            <button class="modal-close" id="close-emergency">&times;</button>
            <h2>🚨 Emergency Contacts</h2>
            <div class="emergency-list">
              <div class="emergency-item">
                <span class="emergency-label">Ambulance</span>
                <a href="tel:102" class="emergency-number">102</a>
              </div>
              <div class="emergency-item">
                <span class="emergency-label">Disaster Management</span>
                <a href="tel:1070" class="emergency-number">1070</a>
              </div>
              <div class="emergency-item">
                <span class="emergency-label">Police</span>
                <a href="tel:100" class="emergency-number">100</a>
              </div>
              <div class="emergency-item">
                <span class="emergency-label">Fire</span>
                <a href="tel:101" class="emergency-number">101</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

        this.setupEventListeners(container);
        await this.loadData();
        this.startAutoRefresh();
    }

    showLoginRequired(container) {
        container.innerHTML = `
      <div class="login-required">
        <div class="login-required-content glass user-login-box">
          <span class="lock-icon">🔒</span>
          <h2>Citizen Portal Access</h2>
          <p>Login to access personalized safety information and local alerts.</p>
          <button class="btn btn-primary user-login-btn" id="login-trigger">Login as Citizen</button>
          <a href="/" class="back-link" data-link>← Back to Home</a>
        </div>
      </div>
    `;

        container.querySelector('#login-trigger').addEventListener('click', () => {
            const modal = new LoginModal(PortalType.USER, () => {
                this.render(container);
            });
            modal.render();
        });
    }

    setupEventListeners(container) {
        const logoutBtn = container.querySelector('#logout-btn');
        const citySelect = container.querySelector('#city-select');
        const shareLocationBtn = container.querySelector('#share-location-btn');
        const emergencyBtn = container.querySelector('#emergency-btn');
        const emergencyModal = container.querySelector('#emergency-modal');
        const closeEmergency = container.querySelector('#close-emergency');

        logoutBtn.addEventListener('click', () => {
            Auth.logout(PortalType.USER);
            window.location.href = '/';
        });

        citySelect.addEventListener('change', (e) => {
            this.currentCity = parseInt(e.target.value);
            this.loadData();
        });

        shareLocationBtn.addEventListener('click', () => {
            this.requestLocation();
        });

        emergencyBtn.addEventListener('click', () => {
            emergencyModal.style.display = 'flex';
            gsap.fromTo(emergencyModal.querySelector('.emergency-content'),
                { opacity: 0, scale: 0.9 },
                { opacity: 1, scale: 1, duration: 0.2 }
            );
        });

        closeEmergency.addEventListener('click', () => {
            emergencyModal.style.display = 'none';
        });

        emergencyModal.addEventListener('click', (e) => {
            if (e.target === emergencyModal) {
                emergencyModal.style.display = 'none';
            }
        });
    }

    async requestLocation() {
        if ('geolocation' in navigator) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                this.userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                alert(`Location received! Lat: ${this.userLocation.lat.toFixed(4)}, Lng: ${this.userLocation.lng.toFixed(4)}`);
            } catch (error) {
                alert('Unable to get location. Please enable location services.');
            }
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    }

    async loadData() {
        try {
            const [state, risks] = await Promise.all([
                this.api.getCurrentState(this.currentCity),
                this.api.getRiskAssessment(this.currentCity)
            ]);

            this.currentState = state;
            this.currentRisks = risks;

            this.updateSafetyStatus();
            this.updateQuickStats();
            this.updateHealthTips();
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    updateSafetyStatus() {
        const state = this.currentState;
        const risks = this.currentRisks;

        const hero = document.getElementById('safety-hero');
        const indicator = document.getElementById('safety-indicator');
        const icon = document.getElementById('status-icon');
        const text = document.getElementById('status-text');
        const subtitle = document.getElementById('status-subtitle');

        // Calculate overall safety level
        const avgRisk = (risks.environmental_risk.score + risks.health_risk.score) / 2;

        let status, statusIcon, statusText, statusSubtitle, bgClass;

        if (avgRisk < 0.3 && state.aqi < 100) {
            status = 'safe';
            statusIcon = '✅';
            statusText = 'You\'re Safe Today';
            statusSubtitle = 'Air quality is good. Enjoy outdoor activities!';
            bgClass = 'status-safe';
        } else if (avgRisk < 0.6 && state.aqi < 200) {
            status = 'moderate';
            statusIcon = '⚠️';
            statusText = 'Moderate Conditions';
            statusSubtitle = 'Sensitive groups should limit outdoor exposure.';
            bgClass = 'status-moderate';
        } else {
            status = 'unsafe';
            statusIcon = '🚨';
            statusText = 'Take Precautions';
            statusSubtitle = 'Stay indoors if possible. Wear masks outdoors.';
            bgClass = 'status-unsafe';
        }

        hero.className = `safety-hero ${bgClass}`;
        icon.textContent = statusIcon;
        text.textContent = statusText;
        subtitle.textContent = statusSubtitle;

        // Animate
        gsap.fromTo(indicator,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );
    }

    updateQuickStats() {
        const state = this.currentState;
        const risks = this.currentRisks;

        // AQI
        const aqiValue = document.getElementById('aqi-value');
        const aqiTile = document.getElementById('aqi-tile');
        aqiValue.textContent = state.aqi;
        aqiTile.className = `stat-tile glass ${this.getAqiClass(state.aqi)}`;

        // Temperature
        const tempValue = document.getElementById('temp-value');
        tempValue.textContent = `${parseFloat(state.temperature).toFixed(1)}°C`;

        // Health Risk
        const healthValue = document.getElementById('health-value');
        const healthTile = document.getElementById('health-tile');
        healthValue.textContent = risks.health_risk.level.toUpperCase();
        healthTile.className = `stat-tile glass risk-${risks.health_risk.level}`;
    }

    getAqiClass(aqi) {
        if (aqi <= 50) return 'aqi-good';
        if (aqi <= 100) return 'aqi-moderate';
        if (aqi <= 150) return 'aqi-sensitive';
        if (aqi <= 200) return 'aqi-unhealthy';
        return 'aqi-hazardous';
    }

    updateHealthTips() {
        const container = document.getElementById('health-tips');
        const state = this.currentState;
        const risks = this.currentRisks;

        const tips = [];

        // AQI-based tips
        if (state.aqi > 200) {
            tips.push({ icon: '😷', text: 'Wear N95 masks when going outdoors' });
            tips.push({ icon: '🏠', text: 'Keep windows and doors closed' });
            tips.push({ icon: '🌬️', text: 'Use air purifiers indoors if available' });
        } else if (state.aqi > 150) {
            tips.push({ icon: '😷', text: 'Consider wearing a mask outdoors' });
            tips.push({ icon: '🚴', text: 'Avoid strenuous outdoor exercise' });
        } else if (state.aqi > 100) {
            tips.push({ icon: '👶', text: 'Keep children and elderly indoors more' });
        } else {
            tips.push({ icon: '🌳', text: 'Great day for outdoor activities!' });
        }

        // Temperature-based tips
        if (state.temperature > 38) {
            tips.push({ icon: '💧', text: 'Stay hydrated - drink water frequently' });
            tips.push({ icon: '🧢', text: 'Wear light, loose clothing and hats' });
            tips.push({ icon: '🕐', text: 'Avoid going out between 11 AM - 4 PM' });
        } else if (state.temperature > 32) {
            tips.push({ icon: '💧', text: 'Drink plenty of water throughout the day' });
        }

        // Health risk tips
        if (risks.health_risk.level === 'high') {
            tips.push({ icon: '💊', text: 'Keep emergency medications handy' });
            tips.push({ icon: '📞', text: 'Save emergency numbers on speed dial' });
        }

        container.innerHTML = tips.map(tip => `
      <div class="tip-item">
        <span class="tip-icon">${tip.icon}</span>
        <span class="tip-text">${tip.text}</span>
      </div>
    `).join('');
    }

    startAutoRefresh() {
        this.updateInterval = setInterval(() => {
            this.loadData();
        }, 60000); // Refresh every 60 seconds
    }

    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}
