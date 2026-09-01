// ============================================================
//  SEDS Forms Global Configuration (config.js)
//  Edit your Google Apps Script URL or Domain here in ONE place.
//  All pages (index.html, view-form.html, 404.html) automatically load this.
// ============================================================

window.SEDS_CONFIG = {
  // Google Apps Script Web App Deployment URL
  GAS_URL: 'https://script.google.com/macros/s/AKfycbw12wUIO8ST1gvwHIN61TV8PdHuYRP02_VJbr9PG9aic1KLQW8Qfh4Ikw5e3wPnAYVl/exec',

  // Custom Domain Base URL
  CUSTOM_DOMAIN_BASE: 'https://forms.kumaraguruseds.space/',

  // Branding
  ORG_NAME: 'Kumaraguru SEDS',
  LOGO_URL: 'SEDS.png',

  // Storage Keys
  GAS_KEY: 'seds_gas_url',
  FORMS_KEY: 'seds_forms_v2',
  AUTH_KEY: 'seds_admin_auth',
  DELETED_KEY: 'seds_deleted_forms'
};

// Global helper to retrieve active GAS URL
window.getSedsGasUrl = function() {
  var cfgUrl = (window.SEDS_CONFIG && window.SEDS_CONFIG.GAS_URL) || '';
  try {
    var stored = localStorage.getItem('seds_gas_url');
    // If empty or pointing to an obsolete URL, update localStorage automatically
    if (!stored || stored.indexOf('AKfycby8ac7FRHVW') !== -1) {
      if (cfgUrl) localStorage.setItem('seds_gas_url', cfgUrl);
      return cfgUrl;
    }
    return stored || cfgUrl;
  } catch (e) {
    return cfgUrl;
  }
};
