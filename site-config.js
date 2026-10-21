// Public configuration only. Never put API keys or server secrets here.
window.BU_SITE_CONFIG = Object.freeze({
  inquiryEndpoint: "", // Approved deployed HTTPS URL ending /api/inquiries
  turnstileSiteKey: "" // Public site key; server secret belongs only in Worker secrets
});
