(() => {
  const menuButton = document.querySelector('[data-menu-button]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  const body = document.body;

  if (menuButton && mobileNav) {
    const setMenu = (isOpen) => {
      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
      mobileNav.hidden = !isOpen;
      body.classList.toggle('menu-open', isOpen);
    };
    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  }

  const interestButton = document.querySelector('[data-interest-button]');
  const interestMessage = document.querySelector('[data-interest-message]');
  if (interestButton && interestMessage) {
    interestButton.addEventListener('click', () => {
      interestMessage.hidden = false;
      interestMessage.focus();
      interestButton.setAttribute('aria-expanded', 'true');
    });
  }
})();
