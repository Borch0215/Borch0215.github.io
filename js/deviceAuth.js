/**
 * Device Authentication & Fingerprinting
 * Recognizes users by device and maintains persistent sessions
 */

class DeviceAuthManager {
  constructor() {
    this.DEVICE_ID_KEY = 'cw:deviceId';
    this.SESSION_KEY = 'cw:sessionToken';
    this.USER_KEY = 'cw:authUser';
    this.LAST_USER_KEY = 'cw:lastUser';
  }

  /**
   * Generate a unique device fingerprint
   */
  async generateDeviceFingerprint() {
    const components = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      deviceMemory: navigator.deviceMemory || 'unknown',
      screen: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().getTime()
    };

    const fingerprint = JSON.stringify(components);
    return this.hashString(fingerprint);
  }

  /**
   * Simple hash function for fingerprint
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get or create device ID
   */
  async getDeviceId() {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    
    if (!deviceId) {
      deviceId = await this.generateDeviceFingerprint();
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  }

  /**
   * Check if device is recognized (same as before)
   */
  async isDeviceRecognized() {
    const currentDeviceId = await this.getDeviceId();
    const storedDeviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    
    return currentDeviceId === storedDeviceId;
  }

  /**
   * Get or create session token
   */
  getSessionToken() {
    let token = sessionStorage.getItem(this.SESSION_KEY);
    
    if (!token) {
      token = 'token_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem(this.SESSION_KEY, token);
    }
    
    return token;
  }

  /**
   * Save user session for device
   */
  async saveDeviceSession(userData) {
    const deviceId = await this.getDeviceId();
    localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
    localStorage.setItem(this.LAST_USER_KEY, userData.id || userData.name || 'Unknown');
    localStorage.setItem(this.SESSION_KEY + ':' + deviceId, this.getSessionToken());
  }

  /**
   * Get saved user for this device
   */
  getSavedUser() {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Check if user should auto-login
   */
  async canAutoLogin() {
    const isRecognized = await this.isDeviceRecognized();
    const savedUser = this.getSavedUser();
    return isRecognized && !!savedUser;
  }

  /**
   * Clear session (logout)
   */
  clearSession() {
    sessionStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.LAST_USER_KEY);
  }

  /**
   * Clear all device data (full logout)
   */
  clearDeviceData() {
    localStorage.removeItem(this.DEVICE_ID_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.LAST_USER_KEY);
    sessionStorage.removeItem(this.SESSION_KEY);
  }
}

export default new DeviceAuthManager();
