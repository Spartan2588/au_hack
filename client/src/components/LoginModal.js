import { Auth, PortalType } from '../utils/auth.js';
import gsap from 'gsap';
import '../styles/components/login-modal.css';

/**
 * Login Modal Component
 * Handles authentication for different portal types
 */
export class LoginModal {
    constructor(portalType, onSuccess) {
        this.portalType = portalType;
        this.onSuccess = onSuccess;
        this.modal = null;
    }

    getPortalConfig() {
        const configs = {
            [PortalType.HOSPITAL]: {
                title: 'Hospital Portal Login',
                icon: '🏥',
                color: '#dc2626',
                fields: [
                    { name: 'hospitalName', label: 'Hospital Name', type: 'text', placeholder: 'Enter hospital name' },
                    { name: 'licenseNumber', label: 'Medical License Number', type: 'text', placeholder: 'Enter license number' }
                ]
            },
            [PortalType.GOVERNMENT]: {
                title: 'Government Portal Login',
                icon: '🏛️',
                color: '#3b82f6',
                fields: [
                    { name: 'department', label: 'Department Name', type: 'text', placeholder: 'Enter department' },
                    { name: 'governmentId', label: 'Government ID', type: 'text', placeholder: 'Enter government ID' }
                ]
            },
            [PortalType.USER]: {
                title: 'Citizen Portal Login',
                icon: '👤',
                color: '#10b981',
                fields: [
                    { name: 'name', label: 'Your Name', type: 'text', placeholder: 'Enter your name' },
                    { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: 'Enter phone number' }
                ]
            }
        };
        return configs[this.portalType];
    }

    render() {
        const config = this.getPortalConfig();

        // Create modal overlay
        this.modal = document.createElement('div');
        this.modal.className = 'login-modal-overlay';
        this.modal.innerHTML = `
      <div class="login-modal glass">
        <button class="login-modal-close" id="modal-close">&times;</button>
        <div class="login-modal-header" style="border-color: ${config.color}">
          <span class="login-modal-icon">${config.icon}</span>
          <h2>${config.title}</h2>
        </div>
        <form class="login-modal-form" id="login-form">
          ${config.fields.map(field => `
            <div class="form-group">
              <label for="${field.name}">${field.label}</label>
              <input 
                type="${field.type}" 
                id="${field.name}" 
                name="${field.name}" 
                placeholder="${field.placeholder}"
                required
              />
            </div>
          `).join('')}
          <button type="submit" class="btn btn-primary" style="background: ${config.color}">
            Login to Portal
          </button>
        </form>
      </div>
    `;

        document.body.appendChild(this.modal);

        // Animate in
        gsap.fromTo(this.modal.querySelector('.login-modal'),
            { opacity: 0, scale: 0.9, y: 20 },
            { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        );

        // Setup event listeners
        this.setupEvents();
    }

    setupEvents() {
        const closeBtn = this.modal.querySelector('#modal-close');
        const form = this.modal.querySelector('#login-form');
        const overlay = this.modal;

        closeBtn.addEventListener('click', () => this.close());

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const credentials = {};
            formData.forEach((value, key) => {
                credentials[key] = value;
            });

            // Perform login
            Auth.login(this.portalType, credentials);

            // Animate out and callback
            this.close(() => {
                if (this.onSuccess) this.onSuccess(credentials);
            });
        });
    }

    close(callback) {
        gsap.to(this.modal.querySelector('.login-modal'), {
            opacity: 0,
            scale: 0.9,
            y: 20,
            duration: 0.2,
            ease: 'power2.in',
            onComplete: () => {
                this.modal.remove();
                if (callback) callback();
            }
        });
    }
}
