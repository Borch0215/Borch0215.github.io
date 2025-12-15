// app.js - main application wiring
// Uses ES modules with backend API for all data persistence

import { findManualById, listCategories, listRoles, listTypes, listSuggestions, searchAdvanced } from './dataService.js';
import { setupSearch } from './search-clean.js';
import { api } from './apiClient.js';

const STATE = {
  manuals: [],
  current: null,
  progress: JSON.parse(localStorage.getItem('cw:progress')||'{}'),
  comments: JSON.parse(localStorage.getItem('cw:comments')||'{}'),
  history: JSON.parse(localStorage.getItem('cw:history')||'[]'),
  lastSeenVersion: JSON.parse(localStorage.getItem('cw:versions')||'{}'),
  agentMode: false,
  darkMode: JSON.parse(localStorage.getItem('cw:darkMode')||'false'),
  fontSize: parseInt(localStorage.getItem('cw:fontSize')||'15'),
  notifEnabled: JSON.parse(localStorage.getItem('cw:notifEnabled')||'true'),
  agentName: localStorage.getItem('cw:agentName')||'Agente',
  manualOverrides: JSON.parse(localStorage.getItem('cw:manualOverrides')||'{}'),
  authUser: JSON.parse(localStorage.getItem('cw:authUser')||'null'),
  fibraDiagrams: JSON.parse(localStorage.getItem('cw:fibraDiagrams')||'[]'),
  api: api
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
  // Settings elements
  themeDark: null,
  fontSizeUp: null,
  fontSizeDown: null,
  fontSizeReset: null,
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
  
  // Filter elements
  els.categoryFilter = document.getElementById('manualsCategoryFilter');
  // els.roleFilter removed - not needed
  
  // wire elements - settings
  els.themeDark = document.getElementById('themeDark');
  els.notifEnabled = document.getElementById('notifEnabled');
  els.clearDataBtn = document.getElementById('clearDataBtn');
  els.historyList = document.getElementById('historyList');
  els.agentNameDisplay = document.getElementById('agentName');
  els.toggleAgentMode = document.getElementById('toggleAgentMode');
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
  if(els.notifEnabled) els.notifEnabled.checked = STATE.notifEnabled;
  if(els.agentNameDisplay) els.agentNameDisplay.textContent = STATE.agentName;
  
  document.getElementById('manualComments').classList.toggle('hidden', !STATE.agentMode);
  if(STATE.agentMode && els.toggleAgentMode) els.toggleAgentMode.classList.add('active');

  // initialize auth UI (users now managed only in backend)
  refreshAuthUI();

  // Validate that the logged-in user still exists in the database
  if(STATE.authUser && STATE.authUser.id) {
    try {
      console.log('[init] Validating user session:', STATE.authUser.id);
      const validateResponse = await fetch(`http://localhost:5000/api/validate-user/${STATE.authUser.id}`, {
        method: 'POST'
      });
      
      if(!validateResponse.ok) {
        console.warn('[init] User session invalid - user was deleted');
        // User no longer exists, logout
        logout();
        await showAlert('Sesión Cerrada', 'Tu cuenta ha sido eliminada. Se ha cerrado tu sesión.');
        return;
      }
      
      console.log('[init] ✓ User session valid');
    } catch (err) {
      console.error('[init] Error validating user session:', err);
      // On error, let the session continue (network issue, etc)
    }
  }

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
    const response = await api.getManuals();
    // load base manuals from data
    let baseManuals = response.data || response.manuals || [];
    
    console.log('[init] Received', baseManuals.length, 'manuals from API');
    
    // Normalize backend data: convert 'content' field to 'steps'
    baseManuals = baseManuals.map((manual, idx) => {
      console.log(`[init] Manual ${idx} (${manual.id}):`, {
        hasContent: !!manual.content,
        contentType: typeof manual.content,
        contentIsArray: Array.isArray(manual.content),
        contentLength: manual.content ? (Array.isArray(manual.content) ? manual.content.length : manual.content.length) : 0,
        hasSteps: !!manual.steps
      });
      
      // Ensure steps is always an array
      if (!manual.steps || !Array.isArray(manual.steps)) {
        // Try to use content as source
        const sourceArray = manual.content || [];
        
        // If content is a string, parse it
        if (typeof sourceArray === 'string') {
          try {
            manual.steps = JSON.parse(sourceArray);
          } catch (e) {
            console.warn(`[init] Failed to parse content for ${manual.id}:`, e);
            manual.steps = [];
          }
        } else if (Array.isArray(sourceArray)) {
          manual.steps = sourceArray;
        } else {
          manual.steps = [];
        }
      }
      
      console.log(`[init] After normalization, ${manual.id} has ${manual.steps.length} steps`);
      return manual;
    });
    
    // All manuals come from database now - no localStorage
    STATE.manuals = baseManuals;
    
    // update system info
    if(els.manualCount) els.manualCount.textContent = STATE.manuals.length;
    if(els.lastUpdate) els.lastUpdate.textContent = new Date().toLocaleDateString('es-ES');
    
    renderManualsList(STATE.manuals);
    // Use event delegation for create manual button to survive re-renders
    document.addEventListener('click', (ev) => {
      if (ev.target.closest('#createManualBtn')) {
        ev.preventDefault();
        openNewManualModal();
      }
    }, true);
    
    // Ensure create manual and modal controls are wired (robust wiring inside init)
    try{
      console.debug('[init] Event delegation wired para #createManualBtn');
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
      // generic modal close buttons
      document.querySelectorAll('[data-close]').forEach(b=>{ if(!b._cwCloseWired){ b.addEventListener('click', (ev)=>{ ev.stopPropagation(); document.querySelectorAll('.modal').forEach(m=> m.classList.add('hidden')); }); b._cwCloseWired = true; } });
      
      console.debug('[init] ✓ Wiring modal completado');
    }catch(e){ console.warn('init modal wiring err', e); }
    // pass the search wrapper so search module can add clear button and handle outside clicks
    const searchWrap = document.querySelector('.search-wrap');
    setupSearch(STATE.manuals, {searchInput: els.searchInput, autocomplete: els.autocomplete, container: searchWrap}, {});

    // Wire category filter ONLY (role filter removed)
    if (els.categoryFilter) {
      els.categoryFilter.addEventListener('change', () => applyManualFilters());
    }

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
    
    // Login flow: Step 1 (username/email)
    const loginNextBtn = document.getElementById('loginNextBtn');
    if(loginNextBtn) loginNextBtn.addEventListener('click', loginStep1Next);
    if(els.loginUser) els.loginUser.addEventListener('keypress', (e) => { if(e.key === 'Enter') loginStep1Next(); });
    
    // Login flow: Step 2 (password or setup)
    const loginBackBtn = document.getElementById('loginBackBtn');
    const goToSetupBtn = document.getElementById('goToSetupBtn');
    if(loginBackBtn) loginBackBtn.addEventListener('click', loginStep1Back);
    if(goToSetupBtn) goToSetupBtn.addEventListener('click', loginGoToSetup);
    if(els.loginSubmit) els.loginSubmit.addEventListener('click', async ()=>{ await login(); });
    if(els.loginPass) els.loginPass.addEventListener('keypress', (e) => { if(e.key === 'Enter') login(); });
    
    // close login modal -> use helper to also restore scrolling (only if a close button exists)
    if(els.loginModal){ 
      const cbtn = els.loginModal.querySelector('[data-close]'); 
      if(cbtn) cbtn.addEventListener('click', ()=>{ resetLoginModal(); hideLoginModal(); }); 
    }

    // Password setup modal listeners
    const setupPasswordInput = document.getElementById('setupPassword');
    const setupPasswordConfirm = document.getElementById('setupPasswordConfirm');
    const submitSetupBtn = document.getElementById('submitSetupBtn');
    const cancelSetupBtn = document.getElementById('cancelSetupBtn');
    const setupPasswordModal = document.getElementById('setupPasswordModal');
    
    if(setupPasswordInput) {
      setupPasswordInput.addEventListener('input', updatePasswordStrengthUI);
      setupPasswordInput.addEventListener('keypress', (e) => { if(e.key === 'Enter' && !submitSetupBtn.disabled) submitPasswordSetup(); });
    }
    if(setupPasswordConfirm) {
      setupPasswordConfirm.addEventListener('input', updatePasswordStrengthUI);
      setupPasswordConfirm.addEventListener('keypress', (e) => { if(e.key === 'Enter' && !submitSetupBtn.disabled) submitPasswordSetup(); });
    }
    if(submitSetupBtn) submitSetupBtn.addEventListener('click', async () => { await submitPasswordSetup(); });
    if(cancelSetupBtn) cancelSetupBtn.addEventListener('click', () => { hidePasswordSetupModal(); });
    if(setupPasswordModal) {
      const closeBtn = setupPasswordModal.querySelector('[data-close]');
      if(closeBtn) closeBtn.addEventListener('click', () => hidePasswordSetupModal());
    }

    // admin: add user (now handled by createNewUser function)
    // old code removed - users managed through backend only

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
    if(els.deleteManualBtn) els.deleteManualBtn.addEventListener('click', async ()=>{ 
      if(await showConfirm('Eliminar manual', '¿Estás seguro? Esta acción es irreversible.')) {
        deleteManual(STATE.current && STATE.current.id);
      }
    });
    if(els.exportCurrentBtn) els.exportCurrentBtn.addEventListener('click', ()=>{ exportCurrentManual(); });
    // admin toolbar bindings
    const newManualBtn = document.getElementById('newManualBtn');
    if(newManualBtn) newManualBtn.addEventListener('click', ()=>openNewManualModal());
    
    // PDF import handler
    const processPdfBtn = document.getElementById('processPdfBtn');
    const pdfFileInput = document.getElementById('pdfFileInput');
    if(processPdfBtn && pdfFileInput) {
      processPdfBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        pdfFileInput.click();
      });
      pdfFileInput.addEventListener('change', async (ev) => {
        const file = ev.target.files[0];
        if(file && file.type === 'application/pdf') {
          processPdfFile(file);
        } else {
          await showAlert('Archivo Inválido', 'Por favor selecciona un archivo PDF válido');
        }
      });
    }
    
    // JSON import handler
    const importJsonBtn = document.getElementById('importJsonBtn');
    const jsonFileInput = document.getElementById('jsonFileInput');
    if(importJsonBtn && jsonFileInput) {
      importJsonBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        jsonFileInput.click();
      });
      jsonFileInput.addEventListener('change', async (ev) => {
        const file = ev.target.files[0];
        if(file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
          processJsonFile(file);
        } else {
          await showAlert('Archivo Inválido', 'Por favor selecciona un archivo JSON válido');
        }
      });
    }
    
    // Manage categories button
    const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
    if(manageCategoriesBtn) manageCategoriesBtn.addEventListener('click', ()=>{ openManageCategoriesModal(); });

    // Fibra/Diagrams - Wire create button with event delegation
    document.addEventListener('click', async (ev) => {
      if (ev.target.closest('#createDiagramBtn')) {
        ev.preventDefault();
        if(!(STATE.authUser && STATE.authUser.role === 'admin')) {
          await showAlert('Acceso Denegado', 'Solo administradores pueden crear árboles de decisión');
          return;
        }
        openNewDiagramModal();
      }
    }, true);

    // Load diagrams
    loadDiagrams();

    // Load users list if admin (after a small delay to ensure STATE is ready)
    if(STATE.authUser && STATE.authUser.role === 'admin') {
      setTimeout(() => {
        console.log('[init] Loading users list for admin:', STATE.authUser.username);
        refreshUsersList();
      }, 100);
    }

    // Settings handlers
    if(els.themeDark) {
      els.themeDark.addEventListener('change', (ev) => {
        STATE.darkMode = ev.target.checked;
        localStorage.setItem('cw:darkMode', JSON.stringify(STATE.darkMode));
        applyTheme();
      });
    }

    if(els.notifEnabled) {
      els.notifEnabled.addEventListener('change', (ev) => {
        STATE.notifEnabled = ev.target.checked;
        localStorage.setItem('cw:notifEnabled', JSON.stringify(STATE.notifEnabled));
      });
    }

    if(els.notifEnabled) {
      els.notifEnabled.addEventListener('change', (ev) => {
        STATE.notifEnabled = ev.target.checked;
        localStorage.setItem('cw:notifEnabled', JSON.stringify(STATE.notifEnabled));
      });
    }

    if(els.clearDataBtn) {
      els.clearDataBtn.addEventListener('click', async () => {
        if(await showConfirm('Borrar datos', '¿Estás seguro? Se eliminarán todos los datos locales (progreso, comentarios, historial).')) {
          localStorage.clear();
          STATE.progress = {};
          STATE.comments = {};
          STATE.history = [];
          renderHistory();
          pushNotification({title: 'Datos borrados', text: 'Todos los datos locales han sido eliminados.'});
        }
      });
    }

    // Search and History handlers
    const searchHistoryEnabled = document.getElementById('searchHistoryEnabled');
    if(searchHistoryEnabled) {
      searchHistoryEnabled.addEventListener('change', (ev) => {
        localStorage.setItem('cw:searchHistoryEnabled', JSON.stringify(ev.target.checked));
      });
    }

    const autoSuggest = document.getElementById('autoSuggest');
    if(autoSuggest) {
      autoSuggest.addEventListener('change', (ev) => {
        localStorage.setItem('cw:autoSuggest', JSON.stringify(ev.target.checked));
      });
    }

    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if(clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', async () => {
        if(await showConfirm('Borrar historial', '¿Borrar todo el historial de búsquedas y vistas?')) {
          STATE.history = [];
          localStorage.setItem('cw:history', JSON.stringify([]));
          renderHistory();
          pushNotification({title: 'Historial borrado', text: 'Tu historial de búsquedas y vistas ha sido eliminado.'});
        }
      });
    }

    // Change password handler
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if(changePasswordBtn) {
      changePasswordBtn.addEventListener('click', async () => {
        await changePassword();
      });
    }

    // Update data usage display periodically
    // updateDataUsage();
    // setInterval(updateDataUsage, 5000);

    // Initialize notifications display
    renderNotifications();

    document.getElementById('qrBtn').addEventListener('click', showQr);
    document.getElementById('backToManualsBtn').addEventListener('click', () => {
      // Hide manual view and show manualsListView
      document.getElementById('manualView').classList.add('hidden');
      document.getElementById('manualsListView').classList.remove('hidden');
      document.getElementById('welcome').classList.add('hidden');
    });
    document.getElementById('helpBtn').addEventListener('click', ()=>document.getElementById('helpModal').classList.remove('hidden'));
    document.getElementById('notificationsBtn').addEventListener('click', ()=>{
      document.getElementById('notificationsPanel').classList.remove('hidden');
      renderNotifications();
    });
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
        // Don't close if there's an option editor modal open (they handle their own Escape)
        const optionModals = document.querySelectorAll('[data-modal-editor="option"]');
        if (optionModals.length > 0) {
          return; // Let the option modal handle it
        }
        
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
    const baseFaqs = []; // FAQs can be created by users
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
    if(els.deleteFaqBtn) els.deleteFaqBtn.addEventListener('click', async (ev)=>{ 
      ev.preventDefault(); 
      if(await showConfirm('Eliminar FAQ', '¿Eliminar esta FAQ?')) {
        deleteFaq(els.deleteFaqBtn.dataset.id);
      }
    });
    if(els.faqSearch) els.faqSearch.addEventListener('input', debounce((ev)=>{ filterFaqs(ev.target.value); }, 220));
    if(els.clearFaqSearch) els.clearFaqSearch.addEventListener('click', ()=>{ if(els.faqSearch) { els.faqSearch.value=''; filterFaqs(''); } });
    if(els.exportAllDataBtn) els.exportAllDataBtn.addEventListener('click', (ev)=>{ ev.preventDefault(); exportAllData(); });

    // User management (admin only)
    const addUserBtn = document.getElementById('addUserBtn');
    if(addUserBtn) addUserBtn.addEventListener('click', createNewUser);
    
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
    if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
      showAlert('Acceso Denegado', 'Solo administradores pueden editar FAQs.'); 
      return; 
    }
    if(els.faqQuestion) els.faqQuestion.value = faq.q || '';
    if(els.faqAnswer) els.faqAnswer.value = faq.a || '';
    if(els.deleteFaqBtn) { els.deleteFaqBtn.style.display = ''; els.deleteFaqBtn.dataset.id = faq.id; }
    if(els.faqModal) els.faqModal.classList.remove('hidden');
    els.faqModal._editingId = faq.id;
  } else {
    // creating new
    if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
      showAlert('Acceso Denegado', 'Solo administradores pueden crear FAQs.'); 
      return; 
    }
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
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
    showAlert('Acceso Denegado', 'Solo administradores pueden guardar FAQs.'); 
    return; 
  }
  if(!els.faqQuestion || !els.faqAnswer) return;
  const q = els.faqQuestion.value.trim(); const a = els.faqAnswer.value.trim();
  if(!q || !a){ 
    showAlert('Campos Obligatorios', 'Pregunta y respuesta son obligatorias.'); 
    return; 
  }
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
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
    showAlert('Acceso Denegado', 'Solo administradores pueden eliminar FAQs.'); 
    return; 
  }
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
  else if(name === 'faqs') {
    document.getElementById('faqsView').classList.remove('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden');
  }
  else if(name === 'fibra') {
    document.getElementById('fibraView').classList.remove('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden');
    loadDiagrams();
  }
  else if(name === 'settings') {
    document.getElementById('settingsView').classList.remove('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden');
    // Refresh users list when opening settings if admin
    if(STATE.authUser && STATE.authUser.role === 'admin') {
      refreshUsersList();
    }
  }
  else if(name === 'history') {
    document.getElementById('historyView').classList.remove('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden');
    renderHistory();
  }
}

// Apply category and role filters to manuals list
function applyManualFilters() {
  let filtered = STATE.manuals;
  
  // Filter by category
  if (els.categoryFilter && els.categoryFilter.value) {
    filtered = filtered.filter(m => (m.category || 'Sin categoría') === els.categoryFilter.value);
  }
  
  // Filter by role
  if (els.roleFilter && els.roleFilter.value) {
    filtered = filtered.filter(m => m.role === els.roleFilter.value);
  }
  
  renderManualsList(filtered);
}

// Update available categories in the category filter
function updateCategoryOptions() {
  if (!els.categoryFilter) return;
  
  // Get current selected value
  const currentValue = els.categoryFilter.value;
  
  // Clear ALL options and rebuild from scratch
  els.categoryFilter.innerHTML = '<option value="">🏷️ Categoría</option>';
  
  // Add categories from current manuals
  const categories = new Set(STATE.manuals.map(m => m.category || 'Sin categoría'));
  const sortedCats = Array.from(categories).sort();
  sortedCats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    els.categoryFilter.appendChild(opt);
  });
  
  // Restore previous selection if it still exists
  if (currentValue && Array.from(els.categoryFilter.options).some(o => o.value === currentValue)) {
    els.categoryFilter.value = currentValue;
  }
}

function renderManualsList(manuals){
  console.log('[renderManualsList] Called with', manuals.length, 'manuals');
  
  // Update category options
  updateCategoryOptions();
  
  // Update manual count
  if (els.manualCount) {
    els.manualCount.textContent = manuals.length + ' manual' + (manuals.length !== 1 ? 'es' : '');
  }
  
  const container = document.getElementById('manualsList');
  container.innerHTML = '';
  const isAdmin = STATE.authUser && STATE.authUser.role === 'admin';
  
  if (!manuals || manuals.length === 0) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--cw-text-muted)"><p style="font-size:15px">No hay manuales disponibles</p></div>';
    return;
  }

  // Group by category for cleaner organization
  const byCategory = {};
  manuals.forEach(manual => {
    const cat = manual.category || 'Sin categoría';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(manual);
  });

  // Sort categories alphabetically
  const categories = Object.keys(byCategory).sort();

  categories.forEach(category => {
    const categoryManualsCount = byCategory[category].length;
    
    // Category section
    const categorySection = document.createElement('div');
    categorySection.style.marginBottom = '32px';
    
    // Category header
    const categoryHeader = document.createElement('div');
    categoryHeader.style.cssText = `
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--cw-border);
    `;
    
    const categoryTitle = document.createElement('h3');
    categoryTitle.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--cw-text);
      letter-spacing: -0.3px;
    `;
    categoryTitle.textContent = category;
    categoryHeader.appendChild(categoryTitle);
    
    const categoryBadge = document.createElement('span');
    categoryBadge.style.cssText = `
      font-size: 13px;
      padding: 4px 10px;
      background: var(--cw-primary);
      color: white;
      border-radius: 12px;
      font-weight: 500;
    `;
    categoryBadge.textContent = categoryManualsCount;
    categoryHeader.appendChild(categoryBadge);
    
    categorySection.appendChild(categoryHeader);
    
    // Cards grid
    const cardsGrid = document.createElement('div');
    cardsGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    `;
    
    byCategory[category].forEach(manual => {
      // DETAILED LOGGING FOR THIS MANUAL
      console.log(`[renderManualsList] Processing manual:`, {
        id: manual.id,
        title: manual.title,
        hasSteps: !!manual.steps,
        stepsType: typeof manual.steps,
        stepsIsArray: Array.isArray(manual.steps),
        stepsLength: manual.steps ? manual.steps.length : 'undefined',
        hasContent: !!manual.content,
        contentType: typeof manual.content,
        contentIsArray: Array.isArray(manual.content),
        contentLength: manual.content ? manual.content.length : 'undefined'
      });
      
      const card = document.createElement('div');
      card.style.cssText = `
        background: var(--cw-surface);
        border: 1px solid var(--cw-border);
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        gap: 12px;
        ${!isAdmin ? 'opacity: 0.95;' : ''}
      `;
      
      // Hover effect
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--cw-primary)';
        card.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        card.style.transform = 'translateY(-2px)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'var(--cw-border)';
        card.style.boxShadow = 'none';
        card.style.transform = 'translateY(0)';
      });
      
      // Title
      const title = document.createElement('h4');
      title.style.cssText = `
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--cw-text);
        line-height: 1.4;
        letter-spacing: -0.3px;
      `;
      title.textContent = manual.title || 'Sin título';
      card.appendChild(title);
      
      // Summary
      if (manual.summary) {
        const summary = document.createElement('p');
        summary.style.cssText = `
          margin: 0;
          font-size: 13px;
          color: var(--cw-text-muted);
          line-height: 1.5;
          height: 36px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        `;
        summary.textContent = manual.summary;
        card.appendChild(summary);
      }
      
      // Meta information (Steps + Role)
      const metaRow = document.createElement('div');
      metaRow.style.cssText = `
        display: flex;
        gap: 12px;
        align-items: center;
        margin-top: 8px;
        padding-top: 12px;
        border-top: 1px solid var(--cw-border-light);
      `;
      
      // Steps count
      const stepsCount = (manual.steps && manual.steps.length) || (manual.content && manual.content.length) || 0;
      const stepsInfo = document.createElement('div');
      stepsInfo.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--cw-text-muted);
      `;
      stepsInfo.innerHTML = `
        <span style="font-weight: 500; color: var(--cw-text);">${stepsCount}</span>
        <span>${stepsCount === 1 ? 'paso' : 'pasos'}</span>
      `;
      metaRow.appendChild(stepsInfo);
      
      // Role badge
      if (manual.role) {
        const roleBadge = document.createElement('div');
        roleBadge.style.cssText = `
          display: inline-block;
          font-size: 11px;
          padding: 3px 8px;
          background: rgba(255, 128, 51, 0.1);
          color: var(--cw-primary);
          border-radius: 6px;
          font-weight: 500;
          text-transform: capitalize;
        `;
        const roleMap = { 'admin': 'Administrador', 'agent': 'Agente', 'viewer': 'Visualizador' };
        roleBadge.textContent = roleMap[manual.role] || manual.role;
        metaRow.appendChild(roleBadge);
      }
      
      // Spacer to push button to right
      const spacer = document.createElement('div');
      spacer.style.flex = '1';
      metaRow.appendChild(spacer);
      
      // Open button
      const openBtn = document.createElement('button');
      openBtn.style.cssText = `
        background: var(--cw-primary);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      openBtn.textContent = isAdmin ? 'Abrir →' : 'Ver detalle →';
      openBtn.addEventListener('mouseenter', () => {
        openBtn.style.background = 'var(--cw-primary-dark, #e85500)';
        openBtn.style.transform = 'scale(1.05)';
      });
      openBtn.addEventListener('mouseleave', () => {
        openBtn.style.background = 'var(--cw-primary)';
        openBtn.style.transform = 'scale(1)';
      });
      openBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openManual(manual.id);
      });
      metaRow.appendChild(openBtn);
      
      card.appendChild(metaRow);
      
      // Click anywhere on card to open
      card.addEventListener('click', () => openManual(manual.id));
      
      cardsGrid.appendChild(card);
    });
    
    categorySection.appendChild(cardsGrid);
    container.appendChild(categorySection);
  });
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
    // Normalize: convert 'content' field to 'steps' for frontend
    // Ensure steps is properly set and is an array
    if (!manual.steps || !Array.isArray(manual.steps)) {
      const sourceArray = manual.content || manual.steps || [];
      // If it's still not an array (might be string), try to parse
      if (typeof sourceArray === 'string') {
        try {
          manual.steps = JSON.parse(sourceArray);
        } catch (e) {
          console.warn('[openManual] Failed to parse steps/content:', e);
          manual.steps = [];
        }
      } else {
        manual.steps = sourceArray;
      }
    }
    // apply manual overrides (admin edits) if present
    const overr = STATE.manualOverrides && STATE.manualOverrides[manual.id];
    if(overr){ manual = Object.assign({}, manual, overr); }
    STATE.current = manual;
    
    // Add to history
    addToHistory(id);
    renderHistory(); // Update history view in real-time
    
    // hide other list views so manual becomes the focused view
    const ml = document.getElementById('manualsListView'); if(ml) ml.classList.add('hidden');
    document.getElementById('welcome').classList.add('hidden');
    document.getElementById('adminToolbar')?.classList.add('hidden'); // Hide floating toolbar when viewing manual (guarded)
    els.manualView.classList.remove('hidden');
    if (els.manualTitle) els.manualTitle.textContent = manual.title;
    if (els.manualCategory) els.manualCategory.textContent = manual.category;
    if (els.manualVersion) els.manualVersion.textContent = `v${manual.version}`;
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
  // Defensive check
  if (!manual) {
    console.error('[renderSteps] Manual is null or undefined');
    return;
  }
  
  if (!els.manualSteps) {
    console.error('[renderSteps] manualSteps element not found');
    return;
  }
  
  // Clear old
  els.manualSteps.innerHTML = '';
  if(els.manualStepsNav) els.manualStepsNav.innerHTML = '';

  // Normalize: handle both 'steps' and 'content' fields from backend
  let stepsArray = manual.steps || manual.content || [];
  
  // If stepsArray is a string (JSON), try to parse it
  if (typeof stepsArray === 'string') {
    try {
      stepsArray = JSON.parse(stepsArray);
      console.log('[renderSteps] Parsed content from string');
    } catch (e) {
      console.warn('[renderSteps] Failed to parse steps/content string:', e);
      stepsArray = [];
    }
  }
  
  // Ensure it's always an array
  if (!Array.isArray(stepsArray)) {
    console.warn('[renderSteps] stepsArray is not an array:', typeof stepsArray);
    stepsArray = [];
  }
  
  const total = stepsArray.length;
  
  console.debug('[renderSteps] Rendering', total, 'steps for manual:', manual.id, 'Steps type:', typeof stepsArray);
  
  if (total === 0) {
    els.manualSteps.innerHTML = '<div style="padding:40px;text-align:center;color:var(--cw-text-muted)"><p style="font-size:14px">No hay pasos en este manual</p></div>';
    return;
  }

  stepsArray.forEach((s, idx) => {
    const stepDiv = document.createElement('div');
    stepDiv.id = `step-${idx}`;
    stepDiv.style.cssText = `
      background: var(--cw-surface);
      border: 1px solid var(--cw-border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      transition: all 0.2s ease;
    `;
    
    // Step header with number and title
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--cw-border-light);
    `;
    
    // Step number circle
    const numberBadge = document.createElement('div');
    numberBadge.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--cw-primary);
      color: white;
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
    `;
    numberBadge.textContent = idx + 1;
    header.appendChild(numberBadge);
    
    // Title
    const titleEl = document.createElement('h3');
    titleEl.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--cw-text);
      flex: 1;
    `;
    titleEl.textContent = s.title || `Paso ${idx + 1}`;
    header.appendChild(titleEl);
    
    // Complete button
    const isDone = STATE.progress[manual.id] && STATE.progress[manual.id].includes(idx);
    const completeBtn = document.createElement('button');
    completeBtn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      ${isDone 
        ? 'background: #10b981; color: white;' 
        : 'background: var(--cw-border-light); color: var(--cw-text-muted);'}
    `;
    completeBtn.innerHTML = isDone 
      ? '✓ Completado' 
      : '○ Marcar como completado';
    completeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleStepProgress(manual.id, idx, completeBtn);
    });
    completeBtn.addEventListener('mouseenter', () => {
      // Check current state instead of using closure variable
      const isCurrentlyDone = STATE.progress[manual.id] && STATE.progress[manual.id].includes(idx);
      if (!isCurrentlyDone) {
        completeBtn.style.background = 'var(--cw-primary)';
        completeBtn.style.color = 'white';
      }
    });
    completeBtn.addEventListener('mouseleave', () => {
      // Check current state instead of using closure variable
      const isCurrentlyDone = STATE.progress[manual.id] && STATE.progress[manual.id].includes(idx);
      if (!isCurrentlyDone) {
        completeBtn.style.background = 'var(--cw-border-light)';
        completeBtn.style.color = 'var(--cw-text-muted)';
      }
    });
    header.appendChild(completeBtn);
    
    stepDiv.appendChild(header);
    
    // Content area
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 16px;
    `;
    
    // Image if exists
    if (s.image) {
      const imgContainer = document.createElement('div');
      imgContainer.style.cssText = `
        border-radius: 12px;
        overflow: hidden;
        background: var(--cw-bg);
        border: 1px solid var(--cw-border);
      `;
      const img = document.createElement('img');
      img.src = s.image;
      img.alt = s.title || 'Imagen del paso';
      img.style.cssText = `
        width: 100%;
        max-height: 400px;
        object-fit: cover;
        display: block;
        cursor: pointer;
        transition: transform 0.2s, filter 0.2s;
      `;
      img.addEventListener('mouseover', () => {
        img.style.filter = 'brightness(0.9)';
        img.style.transform = 'scale(1.02)';
      });
      img.addEventListener('mouseout', () => {
        img.style.filter = 'brightness(1)';
        img.style.transform = 'scale(1)';
      });
      img.addEventListener('click', () => openImageZoom(s.image, s.title || 'Imagen del paso'));
      imgContainer.appendChild(img);
      contentArea.appendChild(imgContainer);
    }
    
    // Step content (HTML)
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = `
      font-size: 15px;
      line-height: 1.6;
      color: var(--cw-text);
    `;
    contentDiv.innerHTML = s.content || '';
    // Sanitize content - remove potentially dangerous attributes
    contentDiv.querySelectorAll('[onclick], [onload], [onerror], script').forEach(el => {
      if (el.tagName === 'SCRIPT') el.remove();
      else el.removeAttribute('onclick');
    });
    contentArea.appendChild(contentDiv);
    
    // Edit button (for admins)
    if (STATE.authUser && STATE.authUser.role === 'admin') {
      const editBtn = document.createElement('button');
      editBtn.style.cssText = `
        align-self: flex-start;
        padding: 8px 16px;
        background: transparent;
        border: 1px solid var(--cw-primary);
        color: var(--cw-primary);
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 8px;
      `;
      editBtn.textContent = '✏️ Editar paso';
      editBtn.addEventListener('mouseenter', () => {
        editBtn.background = 'var(--cw-primary)';
        editBtn.color = 'white';
        editBtn.style.background = 'var(--cw-primary)';
        editBtn.style.color = 'white';
      });
      editBtn.addEventListener('mouseleave', () => {
        editBtn.style.background = 'transparent';
        editBtn.style.color = 'var(--cw-primary)';
      });
      editBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openEditStepModal(manual, idx, s);
      });
      contentArea.appendChild(editBtn);
    }
    
    stepDiv.appendChild(contentArea);
    els.manualSteps.appendChild(stepDiv);

    // Navigation button
    if (els.manualStepsNav) {
      const navBtn = document.createElement('button');
      navBtn.type = 'button';
      navBtn.dataset.idx = idx;
      navBtn.style.cssText = `
        width: 100%;
        padding: 12px;
        text-align: left;
        border: 1px solid var(--cw-border);
        border-radius: 8px;
        background: var(--cw-surface);
        color: var(--cw-text);
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s ease;
        margin-bottom: 8px;
      `;
      navBtn.innerHTML = `<strong>${idx + 1}.</strong> ${escapeHtml(s.title || `Paso ${idx + 1}`)}`;
      navBtn.addEventListener('mouseenter', () => {
        navBtn.style.background = 'var(--cw-primary)';
        navBtn.style.color = 'white';
        navBtn.style.borderColor = 'var(--cw-primary)';
      });
      navBtn.addEventListener('mouseleave', () => {
        navBtn.style.background = 'var(--cw-surface)';
        navBtn.style.color = 'var(--cw-text)';
        navBtn.style.borderColor = 'var(--cw-border)';
      });
      navBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        scrollToStep(idx, true);
        updateNavActive(idx);
        window.location.hash = `manual=${manual.id}&step=${idx}`;
      });
      els.manualStepsNav.appendChild(navBtn);
    }
  });

  // Helper: scroll to step
  function scrollToStep(idx, smooth) {
    try {
      const root = document.querySelector('.main') || window;
      const target = document.getElementById(`step-${idx}`);
      if (!target) return;
      const manualHeader = document.querySelector('#manualView .manual-header');
      const headerOffset = manualHeader ? manualHeader.getBoundingClientRect().height + 8 : 0;
      if (root === window) {
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 8;
        window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
      } else {
        const rootRect = root.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset = (targetRect.top - rootRect.top) + root.scrollTop - headerOffset - 8;
        root.scrollTo({ top: offset, behavior: smooth ? 'smooth' : 'auto' });
      }
    } catch (e) {
      console.warn('scrollToStep err', e);
    }
  }

  // Show first step
  setTimeout(() => scrollToStep(0, false), 0);

  // Progress bar
  const progContainerSelector = '#manualView .manual-header';
  const mh = document.querySelector(progContainerSelector);
  if (mh) {
    let prog = mh.querySelector('.manual-progress');
    if (!prog) {
      prog = document.createElement('div');
      prog.className = 'manual-progress';
      const inner = document.createElement('i');
      prog.appendChild(inner);
      mh.appendChild(prog);
    }
    const completed = (STATE.progress[manual.id] && STATE.progress[manual.id].length) || 0;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    const inner = prog.querySelector('i');
    if (inner) inner.style.width = pct + '%';
  }

  // Nav activation
  try {
    function updateNavActive(idx) {
      document.querySelectorAll('#manualStepsNav button').forEach(b => {
        b.classList.toggle('active', idx !== null && parseInt(b.dataset.idx, 10) === idx);
      });
      if (idx !== null) {
        history.replaceState(null, '', `#manual=${manual.id}&step=${idx}`);
      }
    }
    updateNavActive(0);
  } catch (e) {
    console.warn('nav activation setup err', e);
  }
}

function toggleStepProgress(manualId, idx, btn){
  STATE.progress[manualId] = STATE.progress[manualId] || [];
  const arr = STATE.progress[manualId];
  const i = arr.indexOf(idx);
  const svgCheck = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const svgMark = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  
  if(i === -1) { 
    // Mark as completed
    arr.push(idx);
    if(btn) {
      btn.classList.add('done-true');
      btn.innerHTML = svgCheck + '<span>Completado</span>';
      // Update inline styles to show completed state
      btn.style.background = '#10b981';
      btn.style.color = 'white';
    }
  } else { 
    // Mark as incomplete
    arr.splice(i,1);
    if(btn) {
      btn.classList.remove('done-true');
      btn.innerHTML = svgMark + '<span>Marcar como completado</span>';
      // Update inline styles to show incomplete state
      btn.style.background = 'var(--cw-border-light)';
      btn.style.color = 'var(--cw-text-muted)';
    }
  }
  
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
  if(!els.commentsList) {
    console.warn('[renderComments] commentsList element not found');
    return;
  }
  
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
      deleteBtn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        if(await showConfirm('Eliminar Comentario', '¿Eliminar este comentario?')){
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
    showAlert('Permisos Insuficientes', 'Activa el modo agente para poder comentar, o inicia sesión como administrador.');
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
  if(!els.versionsList) {
    console.warn('[renderVersions] versionsList element not found');
    return;
  }
  if(!manual) {
    console.warn('[renderVersions] manual is null or undefined');
    return;
  }
  
  els.versionsList.innerHTML = '';
  if(manual.versions && manual.versions.length){
    manual.versions.forEach(v=>{
      const li = document.createElement('li'); 
      li.textContent = `${v.version} — ${v.note} (${new Date(v.date).toLocaleDateString()})`;
      els.versionsList.appendChild(li);
    });
  } else {
    els.versionsList.textContent = 'Sin historial de versiones.';
  }
}

function renderFaqs(faqs){
  const container = document.getElementById('faqsList'); if(!container) return; container.innerHTML = '';
  const list = (faqs||[]).slice();
  const isAdmin = STATE.authUser && STATE.authUser.role === 'admin';
  if(list.length === 0){
    container.innerHTML = '<div class="empty-state">No hay FAQs aún. Usa "Crear FAQ" para añadir preguntas frecuentes.</div>';
    return;
  }
  list.forEach((f, idx)=>{
    const item = document.createElement('div'); item.className = 'faq-item'; item.dataset.id = f.id || `faq-${idx}`;
    if(!isAdmin) item.style.opacity = '0.95';
    const q = document.createElement('h5'); q.textContent = f.q || 'Pregunta sin título';
    const a = document.createElement('div'); a.className = 'faq-answer muted'; a.style.display = 'none'; a.innerHTML = f.a || '';
    // toggle
    item.addEventListener('click', (ev)=>{ if(ev.target.tagName.toLowerCase() === 'button') return; a.style.display = a.style.display === 'none' ? 'block' : 'none'; });

    item.appendChild(q);
    // short preview
    if(f.a && String(f.a).length > 200){
      const preview = document.createElement('p'); preview.textContent = String(f.a).slice(0,200) + '...'; preview.style.color = 'var(--cw-text-muted)'; item.appendChild(preview);
    } else if(f.a){
      const preview = document.createElement('p'); preview.textContent = f.a; preview.style.color = 'var(--cw-text-muted)'; item.appendChild(preview);
    }

    // append answer
    item.appendChild(a);

    // admin controls - only render for admins
    if(isAdmin){
      const controls = document.createElement('div'); controls.style.display = 'flex'; controls.style.gap = '8px'; controls.style.marginTop = '8px';
      const editBtn = document.createElement('button'); editBtn.className = 'small-btn'; editBtn.textContent = 'Editar'; editBtn.type = 'button';
      editBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); openFaqModal(f); });
      const delBtn = document.createElement('button'); delBtn.className = 'secondary'; delBtn.textContent = 'Eliminar'; delBtn.type = 'button';
      delBtn.addEventListener('click', async (ev)=>{ ev.stopPropagation(); if(await showConfirm('Eliminar FAQ', '¿Eliminar esta FAQ?')) deleteFaq(f.id); });
      controls.appendChild(editBtn); controls.appendChild(delBtn);
      const ctrlWrap = document.createElement('div'); ctrlWrap.style.display='flex'; ctrlWrap.style.justifyContent='flex-end'; ctrlWrap.appendChild(controls);
      item.appendChild(ctrlWrap);
    }
    
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

/* Custom Alert and Confirm dialogs */
function showAlert(title, message = ''){
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:400px;animation:slideInUp 0.3s ease">
        <h4 style="margin-bottom:12px">${escapeHtml(title)}</h4>
        <p style="color:var(--cw-text-muted);margin-bottom:16px;white-space:pre-wrap">${escapeHtml(message)}</p>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="primary" style="padding:8px 16px">Aceptar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const btn = modal.querySelector('button');
    btn.addEventListener('click', () => {
      modal.remove();
      resolve();
    });
    modal.addEventListener('click', (e) => {
      if(e.target === modal) {
        modal.remove();
        resolve();
      }
    });
    btn.focus();
  });
}

function showConfirm(title, message = ''){
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:400px;animation:slideInUp 0.3s ease">
        <h4 style="margin-bottom:12px">${escapeHtml(title)}</h4>
        <p style="color:var(--cw-text-muted);margin-bottom:16px;white-space:pre-wrap">${escapeHtml(message)}</p>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="secondary cancel-btn" style="padding:8px 16px">Cancelar</button>
          <button class="primary confirm-btn" style="padding:8px 16px">Aceptar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const cancelBtn = modal.querySelector('.cancel-btn');
    const confirmBtn = modal.querySelector('.confirm-btn');
    
    const close = (result) => {
      modal.remove();
      resolve(result);
    };
    
    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));
    modal.addEventListener('click', (e) => {
      if(e.target === modal) close(false);
    });
    confirmBtn.focus();
  });
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
  
  if(!list.length){ 
    el.innerHTML = '<div class="notif-empty">No hay notificaciones.</div>'; 
    badge.classList.add('hidden'); 
    return; 
  }
  
  badge.classList.remove('hidden'); 
  badge.textContent = String(list.length);
  el.innerHTML = '';
  
  list.forEach(n=>{
    const div = document.createElement('div'); 
    div.className = 'notif panel';
    const timestamp = new Date(n.id).toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'});
    div.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:start; gap:8px;"><div><strong>${escapeHtml(n.title)}</strong><div class="small muted">${escapeHtml(n.text||'')}</div></div><div class="small muted" style="white-space:nowrap;">${timestamp}</div></div>`;
    el.appendChild(div);
  });
}

function escapeHtml(str){
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Open image zoom modal
function openImageZoom(imageSrc, imageAlt = 'Imagen') {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10000;overflow:hidden;padding:20px';
  
  const container = document.createElement('div');
  container.style.cssText = 'position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:auto';
  
  const img = document.createElement('img');
  img.src = imageSrc;
  img.alt = imageAlt;
  img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;cursor:zoom-in;transition:transform 0.2s';
  
  let scale = 1;
  const minScale = 1;
  const maxScale = 4;
  
  // Zoom con scroll
  img.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    scale = Math.max(minScale, Math.min(maxScale, scale + delta));
    img.style.transform = `scale(${scale})`;
    img.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
  });
  
  // Pinch zoom (touchscreen)
  let lastDistance = 0;
  img.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (lastDistance > 0) {
        const delta = distance - lastDistance;
        scale = Math.max(minScale, Math.min(maxScale, scale + delta * 0.01));
        img.style.transform = `scale(${scale})`;
      }
      lastDistance = distance;
    }
  }, { passive: false });
  
  img.addEventListener('touchend', () => {
    lastDistance = 0;
  });
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.2);border:none;color:white;padding:12px 16px;border-radius:8px;cursor:pointer;font-weight:700;font-size:24px;transition:all 0.2s;z-index:10001;backdrop-filter:blur(5px);border:1px solid rgba(255,255,255,0.3)';
  closeBtn.addEventListener('mouseover', () => closeBtn.style.background = 'rgba(255,255,255,0.3)');
  closeBtn.addEventListener('mouseout', () => closeBtn.style.background = 'rgba(255,255,255,0.2)');
  closeBtn.addEventListener('click', () => modal.remove());
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // Close with Escape key
  const closeOnEscape = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', closeOnEscape);
    }
  };
  document.addEventListener('keydown', closeOnEscape);
  
  container.appendChild(img);
  modal.appendChild(container);
  modal.appendChild(closeBtn);
  document.body.appendChild(modal);
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

// Add diagram to history
function addDiagramToHistory(diagramId){
  const diagram = STATE.fibraDiagrams.find(d => d.id === diagramId);
  if(!diagram) return;
  
  const now = Date.now();
  STATE.history = STATE.history.filter(h => h.id !== diagramId);
  STATE.history.unshift({id: diagramId, title: diagram.title, timestamp: now, type: 'diagram'});
  STATE.history = STATE.history.slice(0, 20); // Keep last 20
  localStorage.setItem('cw:history', JSON.stringify(STATE.history));
}

function renderHistory(){
  if(!els.historyList) return;
  
  if(!STATE.history || STATE.history.length === 0){
    els.historyList.innerHTML = '<div class="empty-state"><p>Sin historial. Los manuales y diagramas visitados aparecerán aquí.</p></div>';
    return;
  }
  
  // Filter history to only show items that still exist (manuals or diagrams)
  const validHistory = STATE.history.filter(h => {
    const isManual = STATE.manuals.some(m => m.id === h.id);
    const isDiagram = STATE.fibraDiagrams.some(d => d.id === h.id);
    return isManual || isDiagram;
  });
  
  // Sort by timestamp descending (most recent first)
  validHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  
  els.historyList.innerHTML = '';
  
  if(validHistory.length === 0){
    els.historyList.innerHTML = '<div class="empty-state"><p>Sin historial. Los manuales y diagramas visitados aparecerán aquí.</p></div>';
    return;
  }
  
  validHistory.forEach(h => {
    const card = document.createElement('div');
    card.className = 'manual-card';
    card.style.cursor = 'pointer';
    
    // Determine if it's a diagram or manual and set icon accordingly
    const isDiagram = h.type === 'diagram';
    const icon = isDiagram ? '🌳' : '📖';
    
    card.innerHTML = `
      <div>
        <h5 class="manual-card-title">${icon} ${escapeHtml(h.title)}</h5>
        <p style="color: var(--cw-text-muted); font-size: 12px; margin: 0;">
          ${new Date(h.timestamp).toLocaleDateString('es-ES', {hour: '2-digit', minute: '2-digit'})}
        </p>
      </div>
      <div class="manual-card-actions">
        <button class="card-open" aria-label="Abrir">→</button>
      </div>
    `;
    
    // Open the appropriate item
    card.addEventListener('click', () => {
      if(isDiagram) {
        const diagram = STATE.fibraDiagrams.find(d => d.id === h.id);
        if(diagram) openDiagramViewer(diagram);
      } else {
        openManual(h.id);
      }
    });
    
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
  // Keep default font size - no changes needed
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
// Hashing moved to backend (bcrypt)

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

function showPasswordSetupModal(username){
  const modal = document.getElementById('setupPasswordModal');
  if(!modal) return;
  modal.classList.remove('hidden');
  
  // Pre-fill email (we'll fetch it)
  document.getElementById('setupEmail').value = username; // placeholder - will be email from server
  document.getElementById('setupPassword').value = '';
  document.getElementById('setupPasswordConfirm').value = '';
  document.getElementById('submitSetupBtn').disabled = true;
  
  // Fetch user info to get email
  fetch('http://localhost:5000/api/check-password-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  })
  .then(r => r.json())
  .then(data => {
    if(data.user && data.user.email) {
      document.getElementById('setupEmail').value = data.user.email;
    }
  })
  .catch(err => console.error('Error fetching user:', err));
  
  document.body.style.overflow = 'hidden';
}

function hidePasswordSetupModal(){
  const modal = document.getElementById('setupPasswordModal');
  if(!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function validatePasswordStrength(password){
  const errors = [];
  if(password.length < 8) errors.push('min-length');
  if(!/[A-Z]/.test(password)) errors.push('uppercase');
  if(!/[a-z]/.test(password)) errors.push('lowercase');
  if(!/[0-9]/.test(password)) errors.push('number');
  if(!/[!@#$%^&*]/.test(password)) errors.push('special');
  
  return {
    valid: errors.length === 0,
    errors: errors,
    strength: (5 - errors.length) / 5 * 100
  };
}

function updatePasswordStrengthUI(){
  const password = document.getElementById('setupPassword').value;
  const confirm = document.getElementById('setupPasswordConfirm').value;
  
  const validation = validatePasswordStrength(password);
  
  // Update strength bar
  const fillEl = document.getElementById('passwordStrengthFill');
  if(fillEl) {
    fillEl.style.width = validation.strength + '%';
    if(validation.strength < 40) fillEl.style.background = '#ff4444';
    else if(validation.strength < 60) fillEl.style.background = '#ff9944';
    else if(validation.strength < 80) fillEl.style.background = '#ffcc44';
    else fillEl.style.background = '#44aa44';
  }
  
  // Update requirements checkmarks
  document.getElementById('req1').textContent = validation.errors.includes('min-length') ? '○' : '✓';
  document.getElementById('req2').textContent = validation.errors.includes('uppercase') ? '○' : '✓';
  document.getElementById('req3').textContent = validation.errors.includes('lowercase') ? '○' : '✓';
  document.getElementById('req4').textContent = validation.errors.includes('number') ? '○' : '✓';
  document.getElementById('req5').textContent = validation.errors.includes('special') ? '○' : '✓';
  
  // Update match indicator
  const matchStatus = document.getElementById('matchStatus');
  if(password && confirm) {
    if(password === confirm) {
      matchStatus.textContent = '✓ Las contraseñas coinciden';
      matchStatus.style.color = 'var(--cw-success, #44aa44)';
    } else {
      matchStatus.textContent = '○ Las contraseñas no coinciden';
      matchStatus.style.color = 'var(--cw-text-muted)';
    }
  } else {
    matchStatus.textContent = '○ Las contraseñas deben coincidir';
    matchStatus.style.color = 'var(--cw-text-muted)';
  }
  
  // Enable/disable submit button
  const submitBtn = document.getElementById('submitSetupBtn');
  if(submitBtn) {
    submitBtn.disabled = !(validation.valid && password && confirm && password === confirm);
  }
}

async function submitPasswordSetup(){
  const username = document.getElementById('setupEmail').value.trim();
  const password = document.getElementById('setupPassword').value;
  const confirmPassword = document.getElementById('setupPasswordConfirm').value;
  
  if(!username || !password || !confirmPassword) {
    showAlert('Campos Obligatorios', 'Por favor completa todos los campos');
    return;
  }
  
  if(password !== confirmPassword) {
    showAlert('Contraseñas No Coinciden', 'Las contraseñas no coinciden');
    return;
  }
  
  const validation = validatePasswordStrength(password);
  if(!validation.valid) {
    showAlert('Contraseña Débil', 'La contraseña no cumple con los requisitos de seguridad');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:5000/api/setup-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, confirmPassword })
    });
    
    const data = await response.json();
    
    if(!response.ok) {
      showAlert('Error', '❌ ' + (data.error || 'Error al configurar contraseña'));
      return;
    }
    
    await showAlert('Éxito', '✓ Contraseña configurada exitosamente. Por favor inicia sesión.');
    hidePasswordSetupModal();
    resetLoginModal();
    showLoginModal();
  } catch (err) {
    console.error('Password setup error:', err);
    await showAlert('Error', '❌ ' + err.message);
  }
}

async function changePassword(){
  const currentPassword = document.getElementById('currentPasswordInput')?.value;
  const newPassword = document.getElementById('newPasswordInput')?.value;
  const confirmPassword = document.getElementById('confirmPasswordInput')?.value;
  
  if(!currentPassword || !newPassword || !confirmPassword) {
    showAlert('Campos Obligatorios', 'Por favor completa todos los campos');
    return;
  }
  
  if(newPassword !== confirmPassword) {
    showAlert('Error', 'Las contraseñas nuevas no coinciden');
    return;
  }
  
  // Validate password strength
  const validation = validatePasswordStrength(newPassword);
  if(!validation.valid) {
    showAlert('Contraseña Débil', 'La nueva contraseña no cumple con los requisitos de seguridad:\n- Mínimo 8 caracteres\n- Una mayúscula\n- Una minúscula\n- Un número\n- Un carácter especial (!@#$%^&*)');
    return;
  }
  
  if(!STATE.authUser || !STATE.authUser.id) {
    showAlert('Error', 'Debes iniciar sesión para cambiar tu contraseña');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:5000/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: STATE.authUser.id, 
        currentPassword, 
        newPassword, 
        confirmPassword 
      })
    });
    
    const data = await response.json();
    
    if(!response.ok) {
      showAlert('Error', data.error || 'Error al cambiar la contraseña');
      return;
    }
    
    await showAlert('Éxito', '✓ Contraseña cambiada exitosamente');
    
    // Clear inputs
    document.getElementById('currentPasswordInput').value = '';
    document.getElementById('newPasswordInput').value = '';
    document.getElementById('confirmPasswordInput').value = '';
    
    pushNotification({title: 'Contraseña actualizada', text: 'Tu contraseña ha sido cambiada exitosamente.'});
  } catch (err) {
    console.error('Change password error:', err);
    showAlert('Error', 'Error al cambiar la contraseña: ' + err.message);
  }
}

function removeUser(id){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Permiso denegado'); return; }
  // Users are now managed only through backend
}

async function login(){
  const u = els.loginUser.value.trim(); 
  const p = els.loginPass.value;
  
  if(!u || !p){ 
    await showAlert('Campos Obligatorios', 'Por favor introduce usuario/email y contraseña'); 
    return; 
  }
  
  try {
    // Try backend authentication first
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    
    const data = await response.json();
    
    if(!response.ok) {
      await showAlert('Error de Autenticación', '❌ ' + (data.error || 'Credenciales inválidas'));
      return;
    }
    
    // Login successful
    STATE.authUser = {
      id: data.user.id, 
      name: data.user.name || u, 
      role: data.user.role || 'agent',
      email: data.user.email
    };
    localStorage.setItem('cw:authUser', JSON.stringify(STATE.authUser));
    
    // Reset login form and go back to step 1
    resetLoginModal();
    if(els.loginModal) hideLoginModal();
    
    // reveal application UI for authenticated users
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    if(sidebar) sidebar.classList.remove('hidden');
    if(main) main.classList.remove('hidden');
    // show dashboard welcome screen by default after login
    openPanel('dashboard');
    refreshAuthUI();
    pushNotification({title:'Sesión iniciada', text: `Hola ${data.user.name || u}`});
  } catch (err) {
    console.error('Login error:', err);
    await showAlert('Error de Conexión', '❌ ' + err.message);
  }
}

async function loginStep1Next(){
  const u = els.loginUser.value.trim();
  
  if(!u) {
    await showAlert('Campo Obligatorio', 'Por favor ingresa un usuario o correo');
    return;
  }
  
  try {
    // Check if user exists and their setup status
    const response = await fetch('http://localhost:5000/api/check-user-setup-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u })
    });
    
    const data = await response.json();
    
    if(!response.ok || !data.userFound) {
      await showAlert('No Encontrado', '❌ Usuario no encontrado');
      return;
    }
    
    // Store username for later use
    STATE.loginUsername = u;
    STATE.userNeedsPasswordSetup = data.needsPasswordSetup;
    
    // Show step 2
    const step1 = document.getElementById('loginStep1');
    const step2 = document.getElementById('loginStep2');
    const userDisplay = document.getElementById('loginUserDisplay');
    
    if(step1) step1.classList.add('hidden');
    if(step2) step2.classList.remove('hidden');
    
    // Display user info
    if(userDisplay) {
      userDisplay.textContent = `Accediendo como: ${data.user.name || data.user.username}`;
    }
    
    if(data.needsPasswordSetup) {
      // Show setup button
      const passwordWrapper = document.getElementById('passwordFieldWrapper');
      const setupWrapper = document.getElementById('setupButtonWrapper');
      if(passwordWrapper) passwordWrapper.classList.add('hidden');
      if(setupWrapper) setupWrapper.classList.remove('hidden');
      
      // Store user info for setup
      STATE.setupUser = data.user;
    } else {
      // Show password field
      const passwordWrapper = document.getElementById('passwordFieldWrapper');
      const setupWrapper = document.getElementById('setupButtonWrapper');
      if(passwordWrapper) passwordWrapper.classList.remove('hidden');
      if(setupWrapper) setupWrapper.classList.add('hidden');
      
      // Focus on password input
      setTimeout(() => {
        const passInput = document.getElementById('loginPass');
        if(passInput) passInput.focus();
      }, 100);
    }
  } catch (err) {
    console.error('Login step 1 error:', err);
    await showAlert('Error', '❌ ' + err.message);
  }
}

function loginStep1Back(){
  const step1 = document.getElementById('loginStep1');
  const step2 = document.getElementById('loginStep2');
  
  if(step1) step1.classList.remove('hidden');
  if(step2) step2.classList.add('hidden');
  
  // Focus back on username
  setTimeout(() => {
    if(els.loginUser) els.loginUser.focus();
  }, 100);
}

function loginGoToSetup(){
  if(!STATE.setupUser) {
    alert('Error: usuario no encontrado');
    return;
  }
  
  // Close login modal and show password setup modal
  hideLoginModal();
  showPasswordSetupModal(STATE.setupUser.username);
}

function resetLoginModal(){
  els.loginUser.value = '';
  els.loginPass.value = '';
  
  const step1 = document.getElementById('loginStep1');
  const step2 = document.getElementById('loginStep2');
  
  if(step1) step1.classList.remove('hidden');
  if(step2) step2.classList.add('hidden');
  
  STATE.loginUsername = null;
  STATE.userNeedsPasswordSetup = false;
  STATE.setupUser = null;
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
  
  // Update profile section
  const profileNameDisplay = document.getElementById('profileNameDisplay');
  const profileRoleDisplay = document.getElementById('profileRoleDisplay');
  const memberSinceDate = document.getElementById('memberSinceDate');
  
  if(user) {
    if(profileNameDisplay) profileNameDisplay.textContent = user.name || user.username || '—';
    if(profileRoleDisplay) {
      // Show role based on user.role
      let roleLabel = 'Usuario';
      if(user.role === 'admin') roleLabel = 'Administrador';
      profileRoleDisplay.textContent = roleLabel;
    }
    if(memberSinceDate) {
      // Show the creation date or today's date
      const createdDate = user.created_at ? new Date(user.created_at) : new Date();
      memberSinceDate.textContent = createdDate.toLocaleDateString('es-ES', {year: 'numeric', month: 'long', day: 'numeric'});
    }
  }
  
  if(els.loginBtn) els.loginBtn.classList.toggle('hidden', !!user);
  if(els.logoutBtn) els.logoutBtn.classList.toggle('hidden', !user);
  // show/hide admin-only UI
  document.querySelectorAll('[data-admin]').forEach(el=>{
    if(user && user.role === 'admin') el.classList.remove('hidden'); else el.classList.add('hidden');
  });
}

// Create new user (admin only) - Backend version
async function createNewUser(){
  const username = document.getElementById('newUserName')?.value?.trim();
  const email = document.getElementById('newUserEmail')?.value?.trim();
  const fullName = document.getElementById('newUserFullName')?.value?.trim();
  const role = document.getElementById('newUserRole')?.value || 'agent';
  
  if(!username || !email || !fullName){
    showAlert('Campos Obligatorios', 'Por favor completa todos los campos (usuario, email, nombre)');
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAlert('Email Inválido', 'Por favor ingresa un correo electrónico válido');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:5000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, role, name: fullName })
    });
    
    const data = await response.json();
    if(!response.ok) throw new Error(data.error || 'Error creating user');
    
    // Build message based on email sent status
    let message = `✓ Usuario "${username}" creado con rol ${role}.\n\n`;
    if(data.emailSent) {
      message += `📧 Email de bienvenida enviado a: ${email}\n\n`;
      message += `El usuario recibirá instrucciones para:\n`;
      message += `1. Acceder a la plataforma\n`;
      message += `2. Configurar su contraseña\n`;
      message += `3. Una descripción completa de cómo funciona Cableworld`;
    } else {
      message += `⚠️ No fue posible enviar el email (posible falta de configuración).\n\n`;
      message += `Usuario: ${username}\n`;
      message += `Email: ${email}\n\n`;
      message += `El usuario puede acceder directamente a la plataforma.`;
    }
    
    alert(message);
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserFullName').value = '';
    refreshUsersList();
  } catch (err) {
    alert('❌ Error: ' + err.message);
    console.error('Error creating user:', err);
  }
}

async function refreshUsersList(){
  try {
    console.log('[refreshUsersList] Fetching users from backend...');
    const response = await fetch('http://localhost:5000/api/users');
    
    if(!response.ok) {
      console.error('[refreshUsersList] Error fetching users:', response.status, response.statusText);
      return;
    }
    
    const users = await response.json();
    console.log('[refreshUsersList] Received users:', users.length);
    
    const usersList = document.getElementById('usersList');
    if(!usersList) {
      console.error('[refreshUsersList] Element #usersList not found in DOM');
      return;
    }
    
    if(users.length === 0) {
      usersList.innerHTML = '<p style="color:var(--cw-text-muted);font-size:13px">No hay usuarios registrados</p>';
      return;
    }
    
    let html = '<div style="display:flex;flex-direction:column;gap:8px">';
    users.forEach((user, index) => {
      const hasPassword = user.passwordSet === 1 || user.passwordSet === true;
      const emailDisplay = user.email ? user.email : '(sin email)';
      const passwordStatus = hasPassword ? '✓ Contraseña configurada' : '⚠ Pendiente de configurar';
      const passwordColor = hasPassword ? '#44aa44' : '#ff9944';
      
      // Verificar si es la propia cuenta del usuario logueado
      const isOwnAccount = STATE.authUser && STATE.authUser.id === user.id;
      console.log('[refreshUsersList] User:', user.username, 'isOwn:', isOwnAccount, 'authId:', STATE.authUser?.id, 'userId:', user.id);
      
      // Botón de eliminar: solo si NO es su propia cuenta
      let deleteButton = '';
      if(!isOwnAccount) {
        deleteButton = `<button class="secondary small-btn" id="deleteBtn-${index}" data-user-id="${user.id}" data-user-name="${user.name || user.username}" title="Eliminar usuario">✕</button>`;
      } else {
        deleteButton = `<span style="color:var(--cw-text-muted);font-size:11px;padding:4px 8px">(Tu cuenta)</span>`;
      }
      
      html += `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--cw-surface-dark);border-radius:4px;font-size:13px">
          <div style="flex:1">
            <strong>${user.name || user.username}</strong>
            <div style="color:var(--cw-text-muted);font-size:11px">${emailDisplay} • ${user.role}</div>
            <div style="color:${passwordColor};font-size:11px">
              ${passwordStatus}
            </div>
          </div>
          ${deleteButton}
        </div>
      `;
    });
    html += '</div>';
    usersList.innerHTML = html;
    
    // Agregar event listeners a los botones después de renderizar
    users.forEach((user, index) => {
      const isOwnAccount = STATE.authUser && STATE.authUser.id === user.id;
      if(!isOwnAccount) {
        const btn = document.getElementById(`deleteBtn-${index}`);
        if(btn) {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.dataset.userId;
            const userName = this.dataset.userName;
            deleteUserFromBackend(userId, userName);
          });
        }
      }
    });
    
    console.log('[refreshUsersList] ✓ Users list rendered successfully');
  } catch (err) {
    console.error('[refreshUsersList] Error:', err);
  }
}

async function deleteUserFromBackend(userId, userName){
  const confirmMessage = `Esta acción es irreversible. Todos los datos de este usuario se eliminarán permanentemente.`;
  
  // Primera confirmación con custom dialog
  const firstConfirm = await showConfirm('Eliminar usuario', `¿Deseas eliminar a "${userName}"?\n\n${confirmMessage}`);
  if(!firstConfirm) return;
  
  // Segunda confirmación para mayor seguridad
  const secondConfirm = await showConfirm('⚠️ ÚLTIMA CONFIRMACIÓN', `¿Estás completamente seguro de que deseas eliminar a ${userName}?\n\nEsta acción NO se puede deshacer.`);
  if(!secondConfirm) return;
  
  try {
    const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
      method: 'DELETE'
    });
    
    if(!response.ok) {
      const data = await response.json();
      await showAlert('Error al eliminar', '❌ ' + (data.error || 'No se pudo eliminar el usuario'));
      return;
    }
    
    await showAlert('Éxito', `✓ Usuario "${userName}" eliminado correctamente`);
    refreshUsersList();
  } catch (err) {
    await showAlert('Error', '❌ Error: ' + err.message);
    console.error('Error deleting user:', err);
  }
}

// Change user role

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
  
  // Delete from database
  api.deleteManual(id).then(result => {
    // update state and UI
    STATE.manuals = STATE.manuals.filter(m=>m.id !== id);
    
    // Remove from history if it was there
    STATE.history = STATE.history.filter(h => h.id !== id);
    localStorage.setItem('cw:history', JSON.stringify(STATE.history));
    
    // Close the editor modal
    if (els.manualEditorModal) {
      els.manualEditorModal.classList.add('hidden');
    }
    
    // If the deleted manual was the currently open one, close it
    if (STATE.current && STATE.current.id === id) {
      STATE.current = null;
      // Hide manual view and show manuals list instead
      if (els.manualView) els.manualView.classList.add('hidden');
      const ml = document.getElementById('manualsListView'); 
      if (ml) ml.classList.remove('hidden');
    }
    
    renderManualsList(STATE.manuals);
    renderHistory();
    pushNotification({title: 'Manual eliminado', text: id});
  }).catch(err => {
    console.error('Error eliminando manual:', err);
    alert('Error eliminando manual: ' + err.message);
  });
}

// Editor helpers
function renderEditorSteps(steps){
  if(!els.editStepsList) return;
  els.editStepsList.innerHTML = '';
  (steps||[]).forEach((s, idx)=>{
    const row = document.createElement('div'); row.style.display='flex'; row.style.gap='8px'; row.style.alignItems='flex-start';
    const title = document.createElement('input'); title.className='input-field'; title.placeholder = 'Título del paso'; title.value = s.title || '';
    title.style.flex = '0 0 220px';
    const content = document.createElement('textarea'); content.className='input-field'; content.style.flex = '1'; content.style.minHeight='70px'; content.value = s.content || '';
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
    revert.addEventListener('click', async ()=>{ if(await showConfirm('Revertir versión', '¿Revertir a esta versión del manual?')) revertToVersion(manualId, idx); });
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

// Edit step modal for admins
function openEditStepModal(manual, stepIdx, step) {
  // Normalize: ensure manual has 'steps' field
  if (!manual.steps && manual.content) {
    manual.steps = manual.content;
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.zIndex = '1000';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:700px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <h3 style="margin:0;font-size:20px">Editar Paso ${stepIdx + 1}</h3>
        <button class="close" aria-label="Cerrar" style="position:absolute;top:12px;right:12px;background:transparent;border:none;font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div>
          <label style="display:block;margin-bottom:8px;font-weight:600;font-size:13px;color:var(--cw-text-muted)">Título del paso</label>
          <input type="text" id="editStepTitle" class="input-field" style="width:100%;padding:10px" />
        </div>
        <div>
          <label style="display:block;margin-bottom:8px;font-weight:600;font-size:13px;color:var(--cw-text-muted)">Contenido (HTML permitido)</label>
          <textarea id="editStepContent" class="input-field" style="width:100%;min-height:150px;padding:10px;font-family:monospace;font-size:12px"></textarea>
        </div>
        <div>
          <label style="display:block;margin-bottom:8px;font-weight:600;font-size:13px;color:var(--cw-text-muted)">Imagen</label>
          <div style="display:flex;gap:16px;align-items:flex-start">
            <div style="flex:1">
              <input type="file" id="editStepImage" accept="image/*" class="input-field" style="width:100%;padding:8px" />
            </div>
            <div id="editStepImagePreview" style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:140px">
              <img id="editStepImageImg" style="max-width:140px;max-height:120px;border-radius:8px;border:1px solid var(--cw-border);display:none;object-fit:cover" />
              <button type="button" id="editStepImageClear" class="secondary" style="display:none;font-size:11px;padding:6px 10px">Quitar</button>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:16px;border-top:1px solid var(--cw-border)">
          <button type="button" id="editStepCancel" class="secondary">Cancelar</button>
          <button type="button" id="editStepSave" class="primary">Guardar cambios</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // CRITICAL: Prevent modal from closing on overlay click by blocking the click event
  modal.addEventListener('click', (e) => {
    // If clicking on the overlay (the modal div itself, not modal-content)
    if (e.target === modal) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  }, true); // Use capture phase to intercept before other handlers
  
  // Wire elements
  const titleInput = document.getElementById('editStepTitle');
  const contentInput = document.getElementById('editStepContent');
  const imageInput = document.getElementById('editStepImage');
  const imageImg = document.getElementById('editStepImageImg');
  const imageClearBtn = document.getElementById('editStepImageClear');
  const saveBtn = document.getElementById('editStepSave');
  const cancelBtn = document.getElementById('editStepCancel');
  const closeBtn = modal.querySelector('.close');
  
  // Populate fields
  titleInput.value = step.title || '';
  contentInput.value = step.content || '';
  let currentImage = step.image || null;
  
  if (currentImage) {
    imageImg.src = currentImage;
    imageImg.style.display = 'block';
    imageClearBtn.style.display = 'block';
  }
  
  // Image upload handler
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentImage = reader.result;
      imageImg.src = currentImage;
      imageImg.style.display = 'block';
      imageClearBtn.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });
  
  // Clear image
  imageClearBtn.addEventListener('click', () => {
    currentImage = null;
    imageImg.style.display = 'none';
    imageClearBtn.style.display = 'none';
    imageInput.value = '';
  });
  
  // Save
  saveBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    
    if (!title) {
      alert('El título es obligatorio');
      return;
    }
    
    if (!content) {
      alert('El contenido es obligatorio');
      return;
    }
    
    // Update step
    manual.steps[stepIdx] = {
      ...manual.steps[stepIdx],
      title,
      content,
      image: currentImage
    };
    
    // Save to backend
    try {
      await api.updateManual(manual.id, manual);
      
      // Update STATE.current and STATE.manuals to reflect changes
      STATE.current = manual;
      const idx = STATE.manuals.findIndex(m => m.id === manual.id);
      if (idx !== -1) {
        STATE.manuals[idx] = manual;
      }
      
      pushNotification({title: 'Paso actualizado', text: 'Los cambios se han guardado'});
      modal.remove();
      renderSteps(manual);
    } catch (err) {
      alert('Error guardando cambios: ' + err.message);
    }
  });
  
  // Cancel/Close
  const closeModal = () => modal.remove();
  cancelBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
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

function openManageCategoriesModal(){
  // Check if admin
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ 
    alert('Solo administradores pueden gestionar categorías.'); 
    return; 
  }
  
  // Get all unique categories from manuals
  const categories = new Set();
  STATE.manuals.forEach(m => {
    if(m.category) categories.add(m.category);
  });
  
  const catArray = Array.from(categories).sort();
  
  // Create modal dynamically
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('data-manage-categories', 'true');
  modal.role = 'dialog';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 800px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--cw-border); padding-bottom: 12px; margin-bottom: 16px;">
        <h4 style="margin: 0; color: var(--cw-text);">Gestionar categorías</h4>
        <button class="close" style="background: none; border: none; cursor: pointer; color: var(--cw-text-muted); font-size: 20px; padding: 0; width: auto; height: auto;">×</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px; max-height: 550px; overflow-y: auto;">
        <div style="padding: 12px; background: rgba(255,193,7,0.1); border-radius: 6px; font-size: 13px; color: var(--cw-text-muted);">
          📝 Arrastra manuales entre categorías para reasignarlos. Las categorías se crean automáticamente al asignarlas a un manual.
        </div>
        <div id="categoriesContainer" style="display: flex; flex-direction: column; gap: 16px;"></div>
      </div>
      <div style="border-top: 1px solid var(--cw-border); padding-top: 16px; margin-top: 16px;">
        <button class="primary" style="width: 100%; padding: 10px; border-radius: 6px; cursor: pointer;" onclick="this.closest('.modal').remove();">Cerrar</button>
      </div>
    </div>
  `;
  
  // Populate categories with drag and drop
  const catContainer = modal.querySelector('#categoriesContainer');
  if(catArray.length === 0) {
    catContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--cw-text-muted);">No hay categorías aún</div>';
  } else {
    catArray.forEach(cat => {
      const manualsInCat = STATE.manuals.filter(m => m.category === cat);
      const count = manualsInCat.length;
      
      // Category section
      const catSection = document.createElement('div');
      catSection.style.cssText = `
        padding: 12px;
        background: var(--cw-surface);
        border: 2px solid var(--cw-border);
        border-radius: 8px;
        transition: all 0.2s ease;
      `;
      
      catSection.innerHTML = `
        <div style="font-weight: 600; color: var(--cw-text); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <span>${escapeHtml(cat)}</span>
          <span style="font-size: 12px; color: var(--cw-text-muted); background: rgba(255,128,51,0.1); padding: 2px 8px; border-radius: 4px;">${count} manual${count !== 1 ? 'es' : ''}</span>
        </div>
        <div class="category-manuals" style="display: flex; flex-direction: column; gap: 6px; min-height: 40px; padding: 6px; border: 1px dashed var(--cw-border); border-radius: 6px; background: rgba(255,255,255,0.5);"></div>
      `;
      
      const manualsDiv = catSection.querySelector('.category-manuals');
      
      // Add manual items with drag functionality
      manualsInCat.forEach(manual => {
        const manualItem = document.createElement('div');
        manualItem.draggable = true;
        manualItem.dataset.manualId = manual.id;
        manualItem.dataset.manualTitle = manual.title;
        manualItem.dataset.currentCategory = cat;
        manualItem.style.cssText = `
          padding: 8px 10px;
          background: linear-gradient(135deg, var(--cw-primary-light), var(--cw-primary));
          color: white;
          border-radius: 4px;
          cursor: move;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
          user-select: none;
        `;
        manualItem.textContent = manual.title;
        
        // Drag events
        manualItem.addEventListener('dragstart', (e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('manualId', manual.id);
          e.dataTransfer.setData('currentCategory', cat);
          manualItem.style.opacity = '0.6';
        });
        
        manualItem.addEventListener('dragend', (e) => {
          manualItem.style.opacity = '1';
        });
        
        manualsDiv.appendChild(manualItem);
      });
      
      // Drop events for category
      manualsDiv.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        manualsDiv.style.backgroundColor = 'rgba(255,128,51,0.15)';
        manualsDiv.style.borderColor = 'var(--cw-primary)';
      });
      
      manualsDiv.addEventListener('dragleave', (e) => {
        if (e.target === manualsDiv) {
          manualsDiv.style.backgroundColor = 'rgba(255,255,255,0.5)';
          manualsDiv.style.borderColor = 'var(--cw-border)';
        }
      });
      
      manualsDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        const manualId = e.dataTransfer.getData('manualId');
        const oldCategory = e.dataTransfer.getData('currentCategory');
        
        if (oldCategory !== cat && manualId) {
          // Find and update the manual
          const manual = STATE.manuals.find(m => m.id === manualId);
          if (manual) {
            const oldCat = manual.category;
            manual.category = cat;
            
            // Save to backend
            fetch(`http://localhost:5000/api/manuals/${manualId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: manual.title,
                category: cat,
                role: manual.role,
                type: manual.type,
                summary: manual.summary,
                version: manual.version,
                tags: manual.tags,
                steps: manual.steps,
                versions: manual.versions
              })
            }).then(r => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.json();
            })
            .then(data => {
              // Backend devuelve el manual actualizado o un objeto vacío
              if (data && (data.id || data.title)) {
                // Actualizar STATE.manuals con los datos del servidor
                const idx = STATE.manuals.findIndex(m => m.id === manualId);
                if (idx !== -1) {
                  STATE.manuals[idx] = {
                    ...STATE.manuals[idx],
                    category: cat
                  };
                }
                // Cerrar solo el modal de gestión de categorías (modal dinámico)
                document.querySelectorAll('.modal[data-manage-categories]').forEach(m => m.remove());
                // Re-renderizar la lista de manuales para reflejar el cambio
                renderManualsList(STATE.manuals);
                // Esperar un poco antes de recargar el modal de gestión
                setTimeout(() => {
                  openManageCategoriesModal();
                }, 300);
              } else {
                alert('Error: No se pudo actualizar la categoría');
                manual.category = oldCat;
              }
            })
            .catch(err => {
              console.error('Error al actualizar:', err);
              alert('Error: ' + err.message);
              manual.category = oldCat;
            });
          }
        }
        
        manualsDiv.style.backgroundColor = 'rgba(255,255,255,0.5)';
        manualsDiv.style.borderColor = 'var(--cw-border)';
      });
      
      catContainer.appendChild(catSection);
    });
  }
  
  // Close button handler
  const closeBtn = modal.querySelector('.close');
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); modal.remove(); });
  
  // CRITICAL: Prevent modal from closing on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  }, true); // Use capture phase
  
  document.body.appendChild(modal);
  modal.classList.remove('hidden');
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
  
  // Save to backend API only (no localStorage)
  (async () => {
    try {
      const result = await api.createManual(manual);
      console.debug('[saveNewManual] Manual guardado en API:', result);
      
      STATE.manuals.push(manual);
      const modal = document.getElementById('newManualModal'); 
      if(modal) { 
        modal.classList.add('hidden');
        console.debug('[saveNewManual] Modal cerrado');
      }
      renderManualsList(STATE.manuals);
      console.debug('[saveNewManual] ✓ Manual guardado correctamente');
      pushNotification({title:'Manual creado', text: title});
    } catch (err) {
      console.error('[saveNewManual] Error guardando en API:', err);
      alert('Error guardando manual: ' + err.message);
    }
  })();
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
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); modal.remove(); });
  
  // CRITICAL: Prevent modal from closing on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  }, true); // Use capture phase
  
  document.body.appendChild(modal);
}

function importManuals(){
  if(!(STATE.authUser && STATE.authUser.role === 'admin')){ alert('Solo administradores pueden importar manuales.'); return; }
  // Use file picker to import
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        const arr = Array.isArray(data) ? data : (data.manuals ? data.manuals : [data]);
        if(!Array.isArray(arr) || arr.length === 0) {
          alert('Archivo JSON inválido o vacío');
          return;
        }
        // Import all manuals to database
        const newManuals = [];
        for (const m of arr) {
          if(!m.id) m.id = 'import-'+Date.now()+'-'+Math.floor(Math.random()*1000);
          if(!STATE.manuals.find(x => x.id === m.id)) {
            try {
              await api.createManual(m);
              STATE.manuals.push(m);
              newManuals.push(m);
            } catch (err) {
              console.error('Error importando manual:', err);
            }
          }
        }
        renderManualsList(STATE.manuals);
        pushNotification({title:'Importación completada', text: `${newManuals.length} manual(es) importado(s)`});
      } catch(err) {
        alert('Error al importar: ' + err.message);
      }
    };
    reader.readAsText(file);
  });
  fileInput.click();
}

// Process PDF file and extract steps
function processPdfFile(file) {
  const statusDiv = document.getElementById('pdfStatus');
  if(!statusDiv) return;
  
  statusDiv.style.display = 'block';
  statusDiv.textContent = '⏳ Procesando PDF...';
  statusDiv.style.color = 'var(--cw-text-muted)';
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      // Use PDF.js to extract text
      const pdf = await pdfjsLib.getDocument({data: e.target.result}).promise;
      let fullText = '';
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      // Try to detect steps by looking for common patterns
      const stepPatterns = [
        /paso\s+\d+[:\s]+(.*?)(?=paso\s+\d+|$)/gi,
        /step\s+\d+[:\s]+(.*?)(?=step\s+\d+|$)/gi,
        /^\d+\.\s+(.*?)(?=^\d+\.|$)/gm
      ];
      
      let steps = [];
      for (const pattern of stepPatterns) {
        const matches = fullText.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[1].trim().length > 10) {
            steps.push({
              title: `Paso ${steps.length + 1}`,
              content: match[1].trim().substring(0, 500)
            });
          }
        }
        if (steps.length > 0) break;
      }
      
      // If no structured steps found, split by paragraphs
      if (steps.length === 0) {
        const paragraphs = fullText.split(/\n\n+/).filter(p => p.trim().length > 20);
        steps = paragraphs.slice(0, 10).map((para, i) => ({
          title: `Paso ${i + 1}`,
          content: para.trim().substring(0, 500)
        }));
      }
      
      // Auto-fill the manual form
      const titleInput = document.getElementById('newTitle');
      const editorDiv = document.getElementById('newStepsEditor');
      
      if(titleInput && !titleInput.value) {
        titleInput.value = file.name.replace('.pdf', '').substring(0, 100);
      }
      
      if(editorDiv) {
        editorDiv.innerHTML = '';
        steps.forEach(step => {
          const row = document.createElement('div');
          row.className = 'step-editor-row panel';
          row.style.cssText = 'display:flex;flex-direction:column;gap:12px;padding:16px;border-left:4px solid var(--cw-primary)';
          
          row.innerHTML = `
            <div style="display:flex;gap:8px">
              <input class="input-field" style="flex:1" placeholder="Título del paso" value="${escapeHtml(step.title)}" data-step-title="true">
              <button type="button" class="secondary" style="white-space:nowrap;padding:6px 12px;font-size:12px">Eliminar</button>
            </div>
            <textarea class="input-field" style="min-height:90px;font-family:monospace;font-size:12px" placeholder="Contenido del paso" data-step-content="true">${escapeHtml(step.content)}</textarea>
          `;
          
          row.querySelector('button').addEventListener('click', () => row.remove());
          editorDiv.appendChild(row);
        });
      }
      
      statusDiv.textContent = `✓ PDF procesado: ${steps.length} pasos detectados`;
      statusDiv.style.color = 'var(--cw-success)';
      setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
    } catch (err) {
      console.error('Error procesando PDF:', err);
      statusDiv.textContent = `❌ Error: ${err.message}`;
      statusDiv.style.color = 'var(--cw-danger)';
    }
  };
  reader.readAsArrayBuffer(file);
}

// Process JSON file for import
function processJsonFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      // Support both single manual and array of manuals
      const manual = Array.isArray(data) ? data[0] : data;
      
      if (!manual || !manual.title) {
        alert('Formato JSON inválido. Debe contener al menos un manual con "title"');
        return;
      }
      
      // Auto-fill the form
      const titleInput = document.getElementById('newTitle');
      const summaryInput = document.getElementById('newSummary');
      const versionInput = document.getElementById('newVersion');
      const editorDiv = document.getElementById('newStepsEditor');
      
      if(titleInput) titleInput.value = manual.title || '';
      if(summaryInput) summaryInput.value = manual.summary || '';
      if(versionInput) versionInput.value = manual.version || '1.0.0';
      
      if(editorDiv && manual.steps && Array.isArray(manual.steps)) {
        editorDiv.innerHTML = '';
        manual.steps.forEach(step => {
          const row = document.createElement('div');
          row.className = 'step-editor-row panel';
          row.style.cssText = 'display:flex;flex-direction:column;gap:12px;padding:16px;border-left:4px solid var(--cw-primary)';
          
          row.innerHTML = `
            <div style="display:flex;gap:8px">
              <input class="input-field" style="flex:1" placeholder="Título del paso" value="${escapeHtml(step.title || '')}" data-step-title="true">
              <button type="button" class="secondary" style="white-space:nowrap;padding:6px 12px;font-size:12px">Eliminar</button>
            </div>
            <textarea class="input-field" style="min-height:90px;font-family:monospace;font-size:12px" placeholder="Contenido del paso" data-step-content="true">${escapeHtml(step.content || '')}</textarea>
          `;
          
          row.querySelector('button').addEventListener('click', () => row.remove());
          editorDiv.appendChild(row);
        });
        
        const statusDiv = document.getElementById('pdfStatus');
        if(statusDiv) {
          statusDiv.style.display = 'block';
          statusDiv.textContent = `✓ JSON importado: ${manual.steps.length} pasos cargados`;
          statusDiv.style.color = 'var(--cw-success)';
          setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
        }
      }
    } catch (err) {
      console.error('Error importando JSON:', err);
      alert(`Error: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

// ==================== FIBRA/DIAGRAMS FUNCTIONS ====================

async function loadDiagrams() {
  console.log('🟢 [LOAD] loadDiagrams() LLAMADA');
  try {
    // Load from backend (PRIMARY STORAGE for all users)
    try {
      const response = await fetch('http://localhost:5000/api/diagrams');
      if (response.ok) {
        const diagrams = await response.json();
        console.log('🟢 [LOAD] Backend devolvió:', diagrams.length, 'diagramas');
        STATE.fibraDiagrams = diagrams;
        renderDiagramsList(diagrams || []);
        console.log(`✓ Diagramas cargados desde backend (${diagrams.length} items)`);
        return;
      }
    } catch (err) {
      console.warn('⚠️ Error intentando cargar del backend: ' + err.message);
    }
    
    // Fallback: load from localStorage only if backend is unavailable
    console.log('🟢 [LOAD] Backend no disponible, usando localStorage como fallback');
    const cached = JSON.parse(localStorage.getItem('cw:fibraDiagrams') || '[]');
    console.log('🟢 [LOAD] localStorage contiene:', cached.length, 'diagramas');
    STATE.fibraDiagrams = cached;
    renderDiagramsList(cached);
    console.log(`✓ Diagramas cargados desde localStorage (${cached.length} items)`);
    
  } catch (err) {
    console.error('Error loading diagrams:', err);
    renderDiagramsList([]);
  }
}

function renderDiagramsList(diagrams) {
  console.log('🟣 [RENDER] renderDiagramsList() LLAMADA');
  console.log('🟣 [RENDER] Recibió', diagrams?.length, 'diagramas');
  console.log('🟣 [RENDER] Contenido:', diagrams);
  const container = document.getElementById('diagramsList');
  const countEl = document.getElementById('diagramsCount');
  const isAdmin = STATE.authUser && STATE.authUser.role === 'admin';
  
  if (!container) {
    console.error('🟣 [RENDER] ERROR: No hay container #diagramsList');
    return;
  }
  console.log('🟣 [RENDER] Container encontrado, isAdmin:', isAdmin);
  
  if (countEl) countEl.textContent = diagrams.length;
  
  container.innerHTML = '';
  
  if (!diagrams || diagrams.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;padding:60px 40px;text-align:center;color:var(--cw-text-muted)"><div style="font-size:48px;margin-bottom:16px">🌳</div><p style="font-size:15px;line-height:1.6">No hay árboles de decisión aún.<br><strong style="color:var(--cw-text)">Crea uno para comenzar</strong></p></div>';
    return;
  }
  
  // Apply saved order from localStorage
  const savedOrder = JSON.parse(localStorage.getItem('cw:diagramsOrder') || '[]');
  if (savedOrder.length > 0) {
    // Sort diagrams according to saved order
    diagrams.sort((a, b) => {
      const aIndex = savedOrder.indexOf(a.id);
      const bIndex = savedOrder.indexOf(b.id);
      // If a diagram is not in saved order, put it at the end
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    console.log('🟣 [RENDER] Aplicado orden personalizado desde localStorage');
  }
  
  diagrams.forEach(diagram => {
    console.log('🟣 [RENDER] Renderizando diagrama:', diagram.id, diagram.title);
    console.log('🟣 [RENDER] rootNode existe?', !!diagram.rootNode);
    console.log('🟣 [RENDER] Contenido del diagrama:', diagram);
    const card = document.createElement('div');
    card.className = 'diagram-card';
    card.draggable = isAdmin; // Solo admins pueden arrastrar
    card.dataset.diagramId = diagram.id;
    card.style.cssText = `
      background:linear-gradient(135deg, var(--cw-surface) 0%, var(--cw-bg) 100%);
      border:2px solid var(--cw-border);
      border-radius:16px;
      padding:28px;
      cursor:pointer;
      transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display:flex;
      flex-direction:column;
      gap:18px;
      position:relative;
      overflow:hidden;
      box-shadow:0 2px 8px rgba(0,0,0,0.05);
      ${isAdmin ? '' : 'opacity: 0.95;'}
    `;
    
    // Agregar pseudo-elemento de gradiente on hover
    card.onmouseover = () => {
      card.style.borderColor = 'var(--cw-primary)';
      card.style.boxShadow = '0 10px 28px rgba(255, 128, 51, 0.2)';
      card.style.transform = 'translateY(-4px)';
    };
    card.onmouseout = () => {
      card.style.borderColor = 'var(--cw-border)';
      card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
      card.style.transform = 'translateY(0)';
    };
    
    // Count nodes recursively for hierarchical structure
    const countNodes = (node) => {
      if (!node) return 0;
      let count = 1;
      if (node.options && Array.isArray(node.options)) {
        node.options.forEach(opt => {
          if (opt.node) count += countNodes(opt.node);
        });
      }
      return count;
    };
    
    // Count solutions recursively
    const countSolutions = (node) => {
      if (!node) return 0;
      let count = node.type === 'solution' ? 1 : 0;
      if (node.options && Array.isArray(node.options)) {
        node.options.forEach(opt => {
          if (opt.node) count += countSolutions(opt.node);
        });
      }
      return count;
    };
    
    const nodeCount = diagram.rootNode ? countNodes(diagram.rootNode) : 0;
    const solutionCount = diagram.rootNode ? countSolutions(diagram.rootNode) : 0;
    
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
        <div style="flex:1">
          <h3 style="margin:0 0 14px 0;font-size:20px;font-weight:800;color:var(--cw-text);line-height:1.3;letter-spacing:-0.5px">🌳 ${escapeHtml(diagram.title)}</h3>
          <div style="display:flex;gap:20px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--cw-text-muted);font-weight:600">
              <span style="font-size:16px">📊</span>
              <span>${nodeCount} <span style="color:var(--cw-text)">nodos</span></span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--cw-text-muted);font-weight:600">
              <span style="font-size:16px">✅</span>
              <span>${solutionCount} <span style="color:var(--cw-text)">soluciones</span></span>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="diagram-view-btn" data-id="${diagram.id}" style="background:linear-gradient(135deg, #10b981, #059669);color:white;border:none;border-radius:10px;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;transition:all 0.3s;font-weight:700;box-shadow:0 2px 8px rgba(16, 185, 129, 0.3)" title="Ver este árbol" onmouseover="this.style.transform='scale(1.1)';this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.5)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 2px 8px rgba(16, 185, 129, 0.3)'">👁️</button>
          ${isAdmin ? `
            <button class="diagram-edit-btn" data-id="${diagram.id}" style="background:linear-gradient(135deg, var(--cw-primary), var(--cw-secondary));color:white;border:none;border-radius:10px;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;transition:all 0.3s;font-weight:700;box-shadow:0 2px 8px rgba(255, 128, 51, 0.3)" title="Editar este árbol" onmouseover="this.style.transform='scale(1.1)';this.style.boxShadow='0 4px 12px rgba(255, 128, 51, 0.5)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 2px 8px rgba(255, 128, 51, 0.3)'">✏️</button>
            <button class="diagram-delete-btn" data-id="${diagram.id}" style="background:linear-gradient(135deg, #ef4444, #dc2626);color:white;border:none;border-radius:10px;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;transition:all 0.3s;font-weight:700;box-shadow:0 2px 8px rgba(239, 68, 68, 0.3)" title="Eliminar este árbol" onmouseover="this.style.transform='scale(1.1)';this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.5)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 2px 8px rgba(239, 68, 68, 0.3)'">🗑️</button>
          ` : ''}
        </div>
      </div>
      <p style="margin:0;font-size:13px;color:var(--cw-text-muted);line-height:1.6;padding-top:12px;border-top:1px solid var(--cw-border);font-weight:600">📌 ${isAdmin ? '👁️ Ver • ✏️ Editar • Arrastra para reorganizar' : '👁️ Haz clic para ver detalle'}</p>
    `;
    
    // Click handler para abrir
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        openDiagramViewer(diagram);
      }
    });
    
    // View button (para todos)
    card.querySelector('.diagram-view-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showDiagramViewer(diagram);
    });
    
    // Edit button (solo para admins)
    if (isAdmin) {
      card.querySelector('.diagram-edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openDiagramEditor(diagram);
      });
      
      // Delete button (solo para admins)
      card.querySelector('.diagram-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteDiagram(diagram.id);
      });
    }
    
    container.appendChild(card);
  });
  
  // Setup drag/drop reordering (solo para admins)
  if (isAdmin) {
    let draggedCardId = null;
    let draggedElement = null;
    
    // Setup draggable on all cards
    const cards = container.querySelectorAll('.diagram-card');
    cards.forEach((card, idx) => {
      card.draggable = true;
      
      card.addEventListener('dragstart', (e) => {
        draggedElement = card;
        draggedCardId = card.dataset.diagramId;
        card.classList.add('dragging');
        card.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedCardId);
        setTimeout(() => {
          card.style.visibility = 'hidden';
        }, 0);
      });
      
      card.addEventListener('dragend', (e) => {
        card.classList.remove('dragging');
        card.style.opacity = '1';
        card.style.visibility = 'visible';
        document.querySelectorAll('.diagram-card').forEach(c => {
          c.classList.remove('drag-over');
          c.style.borderTop = '';
        });
        draggedElement = null;
        draggedCardId = null;
        
        // Save new order to localStorage
        const newOrder = Array.from(container.querySelectorAll('.diagram-card')).map(c => c.dataset.diagramId);
        localStorage.setItem('cw:diagramsOrder', JSON.stringify(newOrder));
        console.log('✓ Orden de diagramas guardado:', newOrder);
      });
      
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (card !== draggedElement) {
          card.classList.add('drag-over');
        }
      });
      
      card.addEventListener('dragleave', (e) => {
        card.classList.remove('drag-over');
      });
      
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedElement && draggedElement !== card) {
          // Get positions
          const allCards = Array.from(container.querySelectorAll('.diagram-card'));
          const draggedIndex = allCards.indexOf(draggedElement);
          const targetIndex = allCards.indexOf(card);
          
          // Swap positions
          if (draggedIndex < targetIndex) {
            card.parentNode.insertBefore(draggedElement, card.nextSibling);
          } else {
            card.parentNode.insertBefore(draggedElement, card);
          }
        }
        card.classList.remove('drag-over');
      });
    });
  }
  
  console.log('🟣 [RENDER] renderDiagramsList COMPLETADO');
}

function openNewDiagramModal() {
  try {
    // Check permissions
    if (!(STATE.authUser && STATE.authUser.role === 'admin')) {
      alert('⛔ Solo administradores pueden crear árboles de decisión');
      return;
    }
    
    // Create wizard modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(5px);overflow-y:auto;padding:20px';
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width:700px;width:100%;background:var(--cw-surface);border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,0.4);overflow:hidden;display:flex;flex-direction:column;max-height:90vh;border:1px solid var(--cw-border)">
        <!-- Header -->
        <div style="background:linear-gradient(135deg, #10b981 0%, #059669 100%);color:white;padding:32px;border-bottom:1px solid rgba(16, 185, 129, 0.3)">
          <h2 style="margin:0 0 8px 0;font-size:26px;font-weight:800">✨ Crear Nuevo Árbol</h2>
          <div style="font-size:14px;opacity:0.9">Paso a paso - Es muy fácil</div>
        </div>
        
        <!-- Content -->
        <div style="flex:1;overflow-y:auto;padding:32px;display:flex;flex-direction:column;gap:24px">
          <!-- Step 1: Title -->
          <div style="display:flex;flex-direction:column;gap:12px">
            <label style="font-size:14px;font-weight:700;color:var(--cw-text);display:flex;align-items:center;gap:8px"><span style="background:linear-gradient(135deg, #10b981, #059669);color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">1</span> ¿Cuál es el nombre del árbol?</label>
            <input type="text" id="newDiagramTitle" maxlength="100" placeholder="Ej: Solución de problemas con internet" style="padding:14px 16px;border:2px solid var(--cw-border);border-radius:10px;background:var(--cw-surface);color:var(--cw-text);font-family:var(--font-stack);font-size:15px;transition:all 0.3s" onmouseover="this.style.borderColor='#10b981'" onmouseout="this.style.borderColor='var(--cw-border)'">
            <div style="font-size:12px;color:var(--cw-text-muted)">💡 Usa un nombre descriptivo que explique el propósito del árbol (máx. 100 caracteres)</div>
          </div>
          
          <!-- Step 2: Initial Question -->
          <div style="display:flex;flex-direction:column;gap:12px">
            <label style="font-size:14px;font-weight:700;color:var(--cw-text);display:flex;align-items:center;gap:8px"><span style="background:linear-gradient(135deg, #10b981, #059669);color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">2</span> ¿Cuál es la pregunta inicial?</label>
            <textarea id="newDiagramRootQuestion" maxlength="500" placeholder="Ej: ¿El router está encendido?" style="padding:14px 16px;border:2px solid var(--cw-border);border-radius:10px;background:var(--cw-surface);color:var(--cw-text);font-family:var(--font-stack);font-size:15px;min-height:80px;resize:vertical;transition:all 0.3s" onmouseover="this.style.borderColor='#10b981'" onmouseout="this.style.borderColor='var(--cw-border)'"></textarea>
            <div style="font-size:12px;color:var(--cw-text-muted)">❓ Esta será la primera pregunta que verán los usuarios (máx. 500 caracteres)</div>
          </div>
          
          <!-- Info Box -->
          <div style="background:linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));border-left:4px solid #10b981;padding:16px;border-radius:10px">
            <div style="font-weight:700;color:var(--cw-text);margin-bottom:6px">📌 Después de crear...</div>
            <div style="font-size:13px;color:var(--cw-text-muted);line-height:1.6">Podrás agregar más preguntas, soluciones y conectarlas. La interfaz de edición es visual e intuitiva.</div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background:var(--cw-bg);border-top:2px solid var(--cw-border);padding:20px 32px;display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap">
          <button class="cancel" style="padding:12px 24px;cursor:pointer;border:2px solid var(--cw-border);background:var(--cw-surface);border-radius:10px;font-weight:600;font-family:var(--font-stack);transition:all 0.3s;color:var(--cw-text)" onmouseover="this.style.background='var(--cw-bg)'" onmouseout="this.style.background='var(--cw-surface)'">Cancelar</button>
          <button id="createDiagramWizardBtn" style="padding:12px 28px;cursor:pointer;background:linear-gradient(135deg, #10b981, #059669);color:white;border:none;border-radius:10px;font-weight:700;font-family:var(--font-stack);transition:all 0.3s;box-shadow:0 4px 12px rgba(16, 185, 129, 0.3)" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(16, 185, 129, 0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'">Crear 🎉</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cancel button
    modal.querySelector('.cancel').addEventListener('click', () => modal.remove());
    
    // Create button with validation
    modal.querySelector('#createDiagramWizardBtn').addEventListener('click', async () => {
      try {
        const title = modal.querySelector('#newDiagramTitle')?.value.trim();
        const rootQuestion = modal.querySelector('#newDiagramRootQuestion')?.value.trim();
        
        // Validations
        if (!title || title.length === 0) {
          alert('⚠️ Por favor ingresa un nombre para el árbol');
          modal.querySelector('#newDiagramTitle')?.focus();
          return;
        }
        
        if (title.length > 100) {
          alert('⚠️ El nombre es demasiado largo (máximo 100 caracteres)');
          return;
        }
        
        if (!rootQuestion || rootQuestion.length === 0) {
          alert('⚠️ Por favor ingresa la pregunta inicial');
          modal.querySelector('#newDiagramRootQuestion')?.focus();
          return;
        }
        
        if (rootQuestion.length > 500) {
          alert('⚠️ La pregunta es demasiado larga (máximo 500 caracteres)');
          return;
        }
        
        // Generate IDs
        const diagramId = 'diagram-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const rootNodeId = 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Create diagram with hierarchical structure
        const newDiagram = {
          id: diagramId,
          title: title,
          rootNode: {
            id: rootNodeId,
            type: 'question',
            content: rootQuestion,
            options: []
          },
          createdAt: new Date().toISOString()
        };
        
        // Save to backend
        let savedToBackend = false;
        try {
          const response = await fetch('http://localhost:5000/api/diagrams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDiagram)
          });
          
          if (response.ok) {
            savedToBackend = true;
            console.log('✓ Diagrama creado en backend');
          } else {
            console.warn(`⚠️ Backend retornó ${response.status}, guardando localmente`);
          }
        } catch (err) {
          console.warn('⚠️ No se pudo conectar al backend, guardando localmente: ' + err.message);
        }
        
        // ALWAYS save to localStorage as primary storage
        const diagrams = STATE.fibraDiagrams || [];
        diagrams.push(newDiagram);
        STATE.fibraDiagrams = diagrams;
        localStorage.setItem('cw:fibraDiagrams', JSON.stringify(diagrams));
        console.log('✓ Diagrama guardado en localStorage');
        
        modal.remove();
        // Open editor directly with new diagram (no need to reload)
        setTimeout(() => openDiagramEditor(newDiagram), 300);
      } catch (err) {
        console.error('Error creating diagram:', err);
        alert('❌ Error: ' + (err.message || 'No se pudo crear el árbol'));
      }
    });
    
    // Focus first input
    setTimeout(() => {
      const input = document.getElementById('newDiagramTitle');
      if (input) input.focus();
    }, 100);
  } catch (err) {
    console.error('Error in openNewDiagramModal:', err);
    alert('❌ Error: ' + err.message);
  }
}

function openDiagramViewer(diagram) {
  // All users can view, admins can edit separately
  showDiagramViewer(diagram);
}
function showDiagramViewer(diagram) {
  // Add to history
  addDiagramToHistory(diagram.id);
  renderHistory(); // Update history view in real-time
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(5px);overflow-y:auto;padding:20px';
  
  // Count nodes in hierarchical structure
  let nodeCount = 0;
  const countNodes = (node) => {
    if (!node) return;
    nodeCount++;
    if (node.options && node.options.length > 0) {
      node.options.forEach(opt => {
        if (opt.node) countNodes(opt.node);
      });
    }
  };
  countNodes(diagram.rootNode);
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width:750px;width:100%;background:var(--cw-surface);border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,0.4);overflow:hidden;display:flex;flex-direction:column;max-height:90vh;border:1px solid var(--cw-border)">
      <div style="background:linear-gradient(135deg, var(--cw-primary) 0%, var(--cw-secondary) 100%);color:white;padding:32px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:1px solid rgba(255, 128, 51, 0.3)">
        <div style="flex:1">
          <h2 style="margin:0 0 8px 0;font-size:26px;font-weight:800">🌳 ${escapeHtml(diagram.title)}</h2>
          <div style="font-size:13px;opacity:0.9;display:flex;gap:16px;flex-wrap:wrap">
            <span>📊 ${nodeCount} nodos</span>
            <span>✓ Árbol de decisiones</span>
          </div>
        </div>
        <button class="close" style="position:absolute;top:40px;right:40px;background:rgba(255,255,255,0.2);border:none;cursor:pointer;font-size:24px;padding:0;border-radius:10px;transition:all 0.2s;color:white;font-weight:bold;flex-shrink:0;display:flex;align-items:center;justify-content:center;width:44px;height:44px;line-height:1">×</button>
      </div>
      
      <div id="diagramViewerContent" style="flex:1;overflow-y:auto;padding:32px;display:flex;flex-direction:column;gap:24px;background:var(--cw-bg)">
        <div id="diagramViewer" style="display:flex;flex-direction:column;gap:20px"></div>
      </div>
    </div>
  `;
  
  const closeBtn = modal.querySelector('.close');
  closeBtn.addEventListener('click', () => modal.remove());
  closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
  closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  document.body.appendChild(modal);
  
  // Track navigation history for back button
  const viewerState = { history: [] };
  
  // Start rendering the tree - usa null porque usamos estructura jerárquica con rootNode
  renderDiagramNode(diagram, null, modal.querySelector('#diagramViewer'), viewerState, diagram, diagram.rootNode);
}

// Parámetro directNode para renderizar nodos jerárquicos
function renderDiagramNode(diagram, nodeId, container, viewerState, fullDiagram, directNode) {
  const node = directNode || (diagram.nodes && diagram.nodes[nodeId]) || (diagram.rootNode && !nodeId ? diagram.rootNode : null);
  
  if (!node) return;
  
  const nodeEl = document.createElement('div');
  const isQuestion = node.type === 'question';
  const isRoot = !viewerState.history || viewerState.history.length === 0;
  
  nodeEl.style.cssText = `
    background:${isQuestion ? 'linear-gradient(135deg, var(--cw-primary) 0%, var(--cw-secondary) 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'};
    color:white;
    padding:28px 32px;
    border-radius:16px;
    animation:slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow:0 8px 24px ${isQuestion ? 'rgba(255, 128, 51, 0.3)' : 'rgba(16, 185, 129, 0.3)'};
    border:1px solid ${isQuestion ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)'};
  `;
  
  const optionsCount = node.options ? node.options.length : 0;
  
  nodeEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:24px">
      <div style="display:flex;align-items:flex-start;gap:20px">
        <div style="font-size:48px;flex-shrink:0;line-height:1">${isQuestion ? '❓' : '✓'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:20px;font-weight:800;line-height:1.4;margin-bottom:${node.image ? '16px' : node.options ? '24px' : '0'};letter-spacing:-0.5px">${escapeHtml(node.content)}</div>
          ${node.image ? `<img src="${node.image}" style="max-width:300px;max-height:200px;border-radius:12px;border:2px solid rgba(255,255,255,0.3);object-fit:cover;margin-bottom:16px" />` : ''}
          ${node.options ? `
            <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr))">
              ${node.options.map((opt, idx) => `
                <button class="diagram-option-btn" data-option-idx="${idx}" style="background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);color:white;${opt.image ? 'padding:0' : 'padding:16px 20px'};border-radius:12px;cursor:pointer;transition:all 0.3s;text-align:center;font-weight:700;font-size:${opt.image ? '14px' : '15px'};font-family:var(--font-stack);backdrop-filter:blur(10px);position:relative;overflow:hidden;display:flex;flex-direction:column;gap:0;align-items:stretch;justify-content:flex-end;${opt.image ? 'min-height:160px' : ''}">
                  ${opt.image ? `<img src="${opt.image}" style="width:100%;height:120px;object-fit:cover;border-radius:10px 10px 0 0;border:1px solid rgba(255,255,255,0.2);border-bottom:none" />` : ''}
                  <span style="position:relative;z-index:1;${opt.image ? 'padding:12px 14px;background:rgba(0,0,0,0.3);border-radius:0 0 10px 10px;line-height:1.3' : ''};width:100%;word-wrap:break-word">${escapeHtml(opt.label)}</span>
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  // Add back button if not root
  if (!isRoot && viewerState && viewerState.history && viewerState.history.length > 0) {
    const backBtn = document.createElement('button');
    backBtn.style.cssText = 'position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.2);border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;transition:all 0.2s;font-family:var(--font-stack)';
    backBtn.innerHTML = '← Volver';
    backBtn.onmouseover = () => backBtn.style.background = 'rgba(255,255,255,0.3)';
    backBtn.onmouseout = () => backBtn.style.background = 'rgba(255,255,255,0.2)';
    backBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      viewerState.history.pop();
      container.innerHTML = '';
      const prevNode = viewerState.history[viewerState.history.length - 1];
      renderDiagramNode(diagram, null, container, viewerState, fullDiagram, prevNode);
    });
    nodeEl.style.position = 'relative';
    nodeEl.appendChild(backBtn);
  }
  
  container.appendChild(nodeEl);
  
  // Add zoom to node image
  const nodeImage = nodeEl.querySelector('img[src*="data:image"]');
  if (nodeImage && node.image) {
    nodeImage.style.cursor = 'pointer';
    nodeImage.style.transition = 'transform 0.2s, filter 0.2s';
    nodeImage.addEventListener('mouseover', () => {
      nodeImage.style.filter = 'brightness(0.85)';
      nodeImage.style.transform = 'scale(1.03)';
    });
    nodeImage.addEventListener('mouseout', () => {
      nodeImage.style.filter = 'brightness(1)';
      nodeImage.style.transform = 'scale(1)';
    });
    nodeImage.addEventListener('click', () => openImageZoom(node.image, node.content));
  }
  
  // Add zoom to option images
  nodeEl.querySelectorAll('.diagram-option-btn img').forEach((img, idx) => {
    if (node.options && node.options[idx] && node.options[idx].image) {
      img.style.cursor = 'pointer';
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        openImageZoom(node.options[idx].image, node.options[idx].label);
      });
    }
  });
  
  // Wire button handlers
  nodeEl.querySelectorAll('.diagram-option-btn').forEach(btn => {
    btn.addEventListener('mouseover', () => {
      btn.style.background = 'rgba(255,255,255,0.25)';
      btn.style.borderColor = 'rgba(255,255,255,0.5)';
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    });
    btn.addEventListener('mouseout', () => {
      btn.style.background = 'rgba(255,255,255,0.15)';
      btn.style.borderColor = 'rgba(255,255,255,0.3)';
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = 'none';
    });
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.optionIdx);
      const nextOption = node.options[idx];
      
      if (!nextOption || !nextOption.node) {
        console.error('Opción sin nodo destino');
        return;
      }
      
      if (viewerState && viewerState.history) viewerState.history.push(node);
      // Clear and render next
      container.innerHTML = '';
      renderDiagramNode(diagram, null, container, viewerState, fullDiagram, nextOption.node);
    });
  });
}


function openDiagramEditor(diagram) {
  try {
    // Add to history
    addDiagramToHistory(diagram.id);
    renderHistory(); // Update history view in real-time
    
    // Validar diagrama
    if (!diagram) {
      console.error('Diagrama no definido');
      alert('❌ Error: Diagrama no definido');
      return;
    }
    
    // Asegurar estructura jerárquica
    if (!diagram.rootNode) {
      console.warn('rootNode no encontrado, inicializando...');
      diagram.rootNode = {
        id: 'node-root-' + Date.now(),
        type: 'question',
        content: '¿Cuál es el problema?',
        options: []
      };
    }
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('data-diagram-editor', 'true');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:10000;overflow-y:auto;backdrop-filter:blur(5px);padding:20px';
  
  // Count nodes in hierarchical structure
  let nodeCount = 0;
  const countNodes = (node) => {
    if (!node) return;
    nodeCount++;
    if (node.options && node.options.length > 0) {
      node.options.forEach(opt => {
        if (opt.node) countNodes(opt.node);
      });
    }
  };
  countNodes(diagram.rootNode);
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width:1000px;width:100%;background:var(--cw-surface);border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,0.4);overflow:hidden;display:flex;flex-direction:column;max-height:90vh;border:1px solid var(--cw-border)">
      <!-- Header -->
      <div style="background:linear-gradient(135deg, var(--cw-primary) 0%, var(--cw-secondary) 100%);color:white;padding:32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255, 128, 51, 0.3)">
        <div style="flex:1">
          <h2 style="margin:0 0 8px 0;font-size:26px;font-weight:800">✏️ ${escapeHtml(diagram.title)}</h2>
          <div style="font-size:13px;opacity:0.9">Editar árbol de decisiones • ${nodeCount} nodos</div>
        </div>
        <button class="close" style="position:absolute;top:40px;right:40px;background:rgba(255,255,255,0.2);border:none;cursor:pointer;font-size:24px;padding:0;border-radius:10px;transition:all 0.2s;color:white;font-weight:bold;flex-shrink:0;display:flex;align-items:center;justify-content:center;width:44px;height:44px;line-height:1">×</button>
      </div>
      
      <!-- Two-column layout: Editor | Preview -->
      <div style="flex:1;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:2px solid var(--cw-border)">
        <!-- Left: Editor Panel -->
        <div style="overflow-y:auto;padding:28px;display:flex;flex-direction:column;gap:20px;border-right:2px solid var(--cw-border);background:var(--cw-bg)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <div style="font-size:24px">📝</div>
            <div>
              <div style="font-weight:700;color:var(--cw-text);font-size:16px">Editar Nodos</div>
              <div style="font-size:12px;color:var(--cw-text-muted)">Haz cambios en tiempo real</div>
            </div>
          </div>
          <div id="nodesEditorContainer" style="display:flex;flex-direction:column;gap:16px"></div>
          <button id="addNodeBtn" style="background:linear-gradient(135deg, #10b981, #059669);color:white;border:none;padding:14px 20px;border-radius:12px;cursor:pointer;font-weight:700;font-size:14px;font-family:var(--font-stack);transition:all 0.3s;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(16, 185, 129, 0.3);margin-top:8px" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(16, 185, 129, 0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'">
            <span style="font-size:18px">➕</span>
            <span>Agregar nodo</span>
          </button>
        </div>
        
        <!-- Right: Live Preview -->
        <div style="overflow-y:auto;padding:28px;display:flex;flex-direction:column;gap:16px;background:var(--cw-surface)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <div style="font-size:24px">👁️</div>
            <div>
              <div style="font-weight:700;color:var(--cw-text);font-size:16px">Vista Previa</div>
              <div style="font-size:12px;color:var(--cw-text-muted)">Cómo se verá para los usuarios</div>
            </div>
          </div>
          <div id="editorPreviewContainer" style="display:flex;flex-direction:column;gap:16px;flex:1"></div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background:var(--cw-bg);border-top:2px solid var(--cw-border);padding:20px 32px;display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap">
        <button class="cancel-btn" style="padding:12px 24px;cursor:pointer;border:2px solid var(--cw-border);background:var(--cw-surface);border-radius:10px;font-weight:600;font-family:var(--font-stack);transition:all 0.2s;color:var(--cw-text)" onmouseover="this.style.background='var(--cw-bg)'" onmouseout="this.style.background='var(--cw-surface)'">Cancelar</button>
        <button id="saveDiagramBtn" style="padding:12px 28px;cursor:pointer;background:linear-gradient(135deg, var(--cw-primary), var(--cw-secondary));color:white;border:none;border-radius:10px;font-weight:700;font-family:var(--font-stack);transition:all 0.3s;box-shadow:0 4px 12px rgba(255, 128, 51, 0.3);display:flex;align-items:center;gap:8px" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(255, 128, 51, 0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(255, 128, 51, 0.3)'"><span>💾</span> Guardar</button>
      </div>
    </div>
  `;
  
  const closeBtn = modal.querySelector('.close');
  closeBtn.addEventListener('click', () => modal.remove());
  closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
  closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
  
  const cancelBtn = modal.querySelector('.cancel-btn');
  cancelBtn.addEventListener('click', () => modal.remove());
  
  document.body.appendChild(modal);
  
  // Render nodes editor
  const nodesContainer = modal.querySelector('#nodesEditorContainer');
  const previewContainer = modal.querySelector('#editorPreviewContainer');
  const editorState = { diagram: JSON.parse(JSON.stringify(diagram)) };
  
  // Helper to render preview
  const updatePreview = () => {
    previewContainer.innerHTML = '';
    if (editorState.diagram.rootNode) {
      const headerDiv = document.createElement('div');
      headerDiv.style.cssText = 'font-weight:700;font-size:13px;color:var(--cw-text);margin-bottom:12px;padding:12px;background:var(--cw-bg);border-radius:8px;border-left:4px solid var(--cw-primary)';
      headerDiv.innerHTML = '👁️ <strong>Vista previa en tiempo real:</strong>';
      previewContainer.appendChild(headerDiv);
      
      const previewWrapper = document.createElement('div');
      previewWrapper.style.cssText = 'display:flex;flex-direction:column;gap:16px';
      previewContainer.appendChild(previewWrapper);
      
      renderDiagramNode(editorState.diagram, null, previewWrapper, { history: [] }, editorState.diagram, editorState.diagram.rootNode);
    } else {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = 'text-align:center;color:var(--cw-text-muted);padding:40px 20px';
      emptyDiv.innerHTML = '<div style="font-size:40px;margin-bottom:12px">🌳</div><div>El árbol debe tener un nodo raíz</div>';
      previewContainer.appendChild(emptyDiv);
    }
  };
  
  // Renderizar el nodo raíz
  if (editorState.diagram.rootNode) {
    renderNodeEditorCard(editorState.diagram.rootNode, editorState, nodesContainer, modal, updatePreview);
  } else {
    console.warn('Sin nodo raíz para renderizar');
    nodesContainer.innerHTML = '<p style="color:var(--cw-text-muted);text-align:center;padding:20px">Error: No hay nodo raíz en el árbol</p>';
  }
  
  // Initial preview
  updatePreview();
  
  // The "Add node" button is no longer needed - nodes are created inline within options
  const addNodeBtn = modal.querySelector('#addNodeBtn');
  if (addNodeBtn) {
    addNodeBtn.style.display = 'none';
  }
  
  
  // Save button
  modal.querySelector('#saveDiagramBtn').addEventListener('click', async () => {
    console.log('🔴 [GUARDAR BOTÓN] Save button clickeado');
    await saveDiagramChanges(editorState.diagram, modal);
    console.log('🔴 [GUARDAR BOTÓN] saveDiagramChanges() completada');
  });
  } catch (err) {
    console.error('Error in openDiagramEditor:', err);
    alert('❌ Error: ' + err.message);
  }
}

function renderNodeEditorCard(node, editorState, container, parentModal, onUpdate) {
  const nodeCard = document.createElement('div');
  nodeCard.dataset.nodeId = node.id;
  nodeCard.style.cssText = `
    background:${node.type === 'question' ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(20, 184, 166, 0.08))' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.08)'};
    border:2px solid ${node.type === 'question' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(16, 185, 129, 0.3)'};
    border-radius:14px;
    padding:20px;
    display:flex;
    flex-direction:column;
    gap:16px;
    transition:all 0.3s;
    position:relative;
  `;
  
  const isRoot = node.id === editorState.diagram.rootNodeId;
  const nodeTypeEmoji = node.type === 'question' ? '❓' : '✓';
  
  // Simple header with node type indicator
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:12px;justify-content:space-between;border-bottom:1px solid rgba(0,0,0,0.1);padding-bottom:12px';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex:1">
      <div style="font-size:28px">${nodeTypeEmoji}</div>
      <div style="display:flex;flex-direction:column;gap:4px;min-width:0;flex:1">
        <div style="font-weight:700;color:var(--cw-text);font-size:14px">${node.type === 'question' ? '❓ Pregunta' : '✓ Solución'}</div>
        <div style="font-size:10px;color:var(--cw-text-muted);font-family:monospace;opacity:0.6;overflow:hidden;text-overflow:ellipsis">ID: ${node.id}</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0">
      ${isRoot ? '<div style="background:#f59e0b;color:#78350f;padding:6px 12px;border-radius:6px;font-weight:700;font-size:11px;white-space:nowrap">🌳 Raíz</div>' : ''}
      <button class="delete-node-btn" data-node-id="${node.id}" style="background:#ef4444;color:white;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:700;font-size:12px;transition:all 0.3s;white-space:nowrap" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">🗑️ Borrar</button>
    </div>
  `;
  nodeCard.appendChild(header);
  
  // Content textarea
  const contentLabel = document.createElement('div');
  contentLabel.style.cssText = 'font-weight:700;font-size:13px;color:var(--cw-text)';
  contentLabel.textContent = 'Texto:';
  nodeCard.appendChild(contentLabel);
  
  const contentArea = document.createElement('textarea');
  contentArea.value = node.content;
  contentArea.style.cssText = 'width:100%;min-height:80px;padding:12px 14px;border:2px solid var(--cw-border);border-radius:10px;background:var(--cw-surface);color:var(--cw-text);font-family:var(--font-stack);resize:vertical;transition:all 0.3s;font-size:14px';
  contentArea.addEventListener('change', (e) => {
    node.content = e.target.value;
    if (onUpdate) onUpdate();
  });
  contentArea.addEventListener('mouseover', () => contentArea.style.borderColor = node.type === 'question' ? 'var(--cw-secondary)' : '#059669');
  contentArea.addEventListener('mouseout', () => contentArea.style.borderColor = 'var(--cw-border)');
  nodeCard.appendChild(contentArea);
  
  // Image section
  const imageLabel = document.createElement('div');
  imageLabel.style.cssText = 'font-weight:700;font-size:13px;color:var(--cw-text);margin-top:8px';
  imageLabel.textContent = '🖼️ Imagen (opcional):';
  nodeCard.appendChild(imageLabel);
  
  const imageContainer = document.createElement('div');
  imageContainer.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:flex-start;position:relative';
  
  const imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/*';
  imageInput.style.cssText = 'width:100%;padding:10px 12px;border:2px solid var(--cw-border);border-radius:8px;background:var(--cw-surface);color:var(--cw-text);font-family:var(--font-stack);font-size:13px;cursor:pointer';
  
  const imagePreview = document.createElement('div');
  imagePreview.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;width:140px;position:relative';
  
  const img = document.createElement('img');
  img.style.cssText = 'max-width:140px;max-height:120px;border-radius:8px;border:1px solid var(--cw-border);object-fit:cover;display:none';
  
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.textContent = '✕ Quitar';
  clearBtn.style.cssText = 'background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:11px;padding:5px 8px;display:none;transition:all 0.2s;width:100%;white-space:nowrap';
  clearBtn.addEventListener('mouseover', () => clearBtn.style.background = '#dc2626');
  clearBtn.addEventListener('mouseout', () => clearBtn.style.background = '#ef4444');
  
  if (node.image) {
    img.src = node.image;
    img.style.display = 'block';
    clearBtn.style.display = 'block';
  }
  
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      node.image = reader.result;
      img.src = node.image;
      img.style.display = 'block';
      clearBtn.style.display = 'block';
      if (onUpdate) onUpdate();
    };
    reader.readAsDataURL(file);
  });
  
  clearBtn.addEventListener('click', () => {
    node.image = null;
    img.style.display = 'none';
    clearBtn.style.display = 'none';
    imageInput.value = '';
    if (onUpdate) onUpdate();
  });
  
  imagePreview.appendChild(img);
  imagePreview.appendChild(clearBtn);
  imageContainer.appendChild(imageInput);
  imageContainer.appendChild(imagePreview);
  nodeCard.appendChild(imageContainer);
  
  // Options section (only for questions)
  if (node.type === 'question') {
    const optionsLabel = document.createElement('div');
    optionsLabel.style.cssText = 'font-weight:700;font-size:13px;color:var(--cw-text);margin-top:8px;display:flex;align-items:center;gap:8px';
    optionsLabel.innerHTML = '↓ <span>Respuestas posibles</span>';
    nodeCard.appendChild(optionsLabel);
    
    const optionsList = document.createElement('div');
    optionsList.style.cssText = 'display:flex;flex-direction:column;gap:12px';
    nodeCard.appendChild(optionsList);
    
    if (node.options && node.options.length > 0) {
      node.options.forEach((opt, idx) => {
        const optDiv = createOptionElement(opt, idx, node, editorState, onUpdate, optionsList);
        optionsList.appendChild(optDiv);
      });
    }
    
    const addBtn = document.createElement('button');
    addBtn.style.cssText = 'padding:12px 14px;background:linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(20, 184, 166, 0.15));border:2px dashed var(--cw-secondary);color:var(--cw-secondary);border-radius:8px;cursor:pointer;font-weight:700;font-size:13px;transition:all 0.3s;font-family:var(--font-stack);margin-top:8px;display:flex;align-items:center;justify-content:center;gap:6px';
    addBtn.innerHTML = '+ Nueva respuesta';
    addBtn.addEventListener('mouseover', () => addBtn.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(20, 184, 166, 0.25))');
    addBtn.addEventListener('mouseout', () => addBtn.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(20, 184, 166, 0.15))');
    addBtn.addEventListener('click', () => {
      if (!node.options) node.options = [];
      node.options.push({ label: 'Nueva respuesta', nodeId: '' });
      const newOpt = createOptionElement(node.options[node.options.length - 1], node.options.length - 1, node, editorState, onUpdate, optionsList);
      optionsList.appendChild(newOpt);
      if (onUpdate) onUpdate();
    });
    nodeCard.appendChild(addBtn);
  }
  
  // Delete handler
  nodeCard.querySelector('.delete-node-btn')?.addEventListener('click', () => {
    if (Object.keys(editorState.diagram.nodes).length <= 1) {
      alert('⚠️ No puedes eliminar el único nodo del árbol');
      return;
    }
    delete editorState.diagram.nodes[node.id];
    nodeCard.remove();
    if (onUpdate) onUpdate();
  });
  
  container.appendChild(nodeCard);
}

function createOptionElement(opt, idx, parentNode, editorState, onUpdate, optionsList) {
  const optDiv = document.createElement('div');
  optDiv.style.cssText = `
    display:flex;
    flex-direction:column;
    gap:12px;
    background:var(--cw-surface);
    padding:14px 16px;
    border:1.5px solid var(--cw-primary);
    border-radius:10px;
    transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow:0 2px 6px rgba(255, 128, 51, 0.1)
  `;
  
  // Compact header con label y remove button
  const headerDiv = document.createElement('div');
  headerDiv.style.cssText = `
    display:flex;
    gap:10px;
    align-items:center;
    justify-content:space-between;
  `;
  
  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.value = opt.label;
  labelInput.placeholder = 'Ej: Sí, No...';
  labelInput.style.cssText = `
    flex:1;
    padding:10px 12px;
    border:1px solid var(--cw-border);
    border-radius:6px;
    background:var(--cw-surface-alt);
    color:var(--cw-text);
    font-family:var(--font-stack);
    font-size:13px;
    font-weight:600;
    transition:all 0.2s;
  `;
  labelInput.addEventListener('change', (e) => {
    opt.label = e.target.value;
    if (onUpdate) onUpdate();
  });
  labelInput.addEventListener('focus', () => {
    labelInput.style.borderColor = 'var(--cw-primary)';
    labelInput.style.background = 'var(--cw-surface)';
  });
  labelInput.addEventListener('blur', () => {
    labelInput.style.borderColor = 'var(--cw-border)';
    labelInput.style.background = 'var(--cw-surface-alt)';
  });
  
  const removeBtn = document.createElement('button');
  removeBtn.innerHTML = '✕';
  removeBtn.style.cssText = `
    background:#ef4444;
    color:white;
    border:none;
    border-radius:4px;
    padding:6px 8px;
    cursor:pointer;
    font-weight:700;
    transition:all 0.2s;
    flex-shrink:0;
    font-size:13px;
  `;
  removeBtn.addEventListener('mouseover', () => removeBtn.style.background = '#dc2626');
  removeBtn.addEventListener('mouseout', () => removeBtn.style.background = '#ef4444');
  removeBtn.addEventListener('click', () => {
    parentNode.options.splice(idx, 1);
    optDiv.remove();
    if (onUpdate) onUpdate();
  });
  
  headerDiv.appendChild(labelInput);
  headerDiv.appendChild(removeBtn);
  optDiv.appendChild(headerDiv);
  
  // Image section for option (opcional)
  const imageSection = document.createElement('div');
  imageSection.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:12px;background:rgba(6, 182, 212, 0.05);border:1px solid rgba(6, 182, 212, 0.2);border-radius:8px;margin:0';
  
  const imageSectionLabel = document.createElement('div');
  imageSectionLabel.style.cssText = 'font-weight:600;font-size:11px;color:var(--cw-text-muted);display:flex;align-items:center;gap:4px';
  imageSectionLabel.innerHTML = '🖼️ <span>Imagen (opcional)</span>';
  imageSection.appendChild(imageSectionLabel);
  
  const imageSectionContainer = document.createElement('div');
  imageSectionContainer.style.cssText = 'display:flex;flex-direction:column;gap:10px;align-items:flex-start;width:100%';
  
  const optImageInput = document.createElement('input');
  optImageInput.type = 'file';
  optImageInput.accept = 'image/*';
  optImageInput.style.cssText = 'width:100%;padding:8px 10px;border:1px solid rgba(6, 182, 212, 0.3);border-radius:6px;background:var(--cw-surface);color:var(--cw-text);font-family:var(--font-stack);font-size:12px;cursor:pointer';
  
  const optImagePreview = document.createElement('div');
  optImagePreview.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;width:100px;position:relative';
  
  const optImg = document.createElement('img');
  optImg.style.cssText = 'max-width:100px;max-height:85px;border-radius:6px;border:1px solid var(--cw-border);object-fit:cover;display:none';
  
  const optClearBtn = document.createElement('button');
  optClearBtn.type = 'button';
  optClearBtn.textContent = '✕';
  optClearBtn.style.cssText = 'background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:11px;padding:4px 6px;display:none;transition:all 0.2s;width:100%;white-space:nowrap';
  optClearBtn.addEventListener('mouseover', () => optClearBtn.style.background = '#dc2626');
  optClearBtn.addEventListener('mouseout', () => optClearBtn.style.background = '#ef4444');
  
  if (opt.image) {
    optImg.src = opt.image;
    optImg.style.display = 'block';
    optClearBtn.style.display = 'block';
  }
  
  optImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      opt.image = reader.result;
      optImg.src = opt.image;
      optImg.style.display = 'block';
      optClearBtn.style.display = 'block';
      if (onUpdate) onUpdate();
    };
    reader.readAsDataURL(file);
  });
  
  optClearBtn.addEventListener('click', () => {
    opt.image = null;
    optImg.style.display = 'none';
    optClearBtn.style.display = 'none';
    optImageInput.value = '';
    if (onUpdate) onUpdate();
  });
  
  optImagePreview.appendChild(optImg);
  optImagePreview.appendChild(optClearBtn);
  imageSectionContainer.appendChild(optImageInput);
  imageSectionContainer.appendChild(optImagePreview);
  imageSection.appendChild(imageSectionContainer);
  optDiv.appendChild(imageSection);
  
  // Content container - compacto, solo preview si existe nodo
  const contentDiv = document.createElement('div');
  contentDiv.style.cssText = `
    display:flex;
    flex-direction:column;
    gap:10px;
    padding:12px;
    background:linear-gradient(135deg, rgba(255, 128, 51, 0.05), rgba(255, 160, 80, 0.05));
    border:1px solid rgba(255, 128, 51, 0.2);
    border-radius:8px;
  `;
  optDiv.appendChild(contentDiv);
  
  // Render node content compactly
  const renderNodeContent = () => {
    contentDiv.innerHTML = '';
    
    if (!opt.node) {
      // Sin nodo - mostrar botones para crear uno
      const buttonsWrapper = document.createElement('div');
      buttonsWrapper.style.cssText = `
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
      `;
      
      const btnQuestion = document.createElement('button');
      btnQuestion.innerHTML = '❓ Pregunta';
      btnQuestion.style.cssText = `
        padding:8px 10px;
        background:rgba(6, 182, 212, 0.1);
        border:1px solid var(--cw-secondary);
        color:var(--cw-secondary);
        border-radius:6px;
        cursor:pointer;
        font-weight:600;
        font-size:12px;
        font-family:var(--font-stack);
        transition:all 0.2s;
      `;
      btnQuestion.addEventListener('click', () => {
        opt.node = {
          id: 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          type: 'question',
          content: 'Nueva pregunta',
          options: []
        };
        renderNodeContent();
        if (onUpdate) onUpdate();
      });
      btnQuestion.addEventListener('mouseover', () => {
        btnQuestion.style.background = 'rgba(6, 182, 212, 0.2)';
      });
      btnQuestion.addEventListener('mouseout', () => {
        btnQuestion.style.background = 'rgba(6, 182, 212, 0.1)';
      });
      buttonsWrapper.appendChild(btnQuestion);
      
      const btnSolution = document.createElement('button');
      btnSolution.innerHTML = '✓ Solución';
      btnSolution.style.cssText = `
        padding:8px 10px;
        background:rgba(16, 185, 129, 0.1);
        border:1px solid #10b981;
        color:#10b981;
        border-radius:6px;
        cursor:pointer;
        font-weight:600;
        font-size:12px;
        font-family:var(--font-stack);
        transition:all 0.2s;
      `;
      btnSolution.addEventListener('click', () => {
        opt.node = {
          id: 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          type: 'solution',
          content: 'Nueva solución',
          options: []
        };
        renderNodeContent();
        if (onUpdate) onUpdate();
      });
      btnSolution.addEventListener('mouseover', () => {
        btnSolution.style.background = 'rgba(16, 185, 129, 0.2)';
      });
      btnSolution.addEventListener('mouseout', () => {
        btnSolution.style.background = 'rgba(16, 185, 129, 0.1)';
      });
      buttonsWrapper.appendChild(btnSolution);
      
      contentDiv.appendChild(buttonsWrapper);
    } else {
      // Con nodo - mostrar preview compacto y botón editar
      const node = opt.node;
      
      // Preview card
      const preview = document.createElement('div');
      preview.style.cssText = `
        padding:10px 12px;
        background:${node.type === 'question' ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(20, 184, 166, 0.1))' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1)'};
        border:1px solid ${node.type === 'question' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(16, 185, 129, 0.3)'};
        border-radius:6px;
        cursor:pointer;
        transition:all 0.2s;
      `;
      
      const previewText = document.createElement('div');
      previewText.style.cssText = `
        display:flex;
        align-items:center;
        gap:8px;
        font-size:12px;
        color:var(--cw-text);
        font-weight:500;
      `;
      previewText.innerHTML = `
        <span>${node.type === 'question' ? '❓' : '✓'}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${node.content.substring(0, 40)}${node.content.length > 40 ? '...' : ''}</span>
      `;
      
      preview.appendChild(previewText);
      
      preview.addEventListener('click', () => openNodeEditor(node));
      preview.addEventListener('mouseover', () => {
        preview.style.background = node.type === 'question' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)';
      });
      preview.addEventListener('mouseout', () => {
        preview.style.background = node.type === 'question' ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(20, 184, 166, 0.1))' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))';
      });
      
      contentDiv.appendChild(preview);
      
      // Action buttons
      const actionBtns = document.createElement('div');
      actionBtns.style.cssText = `
        display:flex;
        gap:6px;
      `;
      
      const editBtn = document.createElement('button');
      editBtn.innerHTML = '✎ Editar';
      editBtn.style.cssText = `
        flex:1;
        padding:6px 8px;
        background:var(--cw-primary);
        color:white;
        border:none;
        border-radius:4px;
        cursor:pointer;
        font-weight:600;
        font-size:11px;
        font-family:var(--font-stack);
        transition:all 0.2s;
      `;
      editBtn.addEventListener('click', () => openNodeEditor(node, editorState, onUpdate));
      editBtn.addEventListener('mouseover', () => editBtn.style.opacity = '0.85');
      editBtn.addEventListener('mouseout', () => editBtn.style.opacity = '1');
      actionBtns.appendChild(editBtn);
      
      const deleteNodeBtn = document.createElement('button');
      deleteNodeBtn.innerHTML = '🗑️';
      deleteNodeBtn.style.cssText = `
        padding:6px 8px;
        background:#ef4444;
        color:white;
        border:none;
        border-radius:4px;
        cursor:pointer;
        font-size:11px;
        transition:all 0.2s;
      `;
      deleteNodeBtn.addEventListener('click', () => {
        opt.node = null;
        renderNodeContent();
        if (onUpdate) onUpdate();
      });
      deleteNodeBtn.addEventListener('mouseover', () => deleteNodeBtn.style.background = '#dc2626');
      deleteNodeBtn.addEventListener('mouseout', () => deleteNodeBtn.style.background = '#ef4444');
      actionBtns.appendChild(deleteNodeBtn);
      
      contentDiv.appendChild(actionBtns);
    }
  };
  
  // Function to open modal editor for node
  const openNodeEditor = (node, editorState, onUpdate) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position:fixed;
      top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.5);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:10001;
      padding:20px;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background:var(--cw-surface);
      border-radius:12px;
      padding:24px;
      max-width:500px;
      width:100%;
      max-height:80vh;
      overflow-y:auto;
      box-shadow:0 20px 48px rgba(0,0,0,0.15);
    `;
    
    // Header
    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = `
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:20px;
      padding-bottom:12px;
      border-bottom:2px solid var(--cw-border);
    `;
    
    const titleEl = document.createElement('div');
    titleEl.style.cssText = `
      display:flex;
      align-items:center;
      gap:8px;
      font-weight:700;
      font-size:16px;
      color:var(--cw-text);
    `;
    titleEl.innerHTML = `<span>${node.type === 'question' ? '❓' : '✓'}</span><span>${node.type === 'question' ? 'Editar Pregunta' : 'Editar Solución'}</span>`;
    modalHeader.appendChild(titleEl);
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      background:transparent;
      border:none;
      font-size:24px;
      cursor:pointer;
      color:var(--cw-text-muted);
      transition:all 0.2s;
    `;
    closeBtn.addEventListener('click', () => modal.remove());
    modalHeader.appendChild(closeBtn);
    
    modalContent.appendChild(modalHeader);
    
    // Content textarea
    const textarea = document.createElement('textarea');
    textarea.value = node.content;
    textarea.style.cssText = `
      width:100%;
      min-height:100px;
      padding:12px;
      border:1.5px solid var(--cw-border);
      border-radius:8px;
      background:var(--cw-surface-alt);
      color:var(--cw-text);
      font-family:var(--font-stack);
      font-size:13px;
      resize:vertical;
      margin-bottom:16px;
      box-sizing:border-box;
    `;
    textarea.addEventListener('change', (e) => {
      node.content = e.target.value;
      if (onUpdate) onUpdate();
    });
    modalContent.appendChild(textarea);
    
    // Respuestas (solo para preguntas)
    if (node.type === 'question') {
      const respuestasLabel = document.createElement('div');
      respuestasLabel.style.cssText = `
        font-weight:700;
        font-size:13px;
        color:var(--cw-text);
        margin-bottom:12px;
        display:flex;
        align-items:center;
        gap:6px;
      `;
      respuestasLabel.innerHTML = '↓ Respuestas de esta pregunta';
      modalContent.appendChild(respuestasLabel);
      
      const respuestasList = document.createElement('div');
      respuestasList.style.cssText = `
        display:flex;
        flex-direction:column;
        gap:10px;
        margin-bottom:16px;
      `;
      
      if (node.options && node.options.length > 0) {
        node.options.forEach((o, i) => {
          const optEl = createOptionElement(o, i, node, editorState, onUpdate, respuestasList);
          respuestasList.appendChild(optEl);
        });
      }
      
      modalContent.appendChild(respuestasList);
      
      const addRespuestaBtn = document.createElement('button');
      addRespuestaBtn.style.cssText = `
        width:100%;
        padding:10px;
        background:rgba(6, 182, 212, 0.1);
        border:1.5px dashed var(--cw-secondary);
        color:var(--cw-secondary);
        border-radius:8px;
        cursor:pointer;
        font-weight:600;
        font-size:12px;
        font-family:var(--font-stack);
        margin-bottom:16px;
        transition:all 0.2s;
      `;
      addRespuestaBtn.innerHTML = '+ Agregar respuesta';
      addRespuestaBtn.addEventListener('click', () => {
        if (!node.options) node.options = [];
        node.options.push({ label: 'Nueva respuesta', node: null });
        const newOptEl = createOptionElement(node.options[node.options.length - 1], node.options.length - 1, node, editorState, onUpdate, respuestasList);
        respuestasList.appendChild(newOptEl);
        if (onUpdate) onUpdate();
      });
      addRespuestaBtn.addEventListener('mouseover', () => {
        addRespuestaBtn.style.background = 'rgba(6, 182, 212, 0.2)';
      });
      addRespuestaBtn.addEventListener('mouseout', () => {
        addRespuestaBtn.style.background = 'rgba(6, 182, 212, 0.1)';
      });
      modalContent.appendChild(addRespuestaBtn);
    }
    
    // Footer buttons
    const footerBtns = document.createElement('div');
    footerBtns.style.cssText = `
      display:flex;
      gap:8px;
      padding-top:12px;
      border-top:1px solid var(--cw-border);
    `;
    
    const closeModalBtn = document.createElement('button');
    closeModalBtn.innerHTML = 'Cerrar';
    closeModalBtn.style.cssText = `
      flex:1;
      padding:10px;
      background:var(--cw-surface-alt);
      border:1px solid var(--cw-border);
      color:var(--cw-text);
      border-radius:6px;
      cursor:pointer;
      font-weight:600;
      font-size:12px;
      font-family:var(--font-stack);
      transition:all 0.2s;
    `;
    closeModalBtn.addEventListener('click', () => {
      modal.remove();
      renderNodeContent();
      if (onUpdate) onUpdate();  // Actualizar preview del editor principal
    });
    footerBtns.appendChild(closeModalBtn);
    
    modalContent.appendChild(footerBtns);
    
    modal.appendChild(modalContent);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    document.body.appendChild(modal);
    
    // Add Escape listener to close this modal only (not parent modal)
    // We use window event listener with focus trick
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        // Check if this is the topmost modal
        const allModals = document.querySelectorAll('[data-modal-editor="option"]');
        if (allModals.length > 0) {
          const topmost = allModals[allModals.length - 1];
          if (topmost === modal) {
            e.stopPropagation();
            e.preventDefault();
            modal.remove();
            renderNodeContent();
            if (onUpdate) onUpdate();
          }
        }
      }
    };
    // Mark this as an option editor modal with a higher z-index
    modal.setAttribute('data-modal-editor', 'option');
    window.addEventListener('keydown', handleEscape, true);
    
    // Cleanup listener when modal is removed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (!document.body.contains(modal)) {
          window.removeEventListener('keydown', handleEscape, true);
          observer.disconnect();
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };
  
  renderNodeContent();
  return optDiv;
}

function renderPreview(diagram, container) {
  container.innerHTML = '';
  const visited = new Set();
  let nodeCount = 0;
  
  const header = document.createElement('div');
  header.style.cssText = 'background:linear-gradient(135deg, rgba(255, 128, 51, 0.1), rgba(255, 160, 80, 0.1));border-left:4px solid var(--cw-primary);padding:16px;border-radius:8px;margin-bottom:24px';
  header.innerHTML = `<div style="font-weight:700;color:var(--cw-text);margin-bottom:6px">🎯 Estructura del árbol</div><div style="font-size:13px;color:var(--cw-text-muted)">Vista general de todas las preguntas y soluciones</div>`;
  container.appendChild(header);
  
  function renderNode(nodeId, depth = 0) {
    if (visited.has(nodeId) || depth > 10) return;
    visited.add(nodeId);
    nodeCount++;
    
    const node = diagram.nodes[nodeId];
    if (!node) return;
    
    const nodeEl = document.createElement('div');
    const isQuestion = node.type === 'question';
    const isRoot = nodeId === diagram.rootNodeId;
    
    nodeEl.style.cssText = `
      background:${isQuestion ? 'linear-gradient(135deg, var(--cw-primary) 0%, var(--cw-secondary) 100%)' : 'linear-gradient(135deg, var(--cw-success), #059669 100%)'};
      color:white;
      padding:20px 24px;
      border-radius:12px;
      margin:12px 0;
      margin-left:${depth * 24}px;
      box-shadow:0 4px 12px ${isQuestion ? 'rgba(6, 182, 212, 0.3)' : 'rgba(16, 185, 129, 0.3)'};
      border:1px solid ${isQuestion ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.08)'};
      position:relative;
      overflow:hidden;
    `;
    
    if (isRoot) {
      nodeEl.style.borderLeft = '4px solid rgba(255,255,255,0.5)';
      nodeEl.style.paddingLeft = '20px';
    }
    
    nodeEl.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:12px;font-weight:700;margin-bottom:${node.options ? '16px' : '0'};font-size:15px">
        <span style="font-size:20px;flex-shrink:0">${isQuestion ? '❓' : '✅'}</span>
        <span>${escapeHtml(node.content)}</span>
      </div>
      ${node.options && node.options.length > 0 ? `
        <div style="font-size:13px;opacity:0.95;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.2)">
          ${node.options.map(opt => `<div style="margin:6px 0;display:flex;align-items:center;gap:8px"><span>→</span><span>${escapeHtml(opt.label)}</span></div>`).join('')}
        </div>
      ` : ''}
    `;
    
    container.appendChild(nodeEl);
    
    if (node.options) {
      node.options.forEach(opt => {
        renderNode(opt.nodeId, depth + 1);
      });
    }
  }
  
  renderNode(diagram.rootNodeId);
}

async function saveDiagramChanges(diagram, modal) {
  console.log('🟠 [SAVE] saveDiagramChanges() LLAMADA');
  console.log('🟠 [SAVE] Diagrama ID:', diagram?.id);
  console.log('🟠 [SAVE] Diagrama Title:', diagram?.title);
  console.log('🟠 [SAVE] Diagrama rootNode:', diagram?.rootNode);
  try {
    // Validate diagram before saving
    if (!diagram || !diagram.id) {
      throw new Error('Diagrama inválido');
    }
    
    if (!diagram.title || diagram.title.trim().length === 0) {
      throw new Error('El nombre del árbol no puede estar vacío');
    }
    
    if (!diagram.rootNode) {
      throw new Error('El árbol debe tener un nodo raíz');
    }
    
    // Validate root node
    if (!diagram.rootNode.content || diagram.rootNode.content.trim().length === 0) {
      throw new Error('El nodo raíz no puede estar vacío');
    }
    
    // Recursive validation function for nodes
    const validateNode = (node, path = 'Raíz') => {
      if (!node.content || node.content.trim().length === 0) {
        throw new Error(`${path}: el contenido no puede estar vacío`);
      }
      
      // Validate options for questions
      if (node.type === 'question' && node.options) {
        for (let i = 0; i < node.options.length; i++) {
          const opt = node.options[i];
          if (!opt.label || opt.label.trim().length === 0) {
            throw new Error(`${path}: Opción ${i + 1} sin texto`);
          }
          if (opt.node) {
            validateNode(opt.node, `${path} → ${opt.label}`);
          }
        }
      }
    };
    
    validateNode(diagram.rootNode);
    
    // Save to backend (PRIMARY STORAGE)
    console.log('🟠 [SAVE] Diagrama a guardar COMPLETO:', JSON.stringify(diagram));
    
    let response = await fetch(`http://localhost:5000/api/diagrams/${diagram.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(diagram)
    });
    
    // If 404, try POST (create)
    if (response.status === 404) {
      console.log('Diagrama no existe en backend, creando...');
      response = await fetch('http://localhost:5000/api/diagrams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagram)
      });
      if (!response.ok) {
        throw new Error(`Error al crear: ${response.status}`);
      }
      console.log('✓ Diagrama creado en backend');
    } else if (!response.ok) {
      throw new Error(`Error al guardar: ${response.status}`);
    } else {
      console.log('✓ Diagrama guardado en backend');
    }
    
    // Update STATE with latest from backend
    const updated = await response.json();
    const diagrams = STATE.fibraDiagrams || [];
    const idx = diagrams.findIndex(d => d.id === updated.id);
    if (idx >= 0) {
      diagrams[idx] = updated;
    } else {
      diagrams.push(updated);
    }
    STATE.fibraDiagrams = diagrams;
    
    // Close modal and reload
    console.log('🟠 [SAVE] Modal:', modal);
    if (modal) {
      console.log('🟠 [SAVE] REMOVIENDO MODAL');
      modal.remove();
      console.log('🟠 [SAVE] MODAL REMOVIDO DEL DOM');
    }
    console.log('🟠 [SAVE] Renderizando lista desde STATE.fibraDiagrams (sin cargar backend)');
    // NO llamar a loadDiagrams() porque el backend tiene estructura diferente
    // Solo renderizar lo que ya está en STATE.fibraDiagrams (que acabamos de guardar en localStorage)
    renderDiagramsList(STATE.fibraDiagrams || []);
    console.log('✓ Árbol guardado correctamente');
    
  } catch (err) {
    console.error('Validation error:', err);
    alert('⚠️ ' + err.message);
  }
}


function deleteDiagram(diagramId) {
  try {
    // Check permissions
    if (!(STATE.authUser && STATE.authUser.role === 'admin')) {
      alert('⛔ Solo administradores pueden eliminar árboles de decisión');
      return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:11000;backdrop-filter:blur(4px)';
    
    modal.innerHTML = `
      <div style="background:var(--cw-surface);border-radius:14px;padding:32px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;border:1px solid var(--cw-border)">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <h3 style="margin:0 0 8px 0;color:var(--cw-text);font-size:20px;font-weight:700">¿Eliminar árbol?</h3>
        <p style="margin:0 0 24px 0;color:var(--cw-text-muted);font-size:14px;line-height:1.6">Esta acción <strong style="color:#ef4444">no se puede deshacer</strong>. Se eliminará permanentemente el árbol de decisiones y todos sus nodos.</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <button class="cancel" style="padding:12px 28px;border:2px solid var(--cw-border);background:var(--cw-surface);border-radius:10px;cursor:pointer;font-weight:600;font-family:var(--font-stack);color:var(--cw-text);transition:all 0.2s">Cancelar</button>
          <button class="confirm" style="padding:12px 28px;background:linear-gradient(135deg, #ef4444, #dc2626);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-family:var(--font-stack);transition:all 0.2s;box-shadow:0 4px 12px rgba(239, 68, 68, 0.3)" onmouseover="this.style.boxShadow='0 6px 16px rgba(239, 68, 68, 0.4)';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.3)';this.style.transform='translateY(0)'">Sí, eliminar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const cancelBtn = modal.querySelector('.cancel');
    const confirmBtn = modal.querySelector('.confirm');
    
    cancelBtn.addEventListener('click', () => modal.remove());
    
    confirmBtn.addEventListener('click', async () => {
      try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '⏳ Eliminando...';
        confirmBtn.style.opacity = '0.6';
        
        // Delete from backend
        try {
          const response = await fetch(`http://localhost:5000/api/diagrams/${diagramId}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            console.warn(`⚠️ Backend retornó ${response.status}, pero eliminamos localmente`);
          } else {
            console.log('✓ Eliminado del backend');
          }
        } catch (err) {
          console.warn('⚠️ No se pudo eliminar del backend, pero eliminamos localmente: ' + err.message);
        }
        
        // ALSO delete from localStorage
        console.log('🟠 [DELETE] Eliminando de localStorage...');
        const diagrams = STATE.fibraDiagrams || [];
        const idx = diagrams.findIndex(d => d.id === diagramId);
        if (idx >= 0) {
          diagrams.splice(idx, 1);
          STATE.fibraDiagrams = diagrams;
          localStorage.setItem('cw:fibraDiagrams', JSON.stringify(diagrams));
          console.log('🟠 [DELETE] Eliminado de localStorage, quedan:', diagrams.length);
        }
        
        modal.remove();
        // Render locally without reloading from backend
        renderDiagramsList(STATE.fibraDiagrams || []);
        console.log('✓ Árbol eliminado correctamente');
      } catch (err) {
        console.error('Error deleting diagram:', err);
        alert('❌ Error al eliminar: ' + (err.message || 'No se pudo eliminar el árbol'));
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Sí, eliminar';
        confirmBtn.style.opacity = '1';
      }
    });
  } catch (err) {
    console.error('Error in deleteDiagram:', err);
    alert('❌ Error: ' + err.message);
  }
}

// Expose small helpers for debugging if needed
window.auth = {login, logout, removeUser};

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
