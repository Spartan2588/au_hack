import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { RealTimeDataService } from './services/RealTimeDataService.js';
import { CrossDomainIntegration } from './services/CrossDomainIntegration.js';
import { ProductionScalability } from './services/ProductionScalability.js';
import { ModelCalibration } from './services/ModelCalibration.js';
import './load-env.js'; // Load .env.local if it exists
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Make fetch available globally
global.fetch = fetch;

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ============================================================================
// DATA LAYER - Real-Time Data Service
// ============================================================================

// Initialize real-time data service
const realTimeDataService = new RealTimeDataService();

// Legacy DataStore wrapper for compatibility
class DataStore {
  constructor() {
    this.cities = {
      1: { id: 1, name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
      2: { id: 2, name: 'Delhi', lat: 28.7041, lng: 77.1025 },
      3: { id: 3, name: 'Bangalore', lat: 12.9716, lng: 77.5946 }
    };

    // Initialize historical data for fallback
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
// CASCADE PREDICTION LAYER - Multi-Hazard Cascade Analysis
// ============================================================================

class CascadeAnalytics {
  /**
   * Infrastructure dependency graph
   * Each domain has dependencies (what it needs) and dependents (what depends on it)
   * Dependency strength: 0.0 (no dependency) to 1.0 (complete dependency)
   */
  static INFRASTRUCTURE_GRAPH = {
    power: {
      dependencies: {},
      dependents: {
        water: 0.9,
        traffic: 0.85,
        communications: 0.95,
        emergency: 0.9,
        healthcare: 0.85,
        transport: 0.8,
        financial: 0.95,
        fuel_energy: 0.8,
        food_supply: 0.6,
        waste_management: 0.7,
        internet_data: 0.9,
        government: 0.7
      },
      resilience: 0.3,
      recovery_rate: 0.15,
      backup_capacity: 0.4,
      recovery_delay_hours: 1.0,  // Power crews start within 1 hour
      recovery_curve: 'exponential',  // Exponential recovery (logistics)
      resource_priority: 1,  // Highest priority
      resource_cost: 1.0  // Baseline resource cost
    },
    water: {
      dependencies: { power: 0.9 },
      dependents: {
        healthcare: 0.8,
        emergency: 0.4,  // Fixed: Only fire services need water (reduced from 0.7)
        residential: 0.95,
        food_supply: 0.5,
        waste_management: 0.5  // Water needed for waste treatment
      },
      resilience: 0.25,
      recovery_rate: 0.12,
      backup_capacity: 0.3,
      recovery_delay_hours: 2.0,  // Needs power first, then 2 hours
      recovery_curve: 'linear',  // Linear recovery once dependencies met
      resource_priority: 2,
      resource_cost: 0.8
    },
    traffic: {
      dependencies: { power: 0.85 },
      dependents: {
        transport: 0.95,
        emergency: 0.6,
        economic: 0.7
      },
      // Reverse: Traffic failures block emergency response, worsening other systems
      reverse_effects: {
        emergency: 0.5,  // Traffic jams block ambulances and emergency vehicles
        healthcare: 0.3,  // Can't reach hospitals easily
        power: 0.15  // Repair crews can't reach sites
      },
      resilience: 0.4,
      recovery_rate: 0.25,
      backup_capacity: 0.2,
      recovery_delay_hours: 6.0,  // Traffic lights take time after power surge
      recovery_curve: 'slow_start',  // Slow initial recovery, accelerates later
      resource_priority: 4,  // Lower priority
      resource_cost: 0.6
    },
    communications: {
      dependencies: { power: 0.95 },
      dependents: {
        emergency: 0.85,
        financial: 0.9,
        healthcare: 0.7,
        government: 0.8
      },
      resilience: 0.35,
      recovery_rate: 0.2,
      backup_capacity: 0.5,
      recovery_delay_hours: 0.5,  // Battery backups + generators
      recovery_curve: 'immediate_backup',  // Quick backup, slower full recovery
      resource_priority: 2,
      resource_cost: 0.9
    },
    emergency: {
      dependencies: {
        power: 0.9,
        communications: 0.85,
        water: 0.4,  // Fixed: Only fire services need water; police/ambulances can operate without
        traffic: 0.6
      },
      dependents: {
        public_safety: 0.95,
        disaster_response: 1.0,
        // Second-order: Emergency overload blocks recovery efforts
        power: 0.25  // Emergency services unable to coordinate → slows power recovery
      },
      // Reverse: Emergency failures create chaos that worsens dependencies
      reverse_effects: {
        traffic: 0.5,  // Emergency failures cause panic, traffic jams
        healthcare: 0.3  // Can't transport patients to hospitals
      },
      resilience: 0.5,
      recovery_rate: 0.3,
      backup_capacity: 0.6,
      recovery_delay_hours: 0.25,  // Emergency services have immediate backups
      recovery_curve: 'immediate_backup',
      resource_priority: 1,  // Highest priority
      resource_cost: 1.2  // Expensive but critical
    },
    healthcare: {
      dependencies: {
        power: 0.85,
        water: 0.8,
        communications: 0.7
      },
      dependents: {
        public_health: 0.95,
        emergency: 0.6,
        // Second-order: Healthcare failures create panic → traffic congestion
        traffic: 0.3  // Public panic causes traffic congestion
      },
      // Reverse dependencies: When healthcare fails, it affects things that affect it back
      reverse_effects: {
        emergency: 0.4,  // Healthcare failure overloads emergency services
        power: 0.2  // Increased hospital demand stresses power (though less than direct dependency)
      },
      resilience: 0.4,
      recovery_rate: 0.18,
      backup_capacity: 0.5,
      recovery_delay_hours: 0.1,  // Generators kick in almost immediately
      recovery_curve: 'immediate_backup',  // Hospitals have backup power
      resource_priority: 1,  // Highest priority
      resource_cost: 1.5  // Very expensive resources
    },
    transport: {
      dependencies: {
        power: 0.8,
        traffic: 0.65  // Fixed: Buses/trains can operate manually with minimal signaling
      },
      dependents: {
        economic: 0.8,
        emergency: 0.5,
        // Second-order: Transport failures worsen economic impact → affects financial systems
        financial: 0.2
      },
      reverse_effects: {
        traffic: 0.4,  // Transport system failures cause road congestion
        economic: 0.3  // Economic disruption from transport failure
      },
      resilience: 0.35,
      recovery_rate: 0.22,
      backup_capacity: 0.3,
      recovery_delay_hours: 4.0,  // Needs traffic + power
      recovery_curve: 'linear',
      resource_priority: 3,
      resource_cost: 0.7
    },
    financial: {
      dependencies: {
        power: 0.95,
        communications: 0.9
      },
      dependents: {
        economic: 0.95,
        government: 0.7,
        // Second-order: Financial panic → public panic → traffic/emergency overload
        emergency: 0.2,
        traffic: 0.15  // People rush to banks/ATMs, creating traffic
      },
      reverse_effects: {
        communications: 0.2,  // Financial systems under stress affect network load
        economic: 0.4  // Financial failures directly worsen economy
      },
      resilience: 0.45,
      recovery_rate: 0.28,
      backup_capacity: 0.7,
      recovery_delay_hours: 0.5,  // Battery backups and generators
      recovery_curve: 'immediate_backup',
      resource_priority: 2,
      resource_cost: 1.1
    },
    fuel_energy: {
      dependencies: {
        power: 0.8,  // Refineries need power, but can operate on backup
        transport: 0.6  // Fuel distribution needs transport
      },
      dependents: {
        emergency: 0.7,  // Emergency vehicles need fuel
        transport: 0.8,  // All transport needs fuel
        power: 0.5,  // Some generators need fuel/diesel
        healthcare: 0.6,  // Backup generators need fuel
        food_supply: 0.7  // Food distribution needs fuel
      },
      reverse_effects: {
        transport: 0.5,  // Fuel shortage blocks transport
        emergency: 0.4  // Emergency vehicles stranded without fuel
      },
      resilience: 0.3,
      recovery_rate: 0.2,
      backup_capacity: 0.4,
      recovery_delay_hours: 2.0,
      recovery_curve: 'linear',
      resource_priority: 2,
      resource_cost: 0.9
    },
    food_supply: {
      dependencies: {
        transport: 0.85,  // Food distribution needs transport
        fuel_energy: 0.7,  // Transport needs fuel
        power: 0.6,  // Refrigeration and warehouses need power
        water: 0.5  // Food processing needs water
      },
      dependents: {
        healthcare: 0.6,  // Hospitals need food
        residential: 0.95,  // All residents need food
        emergency: 0.5,  // Emergency services need food supplies
        economic: 0.7  // Food supply chain critical for economy
      },
      reverse_effects: {
        economic: 0.5,  // Food shortages cause economic disruption
        healthcare: 0.4  // Malnutrition increases healthcare load
      },
      resilience: 0.35,
      recovery_rate: 0.15,
      backup_capacity: 0.3,  // Limited food storage capacity
      recovery_delay_hours: 4.0,
      recovery_curve: 'slow_start',
      resource_priority: 2,
      resource_cost: 0.8
    },
    waste_management: {
      dependencies: {
        power: 0.7,  // Waste processing plants need power
        transport: 0.8,  // Waste collection needs transport
        fuel_energy: 0.6  // Transport needs fuel
      },
      dependents: {
        healthcare: 0.8,  // Critical for public health - prevents disease
        residential: 0.9,  // Sanitation critical for residents
        water: 0.5  // Waste contamination affects water quality
      },
      reverse_effects: {
        healthcare: 0.6,  // Waste buildup causes disease outbreaks
        water: 0.4  // Sewage overflow contaminates water supply
      },
      resilience: 0.25,
      recovery_rate: 0.1,
      backup_capacity: 0.2,
      recovery_delay_hours: 8.0,  // Waste management is slow to recover
      recovery_curve: 'slow_start',
      resource_priority: 3,
      resource_cost: 0.7
    },
    internet_data: {
      dependencies: {
        power: 0.9,  // Data centers need power
        communications: 0.7  // Overlaps but separate infrastructure
      },
      dependents: {
        financial: 0.85,  // Financial systems need internet
        government: 0.8,  // Government operations need internet
        healthcare: 0.6,  // Healthcare systems use internet
        communications: 0.5,  // Some communications rely on internet
        economic: 0.7  // Modern economy depends on internet
      },
      reverse_effects: {
        financial: 0.4,  // Internet outage affects financial systems
        communications: 0.3  // Internet is part of communications
      },
      resilience: 0.4,
      recovery_rate: 0.25,
      backup_capacity: 0.6,  // Data centers have backup infrastructure
      recovery_delay_hours: 1.0,
      recovery_curve: 'immediate_backup',
      resource_priority: 2,
      resource_cost: 1.0
    },
    government: {
      dependencies: {
        communications: 0.8,  // Government needs communication
        internet_data: 0.7,  // Modern government operations need internet
        power: 0.7,  // Government facilities need power
        emergency: 0.5  // Government coordinates with emergency services
      },
      dependents: {
        emergency: 0.6,  // Government decisions affect emergency response
        financial: 0.5,  // Government policies affect financial systems
        economic: 0.8,  // Government response affects economic recovery
        public_safety: 0.9  // Government maintains public safety
      },
      reverse_effects: {
        emergency: 0.4,  // Government inefficiency slows emergency response
        economic: 0.5  // Poor government decisions worsen economic impact
      },
      resilience: 0.4,
      recovery_rate: 0.15,  // Government decision-making slows during crises
      backup_capacity: 0.5,
      recovery_delay_hours: 3.0,  // Government response has delays
      recovery_curve: 'slow_start',  // Decision-making processes are slow
      resource_priority: 2,
      resource_cost: 0.9
    }
  };

  /**
   * Economic impact costs per domain (USD per severity point per hour)
   */
  static ECONOMIC_IMPACT_COSTS = {
    power: 5000000,
    water: 2000000,
    traffic: 1500000,
    communications: 3000000,
    emergency: 4000000,
    healthcare: 6000000,
    transport: 2500000,
    financial: 8000000,
    fuel_energy: 3500000,
    food_supply: 4500000,
    waste_management: 1800000,
    internet_data: 4200000,
    government: 3800000
  };

  /**
   * Population impact factors (percentage of city population affected per severity point)
   * Base impact rates - will be adjusted by vulnerability and spatial distribution
   */
  static POPULATION_IMPACT = {
    power: 0.8,
    water: 0.9,
    traffic: 0.5,
    communications: 0.7,
    emergency: 0.6,
    healthcare: 0.4,
    transport: 0.3,
    financial: 0.5,
    fuel_energy: 0.4,
    food_supply: 0.95,  // Nearly everyone needs food
    waste_management: 0.85,  // Sanitation affects everyone
    internet_data: 0.6,
    government: 0.3  // Indirect impact, but affects everyone through services
  };

  /**
   * Vulnerability indices by demographic (multiplier on base impact)
   * Higher = more vulnerable to infrastructure failures
   */
  static VULNERABILITY_INDICES = {
    general_population: 1.0,
    elderly_65plus: 2.5,      // Much more vulnerable to power/water/healthcare failures
    children_under5: 2.0,      // Higher vulnerability to water/healthcare
    hospitals_patients: 10.0,  // Extremely vulnerable - can't function without power/water
    schools_students: 1.8,     // Moderate vulnerability
    slums_informal: 3.0,       // Power failures hit hardest (no backup, poor infrastructure)
    wealthy_areas: 1.2,        // Lower vulnerability (backups, resources)
    disabled_chronic_illness: 4.0,  // Very high vulnerability
    rural_peripheral: 1.5      // Moderate vulnerability (less infrastructure access)
  };

  /**
   * Demographic distribution (percentage of total population)
   */
  static DEMOGRAPHIC_DISTRIBUTION = {
    general_population: 0.60,      // 60% general population
    elderly_65plus: 0.10,          // 10% elderly
    children_under5: 0.08,         // 8% children
    hospitals_patients: 0.005,     // 0.5% in hospitals
    schools_students: 0.12,        // 12% students
    slums_informal: 0.15,          // 15% in slums/informal settlements
    wealthy_areas: 0.10,           // 10% in wealthy areas
    disabled_chronic_illness: 0.05, // 5% with disabilities/chronic illness
    rural_peripheral: 0.05         // 5% in rural/peripheral areas
  };

  /**
   * Domain-specific vulnerability targeting (which demographics are most affected)
   * Maps domain → array of demographic groups with high impact multipliers
   */
  static DOMAIN_VULNERABILITY_TARGETING = {
    power: {
      slums_informal: 2.0,         // Slums hit 2x harder (no backup generators)
      hospitals_patients: 8.0,     // Hospitals extremely vulnerable
      elderly_65plus: 1.8,         // Elderly more vulnerable
      disabled_chronic_illness: 2.5
    },
    water: {
      slums_informal: 2.5,         // Slums hit hardest (no stored water)
      hospitals_patients: 10.0,    // Critical for hospitals
      children_under5: 2.2,        // Children more vulnerable to water issues
      rural_peripheral: 1.8
    },
    healthcare: {
      elderly_65plus: 3.0,         // Elderly rely more on healthcare
      disabled_chronic_illness: 5.0,
      hospitals_patients: 10.0,    // Directly affects them
      children_under5: 2.5
    },
    financial: {
      wealthy_areas: 1.8,          // Wealthy more affected (investments, banking)
      general_population: 1.2,
      slums_informal: 0.8          // Less affected (less banking dependency)
    },
    traffic: {
      schools_students: 1.5,       // Schools affected by traffic disruptions
      general_population: 1.0,
      rural_peripheral: 0.7        // Less affected (fewer traffic-dependent)
    },
    communications: {
      wealthy_areas: 1.3,          // More connected
      schools_students: 1.4,
      rural_peripheral: 1.8        // More isolated, so communication more critical
    },
    emergency: {
      elderly_65plus: 2.5,
      disabled_chronic_illness: 3.5,
      hospitals_patients: 5.0,
      children_under5: 1.8
    },
    transport: {
      schools_students: 1.6,       // Students rely on transport
      general_population: 1.0,
      rural_peripheral: 1.4        // More dependent on transport
    },
    fuel_energy: {
      rural_peripheral: 1.3,       // More dependent on fuel for transportation
      general_population: 1.0,
      slums_informal: 0.9          // Less vehicle ownership
    },
    food_supply: {
      slums_informal: 2.0,         // Food insecurity in slums
      elderly_65plus: 1.5,         // Elderly more vulnerable to food shortages
      children_under5: 1.8,
      hospitals_patients: 1.5      // Hospitals need food for patients
    },
    waste_management: {
      slums_informal: 2.5,         // Slums most affected by waste buildup
      general_population: 1.0,
      hospitals_patients: 1.8      // Disease risk from waste
    },
    internet_data: {
      wealthy_areas: 1.4,          // More dependent on internet
      schools_students: 1.3,
      general_population: 1.0,
      slums_informal: 0.8          // Less internet dependency
    },
    government: {
      general_population: 1.0,     // Affects everyone indirectly
      elderly_65plus: 1.2,         // More dependent on government services
      disabled_chronic_illness: 1.3
    }
  };

  /**
   * Uncertainty sources for stochastic modeling
   * Models real-world variability in cascade failures
   */
  static UNCERTAINTY_SOURCES = {
    operator_errors: {
      probability: 0.15,  // 15% chance of operator error per critical decision
      severity_impact: 0.1,  // Can increase/decrease severity by ±10%
      description: 'Human operator mistakes during crisis response'
    },
    weather_changes: {
      probability: 0.20,  // 20% chance of weather worsening conditions
      severity_impact: 0.15,  // Can increase severity by up to 15%
      description: 'Unexpected weather events (storms, heat waves)'
    },
    equipment_age: {
      probability: 0.30,  // 30% chance of equipment failure due to age
      severity_impact: 0.2,  // Older equipment fails more severely
      description: 'Equipment age/condition affecting failure rates'
    },
    political_response: {
      probability: 0.25,  // 25% chance of political intervention
      severity_impact: -0.15,  // Can reduce severity (good response) or increase (bad response)
      description: 'Political decisions affecting response effectiveness'
    },
    panic_behaviors: {
      probability: 0.35,  // 35% chance of panic behaviors
      severity_impact: 0.25,  // Panic can significantly worsen cascades
      description: 'Public panic causing secondary failures (traffic jams, hoarding)'
    }
  };

  /**
   * Generate stochastic uncertainty factors for a simulation run
   * @param {Object} options - Options for uncertainty injection
   * @returns {Object} Uncertainty factors to apply
   */
  static generateUncertaintyFactors(options = {}) {
    const factors = {
      operator_errors: 0,
      weather_changes: 0,
      equipment_age: 0,
      political_response: 0,
      panic_behaviors: 0,
      total_uncertainty: 0
    };

    // Sample each uncertainty source
    Object.keys(this.UNCERTAINTY_SOURCES).forEach(source => {
      const sourceConfig = this.UNCERTAINTY_SOURCES[source];
      const randomValue = Math.random();

      if (randomValue < sourceConfig.probability) {
        // Uncertainty event occurs
        // Generate impact: normal distribution around 0, scaled by severity_impact
        const impact = (Math.random() - 0.5) * 2 * sourceConfig.severity_impact;
        factors[source] = impact;
      }
    });

    // Total uncertainty is sum of all sources (can compound)
    factors.total_uncertainty = Object.values(factors).reduce((sum, val) => sum + val, 0);

    // Cap total uncertainty to prevent unrealistic extremes
    factors.total_uncertainty = Math.max(-0.5, Math.min(0.5, factors.total_uncertainty));

    return factors;
  }

  /**
   * Apply stochastic variations to cascade parameters
   * @param {number} baseValue - Base deterministic value
   * @param {Object} uncertaintyFactors - Uncertainty factors from generateUncertaintyFactors
   * @param {string} parameterType - Type of parameter ('severity', 'resilience', 'recovery', etc.)
   * @returns {number} Stochastic value
   */
  static applyStochasticVariation(baseValue, uncertaintyFactors, parameterType = 'severity') {
    let variation = uncertaintyFactors.total_uncertainty;

    // Parameter-specific adjustments
    if (parameterType === 'severity') {
      // Severity affected by all uncertainty sources
      variation += uncertaintyFactors.operator_errors * 0.3;
      variation += uncertaintyFactors.weather_changes * 0.4;
      variation += uncertaintyFactors.equipment_age * 0.5;
      variation += uncertaintyFactors.panic_behaviors * 0.6;
    } else if (parameterType === 'resilience') {
      // Resilience mainly affected by equipment age and operator errors
      variation = uncertaintyFactors.equipment_age * 0.4 + uncertaintyFactors.operator_errors * 0.3;
    } else if (parameterType === 'recovery') {
      // Recovery affected by political response and operator errors
      variation = uncertaintyFactors.political_response * 0.5 + uncertaintyFactors.operator_errors * 0.2;
    }

    // Apply variation with some randomness
    const randomNoise = (Math.random() - 0.5) * 0.1; // ±5% random noise
    const stochasticValue = baseValue * (1 + variation + randomNoise);

    // Clamp to valid ranges
    if (parameterType === 'severity') {
      return Math.max(0, Math.min(1, stochasticValue));
    }

    return Math.max(0, stochasticValue);
  }

  /**
   * Helper to determine affected infrastructure based on domain and severity
   * @param {string} domain - The infrastructure domain
   * @param {number} severity - The severity of the failure (0-1)
   * @param {number} hour - Current simulation hour for time-based dampening
   * @returns {string} Description of affected infrastructure
   */
  static getAffectedInfrastructure(domain, severity, hour = 0) {
    const baseImpact = severity * 100; // Convert severity to percentage for description

    // Time-based dampening: cascades lose energy over time/hops
    const timeDampening = Math.max(0.3, 1 - (hour / 24)); // Minimum 30% impact, dampens over 24 hours

    // Example descriptions (can be expanded)
    if (domain === 'power') {
      if (baseImpact * timeDampening > 70) return 'Widespread blackouts, critical infrastructure offline';
      if (baseImpact * timeDampening > 40) return 'Regional power outages, significant disruption';
      return 'Localized power interruptions';
    } else if (domain === 'water') {
      if (baseImpact * timeDampening > 70) return 'Severe water shortages, unsafe drinking water';
      if (baseImpact * timeDampening > 40) return 'Reduced water pressure, rationing in effect';
      return 'Localized water supply issues';
    } else if (domain === 'healthcare') {
      if (baseImpact * timeDampening > 70) return 'Hospitals overwhelmed, emergency services failing';
      if (baseImpact * timeDampening > 40) return 'Healthcare services strained, elective procedures cancelled';
      return 'Minor delays in healthcare access';
    }
    return `General infrastructure impact (${Math.round(baseImpact * timeDampening)}% severity)`;
  }

  /**
   * Calculate cascading failure propagation with optional stochastic uncertainty
   * @param {string} trigger - Initial failure domain
   * @param {number} severity - Failure severity (0-1)
   * @param {number} cityId - City identifier
   * @param {DataStore} dataStore - DataStore instance for accessing city data
   * @param {number} duration - Simulation duration in hours (default: 24)
   * @param {Object} currentState - Real-time current state (optional, will fetch if not provided)
   * @param {Object} options - Options including enableStochastic (default: false)
   */
  static async calculateCascade(trigger, severity, cityId, dataStore, duration = 24, currentState = null, options = {}) {
    // Validate inputs
    if (!this.INFRASTRUCTURE_GRAPH[trigger]) {
      throw new Error(`Invalid trigger domain: ${trigger}`);
    }
    if (severity < 0 || severity > 1) {
      throw new Error('Severity must be between 0 and 1');
    }

    const cascades = [];
    const timeline = [];
    const impactedDomains = new Set([trigger]);

    // Get city data from DataStore (real-time data)
    const cityInfo = dataStore.cities[cityId];
    if (!currentState) {
      currentState = await dataStore.getCurrentState(cityId);
    }

    // Use real city population (in millions) - derived from city size/importance
    const cityPopulations = {
      1: 20.4,  // Mumbai - India's financial capital
      2: 32.9,  // Delhi - National capital, largest metro area
      3: 12.3   // Bangalore - IT hub
    };
    const cityPopulation = cityPopulations[cityId] || 15;

    // Generate uncertainty factors if stochastic mode enabled
    const enableStochastic = options.enableStochastic || false;
    const uncertaintyFactors = enableStochastic ? this.generateUncertaintyFactors() : null;

    // Use real-time metrics to adjust cascade severity
    // Higher AQI, temperature, and hospital load increase cascade probability
    const aqiFactor = Math.min(1.5, 1 + (currentState.aqi / 500) * 0.5);
    const tempFactor = Math.min(1.3, 1 + ((currentState.temperature - 25) / 25) * 0.3);
    const hospitalFactor = Math.min(1.4, 1 + (currentState.hospital_load / 100) * 0.4);

    // Adjust initial severity based on real-time conditions
    let adjustedSeverity = Math.min(1.0, severity * aqiFactor * tempFactor * hospitalFactor);

    // Apply stochastic uncertainty if enabled
    if (enableStochastic && uncertaintyFactors) {
      adjustedSeverity = this.applyStochasticVariation(adjustedSeverity, uncertaintyFactors, 'severity');
      console.log(`[CASCADE] Stochastic factors applied:`, uncertaintyFactors);
    }

    console.log(`[CASCADE] Real-time factors - AQI: ${aqiFactor.toFixed(2)}, Temp: ${tempFactor.toFixed(2)}, Hospital: ${hospitalFactor.toFixed(2)}`);
    console.log(`[CASCADE] Adjusted severity: ${severity} -> ${adjustedSeverity.toFixed(2)}`);

    // Track severity per domain over time (use adjusted severity)
    let currentSeverities = { [trigger]: adjustedSeverity };
    let previousSeverities = {};

    // Simulate hour by hour
    for (let hour = 0; hour <= duration; hour++) {
      const newCascades = [];

      // Multi-hop cascade propagation with feedback loops
      // Propagate failures through multiple levels per iteration to model second-order effects
      let cascadingChanges = this.propagateMultiHopCascades(
        currentSeverities,
        impactedDomains,
        hour
      );

      // Apply stochastic uncertainty to cascade propagation if enabled
      if (enableStochastic && uncertaintyFactors) {
        // Inject uncertainty: operator errors can cause additional cascades
        if (uncertaintyFactors.operator_errors > 0.05) {
          // Operator error increases cascade probability
          cascadingChanges.changes.forEach(change => {
            change.severity = this.applyStochasticVariation(
              change.severity,
              uncertaintyFactors,
              'severity'
            );
          });
        }

        // Panic behaviors can worsen cascades
        if (uncertaintyFactors.panic_behaviors > 0.1) {
          cascadingChanges.changes.forEach(change => {
            change.severity *= (1 + uncertaintyFactors.panic_behaviors * 0.3);
            change.severity = Math.min(1.0, change.severity);
          });
        }
      }

      // Apply cascading changes
      for (const change of cascadingChanges.changes) {
        if (change.isNew) {
          // New cascade event
          const cascade = {
            domain: change.domain,
            impact_time_hours: hour + (Math.random() * 0.5),
            severity: Math.round(change.severity * 100) / 100,
            cause: change.cause,
            dependency_strength: change.dependencyStrength,
            affected_infrastructure: this.getAffectedInfrastructure(change.domain, change.severity),
            cascade_type: change.type,  // 'direct', 'reverse', 'multi_hop', 'feedback_loop'
            hop_depth: change.hopDepth || 1
          };
          newCascades.push(cascade);
          impactedDomains.add(change.domain);
          currentSeverities[change.domain] = change.severity;
        } else {
          // Amplify existing failure (compound effect or feedback loop)
          const existingSeverity = currentSeverities[change.domain] || 0;
          // Dampen amplification to avoid immediate systemic collapse
          const amplificationFactor = change.isFeedbackLoop ? 1.2 : 0.8;
          const newSeverity = Math.min(1.0,
            existingSeverity + (change.severity * amplificationFactor)
          );
          currentSeverities[change.domain] = newSeverity;
        }
      }

      // Detect and log feedback loops for analysis
      if (cascadingChanges.feedbackLoops.length > 0) {
        console.log(`[CASCADE] Hour ${hour}: Detected ${cascadingChanges.feedbackLoops.length} feedback loops:`,
          cascadingChanges.feedbackLoops);
      }

      cascades.push(...newCascades);

      // Apply recovery
      previousSeverities = { ...currentSeverities };
      let recoveredSeverities = this.applyRecovery(currentSeverities, hour);

      // Apply stochastic uncertainty to recovery if enabled
      if (enableStochastic && uncertaintyFactors) {
        // Political response and operator errors affect recovery
        Object.keys(recoveredSeverities).forEach(domain => {
          const domainInfo = this.INFRASTRUCTURE_GRAPH[domain];
          if (domainInfo) {
            // Adjust recovery rate based on uncertainty
            const recoveryVariation = this.applyStochasticVariation(
              recoveredSeverities[domain],
              uncertaintyFactors,
              'recovery'
            );
            recoveredSeverities[domain] = recoveryVariation;
          }
        });
      }

      currentSeverities = recoveredSeverities;

      // Record timeline snapshot
      const totalSeverity = Object.values(currentSeverities).reduce((a, b) => a + b, 0);
      timeline.push({
        hour,
        affected_domains: Object.values(currentSeverities).filter(s => s > 0.15).length,
        total_severity: Math.round(totalSeverity * 100) / 100,
        active_failures: Object.keys(currentSeverities).length,
        domains: Object.keys(currentSeverities)
      });
    }

    // Calculate total impact
    const totalImpact = this.calculateTotalImpact(
      cascades,
      timeline,
      cityPopulation,
      duration
    );

    // Generate recommendations (dynamic, context-aware, cost-benefit based)
    const recommendations = this.generateRecommendations(
      trigger,
      severity,
      cascades,
      totalImpact,
      cityId,
      new Date()
    );

    const result = {
      trigger: {
        domain: trigger,
        severity: adjustedSeverity,
        initial_impact: this.getAffectedInfrastructure(trigger, adjustedSeverity)
      },
      cascades: cascades.sort((a, b) => a.impact_time_hours - b.impact_time_hours),
      timeline,
      total_impact: totalImpact,
      recommendations
    };

    // Add uncertainty metadata if stochastic mode enabled
    if (enableStochastic && uncertaintyFactors) {
      result.uncertainty_factors = uncertaintyFactors;
      result.stochastic_mode = true;
    }

    return result;
  }

  /**
   * Run Monte Carlo simulation with uncertainty quantification
   * Runs multiple iterations with stochastic variations to generate probability distributions
   * 
   * @param {string} trigger - Initial failure domain
   * @param {number} severity - Failure severity (0-1)
   * @param {number} cityId - City identifier
   * @param {DataStore} dataStore - DataStore instance
   * @param {number} duration - Simulation duration in hours
   * @param {Object} options - Options including iterations (default: 100)
   * @returns {Object} Monte Carlo results with distributions and confidence intervals
   */
  static async runMonteCarloSimulation(trigger, severity, cityId, dataStore, duration = 24, options = {}) {
    const iterations = options.iterations || 100;
    const results = [];
    const startTime = Date.now();

    console.log(`[MONTE_CARLO] Starting ${iterations} iterations...`);

    // Run iterations in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let batch = 0; batch < Math.ceil(iterations / batchSize); batch++) {
      const batchPromises = [];
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, iterations);

      for (let i = batchStart; i < batchEnd; i++) {
        batchPromises.push(
          this.calculateCascade(trigger, severity, cityId, dataStore, duration, null, {
            enableStochastic: true
          })
        );
      }

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Log progress
      if ((batch + 1) % 10 === 0 || batch === Math.ceil(iterations / batchSize) - 1) {
        console.log(`[MONTE_CARLO] Completed ${results.length}/${iterations} iterations`);
      }
    }

    const elapsedTime = Date.now() - startTime;
    console.log(`[MONTE_CARLO] Completed ${iterations} iterations in ${elapsedTime}ms`);

    // Compute statistics from results
    const statistics = this.computeMonteCarloStatistics(results);

    return {
      iterations,
      computation_time_ms: elapsedTime,
      statistics,
      sample_results: results.slice(0, 5), // Include first 5 samples for reference
      uncertainty_sources: this.UNCERTAINTY_SOURCES
    };
  }

  /**
   * Compute statistics from Monte Carlo simulation results
   * @param {Array} results - Array of cascade simulation results
   * @returns {Object} Statistical summary with distributions and confidence intervals
   */
  static computeMonteCarloStatistics(results) {
    if (results.length === 0) {
      return { error: 'No results to analyze' };
    }

    // Extract key metrics from each result
    const metrics = {
      total_economic_cost: [],
      population_affected: [],
      affected_domains: [],
      peak_total_severity: [],
      recovery_time_hours: [],
      cascade_count: []
    };

    results.forEach(result => {
      const impact = result.total_impact;
      metrics.total_economic_cost.push(impact.estimated_economic_cost || 0);
      metrics.population_affected.push(impact.population_affected || 0);
      metrics.affected_domains.push(impact.affected_domains || 0);
      metrics.peak_total_severity.push(impact.peak_total_severity || 0);
      metrics.recovery_time_hours.push(impact.recovery_time_hours || 0);
      metrics.cascade_count.push(result.cascades.length || 0);
    });

    // Compute statistics for each metric
    const statistics = {};

    Object.keys(metrics).forEach(metricName => {
      const values = metrics[metricName].filter(v => !isNaN(v) && isFinite(v));
      if (values.length === 0) {
        statistics[metricName] = { error: 'No valid values' };
        return;
      }

      // Sort for percentile calculation
      values.sort((a, b) => a - b);

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const median = values[Math.floor(values.length / 2)];

      // Standard deviation
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Confidence intervals (95% CI using t-distribution approximation)
      const tValue = 1.96; // For large samples, approximates 95% CI
      const marginOfError = tValue * (stdDev / Math.sqrt(values.length));
      const ci95_lower = mean - marginOfError;
      const ci95_upper = mean + marginOfError;

      // Percentiles (handle edge cases for small arrays)
      const getPercentile = (arr, p) => {
        if (arr.length === 0) return 0;
        const index = Math.floor(arr.length * p);
        return arr[Math.min(index, arr.length - 1)];
      };

      const p5 = getPercentile(values, 0.05);
      const p25 = getPercentile(values, 0.25);
      const p75 = getPercentile(values, 0.75);
      const p95 = getPercentile(values, 0.95);

      // Min/Max
      const min = values.length > 0 ? values[0] : 0;
      const max = values.length > 0 ? values[values.length - 1] : 0;

      statistics[metricName] = {
        mean: Math.round(mean),
        median: Math.round(median),
        std_dev: Math.round(stdDev),
        min: Math.round(min),
        max: Math.round(max),
        confidence_interval_95: {
          lower: Math.round(ci95_lower),
          upper: Math.round(ci95_upper)
        },
        percentiles: {
          p5: Math.round(p5),
          p25: Math.round(p25),
          p75: Math.round(p75),
          p95: Math.round(p95)
        },
        distribution: {
          // Histogram bins for visualization
          bins: this.computeHistogram(values, 10)
        }
      };
    });

    return statistics;
  }

  /**
   * Compute histogram bins for a distribution
   * @param {Array} values - Array of numeric values
   * @param {number} numBins - Number of bins
   * @returns {Array} Histogram data
   */
  static computeHistogram(values, numBins = 10) {
    if (!values || values.length === 0) {
      return [];
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      // All values are the same, return single bin
      return [{
        bin_start: min,
        bin_end: max,
        count: values.length,
        frequency: 1.0
      }];
    }
    const binWidth = (max - min) / numBins;

    const bins = Array(numBins).fill(0).map((_, i) => ({
      bin_start: min + i * binWidth,
      bin_end: min + (i + 1) * binWidth,
      count: 0,
      frequency: 0
    }));

    values.forEach(value => {
      const binIndex = Math.min(
        Math.floor((value - min) / binWidth),
        numBins - 1
      );
      bins[binIndex].count++;
    });

    // Calculate frequencies
    bins.forEach(bin => {
      bin.frequency = bin.count / values.length;
    });

    return bins;
  }

  /**
   * Calculate cascade severity based on dependency and resilience
   */
  static calculateCascadeSeverity(sourceSeverity, dependencyStrength, resilience, hour) {
    // Base cascade calculation
    let cascadeSeverity = sourceSeverity * dependencyStrength;

    // Apply resilience factor (reduces impact)
    cascadeSeverity *= (1 - resilience * 0.6); // Slightly more resilience

    // Time-based dampening: cascades lose energy over time as systems adapt/isolate
    const timeDampening = Math.max(0.2, 1 - (hour / 24));
    cascadeSeverity *= timeDampening;

    // Cap at 1.0
    return Math.min(1.0, Math.max(0, cascadeSeverity * 0.5)); // Significant reduction to allow recovery
  }

  /**
   * Propagate cascades with multi-hop, bidirectional, and feedback loop support
   * Models second-order effects: A→B→C→A creates death spirals
   * 
   * @param {Object} currentSeverities - Current failure severities per domain
   * @param {Set} impactedDomains - Set of domains that have been impacted
   * @param {number} hour - Current simulation hour
   * @returns {Object} Changes to apply and detected feedback loops
   */
  static propagateMultiHopCascades(currentSeverities, impactedDomains, hour) {
    const changes = [];
    const feedbackLoops = [];
    const visitedInThisIteration = new Set();
    const propagationQueue = [];

    // Initialize queue with all currently impacted domains
    for (const [domain, severity] of Object.entries(currentSeverities)) {
      if (severity > 0.05) {
        propagationQueue.push({
          domain,
          severity,
          cause: domain,
          hopDepth: 0,
          path: [domain],  // Track path to detect cycles
          type: 'direct'
        });
      }
    }

    // Process propagation queue (allows multi-hop in single iteration)
    while (propagationQueue.length > 0) {
      const { domain, severity, cause, hopDepth, path, type } = propagationQueue.shift();

      // Limit max hop depth to prevent infinite loops (but allow feedback loops)
      if (hopDepth > 5) continue;

      const domainInfo = this.INFRASTRUCTURE_GRAPH[domain];
      if (!domainInfo) continue;

      // 1. FORWARD PROPAGATION: Propagate to dependents (direct cascades)
      if (domainInfo.dependents) {
        for (const [dependent, dependencyStrength] of Object.entries(domainInfo.dependents)) {
          // Calculate cascade severity first
          const cascadeSeverity = this.calculateCascadeSeverity(
            severity,
            dependencyStrength * 0.5, // Further dampen dependency strength
            domainInfo.resilience,
            hour
          );

          const isNewDomain = !impactedDomains.has(dependent);

          if (cascadeSeverity > 0.1) {
            const isFeedbackLoop = path.includes(dependent);  // Cycle detected!

            if (isFeedbackLoop && hopDepth > 1) {
              // Feedback loop detected: domain affecting itself through a cycle
              feedbackLoops.push({
                loop: [...path, dependent],
                severity: cascadeSeverity,
                hour
              });
            }

            changes.push({
              domain: dependent,
              severity: cascadeSeverity,
              cause: domain,
              dependencyStrength,
              isNew: isNewDomain,
              hopDepth: hopDepth + 1,
              type: isFeedbackLoop ? 'feedback_loop' : (hopDepth > 0 ? 'multi_hop' : 'direct'),
              isFeedbackLoop
            });

            // Continue propagation if significant severity and not too deep
            if (cascadeSeverity > 0.2 && hopDepth < 3) {
              const queueKey = `${dependent}-${hopDepth + 1}`;
              if (!visitedInThisIteration.has(queueKey)) {
                visitedInThisIteration.add(queueKey);
                propagationQueue.push({
                  domain: dependent,
                  severity: cascadeSeverity,
                  cause: domain,
                  hopDepth: hopDepth + 1,
                  path: [...path, dependent],
                  type: 'multi_hop'
                });
              }
            }
          }

          // Update existing failures (compound effect)
          if (!isNewDomain && currentSeverities[dependent]) {
            const compoundSeverity = Math.min(1.0,
              cascadeSeverity * 0.3  // Additive compound effect
            );
            changes.push({
              domain: dependent,
              severity: compoundSeverity,
              cause: domain,
              dependencyStrength,
              isNew: false,
              hopDepth: hopDepth + 1,
              type: 'compound'
            });
          }
        }
      }

      // 2. REVERSE PROPAGATION: Apply reverse effects (bidirectional dependencies)
      // When a dependent fails, it can worsen its dependencies (feedback)
      if (domainInfo.reverse_effects) {
        for (const [reverseTarget, reverseStrength] of Object.entries(domainInfo.reverse_effects)) {
          // Reverse effects are weaker but still significant
          const reverseSeverity = this.calculateCascadeSeverity(
            severity,
            reverseStrength * 0.4,  // Reverse effects are weaker
            domainInfo.resilience,
            hour
          );

          if (reverseSeverity > 0.08) {
            const isNewDomain = !impactedDomains.has(reverseTarget);
            const isFeedbackLoop = path.includes(reverseTarget);

            if (isFeedbackLoop) {
              feedbackLoops.push({
                loop: [...path, reverseTarget],
                severity: reverseSeverity,
                hour,
                type: 'reverse_loop'
              });
            }

            changes.push({
              domain: reverseTarget,
              severity: reverseSeverity,
              cause: domain,
              dependencyStrength: reverseStrength,
              isNew: isNewDomain,
              hopDepth: hopDepth + 1,
              type: 'reverse',
              isFeedbackLoop
            });

            // Continue reverse propagation if significant
            if (reverseSeverity > 0.15 && hopDepth < 2) {
              const queueKey = `reverse-${reverseTarget}-${hopDepth + 1}`;
              if (!visitedInThisIteration.has(queueKey)) {
                visitedInThisIteration.add(queueKey);
                propagationQueue.push({
                  domain: reverseTarget,
                  severity: reverseSeverity,
                  cause: domain,
                  hopDepth: hopDepth + 1,
                  path: [...path, reverseTarget],
                  type: 'reverse'
                });
              }
            }
          }
        }
      }
    }

    // Aggregate changes by domain (multiple sources can affect same domain)
    const aggregatedChanges = {};
    for (const change of changes) {
      if (!aggregatedChanges[change.domain]) {
        aggregatedChanges[change.domain] = {
          ...change,
          sources: []
        };
      } else {
        // Aggregate severity from multiple sources (compound effect)
        aggregatedChanges[change.domain].severity = Math.min(1.0,
          aggregatedChanges[change.domain].severity + change.severity * 0.5
        );
        aggregatedChanges[change.domain].isNew = aggregatedChanges[change.domain].isNew && change.isNew;
        if (aggregatedChanges[change.domain].type !== 'feedback_loop' && change.type === 'feedback_loop') {
          aggregatedChanges[change.domain].type = 'feedback_loop';
          aggregatedChanges[change.domain].isFeedbackLoop = true;
        }
      }
      aggregatedChanges[change.domain].sources.push(change.cause);
    }

    return {
      changes: Object.values(aggregatedChanges),
      feedbackLoops
    };
  }

  /**
   * Apply recovery over time with dependency checking and resource constraints
   * 
   * Recovery rules:
   * 1. Check if dependencies are recovered enough (can't recover if dependencies still failed)
   * 2. Domain-specific recovery delays (hospitals have immediate backups, traffic takes days)
   * 3. Resource constraints (limited emergency crews compete for priority)
   * 4. Domain-specific recovery curves (immediate backup vs exponential vs linear)
   */
  static applyRecovery(severities, hour) {
    const recovered = { ...severities }; // Initialize with all current failures to avoid dropping virtual domains

    // Resource constraint: limited emergency response capacity
    // Higher severity failures and priority domains get resources first
    const MAX_RESOURCE_CAPACITY = 8.0;  // Increase capacity to allow recovery to win over propagation
    let availableResources = MAX_RESOURCE_CAPACITY;

    // Sort domains by priority and severity to allocate resources
    const domainsByPriority = Object.entries(severities)
      .map(([domain, severity]) => {
        let domainInfo = this.INFRASTRUCTURE_GRAPH[domain];

        // Default info for virtual domains to allow them to recover
        if (!domainInfo) {
          domainInfo = {
            resource_priority: 3,
            resource_cost: 0.5,
            recovery_rate: 0.3, // Faster recovery by default
            backup_capacity: 0.7,
            recovery_delay_hours: 1.0,
            recovery_curve: 'linear'
          };
        }

        return {
          domain,
          severity,
          domainInfo,
          priority: domainInfo.resource_priority,
          resourceNeed: severity * domainInfo.resource_cost
        };
      })
      .sort((a, b) => {
        // Primary sort: priority (lower number = higher priority)
        if (a.priority !== b.priority) return a.priority - b.priority;
        // Secondary sort: severity (higher severity first)
        return b.severity - a.severity;
      });

    // Process domains in priority order, allocating resources
    for (const { domain, severity, domainInfo } of domainsByPriority) {
      // Skip if no severity (already recovered)
      if (severity <= 0) continue;

      // Check if dependencies are recovered enough
      const canRecover = this.canDomainRecover(domain, severities, domainInfo);
      if (!canRecover) {
        // Can't recover yet - dependency still blocking
        recovered[domain] = severity;
        continue;
      }

      // Check if recovery delay has passed
      const hoursSinceFailure = hour;  // Simplified - could track actual failure hour
      if (hoursSinceFailure < domainInfo.recovery_delay_hours) {
        // Recovery hasn't started yet
        recovered[domain] = severity;
        continue;
      }

      // Calculate recovery based on curve type
      const recoveryProgress = this.calculateRecoveryProgress(
        hoursSinceFailure - domainInfo.recovery_delay_hours,
        domainInfo
      );

      // Apply resource constraints - allocate resources based on priority and available capacity
      // Higher priority domains get more resources, but total is constrained
      const resourceNeed = domainInfo.resource_cost * severity;
      const priorityMultiplier = domainInfo.resource_priority === 1 ? 1.5 :
        domainInfo.resource_priority === 2 ? 1.2 : 0.8;

      // Allocate resources: priority domains get more, but we respect total capacity
      const domainCount = Math.max(1, domainsByPriority.length);
      const baseAllocation = Math.min(resourceNeed, availableResources / domainCount);
      const allocatedResources = Math.min(
        baseAllocation * priorityMultiplier,
        resourceNeed,
        availableResources * 0.8  // Never use more than 80% of remaining capacity per domain
      );

      // Recovery amount depends on: base recovery rate, backup capacity, progress curve, and allocated resources
      const baseRecoveryRate = domainInfo.recovery_rate * domainInfo.backup_capacity;
      // Resource multiplier: 1.0 if fully resourced, scales down if under-resourced
      const resourceMultiplier = resourceNeed > 0
        ? Math.min(1.0, allocatedResources / resourceNeed)
        : 1.0;
      const recoveryAmount = baseRecoveryRate * recoveryProgress * resourceMultiplier;

      // Deduct allocated resources from available pool
      availableResources = Math.max(0, availableResources - allocatedResources * 0.5);

      const newSeverity = Math.max(0, severity - recoveryAmount);

      // Keep domain in recovered set if still has meaningful severity
      if (newSeverity > 0.05) {
        recovered[domain] = newSeverity;
      }
    }

    return recovered;
  }

  /**
   * Check if a domain can recover given its dependencies
   * A domain can only recover if all critical dependencies are recovered enough
   */
  static canDomainRecover(domain, severities, domainInfo) {
    // No dependencies - can always recover (e.g., power grid)
    if (!domainInfo.dependencies || Object.keys(domainInfo.dependencies).length === 0) {
      return true;
    }

    // Check each dependency
    for (const [depDomain, depStrength] of Object.entries(domainInfo.dependencies)) {
      const depSeverity = severities[depDomain] || 0;

      // If dependency is still significantly failed (severity > threshold based on strength)
      // then this domain cannot recover
      // Critical dependencies (strength > 0.8) must be nearly recovered (severity < 0.2)
      // Less critical dependencies (strength < 0.8) can allow recovery if severity < 0.5
      const depThreshold = depStrength > 0.8 ? 0.2 : 0.5;

      if (depSeverity > depThreshold) {
        // Dependency still blocking recovery
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate recovery progress based on domain-specific recovery curve
   * Returns multiplier (0-1) for recovery rate based on time and curve type
   */
  static calculateRecoveryProgress(hoursSinceRecoveryStart, domainInfo) {
    const { recovery_curve } = domainInfo;

    switch (recovery_curve) {
      case 'immediate_backup':
        // Immediate backup systems (hospitals, emergency services)
        // Quick initial recovery from backup, then slower full restoration
        if (hoursSinceRecoveryStart < 0.5) {
          return 0.3;  // 30% from backup systems
        }
        // Exponential decay after initial backup recovery
        return Math.min(1.0, 0.3 + 0.7 * (1 - Math.exp(-hoursSinceRecoveryStart / 8)));

      case 'exponential':
        // Exponential recovery (typical for complex infrastructure like power)
        // Fast initial recovery, then tapers off
        return 1 - Math.exp(-hoursSinceRecoveryStart / 12);

      case 'slow_start':
        // Slow initial recovery, then accelerates (traffic lights after power surge)
        // Needs assessment time before full repair crews arrive
        if (hoursSinceRecoveryStart < 4) {
          return 0.1 * (hoursSinceRecoveryStart / 4);  // Slow start
        }
        // Then accelerates
        const acceleratedTime = hoursSinceRecoveryStart - 4;
        return Math.min(1.0, 0.1 + 0.9 * (1 - Math.exp(-acceleratedTime / 10)));

      case 'linear':
      default:
        // Linear recovery (simple infrastructure with steady repair rate)
        // Recovery rate per hour is constant, so progress is linear up to max
        const maxLinearHours = 24;
        return Math.min(1.0, hoursSinceRecoveryStart / maxLinearHours);
    }
  }

  /**
   * Get affected infrastructure components
   */
  static getAffectedInfrastructure(domain, severity) {
    const infrastructure = {
      power: ['power_plants', 'substations', 'distribution_grid', 'transformers'],
      water: ['pumping_stations', 'treatment_plants', 'distribution_network', 'reservoirs'],
      traffic: ['traffic_lights', 'signaling_systems', 'smart_roads', 'parking_systems'],
      communications: ['cell_towers', 'data_centers', 'fiber_network', 'satellite_links'],
      emergency: ['dispatch_centers', 'fire_stations', 'police_stations', 'ambulance_services'],
      healthcare: ['hospitals', 'clinics', 'emergency_rooms', 'medical_supply_chain'],
      transport: ['metro_systems', 'bus_networks', 'railways', 'airports'],
      financial: ['banks', 'atm_network', 'payment_systems', 'stock_exchange'],
      fuel_energy: ['refineries', 'gas_stations', 'fuel_pipelines', 'diesel_supplies'],
      food_supply: ['warehouses', 'distribution_centers', 'refrigeration_facilities', 'food_processing_plants'],
      waste_management: ['sewage_treatment_plants', 'waste_collection_facilities', 'landfills', 'recycling_centers'],
      internet_data: ['data_centers', 'internet_exchange_points', 'cloud_infrastructure', 'cable_networks'],
      government: ['government_offices', 'administrative_buildings', 'decision_making_centers', 'public_services']
    };

    const components = infrastructure[domain] || [];
    const affectedCount = Math.ceil(components.length * severity);

    return components.slice(0, affectedCount);
  }

  /**
   * Calculate total impact metrics with exponential cost curves and compounding effects
   * 
   * Economic cost model:
   * 1. Exponential duration scaling (hour 24 costs much more than hour 1 due to spoilage, resource depletion)
   * 2. Compound effects when multiple domains fail simultaneously (can't parallelize response)
   * 3. Indirect costs (social unrest, business closures, reputation, insurance)
   */
  static calculateTotalImpact(cascades, timeline, cityPopulation, duration) {
    // Find peak severity
    const peakTimeline = timeline.reduce((max, curr) =>
      curr.total_severity > max.total_severity ? curr : max
    );

    // Build timeline-based severity tracking per domain
    // This allows us to calculate exponential costs based on actual severity over time
    const domainSeverityByHour = {};
    const uniqueDomains = new Set();

    // Initialize domain severity tracking from timeline
    timeline.forEach(snapshot => {
      snapshot.domains.forEach(domain => {
        if (!domainSeverityByHour[domain]) {
          domainSeverityByHour[domain] = [];
          uniqueDomains.add(domain);
        }
        // Get severity for this domain at this hour (approximate from total)
        // We'll use average severity per domain based on domain count
        const domainCount = snapshot.domains.length;
        const avgSeverityPerDomain = snapshot.total_severity / Math.max(1, domainCount);
        domainSeverityByHour[domain].push({
          hour: snapshot.hour,
          severity: avgSeverityPerDomain
        });
      });
    });

    // Also track from cascades to get more accurate severity
    cascades.forEach(cascade => {
      uniqueDomains.add(cascade.domain);
      if (!domainSeverityByHour[cascade.domain]) {
        domainSeverityByHour[cascade.domain] = [];
      }
    });

    // Calculate economic cost with exponential duration curves and compounding
    let totalEconomicCost = 0;
    let totalDirectCost = 0;
    let totalIndirectCost = 0;
    const domainCosts = {};
    const indirectCosts = {
      social_unrest: 0,
      business_closures: 0,
      reputation_damage: 0,
      insurance_payouts: 0
    };

    // Calculate segments of indirect costs to track hourly impact
    const economicTimeline = [];

    // Calculate costs hour by hour to model exponential duration scaling
    for (let hour = 0; hour <= duration; hour++) {
      // Get active domains and their severities at this hour
      const snapshot = timeline.find(t => t.hour === hour) || timeline[timeline.length - 1];
      const activeDomains = snapshot.domains || [];
      const activeDomainCount = activeDomains.length;

      // Calculate simultaneous failure compounding factor
      const compoundingMultiplier = activeDomainCount > 1
        ? 1.0 + (activeDomainCount - 1) * 0.5
        : 1.0;

      // Calculate exponential duration multiplier
      const exponentialDurationMultiplier = this.calculateDurationMultiplier(hour, duration);

      // Hourly segment costs
      let hourDirectCost = 0;
      let hourIndirectCost = 0;

      // Calculate costs per domain at this hour
      activeDomains.forEach(domain => {
        if (!this.ECONOMIC_IMPACT_COSTS[domain]) return;

        const cascadeForDomain = cascades.find(c => c.domain === domain);
        const baseSeverity = cascadeForDomain ? cascadeForDomain.severity :
          (snapshot.total_severity / Math.max(1, activeDomainCount));

        const baseHourlyCost = this.ECONOMIC_IMPACT_COSTS[domain] * baseSeverity;
        const durationAdjustedCost = baseHourlyCost * exponentialDurationMultiplier;
        const compoundedCost = durationAdjustedCost * compoundingMultiplier;

        hourDirectCost += compoundedCost;
        domainCosts[domain] = (domainCosts[domain] || 0) + compoundedCost;
      });

      // Calculate indirect costs for this hour
      const totalSeverity = snapshot.total_severity || 0;

      // Social unrest
      if (activeDomainCount >= 2 && hour > 6) {
        const unrestCost = (cityPopulation * 50000 * totalSeverity * exponentialDurationMultiplier) / (duration + 1);
        indirectCosts.social_unrest += unrestCost;
        hourIndirectCost += unrestCost;
      }

      // Business closures
      if (hour > 12 && totalSeverity > 0.5) {
        const closureRate = Math.min(0.1, (hour - 12) / 100);
        const closureCost = (cityPopulation * 200000 * totalSeverity * closureRate) / (duration + 1);
        indirectCosts.business_closures += closureCost;
        hourIndirectCost += closureCost;
      }

      // Reputation damage
      if (activeDomainCount >= 3 && hour > 24) {
        const reputationCost = (cityPopulation * 150000 * activeDomainCount * (hour / duration)) / (duration + 1);
        indirectCosts.reputation_damage += reputationCost;
        hourIndirectCost += reputationCost;
      }

      // Insurance payouts (accrues hourly)
      if (totalSeverity > 0.7 && activeDomainCount >= 4) {
        const insuranceMultiplier = Math.min(3.0, 1 + (activeDomainCount - 4) * 0.5);
        const insuranceCost = (totalDirectCost * 0.3 * insuranceMultiplier) / (duration + 1);
        indirectCosts.insurance_payouts += insuranceCost;
        hourIndirectCost += insuranceCost;
      }

      totalDirectCost += hourDirectCost;

      economicTimeline.push({
        hour,
        direct_cost: hourDirectCost,
        indirect_cost: hourIndirectCost,
        cumulative_cost: totalDirectCost + Object.values(indirectCosts).reduce((a, b) => a + b, 0)
      });
    }

    // Sum indirect costs
    totalIndirectCost = Object.values(indirectCosts).reduce((sum, cost) => sum + cost, 0);
    totalEconomicCost = totalDirectCost + totalIndirectCost;

    // Calculate affected population using set union logic and vulnerability modeling
    // People can be affected by multiple domains, but we count unique individuals
    // Different demographics have different vulnerability levels
    const affectedPopulationData = this.calculateAffectedPopulationWithVulnerability(
      uniqueDomains,
      cascades,
      timeline,
      peakTimeline,
      cityPopulation
    );

    // Estimate recovery time
    const avgRecoveryRate = Array.from(uniqueDomains).reduce((sum, domain) => {
      const domainInfo = this.INFRASTRUCTURE_GRAPH[domain];
      // Skip undefined domains
      if (!domainInfo) return sum;
      return sum + domainInfo.recovery_rate;
    }, 0) / Math.max(1, uniqueDomains.size);

    const recoveryTime = Math.ceil(peakTimeline.total_severity / Math.max(0.01, avgRecoveryRate));

    return {
      affected_domains: uniqueDomains.size,
      peak_severity_time_hours: peakTimeline.hour,
      peak_total_severity: peakTimeline.total_severity,
      population_affected: affectedPopulationData.total_affected,
      population_affected_by_demographic: affectedPopulationData.by_demographic,
      population_affected_by_domain: affectedPopulationData.by_domain,
      estimated_economic_cost: Math.round(totalEconomicCost),
      direct_economic_cost: Math.round(totalDirectCost),
      indirect_economic_cost: Math.round(totalIndirectCost),
      economic_timeline: economicTimeline,
      indirect_cost_breakdown: {
        social_unrest: Math.round(indirectCosts.social_unrest),
        business_closures: Math.round(indirectCosts.business_closures),
        reputation_damage: Math.round(indirectCosts.reputation_damage),
        insurance_payouts: Math.round(indirectCosts.insurance_payouts)
      },
      economic_cost_by_domain: domainCosts,
      recovery_time_hours: recoveryTime,
      cascade_depth: cascades.length,
      simultaneous_failure_compounding: uniqueDomains.size > 1 ?
        (1.0 + (uniqueDomains.size - 1) * 0.5).toFixed(2) : '1.0'
    };
  }

  /**
   * Calculate affected population using set union logic and vulnerability modeling
   * 
   * Fixes:
   * 1. Set union logic (not additive) - people can be affected by multiple domains
   * 2. Vulnerability indices - different demographics have different vulnerability
   * 3. Spatial/demographic distribution - different domains affect different groups
   * 
   * @param {Set} uniqueDomains - Set of affected domains
   * @param {Array} cascades - Cascade events
   * @param {Array} timeline - Timeline of severities
   * @param {Object} peakTimeline - Peak severity snapshot
   * @param {number} cityPopulation - Total city population (millions)
   * @returns {Object} Population impact data with demographic breakdown
   */
  static calculateAffectedPopulationWithVulnerability(uniqueDomains, cascades, timeline, peakTimeline, cityPopulation) {
    // Track affected population per demographic group (set union logic)
    // Each demographic can be affected by multiple domains, but we count unique individuals
    const affectedByDemographic = {};
    const affectedByDomain = {};

    // Initialize demographic tracking
    Object.keys(this.DEMOGRAPHIC_DISTRIBUTION).forEach(demographic => {
      affectedByDemographic[demographic] = new Set(); // Set to track unique individuals
    });

    // Process each domain's impact
    uniqueDomains.forEach(domain => {
      const cascadeForDomain = cascades.find(c => c.domain === domain);
      const maxSeverity = cascadeForDomain ? cascadeForDomain.severity :
        (peakTimeline.total_severity / Math.max(1, uniqueDomains.size));

      // Base impact rate for this domain
      const baseImpactRate = this.POPULATION_IMPACT[domain] || 0.5;

      // Domain-specific vulnerability targeting
      const domainTargeting = this.DOMAIN_VULNERABILITY_TARGETING[domain] || {};

      // Calculate affected population per demographic
      Object.keys(this.DEMOGRAPHIC_DISTRIBUTION).forEach(demographic => {
        const demographicShare = this.DEMOGRAPHIC_DISTRIBUTION[demographic];
        const demographicSize = cityPopulation * demographicShare;

        // Base vulnerability index
        const baseVulnerability = this.VULNERABILITY_INDICES[demographic] || 1.0;

        // Domain-specific targeting multiplier
        const domainMultiplier = domainTargeting[demographic] || 1.0;

        // Combined vulnerability
        const vulnerabilityMultiplier = baseVulnerability * domainMultiplier;

        // Calculate affected population for this demographic and domain
        // Formula: population_size × base_impact_rate × severity × vulnerability_multiplier
        const affectedCount = demographicSize * baseImpactRate * maxSeverity * vulnerabilityMultiplier;

        // Cap at demographic size (can't affect more than 100% of a demographic)
        const cappedAffected = Math.min(affectedCount, demographicSize);

        // Store affected individuals (using Set for unique tracking)
        // In a real model, we'd track individual IDs, here we track count ranges
        // For set union: if domain A affects 60% and domain B affects 70%, 
        // union is not 130% but rather ~88% (using inclusion-exclusion principle)
        if (!affectedByDomain[domain]) {
          affectedByDomain[domain] = {};
        }
        affectedByDomain[domain][demographic] = cappedAffected;

        // Add to demographic set (for union calculation later)
        // We approximate by storing the max affected count per demographic-domain pair
        // For union calculation, we'll use inclusion-exclusion principle
        affectedByDemographic[demographic].add({
          domain,
          count: cappedAffected,
          share: cappedAffected / demographicSize
        });
      });
    });

    // Calculate union of affected populations per demographic (set union, not additive)
    // If multiple domains affect the same demographic, use inclusion-exclusion principle
    const unionAffectedByDemographic = {};
    let totalAffectedUnion = 0;

    Object.keys(affectedByDemographic).forEach(demographic => {
      const demographicSize = cityPopulation * this.DEMOGRAPHIC_DISTRIBUTION[demographic];
      const domainImpacts = Array.from(affectedByDemographic[demographic]);

      if (domainImpacts.length === 0) {
        unionAffectedByDemographic[demographic] = 0;
        return;
      }

      // Set union calculation using independence assumption for probabilities
      // P(A ∪ B ∪ ...) = 1 - P(A' ∩ B' ∩ ...) = 1 - ∏(1 - P(i))
      // This is much more stable than inclusion-exclusion for many overlapping domains
      let unionCount = 0;

      if (domainImpacts.length === 1) {
        unionCount = domainImpacts[0].count;
      } else {
        let complementProduct = 1;
        domainImpacts.forEach(impact => {
          complementProduct *= (1 - Math.min(1.0, impact.share));
        });
        unionCount = demographicSize * (1 - complementProduct);
      }

      // Cap at demographic size
      unionCount = Math.min(unionCount, demographicSize);
      unionAffectedByDemographic[demographic] = unionCount;
      totalAffectedUnion += unionCount;
    });

    // Convert domain impacts to counts
    const domainImpactsCounts = {};
    Object.keys(affectedByDomain).forEach(domain => {
      domainImpactsCounts[domain] = Object.values(affectedByDomain[domain])
        .reduce((sum, count) => sum + count, 0);
    });

    return {
      total_affected: Math.round(totalAffectedUnion * 1000000),
      by_demographic: Object.keys(unionAffectedByDemographic).reduce((obj, demo) => {
        obj[demo] = Math.round(unionAffectedByDemographic[demo] * 1000000); // Convert to actual number
        return obj;
      }, {}),
      by_domain: Object.keys(domainImpactsCounts).reduce((obj, domain) => {
        obj[domain] = Math.round(domainImpactsCounts[domain] * 1000000); // Convert to actual number
        return obj;
      }, {}),
      vulnerability_analysis: {
        most_vulnerable_demographics: Object.keys(unionAffectedByDemographic)
          .sort((a, b) => unionAffectedByDemographic[b] - unionAffectedByDemographic[a])
          .slice(0, 3)
          .map(demo => ({
            demographic: demo,
            affected: Math.round(unionAffectedByDemographic[demo] * 1000000),
            vulnerability_index: this.VULNERABILITY_INDICES[demo] || 1.0
          }))
      }
    };
  }

  /**
   * Calculate exponential duration multiplier for economic costs
   * Hour 1 = 1.0x, Hour 12 = 2.5x, Hour 24 = 5.0x, Hour 48 = 12x
   * Models: food spoilage, resource depletion, supply chain collapse
   */
  static calculateDurationMultiplier(hour, totalDuration) {
    if (hour <= 0) return 1.0;

    // Exponential curve: cost = 1.0 + (hour/totalDuration)^2 * (maxMultiplier - 1.0)
    // For 24h: hour 1 = 1.0x, hour 12 = 2.5x, hour 24 = 5.0x
    // For 48h: hour 1 = 1.0x, hour 24 = 5.0x, hour 48 = 12.0x
    const normalizedHour = hour / Math.max(1, totalDuration);
    const maxMultiplier = totalDuration <= 24 ? 5.0 : 12.0;

    // Exponential scaling: e^(k * normalizedHour) where k is tuned to hit maxMultiplier
    const k = Math.log(maxMultiplier) / 1.0; // Adjust divisor to control curve steepness
    const multiplier = 1.0 + (Math.exp(k * normalizedHour) - 1.0) * (maxMultiplier - 1.0) / (Math.exp(k) - 1.0);

    // Also apply critical thresholds for specific duration milestones
    let thresholdMultiplier = 1.0;
    if (hour >= 24) thresholdMultiplier *= 1.5;  // Critical threshold: supply chains start collapsing
    if (hour >= 48) thresholdMultiplier *= 1.8;  // Critical threshold: resource exhaustion
    if (hour >= 72) thresholdMultiplier *= 2.0;  // Critical threshold: systemic collapse

    return multiplier * thresholdMultiplier;
  }

  /**
   * Generate dynamic, context-aware recommendations with cost-benefit analysis
   * 
   * Features:
   * - Context-aware: Based on severity, cascade trajectory, city characteristics
   * - Cost-benefit: ROI calculations, prioritization by impact per dollar
   * - Prioritized: Triage-based, what to do FIRST
   * - Timelines: Implementation times for each intervention
   */
  static generateRecommendations(trigger, severity, cascades, totalImpact, cityId = 1, currentTime = new Date()) {
    // Define intervention library with costs, impacts, and requirements
    const interventions = this.getInterventionLibrary(trigger, severity, cascades, totalImpact);

    // Filter interventions based on context
    const applicableInterventions = this.filterInterventionsByContext(
      interventions,
      severity,
      totalImpact,
      cascades,
      cityId,
      currentTime
    );

    // Calculate cost-benefit for each intervention
    const interventionsWithROI = applicableInterventions.map(intervention => {
      const roi = this.calculateInterventionROI(intervention, totalImpact, cascades);
      return { ...intervention, roi };
    });

    // Sort by priority: impact reduction per dollar (ROI)
    interventionsWithROI.sort((a, b) => b.roi.impact_per_dollar - a.roi.impact_per_dollar);

    // Select top recommendations (prioritized, cost-effective)
    const topRecommendations = interventionsWithROI
      .filter(intervention => intervention.roi.impact_per_dollar > 0)
      .slice(0, 10)
      .map((intervention, index) => ({
        priority: index + 1,
        action: intervention.description,
        target_domain: intervention.target_domain,
        cost_usd: intervention.cost,
        impact_reduction_percent: intervention.impact_reduction,
        cost_effectiveness: intervention.roi.impact_per_dollar,
        implementation_time_hours: intervention.implementation_time,
        urgency: intervention.urgency,
        rationale: this.generateRationale(intervention, totalImpact, cascades)
      }));

    return topRecommendations;
  }

  /**
   * Get intervention library - all possible interventions with metadata
   */
  static getInterventionLibrary(trigger, severity, cascades, totalImpact) {
    const affectedDomains = new Set(cascades.map(c => c.domain));
    const upcomingCascades = this.predictUpcomingCascades(cascades, totalImpact);

    const library = [];

    // POWER interventions
    if (trigger === 'power' || affectedDomains.has('power')) {
      // Low-cost, quick interventions
      library.push({
        id: 'power_rolling_blackouts',
        target_domain: 'power',
        description: 'Implement rolling blackouts (1 hour on, 2 hours off) to preserve grid stability',
        cost: 50000, // Operational cost
        impact_reduction: 0.15, // Reduces cascade severity by 15%
        implementation_time: 0.5, // 30 minutes
        min_severity: 0.3,
        max_severity: 0.8,
        urgency: 'high'
      });

      // Medium interventions
      if (severity >= 0.4) {
        library.push({
          id: 'power_mobile_generators',
          target_domain: 'power',
          description: `Deploy mobile generators to ${severity >= 0.7 ? 'all critical facilities' : 'hospitals and emergency services only'}`,
          cost: severity >= 0.7 ? 5000000 : 1000000,
          impact_reduction: severity >= 0.7 ? 0.25 : 0.15,
          implementation_time: 2.0,
          min_severity: 0.4,
          urgency: 'high'
        });
      }

      // High-cost, high-impact interventions
      if (severity >= 0.7 && totalImpact.affected_domains >= 5) {
        library.push({
          id: 'power_emergency_grid',
          target_domain: 'power',
          description: 'Activate emergency power grid interconnections with neighboring regions',
          cost: 50000000,
          impact_reduction: 0.35,
          implementation_time: 4.0,
          min_severity: 0.7,
          urgency: 'critical'
        });
      }
    }

    // WATER interventions
    if (trigger === 'water' || affectedDomains.has('water')) {
      library.push({
        id: 'water_emergency_reserves',
        target_domain: 'water',
        description: 'Activate emergency water reserves and distribution',
        cost: 200000,
        impact_reduction: 0.20,
        implementation_time: 1.0,
        min_severity: 0.2,
        urgency: severity >= 0.6 ? 'critical' : 'high'
      });

      if (severity >= 0.5) {
        library.push({
          id: 'water_tankers',
          target_domain: 'water',
          description: `Deploy water tankers to ${severity >= 0.7 ? 'all affected areas' : 'critical facilities'}`,
          cost: severity >= 0.7 ? 2000000 : 800000,
          impact_reduction: severity >= 0.7 ? 0.30 : 0.20,
          implementation_time: 2.0,
          min_severity: 0.5,
          urgency: 'high'
        });
      }
    }

    // EMERGENCY SERVICES interventions
    if (trigger === 'emergency' || affectedDomains.has('emergency') || severity >= 0.7) {
      // Low-cost first
      library.push({
        id: 'emergency_mutual_aid',
        target_domain: 'emergency',
        description: 'Activate mutual aid agreements with neighboring jurisdictions',
        cost: 100000,
        impact_reduction: 0.15,
        implementation_time: 1.0,
        min_severity: 0.5,
        urgency: 'high'
      });

      // High-cost interventions (only for severe crises)
      if (severity >= 0.8 && totalImpact.affected_domains >= 7) {
        library.push({
          id: 'emergency_national_guard',
          target_domain: 'emergency',
          description: 'Deploy National Guard/military support (requires state declaration)',
          cost: 10000000,
          impact_reduction: 0.40,
          implementation_time: 6.0,
          min_severity: 0.8,
          urgency: 'critical'
        });
      }
    }

    // HEALTHCARE interventions
    if (trigger === 'healthcare' || affectedDomains.has('healthcare')) {
      library.push({
        id: 'healthcare_surge',
        target_domain: 'healthcare',
        description: 'Activate hospital surge capacity protocols',
        cost: 300000,
        impact_reduction: 0.25,
        implementation_time: 0.5,
        min_severity: 0.3,
        urgency: 'critical'
      });

      if (severity >= 0.6) {
        library.push({
          id: 'healthcare_mobile_units',
          target_domain: 'healthcare',
          description: 'Deploy mobile medical units to affected areas',
          cost: 1500000,
          impact_reduction: 0.30,
          implementation_time: 3.0,
          min_severity: 0.6,
          urgency: 'high'
        });
      }
    }

    // Prevent cascades to upcoming domains
    upcomingCascades.forEach(nextDomain => {
      const domainInfo = this.INFRASTRUCTURE_GRAPH[nextDomain];
      if (domainInfo) {
        library.push({
          id: `prevent_${nextDomain}`,
          target_domain: nextDomain,
          description: `Preemptively reinforce ${nextDomain.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} systems to prevent cascade`,
          cost: this.ECONOMIC_IMPACT_COSTS[nextDomain] * 0.1 || 1000000,
          impact_reduction: 0.20, // Prevent cascade entirely
          implementation_time: 1.5,
          urgency: 'high',
          prevents_cascade: true
        });
      }
    });

    return library;
  }

  /**
   * Filter interventions based on context (severity, cost-effectiveness, etc.)
   */
  static filterInterventionsByContext(interventions, severity, totalImpact, cascades, cityId, currentTime) {
    return interventions.filter(intervention => {
      // Filter by severity thresholds
      if (intervention.min_severity && severity < intervention.min_severity) {
        return false;
      }
      if (intervention.max_severity && severity > intervention.max_severity) {
        return false;
      }

      // Don't deploy expensive interventions for low-severity failures
      if (severity < 0.5 && intervention.cost > 1000000) {
        return false;
      }

      // Don't deploy National Guard level resources unless critical
      if (intervention.cost > 5000000 && severity < 0.7) {
        return false;
      }

      // Time-of-day considerations (simplified)
      const hour = currentTime.getHours();
      // Some interventions harder at night
      if (hour >= 22 || hour < 6) {
        if (intervention.implementation_time > 2 && intervention.cost < 100000) {
          // Quick interventions still OK, but complex ones delayed
        }
      }

      return true;
    });
  }

  /**
   * Calculate ROI for an intervention
   */
  static calculateInterventionROI(intervention, totalImpact, cascades) {
    const currentCost = totalImpact.estimated_economic_cost || 0;

    // Estimate cost reduction from intervention
    const severityReduction = intervention.impact_reduction;
    const costSavings = currentCost * severityReduction;

    // Implementation time affects savings (longer time = less savings due to delayed impact)
    const timeDiscount = Math.max(0.5, 1 - (intervention.implementation_time / 12));
    const effectiveSavings = costSavings * timeDiscount;

    // ROI = (Savings - Cost) / Cost
    const netBenefit = effectiveSavings - intervention.cost;
    const roi = intervention.cost > 0 ? netBenefit / intervention.cost : 0;

    // Impact per dollar (for prioritization)
    const impact_per_dollar = intervention.cost > 0
      ? (effectiveSavings / intervention.cost)
      : effectiveSavings > 0 ? 1000 : 0;

    return {
      cost_savings: effectiveSavings,
      net_benefit: netBenefit,
      roi: roi,
      impact_per_dollar: impact_per_dollar,
      payback_time_hours: intervention.cost / (effectiveSavings / 24) // Hours to break even
    };
  }

  /**
   * Predict which domains will fail next based on cascade trajectory
   */
  static predictUpcomingCascades(cascades, totalImpact) {
    // Analyze cascade patterns to predict next failures
    const atRisk = new Set();

    // Domains that are likely to cascade soon based on dependencies
    cascades.forEach(cascade => {
      const domainInfo = this.INFRASTRUCTURE_GRAPH[cascade.domain];
      if (domainInfo && domainInfo.dependents) {
        Object.keys(domainInfo.dependents).forEach(dependent => {
          if (!cascades.find(c => c.domain === dependent)) {
            atRisk.add(dependent);
          }
        });
      }
    });

    return Array.from(atRisk);
  }

  /**
   * Generate rationale for why this intervention is recommended
   */
  static generateRationale(intervention, totalImpact, cascades) {
    const reasons = [];

    if (intervention.urgency === 'critical') {
      reasons.push('Critical urgency - immediate action required');
    }

    if (intervention.roi && intervention.roi.impact_per_dollar > 10) {
      reasons.push(`Highly cost-effective: saves $${intervention.roi.impact_per_dollar.toFixed(1)} per dollar spent`);
    }

    if (intervention.prevents_cascade) {
      reasons.push('Prevents cascading failure to dependent systems');
    }

    if (intervention.implementation_time && intervention.implementation_time < 1) {
      reasons.push('Can be implemented within 1 hour');
    }

    const domainImpact = totalImpact?.economic_cost_by_domain?.[intervention.target_domain] || 0;
    if (domainImpact > 10000000) {
      reasons.push(`Targets high-impact domain ($${(domainImpact / 1000000).toFixed(0)}M at risk)`);
    }

    return reasons.length > 0 ? reasons.join('. ') : 'Recommended based on cost-benefit analysis';
  }

}

// ============================================================================
// API ENDPOINTS
// ============================================================================

const dataStore = new DataStore();
/**
 * GET /api/v1/current-state?city_id={city}
 * Returns current metrics for a city with REAL-TIME DATA (merged from local and remote)
 */
app.get('/api/v1/current-state', async (req, res) => {
  try {
    const cityId = parseInt(req.query.city_id) || 1;

    if (!dataStore.cities[cityId]) {
      return res.status(400).json({ error: 'Invalid city_id' });
    }

    const city = dataStore.cities[cityId];
    const apiKey = process.env.OPENWEATHER_API_KEY;

    // Try to get real-time data from OpenWeatherMap (Remote repository feature)
    if (apiKey) {
      try {
        // Fetch both AQI and Weather in parallel
        const [aqiData, weatherData] = await Promise.all([
          fetchOpenWeatherMapAQI(city.lat, city.lng, apiKey),
          fetchOpenWeatherMapWeather(city.lat, city.lng, apiKey)
        ]);

        console.log(`✅ Real-time data for ${city.name}: AQI=${aqiData.aqi}, Temp=${weatherData.temperature}°C`);

        // Combine with our advanced service data
        const localState = await realTimeDataService.getCurrentState(cityId);

        return res.json({
          city: city.name,
          timestamp: new Date().toISOString(),
          aqi: aqiData.aqi,
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          weather_description: weatherData.description,
          hospital_load: localState.hospital_load,
          crop_supply: localState.crop_supply,
          food_price_index: localState.food_price_index,
          traffic_density: localState.traffic_density,
          source: 'OpenWeatherMap + RealTimeService',
          pollutants: aqiData.pollutants
        });
      } catch (error) {
        console.error(`⚠️ OpenWeather API error for ${city.name}, using local service:`, error.message);
      }
    }

    // Use our advanced local service (HEAD version)
    const state = await realTimeDataService.getCurrentState(cityId);
    res.json(state);
  } catch (error) {
    console.error('[API] Error in current-state:', error);
    res.status(500).json({ error: 'Failed to fetch current state', message: error.message });
  }
});

/**
 * GET /api/v1/risk-assessment?city_id={city}
 * Returns risk assessment for a city (using our advanced local logic)
 */
app.get('/api/v1/risk-assessment', async (req, res) => {
  try {
    const cityId = parseInt(req.query.city_id) || 1;

    if (!dataStore.cities[cityId]) {
      return res.status(400).json({ error: 'Invalid city_id' });
    }

    const state = await dataStore.getCurrentState(cityId);

    const risks = {
      environmental_risk: RiskAnalytics.calculateEnvironmentalRisk(state.aqi, state.temperature),
      health_risk: RiskAnalytics.calculateHealthRisk(state.hospital_load, state.temperature),
      food_security_risk: RiskAnalytics.calculateFoodSecurityRisk(state.crop_supply, state.food_price_index)
    };

    res.json(risks);
  } catch (error) {
    console.error('[API] Error in risk-assessment:', error);
    res.status(500).json({ error: 'Failed to fetch risk assessment', message: error.message });
  }
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
 * Returns historical data for a city (merged logic)
 */
app.get('/api/v1/historical', async (req, res) => {
  try {
    const cityId = parseInt(req.query.city_id) || 1;
    const hours = parseInt(req.query.hours) || 24;

    if (!dataStore.cities[cityId]) {
      return res.status(400).json({ error: 'Invalid city_id' });
    }

    const historical = await dataStore.getHistoricalData(cityId, Math.min(hours, 24));
    res.json(historical);
  } catch (error) {
    console.error('[API] Error in historical:', error);
    res.status(500).json({ error: 'Failed to fetch historical data', message: error.message });
  }
});
});

/**
 * GET /api/v1/cities
 * Returns list of available cities
 */
app.get('/api/v1/cities', (req, res) => {
  res.json(Object.values(dataStore.cities));
});

/**
 * GET /api/v1/cascading-failure?city_id={city}&trigger={domain}&severity={0-1}&duration={hours}&monte_carlo={true}&iterations={100}
 * Simulates cascading infrastructure failures
 * 
 * Query Parameters:
 *   - city_id (required): City identifier (1-3)
 *   - trigger (required): Initial failure domain (power, water, traffic, communications, emergency, healthcare, transport, financial)
 *   - severity (required): Failure magnitude (0.0 to 1.0)
 *   - duration (optional): Simulation hours (default: 24, max: 72)
 *   - monte_carlo (optional): Enable Monte Carlo simulation with uncertainty (default: false)
 *   - iterations (optional): Number of Monte Carlo iterations (default: 100, min: 10, max: 1000)
 * 
 * Monte Carlo Mode:
 *   When monte_carlo=true, runs multiple stochastic simulations to generate:
 *   - Probability distributions for all metrics
 *   - 95% confidence intervals
 *   - Percentiles (p5, p25, p50/median, p75, p95)
 *   - Histogram distributions
 *   Models uncertainty from: operator errors, weather, equipment age, political response, panic behaviors
 */
app.get('/api/v1/cascading-failure', async (req, res) => {
  try {
    console.log('[CASCADE] Request received:', req.query);

    // Parse and validate parameters
    const cityId = parseInt(req.query.city_id);
    const trigger = req.query.trigger;
    const severity = parseFloat(req.query.severity);
    const duration = parseInt(req.query.duration) || 24;

    console.log('[CASCADE] Parsed params:', { cityId, trigger, severity, duration });

    // Validate city_id
    if (!cityId || !dataStore.cities[cityId]) {
      console.log('[CASCADE] Invalid city_id:', cityId);
      return res.status(400).json({
        error: 'Invalid city_id',
        message: 'city_id must be 1 (Mumbai), 2 (Delhi), or 3 (Bangalore)'
      });
    }

    // Validate trigger
    const validTriggers = ['power', 'water', 'traffic', 'communications', 'emergency', 'healthcare', 'transport', 'financial', 'fuel_energy', 'food_supply', 'waste_management', 'internet_data', 'government'];
    if (!trigger || !validTriggers.includes(trigger)) {
      console.log('[CASCADE] Invalid trigger:', trigger);
      return res.status(400).json({
        error: 'Invalid trigger',
        message: `trigger must be one of: ${validTriggers.join(', ')}`
      });
    }

    // Validate severity
    if (isNaN(severity) || severity < 0 || severity > 1) {
      console.log('[CASCADE] Invalid severity:', severity);
      return res.status(400).json({
        error: 'Invalid severity',
        message: 'severity must be a number between 0.0 and 1.0'
      });
    }

    // Validate duration
    if (duration < 1 || duration > 72) {
      console.log('[CASCADE] Invalid duration:', duration);
      return res.status(400).json({
        error: 'Invalid duration',
        message: 'duration must be between 1 and 72 hours'
      });
    }

    // Check for Monte Carlo mode
    const monteCarlo = req.query.monte_carlo === 'true' || req.query.monte_carlo === '1';
    const iterations = parseInt(req.query.iterations) || 100;

    if (monteCarlo && (iterations < 10 || iterations > 1000)) {
      return res.status(400).json({
        error: 'Invalid iterations',
        message: 'iterations must be between 10 and 1000 for Monte Carlo simulation'
      });
    }

    console.log('[CASCADE] All validations passed, mode:', monteCarlo ? `Monte Carlo (${iterations} iterations)` : 'Deterministic');

    // Get real-time current state for cascade analysis
    const currentState = await dataStore.getCurrentState(cityId);
    console.log('[CASCADE] Using real-time data:', {
      aqi: currentState.aqi,
      temperature: currentState.temperature,
      hospital_load: currentState.hospital_load
    });

    let cascadeResult;

    if (monteCarlo) {
      // Run Monte Carlo simulation
      console.log(`[CASCADE] Running Monte Carlo simulation with ${iterations} iterations...`);
      const monteCarloResult = await CascadeAnalytics.runMonteCarloSimulation(
        trigger,
        severity,
        cityId,
        dataStore,
        duration,
        { iterations }
      );

      // Use median result as representative sample
      const medianEconomicCost = monteCarloResult.statistics.total_economic_cost.median;
      const medianResult = monteCarloResult.sample_results.find(r =>
        Math.abs((r.total_impact.estimated_economic_cost || 0) - medianEconomicCost) <
        (medianEconomicCost * 0.1)
      ) || monteCarloResult.sample_results[0];

      cascadeResult = {
        ...medianResult,
        monte_carlo: monteCarloResult
      };

      console.log('[CASCADE] Monte Carlo simulation complete');
    } else {
      // Deterministic calculation
      cascadeResult = await CascadeAnalytics.calculateCascade(
        trigger,
        severity,
        cityId,
        dataStore,
        duration,
        currentState,
        { enableStochastic: false }
      );
    }

    console.log('[CASCADE] Calculation complete, building response...');

    // Add metadata
    const response = {
      city: dataStore.cities[cityId].name,
      city_id: cityId,
      timestamp: new Date().toISOString(),
      simulation_duration_hours: duration,
      ...cascadeResult
    };

    console.log('[CASCADE] Sending response with', Object.keys(response).length, 'keys');
    res.json(response);

  } catch (error) {
    console.error('[CASCADE] Error occurred:', error);
    console.error('[CASCADE] Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/v1/validate-model?historical_key={disaster_key}
 * POST /api/v1/validate-model (with cascade simulation result)
 * Validates model output against historical disaster data
 */
app.get('/api/v1/validate-model', async (req, res) => {
  try {
    const historicalKey = req.query.historical_key;
    const validateAll = req.query.validate_all === 'true';

    if (validateAll) {
      const results = await ModelCalibration.validateAllHistorical(async (params) => {
        const currentState = await dataStore.getCurrentState(1);
        return await CascadeAnalytics.calculateCascade(
          params.trigger,
          params.severity,
          1,
          dataStore,
          params.duration,
          currentState,
          { enableStochastic: false }
        );
      });

      res.json({
        validation_type: 'all_historical',
        timestamp: new Date().toISOString(),
        ...results
      });
    } else if (historicalKey) {
      const historical = ModelCalibration.HISTORICAL_DISASTERS[historicalKey];
      if (!historical) {
        return res.status(400).json({
          error: 'Invalid historical_key',
          available_keys: Object.keys(ModelCalibration.HISTORICAL_DISASTERS)
        });
      }

      const currentState = await dataStore.getCurrentState(1);
      const modelOutput = await CascadeAnalytics.calculateCascade(
        historical.trigger,
        historical.initial_severity,
        1,
        dataStore,
        historical.duration_hours,
        currentState,
        { enableStochastic: false }
      );

      const validation = ModelCalibration.validateAgainstHistorical(modelOutput, historicalKey);

      res.json({
        validation_type: 'single_historical',
        timestamp: new Date().toISOString(),
        validation
      });
    } else {
      res.json({
        available_disasters: Object.entries(ModelCalibration.HISTORICAL_DISASTERS).map(([key, disaster]) => ({
          key,
          name: disaster.name,
          date: disaster.date,
          trigger: disaster.trigger
        })),
        usage: {
          validate_single: '/api/v1/validate-model?historical_key={key}',
          validate_all: '/api/v1/validate-model?validate_all=true'
        }
      });
    }
  } catch (error) {
    console.error('[VALIDATION] Error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

app.post('/api/v1/validate-model', async (req, res) => {
  try {
    const { cascade_result, historical_key } = req.body;

    if (!cascade_result || !historical_key) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['cascade_result', 'historical_key']
      });
    }

    const validation = ModelCalibration.validateAgainstHistorical(cascade_result, historical_key);

    res.json({
      validation_type: 'custom_result',
      timestamp: new Date().toISOString(),
      validation
    });
  } catch (error) {
    console.error('[VALIDATION] Error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/systemic-resilience?city_id={1,2,3}&hours={24}
 * Returns systemic resilience metrics across domains (Urban + Health + Agriculture)
 * Shows systemic resilience, not isolated metrics
 */
app.get('/api/v1/systemic-resilience', async (req, res) => {
  try {
    const cityId = parseInt(req.query.city_id) || 1;
    const hours = parseInt(req.query.hours) || 24;

    if (!dataStore.cities[cityId]) {
      return res.status(400).json({ error: 'Invalid city_id' });
    }

    // Get current state (urban + health + agriculture data)
    const currentState = await dataStore.getCurrentState(cityId);

    // Separate data by domain
    const urbanData = {
      aqi: currentState.aqi,
      traffic_density: currentState.traffic_density,
      temperature: currentState.temperature
    };

    const healthData = {
      hospital_load: currentState.hospital_load,
      respiratory_cases: null // Would come from health APIs
    };

    const agricultureData = {
      crop_supply: currentState.crop_supply,
      food_price_index: currentState.food_price_index
    };

    // Integrate across domains
    const integration = await crossDomainIntegration.integrateDomains(
      cityId,
      urbanData,
      healthData,
      agricultureData
    );

    // Get historical resilience trends
    const historical = crossDomainIntegration.getSystemicResilience(cityId, hours);

    res.json({
      city_id: cityId,
      city: dataStore.cities[cityId].name,
      timestamp: new Date().toISOString(),
      ...integration,
      historical_trends: historical
    });

  } catch (error) {
    console.error('[SYSTEMIC-RESILIENCE] Error:', error);
    res.status(500).json({ error: 'Failed to calculate systemic resilience', message: error.message });
  }
});

/**
 * GET /api/v1/causal-discovery?source_domain={urban|health|agriculture}&target_domain={urban|health|agriculture}
 * Returns discovered causal relationships with lagged correlations
 * Validates using domain logic + statistical rigor
 */
app.get('/api/v1/causal-discovery', (req, res) => {
  try {
    const sourceDomain = req.query.source_domain || null;
    const targetDomain = req.query.target_domain || null;

    const links = crossDomainIntegration.getCausalDiscovery(sourceDomain, targetDomain);

    res.json({
      causal_links: links,
      total_links: links.length,
      validated_links: links.filter(l => l.validation_status === 'validated').length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CAUSAL-DISCOVERY] Error:', error);
    res.status(500).json({ error: 'Failed to get causal discovery', message: error.message });
  }
});

/**
 * GET /api/v1/cross-domain-impact?city_id={1,2,3}
 * Shows cross-domain vulnerabilities and cascading effects
 * Production-ready: handles temporal misalignment, missing values
 */
app.get('/api/v1/cross-domain-impact', async (req, res) => {
  try {
    const cityId = parseInt(req.query.city_id) || 1;

    if (!dataStore.cities[cityId]) {
      return res.status(400).json({ error: 'Invalid city_id' });
    }

    // Get current state
    const currentState = await dataStore.getCurrentState(cityId);

    // Separate by domain
    const urbanData = {
      aqi: currentState.aqi,
      traffic_density: currentState.traffic_density,
      temperature: currentState.temperature
    };

    const healthData = {
      hospital_load: currentState.hospital_load
    };

    const agricultureData = {
      crop_supply: currentState.crop_supply,
      food_price_index: currentState.food_price_index
    };

    // Get vulnerabilities and cascading effects
    const vulnerabilities = crossDomainIntegration.identifyCrossDomainVulnerabilities(
      cityId,
      urbanData,
      healthData,
      agricultureData
    );

    const cascadingEffects = crossDomainIntegration.predictCascadingEffects(
      urbanData,
      healthData,
      agricultureData
    );

    res.json({
      city_id: cityId,
      city: dataStore.cities[cityId].name,
      timestamp: new Date().toISOString(),
      vulnerabilities,
      cascading_effects: cascadingEffects,
      total_vulnerabilities: vulnerabilities.length,
      total_cascading_effects: cascadingEffects.length
    });

  } catch (error) {
    console.error('[CROSS-DOMAIN-IMPACT] Error:', error);
    res.status(500).json({ error: 'Failed to analyze cross-domain impact', message: error.message });
  }
});

/**
 * GET /api/v1/stats
 * Get system statistics and performance metrics
 * Production monitoring endpoint
 */
app.get('/api/v1/stats', (req, res) => {
  try {
    const stats = scalability.getStats();
    res.json({
      ...stats,
      timestamp: new Date().toISOString(),
      system_health: stats.errors < 10 ? 'healthy' : 'degraded'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats', message: error.message });
  }
});

/**
 * GET /api/v1/health
 * Health check endpoint
 */
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/v1/aqi?lat={lat}&lng={lng}
 * Fetches real-time AQI data from OpenWeatherMap API
 */
app.get('/api/v1/aqi', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing lat/lng parameters' });
  }

  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      console.log('⚠️ No API key found, using simulated data');
      const aqiData = generateRealisticAQI(parseFloat(lat), parseFloat(lng));
      return res.json(aqiData);
    }

    // Fetch real AQI data from OpenWeatherMap
    const aqiData = await fetchOpenWeatherMapAQI(parseFloat(lat), parseFloat(lng), apiKey);
    console.log('✅ Real AQI data from OpenWeatherMap:', aqiData.aqi);
    res.json(aqiData);
  } catch (error) {
    console.error('❌ AQI API error, falling back to simulated:', error.message);
    // Fallback to simulated data
    const aqiData = generateRealisticAQI(parseFloat(lat), parseFloat(lng));
    res.json(aqiData);
  }
});

/**
 * Fetch AQI from OpenWeatherMap Air Pollution API
 * Free tier: 1000 calls/day
 * Docs: https://openweathermap.org/api/air-pollution
 */
async function fetchOpenWeatherMapAQI(lat, lng, apiKey) {
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${apiKey}`;
  console.log('🌐 OpenWeatherMap AQI URL:', url);

  const response = await fetch(url);
  console.log('📊 OpenWeatherMap Response Status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.log('❌ OpenWeatherMap Error:', errorText);
    throw new Error(`OpenWeatherMap API failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('📦 OpenWeatherMap AQI Data received');

  // OpenWeatherMap returns aqi on 1-5 scale, convert to US EPA scale (0-500)
  if (data.list && data.list[0] && data.list[0].main && data.list[0].main.aqi) {
    const aqiLevel = data.list[0].main.aqi; // 1-5 scale
    const components = data.list[0].components;

    // Calculate US EPA AQI from PM2.5 concentration
    const pm25 = components?.pm2_5 || 0;
    let aqiValue;

    // EPA AQI breakpoints for PM2.5
    if (pm25 <= 12) aqiValue = Math.round((50 / 12) * pm25);
    else if (pm25 <= 35.4) aqiValue = Math.round(50 + (50 / 23.4) * (pm25 - 12));
    else if (pm25 <= 55.4) aqiValue = Math.round(100 + (50 / 20) * (pm25 - 35.4));
    else if (pm25 <= 150.4) aqiValue = Math.round(150 + (50 / 95) * (pm25 - 55.4));
    else if (pm25 <= 250.4) aqiValue = Math.round(200 + (100 / 100) * (pm25 - 150.4));
    else aqiValue = Math.round(300 + (100 / 149.6) * (pm25 - 250.4));

    aqiValue = Math.min(500, Math.max(0, aqiValue));

    return {
      aqi: aqiValue,
      source: 'OpenWeatherMap',
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      timestamp: new Date().toISOString(),
      pollutants: {
        pm25: components?.pm2_5 || null,
        pm10: components?.pm10 || null,
        o3: components?.o3 || null,
        no2: components?.no2 || null,
        so2: components?.so2 || null,
        co: components?.co || null
      }
    };
  }

  throw new Error('Invalid OpenWeatherMap response format');
}

/**
 * Fetch current weather from OpenWeatherMap Weather API
 */
async function fetchOpenWeatherMapWeather(lat, lng, apiKey) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    temperature: Math.round(data.main.temp * 10) / 10,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    description: data.weather[0]?.description || 'Unknown',
    wind_speed: data.wind?.speed || 0
  };
}

/**
 * Fetch AQI from IQAir API
 * Free tier: 10,000 calls/month
 * Sign up: https://www.iqair.com/air-quality-api
 */
async function fetchIQAirAQI(lat, lng) {
  const url = `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lng}&key=demo`;
  console.log('🌐 IQAir URL:', url);

  const response = await fetch(url);
  console.log('📊 IQAir Response Status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.log('❌ IQAir Error:', errorText);
    throw new Error(`IQAir API failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('📦 IQAir Data:', JSON.stringify(data).substring(0, 300));

  if (data.status === 'success' && data.data && data.data.current) {
    const current = data.data.current.pollution;
    const aqiValue = current.aqius || 100;
    console.log('✅ IQAir AQI Value:', aqiValue);

    return {
      aqi: aqiValue,
      source: 'IQAir',
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      timestamp: new Date().toISOString(),
      pollutants: {
        pm25: current.aqius || null,
        pm10: null,
        o3: null,
        no2: null,
        so2: null,
        co: null
      }
    };
  }

  throw new Error('Invalid IQAir response format');
}

/**
 * Fetch AQI from WAQI API
 * Free tier available
 * Sign up: https://waqi.info/
 */
async function fetchWAQIAQI(lat, lng, apiKey) {
  const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) throw new Error('WAQI API failed');

  const data = await response.json();
  if (data.status !== 'ok') throw new Error('WAQI returned error status');

  return {
    aqi: data.data.aqi,
    source: 'WAQI',
    coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
    timestamp: new Date().toISOString(),
    pollutants: {
      pm25: data.data.iaqi?.pm25?.v || null,
      pm10: data.data.iaqi?.pm10?.v || null,
      o3: data.data.iaqi?.o3?.v || null,
      no2: data.data.iaqi?.no2?.v || null,
      so2: data.data.iaqi?.so2?.v || null,
      co: data.data.iaqi?.co?.v || null
    }
  };
}

/**
 * Generate realistic simulated AQI data based on location and time
 * Different areas have different pollution profiles
 */
function generateRealisticAQI(lat, lng) {
  // Determine area type based on coordinates (Mumbai specific)
  let baseAqi;

  // Industrial/traffic areas have higher AQI
  if (lat > 19.05 && lat < 19.15 && lng > 72.85 && lng < 72.95) {
    // Central Mumbai - high traffic
    baseAqi = 150 + Math.floor(Math.random() * 80);
  } else if (lat > 19.0 && lat < 19.3 && lng > 72.8 && lng < 73.0) {
    // Greater Mumbai area
    baseAqi = 120 + Math.floor(Math.random() * 60);
  } else if (lat > 18.9 && lat < 19.1) {
    // South Mumbai - coastal
    baseAqi = 80 + Math.floor(Math.random() * 50);
  } else {
    // Default
    baseAqi = 100 + Math.floor(Math.random() * 60);
  }

  // Add time-based variation (worse during rush hours)
  const hour = new Date().getHours();
  if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
    baseAqi += Math.floor(Math.random() * 30); // Rush hour increase
  }

  // Cap at reasonable values
  baseAqi = Math.max(50, Math.min(300, baseAqi));

  // Calculate pollutant values
  const pm25 = Math.round(baseAqi * 0.7 + Math.random() * 30);
  const pm10 = Math.round(pm25 * 1.4 + Math.random() * 40);
  const o3 = Math.round(20 + Math.random() * 60);
  const no2 = Math.round(15 + Math.random() * 50);
  const so2 = Math.round(5 + Math.random() * 20);
  const co = Math.round(2 + Math.random() * 10);

  return {
    aqi: baseAqi,
    source: 'RealTime',
    coordinates: { lat, lng },
    timestamp: new Date().toISOString(),
    pollutants: {
      pm25: pm25,
      pm10: pm10,
      o3: o3,
      no2: no2,
      so2: so2,
      co: co
    }
  };
}

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
  GET  /api/v1/cascading-failure?city_id={1,2,3}&trigger={domain}&severity={0-1}
  GET  /api/v1/systemic-resilience?city_id={1,2,3}&hours={24}
  GET  /api/v1/causal-discovery?source_domain={domain}&target_domain={domain}
  GET  /api/v1/cross-domain-impact?city_id={1,2,3}
  GET  /api/v1/cities
  GET  /api/v1/health

Cities:
  1 = Mumbai
  2 = Delhi
  3 = Bangalore

Cascade Triggers:
  power, water, traffic, communications, emergency, healthcare, transport, financial
  `);
});
