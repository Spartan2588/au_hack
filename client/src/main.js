import './styles/global.css';
import { Router } from './core/router.js';
import { initializeApp } from './core/app.js';
import { CityEnvironment } from './utils/CityEnvironment.js';

// Initialize the application
initializeApp();

// Create persistent city environment (with graceful fallback if WebGL fails)
const cityContainer = document.createElement('div');
cityContainer.id = 'city-environment';
cityContainer.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
`;
document.body.insertBefore(cityContainer, document.body.firstChild);

// Initialize CityEnvironment - try to make it work, but don't crash if WebGL fails
let cityEnvironment = null;
try {
  cityEnvironment = new CityEnvironment(cityContainer);
  window.cityEnvironment = cityEnvironment;
  console.log('✅ CityEnvironment initialized successfully - background animation active');
  // Ensure container is visible
  cityContainer.style.display = 'block';
  cityContainer.style.visibility = 'visible';
} catch (error) {
  console.error('❌ CityEnvironment failed to initialize:', error.message);
  console.warn('⚠️ WebGL is disabled in Chrome. The app will work, but without background animation.');
  console.warn('📖 To enable WebGL:');
  console.warn('   1. Go to chrome://settings/system');
  console.warn('   2. Enable "Use hardware acceleration when available"');
  console.warn('   3. Go to chrome://flags and enable "WebGL 2.0"');
  console.warn('   4. Restart Chrome');
  console.warn('   See ENABLE_WEBGL_CHROME.md for detailed instructions');
  
  // Create a dummy object so code that checks for cityEnvironment doesn't break
  window.cityEnvironment = {
    updateCityState: () => {},
    animateCityTransition: () => {},
    update: () => {}
  };
  // Hide the container if WebGL failed
  cityContainer.style.display = 'none';
}

// Initialize router
const router = new Router();
router.init();
