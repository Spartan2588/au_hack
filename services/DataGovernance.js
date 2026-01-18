/**
 * Data Governance Layer - In-Memory Mock (Fix for Node 25 compatibility)
 * Manages metadata, lineage, versioning for production-scale data operations
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DataGovernance {
  constructor(dbPath = null) {
    console.log('[DataGovernance] Initializing IN-MEMORY mode (better-sqlite3 disabled)');
    
    // In-memory stores
    this.metadata = [];
    this.lineage = [];
    this.versions = [];
    this.crossDomainLinks = [];
    this.resilienceMetrics = [];
  }

  initializeDatabase() {
    // No-op for in-memory
  }

  /**
   * Register metadata for a data entity
   */
  registerMetadata(entityType, entityId, cityId, domain, metadata) {
    // Upsert logic
    const index = this.metadata.findIndex(m => 
      m.entity_type === entityType && 
      m.entity_id === entityId && 
      m.city_id === cityId && 
      m.domain === domain
    );

    const record = {
      id: index >= 0 ? this.metadata[index].id : this.metadata.length + 1,
      entity_type: entityType,
      entity_id: entityId,
      city_id: cityId,
      domain: domain,
      schema_version: metadata.schemaVersion || '1.0',
      data_source: metadata.dataSource || 'unknown',
      quality_score: metadata.qualityScore || 1.0,
      attributes: JSON.stringify(metadata.attributes || {}),
      last_updated: new Date().toISOString()
    };

    if (index >= 0) {
      this.metadata[index] = record;
    } else {
      this.metadata.push(record);
    }
  }

  /**
   * Record data lineage (data flow relationships)
   */
  recordLineage(source, target, transformation, lagHours = 0, correlation = null, confidence = null) {
    this.lineage.push({
      id: this.lineage.length + 1,
      source_entity_type: source.type,
      source_entity_id: source.id,
      target_entity_type: target.type,
      target_entity_id: target.id,
      transformation: transformation || 'direct',
      lag_hours: lagHours,
      correlation_score: correlation,
      confidence: confidence,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Create version snapshot
   */
  createVersion(entityType, entityId, cityId, snapshotData) {
    // Find max version
    const entityVersions = this.versions.filter(v => 
      v.entity_type === entityType && 
      v.entity_id === entityId && 
      v.city_id === cityId
    );
    
    const maxVersion = entityVersions.reduce((max, v) => Math.max(max, v.version), 0);
    const nextVersion = maxVersion + 1;

    // Simple checksum
    const checksum = this.calculateChecksum(JSON.stringify(snapshotData));

    this.versions.push({
      id: this.versions.length + 1,
      entity_type: entityType,
      entity_id: entityId,
      city_id: cityId,
      version: nextVersion,
      snapshot_data: JSON.stringify(snapshotData),
      checksum: checksum,
      created_at: new Date().toISOString(),
      created_by: 'system'
    });

    return nextVersion;
  }

  /**
   * Register cross-domain causal link
   */
  registerCrossDomainLink(sourceDomain, sourceMetric, targetDomain, targetMetric, 
                          lagHours, correlation, causalConfidence, domainLogic) {
    this.crossDomainLinks.push({
      id: this.crossDomainLinks.length + 1,
      source_domain: sourceDomain,
      source_metric: sourceMetric,
      target_domain: targetDomain,
      target_metric: targetMetric,
      lag_hours: lagHours,
      correlation: correlation,
      causal_confidence: causalConfidence,
      validation_status: 'pending', // Default
      domain_logic: domainLogic,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Calculate systemic resilience metrics
   */
  calculateSystemicResilience(cityId, urbanScore, healthScore, agricultureScore) {
    // Cross-domain risk assessment
    const crossDomainRisk = this.assessCrossDomainRisk(cityId);
    
    // Weighted systemic resilience (not just sum of parts)
    const systemicResilience = (
      urbanScore * 0.35 +
      healthScore * 0.35 +
      agricultureScore * 0.30
    ) - (crossDomainRisk * 0.2); // Penalize cross-domain vulnerabilities

    const finalResilience = Math.max(0, Math.min(1, systemicResilience));

    this.resilienceMetrics.push({
      id: this.resilienceMetrics.length + 1,
      city_id: cityId,
      timestamp: new Date().toISOString(),
      urban_health_score: urbanScore,
      health_health_score: healthScore,
      agriculture_health_score: agricultureScore,
      systemic_resilience: finalResilience,
      cross_domain_risk: crossDomainRisk
    });

    return {
      urbanScore,
      healthScore,
      agricultureScore,
      systemicResilience: finalResilience,
      crossDomainRisk
    };
  }

  /**
   * Assess cross-domain risk based on causal links
   */
  assessCrossDomainRisk(cityId) {
    // Logic: Average of (confidence * (1 - abs(correlation))) for validated links
    // Note: cityId isn't used in the original SQL query for this method either (it aggregates all links)
    
    const validatedLinks = this.crossDomainLinks.filter(l => l.validation_status === 'validated');
    
    if (validatedLinks.length === 0) return 0;

    const totalRisk = validatedLinks.reduce((sum, link) => {
      return sum + (link.causal_confidence * (1 - Math.abs(link.correlation)));
    }, 0);

    return totalRisk / validatedLinks.length;
  }

  /**
   * Get causal discovery results (lagged correlations)
   */
  getCausalLinks(sourceDomain = null, targetDomain = null) {
    let links = this.crossDomainLinks;

    if (sourceDomain) {
      links = links.filter(l => l.source_domain === sourceDomain);
    }

    if (targetDomain) {
      links = links.filter(l => l.target_domain === targetDomain);
    }

    // Sort by causal_confidence DESC
    return [...links].sort((a, b) => b.causal_confidence - a.causal_confidence);
  }

  /**
   * Get systemic resilience for a city
   */
  getSystemicResilience(cityId, hours = 24) {
    // Filter by city
    let metrics = this.resilienceMetrics.filter(m => m.city_id === cityId);
    
    // Sort by timestamp DESC
    metrics.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit (mock implementation ignores 'hours' logic exact match, just takes recent if needed, or returns all filtered)
    // The original SQL used LIMIT ?, passing 'hours' which is weird (usually LIMIT is count). 
    // Assuming 'hours' in SQL context was meant to be count or time range? 
    // SQL: LIMIT ? -> if hours=24, it returns 24 rows?
    // Let's assume it returns 'hours' number of records.
    return metrics.slice(0, hours);
  }

  /**
   * Get data lineage for an entity
   */
  getLineage(entityType, entityId, direction = 'both') {
    if (direction === 'source' || direction === 'both') {
      return this.lineage.filter(l => l.source_entity_type === entityType && l.source_entity_id === entityId);
    } else {
      return this.lineage.filter(l => l.target_entity_type === entityType && l.target_entity_id === entityId);
    }
  }
  
  // Helper to validate links for the mock (since we don't have the SQL update)
  validateLinkInternal(sqlPredicate) {
      // Mock validation logic mimicking: UPDATE ... SET validation_status='validated' WHERE causal_confidence >= 0.65
      this.crossDomainLinks.forEach(link => {
          if (link.causal_confidence >= 0.65) {
              link.validation_status = 'validated';
          }
      });
  }
  
  // Custom method to support the direct execution of DB statements if any other code uses .db property
  get db() {
      return {
          prepare: (sql) => {
              // Very basic mock for prepare statements used in validation
              if (sql.includes('UPDATE cross_domain_links')) {
                  return {
                      run: () => this.validateLinkInternal()
                  };
              }
              return {
                  run: () => {},
                  get: () => ({}),
                  all: () => []
              };
          },
          exec: () => {},
          close: () => {}
      };
  }

  calculateChecksum(data) {
    // Simple hash for checksum
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  close() {
    // No-op
  }
}
