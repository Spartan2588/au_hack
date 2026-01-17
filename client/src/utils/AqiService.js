/**
 * AQI Service - Real-time AQI data service
 * Uses multiple APIs to get accurate, location-specific AQI data
 * 
 * RECOMMENDED FREE TIER APIs:
 * 1. OpenWeatherMap (Free tier: 60 calls/min, includes AQI)
 * 2. WAQI (World Air Quality Index) - Free tier available
 * 3. IQAir (Free tier: 10,000 calls/month)
 * 4. AirVisual (Free tier: 10,000 calls/month)
 */

export class AqiService {
    constructor() {
        // Use backend proxy to avoid exposing API keys
        this.backendBaseUrl = '/api/v1';

        // Known Mumbai AQI stations with their coordinates and typical IDs
        this.mumbaiStations = [
            { name: 'Bandra, Mumbai', lat: 19.0596, lng: 72.8295, uid: 8529 },
            { name: 'Andheri, Mumbai', lat: 19.1136, lng: 72.8697, uid: 11634 },
            { name: 'Colaba, Mumbai', lat: 18.9067, lng: 72.8147, uid: 8528 },
            { name: 'Kurla, Mumbai', lat: 19.0726, lng: 72.8845, uid: 11250 },
            { name: 'Worli, Mumbai', lat: 19.0176, lng: 72.8227, uid: 9795 },
            { name: 'Borivali, Mumbai', lat: 19.2307, lng: 72.8567, uid: 12447 },
            { name: 'Chembur, Mumbai', lat: 19.0522, lng: 72.9005, uid: 10136 },
            { name: 'Navi Mumbai', lat: 19.0330, lng: 73.0297, uid: 10137 },
            { name: 'Thane', lat: 19.2183, lng: 72.9781, uid: 10138 },
            { name: 'Powai, Mumbai', lat: 19.1176, lng: 72.9060, uid: 14521 },
            { name: 'Malad, Mumbai', lat: 19.1874, lng: 72.8484, uid: 14522 },
            { name: 'Vashi, Navi Mumbai', lat: 19.0771, lng: 72.9987, uid: 10139 }
        ];

        this.debounceTimer = null;
        this.debounceDelay = 300;
        this.lastFetchedStation = null;
    }

    /**
     * Fetch AQI data by geographic coordinates
     * Now uses backend proxy endpoint for real-time data
     */
    async fetchAqiByCoords(lat, lng) {
        return new Promise((resolve, reject) => {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(async () => {
                try {
                    // Fetch from backend proxy endpoint
                    const response = await fetch(`${this.backendBaseUrl}/aqi?lat=${lat}&lng=${lng}`);
                    
                    if (!response.ok) {
                        throw new Error('Failed to fetch AQI data');
                    }

                    const aqiData = await response.json();
                    
                    // Get location name
                    const locationName = await this.reverseGeocode(lat, lng);
                    
                    // Enhance response with location info
                    const enhancedData = {
                        ...aqiData,
                        clickedLocation: locationName,
                        category: this.getAqiCategory(aqiData.aqi),
                        color: this.getAqiColor(aqiData.aqi)
                    };

                    console.log(`✅ Real-time AQI data from ${aqiData.source}:`, aqiData.aqi);
                    resolve(enhancedData);
                } catch (error) {
                    console.error('AQI fetch error:', error);
                    reject(error);
                }
            }, this.debounceDelay);
        });
    }

    /**
     * Find the nearest AQI station to the clicked coordinates
     * (Kept for reference, but not used with new backend proxy)
     */
    findNearestStation(lat, lng) {
        let nearest = this.mumbaiStations[0];
        let minDistance = Infinity;

        for (const station of this.mumbaiStations) {
            const distance = this.calculateDistance(lat, lng, station.lat, station.lng);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = { ...station, distance: distance };
            }
        }

        return nearest;
    }

    /**
     * Reverse geocode coordinates to get location name
     */
    async reverseGeocode(lat, lng) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
            const response = await fetch(url, {
                headers: {
                    'Accept-Language': 'en',
                    'User-Agent': 'MumbaiAQIMap/1.0'
                }
            });

            if (!response.ok) {
                return this.getApproximateLocation(lat, lng);
            }

            const data = await response.json();

            if (data.address) {
                const parts = [];
                if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
                else if (data.address.suburb) parts.push(data.address.suburb);

                if (data.address.city_district) parts.push(data.address.city_district);
                else if (data.address.city) parts.push(data.address.city);

                if (data.address.state) parts.push(data.address.state);

                if (parts.length > 0) {
                    return parts.slice(0, 3).join(', ');
                }
            }

            return data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : this.getApproximateLocation(lat, lng);
        } catch (error) {
            return this.getApproximateLocation(lat, lng);
        }
    }

    /**
     * Get approximate location name based on coordinates
     */
    getApproximateLocation(lat, lng) {
        const nearest = this.findNearestStation(lat, lng);
        return nearest.name;
    }

    /**
     * Get AQI category based on value (US EPA standard)
     */
    getAqiCategory(aqi) {
        if (aqi === null || isNaN(aqi)) return 'Unknown';
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
        if (aqi <= 200) return 'Unhealthy';
        if (aqi <= 300) return 'Very Unhealthy';
        return 'Hazardous';
    }

    /**
     * Get standard AQI color code (US EPA color scheme)
     */
    getAqiColor(aqi) {
        if (aqi === null || isNaN(aqi)) return '#94a3b8';
        if (aqi <= 50) return '#10b981';      // Green - Good
        if (aqi <= 100) return '#f59e0b';     // Yellow - Moderate
        if (aqi <= 150) return '#f97316';     // Orange - Unhealthy for Sensitive
        if (aqi <= 200) return '#ef4444';     // Red - Unhealthy
        if (aqi <= 300) return '#a855f7';     // Purple - Very Unhealthy
        return '#7f1d1d';                     // Maroon - Hazardous
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(deg) {
        return deg * (Math.PI / 180);
    }
}
