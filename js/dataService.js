// dataService.js - data abstraction for manuals
// Keeps the single responsibility: load content and provide search/filter helpers.

// Resolve the data path relative to this module so fetch works independent of document location
const DATA_PATH = new URL('../data/manuals.json', import.meta.url).href;

export async function loadManuals(){
  const res = await fetch(DATA_PATH, {cache: 'no-store'});
  if(!res.ok) throw new Error(`No se pudieron cargar los manuales (status ${res.status})`);
  const json = await res.json();
  return json;
}

export function findManualById(manuals, id){
  return manuals.find(m => m.id === id);
}

// Return unique categories/roles/types for building filter lists
export function listCategories(manuals){
  return Array.from(new Set(manuals.map(m=>m.category).filter(Boolean))).sort();
}
export function listRoles(manuals){
  return Array.from(new Set(manuals.map(m=>m.role).filter(Boolean))).sort();
}
export function listTypes(manuals){
  return Array.from(new Set(manuals.map(m=>m.type).filter(Boolean))).sort();
}

// Advanced search supporting filters
export function searchAdvanced(manuals, query, options={}){
  const q = String(query||'').trim().toLowerCase();
  const {category, role, type} = options;

  let results = manuals.filter(m => {
    if(category && m.category !== category) return false;
    if(role && m.role !== role) return false;
    if(type && m.type !== type) return false;
    // basic text search across title, summary, tags and steps
    if(!q) return true;
    const hay = [m.title, m.summary, m.category, ...(m.tags||[])].join(' ').toLowerCase();
    if(hay.includes(q)) return true;
    // search inside steps
    return m.steps.some(s => (s.title + ' ' + stripHtml(s.content)).toLowerCase().includes(q));
  });

  return results;
}

function stripHtml(html){
  return html.replace(/<[^>]+>/g,' ');
}

export function listSuggestions(manuals, query, options={}, max=8){
  const results = searchAdvanced(manuals, query, options);
  return results.slice(0,max).map(m => ({id:m.id,title:m.title,category:m.category,summary:m.summary}));
}
