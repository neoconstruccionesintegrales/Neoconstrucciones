/* ==========================================================================
   FEEDBACK.JS — Confirmaciones y notificaciones ÚNICAS del sistema.
   Sustituye los alert()/confirm() nativos y las notificaciones caseras
   duplicadas en cada módulo.
   Separación JS/CSS: este archivo SÓLO crea nodos y alterna clases de
   componentes.css (.modal-*, .toast-*); no contiene ni un estilo inline.

   Uso:
     import { notificar, confirmar } from '../utils/feedback';

     notificar('Cotización guardada', 'exito');

     const ok = await confirmar({
       titulo: 'Eliminar factura',
       mensaje: 'Esta acción no se puede deshacer.',
       tipo: 'eliminar',
     });
     if (ok) { ... }
   ========================================================================== */

/* ------------------------------------------------------------------
   NOTIFICACIONES (toasts)
   tipos: 'exito' | 'error' | 'advertencia' | 'info'
   ------------------------------------------------------------------ */

const ICONOS = {
  exito: '✔',
  error: '✖',
  advertencia: '⚠',
  info: 'ℹ',
};

function obtenerContenedor() {
  let cont = document.querySelector('.toast-contenedor');
  if (!cont) {
    cont = document.createElement('div');
    cont.className = 'toast-contenedor';
    cont.setAttribute('aria-live', 'polite');
    document.body.appendChild(cont);
  }
  return cont;
}

/**
 * Muestra una notificación flotante.
 * @param {string} mensaje
 * @param {'exito'|'error'|'advertencia'|'info'} tipo
 * @param {number} duracion - ms antes de cerrarse sola (0 = manual)
 */
export function notificar(mensaje, tipo = 'info', duracion = 4000) {
  const cont = obtenerContenedor();

  const toast = document.createElement('div');
  toast.className = `toast toast--${tipo}`;
  toast.setAttribute('role', 'status');

  const icono = document.createElement('span');
  icono.textContent = ICONOS[tipo] || ICONOS.info;

  const texto = document.createElement('span');
  texto.textContent = mensaje;

  toast.append(icono, texto);
  cont.appendChild(toast);

  const cerrar = () => {
    toast.classList.add('toast--saliendo');
    setTimeout(() => toast.remove(), 250);
  };

  toast.addEventListener('click', cerrar);
  if (duracion > 0) setTimeout(cerrar, duracion);
}

/* ------------------------------------------------------------------
   CONFIRMACIONES (modal con promesa)
   tipos: 'eliminar' | 'editar' | 'guardar' | 'info'
   ------------------------------------------------------------------ */

const ESTILO_BOTON = {
  eliminar: 'btn--eliminar',
  editar:   'btn--editar',
  guardar:  'btn--guardar',
  info:     'btn--primario',
};

/**
 * Abre un modal de confirmación y resuelve true/false.
 * @param {{ titulo?: string, mensaje: string,
 *           tipo?: 'eliminar'|'editar'|'guardar'|'info',
 *           textoConfirmar?: string, textoCancelar?: string }} opciones
 * @returns {Promise<boolean>}
 */
export function confirmar({
  titulo = 'Confirmar acción',
  mensaje,
  tipo = 'info',
  textoConfirmar = 'Aceptar',
  textoCancelar = 'Cancelar',
}) {
  return new Promise((resolve) => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.setAttribute('role', 'dialog');
    fondo.setAttribute('aria-modal', 'true');

    fondo.innerHTML = `
      <div class="modal modal--sm">
        <div class="modal__header">
          <h3 class="modal__titulo"></h3>
          <button type="button" class="modal__cerrar" aria-label="Cerrar">×</button>
        </div>
        <div class="modal__cuerpo"><p></p></div>
        <div class="modal__acciones">
          <button type="button" class="btn btn--cancelar" data-accion="cancelar"></button>
          <button type="button" class="btn ${ESTILO_BOTON[tipo] || ESTILO_BOTON.info}" data-accion="confirmar"></button>
        </div>
      </div>`;

    fondo.querySelector('.modal__titulo').textContent = titulo;
    fondo.querySelector('.modal__cuerpo p').textContent = mensaje;
    fondo.querySelector('[data-accion="cancelar"]').textContent = textoCancelar;
    fondo.querySelector('[data-accion="confirmar"]').textContent = textoConfirmar;

    document.body.appendChild(fondo);
    // Doble frame para que la transición de entrada se vea
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fondo.classList.add('modal-fondo--abierto');
    }));

    let resuelto = false;
    const cerrar = (resultado) => {
      if (resuelto) return;
      resuelto = true;
      fondo.classList.remove('modal-fondo--abierto');
      document.removeEventListener('keydown', alTeclar);
      setTimeout(() => fondo.remove(), 250);
      resolve(resultado);
    };

    const alTeclar = (e) => { if (e.key === 'Escape') cerrar(false); };
    document.addEventListener('keydown', alTeclar);

    fondo.addEventListener('click', (e) => {
      if (e.target === fondo) cerrar(false);           // clic en el fondo
    });
    fondo.querySelector('.modal__cerrar').addEventListener('click', () => cerrar(false));
    fondo.querySelector('[data-accion="cancelar"]').addEventListener('click', () => cerrar(false));
    fondo.querySelector('[data-accion="confirmar"]').addEventListener('click', () => cerrar(true));

    // Foco inicial al botón de confirmar (accesibilidad)
    setTimeout(() => fondo.querySelector('[data-accion="confirmar"]').focus(), 60);
  });
}

/**
 * Atajo para la confirmación más frecuente: eliminar un registro.
 * confirmarEliminacion('la cotización #123')
 */
export function confirmarEliminacion(nombreRegistro = 'este registro') {
  return confirmar({
    titulo: 'Eliminar registro',
    mensaje: `¿Seguro que deseas eliminar ${nombreRegistro}? Esta acción no se puede deshacer.`,
    tipo: 'eliminar',
    textoConfirmar: 'Eliminar',
  });
}