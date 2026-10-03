/* OMBEREG: editable catalog, uncropped masonry, on-demand full-resolution viewer. */
(() => {
  'use strict';
  const ownScript = document.currentScript;
  const base = new URL('.', ownScript.src);
  const grid = document.getElementById('art-grid-v2');
  const more = document.getElementById('art-more');
  if (!grid || !more) return;
  const lang = () => document.documentElement.lang === 'en' ? 'en' : 'ru';
  const text = (ru, en) => lang() === 'ru' ? ru : en;
  const asset = name => new URL(name, base).href;
  const validName = s => typeof s === 'string' && /^[a-zA-Z0-9_.-]+\.(webp|jpg|jpeg|png)$/.test(s);
  let catalog, items = [], visible = 0, frame = 0, lastWidth = 0;
  let openIndex = -1, previousFocus = null, scrollY = 0, bodyStyle = null;
  let zoom = 1, x = 0, y = 0, fitW = 1, fitH = 1;
  const dialog = document.createElement('div');
  dialog.className = 'av2'; dialog.id = 'art-viewer-v2'; dialog.hidden = true;
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
  dialog.innerHTML = '<div class="av2-toolbar"><span class="av2-count" aria-live="polite"></span><button class="av2-minus" type="button">−</button><button class="av2-reset" type="button">100%</button><button class="av2-plus" type="button">+</button><button class="av2-close" type="button">×</button></div><div class="av2-viewport"><img class="av2-img" alt="" draggable="false"><span class="av2-loading"></span></div><button class="av2-nav av2-prev" type="button">‹</button><button class="av2-nav av2-next" type="button">›</button><div class="av2-hint"></div>';
  document.body.appendChild(dialog);
  const view = dialog.querySelector('.av2-viewport'), photo=dialog.querySelector('.av2-img');
  const count=dialog.querySelector('.av2-count'), reset=dialog.querySelector('.av2-reset');
  const loading=dialog.querySelector('.av2-loading');
  const closeButton=dialog.querySelector('.av2-close');
  function labels(){
    more.textContent = visible >= items.length ? text('Свернуть −','Show less −') : text('Смотреть ещё +','See more +');
    more.setAttribute('aria-expanded', String(visible > (catalog?.initialCount || 8)));
    dialog.setAttribute('aria-label',text('Просмотр работы','Artwork viewer'));
    const labels={'.av2-minus':['Уменьшить','Zoom out'],'.av2-plus':['Приблизить','Zoom in'],'.av2-reset':['Показать целиком','Fit to screen'],'.av2-close':['Закрыть','Close'],'.av2-prev':['Предыдущая работа','Previous artwork'],'.av2-next':['Следующая работа','Next artwork']};
    for(const [sel,v] of Object.entries(labels))dialog.querySelector(sel).setAttribute('aria-label',text(...v));
    dialog.querySelector('.av2-hint').textContent=text('Два пальца или + для приближения · свайп для перелистывания','Pinch or + to zoom · swipe to browse');
    grid.querySelectorAll('[data-art-id]').forEach(card => { const it=items.find(v=>v.id===card.dataset.artId); if(it)card.setAttribute('aria-label',text('Открыть работу ','Open artwork ')+String(it.number).padStart(2,'0')); });
    if(openIndex>=0)photo.alt=items[openIndex][lang()==='ru'?'altRu':'altEn']||'';
  }
  function layout(){
    frame=0;const width=grid.getBoundingClientRect().width;if(!width)return;
    const columns=Math.max(1,parseInt(getComputedStyle(grid).getPropertyValue('--gallery-cols'))||2);
    const gap=6, w=(width-gap*(columns-1))/columns, heights=Array(columns).fill(0);
    [...grid.children].forEach((card,i)=>{
      const item=items[i];if(!item)return;
      let col=0;for(let c=1;c<columns;c++)if(heights[c]<heights[col])col=c;
      const h=w*item.height/item.width;
      Object.assign(card.style,{width:w+'px',height:h+'px',left:col*(w+gap)+'px',top:heights[col]+'px'});
      heights[col]+=h+gap;
    });
    grid.style.height=Math.max(0,Math.max(...heights)-gap)+'px';
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(layout);}
  function appendCards(start,end){
    const fragment=document.createDocumentFragment();
    for(let i=start;i<end;i++){
      const item=items[i], card=document.createElement('button'), img=document.createElement('img');
      card.type='button';card.className='art-card-v2';card.dataset.artId=item.id;
      card.setAttribute('aria-haspopup','dialog');card.setAttribute('aria-controls',dialog.id);
      img.alt='';img.width=item.width;img.height=item.height;img.loading='lazy';img.decoding='async';img.src=asset(item.thumb);
      card.appendChild(img);card.addEventListener('click',()=>open(i));fragment.appendChild(card);
    }
    grid.appendChild(fragment);visible=end;labels();layout();
  }
  function transform(){
    const w=view.clientWidth,h=view.clientHeight;
    x=Math.max(-Math.max(0,(fitW*zoom-w)/2),Math.min(Math.max(0,(fitW*zoom-w)/2),x));
    y=Math.max(-Math.max(0,(fitH*zoom-h)/2),Math.min(Math.max(0,(fitH*zoom-h)/2),y));
    photo.style.transform=`translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${zoom})`;
    reset.textContent=Math.round(zoom*100)+'%';
  }
  function fit(){
    if(openIndex<0)return;
    const item=items[openIndex], s=Math.min(view.clientWidth/item.width,view.clientHeight/item.height);
    fitW=item.width*s;fitH=item.height*s;
    photo.style.width=fitW+'px';photo.style.height=fitH+'px';transform();
  }
  function setZoom(v){zoom=Math.max(1,Math.min(4,v));if(zoom===1){x=0;y=0;}transform();}
  function open(i){
    const starting=dialog.hidden;openIndex=(i+items.length)%items.length;
    if(starting){
      previousFocus=document.activeElement;scrollY=window.scrollY;
      bodyStyle={position:document.body.style.position,top:document.body.style.top,width:document.body.style.width,overflow:document.body.style.overflow};
      Object.assign(document.body.style,{position:'fixed',top:-scrollY+'px',width:'100%',overflow:'hidden'});
      document.querySelector('main')?.setAttribute('inert','');
    }
    dialog.hidden=false;zoom=1;x=y=0;
    const item=items[openIndex];count.textContent=`${openIndex+1} / ${items.length}`;
    loading.textContent=text('Загрузка…','Loading…');loading.hidden=false;photo.style.visibility='hidden';
    photo.onload=()=>{loading.hidden=true;photo.style.visibility='visible';fit();};
    photo.onerror=()=>{loading.textContent=text('Изображение не загрузилось. Попробуйте открыть его ещё раз.','Image could not load. Please reopen it.');};
    photo.src=asset(item.full);photo.alt=item[lang()==='ru'?'altRu':'altEn']||'';
    labels();fit();if(starting)closeButton.focus({preventScroll:true});
  }
  function close(){
    if(dialog.hidden)return;dialog.hidden=true;openIndex=-1;photo.removeAttribute('src');
    document.querySelector('main')?.removeAttribute('inert');
    if(bodyStyle)Object.assign(document.body.style,bodyStyle);
    window.scrollTo(0,scrollY);previousFocus?.focus({preventScroll:true});
    pointers.clear();
  }
  function step(d){if(!dialog.hidden)open(openIndex+d);}
  const pointers=new Map();let gesture=null,hadPinch=false;
  const distance=ps=>Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);
  view.addEventListener('pointerdown',e=>{
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});view.setPointerCapture(e.pointerId);
    if(pointers.size===1){hadPinch=false;gesture={startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY};}
    if(pointers.size===2){hadPinch=true;gesture={dist:distance([...pointers.values()]),zoom};}
  });
  view.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2&&gesture?.dist){setZoom(gesture.zoom*distance([...pointers.values()])/Math.max(1,gesture.dist));}
    else if(pointers.size===1&&zoom>1&&gesture?.lastX!==undefined){x+=e.clientX-gesture.lastX;y+=e.clientY-gesture.lastY;gesture.lastX=e.clientX;gesture.lastY=e.clientY;transform();}
  });
  view.addEventListener('pointerup',e=>{
    if(!hadPinch&&zoom===1&&gesture?.startX!==undefined){const dx=e.clientX-gesture.startX,dy=e.clientY-gesture.startY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1);}
    pointers.delete(e.pointerId);
    if(pointers.size===1){const p=[...pointers.values()][0];gesture={lastX:p.x,lastY:p.y};}else gesture=null;
  });
  view.addEventListener('pointercancel',()=>{pointers.clear();gesture=null;});
  view.addEventListener('dblclick',e=>{e.preventDefault();setZoom(zoom===1?2:1);});
  view.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*(e.deltaY<0?1.12:1/1.12));},{passive:false});
  closeButton.addEventListener('click',close);
  dialog.querySelector('.av2-prev').addEventListener('click',()=>step(-1));
  dialog.querySelector('.av2-next').addEventListener('click',()=>step(1));
  dialog.querySelector('.av2-minus').addEventListener('click',()=>setZoom(zoom/1.5));
  dialog.querySelector('.av2-plus').addEventListener('click',()=>setZoom(zoom*1.5));
  reset.addEventListener('click',()=>setZoom(1));
  document.addEventListener('keydown',e=>{
    if(dialog.hidden)return;
    if(e.key==='Escape'){e.preventDefault();close();}
    else if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}
    else if(e.key==='ArrowRight'){e.preventDefault();step(1);}
    else if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(zoom*1.5);}
    else if(e.key==='-'){e.preventDefault();setZoom(zoom/1.5);}
    else if(e.key==='Tab'){
      const nodes=[...dialog.querySelectorAll('button')];const first=nodes[0],last=nodes.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  more.addEventListener('click',()=>{
    if(visible>=items.length){const keep=Math.min(catalog.initialCount,items.length);while(grid.children.length>keep)grid.lastElementChild.remove();visible=keep;labels();layout();document.getElementById('art-gallery').scrollIntoView({behavior:'auto',block:'start'});}
    else appendCards(visible,Math.min(items.length,visible+catalog.pageSize));
  });
  window.addEventListener('resize',()=>{schedule();fit();},{passive:true});
  if('ResizeObserver'in window)new ResizeObserver(entries=>{const w=entries[0].contentRect.width;if(Math.abs(w-lastWidth)>.1){lastWidth=w;schedule();}}).observe(grid);
  new MutationObserver(labels).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  more.hidden=true;
  fetch(new URL('gallery-data.json?v='+Date.now(),base),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Catalog HTTP '+r.status);return r.json();}).then(data=>{
    const ids=new Set();
    if(!Array.isArray(data.items)||data.items.some(it=>!it.id||ids.has(it.id)||(ids.add(it.id),false)||!validName(it.thumb)||!validName(it.full)||!Number.isFinite(it.width)||!Number.isFinite(it.height)||it.width<=0||it.height<=0))throw new Error('Invalid gallery catalog');
    catalog=data;catalog.initialCount=Math.max(1,Math.min(32,Number(data.initialCount)||8));catalog.pageSize=Math.max(1,Math.min(32,Number(data.pageSize)||16));
    const available=data.items.filter(it=>!it.hidden), byId=new Map(available.map(it=>[it.id,it]));
    const front=[...new Set(data.featured||[])].map(id=>byId.get(id)).filter(Boolean).slice(0,catalog.initialCount), used=new Set(front.map(it=>it.id));
    items=[...front,...available.filter(it=>!used.has(it.id))];
    grid.replaceChildren();appendCards(0,Math.min(catalog.initialCount,items.length));
    more.hidden=items.length<=catalog.initialCount;more.setAttribute('aria-controls',grid.id);
  }).catch(error=>{
    console.error('Art gallery:',error);const p=document.createElement('p');p.className='art-gallery-error';p.textContent=text('Галерея временно не загрузилась. Обновите страницу.','The gallery could not load. Please refresh the page.');grid.replaceChildren(p);grid.style.height='auto';more.hidden=true;
  });
})();
