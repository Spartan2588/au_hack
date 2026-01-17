import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ============================================================================
// DATA LAYER - Simulated Data Ingestion & Storage
// ============================================================================

class DataStore {
  constructor() {
    this.cities = {
      1: { id: 1, name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
      2: { id: 2, name: 'Delhi', lat: 28.7041, lng: 77.1025 },
      3: { id: 3, name: 'Bangalore', lat: 12.9716, lng: 77.5946 }
    };

    // Initialize historical data
    this.historicalData = this.generateHistoricalData();
    this.currentTimestamp = Date.now();
  }

  generateHistoricalData() {
    const data = {};
    const now = Date.now();

    for (const cityId of [1, 2, 3]) {
      data[cityId] = {
        aqi: [],
        hospital_load: [],
        crop_supply: [],
        temperature: [],
        food_price_index: []
      };

      // Generate 24 hours of historical data
      for (let i = 24; i >= 0; i--) {
        const timestamp = new Date(now - i * 3600000).toISOString();
        
        // Realistic patterns per city
        const cityFactor = cityId === 1 ? 1.2 : cityId === 2 ? 1.1 : 0.9;
        
        data[cityId].aqi.push({
          timestamp,
          value: Math.max(50, Math.min(500, 150 + Math.sin(i / 5) * 100 + Math.random() * 50) * cityFactor)
        });

        data[cityId].hospital_load.push({
          timestamp,
          value: Math.max(10, Math.min(100, 50 + Math.sin(i / 6) * 20 + Math.random() * 15))
        });

        data[cityId].crop_supply.push({
          timestamp,
          value: Math.max(10, Math.min(100, 70 - Math.sin(i / 8) * 30 + Math.random() * 10))
        });

        data[cityId].temperature.push({
          timestamp,
          value: 20 + Math.sin(i / 12) * 10 + Math.random() * 5 + (cityId === 1 ? 5 : cityId === 2 ? 3 : 0)
        });

        data[cityId].food_price_index.push({
          timestamp,
          value: 100 + Math.sin(i / 10) * 15 + Math.random() * 10
        });
      }
    }

    return data;
  }

  getCurrentState(cityId) {
    const cityData = this.historicalData[cityId];
    const now = Date.now();

    return {
      city: this.cities[cityId].name,
      timestamp: new Date(now).toISOString(),
      aqi: Math.round(cityData.aqi[cityData.aqi.length - 1].value),
      hospital_load: Math.round(cityData.hospital_load[cityData.hospital_load.length - 1].value),
      temperature: parseFloat(cityData.temperature[cityData.temperature.length - 1].value.toFixed(1)),
      crop_supply: Math.round(cityData.crop_supply[cityData.crop_supply.length - 1].value),
      food_price_index: parseFloat(cityData.food_price_index[cityData.food_price_index.length - 1].value.toFixed(1)),
      traffic_density: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    };
  }

  getHistoricalData(cityId, hours = 24) {
    const cityData = this.historicalData[cityId];
    const startIndex = Math.max(0, cityData.aqi.length - hours - 1);

    return {
      aqi: cityData.aqi.slice(startIndex),
      hospital_load: cityData.hospital_load.slice(startIndex),
      crop_supply: cityData.crop_supply.slice(startIndex),
      temperature: cityData.temperature.slice(startIndex),
      food_price_index: cityData.food_price_index.slice(startIndex)
    };
  }
}

// ============================================================================
// ANALYTICS LAYER - Risk Scoring & Algorithms
// ============================================================================

class RiskAnalytics {
  /**
   * Calculate risk level based on normalized inputs
   * Combines multiple factors with weighted scoring
   */
  static calculateRiskLevel(aqi, temperature, hospitalLoad, cropSupply) {
    // Normalize inputs to 0-1 scale
    const aqiNorm = Math.min(aqi / 500, 1);
    const tempNorm = Math.max(0, Math.min((temperature - 20) / 30, 1)); // 20-50°C range
    const hospitalNorm = hospitalLoad / 100;
    const cropNorm = 1 - (cropSupply / 100); // Inverse: low supply = high risk

    // Weighted scoring (total weight = 1.0)
    const weights = {
      aqi: 0.35,
      temperature: 0.25,
      hospital: 0.25,
      crop: 0.15
    };

    const riskScore = (
      aqiNorm * weights.aqi +
      tempNorm * weights.temperature +
      hospitalNorm * weights.hospital +
      cropNorm * weights.crop
    );

    // Convert to level and probability
    let level, probability;
    if (riskScore < 0.33) {
      level = 'low';
      probability = Math.round(riskScore * 100);
    } else if (riskScore < 0.66) {
      level = 'medium';
      probability = Math.round(riskScore * 100);
    } else {
      level = 'high';
      probability = Math.round(riskScore * 100);
    }

    return { level, probability, score: riskScore };
  }

  /**
   * Calculate environmental risk based on AQI and temperature
   */
  static calculateEnvironmentalRisk(aqi, temperature) {
    const aqiNorm = Math.min(aqi / 500, 1);
    const tempNorm = Math.max(0, Math.min((temperature - 20) / 30, 1));
    
    const envScore = aqiNorm * 0.6 + tempNorm * 0.4;
    
    let level;
    if (envScore < 0.33) level = 'low';
    else if (envScore < 0.66) level = 'medium';
    else level = 'high';

    return {
      level,
      probability: Math.round(envScore * 100),
      score: envScore
    };
  }

  /**
   * Calculate health risk based on hospital load and temperature
   */
  static calculateHealthRisk(hospitalLoad, temperature) {
    const hospitalNorm = hospitalLoad / 100;
    const tempNorm = Math.max(0, Math.min((temperature - 20) / 30, 1));
    
    const healthScore = hospitalNorm * 0.7 + tempNorm * 0.3;
    
    let level;
    if (healthScore < 0.33) level = 'low';
    else if (healthScore < 0.66) level = 'medium';
    else level = 'high';

    return {
      level,
      probability: Math.round(healthScore * 100),
      score: healthScore
    };
  }

  /**
   * Calculate food security risk based on crop supply and price
   */
  static calculateFoodSecurityRisk(cropSupply, foodPriceIndex) {
    const cropNorm = 1 - (cropSupply / 100); // Low supply = high risk
    const priceNorm = Math.max(0, Math.min((foodPriceIndex - 100) / 50, 1)); // 100-150 range
    
    const foodScore = cropNorm * 0.6 + priceNorm * 0.4;
    
    let level;
    if (foodScore < 0.33) level = 'low';
    else if (foodScore < 0.66) level = 'medium';
    else level = 'high';

    return {
      level,
      probability: Math.round(foodScore * 100),
      score: foodScore
    };
  }

  /**
   * Simulate scenario impact with intervention
   */
  static simulateScenario(params) {
    const baseline = {
      environmental_risk: this.calculateEnvironmentalRisk(150, 25),
      health_risk: this.calculateHealthRisk(50, 25),
      food_security_risk: this.calculateFoodSecurityRisk(70, 100)
    };

    // Apply intervention (reduce by 20-30%)
    const interventionFactor = 0.75; // 25% reduction
    
    const intervention = {
      environmental_risk: this.calculateEnvironmentalRisk(
        params.aqi * interventionFactor,
        params.temperature * 0.95
      ),
      health_risk: this.calculateHealthRisk(
        params.hospital_load * interventionFactor,
        params.temperature * 0.95
      ),
      food_security_risk: this.calculateFoodSecurityRisk(
        params.crop_supply * 1.1, // Slight improvement
        100
      )
    };

    // Calculate economic impact
    const economicImpact = this.calculateEconomicImpact(
      baseline,
      intervention,
      params
    );

    return {
      baseline,
      intervention,
      economic_impact: economicImpact,
      changes: {
        environmental: {
          level_change: baseline.environmental_risk.level !== intervention.environmental_risk.level,
          probability_change: intervention.environmental_risk.probability - baseline.environmental_risk.probability
        },
        health: {
          level_change: baseline.health_risk.level !== intervention.health_risk.level,
          probability_change: intervention.health_risk.probability - baseline.health_risk.probability
        },
        food: {
          level_change: baseline.food_security_risk.level !== intervention.food_security_risk.level,
          probability_change: intervention.food_security_risk.probability - baseline.food_security_risk.probability
        }
      }
    };
  }

  /**
   * Calculate economic impact of intervention
   */
  static calculateEconomicImpact(baseline, intervention, params) {
    // Base intervention cost (scales with severity)
    const avgBaselineRisk = (
      baseline.environmental_risk.score +
      baseline.health_risk.score +
      baseline.food_security_risk.score
    ) / 3;

    const interventionCost = Math.round(100000 + avgBaselineRisk * 400000);

    // Savings calculation (based on risk reduction)
    const avgInterventionRisk = (
      intervention.environmental_risk.score +
      intervention.health_risk.score +
      intervention.food_security_risk.score
    ) / 3;

    const riskReduction = avgBaselineRisk - avgInterventionRisk;
    const totalSavings = Math.round(riskReduction * 2000000);

    // ROI calculation
    const roi = totalSavings > 0 ? (totalSavings / interventionCost).toFixed(2) : 0;

    return {
      intervention_cost: interventionCost,
      total_savings: totalSavings,
      roi: parseFloat(roi),
      payback_period_months: totalSavings > 0 ? Math.round((interventionCost / totalSavings) * 12) : 0
    };
  }
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

const dataStore = new DataStore();

/**
 * GET /api/v1/current-state?city_id={city}
 * Returns current metrics for a city
 */
app.get('/api/v1/current-state', (req, res) => {
  const cityId = parseInt(req.query.city_id) || 1;
  
  if (!dataStore.cities[cityId]) {
    return res.status(400).json({ error: 'Invalid city_id' });
  }

  const state = dataStore.getCurrentState(cityId);
  res.json(state);
});

/**
 * GET /api/v1/risk-assessment?city_id={city}
 * Returns risk assessment for a city
 */
app.get('/api/v1/risk-assessment', (req, res) => {
  const cityId = parseInt(req.query.city_id) || 1;
  
  if (!dataStore.cities[cityId]) {
    return res.status(400).json({ error: 'Invalid city_id' });
  }

  const state = dataStore.getCurrentState(cityId);

  const risks = {
    environmental_risk: RiskAnalytics.calculateEnvironmentalRisk(state.aqi, state.temperature),
    health_risk: RiskAnalytics.calculateHealthRisk(state.hospital_load, state.temperature),
    food_security_risk: RiskAnalytics.calculateFoodSecurityRisk(state.crop_supply, state.food_price_index)
  };

  res.json(risks);
});

/**
 * POST /api/v1/scenario
 * Simulates scenario with given parameters
 * Body: { aqi, hospital_load, crop_supply, temperature }
 */
app.post('/api/v1/scenario', (req, res) => {
  const { aqi, hospital_load, crop_supply, temperature } = req.body;

  // Validate inputs
  if (typeof aqi !== 'number' || typeof hospital_load !== 'number' ||
      typeof crop_supply !== 'number' || typeof temperature !== 'number') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const result = RiskAnalytics.simulateScenario({
    aqi: Math.max(0, Math.min(500, aqi)),
    hospital_load: Math.max(0, Math.min(100, hospital_load)),
    crop_supply: Math.max(0, Math.min(100, crop_supply)),
    temperature: Math.max(20, Math.min(50, temperature))
  });

  res.json(result);
});

/**
 * GET /api/v1/historical?city_id={city}&hours={hours}
 * Returns historical data for a city
 */
app.get('/api/v1/historical', (req, res) => {
  const cityId = parseInt(req.query.city_id) || 1;
  const hours = parseInt(req.query.hours) || 24;

  if (!dataStore.cities[cityId]) {
    return res.status(400).json({ error: 'Invalid city_id' });
  }

  const historical = dataStore.getHistoricalData(cityId, Math.min(hours, 24));
  res.json(historical);
});

/**
 * GET /api/v1/cities
 * Returns list of available cities
 */
app.get('/api/v1/cities', (req, res) => {
  res.json(Object.values(dataStore.cities));
});

/**
 * GET /api/v1/health
 * Health check endpoint
 */
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// ERROR HANDLING & SERVER START
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Urban Risk Intelligence Platform - Backend Server         ║
║  Running on http://localhost:${PORT}                          ║
╚════════════════════════════════════════════════════════════╝

API Endpoints:
  GET  /api/v1/current-state?city_id={1,2,3}
  GET  /api/v1/risk-assessment?city_id={1,2,3}
  POST /api/v1/scenario
  GET  /api/v1/historical?city_id={1,2,3}&hours=24
  GET  /api/v1/cities
  GET  /api/v1/health

Cities:
  1 = Mumbai
  2 = Delhi
  3 = Bangalore
  `);
});
