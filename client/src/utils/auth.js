/**
 * Authentication utility for portal access
 * Manages login state via localStorage
 */

export const PortalType = {
    HOSPITAL: 'hospital',
    GOVERNMENT: 'government',
    USER: 'user'
};

export const Auth = {
    /**
     * Check if user is logged into a specific portal
     */
    isLoggedIn(portalType) {
        const session = localStorage.getItem(`portal_session_${portalType}`);
        return session !== null;
    },

    /**
     * Get current session data
     */
    getSession(portalType) {
        const session = localStorage.getItem(`portal_session_${portalType}`);
        return session ? JSON.parse(session) : null;
    },

    /**
     * Login to a portal
     */
    login(portalType, credentials) {
        const session = {
            portalType,
            ...credentials,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem(`portal_session_${portalType}`, JSON.stringify(session));
        return session;
    },

    /**
     * Logout from a portal
     */
    logout(portalType) {
        localStorage.removeItem(`portal_session_${portalType}`);
    },

    /**
     * Logout from all portals
     */
    logoutAll() {
        Object.values(PortalType).forEach(type => {
            localStorage.removeItem(`portal_session_${type}`);
        });
    }
};
