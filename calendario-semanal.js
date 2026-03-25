// ============================================
// CALENDARIO SEMANAL - ADMIN & COACH
// ============================================

// ========== VARIABLES GLOBALES ==========
let wodsSemanaActual = [];
let semanaMostrada = new Date();
let atletasCache = {};  // email → nombre completo (evita re-queries)

// ========== OBTENER LUNES DE LA SEMANA ==========
function obtenerLunesSemana(fecha) {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1); // Ajustar si es domingo
  return new Date(d.setDate(diff));
}

// ========== CARGAR WODS DE LA SEMANA ==========
async function cargarWodsSemana(fechaBase) {
  try {
    const lunes = obtenerLunesSemana(fechaBase);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 13); // 14 días en total

    const lunesStr = lunes.toISOString().split('T')[0];
    const domingoStr = domingo.toISOString().split('T')[0];

    console.log('Buscando WODs desde', lunesStr, 'hasta', domingoStr);

    const { collection, query, where, getDocs } = window.firestoreFunctions;
    const wodsRef = collection(window.db, 'wods');
    const boxId = window.getCurrentBoxId ? window.getCurrentBoxId() : (sessionStorage.getItem('boxId') || '');

    // Traer WODs del período filtrados por boxId (grupal + personalizados)
    // El filtro por destinatario se hace client-side
    const q = query(
      wodsRef,
      where('boxId', '==', boxId),
      where('fecha', '>=', lunesStr),
      where('fecha', '<=', domingoStr)
    );

    const querySnapshot = await getDocs(q);

    wodsSemanaActual = [];
    querySnapshot.forEach((doc) => {
      wodsSemanaActual.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✓ ${wodsSemanaActual.length} WODs encontrados (grupal + personalizados)`);

    // Pre-cargar nombres de atletas para WODs personalizados
    // Usa window.obtenerNombreAtleta definida en index.html
    const emailsUnicos = [...new Set(
      wodsSemanaActual
        .filter(w => w.destinatario !== 'grupal')
        .map(w => w.destinatario)
    )];

    await Promise.all(emailsUnicos.map(async (email) => {
      if (!atletasCache[email] && typeof obtenerNombreAtleta === 'function') {
        atletasCache[email] = await obtenerNombreAtleta(email);
      }
    }));

    renderCalendarioSemanal();

  } catch (error) {
    console.error('Error cargando WODs de la semana:', error);
  }
}

// ========== RENDERIZAR CALENDARIO ==========
function renderCalendarioSemanal() {
  // Buscar el contenedor correcto (Admin o Coach)
  let container = document.getElementById('calendarioSemanalContent');
  if (!container || container.offsetParent === null) {
    container = document.getElementById('calendarioSemanalContentAdmin');
  }
  
  if (!container) {
    console.error('No se encontró ningún contenedor de calendario');
    return;
  }

  const lunes = obtenerLunesSemana(semanaMostrada);
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const inicialesDias = ['L', 'M', 'M', 'J', 'V', 'S', 'D', 'L', 'M', 'M', 'J', 'V', 'S', 'D'];

  // Header con navegación
  const mesAnio = lunes.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  let html = `
    <div class="flex justify-between items-center mb-6 mt-8 md:mt-0">
      <h2 class="text-2xl md:text-3xl font-oswald font-bold text-white capitalize">${mesAnio}</h2>
      <div class="flex gap-2">
        <button onclick="cambiarSemana(-1)" class="bg-kts-card hover:bg-kts-gold/20 border border-white/20 hover:border-kts-gold text-white px-4 py-2 rounded-lg text-sm font-bold transition-all">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button onclick="irSemanaActual()" class="bg-kts-gold hover:bg-[#ff8555] text-black px-4 py-2 rounded-lg text-sm font-oswald font-bold uppercase transition-all">
          Hoy
        </button>
        <button onclick="cambiarSemana(1)" class="bg-kts-card hover:bg-kts-gold/20 border border-white/20 hover:border-kts-gold text-white px-4 py-2 rounded-lg text-sm font-bold transition-all">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- En móvil (<sm): lista vertical. En sm+: grilla de 7 columnas -->
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-7 sm:gap-2 md:gap-3">
  `;

  // Crear cada día
  for (let i = 0; i < 14; i++) {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    
    const year = dia.getFullYear();
    const month = String(dia.getMonth() + 1).padStart(2, '0');
    const day = String(dia.getDate()).padStart(2, '0');
    const fechaStr = `${year}-${month}-${day}`;
    const fechaDisplay = `${day}/${month}`;

    // Solo WODs personalizados para este día (grupales no se muestran en esta vista)
    const wodsPersonales = wodsSemanaActual.filter(w => w.fecha === fechaStr && w.destinatario !== 'grupal');

    const esHoy    = fechaStr === hoyStr;
    const esPasado = fechaStr < hoyStr;

    const borderClass = esHoy ? 'border-kts-gold border-2' : 'border-white/10';
    const bgClass     = esHoy ? 'bg-kts-gold/10' : 'bg-kts-card';

    html += `
      <div class="${bgClass} border ${borderClass} rounded-xl p-2 sm:p-3 hover:border-kts-gold/40 transition-all">
        <!-- Encabezado del día -->
        <div class="text-center mb-1 sm:mb-2">
          <div class="text-gray-400 font-bold uppercase mb-0.5" style="font-size:0.6rem">${inicialesDias[i]}</div>
          <div class="font-oswald font-bold text-xs sm:text-lg ${esHoy ? 'text-kts-gold' : 'text-white'}">${day}</div>
          ${esHoy ? '<div class="w-1 h-1 bg-kts-gold rounded-full mx-auto mt-0.5"></div>' : ''}
        </div>

        <!-- Lista de atletas con WOD personalizado -->
        <div class="min-h-[48px] sm:min-h-[80px] flex flex-col">
    `;

    if (wodsPersonales.length > 0) {
      // Mostrar hasta 4 nombres; indicador "+X" si hay más
      const visibles  = wodsPersonales.slice(0, 4);
      const restantes = wodsPersonales.length - visibles.length;

      visibles.forEach(wod => {
        const nombre   = atletasCache[wod.destinatario] || wod.destinatario;
        // Usar el nombre completo en el tooltip, solo primer nombre en la celda
        const nomCorto = nombre.split(' ')[0];
        html += `
          <div onclick="abrirVistaPreviaDesdeCalendario('${wod.id}')"
               class="flex items-center gap-1 py-0.5 px-1 rounded hover:bg-kts-gold/10 cursor-pointer transition-colors group mb-0.5"
               title="${nombre}">
            <i class="fas fa-user text-kts-gold/40 flex-shrink-0" style="font-size:0.55rem"></i>
            <span class="text-white/70 group-hover:text-kts-gold truncate transition-colors font-medium" style="font-size:0.7rem">${nomCorto}</span>
          </div>
        `;
      });

      if (restantes > 0) {
        html += `
          <div class="text-gray-600 pl-1 mt-0.5" style="font-size:0.62rem">+${restantes} más</div>
        `;
      }
    }
    // Días sin WODs personalizados quedan sin lista de atletas

    html += `
        </div>
        ${!esPasado ? `
        <!-- Botón visible solo en hoy y fechas futuras -->
        <button onclick="abrirModalCargarWodEnFecha('${fechaStr}')"
                class="w-full mt-2 bg-kts-gold/20 hover:bg-kts-gold/30 text-kts-gold border border-kts-gold/30 font-bold py-1.5 rounded text-xs uppercase transition-all">
          <i class="fas fa-plus mr-1"></i> Cargar WOD
        </button>` : ''}
      </div>
    `;
  }

  html += '</div>';

  container.innerHTML = html;
}
window.renderCalendarioSemanal = renderCalendarioSemanal;

// ========== NAVEGACIÓN DE SEMANAS ==========
function cambiarSemana(direccion) {
  semanaMostrada.setDate(semanaMostrada.getDate() + (direccion * 7));
  cargarWodsSemana(semanaMostrada);
}

function irSemanaActual() {
  semanaMostrada = new Date();
  cargarWodsSemana(semanaMostrada);
}

window.cambiarSemana = cambiarSemana;
window.irSemanaActual = irSemanaActual;

// ========== VER WOD DE UN DÍA ESPECÍFICO ==========
function verWodDia(fecha) {
  const wod = wodsSemanaActual.find(w => w.fecha === fecha);
  if (!wod) {
    alert('WOD no encontrado');
    return;
  }

  // Abrir modal con el WOD
  mostrarModalWodDia(wod);
}

window.verWodDia = verWodDia;

// ========== EDITAR WOD DE UN DÍA ESPECÍFICO ==========
function editarWodDia(fecha) {
  const wod = wodsSemanaActual.find(w => w.fecha === fecha);
  if (!wod) {
    alert('WOD no encontrado');
    return;
  }

  // wod.id fue guardado al cargar la query: { id: doc.id, ...doc.data() }
  const docId = wod.id;

  if (typeof abrirModalEditarWod === 'function') {
    abrirModalEditarWod(wod, docId);
  } else {
    console.error('abrirModalEditarWod no está definida en index.html');
  }
}

window.editarWodDia = editarWodDia;

// ========== ABRIR VISTA PREVIA DESDE CALENDARIO (WOD PERSONALIZADO) ==========
// Llamado desde los onclick de los nombres de atletas en el calendario.
// Busca el WOD en el array en memoria y delega a abrirVistaPrevia (index.html).
function abrirVistaPreviaDesdeCalendario(wodId) {
  const wod = wodsSemanaActual.find(w => w.id === wodId);
  if (!wod) return;
  const nombre = atletasCache[wod.destinatario] || wod.destinatario;
  if (typeof abrirVistaPrevia === 'function') {
    abrirVistaPrevia(wod, wod.id, nombre);
  }
}
window.abrirVistaPreviaDesdeCalendario = abrirVistaPreviaDesdeCalendario;

// ========== MODAL PARA VER WOD COMPLETO ==========
function mostrarModalWodDia(wodData) {
  // Crear modal si no existe
  let modal = document.getElementById('modalVerWodDia');
  if (!modal) {
    const modalHTML = `
      <div id="modalVerWodDia" class="hidden fixed inset-0 bg-black/90 z-[1001] overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-kts-card border border-white/10 rounded-2xl p-4 md:p-6 w-full max-w-5xl my-4 max-h-[85vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl md:text-2xl font-oswald font-bold text-kts-gold" id="tituloModalWodDia">WOD del Día</h2>
              <button onclick="cerrarModalWodDia()" class="text-gray-400 hover:text-white text-2xl leading-none">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div id="contenidoModalWodDia"></div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('modalVerWodDia');
  }

  // Formatear fecha
  const [year, month, day] = wodData.fecha.split('-');
  const fechaDisplay = `${day}/${month}/${year}`;
  
  document.getElementById('tituloModalWodDia').textContent = `WOD - ${fechaDisplay}`;

  // Renderizar contenido
  let html = '';

  // Notas del Coach
  if (wodData.notas_coach) {
    html += `
      <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 md:p-4 mb-4">
        <div class="flex items-start gap-2">
          <i class="fas fa-lightbulb text-yellow-500 text-lg mt-1"></i>
          <div class="flex-1">
            <div class="font-oswald font-bold text-yellow-500 uppercase text-xs mb-1">Notas del Coach</div>
            <p class="text-white whitespace-pre-wrap leading-relaxed text-sm">${wodData.notas_coach}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Creado por
  if (wodData.creado_por) {
    html += `
      <div class="bg-kts-card border border-white/10 rounded-lg p-2 mb-4 flex items-center gap-2 text-xs">
        <i class="fas fa-user-tie text-kts-gold"></i>
        <span class="text-gray-400">WOD creado por:</span>
        <span class="text-white font-bold">${wodData.creado_por}</span>
      </div>
    `;
  }

  // Bloques
  if (wodData.bloques && wodData.bloques.length > 0) {
    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">';
    
    wodData.bloques.forEach((bloque) => {
      html += `
        <div class="bg-kts-card border border-white/10 rounded-xl p-3 md:p-4 hover:border-kts-gold transition-all">
          <h3 class="text-kts-gold font-oswald text-lg md:text-xl font-bold uppercase mb-3 flex items-center gap-2">
            <i class="fas fa-dumbbell"></i> ${bloque.titulo_bloque}
          </h3>
      `;

      if (bloque.ejercicios_bloque && bloque.ejercicios_bloque.length > 0) {
        bloque.ejercicios_bloque.forEach(ejercicio => {
          html += `
            <div class="bg-black/50 border border-white/10 rounded-lg p-2 md:p-3 mb-2 flex items-start gap-2">
              <div class="flex-1">
                <div class="font-bold text-white text-sm md:text-base">${ejercicio.nombre}</div>
                ${ejercicio.detalles ? `<div class="text-gray-400 text-xs mt-1">${ejercicio.detalles}</div>` : ''}
              </div>
              ${ejercicio.link_video ? `
                <button onclick="verVideoEjercicio('${ejercicio.nombre.replace(/'/g, "\\'")}', '${ejercicio.link_video}')" class="text-kts-gold hover:text-[#ff8555] transition-colors flex-shrink-0">
                  <i class="fas fa-play-circle text-xl md:text-2xl"></i>
                </button>
              ` : ''}
            </div>
          `;
        });
      } else {
        html += `<p class="text-gray-500 italic text-xs">Sin ejercicios en este bloque</p>`;
      }

      html += `</div>`;
    });
    
    html += '</div>';
  }

  document.getElementById('contenidoModalWodDia').innerHTML = html;
  modal.classList.remove('hidden');
}

function cerrarModalWodDia() {
  const modal = document.getElementById('modalVerWodDia');
  if (modal) {
    modal.classList.add('hidden');
  }
}

window.cerrarModalWodDia = cerrarModalWodDia;

// ========== CARGAR WOD PARA UN DÍA ESPECÍFICO ==========
function cargarWodParaDia(fecha) {
  // Abrir modal de carga y pre-setear la fecha
  abrirModalWod();
  
  // Esperar a que el modal se abra
  setTimeout(() => {
    const inputFecha = document.getElementById('wodFecha');
    if (inputFecha) {
      inputFecha.value = fecha;
    }
  }, 100);
}

window.cargarWodParaDia = cargarWodParaDia;

// ========== INICIALIZAR AL CARGAR VISTA ==========
function iniciarCalendarioSemanal() {
  semanaMostrada = new Date();
  cargarWodsSemana(semanaMostrada);
}

window.iniciarCalendarioSemanal = iniciarCalendarioSemanal;

console.log('✓ Módulo de Calendario Semanal cargado');
