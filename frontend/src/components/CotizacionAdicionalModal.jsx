import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '${API_URL}/api';

export default function CotizacionAdicionalModal({ proyecto, clientes, cotizacionExistente, onClose, onSuccess }) {
  // ========== ESTADOS ==========
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const [loadingServicios, setLoadingServicios] = useState(false);

  // Items empiezan VACIOS - no heredan de cotización aprobada
  const [items, setItems] = useState([]);
  const [tipoPago, setTipoPago] = useState('anticipo_final');
  const [metodoPago, setMetodoPago] = useState('Transferencia Bancaria');
  const [notas, setNotas] = useState('');
  const [notasLegales, setNotasLegales] = useState('Terminos: Pago a 15 dias. No incluye IVA.');
  const [estadoGeneral, setEstadoGeneral] = useState('Pendiente');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Info del cliente/sede precargada (solo lectura)
  const [infoCliente, setInfoCliente] = useState(null);

  // ========== CARGAR INICIAL ==========
  // CAMBIO: Usar ref para evitar re-ejecucion infinita
  const inicializado = React.useRef(false);

  useEffect(() => {
    if (!proyecto || inicializado.current) return;
    inicializado.current = true;

    // Fecha de vencimiento default (15 dias)
    const fechaVenc = new Date();
      fechaVenc.setDate(fechaVenc.getDate() + 15);
      setFechaVencimiento(fechaVenc.toISOString().split('T')[0]);

    // Notas default
      setNotas(`Cotizacion adicional para proyecto: ${proyecto.nombreProyecto}`);

    // Info del cliente/sede
    const cliente = clientes.find(c => c.idCliente === proyecto.idCliente);
      if (cliente) {
        const esPrincipal = String(proyecto.idSede).includes('PRINCIPAL');
        const sede = esPrincipal
          ? { nombreSede: 'Principal (Administrativa)', direccion: cliente.direccion, celular: cliente.telefono, correoEnc: cliente.correo }
          : (cliente.sedes?.find(s => s.id === proyecto.idSede) || { nombreSede: 'Sede no encontrada' });

        setInfoCliente({
          nombreEmp: cliente.nombreEmp,
          nit: esPrincipal ? cliente.nit : (sede.nitEncargado || cliente.nit),
          sede: sede.nombreSede,
          direccion: sede.direccion || cliente.direccion,
          contacto: sede.celular || cliente.telefono || cliente.celular,
          correo: sede.correoEnc || cliente.correo
        });
      }

    // CAMBIO: Si hay cotizacion existente, cargar sus items
    if (cotizacionExistente?.items?.length > 0) {
      setItems(cotizacionExistente.items.map((item, idx) => ({
        id: Date.now() + idx,
        ...item
      })));
      setTipoPago(cotizacionExistente.tipoPago || 'anticipo_final');
      setMetodoPago(cotizacionExistente.metodoPago || 'Transferencia Bancaria');
      setNotas(cotizacionExistente.notas || '');
      setNotasLegales(cotizacionExistente.notasLegales || 'Terminos: Pago a 15 dias. No incluye IVA.');
      setEstadoGeneral(cotizacionExistente.estado_general || 'Pendiente');
      } else {
    // Items empiezan vacios - el usuario los agrega manualmente
      setItems([]);
      }

    // Cargar servicios del catalogo
      cargarServicios();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proyecto, clientes]);

    const cargarServicios = async () => {
      setLoadingServicios(true);
        try {
          const res = await axios.get(`${API_URL}/servicios`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setServiciosDisponibles(res.data?.data || []);
        } catch (error) {
          console.log('Error cargando servicios:', error);
          setServiciosDisponibles([]);
        } finally {
          setLoadingServicios(false);
        }
    };

    // ========== FUNCIONES DE ITEMS ==========
    const agregarDesdeCatalogo = (servicio) => {
      setItems(prev => [...prev, {
        id: Date.now() + Math.random(),
        idServicio: servicio.idServicio,
        nombreServicio: servicio.nombre,
        precioUnitario: Number(servicio.precioUnitario) || 0,
        cantidad: 1,
        subtotal: Number(servicio.precioUnitario) || 0,
        unidad: servicio.unidad || 'und'
      }]);
    };

    const agregarFilaManual = () => {
      setItems(prev => [...prev, {
        id: Date.now() + Math.random(),
        idServicio: '',
        nombreServicio: '',
        precioUnitario: 0,
        cantidad: 1,
        subtotal: 0,
        unidad: 'und'
      }]);
    };

    const modificarItem = (index, campo, valor) => {
      const nuevosItems = [...items];
        nuevosItems[index][campo] = valor;
        if (campo === 'precioUnitario' || campo === 'cantidad') {
          nuevosItems[index].subtotal = Number(nuevosItems[index].precioUnitario) * Number(nuevosItems[index].cantidad);
        }
      setItems(nuevosItems);
    };

    const eliminarItem = (index) => {
      if (items.length === 1) {
        alert("Debe tener al menos un servicio");
          return;
        }
      setItems(items.filter((_, i) => i !== index));
    };

    // ========== CALCULOS ==========
    const calcularTotales = () => {
      const subtotal = items.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
      const iva = subtotal * 0.19;
      const total = subtotal + iva;
        return { subtotal, iva, total };
    };

    const { subtotal, iva, total } = calcularTotales();

    // ========== GUARDAR ==========
    const guardar = async () => {
      if (!proyecto?.idProyecto) {
        alert("Error: No hay proyecto seleccionado");
          return;
      }
      if (items.length === 0) {
        alert("Debe agregar al menos un servicio");
          return;
        }
        if (items.some(i => !i.nombreServicio.trim())) {
          alert("Todos los servicios deben tener un nombre");
            return;
        }

        setGuardando(true);
        try {
        // CAMBIO: Si es edicion, actualizar en lugar de crear nueva
          if (cotizacionExistente?.idCotizacion) {
            // Es edicion - usar updateCotizacion (crea versionamiento automatico)
            const payloadUpdate = {
              estado_general: estadoGeneral,
              items: items.map(({ id, ...rest }) => rest),
              subtotal,
              iva,
              total,
              anticipo: total * 0.40,
              notasLegales,
              notas,
              tipoPago,
              metodoPago
            };

            const res = await axios.put(
              `${API_URL}/cotizaciones/${cotizacionExistente.idCotizacion}`,
               payloadUpdate
            );

            if (res.data.esVersion) {
              // Se creo nueva version, actualizar referencia en proyecto
              await axios.put(
                `${API_URL}/proyectos/${proyecto.idProyecto}/cotizaciones-adicionales/${cotizacionExistente.idCotizacion}`,
                {
                  idCotizacionNueva: res.data.data.idCotizacion,
                  valor: total,
                  descripcion: notas || `Cotizacion adicional actualizada`,
                  notas,
                  estado: 'Pendiente'
                },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
              );
                  
              alert(`Version actualizada!\nNueva version: ${res.data.data.idCotizacion}\nAnterior: ${res.data.versionAnterior} (Superada)`);
            } else {
              alert('Cotizacion adicional actualizada correctamente');
            }
          } else {
          // Es creacion nueva
          const payloadCotizacion = {
            idCliente: proyecto.idCliente,
            idSede: proyecto.idSede || `${proyecto.idCliente}-PRINCIPAL`,
            estado_general: estadoGeneral,
            items: items.map(({ id, ...rest }) => rest),
            subtotal,
            iva,
            total,
            anticipo: total * 0.40,
            fechaVencimiento,
            notasLegales,
            fechaCreacion: new Date(),
            version_id: 1,
            creadoPor: localStorage.getItem('userId') || 'Emp-003',
            tipoPago,
            metodoPago,
            notas,
            idProyectoOrigen: proyecto.idProyecto,
            esCotizacionAdicional: true
          };

          const res = await axios.post(`${API_URL}/cotizaciones`, payloadCotizacion);
          const idGenerado = res.data.data.idCotizacion;

          // Vincular al proyecto
          const payloadProyecto = {
            idCotizacion: idGenerado,
            valor: total,
            descripcion: `Cotizacion adicional generada desde modulo de proyectos`,
            items: items.map(({ id, ...rest }) => rest),
            tipoPago,
            metodoPago,
            notas
          };

          await axios.post(
            `${API_URL}/proyectos/${proyecto.idProyecto}/cotizaciones-adicionales`,
            payloadProyecto,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );

          alert(`Cotizacion adicional guardada!\nID: ${idGenerado}`);
          }

          onSuccess?.();
          onClose();
          } catch (e) {
            console.error("Error:", e);
            const mensaje = e.response?.data?.details || e.response?.data?.error || e.message;
            alert(`Error al guardar:\n${typeof mensaje === 'object' ? JSON.stringify(mensaje, null, 2) : mensaje}`);
          } finally {
            setGuardando(false);
        }
    };

    // ========== RENDER ==========
    if (!proyecto) return null;

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', zIndex: 1003,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'auto'
      }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: '30px',
        width: '95%', maxWidth: '1000px', maxHeight: '95vh',
        overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }}>
      {/* HEADER */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: '20px', borderBottom: '2px solid #6f42c1', paddingBottom: '10px' 
      }}>
      <div>
        <h2 style={{ margin: 0, color: '#333' }}>Cotizacion Adicional</h2>
          <p style={{ margin: '5px 0 0 0', color: '#6f42c1', fontSize: '0.9em' }}>
            Proyecto: <strong>{proyecto.nombreProyecto}</strong> | ID: {proyecto.idProyecto}
          </p>
      </div>
      <button 
        onClick={onClose} 
        style={{ fontSize: '1.5em', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 10px' }}
        >
        x
      </button>
      </div>

      {/* INFO CLIENTE/SEDE - SOLO LECTURA */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px', 
        marginBottom: '20px',
        padding: '15px',
        background: '#e8f6f3',
        borderRadius: '8px',
        border: '1px solid #1abc9c'
      }}>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85em', color: '#16a085' }}>
            Cliente:
          </label>
          <div style={{ padding: '10px', background: 'white', borderRadius: '6px', border: '1px solid #ced4da', fontWeight: '500' }}>
            {infoCliente?.nombreEmp || 'No disponible'}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85em', color: '#16a085' }}>
            Sede:
          </label>
          <div style={{ padding: '10px', background: 'white', borderRadius: '6px', border: '1px solid #ced4da', fontWeight: '500' }}>
              {infoCliente?.sede || 'Sede Principal'}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85em', color: '#16a085' }}>
            NIT:
          </label>
          <div style={{ padding: '10px', background: 'white', borderRadius: '6px', border: '1px solid #ced4da', fontWeight: '500' }}>
            {infoCliente?.nit || 'N/A'}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85em', color: '#16a085' }}>
            Estado:
          </label>
          <select 
            value={estadoGeneral} 
            onChange={(e) => setEstadoGeneral(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}
          >
            <option value="Pendiente">Pendiente</option>
            <option value="Aprobada">Aprobada</option>
            <option value="Superada">Superada</option>
            <option value="Rechazada">Rechazada</option>
            <option value="Caducada">Caducada</option>
          </select>
        </div>

      </div>

      {/* INFO RESUMEN */}
      <div style={{ background: '#e9ecef', padding: '10px', marginBottom: '20px', borderRadius: '6px' }}>
        <p style={{ margin: '2px 0', fontSize: '0.9em' }}><strong>ID Cotizacion:</strong> Generado al guardar</p>
        <p style={{ margin: '2px 0', fontSize: '0.9em' }}>
          <strong>Contacto:</strong> {infoCliente?.contacto || 'N/A'} | <strong>Correo Electrónico:</strong> {infoCliente?.correo || 'N/A'}
        </p>
      </div>

      {/* FECHA DE VALIDEZ */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9em' }}>Fecha de Validez:</label>
          <input 
            type="date" 
            value={fechaVencimiento} 
            onChange={(e) => setFechaVencimiento(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }}
            />
        </div>

        {/* CATALOGO DE SERVICIOS */}
        <h3 style={{ color: '#333', borderBottom: '1px solid #dee2e6', paddingBottom: '8px' }}>Catalogo de Servicios:</h3>
          {loadingServicios && <p style={{ color: '#6c757d' }}>Cargando catalogo...</p>}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '8px', 
            marginBottom: '20px',
            padding: '10px',
            background: '#f8f9fa',
            borderRadius: '6px'
          }}>
          {serviciosDisponibles.map(s => (
          <button 
            key={s.idServicio} 
            onClick={() => agregarDesdeCatalogo(s)}
            style={{
            padding: '8px 12px',
            background: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85em'
            }}
          >
          + {s.nombre}
          </button>
          ))}
          <button 
            onClick={agregarFilaManual}
            style={{
            padding: '8px 12px',
            background: '#6c757d',
            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85em'
                        }}
                    >
                        + Servicio Manual
                    </button>
                </div>

                {/* TABLA DE ITEMS */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                        <tr style={{ background: '#6f42c1', color: 'white' }}>
                            <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>Servicio</th>
                            <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #dee2e6' }}>Precio Unit.</th>
                            <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>Cant</th>
                            <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>Und</th>
                            <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #dee2e6' }}>Subtotal</th>
                            <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                                <td style={{ padding: '8px' }}>
                                    <input 
                                        value={item.nombreServicio} 
                                        placeholder="Nombre servicio" 
                                        onChange={(e) => modificarItem(index, 'nombreServicio', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                    />
                                </td>
                                <td style={{ padding: '8px' }}>
                                    <input 
                                        type="number" 
                                        value={item.precioUnitario} 
                                        onChange={(e) => modificarItem(index, 'precioUnitario', Number(e.target.value))}
                                        style={{ width: '120px', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', textAlign: 'right' }}
                                    />
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                    <input 
                                        type="number" 
                                        value={item.cantidad} 
                                        onChange={(e) => modificarItem(index, 'cantidad', Number(e.target.value))}
                                        style={{ width: '70px', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', textAlign: 'center' }}
                                    />
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center', color: '#6c757d' }}>
                                    {item.unidad}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                                    ${item.subtotal.toLocaleString()}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                    <button 
                                        onClick={() => eliminarItem(index)}
                                        style={{
                                            padding: '6px 10px',
                                            background: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#6c757d', fontStyle: 'italic' }}>
                                    No hay servicios agregados. Selecciona del catalogo o agrega manualmente.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* TOTALES Y CONFIGURACION */}
                <div style={{ 
                    display: 'flex', 
                    gap: '20px', 
                    flexWrap: 'wrap',
                    marginBottom: '20px'
                }}>
                    {/* COLUMNA IZQUIERDA: TOTALES */}
                    <div style={{ flex: '1 1 300px', background: '#e8f6f3', padding: '20px', borderRadius: '8px', border: '1px solid #1abc9c' }}>
                        <p style={{ margin: '5px 0', fontSize: '1.1em' }}>Subtotal: <strong>${subtotal.toLocaleString()}</strong></p>
                        <p style={{ margin: '5px 0', fontSize: '1.1em' }}>IVA (19%): <strong>${iva.toLocaleString()}</strong></p>
                        <h3 style={{ margin: '10px 0 0 0', color: '#16a085', fontSize: '1.4em' }}>
                            Total: ${total.toLocaleString()}
                        </h3>
                        <p style={{ margin: '5px 0', fontSize: '0.95em', color: '#6c757d' }}>
                            Anticipo Requerido (40%): ${(total * 0.40).toLocaleString('es-CO')}
                        </p>
                        <button 
                            onClick={guardar}
                            disabled={guardando || items.length === 0}
                            style={{
                                marginTop: '15px',
                                width: '100%',
                                padding: '12px 20px',
                                background: guardando || items.length === 0 ? '#6c757d' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: guardando || items.length === 0 ? 'not-allowed' : 'pointer',
                                fontSize: '1.1em',
                                fontWeight: 'bold'
                            }}
                        >
                            {guardando ? 'Guardando...' : 'Guardar Cotizacion Adicional'}
                        </button>
                    </div>

                    {/* COLUMNA DERECHA: Configuracion */}
                    <div style={{ flex: '1 1 250px', backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9em' }}>Tipo de Pago:</label>
                            <select 
                                value={tipoPago}
                                onChange={(e) => setTipoPago(e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            >
                                <option value="unico">Pago Único</option>
                                <option value="anticipo_final">Anticipo + Final</option>
                                <option value="por_etapas">Por Etapas</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9em' }}>Metodo de Pago:</label>
                            <select 
                                value={metodoPago}
                                onChange={(e) => setMetodoPago(e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            >
                                <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                                <option value="Efectivo">Efectivo</option>
                                <option value="Cheque Corporativo">Cheque Corporativo</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9em' }}>Notas Legales:</label>
                            <textarea 
                                rows="3" 
                                value={notasLegales}
                                onChange={(e) => setNotasLegales(e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            />
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9em' }}>Notas Adicionales:</label>
                            <textarea 
                                rows="2" 
                                placeholder="Notas internas..."
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                            />
                        </div>
                    </div>
                </div>

                {/* BOTON CERRAR INFERIOR */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar y Cerrar
                    </button>
                </div>
      </div>
      </div>
    );
}