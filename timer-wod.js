/**
 * timer-wod.js  v4
 * Box-Pro KTS — Timer con cadena de bloques secuencial
 *
 * v4 cambios:
 *  - Padding-top en ejercicios para no quedar tapados por header
 *  - Botón TERMINAR con confirmación
 *  - Timer countdown total del WOD completo
 */

// ─────────────────────────────────────────────
// AUDIO
// ─────────────────────────────────────────────
const KTSAudio = (() => {
  let ctx = null;
  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function tone(freq, dur, vol = 0.5, type = 'sine') {
    try {
      const a = ac(), o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination);
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      o.start(); o.stop(a.currentTime + dur);
    } catch(e) {}
  }
  return {
    go()         { tone(660,.1); setTimeout(()=>tone(880,.3,.7),150); },
    tick(s)      { tone(s<=3?1200:880,.07,.35); },
    round()      { tone(1000,.18,.5,'square'); },
    done()       { tone(440,.2); setTimeout(()=>tone(660,.2),220); setTimeout(()=>tone(880,.5,.9),440); },
    blockEnd()   { tone(440,.15); setTimeout(()=>tone(550,.15),180); setTimeout(()=>tone(660,.4,.8),360); },
    restStart()  { tone(440,.3,.4,'sawtooth'); },
    tabataWork() { tone(880,.15,.6,'square'); },
    tabataRest() { tone(440,.25,.4,'sawtooth'); }
  };
})();

function vibe(p=[200]) { navigator.vibrate?.(p); }

// ─────────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────────
let T = {
  // Cadena
  chain: [],
  chainIdx: 0,

  // Timer actual (bloque)
  status: 'idle',      // idle | running | paused | between | finished
  type: null,
  config: {},
  elapsed: 0,
  round: 1,
  totalRounds: 0,
  tabataPhase: 'work',
  startTs: null,
  pausedAt: null,
  pausedMs: 0,
  intervalId: null,
  lastCountSec: -1,

  // Timer total del WOD
  totalInitialSec: 0,
  totalAccumSec: 0,    // segundos acumulados mientras corrió
  totalRunStart: null, // timestamp de cuando arrancó la última vez
};

// ─────────────────────────────────────────────
// COLORES / LABELS
// ─────────────────────────────────────────────
function timerColor(tipo) {
  const map = { AMRAP:'#EF4444', FOR_TIME:'#3B82F6', EMOM:'#10B981',
                EXMOM:'#8B5CF6', TABATA:'#F59E0B', REST:'#6B7280', NONE:'#FF6B35' };
  return map[(tipo||'NONE').toUpperCase()] || '#FF6B35';
}
function timerBg(tipo) {
  const map = { AMRAP:'#1a0505', FOR_TIME:'#050e2a', EMOM:'#02120a',
                EXMOM:'#150730', TABATA:'#1a0e02', REST:'#0d0d0f', NONE:'#0a0a0a' };
  return map[(tipo||'NONE').toUpperCase()] || '#0a0a0a';
}
function timerLabel(tipo) {
  const map = { AMRAP:'AMRAP', FOR_TIME:'FOR TIME', EMOM:'EMOM',
                EXMOM:'ExMOM', TABATA:'TABATA', REST:'REST', NONE:'–' };
  return map[(tipo||'NONE').toUpperCase()] || (tipo||'–');
}
function fmt(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
function el(id) { return document.getElementById(id); }

// ─────────────────────────────────────────────
// CALCULAR TIEMPO TOTAL DE UNA LISTA DE BLOQUES
// ─────────────────────────────────────────────
function calcTotalSec(blocks) {
  return (blocks || []).reduce((sum, b) => sum + blockTotalSec(b), 0);
}

function updateTotalDisplay(remSec) {
  const el_ = el('ktm-total-time');
  if (el_) el_.textContent = fmt(remSec);
}

// ─────────────────────────────────────────────
// MODAL HTML
// ─────────────────────────────────────────────
function ensureModal() {
  if (document.getElementById('kts-timer-modal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="kts-timer-modal"
         style="display:none;position:fixed;inset:0;z-index:2000;
                font-family:'Oswald',sans-serif;height:100%;width:100%;">

      <style>
        @keyframes ktm-glow  { from{text-shadow:0 0 5px #FF6B35} to{text-shadow:0 0 25px #FF6B35,0 0 50px #FF6B35} }
        @keyframes ktm-pulse { from{opacity:1} to{opacity:.4} }
        @keyframes ktm-slidein { from{transform:translateY(8px);opacity:0} to{transform:translateY(0);opacity:1} }
        .ktm-alert { animation:ktm-pulse .5s infinite alternate; color:#FF6B35 !important; }

        #kts-timer-modal        { display:none; flex-direction:column; }
        #ktm-body               { flex:1; display:flex; flex-direction:row; overflow:hidden; min-height:0; }
        #ktm-timer-side         { flex:1.4; display:flex; flex-direction:column; align-items:center;
                                   justify-content:center; padding:1.5rem; overflow:hidden; min-height:0; }
        #ktm-exercises-side     { flex:1; overflow-y:auto; padding:1.25rem;
                                   display:flex; flex-direction:column; gap:.6rem; min-height:0; }
        #ktm-vert-sep           { width:1px; background:rgba(255,255,255,.08); flex-shrink:0; }
        #ktm-circle-wrap        { position:relative; display:flex; align-items:center;
                                   justify-content:center; width:min(55vw,300px); height:min(55vw,300px); }
        #ktm-svg                { position:absolute; inset:0; width:100%; height:100%; transform:rotate(-90deg); }
        #ktm-time-overlay       { position:relative; z-index:1; display:flex; flex-direction:column;
                                   align-items:center; gap:.3rem; text-align:center; }
        #ktm-time               { font-size:clamp(3rem,12vw,5.5rem); line-height:1; color:white;
                                   letter-spacing:3px; text-shadow:0 0 40px rgba(255,107,53,.4); }
        #ktm-controls           { display:flex; gap:.75rem; margin-top:1.5rem; flex-wrap:wrap; justify-content:center; }

        /* Timer total */
        #ktm-total-wrap         { margin-top:.6rem; text-align:center; }
        #ktm-total-label        { font-size:.6rem; letter-spacing:3px; color:rgba(255,255,255,.35); }
        #ktm-total-time         { font-size:1.3rem; letter-spacing:3px; color:#FF6B35;
                                   font-weight:bold; line-height:1.2; }

        /* Barra de progreso de bloques */
        #ktm-progress-bar       { display:flex; gap:3px; padding:.4rem 1rem 1.4rem;
                                   flex-shrink:0; overflow-x:auto; }
        .ktm-seg                { height:6px; border-radius:3px; flex-shrink:0;
                                   transition:opacity .3s; cursor:default; position:relative; }
        .ktm-seg-label          { position:absolute; top:10px; left:50%; transform:translateX(-50%);
                                   font-size:.55rem; letter-spacing:1px; white-space:nowrap;
                                   color:rgba(255,255,255,.5); pointer-events:none; }
        .ktm-seg.active         { opacity:1 !important; }
        .ktm-seg.done           { opacity:.35 !important; }
        .ktm-seg.pending        { opacity:.2 !important; }

        /* Panel "entre bloques" */
        #ktm-between            { display:none; flex-direction:column; align-items:center;
                                   justify-content:center; gap:1rem; animation:ktm-slidein .3s ease; }
        #ktm-between-msg        { font-size:1.1rem; letter-spacing:2px; color:rgba(255,255,255,.7);
                                   text-align:center; }
        #ktm-between-next       { font-size:.8rem; letter-spacing:2px; color:rgba(255,255,255,.4); }
        #ktm-btn-next           { padding:.7rem 2rem; background:#FF6B35; color:black; border:none;
                                   border-radius:.5rem; font-family:'Oswald',sans-serif; font-size:1rem;
                                   letter-spacing:2px; cursor:pointer; box-shadow:0 4px 20px rgba(255,107,53,.4); }

        /* Botón TERMINAR */
        #ktm-btn-terminar       { padding:.6rem 1.2rem; background:rgba(220,38,38,.15);
                                   border:1px solid rgba(220,38,38,.4); color:#EF4444;
                                   border-radius:.5rem; font-family:'Oswald',sans-serif;
                                   font-size:.9rem; letter-spacing:2px; cursor:pointer;
                                   transition:all .2s; }
        #ktm-btn-terminar:hover { background:rgba(220,38,38,.3); border-color:#EF4444; }

        /* Móvil */
        @media (max-width:640px) {
          #ktm-body              { flex-direction:column !important; }
          #ktm-vert-sep          { width:100% !important; height:1px !important; }

          /* Timer side: altura fija reducida ~38% de la pantalla */
          #ktm-timer-side        { flex:0 0 38vh !important; width:100% !important;
                                    padding:.25rem .75rem !important; overflow:hidden !important;
                                    justify-content:center !important; }

          /* Ejercicios: ocupa el resto de la pantalla con scroll */
          #ktm-exercises-side    { flex:1 1 0 !important; width:100% !important;
                                    padding:.75rem 1rem 3rem !important; min-height:0 !important;
                                    -webkit-overflow-scrolling:touch; }

          /* Círculo más pequeño */
          #ktm-circle-wrap       { width:100px !important; height:100px !important; }
          #ktm-time              { font-size:1.7rem !important; letter-spacing:1px !important; }
          #ktm-round-info        { font-size:.6rem !important; }
          #ktm-tabata-phase      { font-size:.7rem !important; }

          /* Controles compactos en una sola fila */
          #ktm-controls          { margin-top:.25rem !important; gap:.4rem !important; flex-wrap:nowrap !important; }
          #ktm-btn-reset         { padding:.3rem .7rem !important; font-size:.75rem !important; }
          #ktm-btn-start         { padding:.3rem .9rem !important; font-size:.8rem !important; }
          #ktm-btn-terminar      { padding:.3rem .6rem !important; font-size:.7rem !important; }

          /* Timer total compacto */
          #ktm-total-wrap        { margin-top:.15rem !important; }
          #ktm-total-label       { font-size:.5rem !important; }
          #ktm-total-time        { font-size:.85rem !important; }

          #ktm-finished          { font-size:.85rem !important; bottom:.2rem !important; }
          #ktm-progress-bar      { padding:.3rem .5rem .4rem; }
          .ktm-seg               { height:4px; }
          .ktm-seg-label         { display:none; }
        }
      </style>

      <!-- HEADER -->
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:.75rem 1rem;border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0;">
        <div id="ktm-type-badge" style="font-size:.8rem;letter-spacing:3px;color:#FF6B35;opacity:.9;min-width:80px;"></div>
        <div id="ktm-block-name" style="font-size:1rem;font-weight:600;color:white;letter-spacing:1px;text-align:center;flex:1;padding:0 .5rem;"></div>
        <button onclick="WODTimer.close()"
                style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);
                       color:rgba(255,255,255,.6);padding:.4rem .9rem;border-radius:.4rem;
                       font-family:'Oswald',sans-serif;font-size:.8rem;letter-spacing:1px;cursor:pointer;flex-shrink:0;">
          CERRAR
        </button>
      </div>

      <!-- BARRA DE BLOQUES -->
      <div id="ktm-progress-bar"></div>

      <!-- BODY -->
      <div id="ktm-body">

        <!-- TIMER SIDE -->
        <div id="ktm-timer-side">

          <!-- Círculo + tiempo -->
          <div id="ktm-circle-wrap">
            <svg id="ktm-svg" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10"/>
              <circle id="ktm-arc" cx="100" cy="100" r="88" fill="none" stroke="#FF6B35"
                      stroke-width="10" stroke-linecap="round" stroke-dasharray="553" stroke-dashoffset="0"
                      style="transition:stroke-dashoffset .9s linear,stroke .3s;"/>
            </svg>
            <div id="ktm-time-overlay">
              <div id="ktm-time">00:00</div>
              <div id="ktm-round-info" style="font-size:.85rem;letter-spacing:2px;color:rgba(255,255,255,.5);display:none;">
                RONDA <span id="ktm-round-cur" style="color:#FF6B35;font-weight:bold;"></span>
                / <span id="ktm-round-tot"></span>
              </div>
              <div id="ktm-tabata-phase" style="font-size:1.2rem;letter-spacing:3px;display:none;"></div>
            </div>
          </div>

          <!-- Timer total del WOD -->
          <div id="ktm-total-wrap">
            <div id="ktm-total-label">WOD TOTAL</div>
            <div id="ktm-total-time">00:00</div>
          </div>

          <!-- Controles normales -->
          <div id="ktm-controls">
            <button id="ktm-btn-reset" onclick="WODTimer.reset()"
                    style="padding:.6rem 1.4rem;background:rgba(255,255,255,.07);
                           border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.6);
                           border-radius:.5rem;font-family:'Oswald',sans-serif;
                           font-size:1rem;letter-spacing:2px;cursor:pointer;">
              RESET
            </button>
            <button id="ktm-btn-start" onclick="WODTimer.toggle()"
                    style="padding:.6rem 2.2rem;background:#FF6B35;color:black;border:none;
                           border-radius:.5rem;font-family:'Oswald',sans-serif;
                           font-size:1.1rem;letter-spacing:2px;cursor:pointer;
                           box-shadow:0 4px 20px rgba(255,107,53,.4);">
              INICIAR
            </button>
            <button id="ktm-btn-terminar" onclick="WODTimer.terminar()">
              TERMINAR
            </button>
          </div>

          <!-- Panel entre bloques -->
          <div id="ktm-between">
            <div id="ktm-between-msg">BLOQUE COMPLETADO</div>
            <div id="ktm-between-next"></div>
            <button id="ktm-btn-next" onclick="WODTimer.nextBlock()">
              SIGUIENTE ▶
            </button>
          </div>

          <!-- Banner fin total -->
          <div id="ktm-finished"
               style="display:none;position:absolute;bottom:1.5rem;
                      font-size:1.4rem;letter-spacing:4px;color:#FF6B35;
                      animation:ktm-glow 1.5s infinite alternate;">
            ¡TIEMPO!
          </div>

        </div><!-- /timer-side -->

        <!-- SEPARADOR -->
        <div id="ktm-vert-sep"></div>

        <!-- EJERCICIOS -->
        <div id="ktm-exercises-side">
          <div style="font-size:.65rem;letter-spacing:3px;color:rgba(255,255,255,.3);margin-bottom:.25rem;">
            EJERCICIOS DEL BLOQUE
          </div>
          <div id="ktm-exercise-list"></div>
        </div>

      </div><!-- /body -->
    </div>
  `);
}

// ─────────────────────────────────────────────
// ABRIR MODAL — recibe todos los bloques del WOD + índice de inicio
// ─────────────────────────────────────────────
function openBlock(allBloques, startIdx) {
  ensureModal();
  stopTick();

  T.chain    = allBloques.slice(startIdx);
  T.chainIdx = 0;

  // Inicializar timer total
  T.totalInitialSec = calcTotalSec(T.chain);
  T.totalAccumSec   = 0;
  T.totalRunStart   = null;
  updateTotalDisplay(T.totalInitialSec);

  const firstTipo = (T.chain[0]?.timer_tipo || 'none').toUpperCase();
  el('kts-timer-modal').style.background = timerBg(firstTipo);
  el('kts-timer-modal').style.display    = 'flex';

  renderProgressBar();
  loadBlock(0);
}

// ─────────────────────────────────────────────
// CARGAR UN BLOQUE DE LA CADENA
// ─────────────────────────────────────────────
function loadBlock(idx) {
  T.chainIdx = idx;
  const bloque = T.chain[idx];
  const tipo   = (bloque.timer_tipo || 'none').toUpperCase();
  const color  = timerColor(tipo);

  resetState();  // no toca total*

  T.type   = tipo;
  T.config = buildConfig(bloque);

  el('kts-timer-modal').style.background = timerBg(tipo);

  el('ktm-type-badge').textContent = timerLabel(tipo);
  el('ktm-type-badge').style.color = color;
  el('ktm-block-name').textContent = bloque.titulo_bloque || '';

  el('ktm-arc').style.stroke = color;
  setArc(0);

  el('ktm-finished').style.display    = 'none';
  el('ktm-between').style.display     = 'none';
  el('ktm-controls').style.display    = 'flex';
  el('ktm-btn-start').textContent     = 'INICIAR';
  el('ktm-btn-start').style.background    = color;
  el('ktm-btn-start').style.boxShadow     = `0 4px 20px ${color}66`;
  el('ktm-time').classList.remove('ktm-alert');

  showInitialTime();

  if (T.config.totalRounds > 0) {
    el('ktm-round-info').style.display = 'block';
    el('ktm-round-cur').textContent    = '1';
    el('ktm-round-tot').textContent    = T.config.totalRounds;
  } else {
    el('ktm-round-info').style.display = 'none';
  }

  if (tipo === 'TABATA') {
    el('ktm-tabata-phase').style.display = 'block';
    el('ktm-tabata-phase').textContent   = '▶ TRABAJO';
    el('ktm-tabata-phase').style.color   = '#EF4444';
  } else {
    el('ktm-tabata-phase').style.display = 'none';
  }

  renderExercises(bloque.ejercicios_bloque || []);
  updateProgressBar();
}

function buildConfig(b) {
  const tipo = (b.timer_tipo || 'none').toUpperCase();
  switch(tipo) {
    case 'AMRAP':    return { totalSec: (b.timer_duracion||10)*60, totalRounds:0 };
    case 'FOR_TIME': return { timeCap:  (b.timer_duracion||0)*60,  totalRounds:0 };
    case 'EMOM':     return { rounds: b.timer_rondas||b.timer_duracion||10,
                               totalRounds: b.timer_rondas||b.timer_duracion||10 };
    case 'EXMOM':    return { intervalSec:(b.timer_intervalo||3)*60,
                               rounds:b.timer_rondas||5, totalRounds:b.timer_rondas||5 };
    case 'TABATA':   return { workSec:b.timer_trabajo||20, restSec:b.timer_descanso||10,
                               rounds:b.timer_rondas||8, totalRounds:b.timer_rondas||8 };
    case 'REST':     return { totalSec:(b.timer_duracion||2)*60, totalRounds:0 };
    default:         return { totalRounds:0 };
  }
}

function showInitialTime() {
  const tipo = T.type, cfg = T.config;
  let txt = '00:00';
  if      (tipo==='AMRAP')                         txt = fmt(cfg.totalSec);
  else if (tipo==='FOR_TIME' && cfg.timeCap>0)     txt = fmt(cfg.timeCap);
  else if (tipo==='EMOM')                          txt = '01:00';
  else if (tipo==='EXMOM')                         txt = fmt(cfg.intervalSec);
  else if (tipo==='TABATA')                        txt = fmt(cfg.workSec);
  else if (tipo==='REST')                          txt = fmt(cfg.totalSec);
  el('ktm-time').textContent = txt;
  setArc(0);
}

// ─────────────────────────────────────────────
// BARRA DE PROGRESO DE BLOQUES
// ─────────────────────────────────────────────
function renderProgressBar() {
  const bar = el('ktm-progress-bar');
  if (!bar) return;

  const durations = T.chain.map(b => blockTotalSec(b));
  const totalSec  = durations.reduce((a,b)=>a+b,0) || 1;

  bar.innerHTML = T.chain.map((b, i) => {
    const tipo  = (b.timer_tipo||'none').toUpperCase();
    const color = timerColor(tipo);
    const pct   = Math.max(4, (durations[i] / totalSec) * 100);
    const label = b.titulo_bloque || timerLabel(tipo);
    const durStr = durations[i] ? ` ${Math.round(durations[i]/60)}'` : '';
    return `
      <div class="ktm-seg pending" id="ktm-seg-${i}"
           style="width:${pct}%;background:${color};min-width:20px;" title="${label}${durStr}">
        <span class="ktm-seg-label">${label}${durStr}</span>
      </div>`;
  }).join('');
}

function updateProgressBar() {
  T.chain.forEach((_, i) => {
    const seg = el(`ktm-seg-${i}`);
    if (!seg) return;
    seg.classList.remove('active','done','pending');
    if (i < T.chainIdx)        seg.classList.add('done');
    else if (i === T.chainIdx) seg.classList.add('active');
    else                       seg.classList.add('pending');
  });
}

function blockTotalSec(b) {
  const tipo = (b.timer_tipo||'none').toUpperCase();
  if (tipo==='AMRAP'||tipo==='REST')   return (b.timer_duracion||10)*60;
  if (tipo==='FOR_TIME')               return (b.timer_duracion||0)*60;
  if (tipo==='EMOM')                   return (b.timer_rondas||b.timer_duracion||10)*60;
  if (tipo==='EXMOM')                  return (b.timer_intervalo||3)*(b.timer_rondas||5)*60;
  if (tipo==='TABATA')                 return ((b.timer_trabajo||20)+(b.timer_descanso||10))*(b.timer_rondas||8);
  return 60;
}

// ─────────────────────────────────────────────
// CONTROLES
// ─────────────────────────────────────────────
function toggle() {
  if (T.status==='idle')          { start(); }
  else if (T.status==='running')  { pause(); }
  else if (T.status==='paused')   { resume(); }
  else if (T.status==='finished') { resetAll(); }
}

function start() {
  if (T.type==='none'||!T.type) return;
  T.status   = 'running';
  T.startTs  = Date.now();
  T.pausedMs = 0;
  T.round    = 1;
  T.tabataPhase = 'work';
  el('ktm-btn-start').textContent = 'PAUSAR';
  KTSAudio.go(); vibe([100,50,100]);
  // Arrancar / reanudar timer total
  T.totalRunStart = Date.now();
  T.intervalId = setInterval(tick, 100);
}

function pause() {
  T.status   = 'paused';
  T.pausedAt = Date.now();
  stopTick();
  // Pausar timer total
  if (T.totalRunStart) {
    T.totalAccumSec += (Date.now() - T.totalRunStart) / 1000;
    T.totalRunStart  = null;
  }
  el('ktm-btn-start').textContent = 'CONTINUAR';
}

function resume() {
  T.pausedMs += Date.now() - T.pausedAt;
  T.status = 'running';
  el('ktm-btn-start').textContent = 'PAUSAR';
  // Reanudar timer total
  T.totalRunStart = Date.now();
  T.intervalId = setInterval(tick, 100);
}

function nextBlock() {
  const next = T.chainIdx + 1;
  if (next >= T.chain.length) {
    finishAll();
  } else {
    loadBlock(next);
  }
}

function reset() {
  stopTick();
  resetState();
  showInitialTime();
  setArc(0);
  el('ktm-finished').style.display = 'none';
  el('ktm-between').style.display  = 'none';
  el('ktm-controls').style.display = 'flex';
  el('ktm-btn-start').textContent  = 'INICIAR';
  el('ktm-time').classList.remove('ktm-alert');
  if (T.config.totalRounds>0) el('ktm-round-cur').textContent = '1';
  if (T.type==='TABATA') {
    el('ktm-tabata-phase').textContent = '▶ TRABAJO';
    el('ktm-tabata-phase').style.color = '#EF4444';
  }
  // Recalcular timer total desde el bloque actual
  T.totalInitialSec = calcTotalSec(T.chain.slice(T.chainIdx));
  T.totalAccumSec   = 0;
  T.totalRunStart   = null;
  updateTotalDisplay(T.totalInitialSec);
  updateProgressBar();
}

function resetAll() {
  // Reiniciar timer total también
  T.totalInitialSec = calcTotalSec(T.chain);
  T.totalAccumSec   = 0;
  T.totalRunStart   = null;
  loadBlock(0);
}

function resetState() {
  stopTick();
  T.status = 'idle';
  T.elapsed = 0; T.round = 1;
  T.tabataPhase = 'work';
  T.startTs = null; T.pausedAt = null; T.pausedMs = 0;
  T.intervalId = null; T.lastCountSec = -1;
  // NOTA: no toca totalInitialSec / totalAccumSec / totalRunStart
}

function stopTick() {
  clearInterval(T.intervalId);
  T.intervalId = null;
}

function terminar() {
  if (!confirm('¿Terminar el entrenamiento completo?')) return;
  // Acumular tiempo restante antes de cerrar
  if (T.totalRunStart) {
    T.totalAccumSec += (Date.now() - T.totalRunStart) / 1000;
    T.totalRunStart  = null;
  }
  stopTick();
  resetState();
  T.totalInitialSec = 0;
  T.totalAccumSec   = 0;
  const m = document.getElementById('kts-timer-modal');
  if (m) m.style.display = 'none';
}

// ─────────────────────────────────────────────
// TICK
// ─────────────────────────────────────────────
function tick() {
  if (T.status!=='running') return;
  const elapsedMs  = Date.now() - T.startTs - T.pausedMs;
  const elapsedSec = elapsedMs / 1000;
  T.elapsed = elapsedSec;

  // Actualizar timer total
  if (T.totalRunStart !== null) {
    const totalElapsed = T.totalAccumSec + (Date.now() - T.totalRunStart) / 1000;
    updateTotalDisplay(Math.max(0, T.totalInitialSec - totalElapsed));
  }

  switch(T.type) {
    case 'AMRAP':    tickAMRAP(elapsedSec);    break;
    case 'FOR_TIME': tickForTime(elapsedSec);  break;
    case 'EMOM':     tickEMOM(elapsedSec);     break;
    case 'EXMOM':    tickExMOM(elapsedSec);    break;
    case 'TABATA':   tickTabata(elapsedSec);   break;
    case 'REST':     tickRest(elapsedSec);     break;
  }
}

function tickAMRAP(e) {
  const rem = T.config.totalSec - e;
  if (rem<=0) { blockDone(); return; }
  setTime(fmt(rem), rem);
  setArc((T.config.totalSec-rem)/T.config.totalSec*100);
}

function tickRest(e) {
  const rem = T.config.totalSec - e;
  if (rem<=0) { blockDone(); return; }
  setTime(fmt(rem), rem);
  setArc((T.config.totalSec-rem)/T.config.totalSec*100);
}

function tickForTime(e) {
  const cap = T.config.timeCap;
  setTime(fmt(e));
  if (cap>0) {
    const rem = cap-e;
    if (rem<=0) { blockDone('¡TIME CAP!'); return; }
    setArc(e/cap*100);
    handleCountdown(rem);
  }
}

function tickEMOM(e) {
  const total = T.config.rounds*60;
  if (e>=total) { blockDone(); return; }
  const curMin = Math.floor(e/60);
  const rem    = 60 - (e%60);
  if (curMin+1!==T.round) {
    T.round=curMin+1;
    el('ktm-round-cur').textContent=T.round;
    KTSAudio.round(); vibe([100,50,100]);
  }
  setTime(fmt(rem),rem);
  setArc(e/total*100);
  handleCountdown(rem);
}

function tickExMOM(e) {
  const itvSec=T.config.intervalSec, total=itvSec*T.config.rounds;
  if (e>=total) { blockDone(); return; }
  const curRound=Math.floor(e/itvSec)+1;
  const rem=itvSec-(e%itvSec);
  if (curRound!==T.round) {
    T.round=curRound;
    el('ktm-round-cur').textContent=T.round;
    KTSAudio.round(); vibe([100,50,100]);
  }
  setTime(fmt(rem),rem);
  setArc(e/total*100);
  handleCountdown(rem);
}

function tickTabata(e) {
  const {workSec,restSec,rounds}=T.config;
  const cycle=workSec+restSec, total=cycle*rounds;
  if (e>=total) { blockDone(); return; }
  const cycleE=e%cycle, isWork=cycleE<workSec;
  const phase=isWork?'work':'rest';
  const phaseE=isWork?cycleE:cycleE-workSec;
  const phaseLen=isWork?workSec:restSec;
  const rem=phaseLen-phaseE;
  const curRound=Math.floor(e/cycle)+1;
  if (phase!==T.tabataPhase) {
    T.tabataPhase=phase;
    const phEl=el('ktm-tabata-phase');
    if (phase==='work') { phEl.textContent='▶ TRABAJO'; phEl.style.color='#EF4444'; KTSAudio.tabataWork(); vibe([200,100,200]); }
    else               { phEl.textContent='◼ DESCANSO'; phEl.style.color='#10B981'; KTSAudio.tabataRest(); vibe([100]); }
  }
  if (curRound!==T.round) { T.round=curRound; el('ktm-round-cur').textContent=T.round; }
  setTime(fmt(Math.ceil(rem)),Math.ceil(rem));
  setArc(e/total*100);
  handleCountdown(Math.ceil(rem));
}

// ─────────────────────────────────────────────
// FIN DE BLOQUE → pausa entre bloques
// ─────────────────────────────────────────────
function blockDone(msg='') {
  stopTick();
  T.status='between';
  // Pausar timer total
  if (T.totalRunStart) {
    T.totalAccumSec += (Date.now() - T.totalRunStart) / 1000;
    T.totalRunStart  = null;
  }
  KTSAudio.blockEnd(); vibe([200,100,200,100,200]);
  setArc(100);
  el('ktm-time').classList.remove('ktm-alert');

  const hasNext = T.chainIdx+1 < T.chain.length;

  if (!hasNext) {
    finishAll();
    return;
  }

  el('ktm-controls').style.display = 'none';
  el('ktm-between').style.display  = 'flex';

  const nextBloque = T.chain[T.chainIdx+1];
  const nextTipo   = (nextBloque.timer_tipo||'none').toUpperCase();
  const nextColor  = timerColor(nextTipo);
  const nextDur    = timerDurInfo(nextBloque);

  el('ktm-between-msg').textContent  = msg || '✓ BLOQUE COMPLETADO';
  el('ktm-between-next').innerHTML   =
    `SIGUIENTE: <span style="color:${nextColor};font-weight:bold;">
      ${nextBloque.titulo_bloque}${nextDur ? ' · '+nextDur : ''}
    </span>`;
  el('ktm-btn-next').style.background   = nextColor;
  el('ktm-btn-next').style.boxShadow    = `0 4px 20px ${nextColor}66`;
}

// ─────────────────────────────────────────────
// FIN TOTAL
// ─────────────────────────────────────────────
function finishAll() {
  stopTick();
  T.status='finished';
  // Timer total a 0
  updateTotalDisplay(0);
  KTSAudio.done(); vibe([300,100,300,100,500]);
  setArc(100);
  el('ktm-controls').style.display = 'none';
  el('ktm-between').style.display  = 'none';
  el('ktm-finished').textContent   = '¡WOD COMPLETADO!';
  el('ktm-finished').style.display = 'block';
  T.chain.forEach((_,i) => {
    const seg=el(`ktm-seg-${i}`);
    if(seg){ seg.classList.remove('active','pending'); seg.classList.add('done'); }
  });
}

function closeModal() {
  stopTick();
  if (T.totalRunStart) {
    T.totalAccumSec += (Date.now() - T.totalRunStart) / 1000;
    T.totalRunStart  = null;
  }
  resetState();
  const m=document.getElementById('kts-timer-modal');
  if(m) m.style.display='none';
}

// ─────────────────────────────────────────────
// HELPERS UI
// ─────────────────────────────────────────────
function setTime(txt, rem=null) {
  const el_=el('ktm-time');
  el_.textContent=txt;
  if (rem!==null && rem<=10 && rem>0) {
    el_.classList.add('ktm-alert');
    const s=Math.ceil(rem);
    if(s!==T.lastCountSec){ T.lastCountSec=s; KTSAudio.tick(s); vibe([30]); }
  } else {
    el_.classList.remove('ktm-alert');
    T.lastCountSec=-1;
  }
}

function setArc(pct) {
  const circ=553;
  el('ktm-arc').style.strokeDashoffset = circ-(circ*Math.min(pct,100)/100);
}

function handleCountdown(rem) {
  if (rem<=10 && rem>0) {
    const s=Math.ceil(rem);
    if(s!==T.lastCountSec){ T.lastCountSec=s; KTSAudio.tick(s); vibe([30]); }
    el('ktm-time').classList.add('ktm-alert');
  } else {
    T.lastCountSec=-1;
    el('ktm-time').classList.remove('ktm-alert');
  }
}

function renderExercises(ejercicios) {
  if (!ejercicios||ejercicios.length===0) {
    el('ktm-exercise-list').innerHTML=
      `<p style="color:rgba(255,255,255,.3);font-size:.85rem;font-family:'Montserrat',sans-serif;">Sin ejercicios</p>`;
    return;
  }
  el('ktm-exercise-list').innerHTML=ejercicios.map((ej,i)=>`
    <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);
                border-radius:.6rem;padding:.75rem 1rem;display:flex;align-items:flex-start;gap:.75rem;">
      <div style="min-width:1.4rem;height:1.4rem;background:#FF6B35;border-radius:50%;
                  display:flex;align-items:center;justify-content:center;
                  font-size:.65rem;font-weight:bold;color:black;flex-shrink:0;margin-top:.1rem;">
        ${i+1}
      </div>
      <div style="flex:1;font-family:'Montserrat',sans-serif;">
        <div style="font-weight:700;color:white;font-size:.9rem;">${ej.nombre}</div>
        ${ej.detalles?`<div style="color:rgba(255,255,255,.45);font-size:.78rem;margin-top:.2rem;">${ej.detalles}</div>`:''}
      </div>
      ${ej.link_video?`
        <button onclick="verVideoEjercicio('${ej.nombre.replace(/'/g,"\\'")}','${ej.link_video}')"
                style="background:none;border:none;color:#FF6B35;cursor:pointer;font-size:1.3rem;padding:.1rem .2rem;">
          <i class="fas fa-play-circle"></i>
        </button>`:''}
    </div>`).join('');
}

// ─────────────────────────────────────────────
// CAMPOS DE TIMER PARA EL FORMULARIO DEL COACH
// ─────────────────────────────────────────────
function timerFieldsHTML(bloqueId) {
  return `
    <div class="kts-timer-fields mt-3 pt-3 border-t border-white/10">
      <div class="flex items-center gap-2 mb-2">
        <i class="fas fa-stopwatch text-kts-gold text-sm"></i>
        <label class="text-xs font-bold text-gray-400 uppercase tracking-wider">Timer del bloque</label>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <select data-timer-tipo="${bloqueId}"
                onchange="WODTimer.onTipoChange('${bloqueId}')"
                class="col-span-2 md:col-span-1 bg-black border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kts-gold">
          <option value="none">Sin timer</option>
          <option value="AMRAP">AMRAP</option>
          <option value="FOR_TIME">For Time</option>
          <option value="EMOM">EMOM</option>
          <option value="EXMOM">ExMOM</option>
          <option value="TABATA">Tabata</option>
          <option value="REST">Rest / Descanso</option>
        </select>
        <div id="kts-tfields-${bloqueId}" class="col-span-2 md:col-span-3 flex gap-2 flex-wrap items-center"></div>
      </div>
    </div>`;
}

function onTipoChange(bloqueId) {
  const tipo = document.querySelector(`[data-timer-tipo="${bloqueId}"]`).value;
  const wrap = document.getElementById(`kts-tfields-${bloqueId}`);
  const base = 'bg-black border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kts-gold w-24';
  const fields = {
    none:     '',
    AMRAP:    `<input type="number" data-timer-duracion="${bloqueId}" placeholder="Min" min="1" max="60" value="10" class="${base}"> <span class="text-gray-500 text-xs">minutos</span>`,
    FOR_TIME: `<input type="number" data-timer-duracion="${bloqueId}" placeholder="Cap" min="0" max="120" value="0" class="${base}"> <span class="text-gray-500 text-xs">min cap (0=sin límite)</span>`,
    EMOM:     `<input type="number" data-timer-rondas="${bloqueId}" placeholder="Rondas" min="1" max="60" value="10" class="${base}"> <span class="text-gray-500 text-xs">rondas</span>`,
    EXMOM:    `<input type="number" data-timer-intervalo="${bloqueId}" placeholder="Intv" min="2" max="10" value="3" class="${base}"> <span class="text-gray-500 text-xs">min ×</span>
               <input type="number" data-timer-rondas="${bloqueId}" placeholder="Rondas" min="1" max="20" value="5" class="${base}"> <span class="text-gray-500 text-xs">rondas</span>`,
    TABATA:   `<input type="number" data-timer-trabajo="${bloqueId}" placeholder="Trab" min="5" max="120" value="20" class="${base}"> <span class="text-gray-500 text-xs">seg /</span>
               <input type="number" data-timer-descanso="${bloqueId}" placeholder="Desc" min="5" max="120" value="10" class="${base}"> <span class="text-gray-500 text-xs">seg ×</span>
               <input type="number" data-timer-rondas="${bloqueId}" placeholder="Rondas" min="1" max="32" value="8" class="${base}"> <span class="text-gray-500 text-xs">rondas</span>`,
    REST:     `<select data-timer-duracion="${bloqueId}" class="${base} w-auto">
                 <option value="1">1 minuto</option>
                 <option value="2" selected>2 minutos</option>
                 <option value="3">3 minutos</option>
                 <option value="4">4 minutos</option>
                 <option value="5">5 minutos</option>
               </select>`,
  };
  wrap.innerHTML = fields[tipo] || '';
}

function readTimerConfig(bloqueId) {
  const get = (attr) => {
    const e = document.querySelector(`[data-timer-${attr}="${bloqueId}"]`);
    return e ? parseInt(e.value,10)||0 : 0;
  };
  const tipo = document.querySelector(`[data-timer-tipo="${bloqueId}"]`)?.value || 'none';
  return { timer_tipo:tipo, timer_duracion:get('duracion'), timer_intervalo:get('intervalo'),
           timer_rondas:get('rondas'), timer_trabajo:get('trabajo'), timer_descanso:get('descanso') };
}

// ─────────────────────────────────────────────
// STORE GLOBAL — evita JSON inline en atributos HTML
// ─────────────────────────────────────────────
const _timerStore = {};
let _timerStoreKey = 0;

function timerButtonHTML(allBloques, idx) {
  const bloque = allBloques[idx];
  const tipo   = (bloque.timer_tipo||'none').toUpperCase();
  if (tipo==='NONE'||!bloque.timer_tipo) return '';

  const color   = timerColor(tipo);
  const label   = timerLabel(tipo);
  const durInfo = timerDurInfo(bloque);

  const key = 'k' + (_timerStoreKey++);
  _timerStore[key] = allBloques;

  return `
    <button onclick="WODTimer.openFromStore('${key}', ${idx})"
            style="display:flex;align-items:center;gap:.5rem;
                   background:${color}18;border:1px solid ${color}55;color:${color};
                   border-radius:.5rem;padding:.45rem .9rem;font-family:'Oswald',sans-serif;
                   font-size:.8rem;letter-spacing:1.5px;cursor:pointer;transition:all .2s;white-space:nowrap;"
            onmouseover="this.style.background='${color}33'"
            onmouseout="this.style.background='${color}18'">
      <i class="fas fa-stopwatch"></i>
      ${label}${durInfo}
    </button>`;
}

function timerDurInfo(b) {
  const tipo=(b.timer_tipo||'').toUpperCase();
  if (tipo==='AMRAP'||tipo==='FOR_TIME'||tipo==='REST') return b.timer_duracion?` ${b.timer_duracion}'`:'';
  if (tipo==='EMOM')   return b.timer_rondas?` ${b.timer_rondas}'`:'';
  if (tipo==='EXMOM')  return (b.timer_intervalo&&b.timer_rondas)?` E${b.timer_intervalo}MOM×${b.timer_rondas}`:'';
  if (tipo==='TABATA') return (b.timer_trabajo&&b.timer_descanso)?` ${b.timer_trabajo}/${b.timer_descanso}s×${b.timer_rondas||8}`:'';
  return '';
}

// ─────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────
window.WODTimer = {
  open:           openBlock,
  openFromStore:  (key, idx) => openBlock(_timerStore[key], idx),
  close:          closeModal,
  toggle,
  reset,
  nextBlock,
  terminar,
  onTipoChange,
  timerFieldsHTML,
  readTimerConfig,
  timerButtonHTML,
};
