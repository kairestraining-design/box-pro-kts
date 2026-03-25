// ============================================
// CALENDARIO SEMANAL - ATLETA PERSONALIZADO
// ============================================

// ========== VARIABLES GLOBALES ==========
let tienePlanesPersonalizados = false;
let fechaSeleccionadaAtleta = null;
let wodsAtletaSemana = [];

// ========== VERIFICAR SI TIENE PLANES PERSONALIZADOS ==========
async function verificarPlanesPersonalizados() {
  try {
    const hoy = new Date();
    const lunesSemana = obtenerLunesSemana(hoy);
    const domingoSemana = new Date(lunesSemana);
    domingoSemana.setDate(lunesSemana.getDate() + 6);

    const lunesStr = `${lunesSemana.getFullYear()}-${String(lunesSemana.getMonth() + 1).padStart(2, '0')}-${String(lunesSemana.getDate()).padStart(2, '0')}`;
    const domingoStr = `${domingoSemana.getFullYear()}-${String(domingoSemana.getMonth() + 1).padStart(2, '0')}-${String(domingoSemana.getDate()).padStart(2, '0')}`;

    const { collection, query, where, getDocs } = window.firestoreFunctions;
    const wodsRef = collection(window.db, 'wods');
    const boxId = window.getCurrentBoxId ? window.getCurrentBoxId() : (sessionStorage.getItem('boxId') || '');
    const q = query(
      wodsRef,
      where('boxId', '==', boxId),
      where('destinatario', '==', currentUser.Email),
      where('fecha', '>=', lunesStr),
      where('fecha', '<=', domingoStr)
    );

    const querySnapshot = await getDocs(q);
    
    wodsAtletaSemana = [];
    querySnapshot.forEach((doc) => {
      wodsAtletaSemana.push({
        id: doc.id,
        ...doc.data()
      });
    });

    tienePlanesPersonalizados = wodsAtletaSemana.length > 0;
    
    console.log(`Atleta tiene ${wodsAtletaSemana.length} WODs personalizados esta semana`);
    
    return tienePlanesPersonalizados;

  } catch (error) {
    console.error('Error verificando planes personalizados:', error);
    return false;
  }
}

// ========== FUNCIÓN AUXILIAR: OBTENER LUNES ==========
function obtenerLunesSemana(fecha) {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// ========== RENDERIZAR NAVEGACIÓN MÓVIL ATLETA ==========
function renderNavegacionMovilAtleta() {
  if (!tienePlanesPersonalizados) return '';
  
  // Ordenar WODs por fecha
  const wodsOrdenados = [...wodsAtletaSemana].sort((a, b) => a.fecha.localeCompare(b.fecha));
  
  // Encontrar índice del WOD actual
  const indiceActual = wodsOrdenados.findIndex(w => w.fecha === fechaSeleccionadaAtleta);
  
  // Determinar si hay anterior/siguiente
  const hayAnterior = indiceActual > 0;
  const haySiguiente = indiceActual < wodsOrdenados.length - 1;
  
  const totalWods = wodsOrdenados.length;
  const posicionActual = indiceActual + 1;
  
  const [year, month, day] = fechaSeleccionadaAtleta.split('-');
  const fechaDisplay = `${day}/${month}/${year}`;
  
  return `
    <!-- Navegación Móvil (solo visible en móvil) -->
    <div class="block md:hidden bg-kts-card border border-white/10 rounded-xl p-4 mb-6">
      <div class="flex items-center justify-between">
        <button 
          onclick="retrocederDiaAtleta()" 
          class="p-2 ${hayAnterior ? 'text-kts-gold hover:bg-kts-gold/20' : 'text-gray-600 cursor-not-allowed'} rounded-lg transition-all"
          ${!hayAnterior ? 'disabled' : ''}
        >
          <i class="fas fa-chevron-left text-xl"></i>
        </button>
        
        <div class="text-center flex-1">
          <div class="text-white font-oswald font-bold text-lg">${fechaDisplay}</div>
          <div class="text-gray-400 text-xs">${posicionActual} de ${totalWods} WODs</div>
        </div>
        
        <button 
          onclick="avanzarDiaAtleta()" 
          class="p-2 ${haySiguiente ? 'text-kts-gold hover:bg-kts-gold/20' : 'text-gray-600 cursor-not-allowed'} rounded-lg transition-all"
          ${!haySiguiente ? 'disabled' : ''}
        >
          <i class="fas fa-chevron-right text-xl"></i>
        </button>
      </div>
    </div>
  `;
}

// ========== RENDERIZAR BARRA SEMANAL ATLETA (DESKTOP) ==========
function renderBarraSemanalAtleta() {
  if (!tienePlanesPersonalizados) return '';

  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  const hoyStr = `${year}-${month}-${day}`;
  
  const lunes = obtenerLunesSemana(hoy);
  const inicialesDias = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  let html = `
    <!-- Calendario Desktop (solo visible en desktop) -->
    <div class="hidden md:block bg-kts-card border border-white/10 rounded-xl p-4 mb-6">
      <div class="text-xs font-bold text-gray-400 uppercase mb-3">Navegar por día</div>
      <div class="grid grid-cols-7 gap-2">
  `;

  for (let i = 0; i < 7; i++) {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    
    const diaYear = dia.getFullYear();
    const diaMonth = String(dia.getMonth() + 1).padStart(2, '0');
    const diaDay = String(dia.getDate()).padStart(2, '0');
    const fechaStr = `${diaYear}-${diaMonth}-${diaDay}`;

    const esHoy = fechaStr === hoyStr;
    const estaSeleccionado = fechaStr === fechaSeleccionadaAtleta;
    const tieneWod = wodsAtletaSemana.some(w => w.fecha === fechaStr);

    const bgClass = estaSeleccionado ? 'bg-kts-gold' : (esHoy ? 'bg-kts-gold/20' : 'bg-kts-dark');
    const textClass = estaSeleccionado ? 'text-black' : 'text-white';
    const borderClass = esHoy && !estaSeleccionado ? 'border-kts-gold' : 'border-white/10';

    html += `
      <button onclick="cambiarDiaAtleta('${fechaStr}')" class="${bgClass} ${textClass} border ${borderClass} rounded-lg p-2 hover:border-kts-gold transition-all relative">
        <div class="text-xs font-bold uppercase mb-1">${inicialesDias[i]}</div>
        <div class="text-lg font-oswald font-bold">${diaDay}</div>
        ${tieneWod ? '<div class="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>' : ''}
      </button>
    `;
  }

  html += `
      </div>
    </div>
  `;

  return html;
}

// ========== CAMBIAR DÍA SELECCIONADO ==========
async function cambiarDiaAtleta(fecha) {
  fechaSeleccionadaAtleta = fecha;
  
  // Recargar WOD para la fecha seleccionada
  await cargarWodAtletaPorFecha(fecha);
}

window.cambiarDiaAtleta = cambiarDiaAtleta;

// ========== AVANZAR AL SIGUIENTE DÍA (MÓVIL) ==========
async function avanzarDiaAtleta() {
  const wodsOrdenados = [...wodsAtletaSemana].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const indiceActual = wodsOrdenados.findIndex(w => w.fecha === fechaSeleccionadaAtleta);
  
  if (indiceActual < wodsOrdenados.length - 1) {
    const siguienteWod = wodsOrdenados[indiceActual + 1];
    await cambiarDiaAtleta(siguienteWod.fecha);
  }
}

window.avanzarDiaAtleta = avanzarDiaAtleta;

// ========== RETROCEDER AL DÍA ANTERIOR (MÓVIL) ==========
async function retrocederDiaAtleta() {
  const wodsOrdenados = [...wodsAtletaSemana].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const indiceActual = wodsOrdenados.findIndex(w => w.fecha === fechaSeleccionadaAtleta);
  
  if (indiceActual > 0) {
    const anteriorWod = wodsOrdenados[indiceActual - 1];
    await cambiarDiaAtleta(anteriorWod.fecha);
  }
}

window.retrocederDiaAtleta = retrocederDiaAtleta;

// ========== CARGAR WOD DEL ATLETA POR FECHA ==========
async function cargarWodAtletaPorFecha(fecha) {
  try {
    const [year, month, day] = fecha.split('-');
    const fechaDisplay = `${day}/${month}/${year}`;

    // Obtener contenedor una sola vez
    const contentEntreno = document.getElementById('contentAtletaEntreno');
    
    if (!contentEntreno) {
      console.error('Contenedor contentAtletaEntreno no encontrado');
      return;
    }

    // Mostrar spinner mientras carga
    contentEntreno.innerHTML = `
      <div class="text-center py-8">
        <i class="fas fa-spinner fa-spin text-4xl text-kts-gold mb-4"></i>
        <p class="text-gray-400 text-sm">Cargando entrenamiento...</p>
      </div>
    `;

    const { doc, getDoc } = window.firestoreFunctions;
    const boxId = window.getCurrentBoxId ? window.getCurrentBoxId() : (sessionStorage.getItem('boxId') || '');

    // Buscar WOD personal (nuevo formato con boxId, fallback al viejo)
    let docPersonal = await getDoc(doc(window.db, 'wods', `${boxId}_${currentUser.Email}_${fecha}`));
    if (!docPersonal.exists() && boxId) {
      docPersonal = await getDoc(doc(window.db, 'wods', `${currentUser.Email}_${fecha}`));
    }
    currentWodPersonal = docPersonal.exists() ? docPersonal.data() : null;

    // Buscar WOD grupal (nuevo formato con boxId, fallback al viejo)
    let docGrupal = await getDoc(doc(window.db, 'wods', `${boxId}_grupal_${fecha}`));
    if (!docGrupal.exists() && boxId) {
      docGrupal = await getDoc(doc(window.db, 'wods', `grupal_${fecha}`));
    }
    currentWodGrupal = docGrupal.exists() ? docGrupal.data() : null;

    console.log('WOD Personal (Atleta):', currentWodPersonal ? 'SÍ' : 'NO');
    console.log('WOD Grupal (Atleta):', currentWodGrupal ? 'SÍ' : 'NO');

    // Actualizar barra semanal (desktop y móvil)
    const barraDesktop = renderBarraSemanalAtleta();
    const barraMovil = renderNavegacionMovilAtleta();
    const navegacionCompleta = barraMovil + barraDesktop;

    // Determinar qué mostrar (reconstruir HTML completo)
    if (currentWodPersonal && currentWodGrupal) {
      contentEntreno.innerHTML = `
        <div id="barraSemanalAtleta">${navegacionCompleta}</div>
        <div class="mb-4">
          <h1 class="text-xl md:text-2xl font-oswald font-bold mb-1">Mi Entrenamiento</h1>
          <p class="text-sm text-gray-400">${fechaDisplay}</p>
        </div>
        <div class="mb-4">
          <div class="flex gap-2 border-b border-white/10">
            <button onclick="cambiarTabAtleta('personal')" id="tabAtletaPersonal" class="flex-1 md:flex-none px-6 py-3 font-oswald font-bold uppercase tracking-wider rounded-t-lg bg-kts-gold text-black">
              Mi Plan
            </button>
            <button onclick="cambiarTabAtleta('grupal')" id="tabAtletaGrupal" class="flex-1 md:flex-none px-6 py-3 font-oswald font-bold uppercase tracking-wider rounded-t-lg bg-transparent text-gray-400">
              Clase Grupal
            </button>
          </div>
        </div>
        <div id="atletaWodTabContent"></div>
      `;
      renderWodAtleta(currentWodPersonal);
      
    } else if (currentWodPersonal) {
      contentEntreno.innerHTML = `
        <div id="barraSemanalAtleta">${navegacionCompleta}</div>
        <div class="mb-4">
          <h1 class="text-xl md:text-2xl font-oswald font-bold mb-1">Mi Plan</h1>
          <p class="text-sm text-gray-400">${fechaDisplay}</p>
        </div>
        <div id="atletaWodTabContent"></div>
      `;
      renderWodAtleta(currentWodPersonal);
      
    } else if (currentWodGrupal) {
      contentEntreno.innerHTML = `
        <div id="barraSemanalAtleta">${navegacionCompleta}</div>
        <div class="mb-4">
          <h1 class="text-xl md:text-2xl font-oswald font-bold mb-1">WOD del Día</h1>
          <p class="text-sm text-gray-400">${fechaDisplay}</p>
        </div>
        <div id="atletaWodTabContent"></div>
      `;
      renderWodAtleta(currentWodGrupal);
      
    } else {
      contentEntreno.innerHTML = `
        <div id="barraSemanalAtleta">${navegacionCompleta}</div>
        <div class="mb-4">
          <h1 class="text-xl md:text-2xl font-oswald font-bold mb-1">Mi Entrenamiento</h1>
          <p class="text-sm text-gray-400">${fechaDisplay}</p>
        </div>
        <div class="bg-kts-card border border-white/10 rounded-xl p-4 text-center py-8">
          <div class="text-4xl mb-3">😴</div>
          <h3 class="text-lg font-oswald font-bold mb-2">Día de Descanso</h3>
          <p class="text-gray-400">No hay entrenamiento programado para este día</p>
        </div>
      `;
    }
    
  } catch (error) {
    console.error('Error cargando WOD del atleta por fecha:', error);
  }
}
window.cargarWodAtletaPorFecha = cargarWodAtletaPorFecha;

// ========== INICIALIZAR CALENDARIO ATLETA ==========
async function iniciarCalendarioAtleta() {

  // Mostrar spinner inicial inmediatamente
  const contenedorInicial = document.getElementById('contentAtletaEntreno');
  if (contenedorInicial) {
    contenedorInicial.innerHTML = `
      <div class="text-center py-8">
        <i class="fas fa-spinner fa-spin text-4xl text-kts-gold mb-4"></i>
        <p class="text-gray-400 text-sm">Cargando entrenamiento...</p>
      </div>
    `;
  }

  // Verificar si tiene planes personalizados
  await verificarPlanesPersonalizados();
  
  // Establecer fecha seleccionada como hoy
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  fechaSeleccionadaAtleta = `${year}-${month}-${day}`;
  
  // Cargar WOD del día usando la función específica
  await cargarWodAtletaPorFecha(fechaSeleccionadaAtleta);
}

window.iniciarCalendarioAtleta = iniciarCalendarioAtleta;

console.log('✓ Módulo de Calendario Atleta cargado');
