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
    updateButton(expanded, Math.max(cards.length, (window.OMBEREG_PORTFOLIO || []).length));
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

/* The art gallery uses the same packing, without cropping or changing its catalog. */
(() => {
  'use strict';
  const grid = document.getElementById('art-grid');
  const more = document.getElementById('art-more');
  if (!grid) return;
  const initialCount = 10;
  // Exact dimensions of the existing files reserve space before lazy images load.
  const dimensions = {
    'ombereg-blue-portrait.webp': [619, 1100],
    'abstract-cosmos.webp': [99, 140],
    'mosaic-mother-child.webp': [79, 140],
    'whale-architecture.webp': [79, 140],
    'underwater-portrait.webp': [112, 140],
    'white-lion-portrait.webp': [105, 140],
    'white-dragon-cat.webp': [79, 140],
    'cosmic-mermaid.webp': [109, 140],
    'moon-cat.webp': [112, 140],
    'cosmic-coast.webp': [360, 120]
  };
  let frame = 0, measuredWidth = -1, expanded = false;
  const watchedImages = new WeakSet();
  function schedule() {
    if (!frame) frame = requestAnimationFrame(layout);
  }
  function imageRatio(img) {
    if (!img) return 1;
    const filename = (img.getAttribute('src') || '').split('/').pop().split('?')[0];
    const size = dimensions[filename];
    if (size && !img.hasAttribute('width') && !img.hasAttribute('height')) {
      img.width = size[0];
      img.height = size[1];
    }
    if (!watchedImages.has(img)) {
      watchedImages.add(img);
      img.addEventListener('load', schedule, {once: true});
      img.addEventListener('error', schedule, {once: true});
    }
    if (img.naturalWidth > 0 && img.naturalHeight > 0) return img.naturalWidth / img.naturalHeight;
    if (size) return size[0] / size[1];
    const w = Number(img.getAttribute('width')), h = Number(img.getAttribute('height'));
    return w > 0 && h > 0 ? w / h : 1;
  }
  function layout() {
    frame = 0;
    const cards = Array.from(grid.children).filter(el => el.classList.contains('art-card'));
    const width = grid.getBoundingClientRect().width;
    if (width <= 0) return;
    const style = getComputedStyle(grid);
    const columns = Math.max(1, parseInt(style.getPropertyValue('--art-columns'), 10) || 2);
    const gapValue = parseFloat(style.getPropertyValue('--art-gap'));
    const gap = Number.isFinite(gapValue) ? Math.max(0, gapValue) : 6;
    const tileWidth = (width - gap * (columns - 1)) / columns;
    const heights = Array(columns).fill(0);
    cards.forEach((card, index) => {
      card.hidden = index >= initialCount && !expanded;
      card.setAttribute('aria-haspopup', 'dialog');
      card.setAttribute('aria-controls', 'art-modal');
      const ratio = imageRatio(card.querySelector('img'));
      if (card.hidden) return;
      let column = 0;
      for (let i = 1; i < columns; i++) if (heights[i] < heights[column]) column = i;
      const height = tileWidth / ratio;
      card.style.setProperty('--art-width', tileWidth + 'px');
      card.style.setProperty('--art-height', height + 'px');
      card.style.setProperty('--art-left', column * (tileWidth + gap) + 'px');
      card.style.setProperty('--art-top', heights[column] + 'px');
      heights[column] += height + gap;
    });
    grid.style.height = Math.max(0, Math.max(...heights) - gap) + 'px';
    grid.classList.add('is-art-masonry');
    if (more) {
      more.hidden = cards.length <= initialCount;
      more.setAttribute('aria-expanded', String(expanded));
      more.setAttribute('aria-controls', grid.id);
      const ru = more.querySelector('[data-lang="ru"]');
      const en = more.querySelector('[data-lang="en"]');
      if (ru) ru.textContent = expanded ? 'Скрыть −' : 'Смотреть ещё +';
      if (en) en.textContent = expanded ? 'Show less −' : 'See more +';
    }
  }
  more?.addEventListener('click', () => {
    expanded = !expanded;
    layout();
  });
  new MutationObserver(schedule).observe(grid, {childList: true});
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
