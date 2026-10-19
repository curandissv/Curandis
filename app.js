/* =========================================================================
   CURANDIS — app.js
   Lógica y datos compartidos por TODAS las páginas del sitio.
   Como ahora cada pantalla es un archivo .html real (no una sola SPA),
   el estado que antes vivía en variables de memoria (currentUser,
   familyPostings, mockUsers...) ahora se guarda en localStorage para que
   sobreviva al navegar entre páginas. Sigue siendo un prototipo sin backend:
   los datos viven solo en el navegador de quien lo usa.
   ========================================================================= */

const WHATSAPP_NUMBER = "50370668454";

/* =====================================================================
   DISUASIÓN DE INSPECCIÓN (NO ES SEGURIDAD REAL)
   Esto NO protege el código: cualquier persona con conocimientos básicos
   puede saltárselo. Solo pone una barrera ante el usuario casual/curioso.
   Al vivir en app.js, aplica automáticamente a las 13 páginas del sitio.
   La seguridad real de Curandis vive en el servidor (validación,
   autenticación, permisos), nunca en el navegador.
   ===================================================================== */
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  const k = e.key.toUpperCase();
  const blocked = k === 'F12' || (e.ctrlKey && e.shiftKey && (k==='I'||k==='J'||k==='C')) || (e.ctrlKey && k==='U');
  if(blocked) e.preventDefault();
});

/* Escapa texto antes de insertarlo como HTML. Se usa en cualquier lugar
   donde se pinte un dato escrito por la persona usuaria (nombre, motivo de
   la solicitud, descripción) para evitar XSS. Nunca quitar esto de los
   innerHTML que muestran texto libre. */
function esc(str){
  return String(str ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}

/* ===================== MAPA DE PÁGINAS ===================== */
const PAGES = {
  home: 'index.html',
  login: 'login.html',
  registro: 'registro.html',
  pendiente: 'pendiente.html',
  'client-search': 'buscar.html',
  'client-requests': 'solicitudes.html',
  'client-messages': 'mensajes.html',
  'nurse-jobs': 'trabajos.html',
  'nurse-requests': 'solicitudes-enfermero.html',
  'nurse-chats': 'chats.html',
  'nurse-profile': 'perfil.html',
  'nosotros': 'nosotros.html',
};

/* ===================== ESTADO PERSISTENTE (localStorage) ===================== */
const LS_KEYS = {
  users: 'curandis_users',
  currentUser: 'curandis_current_user',
  postings: 'curandis_family_postings',
  terms: 'curandis_accepted_terms',
  appliedJobs: 'curandis_applied_jobs',
  registrationEmailStatus: 'curandis_registration_email_status',
};
const ADMIN_EMAIL = 'curandissv@gmail.com';

/* ⚠ Estas contraseñas de demo quedan visibles en texto plano en este
   archivo, y cualquier cuenta que se registre desde registro.html también
   se guarda con su contraseña sin cifrar dentro de localStorage. Esto es
   aceptable SOLO porque es un prototipo sin servidor y sin usuarios reales.
   Antes de manejar datos reales, esto DEBE moverse a un backend con hash
   de contraseñas (bcrypt/argon2) — ver el documento "Ciberseguridad
   aplicada", Fase 1. */
const DEFAULT_USERS = [
  {email:'familia@demo.com', password:'Demo1234!', role:'family', name:'Ana Gutiérrez', status:'approved'},
  {email:'pro@demo.com', password:'Demo1234!', role:'professional', name:'Karla Mejía', status:'approved', specialty:'Geriatría', zone:'Santa Tecla'},
  {email:'pendiente@demo.com', password:'Demo1234!', role:'professional', name:'Luis Pérez', status:'pending', specialty:'Enfermería General', zone:'Soyapango'},
];

const DEFAULT_POSTINGS = [];

function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(raw === null) return fallback;
    return JSON.parse(raw);
  }catch(e){ return fallback; }
}
let lastStorageError = null;
function saveJSON(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); lastStorageError = null; return true; }
  catch(e){ lastStorageError = e; console.error(`No se pudo guardar "${key}" en el almacenamiento local.`, e); return false; }
}

function getUsers(){ return loadJSON(LS_KEYS.users, DEFAULT_USERS); }
function saveUsers(users){ return saveJSON(LS_KEYS.users, users); }
function getCurrentUser(){ return loadJSON(LS_KEYS.currentUser, null); }
function setCurrentUser(user){ return saveJSON(LS_KEYS.currentUser, user); }
function clearCurrentUser(){ localStorage.removeItem(LS_KEYS.currentUser); }
function getPostings(){ return loadJSON(LS_KEYS.postings, DEFAULT_POSTINGS); }
function savePostings(p){ saveJSON(LS_KEYS.postings, p); }
function getAppliedJobs(){ return loadJSON(LS_KEYS.appliedJobs, []); }
function saveAppliedJobs(a){ saveJSON(LS_KEYS.appliedJobs, a); }
function createApprovalCode(){
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Asegura que exista la semilla de usuarios demo la primera vez que se visita el sitio
if(loadJSON(LS_KEYS.users, null) === null){ saveUsers(DEFAULT_USERS); }

let currentUser = getCurrentUser();
let familyPostings = getPostings();

/* ===================== DATOS ESTÁTICOS DE DEMO (no cambian) ===================== */
const mockNurses = [
  {name:'María José Hernández de López', jvpe:'JVPE-001-2019', spec:'Pediatría', rating:4.9, reviews:47, years:6, rate:18, zone:'Colonia Escalón, San Salvador', dist:15, tuZona:true, disponible:true, desc:'Enfermera especializada en pediatría con 6 años de experiencia. Trabajé en el Hospital Nacional de Niños Benjamín Bloom.', servicios:6},
  {name:'Lucía Fernanda Morales Castillo', jvpe:'JVPE-134-2022', spec:'Oncología', rating:4.7, reviews:12, years:3, rate:19, zone:'Soyapango, San Salvador', dist:10, tuZona:true, disponible:false, desc:'Enfermera oncológica con formación en el manejo de pacientes con cáncer, quimioterapia domiciliaria y cuidados paliativos.', servicios:5},
  {name:'Roberto Carlos Méndez Herrera', jvpe:'JVPE-022-2017', spec:'Geriatría', rating:4.8, reviews:63, years:9, rate:20, zone:'Santa Ana Centro, Santa Ana', dist:20, tuZona:false, disponible:true, desc:'Enfermero geriátrico especializado en cuidados de adultos mayores con 9 años de experiencia en el occidente del país.', servicios:5},
  {name:'Carmen Lisseth Velásquez Portillo', jvpe:'JVPE-045-2020', spec:'Postoperatorio', rating:4.7, reviews:29, years:5, rate:17, zone:'Santa Tecla, La Libertad', dist:10, tuZona:false, disponible:true, desc:'Especialista en cuidados postoperatorios. Brindo atención en recuperación quirúrgica, control de heridas y manejo del dolor.', servicios:5},
  {name:'Jonathan Ruiz', jvpe:'JVPE-201-2015', spec:'Cuidados Intensivos', rating:5.0, reviews:82, years:11, rate:25, zone:'San Miguel Centro, San Miguel', dist:25, tuZona:false, disponible:true, desc:'Enfermero intensivista con 11 años de experiencia en UCI. Manejo avanzado de ventilación, monitoreo hemodinámico y emergencias.', servicios:5},
  {name:'Ana Beatriz Flores', jvpe:'JVPE-087-2021', spec:'Rehabilitación', rating:4.6, reviews:18, years:4, rate:15, zone:'Sonsonate Centro, Sonsonate', dist:15, tuZona:false, disponible:true, desc:'Enfermera rehabilitadora especializada en recuperación funcional de pacientes con ACV, fracturas y cirugías ortopédicas.', servicios:5},
  {name:'Carlos Eduardo Reyes Fuentes', jvpe:'JVPE-112-2018', spec:'Diabetes y Heridas', rating:4.8, reviews:41, years:7, rate:16, zone:'Usulután Centro, Usulután', dist:20, tuZona:false, disponible:true, desc:'Especialista en el manejo de heridas crónicas y pacientes diabéticos. Certificado en pie diabético y terapia de heridas.', servicios:5},
  {name:'Miguel Ángel Torres Guzmán', jvpe:'JVPE-156-2016', spec:'Salud Mental', rating:4.9, reviews:35, years:8, rate:18, zone:'Cojutepeque, Cuscatlán', dist:15, tuZona:false, disponible:true, desc:'Enfermero psiquiátrico con 8 años de experiencia en salud mental comunitaria. Manejo de crisis, acompañamiento terapéutico y más.', servicios:5},
];
const specialties = [...new Set(mockNurses.map(n=>n.spec))];

const mockJobs = [
  {patient:'Adulto mayor con dependencia severa', zone:'Santa Tecla', turno:'Nocturno · 12h', urgencia:'Prioritaria', tasks:'Curación de heridas complejas', pay:66},
  {patient:'Postoperatorio de cadera', zone:'San Salvador Centro', turno:'Diurno · 12h', urgencia:'Programada', tasks:'Acompañamiento y control de signos', pay:42},
  {patient:'Paciente crónico / diabetes tipo 2', zone:'Antiguo Cuscatlán', turno:'Por horas · 8am-12pm', urgencia:'Programada', tasks:'Administración de medicamentos', pay:17},
  {patient:'Hijo/a menor - apoyo pediátrico', zone:'Mejicanos', turno:'Diurno · 8h', urgencia:'Prioritaria', tasks:'Control de signos vitales e higiene', pay:32},
];

function initials(name){
  return name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');
}

/* ===================== MODAL LEGAL (solo aparece una vez) ===================== */
function initLegalModal(){
  const overlay = document.getElementById('modal-overlay');
  if(!overlay) return;
  const accepted = loadJSON(LS_KEYS.terms, false);
  if(accepted){ overlay.style.display = 'none'; return; }
  const acceptCheckbox = document.getElementById('accept-terms');
  const acceptBtn = document.getElementById('accept-btn');
  acceptCheckbox.addEventListener('change', () => acceptBtn.disabled = !acceptCheckbox.checked);
  acceptBtn.addEventListener('click', () => {
    saveJSON(LS_KEYS.terms, true);
    overlay.classList.add('hidden');
    setTimeout(() => overlay.style.display='none', 400);
  });
}

/* ===================== NAVEGACIÓN GENERAL ===================== */
function goTo(pageKey){ window.location.href = PAGES[pageKey]; }
function goToDashboard(){ goTo('home'); }
function scrollToTop(){ goTo('home'); }
function scrollToTopDash(){ window.scrollTo({top:0,behavior:'smooth'}); }
function scrollToId(id){
  if(window.location.pathname.endsWith(PAGES.home) || window.location.pathname === '/' || window.location.pathname.endsWith('/')){
    document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
  } else {
    window.location.href = PAGES.home + '#' + id;
  }
}
function scrollToHashOnLoad(){
  if(window.location.hash){
    const id = window.location.hash.slice(1);
    setTimeout(() => {
      const target = document.getElementById(id);
      if(target) window.scrollTo({top:target.getBoundingClientRect().top + window.scrollY - 92,behavior:'smooth'});
    }, 60);
  }
}
function toggleMainMenu(force){
  const nav = document.querySelector('.main-topbar');
  const toggle = nav && nav.querySelector('.menu-toggle');
  if(!nav || !toggle) return;
  const expanded = force === undefined ? toggle.getAttribute('aria-expanded') !== 'true' : Boolean(force);
  nav.classList.toggle('menu-open', expanded);
  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.setAttribute('aria-label', expanded ? 'Cerrar menú' : 'Abrir menú');
}

function initRulesCardReveal(){
  const grid = document.querySelector('.rules-grid');
  if(!grid) return;
  const cards = grid.querySelectorAll('[data-rules-reveal]');
  if(!cards.length) return;
  if(!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    cards.forEach(card => card.classList.add('is-visible'));
    return;
  }
  grid.classList.add('is-observing');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:0.12,rootMargin:'0px 0px -32px 0px'});
  cards.forEach(card => observer.observe(card));
}

function initWhatsAppWidget(){
  if(document.querySelector('.whatsapp-widget')) return;
  const widget = document.createElement('div');
  widget.className = 'whatsapp-widget';
  widget.dataset.pulse = 'true';
  const message = 'Hola Curandis, tengo una duda sobre cómo funciona la plataforma';
  const chatUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  widget.innerHTML = `
    <section class="whatsapp-panel" id="whatsapp-panel" role="dialog" aria-modal="false" aria-labelledby="whatsapp-panel-title" aria-describedby="whatsapp-panel-message" tabindex="-1" hidden>
      <div class="whatsapp-panel-header">
        <h2 class="whatsapp-panel-title" id="whatsapp-panel-title">Curandis · Resolvemos tus dudas</h2>
        <button class="whatsapp-panel-close" type="button" aria-label="Cerrar chat de WhatsApp">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="whatsapp-panel-body">
        <p class="whatsapp-panel-message" id="whatsapp-panel-message">Hola 👋 ¿Tienes dudas sobre cómo funciona Curandis? Escríbenos por WhatsApp y te respondemos.</p>
        <a class="whatsapp-chat-link" href="${chatUrl}" target="_blank" rel="noopener noreferrer">Chatear por WhatsApp</a>
      </div>
    </section>
    <button class="whatsapp-toggle" type="button" aria-label="Abrir chat de WhatsApp" aria-expanded="false" aria-controls="whatsapp-panel">
      <svg aria-hidden="true" viewBox="0 0 32 32"><path d="M16 3.1A12.8 12.8 0 0 0 5 22.5L3.3 28.7l6.4-1.7A12.9 12.9 0 1 0 16 3.1Zm0 23.4c-2 0-3.9-.5-5.6-1.6l-.4-.2-3.8 1 1-3.7-.3-.4A10.2 10.2 0 1 1 16 26.5Zm5.6-7.6c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.4-.6.1-.2 0-.5 0-.7l-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.1 1.1-1.1 2.7 1.2 3.1 1.4 3.3c.2.2 2.2 3.4 5.4 4.7.8.3 1.4.5 1.9.6.8.3 1.5.2 2 .1.6-.1 1.9-.8 2.2-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.3-.6-.4Z"/></svg>
    </button>`;
  document.body.appendChild(widget);
  const toggle = widget.querySelector('.whatsapp-toggle');
  const panel = widget.querySelector('.whatsapp-panel');
  const close = widget.querySelector('.whatsapp-panel-close');
  const chatLink = widget.querySelector('.whatsapp-chat-link');
  function setOpen(open,{restoreFocus=false}={}){
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open ? 'Cerrar chat de WhatsApp' : 'Abrir chat de WhatsApp');
    if(open){
      widget.removeAttribute('data-pulse');
      close.focus();
    }else if(restoreFocus){
      toggle.focus();
    }
  }
  toggle.addEventListener('click',() => setOpen(panel.hidden));
  close.addEventListener('click',() => setOpen(false,{restoreFocus:true}));
  document.addEventListener('pointerdown',event => {
    if(!panel.hidden && !widget.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown',event => {
    if(event.key === 'Escape' && !panel.hidden){
      event.preventDefault();
      setOpen(false,{restoreFocus:true});
    }
  });
  chatLink.addEventListener('click',() => setOpen(false,{restoreFocus:true}));
}

function enterFlow(role){
  if(currentUser && currentUser.role === role){ goToOwnDashboard(); return; }
  window.location.href = PAGES.registro + '?role=' + role;
}
function openAuth(){ goTo('login'); }

/* ===================== SIGN IN ===================== */
/* Freno básico contra fuerza bruta: bloquea el formulario 30s tras 5
   intentos fallidos seguidos. Vive en el navegador (se puede evadir
   recargando la página) — en producción esto debe reforzarse del lado
   del servidor. */
let loginAttempts = 0;
let loginLockedUntil = 0;
function doSignIn(){
  const err = document.getElementById('si-error');
  if(Date.now() < loginLockedUntil){
    const secs = Math.ceil((loginLockedUntil - Date.now())/1000);
    err.textContent = `Demasiados intentos. Espera ${secs}s antes de volver a intentar.`;
    err.classList.add('show');
    return;
  }
  const email = document.getElementById('si-email').value.trim();
  const password = document.getElementById('si-password').value;
  const found = getUsers().find(u => u.email === email && u.password === password);
  if(!found){
    loginAttempts++;
    if(loginAttempts >= 5){
      loginLockedUntil = Date.now() + 30000;
      loginAttempts = 0;
      err.textContent = 'Demasiados intentos fallidos. Espera 30 segundos.';
    } else {
      err.textContent = 'No encontramos una cuenta con ese correo y contraseña.';
    }
    err.classList.add('show');
    return;
  }
  loginAttempts = 0;
  err.classList.remove('show');
  currentUser = found;
  setCurrentUser(found);
  routeAfterAuth();
}
function demoLogin(kind){
  const map = {'family':'familia@demo.com','pro-approved':'pro@demo.com','pro-pending':'pendiente@demo.com'};
  currentUser = getUsers().find(u => u.email === map[kind]);
  setCurrentUser(currentUser);
  routeAfterAuth();
}
function watchDemo(){
  currentUser = getUsers().find(u=>u.email==='familia@demo.com');
  setCurrentUser(currentUser);
  routeAfterAuth();
}

/* ===================== AUTH ROUTER ===================== */
function routeAfterAuth(){
  if(currentUser.status !== 'approved'){
    goTo('pendiente');
  } else if(currentUser.role === 'family'){
    goTo('client-search');
  } else {
    goTo('nurse-jobs');
  }
}
function goToOwnDashboard(){
  if(!currentUser){ openAuth(); return; }
  routeAfterAuth();
}
function logout(){
  currentUser = null;
  clearCurrentUser();
  goToDashboard();
}
function updateNavUser(){
  const guest = document.getElementById('nav-guest');
  const user = document.getElementById('nav-user');
  if(!guest || !user) return;
  guest.style.display = currentUser ? 'none' : 'inline-flex';
  user.style.display = currentUser ? 'inline-flex' : 'none';
  const register = document.querySelector('.main-topbar .nav-register');
  if(register) register.style.display = currentUser ? 'none' : 'inline-flex';
  if(currentUser){
    document.getElementById('nav-avatar').textContent = initials(currentUser.name);
    document.getElementById('nav-name').textContent = currentUser.name.split(' ')[0];
  }
}

/* Protege páginas internas: si no hay sesión, manda a login.
   Se llama al inicio de cada página de la app (buscar, solicitudes, trabajos, etc.) */
function requireAuth(expectedRole){
  if(!currentUser){ openAuth(); return false; }
  if(expectedRole && currentUser.role !== expectedRole){ goToOwnDashboard(); return false; }
  if(currentUser.status !== 'approved' && window.location.pathname.endsWith(PAGES.pendiente) === false){
    goTo('pendiente'); return false;
  }
  return true;
}

/* ===================== SELECCIÓN VISUAL DE OPCIONES (usado en formularios) ===================== */
function wireOptionCards(){
  document.querySelectorAll('.option-card input').forEach(inp => {
    inp.addEventListener('change', () => {
      const card = inp.closest('.option-card');
      if(inp.type === 'radio'){
        card.closest('.option-grid').querySelectorAll('.option-card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
      } else { card.classList.toggle('selected', inp.checked); }
    });
  });
  document.querySelectorAll('.weekday-chip input').forEach(inp => {
    inp.addEventListener('change', () => inp.closest('.weekday-chip').classList.toggle('selected', inp.checked));
  });
}

/* ===================== WIZARD GENÉRICO (barra de progreso) ===================== */
function buildProgress(containerId, total){
  const el = document.getElementById(containerId); if(!el) return; el.innerHTML='';
  for(let i=0;i<total;i++){ const d=document.createElement('div'); d.className='dot'; el.appendChild(d); }
}
function updateProgress(containerId, current){
  document.querySelectorAll('#'+containerId+' .dot').forEach((d,i)=>d.classList.toggle('done', i<=current));
}

/* ===================== WIZARD DE REGISTRO (rol → 2 pasos) — registro.html ===================== */
let wizardRole = 'family';
let wizardStep = 0;
function selectWizardRole(role){
  wizardRole = role;
  document.getElementById('wiz-role-family').classList.toggle('selected', role==='family');
  document.getElementById('wiz-role-professional').classList.toggle('selected', role==='professional');
  document.getElementById('wiz-continue-btn').textContent = role==='family' ? 'Continuar como Cliente →' : 'Continuar como Enfermero/a →';
}
function startSignupWizard(){
  wizardStep = 0;
  document.getElementById('screen-role-select').style.display = 'none';
  document.getElementById('screen-signup-wizard').style.display = 'block';
  buildProgress('wiz-progress', 2);
  updateProgress('wiz-progress', 0);
  showWizardStep();
}
function backToRoleSelect(){
  document.getElementById('screen-signup-wizard').style.display = 'none';
  document.getElementById('screen-role-select').style.display = 'block';
}
function showWizardStep(){
  document.querySelectorAll('#screen-signup-wizard .form-step').forEach(s=>s.classList.remove('active'));
  if(wizardStep === 0){
    document.querySelector('#screen-signup-wizard .form-step[data-wizstep="0"]').classList.add('active');
  } else {
    document.querySelector(`#screen-signup-wizard .form-step[data-wizstep="1"][data-wizrole="${wizardRole}"]`).classList.add('active');
  }
  updateProgress('wiz-progress', wizardStep);
}
function wizardNext(){
  const nombre = document.getElementById('w-nombre').value.trim();
  const apellidos = document.getElementById('w-apellidos').value.trim();
  const email = document.getElementById('w-email').value.trim();
  const telefono = document.getElementById('w-telefono').value.trim();
  const err = document.getElementById('wiz-error-1');
  const identityValid = validateIdentityUploads();
  const emailValid = document.getElementById('w-email').checkValidity();
  if(!nombre || !apellidos || !emailValid || !telefono || !identityValid){
    err.textContent = !identityValid
      ? 'Completa tus datos y agrega las tres fotos de identidad para continuar.'
      : 'Completa nombre, apellidos y teléfono; revisa que el correo tenga un formato válido.';
    err.classList.add('show');
    return;
  }
  err.classList.remove('show');
  wizardStep = 1; showWizardStep();
}
function wizardPrev(){ wizardStep = 0; showWizardStep(); }
/* Las imágenes de identidad se reducen en el navegador antes de guardarse
   en localStorage. Esto sigue siendo solo una demo: no subir documentos reales. */
function readFileAsDataURL(file){
  if(!file) return Promise.resolve('');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || '');
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}
const registrationUploads = Object.create(null);
const uploadDefinitions = {
  'w-dui-front':{required:true,maxSide:1000},
  'w-dui-back':{required:true,maxSide:1000},
  'w-profile-photo':{required:true,maxSide:600},
  'w-title-photo':{required:false,maxSide:1000,documents:true},
  'w-criminal-photo':{required:false,maxSide:1000,documents:true},
};
const uploadMaxBytes = 5 * 1024 * 1024;

function compressRegistrationImage(file, maxSide){
  return readFileAsDataURL(file).then(source => new Promise((resolve,reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth,image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1,Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1,Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if(!context){ reject(new Error('No se pudo procesar la imagen.')); return; }
      context.fillStyle = '#fff';
      context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,0,0,canvas.width,canvas.height);
      resolve(canvas.toDataURL('image/jpeg',0.7));
    };
    image.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
    image.src = source;
  }));
}
function uploadError(id, message){
  const error = document.getElementById(`${id}-error`);
  const input = document.getElementById(id);
  if(error){ error.textContent = message; error.classList.toggle('show',Boolean(message)); }
  if(input) input.setAttribute('aria-invalid',String(Boolean(message)));
}
function renderUploadPreview(id){
  const preview = document.getElementById(`${id}-preview`);
  const prompt = document.querySelector(`label[for="${id}"] .upload-prompt`);
  if(!preview) return;
  preview.replaceChildren();
  const item = registrationUploads[id];
  if(!item){
    if(prompt) prompt.textContent = 'Toca para subir o toma una foto';
    preview.classList.remove('has-file');
    return;
  }
  if(prompt) prompt.textContent = 'Toca para cambiar el archivo';
  preview.classList.add('has-file');
  const row = document.createElement('div');
  row.className = 'upload-preview-row';
  if(item.type === 'application/pdf'){
    const link = document.createElement('a');
    link.href = item.data;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = `Ver PDF: ${item.name}`;
    row.appendChild(link);
  }else{
    const image = document.createElement('img');
    image.src = item.data;
    image.alt = id === 'w-profile-photo' ? 'Vista previa de foto de perfil' : `Vista previa de ${item.name}`;
    row.appendChild(image);
    const name = document.createElement('span');
    name.textContent = item.name;
    row.appendChild(name);
  }
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'upload-remove';
  remove.textContent = 'Quitar';
  remove.setAttribute('aria-label',`Quitar ${item.name}`);
  remove.addEventListener('click',() => clearRegistrationUpload(id));
  row.appendChild(remove);
  preview.appendChild(row);
}
function clearRegistrationUpload(id){
  delete registrationUploads[id];
  const input = document.getElementById(id);
  if(input) input.value = '';
  uploadError(id,'');
  renderUploadPreview(id);
}
async function handleRegistrationUpload(input){
  const file = input.files && input.files[0];
  const id = input.id;
  if(!file){ clearRegistrationUpload(id); return; }
  const config = uploadDefinitions[id];
  const allowedTypes = config.documents
    ? ['image/jpeg','image/png','image/webp','application/pdf']
    : ['image/jpeg','image/png','image/webp'];
  if(!allowedTypes.includes(file.type)){
    clearRegistrationUpload(id);
    uploadError(id,config.documents ? 'Formato no válido. Usa JPG, PNG, WebP o PDF.' : 'Formato no válido. Usa una imagen JPG, PNG o WebP.');
    return;
  }
  if(file.size > uploadMaxBytes){
    clearRegistrationUpload(id);
    uploadError(id,'El archivo supera el máximo de 5 MB. Elige uno más pequeño.');
    return;
  }
  uploadError(id,'');
  input.disabled = true;
  try{
    const data = file.type === 'application/pdf'
      ? await readFileAsDataURL(file)
      : await compressRegistrationImage(file,config.maxSide);
    registrationUploads[id] = {data,name:file.name,type:file.type === 'application/pdf' ? file.type : 'image/jpeg'};
    renderUploadPreview(id);
  }catch(error){
    clearRegistrationUpload(id);
    uploadError(id,'No pudimos procesar este archivo. Prueba con otra imagen o PDF.');
    console.error(`Error al procesar el archivo ${id}.`,error);
  }finally{
    input.disabled = false;
  }
}
function initRegistrationUploads(){
  Object.keys(uploadDefinitions).forEach(id => {
    const input = document.getElementById(id);
    if(input) input.addEventListener('change',() => handleRegistrationUpload(input));
  });
}
function validateIdentityUploads(){
  let valid = true;
  Object.entries(uploadDefinitions).filter(([,config]) => config.required).forEach(([id]) => {
    const present = Boolean(registrationUploads[id]);
    uploadError(id,present ? '' : 'Este archivo es obligatorio para continuar.');
    if(!present) valid = false;
  });
  return valid;
}
function passwordIsValid(value){
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
}
function updatePasswordFeedback(passwordId,confirmId){
  const password = document.getElementById(passwordId);
  const confirm = document.getElementById(confirmId);
  const rules = document.getElementById(`${passwordId}-rules`);
  const strength = document.getElementById(`${passwordId}-strength`);
  const value = password.value;
  const matches = {
    length:value.length >= 8,
    upper:/[A-Z]/.test(value),
    lower:/[a-z]/.test(value),
    number:/\d/.test(value),
  };
  if(rules){
    rules.querySelectorAll('[data-rule]').forEach(item => {
      const met = matches[item.dataset.rule];
      item.classList.toggle('ok',met);
      item.querySelector('span').textContent = met ? '✓' : '○';
    });
  }
  const score = Object.values(matches).filter(Boolean).length;
  if(strength){
    const bar = strength.querySelector('.strength-track span');
    const label = strength.querySelector('.strength-label');
    const status = score === 4 ? 'fuerte' : score >= 2 ? 'media' : 'débil';
    bar.style.width = `${score * 25}%`;
    strength.dataset.strength = status;
    label.textContent = `Fuerza: ${status}`;
  }
  password.setAttribute('aria-invalid',String(Boolean(value) && !passwordIsValid(value)));
  if(confirm){
    const message = document.getElementById(`${confirmId}-match`);
    const entered = confirm.value.length > 0;
    const same = entered && confirm.value === value;
    message.textContent = !entered ? '' : same ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden';
    message.classList.toggle('valid',same);
    message.classList.toggle('invalid',entered && !same);
    confirm.setAttribute('aria-invalid',String(entered && !same));
  }
}
function initPasswordFields(){
  [['w-pass','w-pass2'],['w-pass-pro','w-pass2-pro']].forEach(([passwordId,confirmId]) => {
    const password = document.getElementById(passwordId);
    const confirm = document.getElementById(confirmId);
    if(!password || !confirm) return;
    password.addEventListener('input',() => updatePasswordFeedback(passwordId,confirmId));
    confirm.addEventListener('input',() => updatePasswordFeedback(passwordId,confirmId));
    updatePasswordFeedback(passwordId,confirmId);
  });
}
function togglePasswordVisibility(inputId,button){
  const input = document.getElementById(inputId);
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  button.setAttribute('aria-label',visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  button.setAttribute('aria-pressed',String(visible));
}
function registrationStorageError(errorId,error=lastStorageError){
  const quotaExceeded = error && (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014);
  const message = quotaExceeded
    ? 'No hay suficiente espacio disponible en este navegador para guardar tus documentos. Quita archivos o usa imágenes más pequeñas e inténtalo de nuevo.'
    : 'No se pudieron guardar tus datos en este navegador. Habilita el almacenamiento local e inténtalo de nuevo.';
  const errorElement = document.getElementById(errorId);
  errorElement.textContent = message;
  errorElement.classList.add('show');
}
async function notifyAdminOfRegistration(user){
  const fields = [
    `Nombre: ${user.name}`,
    `Correo del usuario: ${user.email}`,
    `Teléfono: ${user.phone || 'No indicado'}`,
    `Rol: ${user.role === 'professional' ? 'Enfermero/a' : 'Cliente'}`,
    `Zona: ${user.zone || 'No indicada'}`,
    user.role === 'professional' ? `Registro JVPE: ${user.jvpm || 'No indicado'}` : '',
    user.role === 'professional' ? `Especialidad: ${user.specialty || 'No indicada'}` : '',
    user.role === 'professional' ? `Años de experiencia: ${user.years || 'No indicados'}` : '',
    `Código de aprobación: ${user.approvalCode}`,
    '',
    'Esta es una solicitud de demostración. No se adjuntan contraseñas ni documentos.'
  ].filter(Boolean).join('\n');
  try{
    const response = await fetch(`https://formsubmit.co/ajax/${ADMIN_EMAIL}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json', Accept:'application/json'},
      body: JSON.stringify({
        _subject: `Nueva solicitud de registro: ${user.name}`,
        name: user.name,
        email: user.email,
        message: fields,
        _replyto: user.email,
        _template: 'table',
        _captcha: 'false',
      }),
    });
    const result = await response.json().catch(() => ({}));
    return response.ok && result.success !== false;
  }catch(error){
    return false;
  }
}
async function retryRegistrationEmail(){
  if(!currentUser) return;
  const sent = await notifyAdminOfRegistration(currentUser);
  saveJSON(LS_KEYS.registrationEmailStatus, sent ? 'sent' : 'failed');
  updateRegistrationEmailStatus();
}
function updateRegistrationEmailStatus(){
  const status = document.getElementById('registration-email-status');
  if(!status) return;
  const result = loadJSON(LS_KEYS.registrationEmailStatus, '');
  if(result === 'sent'){
    status.textContent = 'Solicitud enviada. Revisa curandissv@gmail.com y la carpeta de spam. Si es la primera vez, confirma el correo de FormSubmit.';
    status.style.color = 'var(--blue-deep)';
  } else if(result === 'failed'){
    status.textContent = 'No se pudo enviar la solicitud. Comprueba que estés usando la web publicada y pulsa reenviar.';
    status.style.color = 'var(--danger)';
  } else {
    status.textContent = 'La solicitud se enviará a curandissv@gmail.com.';
  }
}
function approveWithCode(){
  if(!currentUser || currentUser.status === 'approved') return;
  const input = document.getElementById('approval-code');
  const error = document.getElementById('approval-code-error');
  if(!input || !error) return;
  const code = input.value.trim();
  if(code !== currentUser.approvalCode){
    error.textContent = 'El código no es válido. Revisa el correo de Curandis.';
    error.classList.add('show');
    return;
  }
  const users = getUsers();
  const stored = users.find(user => user.email === currentUser.email);
  if(stored) stored.status = 'approved';
  saveUsers(users);
  currentUser.status = 'approved';
  setCurrentUser(currentUser);
  routeAfterAuth();
}
async function finishWizard(){
  const nombre = document.getElementById('w-nombre').value.trim();
  const apellidos = document.getElementById('w-apellidos').value.trim();
  const email = document.getElementById('w-email').value.trim();
  const telefono = document.getElementById('w-telefono').value.trim();
  if(!validateIdentityUploads()){
    wizardStep = 0;
    showWizardStep();
    return;
  }
  const identityPhotos = {
    duiNumber:document.getElementById('w-dui').value.trim(),
    duiFrontPhoto:registrationUploads['w-dui-front'].data,
    duiBackPhoto:registrationUploads['w-dui-back'].data,
    profilePhoto:registrationUploads['w-profile-photo'].data,
  };
  let user;
  if(wizardRole === 'family'){
    const pass = document.getElementById('w-pass').value;
    const pass2 = document.getElementById('w-pass2').value;
    const depto = document.getElementById('w-depto').value;
    const err = document.getElementById('wiz-error-2f');
    if(!depto || !passwordIsValid(pass) || pass!==pass2){
      err.textContent = 'Selecciona tu departamento y verifica que la contraseña cumpla los cuatro requisitos y coincida.';
      err.classList.add('show');
      return;
    }
    err.classList.remove('show');
    user = {email, password:pass, name:nombre+' '+apellidos, role:'family', status:'pending', phone:telefono, zone:depto+', '+document.getElementById('w-municipio').value, radius:document.getElementById('w-radio').value,...identityPhotos};
  } else {
    const pass = document.getElementById('w-pass-pro').value;
    const pass2 = document.getElementById('w-pass2-pro').value;
    const jvpe = document.getElementById('w-jvpe').value.trim();
    const err = document.getElementById('wiz-error-2p');
    const specialty = document.getElementById('w-especialidad').value;
    const depto = document.getElementById('w-depto-pro').value;
    if(!jvpe || !specialty || !depto || !passwordIsValid(pass) || pass!==pass2){
      err.textContent = 'Completa tu registro JVPE, especialidad y departamento; la contraseña debe cumplir los cuatro requisitos y coincidir.';
      err.classList.add('show');
      return;
    }
    err.classList.remove('show');
    user = {email, password:pass, name:nombre+' '+apellidos, role:'professional', phone:telefono, jvpm:jvpe,
      years:document.getElementById('w-anios').value, specialty,
      zone:depto+', '+document.getElementById('w-municipio-pro').value,
      radius:document.getElementById('w-radio-pro').value, status:'pending',
      titlePhoto:registrationUploads['w-title-photo']?.data || '',
      criminalRecordPhoto:registrationUploads['w-criminal-photo']?.data || '',...identityPhotos};
  }
  const users = getUsers();
  user.approvalCode = createApprovalCode();
  users.push(user);
  const storageErrorId = wizardRole === 'family' ? 'wiz-error-2f' : 'wiz-error-2p';
  if(!saveUsers(users)){
    registrationStorageError(storageErrorId);
    return;
  }
  currentUser = user;
  if(!setCurrentUser(user)){
    const storageError = lastStorageError;
    users.pop();
    saveUsers(users);
    currentUser = null;
    registrationStorageError(storageErrorId,storageError);
    return;
  }
  const emailSent = await notifyAdminOfRegistration(user);
  saveJSON(LS_KEYS.registrationEmailStatus, emailSent ? 'sent' : 'failed');
  routeAfterAuth();
}

/* ===================== TAB BAR DE APP (post-login) — usada en las 8 páginas internas ===================== */
function tabBarHTML(active){
  const roleLabel = currentUser.role === 'family' ? 'Cliente' : 'Enfermero/a';
  const tabs = currentUser.role === 'family'
    ? [['Buscar','client-search'],['Solicitudes','client-requests'],['Mensajes','client-messages'],['Nosotros','nosotros']]
    : [['Trabajos','nurse-jobs'],['Solicitudes','nurse-requests'],['Chats','nurse-chats'],['Mi Perfil','nurse-profile'],['Nosotros','nosotros']];
  return `
    <nav class="app-topbar">
      <div class="app-topbar-inner">
        <div class="app-topbar-left"><a class="app-brand-logo" href="${PAGES.home}" aria-label="Curandis, ir al inicio"><img src="photos/logo.png" alt=""></a><div class="app-greeting"><span class="avatar-dot">${currentUser.profilePhoto ? `<img src="${esc(currentUser.profilePhoto)}" alt="">` : esc(initials(currentUser.name))}</span><div>Buenas tardes,<br><strong>${esc(currentUser.name)}</strong></div></div></div>
        <div class="app-topbar-right"><span class="role-chip">${roleLabel}</span><a class="logout-link" onclick="logout()">↪ Salir</a></div>
      </div>
      <div class="app-tabs">${tabs.map(t=>`<a class="app-tab ${active===t[1]?'active':''}" href="${PAGES[t[1]]}">${t[0]}</a>`).join('')}</div>
    </nav>`;
}
function renderTabbar(active){
  const slot = document.querySelector('.tabbar-slot');
  if(slot) slot.innerHTML = tabBarHTML(active);
}

/* ===================== DASHBOARD ENFERMERO — trabajos.html ===================== */
function renderNurseDashboard(){
  renderJobBoard();
  renderAgenda();
}
function renderJobBoard(){
  const list = document.getElementById('job-list');
  if(!list) return;
  const applied = getAppliedJobs();
  list.innerHTML = mockJobs.map((job, idx) => `
    <div class="job-card">
      <div class="jc-top">
        <div><h4>${job.patient}</h4><p>${job.tasks}</p></div>
        <div class="pay">$${job.pay}</div>
      </div>
      <div class="tags">
        <span class="tag">${job.zone}</span><span class="tag">${job.turno}</span>
        <span class="tag ${job.urgencia==='Prioritaria'?'urgent':''}">${job.urgencia}</span>
      </div>
      <div class="privacy-note">🔒 La dirección exacta se revela solo si la familia confirma tu postulación.</div>
      <div style="margin-top:12px;text-align:right;"><button class="btn-apply ${applied.includes(idx)?'applied':''}" id="apply-${idx}" ${applied.includes(idx)?'disabled':''} onclick="applyJob(${idx})">${applied.includes(idx)?'Postulado ✓':'Postularme'}</button></div>
    </div>`).join('');
}
function applyJob(idx){
  const applied = getAppliedJobs();
  if(!applied.includes(idx)){ applied.push(idx); saveAppliedJobs(applied); }
  const btn = document.getElementById('apply-'+idx);
  btn.textContent = 'Postulado ✓'; btn.classList.add('applied'); btn.disabled = true;
}
function renderAgenda(){
  const grid = document.getElementById('agenda-grid');
  if(!grid) return;
  const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const slots = ['AM','PM','Noche'];
  const busy = {'Lun-AM':1,'Mié-AM':1,'Vie-AM':1,'Mar-Noche':1,'Jue-Noche':1};
  let html = '<div class="ag-label"></div>' + days.map(d=>'<div class="ag-head">'+d+'</div>').join('');
  slots.forEach(slot => {
    html += '<div class="ag-label">'+slot+'</div>';
    days.forEach(d => {
      const key = d+'-'+slot;
      html += '<div class="ag-cell '+(busy[key]?'busy':'')+'"></div>';
    });
  });
  grid.style.gridTemplateColumns = 'auto repeat(7,1fr)';
  grid.innerHTML = html;
}

/* ===================== BUSCADOR DE ENFERMEROS (CLIENTE) — buscar.html ===================== */
function nurseCardHTML(n){
  const statusClass = n.disponible ? 'available' : 'unavailable';
  const statusLabel = n.disponible ? 'Disponible' : 'No disponible';
  const stars = '★'.repeat(Math.round(n.rating)) + '☆'.repeat(5-Math.round(n.rating));
  return `
    <div class="nurse-card ${statusClass}">
      <div class="nc-top">
        <div class="nc-who">
          <div class="nc-avatar">👩‍⚕️</div>
          <div><div class="nc-name">${esc(n.name)}</div><div class="nc-reg">✓ ${esc(n.jvpe)}</div></div>
        </div>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <div class="nc-tags"><span class="nc-tag">${esc(n.spec)}</span>${n.tuZona?'<span class="nc-tag zone">Tu zona</span>':''}</div>
      <div class="nc-stats">
        <div class="nc-stat"><b>${stars} ${n.rating}</b>${n.reviews} reseñas</div>
        <div class="nc-stat"><b>${n.years} años</b>experiencia</div>
        <div class="nc-stat"><b>$${n.rate}/hr</b>tarifa aprox.</div>
      </div>
      <div class="nc-loc">📍 ${esc(n.zone)} &nbsp;±${n.dist} km</div>
      <p class="nc-desc">${esc(n.desc)}</p>
      <span class="nc-services">Ver ${n.servicios} servicios ⌄</span>
      ${n.disponible
        ? `<button class="nc-btn" onclick='openRequestModal(${esc(JSON.stringify(n.name))})'>📶 Enviar Solicitud de Servicio</button>`
        : `<button class="nc-btn disabled" disabled>✕ No disponible actualmente</button>`}
    </div>`;
}
function renderNurseSearch(){
  const filterSelect = document.getElementById('nurse-search-filter');
  if(filterSelect && filterSelect.options.length <= 1){
    specialties.forEach(s => { const o=document.createElement('option'); o.value=s; o.textContent=s; filterSelect.appendChild(o); });
  }
  document.getElementById('sb-disponibles').textContent = mockNurses.filter(n=>n.disponible).length;
  document.getElementById('sb-total').textContent = mockNurses.length;
  document.getElementById('sb-zona').textContent = mockNurses.filter(n=>n.tuZona).length;

  const q = (document.getElementById('nurse-search-input')?.value || '').toLowerCase();
  const spec = document.getElementById('nurse-search-filter')?.value || '';
  const filtered = mockNurses.filter(n =>
    (n.name.toLowerCase().includes(q) || n.spec.toLowerCase().includes(q)) && (!spec || n.spec === spec)
  );
  const enZona = filtered.filter(n=>n.tuZona);
  const otros = filtered.filter(n=>!n.tuZona);
  let html = '';
  if(enZona.length){
    html += `<div class="zone-heading">📍 En San Salvador <span class="count">${enZona.length} cerca</span></div><div class="nurse-grid">${enZona.map(nurseCardHTML).join('')}</div>`;
  }
  if(otros.length){
    html += `<div class="zone-heading">〰️ Otros departamentos <span class="count">${otros.length}</span></div><div class="nurse-grid">${otros.map(nurseCardHTML).join('')}</div>`;
  }
  if(!filtered.length) html = '<div class="app-empty"><div class="ae-icon">🔍</div><h3>Sin resultados</h3><p>Prueba con otro nombre o especialidad.</p></div>';
  document.getElementById('nurse-search-results').innerHTML = html;
}

/* ===================== SOLICITUDES DEL CLIENTE — solicitudes.html ===================== */
function toggleTimeline(idx){
  document.getElementById('tl-detail-'+idx).classList.toggle('open');
}
function renderClientRequests(){
  const el = document.getElementById('client-requests-list');
  if(!el) return;
  familyPostings = getPostings();
  if(!familyPostings.length){ el.innerHTML = '<div class="app-empty"><div class="ae-icon">📋</div><h3>Todavía no has publicado ninguna solicitud</h3><p>Usa "Buscar" para enviar una solicitud a un enfermero, o publica un trabajo abierto.</p></div>'; return; }
  el.innerHTML = familyPostings.map((p, idx) => `
    <div class="timeline-item" onclick="toggleTimeline(${idx})">
      <div class="ti-top">
        <div><h4>${esc(p.paciente || p.relation || 'Solicitud')}</h4><p>${esc(p.tipo || p.turno || '')}${p.fecha? ' · '+esc(p.fecha) : ''}</p></div>
        <span class="tag ${p.urgencia==='urgente'||p.urgencia==='Prioritaria/Urgente'?'urgent':''}">${esc(p.urgencia) || '—'}</span>
      </div>
      <div class="tags"><span class="tag">${p.nurseName ? 'Para: '+esc(p.nurseName) : 'Solicitud abierta'}</span></div>
      <div class="timeline-detail" id="tl-detail-${idx}">
        <p style="font-size:13px;">${esc(p.desc) || 'Sin descripción adicional.'}</p>
      </div>
    </div>`).join('');
}

/* ===================== MI PERFIL (ENFERMERO) — perfil.html ===================== */
function renderNurseProfile(){
  if(!currentUser) return;
  const avatar = document.getElementById('prof-avatar');
  if(currentUser.profilePhoto){
    avatar.innerHTML = `<img src="${esc(currentUser.profilePhoto)}" alt="Foto de perfil de ${esc(currentUser.name)}">`;
  }else{
    avatar.textContent = initials(currentUser.name);
  }
  document.getElementById('prof-name').textContent = currentUser.name;
  document.getElementById('prof-specialty').textContent = currentUser.specialty || 'Enfermería General';
  document.getElementById('prof-reg').textContent = '✓ JVPE: ' + (currentUser.jvpm || '001-2025');
  document.getElementById('prof-rating').textContent = '5.0';
  document.getElementById('prof-years').textContent = currentUser.years || '1';
  document.getElementById('prof-rate').textContent = '$15';
  document.getElementById('prof-email').textContent = currentUser.email;
  document.getElementById('prof-phone').textContent = currentUser.phone || '—';
  document.getElementById('prof-location').textContent = currentUser.zone || '—';
  document.getElementById('prof-radius').textContent = (currentUser.radius || '15') + ' km de cobertura';
  document.getElementById('prof-spec2').textContent = currentUser.specialty || 'Enfermería General';
  document.getElementById('prof-reg2').textContent = 'JVPE: ' + (currentUser.jvpm || '001-2025');
}

/* ===================== MODAL: NUEVA SOLICITUD / TRABAJO ABIERTO — usado en buscar.html ===================== */
let requestTargetNurse = null;
function selectUrgency(kind){
  document.getElementById('req-urg-normal').classList.toggle('selected', kind==='normal');
  document.getElementById('req-urg-urgente').classList.toggle('selected', kind==='urgente');
}
function openRequestModal(nurseName){
  requestTargetNurse = mockNurses.find(n=>n.name===nurseName) || null;
  document.getElementById('req-modal-title').textContent = 'Nueva Solicitud';
  document.getElementById('req-modal-sub').textContent = 'Completa los datos del servicio que necesitas';
  document.getElementById('req-open-note').style.display = 'none';
  document.getElementById('req-submit-btn').textContent = '📶 Enviar Solicitud';
  if(requestTargetNurse){
    const stars = '★'.repeat(Math.round(requestTargetNurse.rating));
    document.getElementById('req-nurse-chip-slot').innerHTML = `
      <div class="req-nurse-chip"><div class="nc-avatar">👩‍⚕️</div><div><div class="n-name">${esc(requestTargetNurse.name)}</div><div class="n-meta">${esc(requestTargetNurse.spec)} · ${stars} ${requestTargetNurse.rating} (${requestTargetNurse.reviews} reseñas) · $${requestTargetNurse.rate}/hr</div></div></div>`;
  } else {
    document.getElementById('req-nurse-chip-slot').innerHTML = '';
  }
  resetRequestForm();
  document.getElementById('request-modal-overlay').classList.add('show');
}
function openOpenJobModal(){
  requestTargetNurse = null;
  document.getElementById('req-modal-title').textContent = 'Publicar Trabajo Abierto';
  document.getElementById('req-modal-sub').textContent = 'Cualquier enfermero/a disponible podrá aceptarlo';
  document.getElementById('req-nurse-chip-slot').innerHTML = '';
  document.getElementById('req-open-note').style.display = 'flex';
  document.getElementById('req-submit-btn').textContent = '📶 Publicar Trabajo';
  resetRequestForm();
  document.getElementById('request-modal-overlay').classList.add('show');
}
function resetRequestForm(){
  selectUrgency('normal');
  document.getElementById('req-fecha').value='';
  document.getElementById('req-horario').value='';
  document.getElementById('req-tipo').value='';
  document.getElementById('req-paciente').value='';
  document.getElementById('req-desc').value='';
}
function closeRequestModal(){ document.getElementById('request-modal-overlay').classList.remove('show'); }
function submitRequest(){
  const urgencia = document.getElementById('req-urg-urgente').classList.contains('selected') ? 'urgente' : 'normal';
  familyPostings = getPostings();
  familyPostings.unshift({
    id: Date.now(),
    nurseName: requestTargetNurse ? requestTargetNurse.name : null,
    urgencia, fecha: document.getElementById('req-fecha').value, horario: document.getElementById('req-horario').value,
    tipo: document.getElementById('req-tipo').value, paciente: document.getElementById('req-paciente').value,
    desc: document.getElementById('req-desc').value,
  });
  savePostings(familyPostings);
  closeRequestModal();
  goTo('client-requests');
}

/* ===================== INICIALIZACIÓN COMÚN ===================== */
document.addEventListener('DOMContentLoaded', () => {
  initLegalModal();
  updateNavUser();
  updateRegistrationEmailStatus();
  wireOptionCards();
  initRegistrationUploads();
  initPasswordFields();
  initRulesCardReveal();
  initWhatsAppWidget();
  document.querySelectorAll('#main-nav-links a').forEach(link => link.addEventListener('click',() => toggleMainMenu(false)));
  document.addEventListener('keydown',event => {
    if(event.key === 'Escape') toggleMainMenu(false);
  });
});
