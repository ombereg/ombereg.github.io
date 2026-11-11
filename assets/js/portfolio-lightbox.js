/* OMBEREG — in-page gallery viewer; no external libraries. */
(() => {
  'use strict';
  const links = [...document.querySelectorAll('.art figure > a[href]')]
    .filter(a => /\.(?:webp|jpe?g|png)(?:\?|$)/i.test(a.getAttribute('href') || ''));
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;
  const ru = document.documentElement.lang !== 'en';
  const tr = (a,b) => ru ? a : b;
  const dialog = document.createElement('dialog');
  dialog.className = 'omb-lightbox';
  dialog.setAttribute('aria-label', tr('Просмотр картины','Artwork viewer'));
  dialog.setAttribute('aria-modal','true');
  dialog.innerHTML = '<div class="omb-lightbox-stage">' +
      '<img class="omb-lightbox-image" alt="" draggable="false">' +
      '<p class="omb-lightbox-caption"></p><span class="omb-lightbox-counter" aria-live="polite"></span></div>' +
      '<button class="omb-lightbox-close" type="button" aria-label="' + tr('Закрыть','Close') + '">×</button>' +
      '<button class="omb-lightbox-prev" type="button" aria-label="' + tr('Предыдущая работа','Previous image') + '">‹</button>' +
      '<button class="omb-lightbox-next" type="button" aria-label="' + tr('Следующая работа','Next image') + '">›</button>';
  document.body.append(dialog);
  const image = dialog.querySelector('.omb-lightbox-image');
  const caption = dialog.querySelector('.omb-lightbox-caption');
  const counter = dialog.querySelector('.omb-lightbox-counter');
  const close = dialog.querySelector('.omb-lightbox-close');
  let active = 0, opener = null, startX = null, startY = null;

  function update(index) {
    active = (index + links.length) % links.length;
    const a = links[active];
    const label = a.closest('figure')?.querySelector('figcaption')?.textContent?.trim() ||
      a.querySelector('img')?.alt || tr('Картина','Artwork');
    image.alt = label;
    image.src = a.href;
    caption.textContent = label;
    counter.textContent = (active+1) + ' / ' + links.length;
  }
  function show(index, trigger) {
    opener = trigger; update(index);
    if (!dialog.open) {
      document.body.classList.add('omb-lightbox-open');
      dialog.showModal();
    }
    close.focus({preventScroll:true});
  }
  const dismiss = () => { if (dialog.open) dialog.close(); };
  dialog.addEventListener('close', () => {
    document.body.classList.remove('omb-lightbox-open');
    image.removeAttribute('src');
    const trigger = opener; opener = null;
    if (trigger?.isConnected) trigger.focus({preventScroll:true});
  });
  links.forEach((a,index) => {
    a.removeAttribute('target');
    a.removeAttribute('rel');
    a.setAttribute('aria-haspopup','dialog');
    a.setAttribute('aria-label',tr('Открыть крупно: ','Enlarge: ') +
      (a.querySelector('img')?.alt || String(index + 1)));
    a.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      show(index,a);
    });
  });
  close.addEventListener('click',dismiss);
  dialog.querySelector('.omb-lightbox-prev').addEventListener('click',() => update(active-1));
  dialog.querySelector('.omb-lightbox-next').addEventListener('click',() => update(active+1));
  dialog.addEventListener('click',event => {
    if (event.target === dialog) dismiss();
  });
  dialog.addEventListener('keydown',event => {
    if (event.key === 'ArrowRight') {event.preventDefault();update(active+1);}
    else if (event.key === 'ArrowLeft') {event.preventDefault();update(active-1);}
  });
  image.addEventListener('touchstart',e => {
    if (e.touches.length !== 1) return;
    startX=e.touches[0].clientX;startY=e.touches[0].clientY;
  },{passive:true});
  image.addEventListener('touchend',e => {
    if (startX===null || e.changedTouches.length !== 1) return;
    const dx=e.changedTouches[0].clientX-startX, dy=e.changedTouches[0].clientY-startY;
    startX=startY=null;
    if (Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)*1.3)
      update(active+(dx<0?1:-1));
  },{passive:true});
})();