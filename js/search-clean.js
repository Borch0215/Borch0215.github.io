import { listSuggestions } from './dataService.js';

// Compact autocomplete with debounce, keyboard navigation and clear button
export function setupSearch(manuals, elements = {}, filters = {}){
  const input = elements.searchInput;
  const container = elements.autocomplete;
  const wrapper = elements.container || (input && input.parentElement);
  if(!input || !container || !wrapper) return;

  let debounceId = 0;
  let activeIndex = -1;
  let timer = null;

  // create or reuse clear button
  let clearBtn = wrapper.querySelector('.search-clear');
  if(!clearBtn){
    clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'search-clear';
    clearBtn.setAttribute('aria-label','Limpiar búsqueda');
    clearBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 6l12 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    wrapper.appendChild(clearBtn);
  }

  function doSearch(){
    const q = input.value.trim();
    const myId = ++debounceId;
    const opts = {};
    // read simple filter values if present
    if(filters){
      opts.category = getFilterVal(filters.categoryEl);
      opts.role = getFilterVal(filters.roleEl);
      opts.type = getFilterVal(filters.typeEl);
    }
    const suggestions = listSuggestions(manuals, q, opts, 12);
    if(myId !== debounceId) return; // stale
    renderSuggestions(suggestions, container, q);
    activeIndex = -1;
  }

  input.addEventListener('input', ()=>{
    clearTimeout(timer);
    timer = setTimeout(()=> doSearch(), 140);
    clearBtn.style.display = input.value.trim() ? 'inline-flex' : 'none';
  });

  clearBtn.addEventListener('click', ()=>{
    input.value = '';
    clearBtn.style.display = 'none';
    container.classList.add('hidden');
    container.innerHTML = '';
    input.focus();
    container.dispatchEvent(new CustomEvent('cleared'));
  });

  // keyboard navigation
  input.addEventListener('keydown', (ev)=>{
    const items = Array.from(container.querySelectorAll('.suggestion'));
    if(ev.key === 'ArrowDown'){
      ev.preventDefault(); activeIndex = Math.min(items.length-1, activeIndex+1); updateActive(items); return;
    }
    if(ev.key === 'ArrowUp'){
      ev.preventDefault(); activeIndex = Math.max(0, activeIndex-1); updateActive(items); return;
    }
    if(ev.key === 'Enter'){
      ev.preventDefault(); if(items[activeIndex]) items[activeIndex].click(); else if(items[0]) items[0].click(); return;
    }
    if(ev.key === 'Escape'){
      container.classList.add('hidden'); activeIndex = -1; return;
    }
  });

  // click outside to close
  document.addEventListener('click', (ev)=>{
    if(!wrapper.contains(ev.target) && !container.contains(ev.target)){
      container.classList.add('hidden'); activeIndex = -1;
    }
  });

  // allow external rendering
  container.addEventListener('render-suggestions', (ev)=>{
    renderSuggestions(ev.detail||[], container, input.value.trim());
  });

  // initial state
  clearBtn.style.display = input.value.trim() ? 'inline-flex' : 'none';

  // keyboard shortcut to focus search
  window.addEventListener('keydown', (ev)=>{
    if(ev.key === '/' && document.activeElement.tagName.toLowerCase() !== 'input'){
      ev.preventDefault(); input.focus(); input.select();
    }
  });

  function updateActive(items){
    items.forEach((it,i)=>{
      it.classList.toggle('active', i === activeIndex);
      it.setAttribute('aria-selected', String(i === activeIndex));
      if(i === activeIndex){ it.scrollIntoView({block:'nearest',behavior:'smooth'}); }
    });
  }
}

function getFilterVal(el){
  if(!el) return '';
  if(el.tagName && el.tagName.toLowerCase() === 'select') return el.value || '';
  const active = el.querySelector && el.querySelector('.chip.active');
  if(active) return active.dataset.value === undefined ? active.textContent.trim() : active.dataset.value;
  return '';
}

function renderSuggestions(suggestions, container, query){
  container.innerHTML = '';
  if(!suggestions || !suggestions.length){ container.classList.add('hidden'); return; }
  container.classList.remove('hidden');
  const q = String(query||'').trim();
  const escQ = q.replace(/[.*+?^${}()|[\\]\\]/g,'');
  const re = escQ ? new RegExp('('+escQ+')','ig') : null;
  suggestions.forEach(s => {
    const item = document.createElement('div');
    item.className = 'suggestion';
    item.setAttribute('role','option');
    item.tabIndex = 0;
    const title = escapeHtml(s.title);
    const summary = escapeHtml(s.summary||'');
    const titleHtml = re ? title.replace(re, '<span class="match">$1</span>') : title;
    const summaryHtml = re ? summary.replace(re, '<span class="match">$1</span>') : summary;
    item.innerHTML = `
      <div class="s-left">
        <div class="s-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="1"></circle></svg></div>
      </div>
      <div class="s-main">
        <div class="s-title">${titleHtml}</div>
        <div class="s-meta"><span class="s-cat">${escapeHtml(s.category||'')}</span></div>
        <div class="s-summary">${summaryHtml}</div>
      </div>
      <div class="s-actions">
        <button type="button" class="s-open" data-id="${escapeHtml(s.id)}" title="Abrir" aria-label="Abrir">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 3l7 7-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path><path d="M5 12h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
      </div>
    `;

    // click on whole item opens suggestion (ignore action clicks)
    item.addEventListener('click', (ev)=>{
      if(ev.target.closest('.s-actions')) return;
      container.dispatchEvent(new CustomEvent('select-suggestion',{detail:s}));
      container.classList.add('hidden');
    });

    // open button
    const openBtn = item.querySelector('.s-open');
    if(openBtn){
      openBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); container.dispatchEvent(new CustomEvent('select-suggestion',{detail:s})); container.classList.add('hidden'); });
    }

    item.addEventListener('mouseenter', ()=>{ item.classList.add('active'); item.setAttribute('aria-selected','true'); });
    item.addEventListener('mouseleave', ()=>{ item.classList.remove('active'); item.setAttribute('aria-selected','false'); });
    container.appendChild(item);
  });
}

function escapeHtml(str){
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
