(() => {
  'use strict';
  const universe = document.querySelector('.project-universe');
  const modal = document.getElementById('project-modal');
  const main = document.querySelector('main');
  if (!universe || !modal || !main) return;
  const syncVisibility = () => { document.documentElement.dataset.projectPageHidden = String(document.hidden); };
  syncVisibility();
  document.addEventListener('visibilitychange', syncVisibility);
  universe.querySelectorAll('.project-planet').forEach(button => {
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'project-modal');
  });
  let wasOpen = false;
  let returnFocus = null;
  let previousInert = false;
  universe.addEventListener('click', event => {
    const button = event.target.closest('.project-planet');
    if (button && universe.contains(button)) returnFocus = button;
  }, true);
  const syncDialog = () => {
    const open = modal.classList.contains('is-open');
    if (open && !wasOpen) {
      if (!returnFocus?.isConnected) returnFocus = document.activeElement;
      previousInert = main.inert;
      main.inert = true;
      modal.querySelector('.project-modal-close')?.focus({preventScroll: true});
    } else if (!open && wasOpen) {
      main.inert = previousInert;
      if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
    }
    wasOpen = open;
  };
  new MutationObserver(syncDialog).observe(modal, {attributes: true, attributeFilter: ['class']});
  modal.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !wasOpen) return;
    const focusable = [...modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')].filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
})();
