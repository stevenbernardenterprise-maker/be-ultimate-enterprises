(() => {
  'use strict';
  const form = document.querySelector('#contactForm');
  const status = document.querySelector('#formStatus');
  const category = document.querySelector('#category');
  const submit = form.querySelector('[type=submit]');
  form.addEventListener('submit', event => event.preventDefault());
  const config = window.BU_SITE_CONFIG || {};
  let token = '', widgetId;
  document.querySelectorAll('[data-inquiry-category]').forEach(link => {
    link.addEventListener('click', () => { category.value = link.dataset.inquiryCategory; });
  });
  try {
    const selected = sessionStorage.getItem('bu-inquiry-category');
    if (['Energy & Mining', 'Mentorship & Youth Development'].includes(selected)) category.value = selected;
    sessionStorage.removeItem('bu-inquiry-category');
  } catch { /* Browser storage is optional. */ }
  let endpoint;
  try { endpoint = new URL(config.inquiryEndpoint); } catch { return; }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password ||
      endpoint.pathname !== '/api/inquiries' || endpoint.search || endpoint.hash ||
      !config.turnstileSiteKey) return;
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.onload = () => {
    widgetId = window.turnstile.render('#turnstile-container', {
      sitekey: config.turnstileSiteKey,
      action: 'inquiry',
      callback: value => { token = value; submit.disabled = false; },
      'expired-callback': () => { token = ''; submit.disabled = true; },
      'error-callback': () => {
        token = ''; submit.disabled = true;
        status.textContent = 'Verification is unavailable. Please use the email contact instead.';
      }
    });
    document.querySelector('#setupNotice').textContent =
      'Complete verification to send a general inquiry. Do not submit sensitive documents or payment details.';
  };
  script.onerror = () => {
    status.textContent = 'Verification could not load. Please use the email contact instead.';
  };
  document.head.appendChild(script);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity() || !token) return;
    const data = Object.fromEntries(new FormData(form));
    if (!data.name.trim() || data.message.trim().length < 20) {
      status.textContent = 'Please complete the required fields and provide at least 20 characters.';
      return;
    }
    data.turnstileToken = token;
    submit.disabled = true;
    status.textContent = 'Sending…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint.href, {
        method: 'POST', credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('not-confirmed');
      form.reset();
      status.textContent = 'Thank you. Your inquiry has been accepted for email delivery.';
    } catch {
      status.textContent = 'Delivery could not be confirmed. Please contact headquarters@beultimateenterprises.com before resubmitting.';
    } finally {
      clearTimeout(timeout);
      token = '';
      if (window.turnstile && widgetId !== undefined) window.turnstile.reset(widgetId);
    }
  });
})();
