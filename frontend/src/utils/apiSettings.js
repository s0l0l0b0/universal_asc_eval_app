const STORAGE_KEY = 'ai_provider_settings';

// Load API settings from localStorage
export const loadApiSettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load API settings:', e);
  }
  return { openai: '', anthropic: '', deepseek: '' };
};

// Save API settings to localStorage
export const saveApiSettings = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('Failed to save API settings:', e);
    return false;
  }
};

export { STORAGE_KEY };

