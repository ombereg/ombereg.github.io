/* Preserve DOM/player order; place each next preview in the shortest column. */
(() => {
  'use strict';
  const grid = document.getElementById('portfolio-grid');
  const more = document.getElementById('portfolio-more');
  if (!grid) return;
  const previewRhythm = [9/16, 1, 4/3, 2/3, 1, 9/16, 4/3, 3/4];
  let frame = 0;
  let measuredWidth = -1;
  function updateButton(expanded, total) {
    if (!more) return;
    more.hidden = total <= 8;
    more.classList.toggle('is-visible', total > 8);
    more.setAttribute('aria-expanded', String(expanded));
    more.setAttribute('aria-controls', grid.id);
    const ru = more.querySelector('[data-lang="ru"]');
    const en = more.querySelector('[data-lang="en"]');
    if (ru) ru.textContent = expanded ? 'Скрыть −' : 'Смотреть ещё +';
    if (en) en.textContent = expanded ? 'Show less −' : 'See more +';
  }
  function layout() {
    frame = 0;
    const cards = Array.from(grid.children).filter(el => el.classList.contains('portfolio-card'));
    const width = grid.getBoundingClientRect().width;
    if (width <= 0) return;
    const style = getComputedStyle(grid);
    const columns = Math.max(1, parseInt(style.getPropertyValue('--video-columns'), 10) || 2);
    const gap = Math.max(0, parseFloat(style.getPropertyValue('--video-gap')) || 6);
    const tileWidth = (width - gap * (columns - 1)) / columns;
    const heights = Array(columns).fill(0);
    const items = window.OMBEREG_PORTFOLIO || [];
    const expanded = grid.classList.contains('show-more');
    cards.forEach((card, index) => {
      card.classList.toggle('is-more', index >= 8);
      if (index >= 8 && !expanded) return;
      const item = items[index] || {};
      const customRatio = Number(item.previewRatio);
      const ratio = Number.isFinite(customRatio) && customRatio >= .4 && customRatio <= 2.5
        ? customRatio
        : item.layout === 'square' ? 1 : previewRhythm[index % previewRhythm.length];
      let column = 0;
      for (let i = 1; i < columns; i++) {
        if (heights[i] < heights[column]) column = i;
      }
      const tileHeight = tileWidth / ratio;
      card.style.setProperty('--tile-width', tileWidth + 'px');
      card.style.setProperty('--tile-height', tileHeight + 'px');
      card.style.setProperty('--tile-left', column * (tileWidth + gap) + 'px');
      card.style.setProperty('--tile-top', heights[column] + 'px');
      heights[column] += tileHeight + gap;
    });
    grid.style.height = Math.max(0, Math.max(...heights) - gap) + 'px';
    if (!grid.classList.contains('is-masonry')) grid.classList.add('is-masonry');
    updateButton(expanded, cards.length);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(layout);
  }
  new MutationObserver(schedule).observe(grid, {
    childList: true, attributes: true, attributeFilter: ['class']
  });
  if ('ResizeObserver' in window) {
    new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (Math.abs(width - measuredWidth) > .25) {
        measuredWidth = width;
        schedule();
      }
    }).observe(grid);
  }
  window.addEventListener('resize', schedule, {passive: true});
  layout();
})();
