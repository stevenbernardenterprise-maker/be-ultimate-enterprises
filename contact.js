(() => {
  'use strict';

  const ERROR_COPY = 'We couldn’t send your message. Please try again later or email headquarters@beultimateenterprises.com.';
  const FORM_COPY = {
    general: {
      success: 'Thanks—your inquiry has been sent to our headquarters team. We’ll follow up using the email address you provided.'
    },
    'report-review': {
      success: 'Thanks—your pilot-discussion inquiry has been sent to our headquarters team. We’ll follow up using the email address you provided.'
    }
  };

  const config = window.BU_SITE_CONFIG || {};
  let endpoint;
  try {
    endpoint = new URL(config.inquiryEndpoint);
  } catch {
    endpoint = null;
  }
  const siteKey = typeof config.turnstileSiteKey === 'string' ? config.turnstileSiteKey.trim() : '';
  const configured = Boolean(endpoint && endpoint.protocol === 'https:' &&
    (endpoint.hostname === 'workers.dev' || endpoint.hostname.endsWith('.workers.dev')) &&
    !endpoint.username && !endpoint.password && endpoint.pathname === '/api/inquiries' &&
    !endpoint.search && !endpoint.hash && /^0x4[A-Za-z0-9_-]{20,}$/.test(siteKey));

  document.querySelectorAll('form[data-inquiry-form]').forEach(form => {
    const formId = form.dataset.inquiryForm;
    const copy = FORM_COPY[formId];
    if (!copy) return;

    const status = form.querySelector('[data-form-status]');
    const submit = form.querySelector('[type="submit"]');
    const challenge = form.querySelector('[data-turnstile-container]');
    const category = form.querySelector('[name="category"]');
    let token = '';
    let widgetId;
    let busy = false;

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || !configured || !form.reportValidity() || !token) return;

      const fields = Object.fromEntries(new FormData(form));
      const name = (fields.name || '').trim();
      const email = (fields.email || '').trim();
      const organization = (fields.organization || '').trim();
      const message = (fields.message || '').trim();
      const website = fields.website || '';
      if (!name || !email || !message || name.length > 120 || email.length > 200 ||
          organization.length > 160 || message.length < 1 || message.length > 4000) {
        showStatus(ERROR_COPY, true);
        return;
      }
      if (website) {
        showStatus(ERROR_COPY, true);
        resetChallenge();
        return;
      }

      const payload = {
        formId,
        name,
        email,
        organization,
        message,
        website,
        turnstileToken: token
      };
      if (formId === 'general') payload.category = fields.category || '';

      busy = true;
      form.setAttribute('aria-busy', 'true');
      submit.disabled = true;
      status.textContent = '';
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(endpoint.href, {
          method: 'POST',
          credentials: 'omit',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        let result;
        try { result = await response.json(); } catch { result = null; }
        if (!response.ok || !result || result.ok !== true) throw new Error('request-failed');
        form.reset();
        showStatus(copy.success, true);
      } catch {
        showStatus(ERROR_COPY, true);
      } finally {
        window.clearTimeout(timeout);
        busy = false;
        form.removeAttribute('aria-busy');
        resetChallenge();
      }
    });

    function showStatus(message, focus) {
      status.textContent = message;
      if (focus) status.focus();
    }

    function resetChallenge() {
      token = '';
      submit.disabled = true;
      if (window.turnstile && widgetId !== undefined) {
        try { window.turnstile.reset(widgetId); } catch { /* Challenge reset is best-effort. */ }
      }
    }

    if (category) {
      document.querySelectorAll('[data-inquiry-category]').forEach(link => {
        link.addEventListener('click', () => {
          category.value = link.dataset.inquiryCategory;
        });
      });
      try {
        const selected = sessionStorage.getItem('bu-inquiry-category');
        if (['Energy & Mining', 'Mentorship & Youth Development'].includes(selected)) {
          category.value = selected;
        }
        sessionStorage.removeItem('bu-inquiry-category');
      } catch { /* Browser storage is optional. */ }
    }

    if (!configured) {
      status.textContent = ERROR_COPY;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      if (!window.turnstile) {
        status.textContent = ERROR_COPY;
        return;
      }
      try {
        widgetId = window.turnstile.render(challenge, {
          sitekey: siteKey,
          action: formId,
          callback: value => {
            token = value;
            submit.disabled = busy || !token;
          },
          'expired-callback': () => {
            token = '';
            submit.disabled = true;
          },
          'error-callback': () => {
            token = '';
            submit.disabled = true;
            status.textContent = ERROR_COPY;
          }
        });
      } catch {
        status.textContent = ERROR_COPY;
      }
    };
    script.onerror = () => {
      status.textContent = ERROR_COPY;
    };
    document.head.appendChild(script);
  });
})();
