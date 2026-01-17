export class ApiClient {
  constructor(baseUrl = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  async getCurrentState(cityId = 1) {
    try {
      const response = await fetch(`${this.baseUrl}/current-state?city_id=${cityId}`);
      if (!response.ok) throw new Error('Failed to fetch current state');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async getRiskAssessment(cityId = 1) {
    try {
      const response = await fetch(`${this.baseUrl}/risk-assessment?city_id=${cityId}`);
      if (!response.ok) throw new Error('Failed to fetch risk assessment');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async simulateScenario(params) {
    try {
      const response = await fetch(`${this.baseUrl}/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!response.ok) throw new Error('Failed to simulate scenario');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async getHistoricalData(cityId = 1, hours = 24) {
    try {
      const response = await fetch(`${this.baseUrl}/historical?city_id=${cityId}&hours=${hours}`);
      if (!response.ok) throw new Error('Failed to fetch historical data');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
}
