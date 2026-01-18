/**
 * Model Calibration and Validation Service
 * Validates cascade model against real historical disaster data
 * Provides calibration metrics and parameter tuning recommendations
 */

export class ModelCalibration {
  /**
   * Historical disaster reference data
   * Real-world cascade incidents with measured impacts
   */
  static HISTORICAL_DISASTERS = {
    northeast_blackout_2003: {
      name: '2003 Northeast Blackout',
      date: '2003-08-14',
      trigger: 'power',
      initial_severity: 0.85,
      duration_hours: 29,
      // Real measured impacts
      affected_domains: 8,
      cascades: [
        { domain: 'water', time_hours: 2, severity: 0.6 },
        { domain: 'communications', time_hours: 1, severity: 0.8 },
        { domain: 'transport', time_hours: 3, severity: 0.7 },
        { domain: 'emergency', time_hours: 1.5, severity: 0.5 },
        { domain: 'financial', time_hours: 2, severity: 0.6 },
        { domain: 'healthcare', time_hours: 2.5, severity: 0.4 },
        { domain: 'traffic', time_hours: 1, severity: 0.9 }
      ],
      economic_cost_usd: 6000000000, // $6 billion
      population_affected: 50000000, // 50 million
      recovery_time_hours: 29,
      reference: 'U.S.-Canada Power System Outage Task Force Report'
    },
    japan_tsunami_2011: {
      name: '2011 Japan Tsunami (Fukushima)',
      date: '2011-03-11',
      trigger: 'power',
      initial_severity: 0.95,
      duration_hours: 72,
      affected_domains: 10,
      cascades: [
        { domain: 'water', time_hours: 1, severity: 0.8 },
        { domain: 'transport', time_hours: 2, severity: 0.9 },
        { domain: 'communications', time_hours: 1, severity: 0.7 },
        { domain: 'emergency', time_hours: 0.5, severity: 0.9 },
        { domain: 'healthcare', time_hours: 1, severity: 0.8 },
        { domain: 'food_supply', time_hours: 6, severity: 0.7 },
        { domain: 'fuel_energy', time_hours: 4, severity: 0.8 },
        { domain: 'waste_management', time_hours: 12, severity: 0.6 },
        { domain: 'government', time_hours: 3, severity: 0.5 }
      ],
      economic_cost_usd: 210000000000, // $210 billion
      population_affected: 10000000, // 10 million directly affected
      recovery_time_hours: 720, // ~30 days for basic services
      reference: 'World Bank Japan Earthquake and Tsunami Report'
    },
    hurricane_katrina_2005: {
      name: 'Hurricane Katrina (New Orleans)',
      date: '2005-08-29',
      trigger: 'water',
      initial_severity: 0.9,
      duration_hours: 168, // 7 days for initial crisis
      affected_domains: 11,
      cascades: [
        { domain: 'power', time_hours: 1, severity: 0.9 },
        { domain: 'emergency', time_hours: 0.5, severity: 0.9 },
        { domain: 'healthcare', time_hours: 2, severity: 0.8 },
        { domain: 'transport', time_hours: 3, severity: 0.9 },
        { domain: 'communications', time_hours: 2, severity: 0.7 },
        { domain: 'food_supply', time_hours: 12, severity: 0.8 },
        { domain: 'waste_management', time_hours: 6, severity: 0.9 },
        { domain: 'fuel_energy', time_hours: 4, severity: 0.7 },
        { domain: 'traffic', time_hours: 2, severity: 0.8 },
        { domain: 'government', time_hours: 8, severity: 0.6 }
      ],
      economic_cost_usd: 125000000000, // $125 billion
      population_affected: 1500000, // 1.5 million displaced
      recovery_time_hours: 2160, // ~90 days
      reference: 'National Hurricane Center/Tropical Prediction Center'
    },
    texas_power_crisis_2021: {
      name: 'Texas Power Crisis (Winter Storm Uri)',
      date: '2021-02-14',
      trigger: 'power',
      initial_severity: 0.75,
      duration_hours: 96, // 4 days
      affected_domains: 7,
      cascades: [
        { domain: 'water', time_hours: 12, severity: 0.7 },
        { domain: 'transport', time_hours: 24, severity: 0.6 },
        { domain: 'emergency', time_hours: 6, severity: 0.5 },
        { domain: 'healthcare', time_hours: 8, severity: 0.6 },
        { domain: 'food_supply', time_hours: 36, severity: 0.5 },
        { domain: 'fuel_energy', time_hours: 18, severity: 0.7 }
      ],
      economic_cost_usd: 20000000000, // $20 billion
      population_affected: 4500000, // 4.5 million
      recovery_time_hours: 96,
      reference: 'ERCOT and FERC Reports'
    },
    india_blackout_2012: {
      name: '2012 India Blackout (Northern Grid)',
      date: '2012-07-30',
      trigger: 'power',
      initial_severity: 0.9,
      duration_hours: 15,
      affected_domains: 8,
      cascades: [
        { domain: 'water', time_hours: 2, severity: 0.8 },
        { domain: 'transport', time_hours: 1, severity: 0.9 },
        { domain: 'communications', time_hours: 1, severity: 0.7 },
        { domain: 'traffic', time_hours: 0.5, severity: 0.95 },
        { domain: 'healthcare', time_hours: 2, severity: 0.6 },
        { domain: 'emergency', time_hours: 1.5, severity: 0.5 },
        { domain: 'financial', time_hours: 3, severity: 0.4 }
      ],
      economic_cost_usd: 800000000, // $800 million (estimated)
      population_affected: 600000000, // 600 million
      recovery_time_hours: 15,
      reference: 'Power Grid Corporation of India Reports'
    }
  };

  /**
   * Validate model output against historical disaster
   * @param {Object} modelOutput - Model cascade simulation result
   * @param {string} historicalKey - Key from HISTORICAL_DISASTERS
   * @returns {Object} Validation metrics and differences
   */
  static validateAgainstHistorical(modelOutput, historicalKey) {
    const historical = this.HISTORICAL_DISASTERS[historicalKey];
    if (!historical) {
      throw new Error(`Historical disaster not found: ${historicalKey}`);
    }

    const impact = modelOutput.total_impact || {};
    const cascades = modelOutput.cascades || [];

    // Calculate differences
    const validation = {
      historical_disaster: historical.name,
      date: historical.date,
      validation_metrics: {
        affected_domains: {
          historical: historical.affected_domains,
          model: impact.affected_domains || 0,
          difference: (impact.affected_domains || 0) - historical.affected_domains,
          error_percent: this.percentError(impact.affected_domains || 0, historical.affected_domains),
          accuracy_score: this.calculateAccuracy(impact.affected_domains || 0, historical.affected_domains)
        },
        economic_cost: {
          historical: historical.economic_cost_usd,
          model: impact.estimated_economic_cost || 0,
          difference: (impact.estimated_economic_cost || 0) - historical.economic_cost_usd,
          error_percent: this.percentError(impact.estimated_economic_cost || 0, historical.economic_cost_usd),
          accuracy_score: this.calculateAccuracy(impact.estimated_economic_cost || 0, historical.economic_cost_usd)
        },
        recovery_time: {
          historical: historical.recovery_time_hours,
          model: impact.recovery_time_hours || 0,
          difference: (impact.recovery_time_hours || 0) - historical.recovery_time_hours,
          error_percent: this.percentError(impact.recovery_time_hours || 0, historical.recovery_time_hours),
          accuracy_score: this.calculateAccuracy(impact.recovery_time_hours || 0, historical.recovery_time_hours)
        },
        cascade_timing: this.validateCascadeTiming(cascades, historical.cascades),
        cascade_severity: this.validateCascadeSeverity(cascades, historical.cascades)
      },
      overall_accuracy: 0,
      calibration_status: 'unknown',
      recommendations: []
    };

    // Calculate overall accuracy (weighted average)
    const weights = {
      affected_domains: 0.2,
      economic_cost: 0.3,
      recovery_time: 0.2,
      cascade_timing: 0.15,
      cascade_severity: 0.15
    };

    validation.overall_accuracy = 
      validation.validation_metrics.affected_domains.accuracy_score * weights.affected_domains +
      validation.validation_metrics.economic_cost.accuracy_score * weights.economic_cost +
      validation.validation_metrics.recovery_time.accuracy_score * weights.recovery_time +
      validation.validation_metrics.cascade_timing.accuracy_score * weights.cascade_timing +
      validation.validation_metrics.cascade_severity.accuracy_score * weights.cascade_severity;

    // Determine calibration status
    if (validation.overall_accuracy >= 0.8) {
      validation.calibration_status = 'well_calibrated';
    } else if (validation.overall_accuracy >= 0.6) {
      validation.calibration_status = 'moderately_calibrated';
    } else {
      validation.calibration_status = 'poorly_calibrated';
    }

    // Generate calibration recommendations
    validation.recommendations = this.generateCalibrationRecommendations(validation);

    return validation;
  }

  /**
   * Validate cascade timing against historical data
   */
  static validateCascadeTiming(modelCascades, historicalCascades) {
    if (!modelCascades || !historicalCascades) {
      return { accuracy_score: 0, errors: [] };
    }

    const errors = [];
    const domainTiming = {};

    // Map historical cascades by domain
    historicalCascades.forEach(h => {
      domainTiming[h.domain] = h.time_hours;
    });

    // Compare model cascades
    modelCascades.forEach(model => {
      const historical = domainTiming[model.domain];
      if (historical !== undefined) {
        const error = Math.abs(model.impact_time_hours - historical);
        errors.push({
          domain: model.domain,
          model_time: model.impact_time_hours,
          historical_time: historical,
          error: error,
          error_percent: this.percentError(model.impact_time_hours, historical)
        });
      }
    });

    // Calculate average accuracy
    const avgError = errors.length > 0 
      ? errors.reduce((sum, e) => sum + Math.abs(e.error_percent), 0) / errors.length 
      : 100;
    const accuracy_score = Math.max(0, 1 - (avgError / 100));

    return {
      accuracy_score,
      errors,
      matched_domains: errors.length,
      total_historical: historicalCascades.length
    };
  }

  /**
   * Validate cascade severity against historical data
   */
  static validateCascadeSeverity(modelCascades, historicalCascades) {
    if (!modelCascades || !historicalCascades) {
      return { accuracy_score: 0, errors: [] };
    }

    const errors = [];
    const domainSeverity = {};

    historicalCascades.forEach(h => {
      domainSeverity[h.domain] = h.severity;
    });

    modelCascades.forEach(model => {
      const historical = domainSeverity[model.domain];
      if (historical !== undefined) {
        const errorPercent = this.percentError(model.severity, historical);
        errors.push({
          domain: model.domain,
          model_severity: model.severity,
          historical_severity: historical,
          error_percent: errorPercent
        });
      }
    });

    const avgError = errors.length > 0
      ? errors.reduce((sum, e) => sum + Math.abs(e.error_percent), 0) / errors.length
      : 100;
    const accuracy_score = Math.max(0, 1 - (avgError / 100));

    return {
      accuracy_score,
      errors,
      matched_domains: errors.length
    };
  }

  /**
   * Calculate percent error
   */
  static percentError(modelValue, historicalValue) {
    if (historicalValue === 0) return modelValue === 0 ? 0 : 100;
    return ((modelValue - historicalValue) / historicalValue) * 100;
  }

  /**
   * Calculate accuracy score (0-1, where 1 is perfect)
   */
  static calculateAccuracy(modelValue, historicalValue) {
    const errorPercent = Math.abs(this.percentError(modelValue, historicalValue));
    // Accuracy decreases linearly with error, capped at 50% error = 0 accuracy
    return Math.max(0, 1 - (errorPercent / 50));
  }

  /**
   * Generate calibration recommendations based on validation results
   */
  static generateCalibrationRecommendations(validation) {
    const recommendations = [];
    const metrics = validation.validation_metrics;

    // Economic cost recommendations
    if (Math.abs(metrics.economic_cost.error_percent) > 30) {
      if (metrics.economic_cost.model < metrics.economic_cost.historical) {
        recommendations.push({
          parameter: 'ECONOMIC_IMPACT_COSTS',
          issue: 'Economic costs are underestimated',
          current_error: `${metrics.economic_cost.error_percent.toFixed(1)}%`,
          suggestion: 'Increase base economic cost multipliers by 20-40%',
          priority: 'high'
        });
      } else {
        recommendations.push({
          parameter: 'ECONOMIC_IMPACT_COSTS',
          issue: 'Economic costs are overestimated',
          current_error: `${metrics.economic_cost.error_percent.toFixed(1)}%`,
          suggestion: 'Reduce base economic cost multipliers by 15-30%',
          priority: 'medium'
        });
      }
    }

    // Recovery time recommendations
    if (Math.abs(metrics.recovery_time.error_percent) > 25) {
      if (metrics.recovery_time.model < metrics.recovery_time.historical) {
        recommendations.push({
          parameter: 'recovery_rate',
          issue: 'Recovery times are too fast',
          current_error: `${metrics.recovery_time.error_percent.toFixed(1)}%`,
          suggestion: 'Reduce recovery_rate values by 10-20%',
          priority: 'high'
        });
      } else {
        recommendations.push({
          parameter: 'recovery_rate',
          issue: 'Recovery times are too slow',
          current_error: `${metrics.recovery_time.error_percent.toFixed(1)}%`,
          suggestion: 'Increase recovery_rate values by 15-25%',
          priority: 'medium'
        });
      }
    }

    // Cascade timing recommendations
    if (metrics.cascade_timing.accuracy_score < 0.7) {
      recommendations.push({
        parameter: 'dependency_strength',
        issue: 'Cascade propagation timing is inaccurate',
        current_accuracy: `${(metrics.cascade_timing.accuracy_score * 100).toFixed(1)}%`,
        suggestion: 'Adjust dependency strengths to better match historical propagation rates',
        priority: 'medium'
      });
    }

    // Cascade severity recommendations
    if (metrics.cascade_severity.accuracy_score < 0.7) {
      recommendations.push({
        parameter: 'resilience',
        issue: 'Cascade severity is inaccurate',
        current_accuracy: `${(metrics.cascade_severity.accuracy_score * 100).toFixed(1)}%`,
        suggestion: 'Adjust resilience values to better match historical impact severity',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Run validation against all historical disasters
   * @param {Function} simulateFunction - Function that runs simulation with given parameters
   * @returns {Object} Validation results for all disasters
   */
  static async validateAllHistorical(simulateFunction) {
    const results = {};

    for (const [key, historical] of Object.entries(this.HISTORICAL_DISASTERS)) {
      try {
        // Simulate the historical disaster
        const modelOutput = await simulateFunction({
          trigger: historical.trigger,
          severity: historical.initial_severity,
          duration: historical.duration_hours
        });

        // Validate against historical
        results[key] = this.validateAgainstHistorical(modelOutput, key);
      } catch (error) {
        results[key] = {
          error: error.message,
          status: 'failed'
        };
      }
    }

    // Calculate aggregate metrics
    const validations = Object.values(results).filter(r => !r.error);
    const overallAccuracy = validations.length > 0
      ? validations.reduce((sum, v) => sum + (v.overall_accuracy || 0), 0) / validations.length
      : 0;

    return {
      results,
      aggregate_metrics: {
        total_validated: validations.length,
        average_accuracy: overallAccuracy,
        calibration_status: overallAccuracy >= 0.8 ? 'well_calibrated' : 
                           overallAccuracy >= 0.6 ? 'moderately_calibrated' : 'poorly_calibrated'
      },
      recommendations: this.aggregateRecommendations(results)
    };
  }

  /**
   * Aggregate recommendations from all validations
   */
  static aggregateRecommendations(results) {
    const recommendations = [];
    const paramIssues = {};

    Object.values(results).forEach(result => {
      if (result.recommendations) {
        result.recommendations.forEach(rec => {
          if (!paramIssues[rec.parameter]) {
            paramIssues[rec.parameter] = [];
          }
          paramIssues[rec.parameter].push(rec);
        });
      }
    });

    // Consolidate recommendations by parameter
    Object.entries(paramIssues).forEach(([param, issues]) => {
      const avgError = issues.reduce((sum, i) => {
        const error = parseFloat(i.current_error) || parseFloat(i.current_accuracy) || 0;
        return sum + error;
      }, 0) / issues.length;

      recommendations.push({
        parameter: param,
        affected_disasters: issues.length,
        average_error: avgError.toFixed(1),
        consolidated_suggestion: issues[0].suggestion,
        priority: issues.some(i => i.priority === 'high') ? 'high' : 'medium'
      });
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Validate model against all historical disasters
   * @param {Function} simulationCallback - Async function that runs simulation: async (params) => modelOutput
   * @returns {Object} Aggregated validation results
   */
  static async validateAllHistorical(simulationCallback) {
    const results = {};
    const allValidations = [];
    
    for (const [key, historical] of Object.entries(this.HISTORICAL_DISASTERS)) {
      try {
        // Run simulation with historical parameters
        const modelOutput = await simulationCallback({
          trigger: historical.trigger,
          severity: historical.initial_severity,
          duration: historical.duration_hours
        });

        // Validate against historical data
        const validation = this.validateAgainstHistorical(modelOutput, key);
        results[key] = validation;
        allValidations.push(validation);
      } catch (error) {
        console.error(`[CALIBRATION] Error validating ${key}:`, error);
        results[key] = {
          error: error.message,
          historical_disaster: historical.name
        };
      }
    }

    // Calculate aggregate statistics
    const validResults = allValidations.filter(v => !v.error);
    const avgAccuracy = validResults.length > 0
      ? validResults.reduce((sum, v) => {
          const overall = v.validation_metrics?.overall_accuracy || 0;
          return sum + overall;
        }, 0) / validResults.length
      : 0;

    return {
      total_disasters: Object.keys(this.HISTORICAL_DISASTERS).length,
      validated_count: validResults.length,
      failed_count: allValidations.length - validResults.length,
      average_accuracy: avgAccuracy.toFixed(3),
      per_disaster_results: results,
      summary: {
        domains_accuracy: this.calculateAverageAccuracy(validResults, 'affected_domains'),
        economic_accuracy: this.calculateAverageAccuracy(validResults, 'economic_cost'),
        recovery_accuracy: this.calculateAverageAccuracy(validResults, 'recovery_time')
      }
    };
  }

  /**
   * Calculate average accuracy for a specific metric across all validations
   */
  static calculateAverageAccuracy(validations, metricKey) {
    const accuracies = validations
      .map(v => v.validation_metrics?.[metricKey]?.accuracy_score)
      .filter(score => score !== undefined && !isNaN(score));
    
    if (accuracies.length === 0) return 0;
    return accuracies.reduce((sum, score) => sum + score, 0) / accuracies.length;
  }
}
