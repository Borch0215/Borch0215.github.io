// app.js - main application wiring
// Uses ES modules. Keeps state in-memory and uses localStorage for progress/comments.

import { loadManuals, findManualById, listCategories, listRoles, listTypes, listSuggestions, searchAdvanced } from './dataService.js';
import { setupSearch } from './search-clean.js';

const STATE = {
  manuals: [],
  current: null,
  diagrams: (() => {
    const stored = JSON.parse(localStorage.getItem('cw:diagrams')||'[]');
    return Array.isArray(stored) ? stored : [];
  })(),
  progress: JSON.parse(localStorage.getItem('cw:progress')||'{}'),
  comments: JSON.parse(localStorage.getItem('cw:comments')||'{}'),
  history: JSON.parse(localStorage.getItem('cw:history')||'[]'),
  lastSeenVersion: JSON.parse(localStorage.getItem('cw:versions')||'{}'),
  agentMode: false,
  darkMode: JSON.parse(localStorage.getItem('cw:darkMode')||'false'),
  fontSize: parseInt(localStorage.getItem('cw:fontSize')||'15'),
  notifEnabled: JSON.parse(localStorage.getItem('cw:notifEnabled')||'true'),
  agentName: localStorage.getItem('cw:agentName')||'Agente',
  users: JSON.parse(localStorage.getItem('cw:users')||'null'),
  manualOverrides: JSON.parse(localStorage.getItem('cw:manualOverrides')||'{}'),
  authUser: JSON.parse(localStorage.getItem('cw:authUser')||'null')
};

const els = {
  searchInput: null,
  autocomplete: null,
  canvas: null,
  manualView: null,
  manualTitle: null,
  manualCategory: null,
  manualVersion: null,
  manualSteps: null,
  qrModal: null,
  qrImage: null,
  commentsList: null,
  commentInput: null,
  addComment: null,
  versionsList: null,
  faqsList: null,
  faqSearch: null,
  clearFaqSearch: null,
  exportAllDataBtn: null,
  // Fibra elements
  createDiagramBtn: null,
  diagramsList: null,
  diagramModal: null,
  diagramTitle: null,
  diagramQuestion: null,
  diagramYes: null,
  diagramNo: null,
  saveDiagramBtn: null,
  deleteDiagramBtn: null,
  // Settings elements
  themeDark: null,
  fontSizeSlider: null,
  fontSizeValue: null,
  notifEnabled: null,
  agentInputName: null,
  clearDataBtn: null,
  historyList: null,
  manualCount: null,
  lastUpdate: null,
  dataUsage: null,
  agentNameDisplay: null,
  agentModeBtn: null,
  toggleAgentMode: null
};

async function init(){
  // wire elements - core
  els.searchInput = document.getElementById('search');
  els.autocomplete = document.getElementById('autocomplete');
  els.canvas = document.getElementById('canvas');
  els.manualView = document.getElementById('manualView');
  els.manualTitle = document.getElementById('manualTitle');
  els.manualCategory = document.getElementById('manualCategory');
  els.manualVersion = document.getElementById('manualVersion');
  els.manualSteps = document.getElementById('manualSteps');
  els.manualStepsNav = document.getElementById('manualStepsNav');
  els.qrModal = document.getElementById('qrModal');
  els.qrImage = document.getElementById('qrImage');
  els.commentsList = document.getElementById('commentsList');
  els.commentInput = document.getElementById('commentInput');
  els.addComment = document.getElementById('addComment');
  els.versionsList = document.getElementById('versionsList');
  els.faqsList = document.getElementById('faqsList');
  
  // wire elements - settings
  els.themeDark = document.getElementById('themeDark');
  els.fontSizeSlider = document.getElementById('fontSizeSlider');
  els.fontSizeValue = document.getElementById('fontSizeValue');
  els.notifEnabled = document.getElementById('notifEnabled');
  els.agentInputName = document.getElementById('agentInputName');
  els.clearDataBtn = document.getElementById('clearDataBtn');
  els.historyList = document.getElementById('historyList');
  els.manualCount = document.getElementById('manualCount');
  els.lastUpdate = document.getElementById('lastUpdate');
  els.dataUsage = document.getElementById('dataUsage');
  els.agentNameDisplay = document.getElementById('agentName');
  els.toggleAgentMode = document.getElementById('toggleAgentMode');
  // Fibra elements
  els.createDiagramBtn = document.getElementById('createDiagramBtn');
  els.diagramsList = document.getElementById('diagramsList');
  els.diagramModal = document.getElementById('diagramModal');
  els.diagramTitle = document.getElementById('diagramTitle');
  els.diagramQuestion = document.getElementById('diagramQuestion');
  els.diagramYes = document.getElementById('diagramYes');
  els.diagramNo = document.getElementById('diagramNo');
  els.diagramYesNode = document.getElementById('diagramYesNode');
  els.diagramNoNode = document.getElementById('diagramNoNode');
  els.diagramIsSolution = document.getElementById('diagramIsSolution');
  els.saveDiagramBtn = document.getElementById('saveDiagramBtn');
  els.deleteDiagramBtn = document.getElementById('deleteDiagramBtn');
  // Diagram viewer elements
  els.diagramViewerModal = document.getElementById('diagramViewerModal');
  els.viewerDiagramTitle = document.getElementById('viewerDiagramTitle');
  els.diagramViewerQuestion = document.getElementById('diagramViewerQuestion');
  els.diagramViewerYesBtn = document.getElementById('diagramViewerYesBtn');
  els.diagramViewerNoBtn = document.getElementById('diagramViewerNoBtn');
  els.diagramViewerSolution = document.getElementById('diagramViewerSolution');
  els.diagramViewerRestartBtn = document.getElementById('diagramViewerRestartBtn');
  els.diagramViewerPath = document.getElementById('diagramViewerPath');
  els.diagramViewerContent = document.getElementById('diagramViewerContent');
  // PDF import elements
  els.pdfFileInput = document.getElementById('pdfFileInput');
  els.processPdfBtn = document.getElementById('processPdfBtn');
  // Category management elements
  els.editCategoryModal = document.getElementById('editCategoryModal');
  els.newCategoryInput = document.getElementById('newCategoryInput');
  els.addCategoryBtn = document.getElementById('addCategoryBtn');
  els.categoriesList = document.getElementById('categoriesList');
  els.changeManualCategorySelect = document.getElementById('changeManualCategorySelect');
  els.changeManualCategoryBtn = document.getElementById('changeManualCategoryBtn');
  els.pdfStatus = document.getElementById('pdfStatus');
  // auth & users
  els.loginModal = document.getElementById('loginModal');
  els.loginUser = document.getElementById('loginUser');
  els.loginPass = document.getElementById('loginPass');
  els.loginSubmit = document.getElementById('loginSubmit');
  els.loginBtn = document.getElementById('loginBtn');
  els.logoutBtn = document.getElementById('logoutBtn');
  els.profileName = document.getElementById('profileName');
  els.usersList = document.getElementById('usersList');
  els.addUserBtn = document.getElementById('addUserBtn');
  els.newUserName = document.getElementById('newUserName');
  els.newUserRole = document.getElementById('newUserRole');
  els.newUserPass = document.getElementById('newUserPass');

  // restore persisted state
  STATE.agentMode = JSON.parse(localStorage.getItem('cw:agentMode') || 'false');
  STATE.darkMode = JSON.parse(localStorage.getItem('cw:darkMode') || 'false');
  STATE.fontSize = parseInt(localStorage.getItem('cw:fontSize') || '15');
  STATE.notifEnabled = JSON.parse(localStorage.getItem('cw:notifEnabled') || 'true');
  STATE.agentName = localStorage.getItem('cw:agentName') || 'Agente';

  // apply theme and font size from state
  applyTheme();
  applyFontSize();
  
  // update UI with persisted values
  if(els.themeDark) els.themeDark.checked = STATE.darkMode;
  if(els.fontSizeSlider) { els.fontSizeSlider.value = STATE.fontSize; if(els.fontSizeValue) els.fontSizeValue.textContent = STATE.fontSize + 'px'; }
  if(els.notifEnabled) els.notifEnabled.checked = STATE.notifEnabled;
  if(els.agentInputName) els.agentInputName.value = STATE.agentName;
  if(els.agentNameDisplay) els.agentNameDisplay.textContent = STATE.agentName;
  
  document.getElementById('manualComments').classList.toggle('hidden', !STATE.agentMode);
  if(STATE.agentMode && els.toggleAgentMode) els.toggleAgentMode.classList.add('active');

  // initialize user store and auth
  await initUsers();
  refreshAuthUI();

  // Defensive cleanup: remove any visible modal overlays or load error overlays
  try{
    document.querySelectorAll('.modal').forEach(m=>{ if(!m.classList.contains('hidden')) m.classList.add('hidden'); });
    const loadErr = document.getElementById('cwLoadError'); if(loadErr) loadErr.remove();
    // restore body scroll in case an earlier modal left it disabled
    document.body.style.overflow = '';
    // ensure page is at top to avoid residual scroll offsets
    try{ window.scrollTo(0,0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }catch(e){}
    // ensure main container isn't pushed down by stray inline margins
    const mainEl = document.querySelector('.main'); if(mainEl) { mainEl.style.marginTop = '0'; }
    // clear any inline top/transform/position on high-level layout elements that could push content
    ['#app','.sidebar','.topbar','.main','.content'].forEach(sel=>{
      const el = document.querySelector(sel);
      if(el){ el.style.top = ''; el.style.transform = ''; el.style.position = ''; }
    });
  }catch(e){ console.warn('cleanup overlays err', e); }

  // If no user is authenticated, hide the main UI and prompt login
  if(!STATE.authUser){
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    if(sidebar) sidebar.classList.add('hidden');
    if(main) main.classList.add('hidden');
    if(els.loginModal) showLoginModal();
  } else {
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    if(sidebar) sidebar.classList.remove('hidden');
    if(main) main.classList.remove('hidden');
  }

  // load data
  try{
    const json = await loadManuals();
    // load base manuals from data and merge with any custom manuals saved locally
    const baseManuals = json.manuals || [];
    const custom = JSON.parse(localStorage.getItem('cw:manualsCustom')||'[]');
    STATE.manuals = baseManuals.concat(custom || []);

    // update system info
    if(els.manualCount) els.manualCount.textContent = STATE.manuals.length;
    if(els.lastUpdate) els.lastUpdate.textContent = new Date().toLocaleDateString('es-ES');

    // get all categories from base manuals to show even empty ones
    const allCategories = listCategories(baseManuals);
    renderManualsList(STATE.manuals, allCategories);
    // Ensure create manual and modal controls are wired (robust wiring inside init)
    try{
      console.debug('[init] Buscando botón de crear manual: #createManualBtn');
      const createBtnInit = document.getElementById('createManualBtn'); 
      console.debug('[init] createManualBtn encontrado:', !!createBtnInit);
      if(createBtnInit) {
        console.debug('[init] Wirando eventos a #createManualBtn');
        createBtnInit.addEventListener('click', (ev)=>{ 
          console.debug('[createManualBtn click] Click detectado');
          ev.preventDefault(); 
          console.debug('[createManualBtn click] Llamando openNewManualModal()');
          openNewManualModal(); 
        });
      }
      // Wire export/import buttons in manuals panel
      const exportBtn = document.getElementById('exportManualsBtn');
      if(exportBtn) exportBtn.addEventListener('click', (ev) => { ev.preventDefault(); exportManuals(); });
      const importBtn = document.getElementById('importManualsBtn');
      if(importBtn) importBtn.addEventListener('click', (ev) => { ev.preventDefault(); importManuals(); });
      
      const adminCreateInit = document.getElementById('newManualBtn'); 
      if(adminCreateInit) {
        console.debug('[init] Wirando eventos a #newManualBtn');
        adminCreateInit.addEventListener('click', (ev)=>{ ev.preventDefault(); openNewManualModal(); });
      }
      const addStepInit = document.getElementById('addNewStepBtn'); 
      if(addStepInit) addStepInit.addEventListener('click', (ev)=>{ ev.preventDefault(); createStepEditorRow(); });
      const saveInit = document.getElementById('saveNewManualBtn'); 
      if(saveInit) saveInit.addEventListener('click', (ev)=>{ ev.preventDefault(); saveNewManual(); });
      // Wire PDF import
      if(els.processPdfBtn) els.processPdfBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); if(els.pdfFileInput && els.pdfFileInput.files.length > 0) importPdfManual(els.pdfFileInput.files[0]); else alert('Por favor selecciona un archivo PDF'); });
      // generic modal close buttons - use event delegation for dynamic modals
      document.addEventListener('click', (ev) => {
        const closeBtn = ev.target.closest('[data-close]');
        if(closeBtn){
          ev.preventDefault();
          const modal = closeBtn.closest('.modal');
          if(modal) modal.classList.add('hidden');
          else document.querySelectorAll('.modal').forEach(m=> m.classList.add('hidden'));
        }
      });
      console.debug('[init] ✓ Wiring modal completado');
      
      // Wire Fibra diagram controls
      if(els.createDiagramBtn) els.createDiagramBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); openDiagramEditor(); });
      const addNodeBtn = document.getElementById('addNodeBtn');
      if(addNodeBtn) addNodeBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); addNewNode(); });
      if(els.saveDiagramBtn) els.saveDiagramBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); saveDiagram(); });
      if(els.deleteDiagramBtn) els.deleteDiagramBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); if(confirm('¿Eliminar este diagrama?')) deleteDiagram(); });
      
      // Wire category management
      if(els.addCategoryBtn) els.addCategoryBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); addCategory(els.newCategoryInput.value); });
      if(els.changeManualCategoryBtn) els.changeManualCategoryBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); changeManualCategory(els.changeManualCategorySelect.value); });
      
      // Wire diagram viewer restart button
      if(els.diagramViewerRestartBtn) els.diagramViewerRestartBtn.addEventListener('click', (ev)=>{
        ev.preventDefault();
        const treeId = els.diagramViewerModal._treeId;
        const tree = STATE.diagrams.find(t => t.id === treeId);
        if(tree){
          els.diagramViewerModal._currentNodeId = tree.rootNodeId;
          els.diagramViewerModal._visitedPath = [];
          renderDiagramNode();
        }
      });
      
      // Render initial diagrams
      renderDiagrams();
    }catch(e){ console.warn('init modal wiring err', e); }
    // pass the search wrapper so search module can add clear button and handle outside clicks
    const searchWrap = document.querySelector('.search-wrap');
    setupSearch(STATE.manuals, {searchInput: els.searchInput, autocomplete: els.autocomplete, container: searchWrap}, {});

    // autocomplete selection
    els.autocomplete.addEventListener('select-suggestion', (ev)=>{
      openManual(ev.detail.id);
      els.autocomplete.classList.add('hidden');
    });

    // allow external render-suggestions event (from filters)
    els.autocomplete.addEventListener('render-suggestions', (ev)=>{
      const suggestions = ev.detail || [];
      els.autocomplete.innerHTML = '';
      if(!suggestions.length){ els.autocomplete.classList.add('hidden'); return; }
      els.autocomplete.classList.remove('hidden');
      suggestions.forEach(s=>{
        const btn = document.createElement('button'); btn.type='button';
        btn.innerHTML = `<strong>${escapeHtml(s.title)}</strong> <span class="muted">— ${escapeHtml(s.category)}</span><div class="small">${escapeHtml(s.summary||'')}</div>`;
        btn.addEventListener('click', ()=>{ openManual(s.id); els.autocomplete.classList.add('hidden'); });
        els.autocomplete.appendChild(btn);
      });
    });

    // global UI actions
    document.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click', navClick));
    document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click', ()=>openPanel(b.dataset.open)));

    // Agent mode toggle
    if(els.toggleAgentMode) {
      els.toggleAgentMode.addEventListener('click', ()=>{
        STATE.agentMode = !STATE.agentMode;
        localStorage.setItem('cw:agentMode', JSON.stringify(STATE.agentMode));
        document.getElementById('manualComments').classList.toggle('hidden', !STATE.agentMode);
        els.toggleAgentMode.classList.toggle('active', STATE.agentMode);
      });
    }

    // auth handlers
    if(els.loginBtn) els.loginBtn.addEventListener('click', ()=>{ showLoginModal(); });
    if(els.logoutBtn) els.logoutBtn.addEventListener('click', ()=>{ logout(); });
    if(els.loginSubmit) els.loginSubmit.addEventListener('click', async ()=>{ await login(); });
    // Allow Enter key to login
    if(els.loginUser) els.loginUser.addEventListener('keypress', async (ev)=>{ if(ev.key === 'Enter' && els.loginPass.value.trim()) await login(); });
    if(els.loginPass) els.loginPass.addEventListener('keypress', async (ev)=>{ if(ev.key === 'Enter' && els.loginUser.value.trim()) await login(); });
    // close login modal -> use helper to also restore scrolling (only if a close button exists)
    if(els.loginModal){ const cbtn = els.loginModal.querySelector('[data-close]'); if(cbtn) cbtn.addEventListener('click', ()=>hideLoginModal()); }

    // admin: add user
    if(els.addUserBtn) els.addUserBtn.addEventListener('click', ()=>{
      const name = els.newUserName.value.trim(); const role = els.newUserRole.value; const pass = els.newUserPass.value;
      if(!name || !pass){ alert('Nombre y contraseña son obligatorios'); return; }
      addUser({name, role, pass}).then(()=>{
        els.newUserName.value=''; els.newUserPass.value='';
      }).catch(err=>{ console.error(err); alert('Error creando usuario'); });
    });

    // admin: edit manual (button wired later)
    const editBtn = document.getElementById('editManualBtn');
    if(editBtn) editBtn.addEventListener('click', ()=>{ openManualEditor(); });
    // manual editor elements
    els.manualEditorModal = document.getElementById('manualEditorModal');
    els.editTitle = document.getElementById('editTitle');
    els.editSummary = document.getElementById('editSummary');
    els.editStepsList = document.getElementById('editStepsList');
    els.addStepBtn = document.getElementById('addStepBtn');
    els.deleteManualBtn = document.getElementById('deleteManualBtn');
    els.editVersionsList = document.getElementById('editVersionsList');
    els.exportCurrentBtn = document.getElementById('exportCurrentBtn');
    els.saveManualBtn = document.getElementById('saveManualBtn');
    if(els.saveManualBtn) els.saveManualBtn.addEventListener('click', ()=>{ saveManualEdits(); });
    if(els.addStepBtn) els.addStepBtn.addEventListener('click', ()=>{ addEditorStep(); });
    if(els.deleteManualBtn) els.deleteManualBtn.addEventListener('click', ()=>{ if(confirm('¿Eliminar manual? Esta acción es irreversible.')) deleteManual(STATE.current && STATE.current.id); });
    if(els.exportCurrentBtn) els.exportCurrentBtn.addEventListener('click', ()=>{ exportCurrentManual(); });
    // admin toolbar bindings
    const newManualBtn = document.getElementById('newManualBtn');
    if(newManualBtn) newManualBtn.addEventListener('click', ()=>openNewManualModal());

    // Settings handlers
    if(els.themeDark) {
      els.themeDark.addEventListener('change', (ev) => {
        STATE.darkMode = ev.target.checked;
        localStorage.setItem('cw:darkMode', JSON.stringify(STATE.darkMode));
        applyTheme();
      });
    }

    if(els.fontSizeSlider) {
      els.fontSizeSlider.addEventListener('input', (ev) => {
        STATE.fontSize = parseInt(ev.target.value);
        localStorage.setItem('cw:fontSize', String(STATE.fontSize));
        applyFontSize();
        if(els.fontSizeValue) els.fontSizeValue.textContent = STATE.fontSize + 'px';
      });
    }

    if(els.notifEnabled) {
      els.notifEnabled.addEventListener('change', (ev) => {
        STATE.notifEnabled = ev.target.checked;
        localStorage.setItem('cw:notifEnabled', JSON.stringify(STATE.notifEnabled));
      });
    }

    if(els.agentInputName) {
      els.agentInputName.addEventListener('change', (ev) => {
        STATE.agentName = ev.target.value.trim() || 'Agente';
        localStorage.setItem('cw:agentName', STATE.agentName);
        if(els.agentNameDisplay) els.agentNameDisplay.textContent = STATE.agentName;
      });
    }

    if(els.clearDataBtn) {
      els.clearDataBtn.addEventListener('click', () => {
        if(confirm('¿Estás seguro? Se eliminarán todos los datos locales (progreso, comentarios, historial).')) {
          localStorage.clear();
          STATE.progress = {};
          STATE.comments = {};
          STATE.history = [];
          renderHistory();
          pushNotification({title: 'Datos borrados', text: 'Todos los datos locales han sido eliminados.'});
        }
      });
    }

    // Update data usage display periodically
    updateDataUsage();
    setInterval(updateDataUsage, 5000);

    document.getElementById('qrBtn').addEventListener('click', showQr);
    document.getElementById('helpBtn').addEventListener('click', ()=>document.getElementById('helpModal').classList.remove('hidden'));
    document.getElementById('notificationsBtn').addEventListener('click', ()=>document.getElementById('notificationsPanel').classList.remove('hidden'));
    // safely bind close handler for qrModal if a close button exists
    const _qrModal = document.getElementById('qrModal');
    if(_qrModal){ const _qrClose = _qrModal.querySelector('[data-close]'); if(_qrClose) _qrClose.addEventListener('click', ()=>_qrModal.classList.add('hidden')); }
    document.querySelectorAll('#notificationsPanel [data-close], #helpModal [data-close]').forEach(b=>b.addEventListener('click', ()=>b.closest('.modal').classList.add('hidden')));
    els.addComment.addEventListener('click', addComment);

    // Defensive: ensure modals are hidden on init (keep loginModal control separate)
    ['helpModal','notificationsPanel','qrModal','manualEditorModal'].forEach(id=>{
      const m = document.getElementById(id);
      if(m && !m.classList.contains('hidden')) m.classList.add('hidden');
    });

    // Close modals on ESC and click outside modal-content
    window.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Escape'){
        document.querySelectorAll('.modal').forEach(m=>{
          if(m.id === 'loginModal'){
            // do not allow closing login modal with ESC while unauthenticated
            if(STATE.authUser) hideLoginModal();
          } else m.classList.add('hidden');
        });
      }
    });
    document.querySelectorAll('.modal').forEach(modal=>{
      modal.addEventListener('click', (ev)=>{
        if(ev.target === modal) {
          if(modal.id === 'loginModal'){
            if(STATE.authUser) hideLoginModal();
          } else modal.classList.add('hidden');
        }
      });
    });

    // initial render of faqs and history
    // Load base faqs from data and merge with custom faqs from localStorage
    const baseFaqs = json.faqs || [];
    let customFaqs = JSON.parse(localStorage.getItem('cw:faqs')||'null');
    if(!customFaqs){
      // seed a few useful FAQs so the panel isn't empty on first run
      customFaqs = [
        { id: 'custom-1', q: '¿Cómo reinicio un router?', a: 'Desconecta el router de la corriente, espera 30 segundos y vuelve a conectar. Espera 2-3 minutos para que se estabilice la conexión.' , created: Date.now() },
        { id: 'custom-2', q: 'Cliente con internet lento', a: 'Comprueba primero la velocidad con una prueba (speedtest). Reinicia el router; si persiste, revisa interferencias Wi‑Fi y el estado del cableado.' , created: Date.now() },
        { id: 'custom-3', q: 'No hay señal de TV', a: 'Verifica que el decodificador esté encendido y conectado. Reinicia el equipo y comprueba las entradas HDMI/AV.' , created: Date.now() }
      ];
      localStorage.setItem('cw:faqs', JSON.stringify(customFaqs));
    }
    STATE.faqs = (baseFaqs || []).concat(customFaqs || []);
    renderFaqs(STATE.faqs || []);

    // Wire FAQ management UI
    els.createFaqBtn = document.getElementById('createFaqBtn');
    els.faqModal = document.getElementById('faqModal');
    els.faqQuestion = document.getElementById('faqQuestion');
    els.faqAnswer = document.getElementById('faqAnswer');
    els.saveFaqBtn = document.getElementById('saveFaqBtn');
    els.deleteFaqBtn = document.getElementById('deleteFaqBtn');
    els.faqSearch = document.getElementById('faqSearch');
    els.clearFaqSearch = document.getElementById('clearFaqSearch');
    els.exportAllDataBtn = document.getElementById('exportAllDataBtn');

    if(els.createFaqBtn) els.createFaqBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); openFaqModal(); });
    if(els.saveFaqBtn) els.saveFaqBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); saveFaq(); });
    if(els.deleteFaqBtn) els.deleteFaqBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); if(confirm('¿Eliminar esta FAQ?')) deleteFaq(els.deleteFaqBtn.dataset.id); });
    if(els.faqSearch) els.faqSearch.addEventListener('input', debounce((ev)=>{ filterFaqs(ev.target.value); }, 220));
    if(els.clearFaqSearch) els.clearFaqSearch.addEventListener('click', ()=>{ if(els.faqSearch) { els.faqSearch.value=''; filterFaqs(''); } });
    if(els.exportAllDataBtn) els.exportAllDataBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); exportAllData(); });

    renderHistory();

  }catch(err){
    console.error(err);
    showLoadError(err);
  }
}

// FAQ helpers: open modal for new or existing FAQ
function openFaqModal(faq){
  if(faq && faq.id){
    // editing existing
    if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Solo administradores pueden editar FAQs.'); return; }
    if(els.faqQuestion) els.faqQuestion.value = faq.q || '';
    if(els.faqAnswer) els.faqAnswer.value = faq.a || '';
    if(els.deleteFaqBtn) { els.deleteFaqBtn.style.display = ''; els.deleteFaqBtn.dataset.id = faq.id; }
    if(els.faqModal) els.faqModal.classList.remove('hidden');
    els.faqModal._editingId = faq.id;
  } else {
    // creating new
    if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Solo administradores pueden crear FAQs.'); return; }
    if(els.faqQuestion) els.faqQuestion.value = '';
    if(els.faqAnswer) els.faqAnswer.value = '';
    if(els.deleteFaqBtn) { els.deleteFaqBtn.style.display = 'none'; delete els.deleteFaqBtn.dataset.id; }
    if(els.faqModal) els.faqModal.classList.remove('hidden');
    delete els.faqModal._editingId;
  }
}

function persistFaqs(){
  const customs = (STATE.faqs || []).filter(f=> String(f.id||'').startsWith('custom-') || String(f.id||'').startsWith('import-'));
  localStorage.setItem('cw:faqs', JSON.stringify(customs));
}

function saveFaq(){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Solo administradores pueden guardar FAQs.'); return; }
  if(!els.faqQuestion || !els.faqAnswer) return;
  const q = els.faqQuestion.value.trim(); const a = els.faqAnswer.value.trim();
  if(!q || !a){ alert('Pregunta y respuesta son obligatorias.'); return; }
  // editing?
  const editingId = els.faqModal && els.faqModal._editingId;
  if(editingId){
    const idx = (STATE.faqs||[]).findIndex(x=>x.id === editingId);
    if(idx !== -1){ STATE.faqs[idx].q = q; STATE.faqs[idx].a = a; }
    pushNotification({title:'FAQ actualizada', text: q});
  } else {
    const id = 'custom-' + Date.now();
    const newFaq = { id, q, a, created: Date.now() };
    STATE.faqs = STATE.faqs || [];
    STATE.faqs.unshift(newFaq);
    pushNotification({title:'FAQ creada', text: q});
  }
  persistFaqs();
  renderFaqs(STATE.faqs);
  if(els.faqModal) els.faqModal.classList.add('hidden');
}

function deleteFaq(id){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Solo administradores pueden eliminar FAQs.'); return; }
  if(!id) return;
  STATE.faqs = (STATE.faqs||[]).filter(f=>f.id !== id);
  persistFaqs();
  renderFaqs(STATE.faqs);
  pushNotification({title:'FAQ eliminada', text: id});
}

function showLoadError(err){
  // remove any existing overlay
  const existing = document.getElementById('cwLoadError');
  if(existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'cwLoadError';
  overlay.setAttribute('role','alert');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.background = 'rgba(8,15,30,0.5)';
  overlay.style.zIndex = '9999';
  overlay.innerHTML = `
    <div style="background:var(--cw-surface);padding:22px;border-radius:12px;max-width:720px;box-shadow:var(--shadow)">
      <h3>Error cargando contenido</h3>
      <p>Ha ocurrido un error al cargar los manuales: <strong>${escapeHtml(String(err.message||err))}</strong></p>
      <p>Comprueba la conexión o pulsa <strong>Reintentar</strong>. Si el problema persiste, contacta con el equipo técnico.</p>
      <div style="display:flex;gap:10px;margin-top:12px;justify-content:flex-end">
        <button id="cwRetry" style="padding:10px 14px;border-radius:8px">Reintentar</button>
        <button id="cwDismiss" style="padding:10px 14px;border-radius:8px;background:transparent;border:1px solid #e6eef8">Cerrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('cwRetry').addEventListener('click', ()=>{ overlay.remove(); init(); });
  document.getElementById('cwDismiss').addEventListener('click', ()=>overlay.remove());
}

function navClick(ev){
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.remove('active'));
  ev.target.classList.add('active');
  openPanel(ev.target.dataset.nav);
}

function openPanel(name){
  // show/hide panels
  document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
  if(name === 'dashboard') {
    document.getElementById('welcome').classList.remove('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden');
  }
  else if(name === 'manuals') {
    document.getElementById('manualsListView').classList.remove('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden');
  }
  else if(name === 'fibra') {
    document.getElementById('fibraView').classList.remove('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden');
    // Render diagrams when opening Fibra section
    renderDiagrams();
  }
  else if(name === 'faqs') {
    document.getElementById('faqsView').classList.remove('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden');
  }
  else if(name === 'settings') {
    document.getElementById('settingsView').classList.remove('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden');
  }
  else if(name === 'history') {
    document.getElementById('historyView').classList.remove('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden');
  }
}

function renderManualsList(manuals, allCategories = []){
  const container = document.getElementById('manualsList');
  container.innerHTML = '';
  const overrides = STATE.manualOverrides || {};
  const byCat = groupBy(manuals, 'category');
  const sections = [];

  allCategories.forEach(cat => {
    const catSection = document.createElement('section');
    catSection.className = 'manuals-category';
    catSection.setAttribute('data-category', cat);

    const header = document.createElement('div');
    header.className = 'category-header';
    header.tabIndex = 0;
    header.role = 'button';
    header.setAttribute('aria-expanded', 'false');

    const title = document.createElement('h4');
    title.textContent = cat;
    header.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'category-meta';
    const manualsInCat = byCat[cat] || [];
    const count = manualsInCat.length;
    meta.textContent = count === 1 ? '1 manual' : `${count} manuales`;
    header.appendChild(meta);

    const toggle = document.createElement('button');
    toggle.className = 'category-toggle';
    toggle.type = 'button';
    toggle.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5l8 7-8 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    header.appendChild(toggle);

    const body = document.createElement('div');
    body.className = 'category-body';

    // Build manual cards
    manualsInCat.forEach(m => {
      const ov = overrides[m.id];
      if(ov && ov.deleted) return;

      const card = document.createElement('div');
      card.className = 'manual-card';
      const catSlug = String(cat).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      card.classList.add(catSlug);

      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.flexDirection = 'column';
      left.style.gap = '8px';
      left.style.flex = '1';

      const h = document.createElement('h5');
      h.className = 'manual-card-title';
      h.textContent = m.title;
      left.appendChild(h);

      // summary removed by request: cards show only title + access arrow

      const actions = document.createElement('div');
      actions.className = 'manual-card-actions';
      const openBtn = document.createElement('button');
      openBtn.className = 'card-open';
      openBtn.title = 'Abrir manual';
      openBtn.innerHTML = '→';
      openBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openManual(m.id);
      });
      actions.appendChild(openBtn);

      card.appendChild(left);
      card.appendChild(actions);
      card.addEventListener('click', () => openManual(m.id));
      body.appendChild(card);
    });

    // Append to section
    catSection.appendChild(header);
    catSection.appendChild(body);
    container.appendChild(catSection);

      function toggleCategory(expand) {
      if (expand) {
        catSection.classList.add('expanded');
        header.setAttribute('aria-expanded', 'true');
        
        // Fuerza un reflow para que el navegador calcule las dimensiones
        void body.offsetHeight;
        
        // Ahora calcula la altura real del contenido
        const scrollH = body.scrollHeight;
        body.style.maxHeight = scrollH + 'px';
        // give a little breathing room at the bottom inside the expanded body
        body.style.paddingBottom = '12px';
      } else {
        catSection.classList.remove('expanded');
        header.setAttribute('aria-expanded', 'false');
        body.style.maxHeight = '0px';
        body.style.paddingBottom = '0px';
      }
    }

    header.addEventListener('click', () => {
      const isExpanded = catSection.classList.contains('expanded');
      toggleCategory(!isExpanded);
    });

    header.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        const isExpanded = catSection.classList.contains('expanded');
        toggleCategory(!isExpanded);
      }
    });

    toggle.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const isExpanded = catSection.classList.contains('expanded');
      toggleCategory(!isExpanded);
    });

    sections.push({ section: catSection, toggleCategory, body, header });
  });

  // Expand/Collapse all buttons
  const controlsId = 'manuals-controls';
  let controls = document.getElementById(controlsId);
  if (!controls) {
    controls = document.createElement('div');
    controls.id = controlsId;
    controls.style.display = 'flex';
    controls.style.justifyContent = 'flex-end';
    controls.style.gap = '10px';
    controls.style.marginBottom = '16px';
    container.prepend(controls);
  } else {
    controls.innerHTML = '';
  }

  const expandAll = document.createElement('button');
  expandAll.className = 'secondary';
  expandAll.textContent = '✕ Expandir todo';
  expandAll.addEventListener('click', () => {
    sections.forEach(({ toggleCategory }) => {
      toggleCategory(true);
    });
  });
  controls.appendChild(expandAll);

  const collapseAll = document.createElement('button');
  collapseAll.className = 'secondary';
  collapseAll.textContent = '✕ Colapsar todo';
  collapseAll.addEventListener('click', () => {
    sections.forEach(({ toggleCategory }) => {
      toggleCategory(false);
    });
  });
  controls.appendChild(collapseAll);
}

function openManual(id){
  try{
    console.debug('openManual called', id);
    let manual = findManualById(STATE.manuals,id);
    if(!manual){
      console.warn('Manual not found:', id);
      pushNotification({title:'Manual no encontrado', text:`ID: ${id}`});
      return;
    }
    // apply manual overrides (admin edits) if present
    const overr = STATE.manualOverrides && STATE.manualOverrides[manual.id];
    if(overr){ manual = Object.assign({}, manual, overr); }
    STATE.current = manual;
    
    // Add to history
    addToHistory(id);
    
    // hide other list views so manual becomes the focused view
    const ml = document.getElementById('manualsListView'); if(ml) ml.classList.add('hidden');
    document.getElementById('welcome').classList.add('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden'); // Hide floating toolbar when viewing manual (guarded)
    els.manualView.classList.remove('hidden');
    els.manualTitle.textContent = manual.title;
    els.manualCategory.textContent = manual.category;
    els.manualVersion.textContent = `v${manual.version}`;
    renderSteps(manual);
    renderComments(manual.id);
    renderVersions(manual);
    // bring manual view into focus and top of viewport for clarity
    try{
      els.manualView.setAttribute('tabindex','-1');
      // focus without causing page scroll; avoid automatic smooth scrolling which can push viewport
      try{ els.manualView.focus({preventScroll:true}); }catch(e){ els.manualView.focus(); }
    }catch(e){/* ignore */}
  }catch(e){
    console.error('Error opening manual', e);
    pushNotification({title:'Error al abrir manual', text: String(e.message||e)});
  }
}

function renderSteps(manual){
  // Clear old
  els.manualSteps.innerHTML = '';
  if(els.manualStepsNav) els.manualStepsNav.innerHTML = '';

  const total = (manual.steps && manual.steps.length) || 0;
  (manual.steps||[]).forEach((s,idx)=>{
    const div = document.createElement('div');
    div.className = 'step';
    div.id = `step-${idx}`;

    const meta = document.createElement('div'); meta.className='step-meta';
    const leftMeta = document.createElement('div'); leftMeta.style.display='flex'; leftMeta.style.alignItems='center';
    const number = document.createElement('span'); number.className='step-number'; number.textContent = idx+1;
    const h = document.createElement('h4'); h.textContent = `${s.title}`; h.style.margin='0'; h.style.fontSize='0.95rem';
    leftMeta.appendChild(number); leftMeta.appendChild(h);
    meta.appendChild(leftMeta);

    const actions = document.createElement('div');
    const doneBtn = document.createElement('button');
    doneBtn.className = 'done';
    const isDone = STATE.progress[manual.id] && STATE.progress[manual.id].includes(idx);
    const svgCheck = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const svgMark = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if(isDone){ doneBtn.classList.add('done-true'); doneBtn.innerHTML = svgCheck + '<span>Completado</span>'; }
    else { doneBtn.innerHTML = svgMark + '<span>Marcar completado</span>'; }
    doneBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); toggleStepProgress(manual.id, idx, doneBtn); });
    actions.appendChild(doneBtn);
    meta.appendChild(actions);

    const content = document.createElement('div'); content.className='step-content';
    // insert optional image if provided
    if(s.image){
      const img = document.createElement('img'); img.src = s.image; img.alt = s.title || 'Imagen del paso'; img.style.maxWidth = '100%'; img.style.borderRadius = '8px'; img.style.marginBottom = '12px'; content.appendChild(img);
    }
    // step content (HTML allowed)
    const html = document.createElement('div'); html.innerHTML = s.content || '';
    content.appendChild(html);
    div.appendChild(meta); div.appendChild(content);
    els.manualSteps.appendChild(div);

    // nav button (right)
    if(els.manualStepsNav){
      const navBtn = document.createElement('button');
      navBtn.type='button'; navBtn.dataset.idx = idx; navBtn.textContent = `${idx+1}. ${s.title}`;
      navBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); scrollToStep(idx, true); updateNavActive(idx); window.location.hash = `manual=${manual.id}&step=${idx}`; });
      els.manualStepsNav.appendChild(navBtn);
    }
  });

  // helper: scroll the main scroll container so the selected step appears under manual header
  function scrollToStep(idx, smooth){
    try{
      const root = document.querySelector('.main') || window;
      const target = document.getElementById(`step-${idx}`);
      if(!target) return;
      const manualHeader = document.querySelector('#manualView .manual-header');
      const headerOffset = manualHeader ? manualHeader.getBoundingClientRect().height + 8 : 0;
      if(root === window){
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 8;
        window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
      } else {
        const rootRect = root.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset = (targetRect.top - rootRect.top) + root.scrollTop - headerOffset - 8;
        root.scrollTo({ top: offset, behavior: smooth ? 'smooth' : 'auto' });
      }
    }catch(e){ console.warn('scrollToStep err', e); }
  }

  // Ensure first step is visible at the top on initial render (avoid large blank area)
  setTimeout(()=>{ scrollToStep(0, false); }, 0);

  // update progress indicator in header
  const progContainerSelector = '#manualView .manual-header';
  const mh = document.querySelector(progContainerSelector);
  if(mh){
    let prog = mh.querySelector('.manual-progress');
    if(!prog){
      prog = document.createElement('div'); prog.className='manual-progress'; const inner = document.createElement('i'); prog.appendChild(inner); mh.appendChild(prog);
    }
    const completed = (STATE.progress[manual.id] && STATE.progress[manual.id].length) || 0;
    const pct = total ? Math.round((completed/total)*100) : 0;
    const inner = prog.querySelector('i'); if(inner) inner.style.width = pct + '%';
  }

  // simple static nav activation: no scroll-based animation or auto-activation
  try{
    function updateNavActive(idx){
      document.querySelectorAll('.step').forEach(s=> s.classList.toggle('active', idx !== null && s.id === `step-${idx}`));
      const navBtns = els.manualStepsNav ? Array.from(els.manualStepsNav.querySelectorAll('button')) : [];
      navBtns.forEach(b=> b.classList.toggle('active', idx !== null && parseInt(b.dataset.idx,10) === idx));
      if(idx !== null){
        history.replaceState(null,'', `#manual=${manual.id}&step=${idx}`);
        const progInner = document.querySelector('#manualView .manual-progress > i');
        if(progInner){ const total = (manual.steps||[]).length; const percent = Math.round(((idx+1)/Math.max(1,total))*100); progInner.style.width = percent + '%'; }
      }
    }
    // ensure the first step shows as active after initial scroll
    setTimeout(()=>{ updateNavActive(0); }, 60);
    // expose helper for nav buttons created earlier
    window.__cw_updateNavActive = updateNavActive;
  }catch(e){ console.warn('nav activation setup err', e); }
}

function toggleStepProgress(manualId, idx, btn){
  STATE.progress[manualId] = STATE.progress[manualId] || [];
  const arr = STATE.progress[manualId];
  const i = arr.indexOf(idx);
  const svgCheck = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const svgMark = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if(i === -1){ arr.push(idx); if(btn){ btn.classList.add('done-true'); btn.innerHTML = svgCheck + '<span>Completado</span>'; } }
  else { arr.splice(i,1); if(btn){ btn.classList.remove('done-true'); btn.innerHTML = svgMark + '<span>Marcar completado</span>'; } }
  localStorage.setItem('cw:progress', JSON.stringify(STATE.progress));
}

function showQr(){
  if(!STATE.current) return;
  const url = location.origin + location.pathname.replace(/\/[^/]*$/,'') + `html/index.html#manual=${STATE.current.id}`;
  // prefer client-side generation if library available
  if(window.QRCode && QRCode.toDataURL){
    QRCode.toDataURL(url, {width:240}).then(dataUrl=>{
      els.qrImage.src = dataUrl; els.qrModal.classList.remove('hidden');
    }).catch(()=>{ fallbackQr(url); });
  } else {
    fallbackQr(url);
  }
}

function fallbackQr(url){
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;
  els.qrImage.src = qrUrl; els.qrModal.classList.remove('hidden');
}

function renderComments(manualId){
  const list = STATE.comments[manualId]||[];
  els.commentsList.innerHTML = '';
  if(!list.length) els.commentsList.textContent = 'Sin comentarios.';
  list.forEach((c, idx)=>{
    const d = document.createElement('div'); 
    d.className='comment';
    d.style.display = 'flex';
    d.style.justifyContent = 'space-between';
    d.style.alignItems = 'flex-start';
    d.style.gap = '12px';
    
    const text = document.createElement('div');
    text.textContent = `${c.by||'Agente'}: ${c.text}`;
    text.style.flex = '1';
    d.appendChild(text);
    
    // Agregar botón de eliminar solo para admins
    const user = STATE.authUser;
    if(user && user.role === 'admin'){
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn';
      deleteBtn.title = 'Eliminar comentario';
      deleteBtn.innerHTML = '✕';
      deleteBtn.style.fontSize = '14px';
      deleteBtn.style.color = 'var(--cw-danger)';
      deleteBtn.style.padding = '4px 8px';
      deleteBtn.addEventListener('click', (e)=>{
        e.stopPropagation();
        if(confirm('¿Eliminar este comentario?')){
          STATE.comments[manualId].splice(idx, 1);
          localStorage.setItem('cw:comments', JSON.stringify(STATE.comments));
          renderComments(manualId);
          pushNotification({title:'Comentario eliminado'});
        }
      });
      d.appendChild(deleteBtn);
    }
    
    els.commentsList.appendChild(d);
  });
}

function addComment(){
  if(!STATE.current) return;
  // Only allow comments for agents (agentMode) or admins
  const user = STATE.authUser;
  if(!(STATE.agentMode || (user && user.role === 'admin'))){
    alert('Activa el modo agente para poder comentar, o inicia sesión como administrador.');
    return;
  }
  const text = els.commentInput.value.trim(); if(!text) return;
  STATE.comments[STATE.current.id] = STATE.comments[STATE.current.id]||[];
  const by = (STATE.authUser && STATE.authUser.name) || STATE.agentName || 'Agente';
  STATE.comments[STATE.current.id].push({by, text,at:Date.now()});
  localStorage.setItem('cw:comments', JSON.stringify(STATE.comments));
  els.commentInput.value = '';
  renderComments(STATE.current.id);
  pushNotification({title:'Comentario añadido',text:`Comentario en ${STATE.current.title}`});
}

function renderVersions(manual){
  els.versionsList.innerHTML = '';
  if(manual.versions && manual.versions.length){
    manual.versions.forEach(v=>{
      const li = document.createElement('li'); li.textContent = `${v.version} — ${v.note} (${new Date(v.date).toLocaleDateString()})`;
      els.versionsList.appendChild(li);
    });
  } else {
    els.versionsList.textContent = 'Sin historial de versiones.';
  }
}

function renderFaqs(faqs){
  const container = document.getElementById('faqsList'); if(!container) return; container.innerHTML = '';
  const list = (faqs||[]).slice();
  if(list.length === 0){
    container.innerHTML = '<div class="empty-state">No hay FAQs aún. Usa "Crear FAQ" para añadir preguntas frecuentes.</div>';
    return;
  }
  list.forEach((f, idx)=>{
    const item = document.createElement('div'); item.className = 'faq-item'; item.dataset.id = f.id || `faq-${idx}`;
    const q = document.createElement('h5'); q.textContent = f.q || 'Pregunta sin título';
    const a = document.createElement('div'); a.className = 'faq-answer muted'; a.style.display = 'none'; a.innerHTML = f.a || '';
    // toggle
    item.addEventListener('click', (ev)=>{ if(ev.target.tagName.toLowerCase() === 'button') return; a.style.display = a.style.display === 'none' ? 'block' : 'none'; });

    // admin controls
    const controls = document.createElement('div'); controls.style.display = 'flex'; controls.style.gap = '8px'; controls.style.marginTop = '8px';
    const editBtn = document.createElement('button'); editBtn.className = 'small-btn'; editBtn.textContent = 'Editar'; editBtn.type = 'button';
    editBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); openFaqModal(f); });
    const delBtn = document.createElement('button'); delBtn.className = 'secondary'; delBtn.textContent = 'Eliminar'; delBtn.type = 'button';
    delBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); if(confirm('¿Eliminar esta FAQ?')) deleteFaq(f.id); });
    controls.appendChild(editBtn); controls.appendChild(delBtn);

    item.appendChild(q);
    // short preview
    if(f.a && String(f.a).length > 200){
      const preview = document.createElement('p'); preview.textContent = String(f.a).slice(0,200) + '...'; preview.style.color = 'var(--cw-text-muted)'; item.appendChild(preview);
    } else if(f.a){
      const preview = document.createElement('p'); preview.textContent = f.a; preview.style.color = 'var(--cw-text-muted)'; item.appendChild(preview);
    }

    // append answer and controls (controls visible only for admins via data-admin attribute handling in refreshAuthUI)
    item.appendChild(a);
    const ctrlWrap = document.createElement('div'); ctrlWrap.style.display='flex'; ctrlWrap.style.justifyContent='flex-end'; ctrlWrap.appendChild(controls);
    ctrlWrap.setAttribute('data-admin','');
    item.appendChild(ctrlWrap);
    container.appendChild(item);
  });
}

// Utility: debounce a function
function debounce(fn, wait){
  let t;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=> fn.apply(this, args), wait);
  };
}

// Escape regex special chars for safe search
function escapeRegExp(string){
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Highlight occurrences of query inside an element's text nodes (simple implementation)
function highlightText(el, query){
  if(!el || !query) return;
  const re = new RegExp('('+escapeRegExp(query)+')', 'ig');
  // Walk element children and replace text nodes
  function walk(node){
    if(node.nodeType === 3){ // text
      if(re.test(node.nodeValue)){
        const span = document.createElement('span');
        span.innerHTML = node.nodeValue.replace(re, '<mark class="cw-hl">$1</mark>');
        node.parentNode.replaceChild(span, node);
      }
    } else if(node.nodeType === 1 && node.childNodes && !['SCRIPT','STYLE','MARK'].includes(node.tagName)){
      Array.from(node.childNodes).forEach(walk);
    }
  }
  walk(el);
}

// Filter FAQs by query (renders filtered list and highlights matches)
function filterFaqs(query){
  query = (query||'').trim();
  if(!query){ renderFaqs(STATE.faqs || []); return; }
  const q = query.toLowerCase();
  const filtered = (STATE.faqs||[]).filter(f => {
    return (String(f.q||'')+ ' ' + String(f.a||'')).toLowerCase().indexOf(q) !== -1;
  });
  renderFaqs(filtered);
  // highlight matches in rendered DOM
  setTimeout(()=>{
    const container = document.getElementById('faqsList');
    if(!container) return;
    Array.from(container.querySelectorAll('.faq-item')).forEach(item=>{
      const qEl = item.querySelector('h5');
      const pEl = item.querySelector('p');
      const aEl = item.querySelector('.faq-answer');
      try{ highlightText(qEl, query); }catch(e){}
      try{ if(pEl) highlightText(pEl, query); }catch(e){}
      try{ if(aEl) highlightText(aEl, query); }catch(e){}
    });
  }, 30);
}

// Export all localStorage keys that start with 'cw:' as a JSON file
function exportAllData(){
  const out = {};
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(k && k.indexOf('cw:') === 0){
      try{ out[k] = JSON.parse(localStorage.getItem(k)); }catch(e){ out[k] = localStorage.getItem(k); }
    }
  }
  const data = JSON.stringify(out, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `callcenter-data-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  pushNotification({title:'Exportación completa', text: 'Se ha descargado un respaldo de los datos locales.'});
}

/* Notifications (simple local in-app system) */
function pushNotification(n){
  const list = JSON.parse(localStorage.getItem('cw:notifs')||'[]');
  list.unshift({id:Date.now(),...n});
  localStorage.setItem('cw:notifs', JSON.stringify(list.slice(0,50)));
  renderNotifications();
}

function renderNotifications(){
  const list = JSON.parse(localStorage.getItem('cw:notifs')||'[]');
  const el = document.getElementById('notificationsList');
  const badge = document.getElementById('notifCount');
  if(!list.length){ el.textContent = 'No hay notificaciones.'; badge.classList.add('hidden'); return; }
  badge.classList.remove('hidden'); badge.textContent = String(list.length);
  el.innerHTML = '';
  list.forEach(n=>{
    const div = document.createElement('div'); div.className='notif panel'; div.innerHTML = `<strong>${n.title}</strong><div class="small muted">${n.text||''}</div>`; el.appendChild(div);
  });
}

function escapeHtml(str){
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// helper to group items by key
function groupBy(arr, key){
  const obj = {};
  arr.forEach(item => {
    const k = item[key] || 'Other';
    if(!obj[k]) obj[k] = [];
    obj[k].push(item);
  });
  return obj;
}

// when loading with #manual=id open automatically
function handleHashOpen(){
  // Robust parsing of hash params like: #manual=ID&step=2
  const raw = location.hash.replace(/^#/, '');
  if(!raw) return;
  const parts = raw.split('&').map(p=>p.split('='));
  const params = {};
  parts.forEach(([k,v])=>{ if(k) params[k] = v ? decodeURIComponent(v) : ''; });
  if(params.manual){ openManual(params.manual); }
}

// History management
function addToHistory(manualId){
  const manual = findManualById(STATE.manuals, manualId);
  if(!manual) return;
  
  const now = Date.now();
  STATE.history = STATE.history.filter(h => h.id !== manualId);
  STATE.history.unshift({id: manualId, title: manual.title, timestamp: now});
  STATE.history = STATE.history.slice(0, 20); // Keep last 20
  localStorage.setItem('cw:history', JSON.stringify(STATE.history));
}

function renderHistory(){
  if(!els.historyList) return;
  
  if(!STATE.history || STATE.history.length === 0){
    els.historyList.innerHTML = '<div class="empty-state"><p>Sin historial. Los manuales visitados aparecerán aquí.</p></div>';
    return;
  }
  
  els.historyList.innerHTML = '';
  STATE.history.forEach(h => {
    const card = document.createElement('div');
    card.className = 'manual-card';
    card.style.cursor = 'pointer';
    card.innerHTML = `
      <div>
        <h5 class="manual-card-title">${escapeHtml(h.title)}</h5>
        <p style="color: var(--cw-text-muted); font-size: 12px; margin: 0;">
          ${new Date(h.timestamp).toLocaleDateString('es-ES', {hour: '2-digit', minute: '2-digit'})}
        </p>
      </div>
      <div class="manual-card-actions">
        <button class="card-open" aria-label="Abrir">→</button>
      </div>
    `;
    card.addEventListener('click', () => openManual(h.id));
    els.historyList.appendChild(card);
  });
}

// Theme management
function applyTheme(){
  if(STATE.darkMode){
    document.documentElement.style.setProperty('--cw-bg', '#0f1721');
    document.documentElement.style.setProperty('--cw-surface', '#1a2230');
    document.documentElement.style.setProperty('--cw-surface-alt', '#242d38');
    document.documentElement.style.setProperty('--cw-text', '#f0f4f8');
    document.documentElement.style.setProperty('--cw-text-muted', '#9ca3af');
    document.documentElement.style.setProperty('--cw-border', '#3a444f');
    document.documentElement.style.setProperty('--cw-border-light', 'rgba(255, 255, 255, 0.06)');
  } else {
    document.documentElement.style.setProperty('--cw-bg', '#f8f9fb');
    document.documentElement.style.setProperty('--cw-surface', '#ffffff');
    document.documentElement.style.setProperty('--cw-surface-alt', '#f5f7fa');
    document.documentElement.style.setProperty('--cw-text', '#0f1721');
    document.documentElement.style.setProperty('--cw-text-muted', '#6b7280');
    document.documentElement.style.setProperty('--cw-border', '#e5e7eb');
    document.documentElement.style.setProperty('--cw-border-light', 'rgba(15, 23, 42, 0.06)');
  }
}

function applyFontSize(){
  document.body.style.fontSize = STATE.fontSize + 'px';
}

// Data usage calculation
function updateDataUsage(){
  if(!els.dataUsage) return;
  
  let totalSize = 0;
  for(let key in localStorage){
    if(key.startsWith('cw:')){
      totalSize += localStorage[key].length;
    }
  }
  
  const sizeKB = (totalSize / 1024).toFixed(2);
  els.dataUsage.textContent = sizeKB + ' KB';
}

// Hash a password using Web Crypto (SHA-256) and return hex string
async function hashPassword(password){
  if(!password) return '';
  try{
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hash = await (crypto.subtle || window.crypto.subtle).digest('SHA-256', data);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(e){
    // fallback: simple (insecure) hash if Web Crypto unavailable
    let h = 0; for(let i=0;i<password.length;i++){ h = ((h<<5)-h) + password.charCodeAt(i); h |= 0; }
    return String(h);
  }
}

// Show/hide login modal and manage body scroll
function showLoginModal(){
  if(!els.loginModal) return;
  els.loginModal.classList.remove('hidden');
  // ensure modal is visible at top and prevent background scroll
  try{ window.scrollTo(0,0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }catch(e){}
  document.body.style.overflow = 'hidden';
  // hide sidebar and header top-actions while login is visible
  document.querySelectorAll('.top-actions').forEach(el => el.classList.add('hidden'));
}

function hideLoginModal(){
  if(!els.loginModal) return;
  els.loginModal.classList.add('hidden');
  document.body.style.overflow = '';
  // restore sidebar/header top-actions depending on auth
  document.querySelectorAll('.top-actions').forEach(el=>{
    if(STATE.authUser) el.classList.remove('hidden'); else el.classList.add('hidden');
  });
}

/* ---------------------- User & Auth management ---------------------- */
async function initUsers(){
  // If no users exist, seed a default admin (store hashed password)
  if(!STATE.users || !Array.isArray(STATE.users)){
    // default admin password changed to 'admin' per user request
    const passHash = await hashPassword('admin');
    console.debug('Seeding admin user with passHash:', passHash);
    STATE.users = [{id: 'u-admin', name: 'admin', role: 'admin', passHash}];
    saveUsers();
  } else {
    // migrate any legacy plain-text 'pass' fields to passHash
    let changed = false;
    for(let u of STATE.users){
      if(u.pass && !u.passHash){
        // compute hash and remove plain pass
        /* eslint-disable no-await-in-loop */
        u.passHash = await hashPassword(u.pass);
        delete u.pass;
        changed = true;
      }
    }
    if(changed) saveUsers();
  }
  // Ensure at least one admin user exists
  const hasAdmin = STATE.users && STATE.users.some(u => u.role === 'admin');
  if(!hasAdmin){
    const passHash2 = await hashPassword('admin');
    console.debug('Ensuring admin exists, seeding with passHash:', passHash2);
    STATE.users.push({id: 'u-admin-'+Date.now(), name: 'admin', role: 'admin', passHash: passHash2});
    saveUsers();
  }
  console.debug('Final STATE.users after init:', STATE.users);
  renderUsersList();
}

function saveUsers(){
  localStorage.setItem('cw:users', JSON.stringify(STATE.users));
}

function renderUsersList(){
  if(!els.usersList) return;
  els.usersList.innerHTML = '';
  STATE.users.forEach(u => {
    const row = document.createElement('div'); row.className='user-row';
    row.innerHTML = `<div><strong>${escapeHtml(u.name)}</strong> <span class="meta">${escapeHtml(u.role)}</span></div>`;
    const controls = document.createElement('div'); controls.className='controls';
    const del = document.createElement('button'); del.className='secondary'; del.textContent='Eliminar';
    del.addEventListener('click', ()=>{ if(u.role==='admin'){ if(!confirm('Eliminar administrador? Confirma')) return; } removeUser(u.id); });
    controls.appendChild(del);
    row.appendChild(controls);
    els.usersList.appendChild(row);
  });
}

async function addUser({name, role, pass}){
  // only admins can programmatically add users
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){
    throw new Error('Permiso denegado: se requieren privilegios de administrador.');
  }
  const id = 'u-'+Date.now();
  const passHash = await hashPassword(pass);
  STATE.users.push({id, name, role, passHash});
  saveUsers(); renderUsersList();
  pushNotification({title:'Usuario creado', text: `${name} (${role})`});
}

function removeUser(id){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Permiso denegado'); return; }
  STATE.users = STATE.users.filter(u=>u.id !== id);
  saveUsers(); renderUsersList();
}

async function login(){
  const u = els.loginUser.value.trim(); const p = els.loginPass.value;
  if(!u || !p){ alert('Introduce usuario y contraseña'); return; }
  console.debug('Login attempt:', u, 'Users in STATE:', STATE.users);
  const found = STATE.users.find(x=>x.name === u);
  if(!found){ console.warn('User not found:', u); alert('Credenciales inválidas'); return; }
  if(!found.passHash){ console.warn('No passHash for user:', u); alert('Credenciales inválidas'); return; }
  const pHash = await hashPassword(p);
  console.debug('Password hash comparison:', pHash, 'vs', found.passHash, 'match:', pHash === found.passHash);
  if(pHash !== found.passHash){ alert('Credenciales inválidas'); return; }
  STATE.authUser = {id: found.id, name: found.name, role: found.role};
  localStorage.setItem('cw:authUser', JSON.stringify(STATE.authUser));
  if(els.loginModal) hideLoginModal();
  // reveal application UI for authenticated users
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main');
  if(sidebar) sidebar.classList.remove('hidden');
  if(main) main.classList.remove('hidden');
  // show dashboard welcome screen by default after login
  openPanel('dashboard');
  refreshAuthUI();
  pushNotification({title:'Sesión iniciada', text: `Hola ${found.name}`});
}

function logout(){
  STATE.authUser = null;
  localStorage.removeItem('cw:authUser');
  // hide application UI and show login modal again
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main');
  if(sidebar) sidebar.classList.add('hidden');
  if(main) main.classList.add('hidden');
  if(els.loginModal) showLoginModal();
  refreshAuthUI();
  pushNotification({title:'Sesión cerrada', text: 'Has cerrado sesión.'});
}

function refreshAuthUI(){
  const user = STATE.authUser;
  if(els.profileName) els.profileName.textContent = user ? `${user.name} (${user.role})` : '';
  if(els.loginBtn) els.loginBtn.classList.toggle('hidden', !!user);
  if(els.logoutBtn) els.logoutBtn.classList.toggle('hidden', !user);
  // show/hide admin-only UI
  document.querySelectorAll('[data-admin]').forEach(el=>{
    if(user && user.role === 'admin') el.classList.remove('hidden'); else el.classList.add('hidden');
  });
}

// Admin: open manual editor modal and populate fields
function openManualEditor(){
  if(!STATE.current) { alert('Abre un manual antes de editar.'); return; }
  // only admin allowed
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Solo administradores pueden editar manuales.'); return; }
  if(!els.manualEditorModal) return;
  const m = STATE.current;
  els.editTitle.value = m.title || '';
  els.editSummary.value = m.summary || '';
  // populate step editor UI
  renderEditorSteps(m.steps || []);
  renderEditorVersions(m.id);
  els.manualEditorModal.classList.remove('hidden');
}

// Save manual edits (store in STATE.manualOverrides and persist)
function saveManualEdits(){
  if(!STATE.current) return; if(!els.editTitle) return;
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Solo administradores pueden guardar cambios.'); return; }
  const id = STATE.current.id;
  const title = els.editTitle.value.trim();
  const summary = els.editSummary.value.trim();
  // collect steps from structured editor
  let steps;
  try{ steps = collectStepsFromEditor(); }catch(e){ alert('Error: pasos inválidos. Revisa cada paso.'); return; }
  // push previous snapshot to versions
  try{ pushManualVersion(id, {title: STATE.current.title, summary: STATE.current.summary, steps: STATE.current.steps || []}); }catch(e){}
  const override = { title, summary, steps };
  STATE.manualOverrides = STATE.manualOverrides || {};
  STATE.manualOverrides[id] = override;
  localStorage.setItem('cw:manualOverrides', JSON.stringify(STATE.manualOverrides));
  // also update in-memory manuals list so UI reflects changes immediately
  const idx = STATE.manuals.findIndex(x=>x.id === id);
  if(idx !== -1){
    STATE.manuals[idx] = Object.assign({}, STATE.manuals[idx], override);
  }
  // refresh current view
  STATE.current = Object.assign({}, STATE.current, override);
  els.manualEditorModal.classList.add('hidden');
  els.manualTitle.textContent = STATE.current.title;
  renderSteps(STATE.current);
  renderVersions(STATE.current);
  pushNotification({title:'Manual actualizado', text: `${title}`});
}

function deleteManual(id){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Solo administradores pueden eliminar manuales.'); return; }
  // mark manual as deleted in overrides
  STATE.manualOverrides = STATE.manualOverrides || {};
  STATE.manualOverrides[id] = Object.assign({}, STATE.manualOverrides[id]||{}, {deleted: true});
  localStorage.setItem('cw:manualOverrides', JSON.stringify(STATE.manualOverrides));
  // remove from custom store if present
  let customs = JSON.parse(localStorage.getItem('cw:manualsCustom')||'[]');
  customs = customs.filter(m=>m.id !== id);
  localStorage.setItem('cw:manualsCustom', JSON.stringify(customs));
  // update state and UI
  STATE.manuals = STATE.manuals.filter(m=>m.id !== id);
  renderManualsList(STATE.manuals);
  pushNotification({title: 'Manual eliminado', text: id});
}

// Editor helpers
function renderEditorSteps(steps){
  if(!els.editStepsList) return;
  els.editStepsList.innerHTML = '';
  (steps||[]).forEach((s, idx)=>{
    const row = document.createElement('div'); row.style.display='flex'; row.style.gap='8px'; row.style.alignItems='flex-start';
    const title = document.createElement('input'); title.className='input-field'; title.placeholder = 'Título del paso'; title.value = s.title || '';
    title.style.flex = '0 0 220px';
    const content = document.createElement('textarea'); content.className='input-field'; content.style.flex = '1'; content.style.minHeight='150px'; content.style.padding='12px'; content.style.fontSize='14px'; content.style.lineHeight='1.5'; content.value = s.content || '';
    const del = document.createElement('button'); del.className='secondary'; del.textContent='Eliminar'; del.style.flex='0 0 auto';
    del.addEventListener('click', ()=>{ row.remove(); });
    row.appendChild(title); row.appendChild(content); row.appendChild(del);
    // attach dataset index for ordering if needed
    els.editStepsList.appendChild(row);
  });
}

function addEditorStep(){
  const s = {title:'Paso nuevo', content:''};
  const prev = Array.from(els.editStepsList.children).length;
  renderEditorSteps([...(getEditorStepsArray()), s]);
}

function getEditorStepsArray(){
  if(!els.editStepsList) return [];
  return Array.from(els.editStepsList.children).map(row=>{
    const inputs = row.querySelectorAll('input, textarea');
    return { title: (inputs[0] && inputs[0].value) || '', content: (inputs[1] && inputs[1].value) || '' };
  });
}

function collectStepsFromEditor(){
  return getEditorStepsArray();
}

// Versioning helpers
function pushManualVersion(manualId, snapshot){
  try{
    const versions = JSON.parse(localStorage.getItem('cw:manualVersions')||'{}');
    versions[manualId] = versions[manualId] || [];
    versions[manualId].unshift({at: Date.now(), snapshot});
    // keep max 20
    versions[manualId] = versions[manualId].slice(0,20);
    localStorage.setItem('cw:manualVersions', JSON.stringify(versions));
    renderEditorVersions(manualId);
  }catch(e){ console.error('pushManualVersion err', e); }
}

function renderEditorVersions(manualId){
  if(!els.editVersionsList) return;
  const versions = JSON.parse(localStorage.getItem('cw:manualVersions')||'{}')[manualId] || [];
  els.editVersionsList.innerHTML = '';
  if(!versions.length){ els.editVersionsList.textContent = 'Sin versiones anteriores.'; return; }
  versions.forEach((v, idx)=>{
    const div = document.createElement('div'); div.className='panel'; div.style.display='flex'; div.style.justifyContent='space-between'; div.style.alignItems='center';
    const meta = document.createElement('div'); meta.innerHTML = `<strong>${new Date(v.at).toLocaleString()}</strong><div class="small muted">${(v.snapshot.title||'')}</div>`;
    const controls = document.createElement('div'); controls.style.display='flex'; controls.style.gap='6px';
    const revert = document.createElement('button'); revert.className='small-btn'; revert.textContent='Revertir';
    revert.addEventListener('click', ()=>{ if(confirm('Revertir a esta versión?')) revertToVersion(manualId, idx); });
    const exp = document.createElement('button'); exp.className='secondary'; exp.textContent='Exportar';
    exp.addEventListener('click', ()=>{ const blob = new Blob([JSON.stringify(v.snapshot,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${manualId}-version-${v.at}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); });
    controls.appendChild(revert); controls.appendChild(exp);
    div.appendChild(meta); div.appendChild(controls);
    els.editVersionsList.appendChild(div);
  });
}

function revertToVersion(manualId, index){
  const versions = JSON.parse(localStorage.getItem('cw:manualVersions')||'{}')[manualId] || [];
  const v = versions[index]; if(!v) return alert('Versión no encontrada');
  // apply snapshot to overrides and to STATE.manuals
  STATE.manualOverrides = STATE.manualOverrides || {};
  STATE.manualOverrides[manualId] = { title: v.snapshot.title, summary: v.snapshot.summary, steps: v.snapshot.steps };
  localStorage.setItem('cw:manualOverrides', JSON.stringify(STATE.manualOverrides));
  // update manuals array
  const idx = STATE.manuals.findIndex(m=>m.id === manualId);
  if(idx !== -1){ STATE.manuals[idx] = Object.assign({}, STATE.manuals[idx], STATE.manualOverrides[manualId]); }
  STATE.current = Object.assign({}, STATE.current, STATE.manualOverrides[manualId]);
  renderManualsList(STATE.manuals);
  renderSteps(STATE.current);
  renderEditorSteps(STATE.current.steps || []);
  renderEditorVersions(manualId);
  pushNotification({title:'Manual revertido', text:`Revertido a versión guardada ${new Date(v.at).toLocaleString()}`});
}

function exportCurrentManual(){
  if(!STATE.current) return;
  const data = JSON.stringify(STATE.current, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${STATE.current.id}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Admin: create new manual (clean, consolidated implementation)
function openNewManualModal(){
  console.debug('[openNewManualModal] Iniciando...', STATE.authUser);
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
    console.warn('[openNewManualModal] Acceso denegado: no es admin', STATE.authUser);
    alert('Solo administradores pueden crear manuales.'); 
    return; 
  }
  console.debug('[openNewManualModal] Permisos OK, buscando modal...');
  const modal = document.getElementById('newManualModal'); 
  if(!modal) { 
    console.error('[openNewManualModal] Modal NO ENCONTRADO: #newManualModal');
    return; 
  }
  console.debug('[openNewManualModal] Modal encontrado, reseteando campos...');
  // reset basic fields
  const title = document.getElementById('newTitle'); 
  const catSelect = document.getElementById('newCategorySelect'); 
  const catName = document.getElementById('newCategoryName');
  const ver = document.getElementById('newVersion'); 
  const summ = document.getElementById('newSummary');
  console.debug('[openNewManualModal] Elementos encontrados:', { title: !!title, catSelect: !!catSelect, catName: !!catName, ver: !!ver, summ: !!summ });
  if(title) title.value = '';
  if(catName) catName.value = '';
  if(ver) ver.value = '1.0.0';
  if(summ) summ.value = '';
  // populate categories
  if(catSelect){ 
    catSelect.innerHTML = '<option value="">-- Selecciona --</option>'; 
    const cats = Array.from(new Set((STATE.manuals||[]).map(m=>m.category).filter(Boolean))); 
    console.debug('[openNewManualModal] Categorías encontradas:', cats);
    cats.forEach(c=>{ 
      const o = document.createElement('option'); 
      o.value = c; 
      o.textContent = c; 
      catSelect.appendChild(o); 
    }); 
  }
  // prepare steps editor
  const editor = document.getElementById('newStepsEditor'); 
  if(!editor) console.error('[openNewManualModal] Editor NO ENCONTRADO: #newStepsEditor');
  if(editor){ 
    editor.innerHTML = ''; 
    editor.style.display = 'flex'; 
    editor.style.flexDirection = 'column'; 
    console.debug('[openNewManualModal] Editor limpiado y preparado');
  }
  // add a starter empty step
  console.debug('[openNewManualModal] Añadiendo primer paso vacío...');
  createStepEditorRow();
  console.debug('[openNewManualModal] Mostrando modal...');
  modal.classList.remove('hidden');
  console.debug('[openNewManualModal] ✓ Modal abierto correctamente');
}

function createStepEditorRow(step){
  const editor = document.getElementById('newStepsEditor'); if(!editor) return;
  const row = document.createElement('div'); row.className = 'step-editor-row panel'; row.style.display = 'flex'; row.style.flexDirection = 'column'; row.style.gap = '12px'; row.style.padding = '16px'; row.style.borderLeft = '4px solid var(--cw-primary)';
  
  // Title row
  const titleRow = document.createElement('div'); titleRow.style.display = 'flex'; titleRow.style.gap = '8px';
  const tInput = document.createElement('input'); tInput.className = 'input-field'; tInput.placeholder = 'Título del paso'; tInput.dataset.stepTitle = 'true'; tInput.style.flex = '1'; tInput.value = step && step.title || '';
  const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'secondary'; removeBtn.textContent = 'Eliminar paso'; removeBtn.style.whiteSpace = 'nowrap'; removeBtn.addEventListener('click', ()=> row.remove());
  titleRow.appendChild(tInput); titleRow.appendChild(removeBtn);
  
  // Content
  const content = document.createElement('textarea'); content.className = 'input-field'; content.dataset.stepContent = 'true'; content.style.minHeight = '90px'; content.value = step && step.content || '';
  
  // Image upload with better design
  const imageContainer = document.createElement('div'); imageContainer.style.display = 'flex'; imageContainer.style.gap = '12px'; imageContainer.style.alignItems = 'flex-start';
  
  const uploadSection = document.createElement('div'); uploadSection.style.flex = '1'; uploadSection.style.display = 'flex'; uploadSection.style.flexDirection = 'column'; uploadSection.style.gap = '8px';
  const imageLabel = document.createElement('label'); imageLabel.style.fontSize = '12px'; imageLabel.style.fontWeight = '600'; imageLabel.style.color = 'var(--cw-text-muted)'; imageLabel.textContent = 'Imagen (opcional)';
  
  const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.dataset.stepImage = 'true'; fileInput.style.padding = '8px 12px'; fileInput.style.border = '2px dashed var(--cw-border)'; fileInput.style.borderRadius = '8px'; fileInput.style.cursor = 'pointer'; fileInput.style.transition = 'all 0.2s';
  fileInput.addEventListener('focus', ()=>{ fileInput.style.borderColor = 'var(--cw-primary)'; fileInput.style.backgroundColor = 'rgba(255,128,51,0.04)'; });
  fileInput.addEventListener('blur', ()=>{ fileInput.style.borderColor = 'var(--cw-border)'; fileInput.style.backgroundColor = 'transparent'; });
  uploadSection.appendChild(imageLabel);
  uploadSection.appendChild(fileInput);
  
  const preview = document.createElement('div'); preview.style.display = 'flex'; preview.style.flexDirection = 'column'; preview.style.alignItems = 'center'; preview.style.gap = '8px'; preview.style.minWidth = '120px';
  const img = document.createElement('img'); img.style.maxWidth = '140px'; img.style.maxHeight = '120px'; img.style.borderRadius = '10px'; img.style.border = '2px solid var(--cw-border)'; img.style.display = step && step.image ? 'block' : 'none'; img.style.objectFit = 'cover'; if(step && step.image) img.src = step.image;
  const clearBtn = document.createElement('button'); clearBtn.type = 'button'; clearBtn.className = 'secondary'; clearBtn.style.fontSize = '11px'; clearBtn.style.padding = '6px 10px'; clearBtn.textContent = 'Quitar'; clearBtn.style.display = step && step.image ? 'block' : 'none'; clearBtn.addEventListener('click', ()=>{ img.style.display = 'none'; clearBtn.style.display = 'none'; fileInput.value = ''; fileInput.dataset.dataurl = ''; });
  preview.appendChild(img); preview.appendChild(clearBtn);
  
  fileInput.addEventListener('change', (e)=>{ const f = e.target.files && e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = ()=>{ img.src = r.result; img.style.display = 'block'; clearBtn.style.display = 'block'; fileInput.dataset.dataurl = r.result; }; r.readAsDataURL(f); });
  if(step && step.image) fileInput.dataset.dataurl = step.image;
  
  imageContainer.appendChild(uploadSection); imageContainer.appendChild(preview);
  
  row.appendChild(titleRow); row.appendChild(content); row.appendChild(imageContainer);
  editor.appendChild(row);
}

function collectStepsFromNewEditor(){
  const editor = document.getElementById('newStepsEditor'); if(!editor) return [];
  const out = [];
  Array.from(editor.querySelectorAll('.step-editor-row')).forEach(row=>{
    const title = (row.querySelector('[data-step-title]')||{}).value || '';
    const content = (row.querySelector('[data-step-content]')||{}).value || '';
    const fileIn = row.querySelector('[data-step-image]');
    const image = fileIn && fileIn.dataset && fileIn.dataset.dataurl ? fileIn.dataset.dataurl : null;
    out.push({ title, content, image });
  });
  return out;
}

function saveNewManual(){
  console.debug('[saveNewManual] Iniciando guardado...');
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
    console.debug('[saveNewManual] Acceso denegado: no es admin');
    alert('Solo administradores pueden crear manuales.'); 
    return; 
  }
  const titleEl = document.getElementById('newTitle'); 
  const catSel = document.getElementById('newCategorySelect'); 
  const catName = document.getElementById('newCategoryName');
  const ver = document.getElementById('newVersion'); 
  const summ = document.getElementById('newSummary');
  const title = titleEl ? titleEl.value.trim() : '';
  const category = (catName && catName.value.trim()) || (catSel && catSel.value) || 'General';
  const version = ver ? ver.value.trim() || '1.0.0' : '1.0.0';
  const summary = summ ? summ.value.trim() : '';
  console.debug('[saveNewManual] Campos:', { title, category, version, summary });
  if(!title) { 
    console.debug('[saveNewManual] Título vacío');
    alert('El título es obligatorio'); 
    return; 
  }
  const steps = collectStepsFromNewEditor();
  console.debug('[saveNewManual] Pasos recolectados:', steps.length);
  const id = 'custom-' + Date.now();
  const manual = { id, title, category, version, summary, steps, versions: [{version, note:'Creado', date: new Date().toISOString()}] };
  console.debug('[saveNewManual] Manual creado:', manual);
  const customs = JSON.parse(localStorage.getItem('cw:manualsCustom')||'[]'); 
  customs.push(manual); 
  localStorage.setItem('cw:manualsCustom', JSON.stringify(customs));
  STATE.manuals.push(manual);
  const modal = document.getElementById('newManualModal'); 
  if(modal) { 
    modal.classList.add('hidden');
    console.debug('[saveNewManual] Modal cerrado');
  }
  renderManualsList(STATE.manuals);
  console.debug('[saveNewManual] ✓ Manual guardado correctamente');
  pushNotification({title:'Manual creado', text: title});
}

// Get all categories from manuals
function getAllCategories(){
  const categories = [...new Set(STATE.manuals.map(m => m.category))];
  return categories.sort();
}

// Open category management modal
function openCategoryManager(){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){
    showToast('Solo administradores pueden gestionar categorías', 'warning');
    return;
  }
  
  const modal = els.editCategoryModal;
  if(!modal) return;
  
  // Populate categories list
  renderCategoriesList();
  
  // Populate select for changing manual category
  const select = els.changeManualCategorySelect;
  if(select && STATE.current){
    select.innerHTML = '<option value="">-- Seleccionar categoría --</option>';
    getAllCategories().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      opt.selected = (cat === STATE.current.category);
      select.appendChild(opt);
    });
  }
  
  modal.classList.remove('hidden');
}

// Render categories list for management
function renderCategoriesList(){
  const list = els.categoriesList;
  if(!list) return;
  
  list.innerHTML = '';
  const categories = getAllCategories();
  
  categories.forEach(cat => {
    const count = STATE.manuals.filter(m => m.category === cat).length;
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;gap:8px;align-items:center;padding:12px;background:var(--cw-surface);border-radius:8px;border:1px solid var(--cw-border)';
    
    const info = document.createElement('div');
    info.style.cssText = 'flex:1';
    info.innerHTML = `<strong>${escapeHtml(cat)}</strong><br><small style="color:var(--cw-text-muted)">${count} manual(es)</small>`;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'secondary small-btn';
    deleteBtn.textContent = '🗑';
    deleteBtn.style.padding = '6px 10px';
    deleteBtn.onclick = () => {
      if(confirm(`¿Eliminar categoría "${cat}" y mover sus manuales a "General"?`)){
        deleteCategory(cat);
      }
    };
    
    item.appendChild(info);
    item.appendChild(deleteBtn);
    list.appendChild(item);
  });
}

// Add new category
function addCategory(categoryName){
  if(!categoryName || !categoryName.trim()){
    showToast('Nombre de categoría vacío', 'warning');
    return;
  }
  
  if(getAllCategories().includes(categoryName.trim())){
    showToast('La categoría ya existe', 'warning');
    return;
  }
  
  // Category will be created when first manual is saved to it
  showToast(`Categoría "${categoryName}" lista para usar`, 'success');
  if(els.newCategoryInput) els.newCategoryInput.value = '';
  renderCategoriesList();
}

// Delete category (move manuals to General)
function deleteCategory(categoryName){
  STATE.manuals.forEach(m => {
    if(m.category === categoryName){
      m.category = 'General';
    }
  });
  
  // Update localStorage
  const customs = JSON.parse(localStorage.getItem('cw:manualsCustom')||'[]');
  customs.forEach(m => {
    if(m.category === categoryName){
      m.category = 'General';
    }
  });
  localStorage.setItem('cw:manualsCustom', JSON.stringify(customs));
  
  renderCategoriesList();
  renderManualsList(STATE.manuals);
  showToast(`Categoría eliminada. Manuales movidos a "General"`, 'info');
}

// Change current manual's category
function changeManualCategory(newCategory){
  if(!STATE.current){
    showToast('No hay manual seleccionado', 'warning');
    return;
  }
  
  if(!newCategory || newCategory.trim() === ''){
    showToast('Selecciona una categoría', 'warning');
    return;
  }
  
  STATE.current.category = newCategory;
  
  // Update in STATE.manuals
  const manual = STATE.manuals.find(m => m.id === STATE.current.id);
  if(manual) manual.category = newCategory;
  
  // Update in localStorage
  const customs = JSON.parse(localStorage.getItem('cw:manualsCustom')||'[]');
  const customManual = customs.find(m => m.id === STATE.current.id);
  if(customManual) customManual.category = newCategory;
  localStorage.setItem('cw:manualsCustom', JSON.stringify(customs));
  
  renderManualsList(STATE.manuals);
  showToast(`Manual movido a "${newCategory}"`, 'success');
}

// Parse PDF text into manual structure
function parsePdfToManual(text, filename, images = []){
  // Extract title from filename - generate "Importado N" format
  const importedCount = STATE.manuals.filter(m => m.category === 'Importados').length;
  const title = `Importado ${importedCount + 1}`;
  
  // Parse the text content
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Create steps from content
  const steps = [];
  let currentStep = {text: '', image: null};
  
  for(let i = 0; i < lines.length; i++){
    const line = lines[i];
    
    // Check if this line is a step header
    const isStepHeader = /^(\d+[\.\)\s:-]|[-•*]\s|(?:PASO|STEP|ETAPA|PROCEDIMIENTO|INSTRUCCIÓN)[:\s])/i.test(line);
    
    if(isStepHeader && currentStep.text.trim()){
      // Save previous step and start new one
      steps.push(currentStep);
      currentStep = {text: line, image: null};
    } else {
      // Add line to current step
      if(currentStep.text) currentStep.text += '\n';
      currentStep.text += line;
    }
  }
  
  // Add last step
  if(currentStep.text.trim()){
    steps.push(currentStep);
  }
  
  // If no steps were parsed, treat entire content as one step
  if(steps.length === 0){
    steps.push({text: text, image: null});
  }
  
  // Assign images to steps
  steps.forEach((step, idx) => {
    if(images && images[idx]){
      step.image = images[idx];
    }
  });
  
  return {
    id: 'manual-' + Date.now(),
    title: title,
    category: 'Importados',
    type: 'procedimiento',
    version: '1.0',
    createdAt: new Date().toISOString(),
    body: steps,
    tags: ['importado', 'pdf'],
    originalFilename: filename
  };
}

// Pre-fill the new manual modal with parsed data
function prefillNewManualModal(parsedManual){
  if(els.newManualTitle) els.newManualTitle.value = parsedManual.title;
  if(els.newManualCategory) els.newManualCategory.value = parsedManual.category;
  if(els.newManualType) els.newManualType.value = parsedManual.type;
  if(els.newManualSteps){
    els.newManualSteps.value = parsedManual.body.map(s => s.text).join('\n\n---\n\n');
  }
  
  // Store parsed manual data for reference
  els.newManualModal._parsedManual = parsedManual;
  
  // Show the modal
  if(els.newManualModal) els.newManualModal.classList.remove('hidden');
}

async function importPdfManual(file){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Solo administradores pueden importar manuales.'); return; }
  if(!file || !file.type.includes('pdf')) { alert('Por favor selecciona un archivo PDF válido'); return; }
  
  const statusEl = document.getElementById('pdfStatus');
  const showStatus = (msg, isError = false) => {
    if(statusEl) {
      statusEl.textContent = msg;
      statusEl.style.color = isError ? 'var(--cw-error, #ff4444)' : 'var(--cw-text-muted)';
      statusEl.style.display = 'block';
    }
  };
  
  try {
    showStatus('Procesando PDF...');
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse PDF using pdf.js
    if(typeof pdfjsLib === 'undefined') {
      showStatus('Error: PDF.js no está disponible', true);
      return;
    }
    
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    let fullText = '';
    
    // Extract text from all pages
    for(let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ') + '\n';
    }
    
    if(!fullText.trim()) {
      showStatus('Error: No se pudo extraer texto del PDF', true);
      return;
    }
    
    // Split text into steps by paragraphs or page breaks
    const paragraphs = fullText.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    if(paragraphs.length === 0) {
      showStatus('Error: PDF no contiene texto válido', true);
      return;
    }
    
    // Create steps from paragraphs
    const steps = paragraphs.map((text, idx) => {
      const cleanText = text.trim();
      // Try to extract title from first line or create one
      const lines = cleanText.split('\n');
      const firstLine = lines[0].trim();
      const title = firstLine.length < 80 ? firstLine : `Paso ${idx + 1}`;
      const content = lines.length > 1 ? `<p>${lines.slice(1).join('</p><p>')}</p>` : `<p>${cleanText}</p>`;
      return { title, content, image: null };
    });
    
    showStatus(`${steps.length} pasos extraídos. Configura los detalles y guarda.`);
    
    // Auto-populate form with PDF name and steps
    const titleEl = document.getElementById('newTitle');
    const catName = document.getElementById('newCategoryName');
    const ver = document.getElementById('newVersion');
    const summ = document.getElementById('newSummary');
    
    if(titleEl) titleEl.value = file.name.replace('.pdf', '').replace(/[-_]/g, ' ');
    if(catName) catName.value = 'Importado de PDF';
    if(ver) ver.value = '1.0.0';
    if(summ) summ.value = `Manual importado el ${new Date().toLocaleDateString()}`;
    
    // Clear existing steps and add extracted ones
    const stepsEditor = document.getElementById('newStepsEditor');
    if(stepsEditor) {
      stepsEditor.innerHTML = '';
      steps.forEach((step, idx) => {
        const row = document.createElement('div');
        row.className = 'step-editor-row';
        row.style.cssText = 'padding:8px;border:1px solid var(--cw-border);border-radius:6px;background:var(--cw-surface-alt);display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start';
        row.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:4px">
            <input type="text" class="step-title" placeholder="Título del paso" value="${escapeHtml(step.title)}" style="padding:4px;border:1px solid var(--cw-border);border-radius:4px;font-size:12px">
            <textarea class="step-content" placeholder="Contenido del paso" style="padding:4px;border:1px solid var(--cw-border);border-radius:4px;font-size:12px;min-height:60px;resize:vertical">${step.content}</textarea>
          </div>
          <button type="button" class="remove-step" data-idx="${idx}" style="padding:4px 8px;background:var(--cw-error, #ff4444);color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;white-space:nowrap">Remover</button>
        `;
        stepsEditor.appendChild(row);
      });
      
      // Wire remove buttons
      stepsEditor.querySelectorAll('.remove-step').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.target.closest('.step-editor-row').remove();
        });
      });
    }
    
  } catch(err) {
    console.error('[importPdfManual] Error:', err);
    showStatus(`Error: ${err.message}`, true);
  }
}

function exportManuals(){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Solo administradores pueden exportar manuales.'); return; }
  
  if(STATE.manuals.length === 0) {
    alert('No hay manuales para exportar');
    return;
  }
  
  if(STATE.manuals.length === 1) {
    // Auto-export if only one manual
    const manual = STATE.manuals[0];
    const data = JSON.stringify(manual, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${manual.id}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    pushNotification({title: 'Manual exportado', text: manual.title});
    return;
  }
  
  // Multiple manuals: show selection modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.zIndex = '1000';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px">
      <button class="close" aria-label="Cerrar" style="position:absolute;top:12px;right:12px">✕</button>
      <h4 style="margin:0 0 16px">Selecciona un manual para exportar</h4>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto">
        ${STATE.manuals.map((m, idx) => `
          <button type="button" data-idx="${idx}" style="text-align:left;padding:12px;border:1px solid var(--cw-border);border-radius:8px;background:transparent;cursor:pointer;transition:all 0.2s;font-size:14px">
            <strong>${escapeHtml(m.title)}</strong>
            <div style="font-size:12px;color:var(--cw-text-muted);margin-top:4px">${escapeHtml(m.category)} • v${m.version}</div>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  
  // Add hover effects
  const buttons = modal.querySelectorAll('button[data-idx]');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', ()=>{ btn.style.background = 'var(--cw-surface-alt)'; btn.style.borderColor = 'var(--cw-primary)'; });
    btn.addEventListener('mouseleave', ()=>{ btn.style.background = 'transparent'; btn.style.borderColor = 'var(--cw-border)'; });
    btn.addEventListener('click', (e)=>{
      const idx = parseInt(btn.dataset.idx);
      const manual = STATE.manuals[idx];
      const data = JSON.stringify(manual, null, 2);
      const blob = new Blob([data], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${manual.id}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      modal.remove();
      pushNotification({title: 'Manual exportado', text: manual.title});
    });
  });
  
  // Close button
  const closeBtn = modal.querySelector('.close');
  closeBtn.addEventListener('click', ()=>{ modal.remove(); });
  modal.addEventListener('click', (e)=>{ if(e.target === modal) modal.remove(); });
  
  document.body.appendChild(modal);
}

async function importManuals(){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Solo administradores pueden importar manuales.'); return; }
  // Use file picker to import PDFs or JSONs
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.pdf,application/pdf,.json,application/json';
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    if(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')){
      // Handle PDF
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        let fullText = '';
        const images = [];

        // Extract text from all pages
        for(let i = 1; i <= pdf.numPages; i++){
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n';

          // Extract images from page
          try {
            const ops = await page.getOperatorList();
            for(let j = 0; j < ops.fnArray.length; j++){
              if(ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject || ops.fnArray[j] === pdfjsLib.OPS.paintInlineImageXObject){
                const imgKey = ops.argsArray[j][0];
                if(page.objs.has(imgKey)){
                  const imgData = page.objs.get(imgKey);
                  if(imgData && imgData.data){
                    // Convert image data to data URL
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = imgData.width;
                    canvas.height = imgData.height;
                    const imgDataArray = new Uint8ClampedArray(imgData.data);
                    const imageData = new ImageData(imgDataArray, imgData.width, imgData.height);
                    ctx.putImageData(imageData, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    images.push(dataUrl);
                  }
                }
              }
            }
          } catch(imgErr) {
            console.warn('Error extracting images from page', i, imgErr);
          }
        }

        // Parse the text into manual structure
        const parsedManual = parsePdfToManual(fullText, file.name, images);
        // Pre-fill the new manual modal
        prefillNewManualModal(parsedManual);
        pushNotification({title:'PDF importado', text: 'Contenido extraído y modal abierto para edición.'});
      } catch(err) {
        console.error('PDF processing error:', err);
        alert('Error al procesar PDF: ' + err.message);
      }
    } else {
      // Handle JSON as before
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const arr = Array.isArray(data) ? data : (data.manuals ? data.manuals : [data]);
          if(!Array.isArray(arr) || arr.length === 0) {
            alert('Archivo JSON inválido o vacío');
            return;
          }
          const customs = JSON.parse(localStorage.getItem('cw:manualsCustom')||'[]');
          arr.forEach(m => {
            if(!m.id) m.id = 'import-'+Date.now()+'-'+Math.floor(Math.random()*1000);
            if(!STATE.manuals.find(x => x.id === m.id)) {
              customs.push(m);
              STATE.manuals.push(m);
            }
          });
          localStorage.setItem('cw:manualsCustom', JSON.stringify(customs));
          renderManualsList(STATE.manuals);
          pushNotification({title:'Importación completada', text: `${arr.length} manual(es) importado(s)`});
        } catch(err) {
          alert('Error al importar: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  });
  fileInput.click();
}

// ============= FIBRA DIAGRAMS - PROFESSIONAL TREE SYSTEM =============

function renderDiagrams(){
  if(!els.diagramsList) return;
  els.diagramsList.innerHTML = '';
  if(!STATE.diagrams || STATE.diagrams.length === 0){
    els.diagramsList.innerHTML = '<div class="empty-state" style="padding:40px;text-align:center;color:var(--cw-text-muted)"><div style="font-size:48px;margin-bottom:16px">🌳</div><p>No hay diagramas aún. Crea uno para empezar.</p></div>';
    return;
  }
  STATE.diagrams.forEach((tree, idx)=>{
    const nodeCount = Object.keys(tree.nodes || {}).length;
    const solutionCount = Object.values(tree.nodes || {}).filter(n => n.type === 'solution').length;
    const questionCount = Object.values(tree.nodes || {}).filter(n => n.type === 'question').length;
    
    const card = document.createElement('div');
    card.className = 'diagram-card panel';
    card.style.cssText = `
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid transparent;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fc 100%);
    `;
    
    card.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr auto;gap:20px;align-items:start">
        <div>
          <h5 style="margin:0 0 12px;color:var(--cw-text);font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">🌳</span>
            ${escapeHtml(tree.title)}
          </h5>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;margin-bottom:12px">
            <div style="padding:8px 12px;background:var(--cw-primary);color:white;border-radius:6px;text-align:center;font-size:13px;font-weight:600">
              <div style="font-size:20px">${nodeCount}</div>
              <div style="font-size:11px;opacity:0.9">NODOS</div>
            </div>
            <div style="padding:8px 12px;background:#f59e0b;color:white;border-radius:6px;text-align:center;font-size:13px;font-weight:600">
              <div style="font-size:20px">${questionCount}</div>
              <div style="font-size:11px;opacity:0.9">PREGUNTAS</div>
            </div>
            <div style="padding:8px 12px;background:var(--cw-success);color:white;border-radius:6px;text-align:center;font-size:13px;font-weight:600">
              <div style="font-size:20px">${solutionCount}</div>
              <div style="font-size:11px;opacity:0.9">SOLUCIONES</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--cw-text-muted);line-height:1.6">
            <div>📅 ${tree.createdAt ? new Date(tree.createdAt).toLocaleDateString('es-ES') : 'Sin fecha'}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="view-diagram" data-idx="${idx}" style="padding:10px 16px;border:none;background:linear-gradient(135deg, var(--cw-primary), var(--cw-secondary));color:white;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;transition:all 0.2s">▶ Ver árbol</button>
          <button class="edit-diagram" data-idx="${idx}" style="padding:10px 16px;border:1px solid var(--cw-border);background:var(--cw-surface);color:var(--cw-text);border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;transition:all 0.2s">✎ Editar</button>
        </div>
      </div>
    `;
    
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = 'var(--cw-primary)';
      card.style.boxShadow = '0 8px 24px rgba(255, 128, 51, 0.15)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = 'transparent';
      card.style.boxShadow = 'var(--shadow-md)';
    });
    
    card.addEventListener('click', (e)=>{
      if(e.target.closest('.view-diagram')) viewDiagram(idx);
      if(e.target.closest('.edit-diagram')) openDiagramEditor(idx);
    });
    els.diagramsList.appendChild(card);
  });
}

function viewDiagram(idx){
  const tree = STATE.diagrams[idx];
  if(!tree) return;
  
  if(!els.diagramViewerModal) return;
  
  // Initialize viewer state for the tree
  els.diagramViewerModal._treeId = tree.id;
  els.diagramViewerModal._currentNodeId = tree.rootNodeId;
  els.diagramViewerModal._visitedPath = [];
  els.diagramViewerModal._navigation = [];
  
  // Update title
  const titleEl = document.getElementById('viewerDiagramTitle');
  if(titleEl) titleEl.textContent = tree.title;
  
  // Clear previous options
  const optionsContainer = document.getElementById('diagramViewerOptions');
  if(optionsContainer) optionsContainer.innerHTML = '';
  
  // Show the viewer
  els.diagramViewerModal.classList.remove('hidden');
  
  // Render first node
  renderDiagramNode();
}

function renderDiagramNode(){
  if(!els.diagramViewerModal._treeId || !els.diagramViewerModal._currentNodeId) return;
  
  const tree = STATE.diagrams.find(t => t.id === els.diagramViewerModal._treeId);
  const currentNodeId = els.diagramViewerModal._currentNodeId;
  const node = tree?.nodes[currentNodeId];
  
  if(!node) return;
  
  const questionBox = document.getElementById('diagramViewerQuestion');
  const optionsContainer = document.getElementById('diagramViewerOptions');
  const solutionBox = document.getElementById('diagramViewerSolution');
  const restartBtn = document.getElementById('diagramViewerRestartBtn');
  const backBtn = document.getElementById('diagramViewerBackBtn');
  const pathDisplay = document.getElementById('diagramViewerPath');
  const depthIndicator = document.getElementById('depthIndicator');
  const currentDepthDisplay = document.getElementById('currentDepthDisplay');
  
  // Handle solution nodes
  if(node.type === 'solution'){
    if(questionBox) questionBox.style.display = 'none';
    if(optionsContainer) optionsContainer.innerHTML = '';
    
    if(solutionBox){
      let html = '';
      
      // Add image if exists
      if(node.image){
        html += `<div style="margin-bottom:16px;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)"><img src="${node.image}" style="width:100%;max-height:300px;object-fit:cover" alt="Solución"></div>`;
      }
      
      // Parse solution text with special formatting
      const lines = node.text.split('\n').filter(l => l.trim());
      let title = lines[0] || 'Solución';
      let content = lines.slice(1).join('\n') || '';
      
      html += `<h3 style="margin-top:0;margin-bottom:8px;color:var(--cw-text)">${escapeHtml(title)}</h3>`;
      if(content){
        html += `<p style="color:var(--cw-text);line-height:1.6;white-space:pre-wrap">${escapeHtml(content)}</p>`;
      }
      
      solutionBox.innerHTML = html;
      solutionBox.style.display = 'block';
    }
    
    if(restartBtn) {
      restartBtn.style.display = 'inline-block';
      restartBtn.onclick = () => {
        els.diagramViewerModal._currentNodeId = tree.rootNodeId;
        els.diagramViewerModal._visitedPath = [];
        els.diagramViewerModal._navigation = [];
        renderDiagramNode();
      };
    }
    
    if(backBtn && els.diagramViewerModal._navigation.length > 0){
      backBtn.style.display = 'inline-block';
      backBtn.onclick = () => {
        if(els.diagramViewerModal._navigation.length > 0){
          const prev = els.diagramViewerModal._navigation.pop();
          els.diagramViewerModal._currentNodeId = prev.nodeId;
          els.diagramViewerModal._visitedPath.pop();
          renderDiagramNode();
        }
      };
    }
  } 
  // Handle question nodes
  else if(node.type === 'question'){
    if(questionBox){
      questionBox.style.display = 'block';
      let html = '';
      
      // Add image if exists
      if(node.image){
        html += `<div style="margin-bottom:16px;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)"><img src="${node.image}" style="width:100%;max-height:300px;object-fit:cover" alt="Pregunta"></div>`;
      }
      
      html += `<h3 id="questionText" style="margin:0;color:var(--cw-text)">${escapeHtml(node.text)}</h3><div class="tree-depth-indicator" id="depthIndicator"></div>`;
      questionBox.innerHTML = html;
    }
    
    if(solutionBox) solutionBox.style.display = 'none';
    if(restartBtn) restartBtn.style.display = 'none';
    
    // Render options dynamically
    if(optionsContainer){
      optionsContainer.innerHTML = '';
      if(node.options && node.options.length > 0){
        node.options.forEach((option, idx) => {
          const btn = document.createElement('button');
          btn.className = 'tree-option-btn';
          btn.textContent = option.label;
          btn.onclick = () => {
            // Save navigation history for back button
            els.diagramViewerModal._navigation.push({
              nodeId: currentNodeId,
              option: option.label
            });
            els.diagramViewerModal._visitedPath.push(option.label);
            els.diagramViewerModal._currentNodeId = option.nextNodeId;
            renderDiagramNode();
          };
          optionsContainer.appendChild(btn);
        });
      }
    }
    
    // Show back button if there's history
    if(backBtn && els.diagramViewerModal._navigation.length > 0){
      backBtn.style.display = 'inline-block';
      backBtn.onclick = () => {
        if(els.diagramViewerModal._navigation.length > 0){
          const prev = els.diagramViewerModal._navigation.pop();
          els.diagramViewerModal._currentNodeId = prev.nodeId;
          els.diagramViewerModal._visitedPath.pop();
          renderDiagramNode();
        }
      };
    } else if(backBtn){
      backBtn.style.display = 'none';
    }
  }
  
  // Update breadcrumb path
  if(pathDisplay){
    if(els.diagramViewerModal._visitedPath.length > 0){
      const path = els.diagramViewerModal._visitedPath.map(p => `<span class="tree-breadcrumb-item">${escapeHtml(p)}</span>`).join('<span class="tree-breadcrumb-separator">→</span>');
      pathDisplay.innerHTML = `<span class="tree-breadcrumb-item">INICIO</span><span class="tree-breadcrumb-separator">→</span>${path}`;
    } else {
      pathDisplay.innerHTML = '<span class="tree-breadcrumb-item active">INICIO</span>';
    }
  }
  
  // Update depth indicator
  if(depthIndicator && node.depth !== undefined){
    const depth = node.depth || 0;
    depthIndicator.innerHTML = Array(depth + 1).fill().map(() => '<span class="tree-depth-dot active"></span>').join('');
  }
  
  // Update depth display
  if(currentDepthDisplay){
    const depth = node.depth || 0;
    currentDepthDisplay.textContent = `Nivel ${depth + 1}`;
  }
}

function openDiagramEditor(idx){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
    showToast('Solo administradores pueden editar diagramas', 'warning');
    return; 
  }
  
  const tree = idx !== undefined ? STATE.diagrams[idx] : null;
  
  if(tree){
    // Editing existing tree
    if(els.diagramTitle) els.diagramTitle.value = tree.title;
    const deleteBtn = document.getElementById('deleteDiagramBtn');
    if(deleteBtn) deleteBtn.style.display = 'inline-block';
    els.diagramModal._editingIdx = idx;
  } else {
    // Creating new tree
    if(els.diagramTitle) els.diagramTitle.value = '';
    const deleteBtn = document.getElementById('deleteDiagramBtn');
    if(deleteBtn) deleteBtn.style.display = 'none';
    delete els.diagramModal._editingIdx;
  }
  
  // Store tree data in modal for editing
  els.diagramModal._treeData = tree ? JSON.parse(JSON.stringify(tree)) : {
    id: 'tree-' + Date.now(),
    title: '',
    createdAt: new Date().toISOString(),
    rootNodeId: 'root-1',
    nodes: {
      'root-1': {
        id: 'root-1',
        type: 'question',
        text: '¿Tu pregunta principal?',
        depth: 0,
        options: [
          {id: 'opt-1a', label: 'Opción A', nextNodeId: 'sol-1'},
          {id: 'opt-1b', label: 'Opción B', nextNodeId: 'sol-2'}
        ]
      },
      'sol-1': {
        id: 'sol-1',
        type: 'solution',
        depth: 1,
        text: '✅ SOLUCIÓN:\nSolución para la opción A'
      },
      'sol-2': {
        id: 'sol-2',
        type: 'solution',
        depth: 1,
        text: '✅ SOLUCIÓN:\nSolución para la opción B'
      }
    }
  };
  
  updateTreeStats();
  renderDiagramEditorTree();
  
  if(els.diagramModal) els.diagramModal.classList.remove('hidden');
}

function updateTreeStats(){
  const tree = els.diagramModal._treeData;
  if(!tree) return;
  
  const nodeCount = Object.keys(tree.nodes || {}).length;
  const solutionCount = Object.values(tree.nodes || {}).filter(n => n.type === 'solution').length;
  const maxDepth = Math.max(...Object.values(tree.nodes || {}).map(n => n.depth || 0));
  
  const nodeCountEl = document.getElementById('nodeCount');
  const solutionCountEl = document.getElementById('solutionCount');
  const treeDepthEl = document.getElementById('treeDepth');
  
  if(nodeCountEl) nodeCountEl.textContent = nodeCount;
  if(solutionCountEl) solutionCountEl.textContent = solutionCount;
  if(treeDepthEl) treeDepthEl.textContent = `Profundidad máx: ${maxDepth}`;
}

function renderDiagramEditorTree(){
  const nodeEditor = document.getElementById('diagramNodeEditor');
  if(!nodeEditor || !els.diagramModal._treeData) return;
  
  nodeEditor.innerHTML = '';
  const tree = els.diagramModal._treeData;
  
  const renderNode = (nodeId, depth = 0) => {
    const node = tree.nodes[nodeId];
    if(!node) return;
    
    const container = document.createElement('div');
    container.className = 'tree-node-item';
    container.style.marginLeft = (depth * 20) + 'px';
    
    const info = document.createElement('div');
    info.className = 'tree-node-info';
    
    const badge = document.createElement('span');
    badge.className = `tree-node-type-badge ${node.type}`;
    badge.textContent = node.type === 'question' ? 'Pregunta' : 'Solución';
    
    const text = document.createElement('span');
    text.className = 'tree-node-text';
    text.textContent = node.text.split('\n')[0];
    text.title = node.text;
    
    info.appendChild(badge);
    info.appendChild(text);
    
    const actions = document.createElement('div');
    actions.className = 'tree-node-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'tree-node-action-btn';
    editBtn.textContent = '✎ Editar';
    editBtn.onclick = () => editNode(nodeId);
    
    actions.appendChild(editBtn);
    
    container.appendChild(info);
    container.appendChild(actions);
    nodeEditor.appendChild(container);
    
    // Render child nodes
    if(node.type === 'question' && node.options){
      node.options.forEach(opt => {
        renderNode(opt.nextNodeId, depth + 1);
      });
    }
  };
  
  renderNode(tree.rootNodeId);
  updateTreeStats();
}

function editNode(nodeId){
  const tree = els.diagramModal._treeData;
  const node = tree?.nodes[nodeId];
  if(!node) return;
  
  const nodeEditorModal = document.getElementById('nodeEditorModal');
  if(!nodeEditorModal) return;
  
  // Set node type
  const typeRadios = nodeEditorModal.querySelectorAll('input[name="nodeType"]');
  typeRadios.forEach(r => {
    r.checked = (r.value === node.type);
  });
  
  // Set text
  const textArea = document.getElementById('nodeEditorText');
  if(textArea) textArea.value = node.text || '';
  
  // Setup image preview
  const imagePreview = document.getElementById('nodeImagePreview');
  const imagePreviewImg = document.getElementById('nodeImagePreviewImg');
  const imageRemoveBtn = document.getElementById('nodeImageRemoveBtn');
  const imageUploadBtn = document.getElementById('nodeImageUploadBtn');
  const imageInput = document.getElementById('nodeImageInput');
  
  // Display current image if exists
  if(node.image){
    if(imagePreview) imagePreview.style.display = 'block';
    if(imagePreviewImg) imagePreviewImg.src = node.image;
  } else {
    if(imagePreview) imagePreview.style.display = 'none';
  }
  
  // Wire image upload
  if(imageUploadBtn){
    imageUploadBtn.onclick = (ev) => {
      ev.preventDefault();
      if(imageInput) imageInput.click();
    };
  }
  
  if(imageInput){
    imageInput.onchange = (ev) => {
      const file = ev.target.files[0];
      if(!file) return;
      
      if(file.size > 5 * 1024 * 1024){
        showToast('La imagen no puede superar 5MB', 'warning');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        node.image = e.target.result;
        if(imagePreview) imagePreview.style.display = 'block';
        if(imagePreviewImg) imagePreviewImg.src = node.image;
        showToast('Imagen añadida', 'success');
      };
      reader.readAsDataURL(file);
    };
  }
  
  if(imageRemoveBtn){
    imageRemoveBtn.onclick = (ev) => {
      ev.preventDefault();
      node.image = null;
      if(imagePreview) imagePreview.style.display = 'none';
      if(imageInput) imageInput.value = '';
      showToast('Imagen eliminada', 'info');
    };
  }
  
  // Show/hide options section
  const optionsSection = document.getElementById('optionsSection');
  if(optionsSection){
    optionsSection.style.display = node.type === 'question' ? 'block' : 'none';
  }
  
  // Populate options if it's a question
  if(node.type === 'question'){
    const optionsList = document.getElementById('optionsList');
    if(optionsList){
      if(!node.options) node.options = [];
      renderOptionsList(node, optionsList);
    }
  }
  
  // Handle type change
  typeRadios.forEach(radio => {
    radio.onchange = () => {
      const selectedType = radio.value;
      if(optionsSection) optionsSection.style.display = selectedType === 'question' ? 'block' : 'none';
      
      // If converting to question, ensure options exist
      if(selectedType === 'question' && (!node.options || node.options.length === 0)){
        node.options = [
          {id: 'opt-' + Date.now(), label: 'Opción 1', nextNodeId: null}
        ];
        const optionsList = document.getElementById('optionsList');
        if(optionsList) renderOptionsList(node, optionsList);
      }
    };
  });
  
  // Store context
  nodeEditorModal._nodeId = nodeId;
  nodeEditorModal._tree = tree;
  nodeEditorModal._node = node;
  
  // Wire add option button
  const addOptionBtn = document.getElementById('addOptionBtn');
  if(addOptionBtn){
    addOptionBtn.onclick = (ev) => {
      ev.preventDefault();
      if(!node.options) node.options = [];
      node.options.push({
        id: 'opt-' + Date.now(),
        label: `Opción ${node.options.length + 1}`,
        nextNodeId: null
      });
      const optionsList = document.getElementById('optionsList');
      if(optionsList) renderOptionsList(node, optionsList);
    };
  }
  
  // Wire save
  const saveBtn = document.getElementById('nodeEditorSaveBtn');
  if(saveBtn){
    saveBtn.onclick = () => {
      const selectedType = nodeEditorModal.querySelector('input[name="nodeType"]:checked')?.value || 'question';
      const newText = textArea?.value?.trim() || '';
      
      if(!newText){
        showToast('Escribe contenido para el nodo', 'warning');
        return;
      }
      
      node.type = selectedType;
      node.text = newText;
      
      // Save option labels if question
      if(selectedType === 'question'){
        const optionInputs = document.querySelectorAll('#optionsList input[type="text"]') || [];
        optionInputs.forEach((inp, idx) => {
          if(node.options && node.options[idx]){
            node.options[idx].label = inp.value.trim() || `Opción ${idx + 1}`;
          }
        });
      } else {
        node.options = [];
      }
      
      nodeEditorModal.classList.add('hidden');
      renderDiagramEditorTree();
      showToast('Nodo actualizado', 'success');
    };
  }
  
  nodeEditorModal.classList.remove('hidden');
}

function renderOptionsList(node, optionsList){
  optionsList.innerHTML = '';
  
  if(!node.options || node.options.length === 0){
    optionsList.innerHTML = '<p style="font-size:13px;color:var(--cw-text-muted);margin:0">Sin opciones aún. Haz clic en "+ Añadir opción" para crear una.</p>';
    return;
  }
  
  node.options.forEach((opt, idx) => {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;padding:12px;background:var(--cw-surface);border-radius:8px;border:1px solid var(--cw-border)';
    
    const label = document.createElement('input');
    label.type = 'text';
    label.className = 'input-field';
    label.value = opt.label || '';
    label.placeholder = `Opción ${idx + 1}`;
    label.style.flex = '1';
    label.addEventListener('change', () => {
      opt.label = label.value.trim() || `Opción ${idx + 1}`;
    });
    
    const createNodeBtn = document.createElement('button');
    createNodeBtn.type = 'button';
    createNodeBtn.className = 'secondary small-btn';
    createNodeBtn.textContent = opt.nextNodeId ? '✓ Asignado' : '+ Crear nodo';
    createNodeBtn.style.padding = '8px 12px';
    createNodeBtn.style.whiteSpace = 'nowrap';
    createNodeBtn.style.background = opt.nextNodeId ? '#10b981' : 'var(--cw-primary)';
    createNodeBtn.style.color = 'white';
    createNodeBtn.style.border = 'none';
    createNodeBtn.style.borderRadius = '6px';
    createNodeBtn.style.cursor = 'pointer';
    createNodeBtn.style.fontWeight = '600';
    createNodeBtn.style.fontSize = '13px';
    
    createNodeBtn.onclick = (ev) => {
      ev.preventDefault();
      if(opt.nextNodeId){
        showToast('Ya hay un nodo asignado a esta opción. Edítalo directamente.', 'info');
        return;
      }
      
      const tree = nodeEditorModal._tree;
      if(!tree) return;
      
      const newNodeId = 'node-' + Date.now();
      
      tree.nodes[newNodeId] = {
        id: newNodeId,
        type: 'question',
        text: 'Nueva pregunta',
        depth: (node.depth || 0) + 1,
        options: []
      };
      
      opt.nextNodeId = newNodeId;
      createNodeBtn.textContent = '✓ Asignado';
      createNodeBtn.style.background = '#10b981';
      
      renderDiagramEditorTree();
      showToast('Nodo hijo creado. Edítalo para personalizar.', 'success');
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'secondary small-btn';
    deleteBtn.textContent = '🗑';
    deleteBtn.style.padding = '8px 12px';
    deleteBtn.style.background = '#ef4444';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.borderRadius = '6px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.onclick = (ev) => {
      ev.preventDefault();
      node.options.splice(idx, 1);
      renderOptionsList(node, optionsList);
    };
    
    container.appendChild(label);
    container.appendChild(createNodeBtn);
    container.appendChild(deleteBtn);
    optionsList.appendChild(container);
  });
}

function addNewNode(){
  const tree = els.diagramModal._treeData;
  if(!tree) return;
  
  const addNodeModal = document.getElementById('addNodeModal');
  if(!addNodeModal) return;
  
  // Wire option selectors - remove previous listeners
  const questionOpt = document.getElementById('addNodeQuestionOption');
  const solutionOpt = document.getElementById('addNodeSolutionOption');
  
  // Clone to remove old listeners
  if(questionOpt && questionOpt.parentNode){
    const newQuestOpt = questionOpt.cloneNode(true);
    questionOpt.parentNode.replaceChild(newQuestOpt, questionOpt);
    
    newQuestOpt.addEventListener('click', () => {
      const nodeId = 'node-' + Date.now();
      const maxDepth = Math.max(...Object.values(tree.nodes).map(n => n.depth || 0));
      
      tree.nodes[nodeId] = {
        id: nodeId,
        type: 'question',
        text: 'Nueva pregunta',
        depth: maxDepth + 1,
        options: []
      };
      
      addNodeModal.classList.add('hidden');
      renderDiagramEditorTree();
      showToast('Pregunta añadida - Haz clic en "Editar" para añadir opciones', 'success');
    });
    newQuestOpt.addEventListener('mouseenter', function(){ this.style.transform = 'scale(1.05)'; });
    newQuestOpt.addEventListener('mouseleave', function(){ this.style.transform = 'scale(1)'; });
  }
  
  if(solutionOpt && solutionOpt.parentNode){
    const newSolOpt = solutionOpt.cloneNode(true);
    solutionOpt.parentNode.replaceChild(newSolOpt, solutionOpt);
    
    newSolOpt.addEventListener('click', () => {
      const nodeId = 'node-' + Date.now();
      const maxDepth = Math.max(...Object.values(tree.nodes).map(n => n.depth || 0));
      
      tree.nodes[nodeId] = {
        id: nodeId,
        type: 'solution',
        depth: maxDepth + 1,
        text: 'Nueva solución'
      };
      
      addNodeModal.classList.add('hidden');
      renderDiagramEditorTree();
      showToast('Solución añadida', 'success');
    });
    newSolOpt.addEventListener('mouseenter', function(){ this.style.transform = 'scale(1.05)'; });
    newSolOpt.addEventListener('mouseleave', function(){ this.style.transform = 'scale(1)'; });
  }
  
  addNodeModal.classList.remove('hidden');
}

function saveDiagram(){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
    showToast('Solo administradores pueden guardar', 'warning');
    return; 
  }
  
  const tree = els.diagramModal._treeData;
  const title = els.diagramTitle ? els.diagramTitle.value.trim() : '';
  
  if(!title){ 
    showToast('Escribe un nombre para el diagrama', 'warning');
    return; 
  }
  if(!tree || Object.keys(tree.nodes || {}).length === 0){
    showToast('El árbol debe tener al menos un nodo', 'warning');
    return; 
  }
  
  tree.title = title;
  
  const idx = els.diagramModal && els.diagramModal._editingIdx;
  if(idx !== undefined){
    STATE.diagrams[idx] = tree;
  } else {
    STATE.diagrams.push(tree);
  }
  
  localStorage.setItem('cw:diagrams', JSON.stringify(STATE.diagrams));
  renderDiagrams();
  if(els.diagramModal) els.diagramModal.classList.add('hidden');
  showToast('Árbol guardado correctamente', 'success');
}

function deleteDiagram(){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
    showToast('Solo administradores pueden eliminar', 'warning');
    return; 
  }
  const idx = els.diagramModal && els.diagramModal._editingIdx;
  if(idx === undefined || !confirm('¿Eliminar este árbol de decisiones?')) return;
  STATE.diagrams.splice(idx, 1);
  localStorage.setItem('cw:diagrams', JSON.stringify(STATE.diagrams));
  renderDiagrams();
  if(els.diagramModal) els.diagramModal.classList.add('hidden');
  showToast('Árbol eliminado', 'info');
}

// ============= TOAST NOTIFICATIONS =============
function showToast(message, type='info', duration=4000){
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    color: #1a202c;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    border-left: 4px solid ${colors[type] || colors.info};
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 400px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    font-size: 14px;
    font-weight: 500;
  `;
  
  const icon = document.createElement('span');
  icon.textContent = icons[type] || icons.info;
  icon.style.cssText = `color: ${colors[type] || colors.info}; font-weight: bold; font-size: 18px;`;
  
  const text = document.createElement('span');
  text.textContent = message;
  
  toast.appendChild(icon);
  toast.appendChild(text);
  document.body.appendChild(toast);
  
  setTimeout(()=>{ toast.style.animation = 'slideOut 0.3s ease'; setTimeout(()=>toast.remove(), 300); }, duration);
}

// Add animations to CSS dynamically
if(!document.getElementById('toast-animations')){
  const style = document.createElement('style');
  style.id = 'toast-animations';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
    .toast-notification { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  `;
  document.head.appendChild(style);
}

// Expose small helpers for debugging if needed
window.auth = {login, logout, addUser, removeUser};

// init on DOM ready
window.addEventListener('DOMContentLoaded', ()=>{ 
  init().then(async ()=>{
    // Ensure all panels are hidden initially
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    
    // Always start on dashboard (clear hash on page load)
    // Users will navigate to manuals via buttons/nav, not hash
    console.debug('[DOMContentLoaded] Iniciando en dashboard, limpiando hash');
    window.history.replaceState(null, '', window.location.pathname);
    
    const welcome = document.getElementById('welcome');
    if(welcome) {
      welcome.classList.remove('hidden');
      console.debug('[DOMContentLoaded] ✓ Dashboard visible');
    }
    
    // Hide toolbar (if present)
    document.getElementById('adminToolbar')?.classList.add('hidden');
    
    // final defensive reset: ensure we're at top after all init work
    try{ window.scrollTo(0,0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }catch(e){}
    // focus search input without scrolling
    try{ if(els.searchInput) els.searchInput.focus({preventScroll:true}); }catch(e){ if(els.searchInput) els.searchInput.focus(); }
    // keyboard shortcut: '/' focuses main search (unless in an input)
    try{
      window.addEventListener('keydown', (ev)=>{
        if(ev.key === '/' && !ev.metaKey && !ev.ctrlKey && !ev.altKey){
          const active = document.activeElement;
          if(active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
          ev.preventDefault();
          const s = document.getElementById('search'); if(s){ try{ s.focus({preventScroll:true}); }catch(e){ s.focus(); } }
        }
      });
    }catch(e){/* ignore */}
  });
});

// expose small helpers for debugging if needed
window.CW = {STATE};
