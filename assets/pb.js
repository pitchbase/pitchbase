/* PitchBase B Graphite v2 — interactions (search suggestions, compare, menu). No dependencies. */
(function(){
const D=window.PB||{};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-US');
const ICON={field:'<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
city:'<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
co:'<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>'};
function hl(t,q){if(!q)return esc(t);const i=t.toLowerCase().indexOf(q);if(i<0)return esc(t);return esc(t.slice(0,i))+'<mark>'+esc(t.slice(i,i+q.length))+'</mark>'+esc(t.slice(i+q.length))}
/* ---- search combobox (WAI-ARIA 1.2 combobox + listbox) ---- */
document.querySelectorAll('[data-combo]').forEach(box=>{
  const inp=box.querySelector('input'),list=box.querySelector('.slist');let opts=[],act=-1;
  function build(){
    const q=inp.value.trim().toLowerCase();let h='',k=0;opts=[];

    const grp=(title,items,kind,render)=>{if(!items.length)return;h+=`<div class="sgrp" role="presentation">${title}</div>`;items.slice(0, Math.max(0, 10-k)).forEach(it=>{const id=box.id+'-o'+k++;opts.push({id,href:it.href||'listing.html'});h+=`<div class="sopt" role="option" id="${id}" aria-selected="false" data-href="${esc(it.href||'listing.html')}">${ICON[kind]}${render(it)}</div>`})};
    const F=(D.fields||[]),C=(D.cities||[]),P=(D.companies||[]);
    if(!q){grp('Popular fields',F.slice(0,5),'field',f=>`<b>${esc(f.l)}</b><em>${fmt(f.n)} listings</em>`);
      grp('Busiest cities',C.slice(0,3),'city',c=>`<b>${esc(c.l)}</b><em>${esc(c.p)} · ${fmt(c.n)}</em>`);}
    else{grp('Fields',F.filter(f=>f.l.toLowerCase().includes(q)).slice(0,5),'field',f=>`<b>${hl(f.l,q)}</b><em>${fmt(f.n)} listings</em>`);
      grp('Cities and provinces',C.filter(c=>(c.l+' '+c.p).toLowerCase().includes(q)).slice(0,4),'city',c=>`<b>${hl(c.l,q)}</b><em>${esc(c.p)} · ${fmt(c.n)}</em>`);
      grp('Companies',P.filter(c=>(c.l+' '+c.d+' '+(c.t||'')).toLowerCase().includes(q)).slice(0,3),'co',c=>`<b>${hl(c.l,q)}</b><em>${esc(c.d)}</em>`);
      if(!opts.length)h=`<div class="sempty">No matches — try a product word</div>`;}
    h+=`<div class="sfoot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></div>`;
    list.innerHTML=h;act=-1;inp.removeAttribute('aria-activedescendant');
  }
  function open(){build();box.classList.add('open');inp.setAttribute('aria-expanded','true')}
  function close(){box.classList.remove('open');inp.setAttribute('aria-expanded','false');act=-1;inp.removeAttribute('aria-activedescendant')}
  function move(d){if(!opts.length)return;act=(act+d+opts.length)%opts.length;list.querySelectorAll('.sopt').forEach((o,i)=>o.setAttribute('aria-selected',i===act));const el=document.getElementById(opts[act].id);el.scrollIntoView({block:'nearest'});inp.setAttribute('aria-activedescendant',opts[act].id)}
  const placeholder=()=>inp.placeholder=matchMedia('(min-width: 601px)').matches?'Products, cities or companies':'Search suppliers'; placeholder(); addEventListener('resize',placeholder);
  box.querySelector('.sfield button')?.addEventListener('click',()=>{if(opts.length)location.href=opts[act<0?0:act].href;else{open();inp.focus()}});
  inp.addEventListener('focus',()=>{if(inp.value.trim())open()});inp.addEventListener('input',open);
  if(window.SEARCH_INDEX_CHUNKS) Promise.all(window.SEARCH_INDEX_CHUNKS.map(u=>fetch(u).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}))).then(parts=>{D.companies=parts.flat().map(c=>({l:c.e||c.n,d:c.f,t:c.n+' '+(c.c||''),href:c.p+'?entry='+encodeURIComponent(c.n)}));if(inp.value.trim())open()}).catch(()=>{});
  inp.addEventListener('keydown',ev=>{if(ev.key==='ArrowDown'){ev.preventDefault();if(!box.classList.contains('open'))open();move(1)}else if(ev.key==='ArrowUp'){ev.preventDefault();if(!box.classList.contains('open'))open();move(-1)}else if(ev.key==='Escape'){close()}else if(ev.key==='Enter'&&act>=0){ev.preventDefault();location.href=opts[act].href}});
  list.addEventListener('mousedown',ev=>{const o=ev.target.closest('.sopt');if(o){ev.preventDefault();location.href=o.dataset.href}});
  list.addEventListener('mousemove',ev=>{const o=ev.target.closest('.sopt');if(!o)return;const i=opts.findIndex(x=>x.id===o.id);if(i!==act){act=i;move(0)}});
  document.addEventListener('click',ev=>{if(!box.contains(ev.target))close()});
  const initial=new URLSearchParams(location.search).get('q'); if(initial){inp.value=initial;open()}
});
/* "/" focuses search */
document.addEventListener('keydown',ev=>{if(ev.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){const i=document.querySelector('[data-combo] input')||(document.querySelector('#field-table')&&document.getElementById('q'));if(i){ev.preventDefault();const panel=i.closest('details');if(panel)panel.open=true;i.focus()}}});
document.querySelectorAll('[data-focus-search]').forEach(b=>b.addEventListener('click',ev=>{const i=document.querySelector('[data-combo] input')||(document.querySelector('#field-table')&&document.getElementById('q'));if(i){ev.preventDefault();const panel=i.closest('details');if(panel)panel.open=true;i.focus();i.scrollIntoView({block:'center'})}}));
/* ---- compare ---- */
const bar=document.querySelector('.cmpbar:has([data-count])');
if(bar){const upd=()=>{const n=document.querySelectorAll('.cmp:checked').length;bar.hidden=n===0;bar.querySelector('[data-count]').textContent=n+(n===1?' supplier':' suppliers')+' selected'};
  document.querySelectorAll('.cmp').forEach(c=>c.addEventListener('change',upd));bar.querySelector('[data-clear]').addEventListener('click',()=>{document.querySelectorAll('.cmp').forEach(c=>c.checked=false);upd()});upd();}
/* ---- toc highlight ---- */
const toc=document.querySelectorAll('.toc a');
if(toc.length&&'IntersectionObserver' in window){const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){toc.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id))}})},{rootMargin:'-30% 0px -60% 0px'});document.querySelectorAll('.prose section[id]').forEach(s=>io.observe(s))}
})();
(function(){var b=document.querySelector('.menu'),s=document.getElementById('msheet');if(!b||!s)return;b.addEventListener('click',function(){var o=s.hasAttribute('open');if(o){s.removeAttribute('open')}else{s.setAttribute('open','')}b.setAttribute('aria-expanded',String(!o))});s.addEventListener('click',function(ev){if(ev.target.closest('a')){s.removeAttribute('open');b.setAttribute('aria-expanded','false')}});document.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&s.hasAttribute('open')){s.removeAttribute('open');b.setAttribute('aria-expanded','false');b.focus()}})})();
