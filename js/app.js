// app.js - main application wiring
// Uses ES modules with backend API for all data persistence

import { findManualById, listCategories, listRoles, listTypes, listSuggestions, searchAdvanced } from './dataService.js';
import { setupSearch } from './search-clean.js';
import api from './apiClient.js';
import deviceAuth from './deviceAuth.js';

const STATE = {
  manuals: [],
  current: null,
  diagrams: [],
  progress: {},
  comments: {},
  history: [],
  lastSeenVersion: {},
  agentMode: false,
  darkMode: JSON.parse(localStorage.getItem('cw:darkMode')||'false'),
  fontSize: 15, // Will be simplified - removed from settings
  notifEnabled: true, // Will be simplified - removed from settings
  agentName: localStorage.getItem('cw:agentName')||'Agente',
  users: null,
  authUser: null,
  // API available globally through STATE
  api: api
};

// ============= DASHBOARD SYSTEM =============
// These functions are defined early so they can be called during init()

function initDashboardElements(){
  // Wire dashboard buttons and handlers
  const dashboardBtn = document.querySelector('[data-nav="dashboard"]');
  const refreshBtn = document.getElementById('refreshDashboardBtn');
  const searchNavigateBtn = document.getElementById('searchNavigateBtn');
  const goToSearchBtn = document.getElementById('goToSearchBtn');

  if(dashboardBtn) {
    dashboardBtn.addEventListener('click', ()=> {
      showView('dashboardView');
    });
  }

  if(refreshBtn) {
    refreshBtn.addEventListener('click', ()=> {
      updateDashboardStats();
      showToast('Estadísticas actualizadas', 'info');
    });
  }

  if(searchNavigateBtn) {
    searchNavigateBtn.addEventListener('click', ()=> {
      const search = document.getElementById('search');
      if(search) search.focus();
    });
  }

  if(goToSearchBtn) {
    goToSearchBtn.addEventListener('click', ()=> {
      const search = document.getElementById('search');
      if(search) search.focus();
    });
  }

  // Initial dashboard update
  updateDashboardStats();
}

function updateDashboardStats(){
  // Total manuals
  const totalManualsWidget = document.getElementById('totalManualsWidget');
  if(totalManualsWidget) totalManualsWidget.textContent = STATE.manuals.length;

  // Completed steps
  const completedStepsWidget = document.getElementById('completedStepsWidget');
  let totalCompleted = 0;
  Object.values(STATE.progress || {}).forEach(manual => {
    if(typeof manual === 'object') {
      totalCompleted += Object.values(manual).filter(v => v === true).length;
    }
  });
  if(completedStepsWidget) completedStepsWidget.textContent = totalCompleted;

  // Viewed manuals (from history)
  const viewedManualsWidget = document.getElementById('viewedManualsWidget');
  if(viewedManualsWidget) viewedManualsWidget.textContent = (STATE.history || []).length;

  // Comments count
  const totalCommentsWidget = document.getElementById('totalCommentsWidget');
  let commentCount = 0;
  Object.values(STATE.comments || {}).forEach(manual => {
    if(Array.isArray(manual)) commentCount += manual.length;
  });
  if(totalCommentsWidget) totalCommentsWidget.textContent = commentCount;

  // Diagrams count
  const diagramsCountWidget = document.getElementById('diagramsCountWidget');
  if(diagramsCountWidget) diagramsCountWidget.textContent = (STATE.diagrams || []).length;

  // History count (last 7)
  const historyCountWidget = document.getElementById('historyCountWidget');
  const recentHistory = (STATE.history || []).slice(0, 7);
  if(historyCountWidget) historyCountWidget.textContent = recentHistory.length;

  // Average steps per manual
  const avgStepsWidget = document.getElementById('avgStepsWidget');
  if(avgStepsWidget) {
    let totalSteps = 0;
    STATE.manuals.forEach(m => {
      if(Array.isArray(m.steps)) totalSteps += m.steps.length;
    });
    const avg = STATE.manuals.length > 0 ? Math.round(totalSteps / STATE.manuals.length * 10) / 10 : 0;
    avgStepsWidget.textContent = avg;
  }

  // Completion rate
  const completionRateWidget = document.getElementById('completionRateWidget');
  if(completionRateWidget) {
    let totalPossible = 0;
    STATE.manuals.forEach(m => {
      if(Array.isArray(m.steps)) totalPossible += m.steps.length;
    });
    const rate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    completionRateWidget.textContent = rate + '%';
  }

  // Last activity
  const lastActivityWidget = document.getElementById('lastActivityWidget');
  if(lastActivityWidget) {
    if(STATE.history && STATE.history.length > 0) {
      const lastTime = new Date(STATE.history[0].timestamp || Date.now());
      const now = new Date();
      const diff = Math.floor((now - lastTime) / 1000);
      let timeStr = 'Hace unos momentos';
      if(diff < 60) timeStr = 'Hace unos segundos';
      else if(diff < 3600) timeStr = `Hace ${Math.floor(diff/60)} minutos`;
      else if(diff < 86400) timeStr = `Hace ${Math.floor(diff/3600)} horas`;
      else timeStr = `Hace ${Math.floor(diff/86400)} d�as`;
      lastActivityWidget.textContent = timeStr;
    }
  }

  // Update activity feed
  updateActivityFeed();
}

function updateActivityFeed(){
  const activityWidget = document.getElementById('recentActivityWidget');
  if(!activityWidget) return;

  const recentItems = [];
  
  // Add recent views
  if(STATE.history && STATE.history.length > 0) {
    STATE.history.slice(0, 5).forEach(item => {
      recentItems.push({
        type: 'view',
        title: item.title || 'Manual consultado',
        time: item.timestamp,
        icon: '📸'
      });
    });
  }

  // Add recent diagrams
  if(STATE.diagrams && STATE.diagrams.length > 0) {
    STATE.diagrams.slice(0, 3).forEach(d => {
      recentItems.push({
        type: 'diagram',
        title: `�rbol: ${d.title}`,
        time: d.createdAt,
        icon: '🖼️'
      });
    });
  }

  if(recentItems.length === 0) {
    activityWidget.innerHTML = '<p style="color:var(--cw-text-muted);text-align:center;padding:20px">No hay actividad aún</p>';
    return;
  }

  activityWidget.innerHTML = recentItems.slice(0, 8).map(item => {
    const date = new Date(item.time || Date.now());
    const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="activity-item">
        <div class="activity-icon">${item.icon}</div>
        <div class="activity-content">
          <div>${item.title}</div>
          <div class="activity-time">${timeStr}</div>
        </div>
      </div>
    `;
  }).join('');
}

function showView(viewId){
  // Hide all panels except the one requested
  document.querySelectorAll('.canvas > article').forEach(article => {
    article.classList.add('hidden');
  });

  // Show the requested panel
  const panel = document.getElementById(viewId);
  if(panel) {
    panel.classList.remove('hidden');
  }

  // Update active nav button
  document.querySelectorAll('.nav button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const navBtn = document.querySelector(`[data-nav="${viewId === 'dashboardView' ? 'dashboard' : viewId === 'manualsListView' ? 'manuals' : viewId === 'fibraView' ? 'fibra' : viewId === 'historyView' ? 'history' : viewId === 'faqsView' ? 'faqs' : 'settings'}"]`);
  if(navBtn) navBtn.classList.add('active');

  // Scroll to top
  try { window.scrollTo(0, 0); } catch(e) {}
}

// ============= END DASHBOARD SYSTEM =============

const els = {
  searchInput: null,
  autocomplete: null,
  canvas: null,
  manualView: null,
  manualTitle: null,
  manualCategory: null,
  manualSteps: null,
  qrModal: null,
  qrImage: null,
  commentsList: null,
  commentInput: null,
  addComment: null,
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
  els.manualSteps = document.getElementById('manualSteps');
  els.manualStepsNav = document.getElementById('manualStepsNav');
  els.qrModal = document.getElementById('qrModal');
  els.qrImage = document.getElementById('qrImage');
  els.commentsList = document.getElementById('commentsList');
  els.commentInput = document.getElementById('commentInput');
  els.addComment = document.getElementById('addComment');
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
  
  // === DEVICE RECOGNITION & AUTO-LOGIN ===
  const canAutoLogin = await deviceAuth.canAutoLogin();
  if(canAutoLogin) {
    const savedUser = deviceAuth.getSavedUser();
    console.log('[init] Auto-login: Dispositivo reconocido, sesi�n iniciada para', savedUser.username);
    STATE.authUser = savedUser;
    deviceAuth.getSessionToken(); // Initialize session token
  }
  
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

  // load data from backend API
  try{
    // Load manuals from backend API
    console.log('[init] Iniciando carga de manuales...');
    STATE.manuals = await api.getManuals() || [];
    // Convertir content → steps en cada manual (el backend retorna 'content', nosotros usamos 'steps')
    STATE.manuals.forEach(m => {
      if(m.content && !m.steps) {
        m.steps = m.content;
      }
    });
    console.log(`[init] ? Loaded ${STATE.manuals.length} manuals from API`);
    
    // Load diagrams from API
    console.log('[init] Cargando diagramas...');
    STATE.diagrams = await api.getDiagrams() || [];
    STATE.history = await api.getHistory() || [];
    console.log(`[init] ? Loaded ${STATE.diagrams.length} diagrams from API`);
    console.log(`[init] ? Loaded ${STATE.history.length} history items from API`);

    // update system info
    if(els.manualCount) els.manualCount.textContent = STATE.manuals.length;
    if(els.lastUpdate) els.lastUpdate.textContent = new Date().toLocaleDateString('es-ES');

    // get all categories from ALL manuals (base + custom)
    console.log('[init] Extrayendo categor�as...');
    const allCategories = listCategories(STATE.manuals);
    console.log('[init] Categor�as:', allCategories);
    
    console.log('[init] Renderizando lista de manuales...');
    renderManualsList(STATE.manuals, allCategories);
    console.log('[init] ? Manuales renderizados');
    
    // Setup manual filters
    const searchFilterEl = document.getElementById('manualsSearchFilter');
    const categoryFilterEl = document.getElementById('manualsCategoryFilter');
    const roleFilterEl = document.getElementById('manualsRoleFilter');
    
    if(searchFilterEl || categoryFilterEl || roleFilterEl) {
      // Populate category filter
      if(categoryFilterEl) {
        allCategories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.toLowerCase();
          opt.textContent = cat;
          categoryFilterEl.appendChild(opt);
        });
      }
      
      // Filter function
      function applyManualFilters() {
        let filtered = STATE.manuals;
        const searchTerm = searchFilterEl?.value?.toLowerCase() || '';
        const categoryTerm = categoryFilterEl?.value?.toLowerCase() || '';
        const roleTerm = roleFilterEl?.value?.toLowerCase() || '';
        
        filtered = filtered.filter(m => {
          const matchSearch = !searchTerm || 
            m.title.toLowerCase().includes(searchTerm) || 
            m.summary?.toLowerCase().includes(searchTerm) || 
            m.category?.toLowerCase().includes(searchTerm);
          const matchCat = !categoryTerm || m.category?.toLowerCase() === categoryTerm;
          const matchRole = !roleTerm || m.role?.toLowerCase() === roleTerm;
          return matchSearch && matchCat && matchRole;
        });
        
        renderManualsList(filtered, allCategories);
      }
      
      if(searchFilterEl) searchFilterEl.addEventListener('input', applyManualFilters);
      if(categoryFilterEl) categoryFilterEl.addEventListener('change', applyManualFilters);
      if(roleFilterEl) roleFilterEl.addEventListener('change', applyManualFilters);
    }
    // Ensure create manual and modal controls are wired (robust wiring inside init)
    try{
      console.debug('[init] Buscando bot�n de crear manual: #createManualBtn');
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
      const saveInit = document.getElementById('saveNewManualBtn'); 
      if(saveInit) saveInit.addEventListener('click', async (ev)=>{ ev.preventDefault(); await saveNewManual(); });
      // Wire PDF import
      if(els.processPdfBtn) els.processPdfBtn.addEventListener('click', (ev)=>{ 
        ev.preventDefault(); 
        if(els.pdfFileInput){
          els.pdfFileInput.click(); // Abre selector de archivos
        }
      });
      // Handle PDF file selection
      if(els.pdfFileInput) els.pdfFileInput.addEventListener('change', (ev)=>{ 
        if(ev.target.files && ev.target.files.length > 0){
          importPdfManual(ev.target.files[0]);
          ev.target.value = ''; // Reset input
        }
      });
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
      console.debug('[init] ? Wiring modal completado');
      
      // Wire Fibra diagram controls
      if(els.createDiagramBtn) els.createDiagramBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); openDiagramEditor(); });
      const addNodeBtn = document.getElementById('addNodeBtn');
      if(addNodeBtn) addNodeBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); addNewNode(); });
      if(els.saveDiagramBtn) els.saveDiagramBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); saveDiagram(); });
      if(els.deleteDiagramBtn) els.deleteDiagramBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); if(confirm('�Eliminar este diagrama?')) deleteDiagram(); });
      
      // Wire category management
      if(els.addCategoryBtn) els.addCategoryBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); addCategory(els.newCategoryInput.value); });
      if(els.changeManualCategoryBtn) els.changeManualCategoryBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); changeManualCategory(els.changeManualCategorySelect.value); });
      const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
      if(manageCategoriesBtn) manageCategoriesBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); openCategoryManager(); });
      
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
        btn.innerHTML = `<strong>${escapeHtml(s.title)}</strong> <span class="muted">� ${escapeHtml(s.category)}</span><div class="small">${escapeHtml(s.summary||'')}</div>`;
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
    els.addNewStepBtn = document.getElementById('addNewStepBtn');
    els.deleteManualBtn = document.getElementById('deleteManualBtn');
    els.exportCurrentBtn = document.getElementById('exportCurrentBtn');
    els.saveManualBtn = document.getElementById('saveManualBtn');
    if(els.saveManualBtn) els.saveManualBtn.addEventListener('click', ()=>{ saveManualEdits(); });
    if(els.addStepBtn) els.addStepBtn.addEventListener('click', ()=>{ addEditorStep(); });
    if(els.addNewStepBtn) els.addNewStepBtn.addEventListener('click', ()=>{ createStepEditorRow(); });
    if(els.deleteManualBtn) els.deleteManualBtn.addEventListener('click', ()=>{ if(confirm('�Eliminar manual? Esta acci�n es irreversible.')) deleteManual(STATE.current && STATE.current.id); });
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
        if(confirm('�Est�s seguro? Se eliminar�n todos los datos locales (progreso, comentarios, historial).')) {
          localStorage.clear();
          STATE.progress = {};
          STATE.comments = {};
          STATE.history = [];
          renderHistory();
          pushNotification({title: 'Datos borrados', text: 'Todos los datos locales han sido eliminados.'});
        }
      });
    }

    // New settings handlers
    const backupBtn = document.getElementById('backupDataBtn');
    if(backupBtn) {
      backupBtn.addEventListener('click', () => {
        const backup = {
          timestamp: new Date().toISOString(),
          data: {
            progress: STATE.progress,
            comments: STATE.comments,
            history: STATE.history,
            diagrams: STATE.diagrams
          }
        };
        localStorage.setItem('cw:backup', JSON.stringify(backup));
        showToast('💾 Respaldo creado correctamente', 'info');
      });
    }

    const restoreBtn = document.getElementById('restoreDataBtn');
    if(restoreBtn) {
      restoreBtn.addEventListener('click', () => {
        const backup = localStorage.getItem('cw:backup');
        if(!backup) {
          showToast('⚠️ No hay respaldo disponible', 'warning');
          return;
        }
        if(confirm('�Restaurar desde el �ltimo respaldo? Esto sobrescribir� los datos actuales.')) {
          const parsed = JSON.parse(backup);
          STATE.progress = parsed.data.progress || {};
          STATE.comments = parsed.data.comments || {};
          STATE.history = parsed.data.history || [];
          STATE.diagrams = parsed.data.diagrams || [];
          localStorage.setItem('cw:progress', JSON.stringify(STATE.progress));
          localStorage.setItem('cw:comments', JSON.stringify(STATE.comments));
          localStorage.setItem('cw:history', JSON.stringify(STATE.history));
          localStorage.setItem('cw:diagrams', JSON.stringify(STATE.diagrams));
          showToast('💾 Datos restaurados correctamente', 'success');
          location.reload();
        }
      });
    }

    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if(clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        if(confirm('�Borrar tu historial de b�squedas y vistas?')) {
          STATE.history = [];
          localStorage.setItem('cw:history', JSON.stringify(STATE.history));
          renderHistory();
          showToast('🗑️ Historial borrado', 'info');
        }
      });
    }

    const compactModeCheckbox = document.getElementById('compactMode');
    if(compactModeCheckbox) {
      const savedCompactMode = JSON.parse(localStorage.getItem('cw:compactMode') || 'false');
      compactModeCheckbox.checked = savedCompactMode;
      if(savedCompactMode) document.querySelector('.cw-root')?.classList.add('compact');
      
      compactModeCheckbox.addEventListener('change', (ev) => {
        const isCompact = ev.target.checked;
        localStorage.setItem('cw:compactMode', JSON.stringify(isCompact));
        if(isCompact) {
          document.querySelector('.cw-root')?.classList.add('compact');
        } else {
          document.querySelector('.cw-root')?.classList.remove('compact');
        }
      });
    }

    const notifFrequency = document.getElementById('notifFrequency');
    if(notifFrequency) {
      const saved = localStorage.getItem('cw:notifFrequency') || 'all';
      notifFrequency.value = saved;
      notifFrequency.addEventListener('change', (ev) => {
        localStorage.setItem('cw:notifFrequency', ev.target.value);
      });
    }

    const notifSound = document.getElementById('notifSound');
    if(notifSound) {
      const saved = JSON.parse(localStorage.getItem('cw:notifSound') || 'true');
      notifSound.checked = saved;
      notifSound.addEventListener('change', (ev) => {
        localStorage.setItem('cw:notifSound', JSON.stringify(ev.target.checked));
      });
    }

    const searchHistoryEnabled = document.getElementById('searchHistoryEnabled');
    if(searchHistoryEnabled) {
      const saved = JSON.parse(localStorage.getItem('cw:searchHistory') || 'true');
      searchHistoryEnabled.checked = saved;
      searchHistoryEnabled.addEventListener('change', (ev) => {
        localStorage.setItem('cw:searchHistory', JSON.stringify(ev.target.checked));
      });
    }

    const autoSuggest = document.getElementById('autoSuggest');
    if(autoSuggest) {
      const saved = JSON.parse(localStorage.getItem('cw:autoSuggest') || 'true');
      autoSuggest.checked = saved;
      autoSuggest.addEventListener('change', (ev) => {
        localStorage.setItem('cw:autoSuggest', JSON.stringify(ev.target.checked));
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
    // FAQs are loaded from API or localStorage, no need for base faqs
    let customFaqs = JSON.parse(localStorage.getItem('cw:faqs')||'null');
    if(!customFaqs){
      // seed a few useful FAQs so the panel isn't empty on first run
      customFaqs = [
        { id: 'custom-1', q: '�C�mo reinicio un router?', a: 'Desconecta el router de la corriente, espera 30 segundos y vuelve a conectar. Espera 2-3 minutos para que se estabilice la conexi�n.' , created: Date.now() },
        { id: 'custom-2', q: 'Cliente con internet lento', a: 'Comprueba primero la velocidad con una prueba (speedtest). Reinicia el router; si persiste, revisa interferencias Wi-Fi y el estado del cableado.' , created: Date.now() },
        { id: 'custom-3', q: 'No hay se�al de TV', a: 'Verifica que el decodificador est� encendido y conectado. Reinicia el equipo y comprueba las entradas HDMI/AV.' , created: Date.now() }
      ];
      localStorage.setItem('cw:faqs', JSON.stringify(customFaqs));
    }
    STATE.faqs = customFaqs || [];
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
    if(els.deleteFaqBtn) els.deleteFaqBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); if(confirm('�Eliminar esta FAQ?')) deleteFaq(els.deleteFaqBtn.dataset.id); });
    if(els.faqSearch) els.faqSearch.addEventListener('input', debounce((ev)=>{ filterFaqs(ev.target.value); }, 220));
    if(els.clearFaqSearch) els.clearFaqSearch.addEventListener('click', ()=>{ if(els.faqSearch) { els.faqSearch.value=''; filterFaqs(''); } });
    if(els.exportAllDataBtn) els.exportAllDataBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); exportAllData(); });

    // Initialize dashboard
    initDashboardElements();

    renderHistory();

  }catch(err){
    console.error('[init] ERROR:', err);
    console.error('[init] Stack:', err.stack);
    console.error('[init] Type:', typeof err);
    console.error('[init] Message:', err.message);
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
      <p>Comprueba la conexi�n o pulsa <strong>Reintentar</strong>. Si el problema persiste, contacta con el equipo t�cnico.</p>
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
    const dashboardView = document.getElementById('dashboardView');
    if(dashboardView) {
      dashboardView.classList.remove('hidden');
      updateDashboardStats();
    } else {
      document.getElementById('welcome').classList.remove('hidden');
    }
    document.getElementById('adminToolbar')?.classList.add('hidden');
  }
  else if(name === 'manuals') {
    const manualsList = document.getElementById('manualsListView');
    if(manualsList) {
      manualsList.classList.remove('hidden');
      renderManualsList(STATE.manuals, listCategories(STATE.manuals));
    }
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
  const noMsgEl = document.getElementById('noManualsMessage');
  const totalCountEl = document.getElementById('totalManualsCount');
  
  if (!manuals || manuals.length === 0) {
    container.innerHTML = '';
    if (noMsgEl) noMsgEl.style.display = 'block';
    if (totalCountEl) totalCountEl.textContent = '0 manuales';
    return;
  }
  
  if (noMsgEl) noMsgEl.style.display = 'none';
  
  // Actualizar contador
  if (totalCountEl) {
    totalCountEl.textContent = `${manuals.length} manual${manuals.length !== 1 ? 'es' : ''}`;
  }
  
  container.innerHTML = '';
  
  // Crear tarjetas para cada manual - NUEVO DISE�O
  manuals.forEach(m => {
    const card = document.createElement('div');
    card.className = 'manual-card';
    
    // Obtener cantidad de pasos
    const stepsCount = (m.steps && m.steps.length) || 0;
    const summaryText = m.summary || 'Manual t�cnico';
    
    // HTML NUEVO - Dise�o limpio
    card.innerHTML = `
      <h3 class="manual-card-title">${m.title || 'Sin t�tulo'}</h3>
      <p class="manual-card-description">${summaryText}</p>
      <div class="manual-card-footer">
        <div class="manual-card-meta">
          <span class="manual-card-badge">${stepsCount} pasos</span>
          <span class="manual-card-badge category">${m.category || 'Sin categor�a'}</span>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => openManual(m.id));
    container.appendChild(card);
  });
}



function openManual(id){
  try{
    console.debug('[openManual] Called with id:', id);
    let manual = findManualById(STATE.manuals, id);
    if(!manual){
      console.warn('[openManual] Manual not found:', id);
      pushNotification({title:'Manual no encontrado', text:`ID: ${id}`});
      return;
    }
    
    // Mostrar inmediatamente con datos locales
    STATE.current = manual;
    const ml = document.getElementById('manualsListView'); if(ml) ml.classList.add('hidden');
    document.getElementById('welcome').classList.add('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden');
    els.manualView.classList.remove('hidden');
    els.manualTitle.textContent = manual.title;
    els.manualCategory.textContent = manual.category;
    renderSteps(manual);
    renderComments(manual.id);
    
    try{
      els.manualView.setAttribute('tabindex','-1');
      try{ els.manualView.focus({preventScroll:true}); }catch(e){ els.manualView.focus(); }
    }catch(e){/* ignore */}
    
    // === OBTENER DATOS FRESCOS DE LA BD EN BACKGROUND ===
    api.getManual(id).then(freshManual => {
      if(freshManual) {
        console.log('[openManual] ✓ Datos frescos obtenidos de la BD:', id);
        // Convertir content → steps si es necesario
        if(freshManual.content && !freshManual.steps) {
          freshManual.steps = freshManual.content;
        }
        
        // Actualizar STATE
        STATE.current = freshManual;
        const idx = STATE.manuals.findIndex(x=>x.id === id);
        if(idx !== -1) {
          STATE.manuals[idx] = Object.assign({}, freshManual);
        }
        
        // Renderizar con datos frescos
        renderSteps(freshManual);
        renderComments(freshManual.id);
        console.log('[openManual] UI actualizada con datos frescos. Pasos:', (freshManual.steps || []).length);
      }
    }).catch(err => {
      console.warn('[openManual] Error al obtener datos frescos, usando cache:', err.message);
    });
    
    // Agregar a historial
    addToHistory(id);
    
  }catch(e){
    console.error('[openManual] Error:', e);
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
    
    // Agregar bot�n de eliminar solo para admins
    const user = STATE.authUser;
    if(user && user.role === 'admin'){
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn';
      deleteBtn.title = 'Eliminar comentario';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.style.fontSize = '14px';
      deleteBtn.style.color = 'var(--cw-danger)';
      deleteBtn.style.padding = '4px 8px';
      deleteBtn.addEventListener('click', (e)=>{
        e.stopPropagation();
        if(confirm('�Eliminar este comentario?')){
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
  pushNotification({title:'Comentario a�adido',text:`Comentario en ${STATE.current.title}`});
}

// Version history system removed - all data persisted in database

function renderFaqs(faqs){
  const container = document.getElementById('faqsList'); if(!container) return; container.innerHTML = '';
  const list = (faqs||[]).slice();
  if(list.length === 0){
    container.innerHTML = '<div class="empty-state">No hay FAQs a�n. Usa "Crear FAQ" para a�adir preguntas frecuentes.</div>';
    return;
  }
  list.forEach((f, idx)=>{
    const item = document.createElement('div'); item.className = 'faq-item'; item.dataset.id = f.id || `faq-${idx}`;
    const q = document.createElement('h5'); q.textContent = f.q || 'Pregunta sin t�tulo';
    const a = document.createElement('div'); a.className = 'faq-answer muted'; a.style.display = 'none'; a.innerHTML = f.a || '';
    // toggle
    item.addEventListener('click', (ev)=>{ if(ev.target.tagName.toLowerCase() === 'button') return; a.style.display = a.style.display === 'none' ? 'block' : 'none'; });

    // admin controls
    const controls = document.createElement('div'); controls.style.display = 'flex'; controls.style.gap = '8px'; controls.style.marginTop = '8px';
    const editBtn = document.createElement('button'); editBtn.className = 'small-btn'; editBtn.textContent = 'Editar'; editBtn.type = 'button';
    editBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); openFaqModal(f); });
    const delBtn = document.createElement('button'); delBtn.className = 'secondary'; delBtn.textContent = 'Eliminar'; delBtn.type = 'button';
    delBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); if(confirm('�Eliminar esta FAQ?')) deleteFaq(f.id); });
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
  pushNotification({title:'Exportaci�n completa', text: 'Se ha descargado un respaldo de los datos locales.'});
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
  
  // === GUARDAR EN LA BASE DE DATOS ===
  if(STATE.authUser && STATE.authUser.id) {
    const historyEntry = {
      userId: STATE.authUser.id,
      manualId: manualId,
      action: 'viewed'
    };
    fetch('http://localhost:5000/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(historyEntry)
    }).catch(err => console.warn('[addToHistory] No se pudo guardar en BD:', err));
  }
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
        <button class="card-open" aria-label="Abrir">📖</button>
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
  STATE.authUser = {id: found.id, name: found.name, username: found.name, role: found.role};
  localStorage.setItem('cw:authUser', JSON.stringify(STATE.authUser));
  
  // === SAVE DEVICE SESSION ===
  await deviceAuth.saveDeviceSession(STATE.authUser);
  console.log('[login] Dispositivo registrado y sesi�n guardada');
  
  if(els.loginModal) hideLoginModal();
  // reveal application UI for authenticated users
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main');
  if(sidebar) sidebar.classList.remove('hidden');
  if(main) main.classList.remove('hidden');
  // show dashboard welcome screen by default after login
  openPanel('dashboard');
  refreshAuthUI();
  pushNotification({title:'Sesi�n iniciada', text: `Hola ${found.name}`});
}

function logout(){
  STATE.authUser = null;
  localStorage.removeItem('cw:authUser');
  // Clear device session
  deviceAuth.clearSession();
  console.log('[logout] Sesi�n del dispositivo cerrada');
  // hide application UI and show login modal again
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main');
  if(sidebar) sidebar.classList.add('hidden');
  if(main) main.classList.add('hidden');
  if(els.loginModal) showLoginModal();
  refreshAuthUI();
  pushNotification({title:'Sesi�n cerrada', text: 'Has cerrado sesi�n.'});
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
  els.manualEditorModal.classList.remove('hidden');
}

// Save manual edits
function saveManualEdits(){
  if(!STATE.current) return; if(!els.editTitle) return;
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Solo administradores pueden guardar cambios.'); return; }
  const id = STATE.current.id;
  const title = els.editTitle.value.trim();
  const summary = els.editSummary.value.trim();
  
  if(!title) { alert('El t�tulo del manual es obligatorio'); return; }
  
  let steps;
  try{ 
    steps = collectStepsFromEditor();
    console.log('[saveManualEdits] Pasos recolectados:', steps.length, steps);
  }catch(e){ 
    console.error('[saveManualEdits] Error:', e);
    alert('Error: pasos inv�lidos'); return; 
  }
  
  const updatedManual = {
    title, summary, steps,
    category: STATE.current.category,
    role: STATE.current.role,
    type: STATE.current.type,
    version: STATE.current.version,
    tags: STATE.current.tags || [],
    versions: STATE.current.versions || []
  };
  
  console.log('[saveManualEdits] Enviando:', JSON.stringify(updatedManual));
  
  api.updateManual(id, updatedManual).then(result => {
    if(result) {
      if(result.content && !result.steps) result.steps = result.content;
      STATE.current = Object.assign({}, STATE.current, result);
      const idx = STATE.manuals.findIndex(x=>x.id === id);
      if(idx !== -1) STATE.manuals[idx] = Object.assign({}, STATE.manuals[idx], result);
      addToHistory(id);
      els.manualEditorModal.classList.add('hidden');
      els.manualTitle.textContent = STATE.current.title;
      renderSteps(STATE.current);
      pushNotification({title:' Cambios guardados', text: 'Los pasos se han guardado en la base de datos'});
    } else {
      pushNotification({title:'Error', text: 'Error al guardar en base de datos', type: 'error'});
    }
  }).catch(err => {
    console.error('[saveManualEdits] Error:', err);
    pushNotification({title:'Error', text: 'Error al guardar: ' + err.message, type: 'error'});
  });
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
  const allCats1 = listCategories(STATE.manuals);
  renderManualsList(STATE.manuals, allCats1);
  pushNotification({title: 'Manual eliminado', text: id});
}

// Editor helpers
function renderEditorSteps(steps){
  if(!els.editStepsList) return;
  els.editStepsList.innerHTML = '';
  (steps||[]).forEach((s, idx)=>{
    // Main row container
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    row.style.gap = '12px';
    row.style.padding = '16px';
    row.style.border = '2px solid #e5e5e5';
    row.style.borderRadius = '10px';
    row.style.backgroundColor = '#fafafa';
    row.style.marginBottom = '16px';
    
    // Header row with title and delete button
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.gap = '8px';
    headerRow.style.alignItems = 'center';
    headerRow.style.justifyContent = 'space-between';
    
    const title = document.createElement('input');
    title.type = 'text';
    title.className = 'input-field';
    title.placeholder = 'T�tulo del paso';
    title.value = s.title || '';
    title.style.flex = '1';
    title.style.minHeight = '40px';
    
    const del = document.createElement('button');
    del.className = 'secondary';
    del.textContent = '🗑️ Eliminar';
    del.style.flex = '0 0 auto';
    del.style.padding = '8px 16px';
    del.style.background = '#ef4444';
    del.style.color = 'white';
    del.style.border = 'none';
    del.style.borderRadius = '6px';
    del.style.cursor = 'pointer';
    del.style.fontSize = '13px';
    del.addEventListener('click', ()=>{ row.remove(); });
    
    headerRow.appendChild(title);
    headerRow.appendChild(del);
    row.appendChild(headerRow);
    
    // Content textarea
    const content = document.createElement('textarea');
    content.className = 'input-field';
    content.placeholder = 'Explicaci�n detallada del paso';
    content.style.flex = '1';
    content.style.minHeight = '300px';
    content.style.maxHeight = '500px';
    content.style.resize = 'vertical';
    content.style.padding = '12px';
    content.style.fontSize = '14px';
    content.style.lineHeight = '1.5';
    content.style.width = '100%';
    content.style.boxSizing = 'border-box';
    content.value = s.content || '';
    row.appendChild(content);
    
    // Image section
    const imageContainer = document.createElement('div');
    imageContainer.style.display = 'flex';
    imageContainer.style.flexDirection = 'column';
    imageContainer.style.gap = '10px';
    imageContainer.style.paddingTop = '12px';
    imageContainer.style.borderTop = '1px solid #e5e5e5';
    
    const imageLabel = document.createElement('label');
    imageLabel.style.fontSize = '12px';
    imageLabel.style.fontWeight = '700';
    imageLabel.style.color = 'var(--cw-text)';
    imageLabel.textContent = '🖼️ Imagen ilustrativa (opcional)';
    
    // Hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.dataset.stepImage = 'true';
    if (s.image) fileInput.dataset.dataurl = s.image;
    
    // Custom file input wrapper (visible label)
    const fileInputWrapper = document.createElement('label');
    fileInputWrapper.style.display = 'flex';
    fileInputWrapper.style.alignItems = 'center';
    fileInputWrapper.style.justifyContent = 'center';
    fileInputWrapper.style.padding = '12px 10px';
    fileInputWrapper.style.border = '2px dashed #ff6b35';
    fileInputWrapper.style.borderRadius = '8px';
    fileInputWrapper.style.cursor = 'pointer';
    fileInputWrapper.style.transition = 'all 0.2s ease';
    fileInputWrapper.style.backgroundColor = 'rgba(255, 107, 53, 0.08)';
    fileInputWrapper.style.minHeight = '48px';
    fileInputWrapper.style.fontSize = '13px';
    
    const fileInputText = document.createElement('span');
    fileInputText.style.color = '#ff6b35';
    fileInputText.style.fontWeight = '600';
    fileInputText.style.userSelect = 'none';
    fileInputText.textContent = '⬆️ Arrastrar imagen aquí o seleccionar';
    
    fileInputWrapper.appendChild(fileInput);
    fileInputWrapper.appendChild(fileInputText);
    
    // Drag-and-drop handlers
    fileInputWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileInputWrapper.style.borderColor = '#ff8a50';
      fileInputWrapper.style.backgroundColor = 'rgba(255, 107, 53, 0.15)';
    });
    
    fileInputWrapper.addEventListener('dragleave', () => {
      fileInputWrapper.style.borderColor = '#ff6b35';
      fileInputWrapper.style.backgroundColor = 'rgba(255, 107, 53, 0.08)';
    });
    
    fileInputWrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      fileInputWrapper.style.borderColor = '#ff6b35';
      fileInputWrapper.style.backgroundColor = 'rgba(255, 107, 53, 0.08)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    fileInputWrapper.addEventListener('mouseover', () => {
      fileInputWrapper.style.borderColor = '#ff8a50';
      fileInputWrapper.style.backgroundColor = 'rgba(255, 107, 53, 0.12)';
    });
    
    fileInputWrapper.addEventListener('mouseout', () => {
      fileInputWrapper.style.borderColor = '#ff6b35';
      fileInputWrapper.style.backgroundColor = 'rgba(255, 107, 53, 0.08)';
    });
    
    // Image preview
    const img = document.createElement('img');
    img.style.maxWidth = '100%';
    img.style.maxHeight = '200px';
    img.style.borderRadius = '8px';
    img.style.border = '2px solid #e5e5e5';
    img.style.objectFit = 'cover';
    img.style.display = (s.image) ? 'block' : 'none';
    img.style.backgroundColor = '#f5f5f5';
    if (s.image) {
      img.src = s.image;
    }
    
    // Clear image button
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = '🗑️ Quitar imagen';
    clearBtn.style.fontSize = '12px';
    clearBtn.style.padding = '6px 12px';
    clearBtn.style.background = '#ef4444';
    clearBtn.style.color = 'white';
    clearBtn.style.border = 'none';
    clearBtn.style.borderRadius = '6px';
    clearBtn.style.cursor = 'pointer';
    clearBtn.style.alignSelf = 'flex-start';
    clearBtn.style.display = (s.image) ? 'inline-block' : 'none';
    clearBtn.addEventListener('click', () => {
      img.style.display = 'none';
      clearBtn.style.display = 'none';
      fileInput.value = '';
      fileInput.dataset.dataurl = '';
    });
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. M�ximo 5MB.');
        fileInput.value = '';
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result;
        img.style.display = 'block';
        clearBtn.style.display = 'inline-block';
        fileInput.dataset.dataurl = reader.result;
      };
      reader.readAsDataURL(file);
    });
    
    imageContainer.appendChild(imageLabel);
    imageContainer.appendChild(fileInputWrapper);
    imageContainer.appendChild(img);
    imageContainer.appendChild(clearBtn);
    row.appendChild(imageContainer);
    
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
    const titleInput = row.querySelector('input[type="text"]');
    const contentTextarea = row.querySelector('textarea');
    const fileInput = row.querySelector('input[type="file"]');
    const imgElement = row.querySelector('img');
    
    return {
      title: (titleInput && titleInput.value) || '',
      content: (contentTextarea && contentTextarea.value) || '',
      image: (fileInput && fileInput.dataset.dataurl) || (imgElement && imgElement.src && imgElement.style.display !== 'none' ? imgElement.src : '') || ''
    };
  });
}

function collectStepsFromEditor(){
  return getEditorStepsArray();
}

// Versioning system removed - all data persists in database

function exportCurrentManual(){
  if(!STATE.current) return;
  const data = JSON.stringify(STATE.current, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${STATE.current.id}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Admin: create new manual (clean, consolidated implementation)
function openNewManualModal(){
  try {
    console.debug('[openNewManualModal] ===== ABRIENDO MODAL =====');
    
    // Check permissions
    if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
      alert('Solo administradores pueden crear manuales'); 
      return; 
    }
    
    // Get modal
    const modal = document.getElementById('newManualModal');
    if(!modal) {
      console.error('[openNewManualModal] Modal NO ENCONTRADO');
      return;
    }
    
    // Get form elements
    const titleEl = document.getElementById('newTitle');
    const catSelectEl = document.getElementById('newCategorySelect');
    const catNameEl = document.getElementById('newCategoryName');
    const verEl = document.getElementById('newVersion');
    const summEl = document.getElementById('newSummary');
    const editorEl = document.getElementById('newStepsEditor');
    
    // Reset form fields
    if(titleEl) titleEl.value = '';
    if(catNameEl) catNameEl.value = '';
    if(verEl) verEl.value = '1.0.0';
    if(summEl) summEl.value = '';
    
    // Populate categories dropdown
    if(catSelectEl) {
      catSelectEl.innerHTML = '<option value="">-- Selecciona una categor�a existente --</option>';
      const cats = listCategories(STATE.manuals);
      cats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSelectEl.appendChild(opt);
      });
      console.log('[openNewManualModal] Categor�as cargadas:', cats);
    }
    
    // Clear editor
    if(editorEl) {
      editorEl.innerHTML = '';
      editorEl.style.display = 'flex';
      editorEl.style.flexDirection = 'column';
    }
    
    // Add first empty step
    createStepEditorRow();
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Focus on title input
    if(titleEl) titleEl.focus();
    
    console.debug('[openNewManualModal] ? Modal abierto correctamente');
    
  } catch(err) {
    console.error('[openNewManualModal] ERROR:', err);
    alert(`Error al abrir modal: ${err.message}`);
  }
}

function createStepEditorRow(step = null) {
  const editor = document.getElementById('newStepsEditor');
  if(!editor) {
    console.error('[createStepEditorRow] Editor not found');
    return;
  }

  // Create container
  const row = document.createElement('div');
  row.className = 'step-editor-row panel';
  row.style.display = 'flex';
  row.style.flexDirection = 'column';
  row.style.gap = '20px';
  row.style.padding = '28px';
  row.style.borderLeft = '5px solid #ff6b35';
  row.style.backgroundColor = '#fafafa';
  row.style.borderRadius = '12px';
  row.style.marginBottom = '20px';

  // Step number indicator
  const stepNum = editor.querySelectorAll('.step-editor-row').length + 1;
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.paddingBottom = '12px';
  header.style.borderBottom = '2px solid #e5e5e5';

  const stepLabel = document.createElement('label');
  stepLabel.style.fontSize = '16px';
  stepLabel.style.fontWeight = '700';
  stepLabel.style.color = '#ff6b35';
  stepLabel.textContent = `PASO ${stepNum}`;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'secondary';
  removeBtn.style.padding = '8px 16px';
  removeBtn.style.fontSize = '13px';
  removeBtn.style.background = '#ef4444';
  removeBtn.style.color = 'white';
  removeBtn.style.border = 'none';
  removeBtn.style.borderRadius = '8px';
  removeBtn.style.cursor = 'pointer';
  removeBtn.style.transition = 'all 0.2s ease';
  removeBtn.textContent = '🗑️ Eliminar paso';
  removeBtn.addEventListener('click', () => {
    row.remove();
    console.log('[createStepEditorRow] Paso eliminado');
  });
  removeBtn.addEventListener('mouseover', () => {
    removeBtn.style.background = '#dc2626';
    removeBtn.style.transform = 'scale(1.02)';
  });
  removeBtn.addEventListener('mouseout', () => {
    removeBtn.style.background = '#ef4444';
    removeBtn.style.transform = 'scale(1)';
  });

  header.appendChild(stepLabel);
  header.appendChild(removeBtn);
  row.appendChild(header);

  // Title section
  const titleSection = document.createElement('div');
  titleSection.style.display = 'flex';
  titleSection.style.flexDirection = 'column';
  titleSection.style.gap = '8px';

  const titleLabel = document.createElement('label');
  titleLabel.style.fontSize = '13px';
  titleLabel.style.fontWeight = '700';
  titleLabel.style.color = 'var(--cw-text)';
  titleLabel.textContent = 'T�tulo del paso';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'input-field';
  titleInput.placeholder = 'ej. Conectar router a la corriente el�ctrica';
  titleInput.dataset.stepTitle = 'true';
  titleInput.value = (step && step.title) || '';
  titleInput.style.height = '40px';
  titleInput.style.width = '100%';
  titleInput.style.fontSize = '14px';
  titleInput.style.borderRadius = '8px';
  titleInput.style.border = '2px solid #e5e5e5';
  titleInput.style.padding = '10px 14px';
  titleInput.style.transition = 'all 0.2s ease';

  titleInput.addEventListener('focus', () => {
    titleInput.style.borderColor = '#ff6b35';
    titleInput.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
  });
  titleInput.addEventListener('blur', () => {
    titleInput.style.borderColor = '#e5e5e5';
    titleInput.style.boxShadow = 'none';
  });

  titleSection.appendChild(titleLabel);
  titleSection.appendChild(titleInput);
  row.appendChild(titleSection);

  // Content section
  const contentSection = document.createElement('div');
  contentSection.style.display = 'flex';
  contentSection.style.flexDirection = 'column';
  contentSection.style.gap = '8px';

  const contentLabel = document.createElement('label');
  contentLabel.style.fontSize = '13px';
  contentLabel.style.fontWeight = '700';
  contentLabel.style.color = 'var(--cw-text)';
  contentLabel.textContent = 'Explicaci�n detallada del paso';

  const contentInput = document.createElement('textarea');
  contentInput.className = 'input-field';
  contentInput.placeholder = 'Escribe aquí la explicación completa y detallada de este paso. Incluye todos los detalles importantes...';
  contentInput.dataset.stepContent = 'true';
  contentInput.style.minHeight = '180px';
  contentInput.style.maxHeight = '400px';
  contentInput.style.resize = 'vertical';
  contentInput.style.fontSize = '14px';
  contentInput.style.lineHeight = '1.7';
  contentInput.style.padding = '14px';
  contentInput.style.fontFamily = 'inherit';
  contentInput.style.width = '100%';
  contentInput.style.borderRadius = '8px';
  contentInput.style.border = '2px solid #e5e5e5';
  contentInput.style.transition = 'all 0.2s ease';
  contentInput.style.boxSizing = 'border-box';
  contentInput.value = (step && step.content) || '';

  contentInput.addEventListener('focus', () => {
    contentInput.style.borderColor = '#ff6b35';
    contentInput.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
  });
  contentInput.addEventListener('blur', () => {
    contentInput.style.borderColor = '#e5e5e5';
    contentInput.style.boxShadow = 'none';
  });

  contentSection.appendChild(contentLabel);
  contentSection.appendChild(contentInput);
  row.appendChild(contentSection);

  // Image section
  const imageSection = document.createElement('div');
  imageSection.style.display = 'flex';
  imageSection.style.flexDirection = 'column';
  imageSection.style.gap = '10px';

  const imageLabel = document.createElement('label');
  imageLabel.style.fontSize = '13px';
  imageLabel.style.fontWeight = '700';
  imageLabel.style.color = 'var(--cw-text)';
  imageLabel.textContent = '🖼️ Agregar imagen ilustrativa (opcional)';

  // Hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.dataset.stepImage = 'true';
  fileInput.style.display = 'none';

  // Custom file input wrapper (visible label)
  const fileInputWrapper = document.createElement('label');
  fileInputWrapper.style.display = 'flex';
  fileInputWrapper.style.alignItems = 'center';
  fileInputWrapper.style.justifyContent = 'center';
  fileInputWrapper.style.padding = '16px 14px';
  fileInputWrapper.style.border = '2px dashed #ff6b35';
  fileInputWrapper.style.borderRadius = '10px';
  fileInputWrapper.style.cursor = 'pointer';
  fileInputWrapper.style.transition = 'all 0.2s ease';
  fileInputWrapper.style.backgroundColor = 'rgba(255, 107, 53, 0.08)';
  fileInputWrapper.style.minHeight = '56px';

  const fileInputText = document.createElement('span');
  fileInputText.style.fontSize = '14px';
  fileInputText.style.color = '#ff6b35';
  fileInputText.style.fontWeight = '600';
  fileInputText.style.userSelect = 'none';
  fileInputText.textContent = '⬆️ Seleccionar imagen o arrastrar aquí';

  fileInputWrapper.appendChild(fileInput);
  fileInputWrapper.appendChild(fileInputText);

  fileInputWrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileInputWrapper.style.borderColor = '#ff8a50';
    fileInputWrapper.style.backgroundColor = 'rgba(255, 107, 53, 0.15)';
  });

  fileInputWrapper.addEventListener('dragleave', () => {
    fileInputWrapper.style.borderColor = '#ff6b35';
    fileInputWrapper.style.backgroundColor = 'rgba(255, 107, 53, 0.08)';
  });

  fileInputWrapper.addEventListener('drop', (e) => {
    e.preventDefault();
    fileInputWrapper.style.borderColor = '#ff6b35';
    fileInputWrapper.style.backgroundColor = 'rgba(255, 107, 53, 0.08)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  fileInputWrapper.addEventListener('mouseover', () => {
    fileInputWrapper.style.borderColor = '#ff8a50';
    fileInputWrapper.style.backgroundColor = 'rgba(255, 107, 53, 0.12)';
  });

  fileInputWrapper.addEventListener('mouseout', () => {
    fileInputWrapper.style.borderColor = '#ff6b35';
    fileInputWrapper.style.backgroundColor = 'rgba(255, 107, 53, 0.08)';
  });

  // Preview section
  const previewSection = document.createElement('div');
  previewSection.style.display = 'flex';
  previewSection.style.flexDirection = 'column';
  previewSection.style.alignItems = 'center';
  previewSection.style.gap = '10px';
  previewSection.style.marginTop = '8px';

  const img = document.createElement('img');
  img.style.maxWidth = '100%';
  img.style.maxHeight = '250px';
  img.style.borderRadius = '10px';
  img.style.border = '2px solid #e5e5e5';
  img.style.objectFit = 'cover';
  img.style.display = (step && step.image) ? 'block' : 'none';
  img.style.backgroundColor = '#f5f5f5';
  if (step && step.image) {
    img.src = step.image;
    fileInput.dataset.dataurl = step.image;
  }

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'secondary';
  clearBtn.style.fontSize = '12px';
  clearBtn.style.padding = '8px 16px';
  clearBtn.style.background = '#ef4444';
  clearBtn.style.color = 'white';
  clearBtn.style.border = 'none';
  clearBtn.style.borderRadius = '6px';
  clearBtn.style.cursor = 'pointer';
  clearBtn.style.transition = 'all 0.2s ease';
  clearBtn.textContent = '🗑️ Quitar imagen';
  clearBtn.style.display = (step && step.image) ? 'inline-block' : 'none';
  clearBtn.addEventListener('click', () => {
    img.style.display = 'none';
    clearBtn.style.display = 'none';
    fileInput.value = '';
    fileInput.dataset.dataurl = '';
  });

  previewSection.appendChild(img);
  previewSection.appendChild(clearBtn);

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. M�ximo 5MB.');
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      img.style.display = 'block';
      clearBtn.style.display = 'inline-block';
      fileInput.dataset.dataurl = reader.result;
      console.log('[createStepEditorRow] Imagen cargada');
    };
    reader.readAsDataURL(file);
  });

  imageSection.appendChild(imageLabel);
  imageSection.appendChild(fileInputWrapper);
  imageSection.appendChild(previewSection);
  row.appendChild(imageSection);

  // Add to editor
  editor.appendChild(row);
  console.log(`[createStepEditorRow] Paso ${stepNum} creado`);
}

function collectStepsFromNewEditor() {
  const editor = document.getElementById('newStepsEditor');
  if (!editor) {
    console.warn('[collectStepsFromNewEditor] Editor not found');
    return [];
  }

  const out = [];
  const rows = editor.querySelectorAll('.step-editor-row');

  if (rows.length === 0) {
    console.warn('[collectStepsFromNewEditor] No steps found');
    return [];
  }

  Array.from(rows).forEach((row, idx) => {
    const titleInput = row.querySelector('[data-stepTitle]');
    const contentInput = row.querySelector('[data-stepContent]');
    const imageInput = row.querySelector('[data-stepImage]');

    const title = titleInput?.value?.trim() || `Paso ${idx + 1}`;
    const content = contentInput?.value?.trim() || '';
    const image = imageInput?.dataset?.dataurl || null;

    // Only add if there's content
    if (content.length > 0) {
      out.push({
        title: title,
        content: `<p>${escapeHtml(content)}</p>`,
        image: image
      });
    }
  });

  console.log(`[collectStepsFromNewEditor] ${out.length} pasos recolectados`);
  return out;
}

async function saveNewManual(){
  try {
    console.debug('[saveNewManual] ===== INICIANDO GUARDADO =====');
    
    // Check auth
    if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
      alert('Solo administradores pueden crear manuales'); 
      return; 
    }
    
    // Get form elements
    const titleEl = document.getElementById('newTitle');
    const catSelectEl = document.getElementById('newCategorySelect');
    const catNameEl = document.getElementById('newCategoryName');
    const verEl = document.getElementById('newVersion');
    const summEl = document.getElementById('newSummary');
    
    // Get values
    const title = titleEl?.value?.trim() || '';
    const version = verEl?.value?.trim() || '1.0.0';
    const summary = summEl?.value?.trim() || '';
    
    // Get category - prioritize custom name, then dropdown, then default
    let category = 'General';
    if(catNameEl?.value?.trim()) {
      category = catNameEl.value.trim();
    } else if(catSelectEl?.value) {
      category = catSelectEl.value;
    }
    
    console.log('[saveNewManual] Datos extra�dos:', { title, category, version, summary });
    
    // Validate required field
    if(!title) {
      alert('⚠️  El título del manual es obligatorio');
      titleEl?.focus();
      return;
    }
    
    // Collect steps
    const steps = collectStepsFromNewEditor();
    console.log('[saveNewManual] Pasos recolectados:', steps.length);
    
    if(steps.length === 0) {
      alert('⚠️  Debes agregar al menos un paso al manual');
      return;
    }
    
    // Ensure category exists
    const allCategories = getAllCategories();
    if(!allCategories.includes(category)) {
      const cats = JSON.parse(localStorage.getItem('cw:categories') || '[]');
      if(!cats.includes(category)) {
        cats.push(category);
        localStorage.setItem('cw:categories', JSON.stringify(cats));
        console.log('[saveNewManual] Nueva categor�a creada:', category);
      }
    }
    
    // Create manual object
    const id = 'custom-' + Date.now();
    const manual = {
      id,
      title,
      category,
      version,
      summary: summary || `Manual con ${steps.length} pasos`,
      steps,
      versions: [{
        version,
        note: 'Creado inicialmente',
        date: new Date().toISOString(),
        snapshot: { title, summary, steps }
      }]
    };
    
    console.log('[saveNewManual] Manual creado:', manual);
    
    // === GUARDAR EN LA BASE DE DATOS ===
    const savedManual = await api.createManual(manual);
    if(!savedManual) {
      alert('⚠️  Error al guardar en la base de datos. Intenta de nuevo.');
      return;
    }
    console.log('[saveNewManual] ? Manual guardado en BD:', savedManual);
    
    // Update manual ID if backend assigned a new one
    if(savedManual.id && savedManual.id !== id) {
      manual.id = savedManual.id;
    }
    
    // Save to local storage
    const customs = JSON.parse(localStorage.getItem('cw:manualsCustom') || '[]');
    customs.push(manual);
    localStorage.setItem('cw:manualsCustom', JSON.stringify(customs));
    
    // Update STATE
    STATE.manuals.push(manual);
    console.log('[saveNewManual] Manual agregado a STATE. Total manuales:', STATE.manuals.length);
    
    // Close modal
    const modal = document.getElementById('newManualModal');
    if(modal) {
      modal.classList.add('hidden');
    }
    
    // Refresh UI
    const allCats = listCategories(STATE.manuals);
    console.log('[saveNewManual] Categor�as a renderizar:', allCats);
    renderManualsList(STATE.manuals, allCats);
    
    // Success message
    console.log('[saveNewManual] ? Manual guardado correctamente');
    alert(`? Manual "${title}" creado con �xito en la categor�a "${category}"\n\n${steps.length} paso${steps.length !== 1 ? 's' : ''} agregado${steps.length !== 1 ? 's' : ''}`);
    
  } catch(err) {
    console.error('[saveNewManual] ERROR:', err);
    alert(`Error al guardar manual: ${err.message}`);
  }
}

// Get all categories from manuals
function getAllCategories(){
  const categories = [...new Set(STATE.manuals.map(m => m.category))];
  return categories.sort();
}

// Open category management modal
function openCategoryManager(){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){
    showToast('Solo administradores pueden gestionar categor�as', 'warning');
    return;
  }
  
  const modal = els.editCategoryModal;
  if(!modal) return;
  
  // Populate categories list
  renderCategoriesList();
  
  // Populate select for changing manual category
  const select = els.changeManualCategorySelect;
  if(select && STATE.current){
    select.innerHTML = '<option value="">-- Seleccionar categor�a --</option>';
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
    deleteBtn.textContent = '🗑️';
    deleteBtn.style.padding = '6px 10px';
    deleteBtn.onclick = () => {
      if(confirm(`�Eliminar categor�a "${cat}" y mover sus manuales a "General"?`)){
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
    showToast('Nombre de categor�a vac�o', 'warning');
    return;
  }
  
  if(getAllCategories().includes(categoryName.trim())){
    showToast('La categor�a ya existe', 'warning');
    return;
  }
  
  // Category will be created when first manual is saved to it
  showToast(`Categor�a "${categoryName}" lista para usar`, 'success');
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
  const allCats4 = listCategories(STATE.manuals);
  renderManualsList(STATE.manuals, allCats4);
  showToast(`Categor�a eliminada. Manuales movidos a "General"`, 'info');
}

// Change current manual's category
function changeManualCategory(newCategory){
  if(!STATE.current){
    showToast('No hay manual seleccionado', 'warning');
    return;
  }
  
  if(!newCategory || newCategory.trim() === ''){
    showToast('Selecciona una categor�a', 'warning');
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
  
  const allCats5 = listCategories(STATE.manuals);
  renderManualsList(STATE.manuals, allCats5);
  showToast(`Manual movido a "${newCategory}"`, 'success');
}

// Parse PDF text into manual structure
// Pre-fill the new manual modal with parsed data
function prefillNewManualModal(parsedManual){
  const modal = document.getElementById('newManualModal');
  if(!modal) return;
  
  const titleEl = document.getElementById('newTitle');
  const catSelect = document.getElementById('newCategorySelect');
  const typeEl = document.getElementById('newType');
  const stepsEditor = document.getElementById('newStepsEditor');
  
  if(titleEl) titleEl.value = parsedManual.title;
  if(catSelect) catSelect.value = parsedManual.category;
  if(typeEl) typeEl.value = parsedManual.type;
  
  // Store parsed manual data for reference
  modal._parsedManual = parsedManual;
  
  // Show the modal
  modal.classList.remove('hidden');
}

async function importPdfManual(file){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
    alert('Solo administradores pueden importar manuales');
    return; 
  }
  
  if(!file || !file.type.includes('pdf')) { 
    alert('Por favor selecciona un archivo PDF v�lido');
    return; 
  }
  
  try {
    // Check if PDF.js is available
    if(typeof pdfjsLib === 'undefined') {
      // Fallback: Ask user to copy-paste content instead
      const content = prompt('PDF.js no está disponible.\n\nPor favor, copia y pega el contenido del PDF aquí:');
      if(!content || !content.trim()) return;
      
      // Create manual from pasted content
      createManualFromText(content, file.name);
      return;
    }
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse PDF using pdf.js
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    let fullText = '';
    
    console.log('[importPdfManual] PDF cargado, pages:', pdf.numPages);
    
    // Extract text from all pages
    for(let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      } catch(pageErr) {
        console.warn('[importPdfManual] Error en p�gina', i, pageErr);
      }
    }
    
    if(!fullText.trim()) {
      alert('No se pudo extraer texto del PDF. El archivo podr�a estar vac�o o protegido.');
      return;
    }
    
    console.log('[importPdfManual] Texto extra�do, longitud:', fullText.length);
    
    // Create manual from extracted text
    createManualFromText(fullText, file.name);
    
  } catch(err) {
    console.error('[importPdfManual] Error:', err);
    alert(`Error al procesar PDF: ${err.message}\n\nIntenta copiar y pegar el contenido manualmente.`);
  }
}

// Helper function to create manual from text content - IMPROVED PARSING
function createManualFromText(text, filename) {
  try {
    // Ensure 'Importados' category exists
    const categories = getAllCategories();
    if(!categories.includes('Importados')) {
      const cats = JSON.parse(localStorage.getItem('cw:categories') || '[]');
      cats.push('Importados');
      localStorage.setItem('cw:categories', JSON.stringify(cats));
      console.log('[createManualFromText] Categor�a "Importados" creada');
    }
    
    // Generate title - extract first line or use default
    const lines = text.split('\n');
    let titleText = lines[0]?.trim();
    if(!titleText || titleText.length < 5) {
      const importedCount = STATE.manuals.filter(m => m.category === 'Importados').length;
      titleText = `Importado ${importedCount + 1}`;
    }
    
    // Advanced text parsing to detect natural step boundaries
    const steps = parseTextIntoSteps(text);
    
    if(steps.length === 0) {
      alert('El contenido est� vac�o o no se pudo procesar');
      return;
    }
    
    // Create the manual
    const id = 'custom-' + Date.now();
    const manual = {
      id,
      title: titleText,
      category: 'Importados',
      version: '1.0.0',
      summary: `Importado de: ${filename} | ${steps.length} pasos`,
      steps: steps,
      versions: [{
        version: '1.0.0',
        note: `Importado desde: ${filename}`,
        date: new Date().toISOString()
      }]
    };
    
    // Save to localStorage and STATE
    const customs = JSON.parse(localStorage.getItem('cw:manualsCustom') || '[]');
    customs.push(manual);
    localStorage.setItem('cw:manualsCustom', JSON.stringify(customs));
    STATE.manuals.push(manual);
    
    // Refresh list with all categories
    const allCategories = listCategories(STATE.manuals);
    renderManualsList(STATE.manuals, allCategories);
    
    console.log('[createManualFromText] ? Manual creado:', manual.id, 'con', steps.length, 'pasos');
    alert(`? Manual "${titleText}" creado con ${steps.length} pasos\n\nEl contenido se organiz� autom�ticamente en pasos.`);
    
  } catch(err) {
    console.error('[createManualFromText] Error:', err);
    alert(`Error al crear manual: ${err.message}`);
  }
}

// Smart text parser that detects natural step boundaries - IMPROVED VERSION
function parseTextIntoSteps(text) {
  // Remove extra whitespace and normalize
  let cleanText = text.trim();
  
  if(!cleanText || cleanText.length < 10) {
    console.warn('[parseTextIntoSteps] Texto muy corto o vac�o');
    return [];
  }
  
  let rawSteps = [];
  
  // Pattern 1: Explicit step markers (Paso 1:, Step 1:, 1., 1), etc.)
  const stepMarkerPattern = /^[\s]*(?:paso|step|etapa|fase|instrucci�n|procedimiento|punto|num|n�|n�|#)[\s]*[\d]+[\s]*[:\.\)\-]?/im;
  
  // Pattern 2: Numbered points (1. 2. 3. or 1) 2) 3) etc)
  const numberedPattern = /^[\s]*[\d]+[\s]*[\.\)\-]/m;
  
  // Pattern 3: Bullet points (-, �, *, etc)
  const bulletPattern = /^[\s]*[-�*???][\s]/m;
  
  // Pattern 4: Double line breaks (natural paragraph separation)
  const doubleLineBreak = /\n\n+/;
  
  console.log('[parseTextIntoSteps] Intentando detectar pasos...');
  
  // First try: split by explicit step markers
  if(stepMarkerPattern.test(cleanText)) {
    console.log('[parseTextIntoSteps] Detectado: marcadores de pasos expl�citos');
    rawSteps = cleanText.split(/(?=^[\s]*(?:paso|step|etapa|fase|instrucci�n|procedimiento|punto|num|n�|n�|#)[\s]*[\d]+[\s]*[:\.\)\-]?)/im)
      .filter(s => s.trim().length > 0);
  }
  
  // Second try: split by numbered points
  else if(numberedPattern.test(cleanText)) {
    console.log('[parseTextIntoSteps] Detectado: puntos numerados');
    rawSteps = cleanText.split(/\n(?=[\d]+[\.\)\-])/)
      .filter(s => s.trim().length > 0);
  }
  
  // Third try: split by bullet points
  else if(bulletPattern.test(cleanText)) {
    console.log('[parseTextIntoSteps] Detectado: vi�etas');
    rawSteps = cleanText.split(/\n(?=[-�*???]\s)/)
      .filter(s => s.trim().length > 0);
  }
  
  // Fourth try: split by double line breaks (paragraphs)
  else if(doubleLineBreak.test(cleanText)) {
    console.log('[parseTextIntoSteps] Detectado: p�rrafos separados');
    rawSteps = cleanText.split(doubleLineBreak)
      .filter(s => s.trim().length > 0);
  }
  
  // Fifth try: split by single line breaks
  else {
    const singleBreakSplit = cleanText.split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if(singleBreakSplit.length > 3) {
      console.log('[parseTextIntoSteps] Detectado: l�neas separadas');
      rawSteps = singleBreakSplit;
    }
  }
  
  // If still no good split, use smart sentence-based split
  if(rawSteps.length < 2) {
    console.log('[parseTextIntoSteps] Usando split inteligente por longitud');
    rawSteps = smartSplitByLength(cleanText);
  }
  
  // Last resort: use entire text as one step
  if(rawSteps.length === 0) {
    console.log('[parseTextIntoSteps] Fallback: usando todo el texto como un paso');
    rawSteps = [cleanText];
  }
  
  console.log(`[parseTextIntoSteps] ${rawSteps.length} pasos detectados`);
  
  // Convert raw steps into step objects with smart titles
  const steps = [];
  rawSteps.forEach((stepText, idx) => {
    const trimmed = stepText.trim();
    if(!trimmed) return;
    
    const lines = trimmed.split('\n');
    
    // Extract title from first line
    let title = lines[0]?.trim() || '';
    
    // Remove step markers from title
    title = title.replace(/^[\s]*(?:paso|step|etapa|fase|instrucci�n|procedimiento|punto|num|n�|n�|#)[\s]*[\d]*[\s]*[:\.\)\-]?/i, '').trim();
    title = title.replace(/^[\d]+[\.\)\-\s]+/, '').trim();
    title = title.replace(/^[-�*???]\s+/, '').trim();
    
    // Validate and clean title
    if(!title || title.length > 120) {
      title = `Paso ${steps.length + 1}`;
    }
    
    // Build content
    let content = trimmed;
    
    // Remove title from content if it's duplicated
    if(lines.length > 1) {
      const firstLineCleaned = lines[0]
        .replace(/^[\s]*(?:paso|step|etapa|fase|instrucci�n|procedimiento|punto|num|n�|n�|#)[\s]*[\d]*[\s]*[:\.\)\-]?/i, '')
        .replace(/^[\d]+[\.\)\-\s]+/, '')
        .replace(/^[-�*???]\s+/, '')
        .trim();
      
      if(firstLineCleaned && firstLineCleaned.length > 3 && title === firstLineCleaned) {
        content = lines.slice(1).join('\n').trim();
      }
    }
    
    // Format as HTML
    const htmlContent = content
      .split('\n\n')
      .map(p => {
        const text = p.trim();
        return text ? `<p>${escapeHtml(text)}</p>` : '';
      })
      .filter(p => p)
      .join('');
    
    if(!htmlContent || htmlContent.length < 5) {
      console.warn(`[parseTextIntoSteps] Paso ${idx} ignorado: contenido vac�o`);
      return;
    }
    
    steps.push({
      title: title,
      content: htmlContent || `<p>${escapeHtml(content)}</p>`,
      image: null
    });
  });
  
  console.log(`[parseTextIntoSteps] ? ${steps.length} pasos v�lidos creados`);
  return steps;
}

// Smart splitting by sentence/length for unstructured text
function smartSplitByLength(text) {
  // Split by sentences (periods, exclamation marks, question marks)
  const sentences = text.match(/[^.!?]*[.!?]+/g) || [text];
  const steps = [];
  let currentStep = '';
  
  sentences.forEach((sentence, idx) => {
    const sent = sentence.trim();
    if(!sent || sent.length < 3) return;
    
    // Add sentence to current step
    currentStep += (currentStep ? ' ' : '') + sent;
    
    // Create new step if current one is long enough OR it's the last sentence
    const isLongEnough = currentStep.length > 250;
    const isLastSentence = idx === sentences.length - 1;
    
    if(isLongEnough || isLastSentence) {
      if(currentStep.length > 15) {
        steps.push(currentStep.trim());
      }
      currentStep = '';
    }
  });
  
  console.log(`[smartSplitByLength] ${steps.length} pasos creados por longitud`);
  return steps.filter(s => s && s.length > 10);
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
      <button class="close" aria-label="Cerrar" style="position:absolute;top:12px;right:12px">?</button>
      <h4 style="margin:0 0 16px">Selecciona un manual para exportar</h4>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto">
        ${STATE.manuals.map((m, idx) => `
          <button type="button" data-idx="${idx}" style="text-align:left;padding:12px;border:1px solid var(--cw-border);border-radius:8px;background:transparent;cursor:pointer;transition:all 0.2s;font-size:14px">
            <strong>${escapeHtml(m.title)}</strong>
            <div style="font-size:12px;color:var(--cw-text-muted);margin-top:4px">${escapeHtml(m.category)} � v${m.version}</div>
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
        pushNotification({title:'PDF importado', text: 'Contenido extra�do y modal abierto para edici�n.'});
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
            alert('Archivo JSON inv�lido o vac�o');
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
          const allCats6 = listCategories(STATE.manuals);
          renderManualsList(STATE.manuals, allCats6);
          pushNotification({title:'Importaci�n completada', text: `${arr.length} manual(es) importado(s)`});
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
            <div>?? ${tree.createdAt ? new Date(tree.createdAt).toLocaleDateString('es-ES') : 'Sin fecha'}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="view-diagram" data-idx="${idx}" style="padding:10px 16px;border:none;background:linear-gradient(135deg, var(--cw-primary), var(--cw-secondary));color:white;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;transition:all 0.2s">? Ver �rbol</button>
          <button class="edit-diagram" data-idx="${idx}" style="padding:10px 16px;border:1px solid var(--cw-border);background:var(--cw-surface);color:var(--cw-text);border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;transition:all 0.2s">? Editar</button>
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
        html += `<div style="margin-bottom:16px;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)"><img src="${node.image}" style="width:100%;max-height:300px;object-fit:cover" alt="Soluci�n"></div>`;
      }
      
      // Parse solution text with special formatting
      const lines = node.text.split('\n').filter(l => l.trim());
      let title = lines[0] || 'Soluci�n';
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
      const path = els.diagramViewerModal._visitedPath.map(p => `<span class="tree-breadcrumb-item">${escapeHtml(p)}</span>`).join('<span class="tree-breadcrumb-separator">?</span>');
      pathDisplay.innerHTML = `<span class="tree-breadcrumb-item">INICIO</span><span class="tree-breadcrumb-separator">?</span>${path}`;
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
        text: '�Tu pregunta principal?',
        depth: 0,
        options: [
          {id: 'opt-1a', label: 'Opci�n A', nextNodeId: 'sol-1'},
          {id: 'opt-1b', label: 'Opci�n B', nextNodeId: 'sol-2'}
        ]
      },
      'sol-1': {
        id: 'sol-1',
        type: 'solution',
        depth: 1,
        text: '? SOLUCI�N:\nSoluci�n para la opci�n A'
      },
      'sol-2': {
        id: 'sol-2',
        type: 'solution',
        depth: 1,
        text: '? SOLUCI�N:\nSoluci�n para la opci�n B'
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
  if(treeDepthEl) treeDepthEl.textContent = `Profundidad m�x: ${maxDepth}`;
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
    badge.textContent = node.type === 'question' ? 'Pregunta' : 'Soluci�n';
    
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
    editBtn.textContent = '? Editar';
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
        showToast('Imagen a�adida', 'success');
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
          {id: 'opt-' + Date.now(), label: 'Opci�n 1', nextNodeId: null}
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
        label: `Opci�n ${node.options.length + 1}`,
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
            node.options[idx].label = inp.value.trim() || `Opci�n ${idx + 1}`;
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
    optionsList.innerHTML = '<p style="font-size:13px;color:var(--cw-text-muted);margin:0">Sin opciones a�n. Haz clic en "+ A�adir opci�n" para crear una.</p>';
    return;
  }
  
  node.options.forEach((opt, idx) => {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;padding:12px;background:var(--cw-surface);border-radius:8px;border:1px solid var(--cw-border)';
    
    const label = document.createElement('input');
    label.type = 'text';
    label.className = 'input-field';
    label.value = opt.label || '';
    label.placeholder = `Opci�n ${idx + 1}`;
    label.style.flex = '1';
    label.addEventListener('change', () => {
      opt.label = label.value.trim() || `Opci�n ${idx + 1}`;
    });
    
    const createNodeBtn = document.createElement('button');
    createNodeBtn.type = 'button';
    createNodeBtn.className = 'secondary small-btn';
    createNodeBtn.textContent = opt.nextNodeId ? '? Asignado' : '+ Crear nodo';
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
        showToast('Ya hay un nodo asignado a esta opci�n. Ed�talo directamente.', 'info');
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
      createNodeBtn.textContent = '? Asignado';
      createNodeBtn.style.background = '#10b981';
      
      renderDiagramEditorTree();
      showToast('Nodo hijo creado. Ed�talo para personalizar.', 'success');
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'secondary small-btn';
    deleteBtn.textContent = '??';
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
      showToast('Pregunta a�adida - Haz clic en "Editar" para a�adir opciones', 'success');
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
        text: 'Nueva soluci�n'
      };
      
      addNodeModal.classList.add('hidden');
      renderDiagramEditorTree();
      showToast('Soluci�n a�adida', 'success');
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
    showToast('El �rbol debe tener al menos un nodo', 'warning');
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
  showToast('�rbol guardado correctamente', 'success');
}

function deleteDiagram(){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
    showToast('Solo administradores pueden eliminar', 'warning');
    return; 
  }
  const idx = els.diagramModal && els.diagramModal._editingIdx;
  if(idx === undefined || !confirm('�Eliminar este �rbol de decisiones?')) return;
  STATE.diagrams.splice(idx, 1);
  localStorage.setItem('cw:diagrams', JSON.stringify(STATE.diagrams));
  renderDiagrams();
  if(els.diagramModal) els.diagramModal.classList.add('hidden');
  showToast('�rbol eliminado', 'info');
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
    success: '?',
    error: '?',
    warning: '?',
    info: '?'
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

// Final initialization on DOM ready
document.addEventListener('DOMContentLoaded', ()=> {
  // === LIMPIAR HASH AL RECARGAR ===
  // Siempre vuelve a localhost:3000 sin hash
  if(window.location.hash) {
    window.history.replaceState(null, null, window.location.pathname);
  }
  
  init().catch(err => console.error('Initialization error:', err));
  
  const welcome = document.getElementById('welcome');
  if(welcome) {
    welcome.classList.remove('hidden');
    console.debug('[DOMContentLoaded] ? Dashboard visible');
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

// expose small helpers for debugging if needed
window.CW = {STATE};


