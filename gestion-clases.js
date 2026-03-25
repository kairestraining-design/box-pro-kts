// ============================================
// GESTIÓN DE CLASES - KAIRES TRAINING SYSTEM
// ============================================

// ========== VARIABLES GLOBALES ==========
let clasesDisponibles = [];
let reservasHoy = [];

// ========== MODAL HTML (se inyecta dinámicamente) ==========
function inyectarModalesClases() {
  const modalHTML = `
    <!-- MODAL CARGAR CLASE -->
    <div id="modalCargarClase" class="hidden fixed inset-0 bg-black/90 z-[1001] overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen p-4">
        <div class="bg-kts-card border border-white/10 rounded-2xl p-3 md:p-5 w-full max-w-2xl my-3 max-h-[85vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl md:text-2xl font-oswald font-bold text-kts-gold">Nueva Clase Recurrente</h2>
            <button onclick="cerrarModalClase()" class="text-gray-400 hover:text-white text-2xl leading-none">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <form id="formCargarClase" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-bold text-gray-400 uppercase block mb-1">Nombre de la Clase</label>
                <select id="claseNombre" required class="w-full bg-kts-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kts-gold">
                  <option value="">Seleccionar...</option>
                  <option value="CrossFit">CrossFit</option>
                  <option value="Weightlifting">Weightlifting</option>
                  <option value="Gymnastics">Gymnastics</option>
                  <option value="Funcional">Funcional</option>
                  <option value="Open Box">Open Box</option>
                </select>
              </div>

              <div>
                <label class="text-xs font-bold text-gray-400 uppercase block mb-1">Día de la Semana</label>
                <select id="claseDia" required class="w-full bg-kts-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kts-gold">
                  <option value="">Seleccionar...</option>
                  <option value="Lunes">Lunes</option>
                  <option value="Martes">Martes</option>
                  <option value="Miércoles">Miércoles</option>
                  <option value="Jueves">Jueves</option>
                  <option value="Viernes">Viernes</option>
                  <option value="Sábado">Sábado</option>
                  <option value="Domingo">Domingo</option>
                </select>
              </div>

              <div>
                <label class="text-xs font-bold text-gray-400 uppercase block mb-1">Hora Inicio</label>
                <input type="time" id="claseHoraInicio" required class="w-full bg-kts-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kts-gold">
              </div>

              <div>
                <label class="text-xs font-bold text-gray-400 uppercase block mb-1">Hora Fin</label>
                <input type="time" id="claseHoraFin" required class="w-full bg-kts-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kts-gold">
              </div>

              <div>
                <label class="text-xs font-bold text-gray-400 uppercase block mb-1">Cupo Máximo</label>
                <input type="number" id="claseCupo" min="1" max="50" value="15" required class="w-full bg-kts-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kts-gold">
              </div>

              <div>
                <label class="text-xs font-bold text-gray-400 uppercase block mb-1">Coach Asignado</label>
                <select id="claseCoach" required class="w-full bg-kts-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kts-gold">
                  <option value="">Seleccionar coach...</option>
                </select>
              </div>
            </div>

            <div>
              <label class="text-xs font-bold text-gray-400 uppercase block mb-1">Estado</label>
              <select id="claseActiva" required class="w-full bg-kts-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kts-gold">
                <option value="SI">Activa</option>
                <option value="NO">Inactiva</option>
              </select>
            </div>

            <div class="flex gap-2 pt-4 border-t border-white/10">
              <button type="submit" class="flex-1 bg-kts-gold hover:bg-[#ff8555] text-black font-oswald font-bold py-3 rounded-lg uppercase text-sm">
                <i class="fas fa-save mr-2"></i> Guardar Clase
              </button>
              <button type="button" onclick="cerrarModalClase()" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-oswald font-bold py-3 rounded-lg uppercase text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- MODAL RESERVAS DE CLASE -->
    <div id="modalReservasClase" class="hidden fixed inset-0 bg-black/90 z-[1001] overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen p-4">
        <div class="bg-kts-card border border-white/10 rounded-2xl p-3 md:p-5 w-full max-w-3xl my-3 max-h-[85vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h2 class="text-xl md:text-2xl font-oswald font-bold text-kts-gold" id="tituloReservasClase">Reservas de Clase</h2>
              <p class="text-gray-400 text-sm" id="infoReservasClase">-</p>
            </div>
            <button onclick="cerrarModalReservas()" class="text-gray-400 hover:text-white text-2xl leading-none">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div id="listaReservasClase">
            <div class="text-center py-8">
              <i class="fas fa-spinner fa-spin text-4xl text-kts-gold mb-4"></i>
              <p class="text-gray-400">Cargando reservas...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Eliminar modales anteriores si existen
  const modalAnterior = document.getElementById('modalCargarClase');
    if (modalAnterior) {
      modalAnterior.remove();
    }
  const modalReservasAnterior = document.getElementById('modalReservasClase');
    if (modalReservasAnterior) {
      modalReservasAnterior.remove();
    }

// Inyectar modales actualizados
document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ========== CARGAR COACHES PARA SELECTOR ==========
async function cargarCoachesParaClases() {
  try {
    const { collection, query, where, getDocs } = window.firestoreFunctions;
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('Rol', '==', 'Coach'));
    const querySnapshot = await getDocs(q);
    
    const select = document.getElementById('claseCoach');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccionar coach...</option>';
    
    querySnapshot.forEach((doc) => {
      const user = doc.data();
      const option = document.createElement('option');
      option.value = user.Email;
      option.textContent = `${user.Nombre} ${user.Apellido}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando coaches:', error);
  }
}

// ========== ABRIR/CERRAR MODAL CLASE ==========
function abrirModalClase() {
  inyectarModalesClases();
  cargarCoachesParaClases();
  document.getElementById('modalCargarClase').classList.remove('hidden');
  
  // Inicializar formulario después de abrir
  setTimeout(() => {
    inicializarFormularioClase();
  }, 100);
}

function cerrarModalClase() {
  document.getElementById('modalCargarClase').classList.add('hidden');
  document.getElementById('formCargarClase').reset();
}

window.abrirModalClase = abrirModalClase;
window.cerrarModalClase = cerrarModalClase;

// ========== GUARDAR CLASE ==========
// ========== GUARDAR CLASE ==========
function inicializarFormularioClase() {
  const form = document.getElementById('formCargarClase');
  if (!form) return;
  
  // Remover listeners anteriores
  const nuevoForm = form.cloneNode(true);
  form.parentNode.replaceChild(nuevoForm, form);
  
  nuevoForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
      const claseData = {
        ID_Clase: `CLS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        Nombre_Clase: document.getElementById('claseNombre').value,
        Día_Semana: document.getElementById('claseDia').value,
        Hora_Inicio: document.getElementById('claseHoraInicio').value,
        Hora_Fin: document.getElementById('claseHoraFin').value,
        Cupo_Máximo: document.getElementById('claseCupo').value,
        ID_Coach: document.getElementById('claseCoach').value,
        Activa: document.getElementById('claseActiva').value
      };
      
      const { collection, doc, setDoc } = window.firestoreFunctions;
      await setDoc(doc(collection(window.db, 'clases'), claseData.ID_Clase), claseData);
      
      alert('Clase creada exitosamente');
      cerrarModalClase();
      cargarClasesAdmin();
      
    } catch (error) {
      console.error('Error guardando clase:', error);
      alert('Error al guardar clase: ' + error.message);
    }
  });
}

// ========== CARGAR CLASES (ADMIN) ==========
async function cargarClasesAdmin() {
  try {
    const { collection, getDocs } = window.firestoreFunctions;
    const clasesSnapshot = await getDocs(collection(window.db, 'clases'));
    
    let html = '';
    
    if (clasesSnapshot.empty) {
      html = `
        <div class="bg-kts-card border border-white/10 rounded-xl p-12 text-center">
          <div class="text-6xl mb-4">📅</div>
          <h3 class="text-2xl font-oswald font-bold mb-2">No hay clases creadas</h3>
          <p class="text-gray-400 mb-6">Crea tu primera clase recurrente</p>
          <button onclick="abrirModalClase()" class="bg-kts-gold hover:bg-[#ff8555] text-black font-oswald font-bold px-6 py-3 rounded-lg uppercase">
            <i class="fas fa-plus mr-2"></i> Nueva Clase
          </button>
        </div>
      `;
    } else {
      // Agrupar por día de semana
      const diasOrden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const clasesPorDia = {};
      
      clasesSnapshot.forEach((doc) => {
        const clase = doc.data();
        if (!clasesPorDia[clase.Día_Semana]) {
          clasesPorDia[clase.Día_Semana] = [];
        }
        clasesPorDia[clase.Día_Semana].push(clase);
      });
      
      diasOrden.forEach(dia => {
        if (clasesPorDia[dia]) {
          html += `
            <div class="mb-6">
              <h3 class="text-kts-gold font-oswald text-xl font-bold uppercase mb-3 flex items-center gap-2">
                <i class="fas fa-calendar-day"></i> ${dia}
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          `;
          
          clasesPorDia[dia].forEach(clase => {
            const estadoBadge = clase.Activa === 'SI' 
              ? '<span class="bg-green-500/20 text-green-500 px-2 py-1 rounded text-xs font-bold">ACTIVA</span>'
              : '<span class="bg-red-500/20 text-red-500 px-2 py-1 rounded text-xs font-bold">INACTIVA</span>';
            
            html += `
              <div class="bg-kts-card border border-white/10 rounded-lg p-4 hover:border-kts-gold transition-all">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h4 class="font-oswald font-bold text-lg text-white">${clase.Nombre_Clase}</h4>
                    <p class="text-gray-400 text-sm">${clase.Hora_Inicio} - ${clase.Hora_Fin}</p>
                  </div>
                  ${estadoBadge}
                </div>
                <div class="space-y-1 text-sm">
                  <div class="flex items-center gap-2 text-gray-400">
                    <i class="fas fa-users w-4"></i>
                    <span>Cupo: ${clase.Cupo_Máximo} personas</span>
                  </div>
                  <div class="flex items-center gap-2 text-gray-400">
                    <i class="fas fa-user-tie w-4"></i>
                    <span>Coach: ${clase.ID_Coach}</span>
                  </div>
                </div>
                <div class="mt-3 pt-3 border-t border-white/10 flex gap-2">
                  <button onclick="editarClase('${clase.ID_Clase}')" class="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 font-bold py-2 rounded text-xs uppercase">
                    <i class="fas fa-edit mr-1"></i> Editar
                  </button>
                  <button onclick="eliminarClase('${clase.ID_Clase}')" class="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 font-bold py-2 rounded text-xs uppercase">
                    <i class="fas fa-trash mr-1"></i> Eliminar
                  </button>
                </div>
              </div>
            `;
          });
          
          html += `
              </div>
            </div>
          `;
        }
      });
    }
    
    document.getElementById('listaClasesAdmin').innerHTML = html;
    
  } catch (error) {
    console.error('Error cargando clases:', error);
    document.getElementById('listaClasesAdmin').innerHTML = `
      <div class="bg-kts-card border border-white/10 rounded-xl p-12 text-center">
        <div class="text-6xl text-red-500 mb-4">⚠️</div>
        <h3 class="text-2xl font-oswald font-bold mb-2">Error</h3>
        <p class="text-gray-400">No se pudieron cargar las clases</p>
      </div>
    `;
  }
}

window.cargarClasesAdmin = cargarClasesAdmin;

// ========== EDITAR CLASE (PLACEHOLDER) ==========
function editarClase(idClase) {
  alert('Función editar clase: ' + idClase + '\n(En desarrollo)');
}

window.editarClase = editarClase;

// ========== ELIMINAR CLASE ==========
async function eliminarClase(idClase) {
  if (!confirm('¿Eliminar esta clase? Esta acción no se puede deshacer.')) return;
  
  try {
    const { doc, deleteDoc } = window.firestoreFunctions;
    await deleteDoc(doc(window.db, 'clases', idClase));
    alert('Clase eliminada');
    cargarClasesAdmin();
  } catch (error) {
    console.error('Error eliminando clase:', error);
    alert('Error al eliminar clase');
  }
}

window.eliminarClase = eliminarClase;

// ========== VER RESERVAS DE CLASE ==========
async function verReservasClase(idClase, nombreClase, fecha) {
  inyectarModalesClases();
  
  document.getElementById('tituloReservasClase').textContent = nombreClase;
  document.getElementById('infoReservasClase').textContent = `Reservas del ${fecha}`;
  document.getElementById('modalReservasClase').classList.remove('hidden');
  
  try {
    const { collection, query, where, getDocs } = window.firestoreFunctions;
    const reservasRef = collection(window.db, 'reservas');
    const q = query(
      reservasRef, 
      where('ID_Clase', '==', idClase),
      where('Fecha_Clase', '==', fecha)
    );
    const querySnapshot = await getDocs(q);
    
    let html = '';
    
    if (querySnapshot.empty) {
      html = `
        <div class="text-center py-12">
          <div class="text-5xl mb-4">📭</div>
          <p class="text-gray-400">No hay reservas para esta clase</p>
        </div>
      `;
    } else {
      html = '<div class="space-y-2">';
      
      let contador = 0;
      querySnapshot.forEach((doc) => {
        const reserva = doc.data();
        contador++;
        
        html += `
          <div class="bg-kts-dark border border-white/10 rounded-lg p-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="bg-kts-gold text-black w-8 h-8 rounded-full flex items-center justify-center font-bold">
                ${contador}
              </div>
              <div>
                <div class="font-bold text-white">${reserva.ID_Usuario}</div>
                <div class="text-xs text-gray-400">Reserva: ${reserva.Fecha_Reserva}</div>
              </div>
            </div>
            <span class="text-xs bg-green-500/20 text-green-500 px-3 py-1 rounded-full font-bold uppercase">
              ${reserva.Estado}
            </span>
          </div>
        `;
      });
      
      html += '</div>';
    }
    
    document.getElementById('listaReservasClase').innerHTML = html;
    
  } catch (error) {
    console.error('Error cargando reservas:', error);
    document.getElementById('listaReservasClase').innerHTML = `
      <div class="text-center py-12">
        <div class="text-5xl text-red-500 mb-4">⚠️</div>
        <p class="text-gray-400">Error al cargar reservas</p>
      </div>
    `;
  }
}

function cerrarModalReservas() {
  document.getElementById('modalReservasClase').classList.add('hidden');
}

window.verReservasClase = verReservasClase;
window.cerrarModalReservas = cerrarModalReservas;

// ========== INICIALIZAR AL CARGAR ==========
console.log('✓ Módulo de Gestión de Clases cargado');
