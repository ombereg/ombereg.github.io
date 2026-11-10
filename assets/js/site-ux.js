/* OMBEREG — Russian typography and same-tab back navigation.
   Progressive enhancement: links remain usable with JavaScript disabled. */
(() => {
  'use strict';
  const ROOT = 'ombereg:';
  const NAV_KEY = ROOT + 'internal-navigation';
  const SCROLL_KEY = ROOT + 'scroll:';
  const safeStore = (() => { try { return window.sessionStorage; } catch (_) { return null; } })();
  const pathKey = () => SCROLL_KEY + location.pathname + location.search;
  const saveScroll = () => {
    try { safeStore?.setItem(pathKey(), JSON.stringify({ y: Math.max(0, window.scrollY || 0), t: Date.now() })); }
    catch (_) { /* Storage may be unavailable in private browsing. */ }
  };
  // Tie Russian prepositions, short conjunctions, adverbs such as «как», and particles to the next word.
  // Only user-visible text nodes are changed; URLs and SEO metadata are untouched.
  const shortWord = /(^|[\s(«„"“'—–-])(из-под|из-за|перед|через|между|около|обо|ото|надо|подо|ведь|если|лишь|ещё|уже|что|как|или|где|кто|чем|это|так|тут|там|вот|нам|вам|без|для|над|под|при|про|об|от|из|до|за|на|по|во|ко|со|не|ни|но|бы|же|ли|да|в|к|с|у|о|и|а)([ \t]+)(?=[А-Яа-яЁёA-Za-z0-9«„"“])/giu;
  const excluded = 'script,style,textarea,pre,code,noscript,svg,math,select,option,[contenteditable],[data-no-typography]';
  const adjustText = node => {
    if (!node || node.nodeType !== Node.TEXT_NODE || !node.parentElement?.closest || node.parentElement.closest(excluded) || !/[А-Яа-яЁё]/.test(node.nodeValue || '')) return;
    let next = node.nodeValue;
    for (let i = 0; i < 4; i++) next = next.replace(shortWord, '$1$2\u00a0');
    if (next !== node.nodeValue) node.nodeValue = next;
  };
  function adjustTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) return adjustText(root);
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE && root.matches(excluded)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) adjustText(walker.currentNode);
  }
  function smartBack(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    let internalReferrer = false;
    try { internalReferrer = Boolean(document.referrer) && new URL(document.referrer).origin === location.origin; } catch (_) {}
    let internalEntry = false;
    try {
      const entry = JSON.parse(safeStore?.getItem(NAV_KEY) || 'null');
      internalEntry = Boolean(entry && entry.target === location.pathname + location.search &&
        entry.from !== entry.target && (Date.now() - entry.when) < 30 * 60 * 1000);
    } catch (_) {}
    if (history.length > 1 && (internalReferrer || internalEntry)) {
      event.preventDefault();
      history.back();
    }
  }
  function handleClick(event) {
    const back = event.target.closest?.('a[data-smart-back]');
    if (back) { smartBack(event); return; }
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
    let target;
    try { target = new URL(anchor.href, location.href); } catch (_) { return; }
    if (target.origin !== location.origin || (target.pathname === location.pathname && target.search === location.search)) return;
    saveScroll();
    try { safeStore?.setItem(NAV_KEY, JSON.stringify({ from: location.pathname + location.search, target: target.pathname + target.search, when: Date.now() })); } catch (_) {}
  }
  // Keep native browser restoration. iOS Safari and dynamic galleries sometimes
  // need a second chance after BFCache/back-forward navigation.
  function restorePosition(event) {
    const navigationType = performance?.getEntriesByType?.('navigation')?.[0]?.type;
    if (!event?.persisted && navigationType !== 'back_forward') return;
    let stored;
    try { stored = JSON.parse(safeStore?.getItem(pathKey()) || 'null'); } catch (_) { return; }
    if (!stored || !Number.isFinite(stored.y)) return;
    let userMoved = false;
    const cancel = () => { userMoved = true; };
    window.addEventListener('wheel', cancel, { passive: true, once: true });
    window.addEventListener('touchstart', cancel, { passive: true, once: true });
    window.addEventListener('keydown', cancel, { once: true });
    const restore = () => {
      if (!userMoved && Math.abs(window.scrollY - stored.y) > 3)
        window.scrollTo({ top: stored.y, behavior: 'instant' });
    };
    requestAnimationFrame(() => requestAnimationFrame(restore));
    setTimeout(restore, 220);
    setTimeout(restore, 780);
  }
  function init() {
    adjustTree(document.body);
    document.addEventListener('click', handleClick, true);
    window.addEventListener('pagehide', saveScroll);
    window.addEventListener('pageshow', restorePosition);
    const observer = new MutationObserver(records => {
      const changed = new Set();
      for (const record of records) {
        if (record.type === 'characterData') changed.add(record.target);
        for (const node of record.addedNodes || []) changed.add(node);
      }
      changed.forEach(adjustTree);
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
