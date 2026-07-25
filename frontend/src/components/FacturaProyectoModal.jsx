import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { generarPDFFactura } from '../utils/generarPDFFacturas';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const METODOS_PAGO = [
  'Transferencia Bancaria',
  'Efectivo',
  'Cheque Corporativo',
  'Pasarela de pago Online',
  'Tarjeta de credito/debito'
];

const ESTADOS_FACTURA = [
  'Pendiente de Anticipo',
  'Anticipo ya Pagado',
  'Pendiente de Saldo',        
  'Pendiente de 2da Etapa',   
  'Pagada',
  'Anulada',
  'Vencido'
];

export default function FacturaProyectoModal({ proyecto, facturaExistente, clientes, onClose, onSuccess }) {
  // 1. ESTADOS
  const [items, setItems] = useState([]);
  const [metodoPago, setMetodoPago] = useState('Transferencia Bancaria');
  const [notas, setNotas] = useState('');
  const [notasLegales, setNotasLegales] = useState('');
  const [notasAdicionales, setNotasAdicionales] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [estado, setEstado] = useState('Pendiente de Anticipo');
  const [anticipoPorcentaje, setAnticipoPorcentaje] = useState(40);
  const [saldoPorcentaje, setSaldoPorcentaje] = useState(60);
  const [ivaPorcentaje, setIvaPorcentaje] = useState(19);
  const [retencionPorcentaje, setRetencionPorcentaje] = useState(2);
  const [guardando, setGuardando] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);

  const esEdicion = !!facturaExistente?.idFactura;
  const [infoCliente, setInfoCliente] = useState(null);
  const [cotizacionAdicionalData, setCotizacionAdicionalData] = useState(null);
  const [porcentajeManual, setPorcentajeManual] = useState(60);
  const [labelFactura, setLabelFactura] = useState('');
  const [esSaldoProyecto, setEsSaldoProyecto] = useState(false);
  
  // NUEVO: Estados para hitos
  const [hitoSeleccionado, setHitoSeleccionado] = useState(null);
  const [modoHito, setModoHito] = useState(false);
  const [hitosDisponibles, setHitosDisponibles] = useState([]);
  const [hitosPendientesSaldo, setHitosPendientesSaldo] = useState([]);
  const [hitosSeleccionadosSaldo, setHitosSeleccionadosSaldo] = useState([]);

  const recalcularItemsConPorcentaje = (porcentaje, itemsBase = items) => {
    if (!itemsBase || itemsBase.length === 0) return;

    const itemsRecalculados = itemsBase.map((item, idx) => ({
      id: Date.now() + idx,
      idServicio: item.idServicio || '',
      nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
      descripcion: item.descripcion || '',
      cantidad: item.cantidad || 1,
      precioUnitario: Math.round((item.precioUnitario * porcentaje) / 100),
      unidad: item.unidad || 'und',
      subtotal: Math.round((item.subtotal * porcentaje) / 100)
    }));

    setItems(itemsRecalculados);

    if (porcentaje === 100) {
      setLabelFactura('Pago Único (100%)');
    } else {
      setLabelFactura(`Factura Parcial (${porcentaje}%)`);
    }
  };

      const toggleHitoSaldo = (idHito) => {
    setHitosSeleccionadosSaldo(prev => {
      const nuevos = prev.includes(idHito) 
        ? prev.filter(id => id !== idHito)
        : [...prev, idHito];
      return nuevos;
    });
  };

  // ========== FUNCIONES AUXILIARES  ==========
  const cargarServicios = async () => {
    try {
      const res = await axios.get(`${API_URL}/servicios`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setServiciosDisponibles(res.data?.data || []);
    } catch (error) {
      console.log('Error cargando servicios:', error);
    }
  };

  const procesarCotizacionAdicional = (cotizacion) => {
    setCotizacionAdicionalData(cotizacion);

    const totalFacturado = cotizacion.facturasGeneradas?.reduce((acc, f) => acc + (f.valor || 0), 0) || 0;
    const porcentajeFacturado = Math.round((totalFacturado / cotizacion.total) * 100);
    const porcentajeSugerido = Math.min(100, 100 - porcentajeFacturado);

    let estadoAuto;
    let labelTipo;

    if (porcentajeSugerido === 100) {
      estadoAuto = 'Pendiente de Anticipo';
      labelTipo = 'Pago Único';
    } else if (porcentajeSugerido > 0) {
      estadoAuto = 'Pendiente de Saldo';
      labelTipo = `Saldo (${porcentajeSugerido}%)`;
    } else {
      estadoAuto = 'Pendiente de Saldo';
      labelTipo = 'Saldo';
    }

    setPorcentajeManual(porcentajeSugerido);
    setEstado(estadoAuto);
    setLabelFactura(labelTipo);

    recalcularItemsConPorcentaje(porcentajeSugerido, cotizacion.items || []);
  };

  //  Cargar hitos disponibles del proyecto
  const cargarHitosDisponibles = () => {
    if (!proyecto?.hitos || proyecto.hitos.length === 0) return;
    
    const hitosPendientes = proyecto.hitos.filter(h => 
      !h.facturaGenerada && !h.completado
    );
    setHitosDisponibles(hitosPendientes);
  };

  useEffect(() => {
    if (!proyecto) return;
// DEBUG: Ver qué llega
  console.log('=== DEBUG MODAL ===');
  console.log('facturaExistente:', facturaExistente);
  console.log('_esSaldoProyecto:', facturaExistente?._esSaldoProyecto);
  console.log('esSaldoBase:', facturaExistente?._esSaldoProyecto === true);
  
  // ... resto del useEffect
    cargarServicios();
    cargarHitosDisponibles();

    // Info cliente
    const cliente = clientes?.find(c => c.idCliente === proyecto.idCliente);
    if (cliente) {
      const esPrincipal = String(proyecto.idSede).includes('PRINCIPAL');
      const sede = esPrincipal
        ? { nombreSede: 'Principal (Administrativa)', direccion: cliente.direccion, celular: cliente.telefono, correoEnc: cliente.correo }
        : (cliente.sedes?.find(s => s.id === proyecto.idSede) || {});

      setInfoCliente({
        nombreEmp: cliente.nombreEmp,
        nit: esPrincipal ? cliente.nit : (sede.nitEncargado || cliente.nit),
        sede: sede.nombreSede || 'Principal',
        direccion: sede.direccion || cliente.direccion,
        contacto: sede.celular || cliente.telefono || cliente.celular,
        correo: sede.correoEnc || cliente.correo
      });
    }

    // DETECTAR si es factura de saldo del proyecto base
    const esSaldoBase = facturaExistente?._esSaldoProyecto === true;
    
    // DETECTAR si es generación desde hito
    const esDesdeHito = facturaExistente?._esDesdeHito === true;

    if (esDesdeHito && facturaExistente?.idHito) {
      // MODO HITO
      setModoHito(true);
      const hito = proyecto.hitos?.find(h => h.idHito === facturaExistente.idHito);
      if (hito) {
        setHitoSeleccionado(hito);
        setPorcentajeManual(hito.porcentajePago);
        setEstado(hito.numeroHito === 1 ? 'Pendiente de Anticipo' : 'Pendiente de Saldo');
        setLabelFactura(`${hito.nombre} (${hito.porcentajePago}%)`);
        
        // Cargar items proporcionales al hito
        const itemsHito = (proyecto.items || []).map((item, idx) => ({
          id: Date.now() + idx,
          idServicio: item.idServicio || '',
          nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
          descripcion: item.descripcion || '',
          cantidad: item.cantidad || 1,
          precioUnitario: Math.round((item.precioUnitario || 0) * hito.porcentajePago / 100),
          unidad: item.unidad || 'und',
          subtotal: Math.round((item.subtotal || 0) * hito.porcentajePago / 100)
        }));
        setItems(itemsHito);
        
        setNotas(`Factura de ${hito.nombre} - Proyecto: ${proyecto.nombreProyecto}`);
      }

      const fechaHoy = new Date().toISOString().split('T')[0];
      const fechaVen = new Date();
      fechaVen.setDate(fechaVen.getDate() + 30);
      setFechaEmision(fechaHoy);
      setFechaVencimiento(fechaVen.toISOString().split('T')[0]);
      setNotasLegales('Terminos: Pago a 30 dias. IVA incluido.');

        } else if (esSaldoBase) {
      setEsSaldoProyecto(true);
      
      // 1. Cargar hitos pendientes (no facturados, no completados, no cubiertos)
      const hitosPendientes = proyecto.hitos?.filter(h => 
        !h.facturaGenerada && !h.completado && !h.cubiertoPorSaldo
      ) || [];
      setHitosPendientesSaldo(hitosPendientes);
      
      // Por defecto: seleccionar TODOS los pendientes
      const seleccionadosDefault = hitosPendientes.map(h => h.idHito);
      setHitosSeleccionadosSaldo(seleccionadosDefault);

      // 2. Calcular % según hitos seleccionados
      const porcentajeDefault = hitosPendientes.reduce((sum, h) => sum + (h.porcentajePago || 0), 0);
      setPorcentajeManual(porcentajeDefault);

      // 3. Recalcular items: CANTIDAD proporcional, PRECIO UNITARIO fijo
      const recalcularItemsSaldo = (pct) => {
        const itemsSaldo = (proyecto.items || []).map((item, idx) => {
          const cantidadOriginal = Number(item.cantidad) || 1;
          const precioOriginal = Number(item.precioUnitario) || 0;
          const cantidadSaldo = Math.round(cantidadOriginal * pct / 100);
          return {
            id: Date.now() + idx,
            idServicio: item.idServicio || '',
            nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
            descripcion: `Saldo (${pct}%) - ${item.descripcion || ''}`,
            cantidad: cantidadSaldo,
            precioUnitario: precioOriginal,
            unidad: item.unidad || 'und',
            subtotal: cantidadSaldo * precioOriginal
          };
        });
        setItems(itemsSaldo);
      };

      recalcularItemsSaldo(porcentajeDefault);

      setEstado('Pendiente de Saldo');
      setLabelFactura(`Saldo del Proyecto (${porcentajeDefault}%)`);

      // Ocultar anticipo/saldo del formulario
      setAnticipoPorcentaje(0);
      setSaldoPorcentaje(100);

      const fechaHoy = new Date().toISOString().split('T')[0];
      const fechaVen = new Date();
      fechaVen.setDate(fechaVen.getDate() + 30);
      setFechaEmision(fechaHoy);
      setFechaVencimiento(fechaVen.toISOString().split('T')[0]);
      setNotas(`Factura de saldo (${porcentajeDefault}%) - Proyecto: ${proyecto.nombreProyecto}`);
      setNotasLegales('Terminos: Pago a 30 dias. IVA incluido.');
    
    } else if (facturaExistente?.esFacturaAdicional === true && facturaExistente?.idCotizacionAdicional) {
    const idCotizacion = facturaExistente.idCotizacionAdicional;
    const cotizacionEnProyecto = proyecto.cotizacionesAdicionales?.find(
        c => c.idCotizacion === idCotizacion
    );
  
    const cotizacionAdicional = proyecto._cotizacionAdicionalSeleccionada || cotizacionEnProyecto;
    
    if (cotizacionAdicional) {
        procesarCotizacionAdicional(cotizacionAdicional);

        const totalFacturado = cotizacionAdicional.facturasGeneradas?.reduce((acc, f) => acc + (f.valor || 0), 0) || 0;
        const porcentajeSugerido = Math.max(0, Math.min(100, 100 - Math.round((totalFacturado / cotizacionAdicional.total) * 100)));

        setPorcentajeManual(porcentajeSugerido);
        setEstado('Pendiente de Saldo');

        recalcularItemsConPorcentaje(porcentajeSugerido, cotizacionAdicional.items || []);
      }

      const fechaHoy = new Date().toISOString().split('T')[0];
      const fechaVen = new Date();
      fechaVen.setDate(fechaVen.getDate() + 30);

      setFechaEmision(fechaHoy);
      setFechaVencimiento(fechaVen.toISOString().split('T')[0]);
      setNotas(`Siguiente factura de cotizacion adicional: ${idCotizacion || ''}`);
      setNotasLegales('Terminos: Pago a 30 dias. IVA incluido.');
      setMetodoPago(facturaExistente?.metodoPago || 'Transferencia Bancaria');

    } else if (esEdicion && typeof facturaExistente === 'object') {
      const f = facturaExistente;
      setItems(f.items?.map((item, idx) => ({ id: item.id || Date.now() + idx, ...item })) || []);
      setMetodoPago(f.metodoPago || 'Transferencia Bancaria');
      setNotas(f.notas || '');
      setNotasLegales(f.notasLegales || '');
      setNotasAdicionales(f.notasAdicionales || '');
      setFechaEmision(f.fechaEmision ? new Date(f.fechaEmision).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setFechaVencimiento(f.fechaVencimiento ? new Date(f.fechaVencimiento).toISOString().split('T')[0] : '');
      setEstado(f.estado || 'Pendiente de Anticipo');
      setAnticipoPorcentaje(f.anticipoPorcentaje || 40);
      setSaldoPorcentaje(f.saldoPorcentaje || 60);
      setIvaPorcentaje(f.ivaPorcentaje || 19);
      setRetencionPorcentaje(f.retencionPorcentaje || 2);

    } else {
      // NUEVA FACTURA NORMAL - Verificar si hay hitos disponibles
      const fechaHoy = new Date().toISOString().split('T')[0];
      const fechaVen = new Date();
      fechaVen.setDate(fechaVen.getDate() + 30);

      const proyectoItems = (proyecto.items || []).map((item, idx) => ({
        id: Date.now() + idx,
        idServicio: item.idServicio || '',
        nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
        descripcion: item.descripcion || '',
        cantidad: item.cantidad || 1,
        precioUnitario: item.precioUnitario || 0,
        unidad: item.unidad || 'und',
        subtotal: item.subtotal || 0
      }));

      setItems(proyectoItems);
      setFechaEmision(fechaHoy);
      setFechaVencimiento(fechaVen.toISOString().split('T')[0]);
      setNotas(`Factura para proyecto: ${proyecto.nombreProyecto}`);
      setNotasLegales('Terminos: Pago a 30 dias. IVA incluido.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyecto, facturaExistente, clientes]);

    // Recalcular % e items cuando cambian los hitos seleccionados (solo en modo saldo)
  useEffect(() => {
    if (!esSaldoProyecto) return;
    
    const nuevoPorcentaje = hitosPendientesSaldo
      .filter(h => hitosSeleccionadosSaldo.includes(h.idHito))
      .reduce((sum, h) => sum + (h.porcentajePago || 0), 0);
    
    setPorcentajeManual(nuevoPorcentaje);
    setLabelFactura(`Saldo del Proyecto (${nuevoPorcentaje}%)`);
    
    // Recalcular items con CANTIDAD proporcional
    const itemsSaldo = (proyecto.items || []).map((item, idx) => {
      const cantidadOriginal = Number(item.cantidad) || 1;
      const precioOriginal = Number(item.precioUnitario) || 0;
      const cantidadSaldo = Math.round(cantidadOriginal * nuevoPorcentaje / 100);
      return {
        id: Date.now() + idx,
        idServicio: item.idServicio || '',
        nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
        descripcion: `Saldo (${nuevoPorcentaje}%) - ${item.descripcion || ''}`,
        cantidad: cantidadSaldo,
        precioUnitario: precioOriginal,
        unidad: item.unidad || 'und',
        subtotal: cantidadSaldo * precioOriginal
      };
    });
    setItems(itemsSaldo);
    setNotas(`Factura de saldo (${nuevoPorcentaje}%) - Proyecto: ${proyecto.nombreProyecto}`);
    
  }, [hitosSeleccionadosSaldo, esSaldoProyecto, proyecto]);

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
    setItems(items.filter((_, i) => i !== index));
  };

  // ========== CALCULOS ==========
  const calcularTotales = () => {
    const subtotal = items.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
    const iva = (subtotal * (ivaPorcentaje || 19)) / 100;
    const retencion = (subtotal * (retencionPorcentaje || 2)) / 100;
    const totalConIva = subtotal + iva;
    const netoACobrar = totalConIva - retencion;
    const anticipoRequerido = (subtotal * (anticipoPorcentaje || 40)) / 100;
    const saldoRestante = totalConIva - anticipoRequerido;

    return {
      subtotal,
      iva,
      retencion,
      totalConIva,
      netoACobrar,
      anticipoRequerido,
      saldoRestante
    };
  };

  const { subtotal, iva, retencion, totalConIva, netoACobrar, anticipoRequerido, saldoRestante } = calcularTotales();

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

    setGuardando(true);
    try {
      // MODO HITO - Generar factura desde hito
      if (modoHito && hitoSeleccionado) {
        const url = `${API_URL}/proyectos/${proyecto.idProyecto}/facturas/hito/${hitoSeleccionado.idHito}`;
        const payload = {
          metodoPago,
          notas: notas || `Factura de ${hitoSeleccionado.nombre}`
        };

        const res = await axios.post(url, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        alert(`Factura ${res.data?.data?.factura?.idFactura || ''} generada para ${hitoSeleccionado.nombre}`);
      }
      // SALDO PROYECTO BASE
      else if (esSaldoProyecto) {
              // VALIDACIÓN: debe haber hitos seleccionados
      if (hitosSeleccionadosSaldo.length === 0) {
        alert("Debes seleccionar al menos un hito para generar la factura de saldo.");
        setGuardando(false);
        return;
      }
        const url = `${API_URL}/proyectos/${proyecto.idProyecto}/facturas/saldo`;
        const payload = {
          metodoPago,
          items: items.map(({ id, ...rest }) => rest),
          subtotal,
          notas,
          notasLegales,
          notasAdicionales,
          fechaEmision,
          fechaVencimiento,
          porcentajeSaldo: porcentajeManual,
          hitosCubiertos: hitosSeleccionadosSaldo
        };

        const res = await axios.post(url, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        alert(`Factura de saldo ${res.data?.data?.idFactura || ''} creada exitosamente`);
      }
      // COTIZACIÓN ADICIONAL
      else if (cotizacionAdicionalData && facturaExistente?.idCotizacionAdicional) {
        const idCotizacion = facturaExistente.idCotizacionAdicional;
        const url = `${API_URL}/proyectos/${proyecto.idProyecto}/cotizaciones-adicionales/${idCotizacion}/siguiente-factura`;

        const payload = {
          metodoPago: metodoPago || 'Transferencia Bancaria',
          porcentaje: porcentajeManual,
          items: items.map(({ id, ...rest }) => rest)
        };

        const res = await axios.post(url, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        alert(`Factura ${res.data?.data?.idFactura || ''} generada exitosamente\\n${res.data?.message || ''}`);
      }
      // EDICIÓN
      else if (esEdicion && facturaExistente?.idFactura) {
        const url = `${API_URL}/facturas/${facturaExistente.idFactura}`;
        const payload = {
          metodoPago,
          items: items.map(({ id, ...rest }) => rest),
          subtotal,
          notas,
          notasLegales,
          notasAdicionales,
          fechaEmision,
          fechaVencimiento,
          idCotizacion: proyecto.idCotizacion
        };
        await axios.put(url, payload);
        alert(`Factura ${facturaExistente.idFactura} actualizada exitosamente`);
      }
      // NUEVA FACTURA NORMAL
      else {
        const url = `${API_URL}/proyectos/${proyecto.idProyecto}/facturas`;
        const payload = {
          metodoPago,
          items: items.map(({ id, ...rest }) => rest),
          subtotal,
          notas,
          notasLegales,
          notasAdicionales,
          fechaEmision,
          fechaVencimiento,
          idCotizacion: proyecto.idCotizacion
        };
        const res = await axios.post(url, payload);
        alert(`Factura ${res.data?.data?.idFactura || ''} creada exitosamente`);
      }

      onSuccess?.();
      onClose();
    } catch (e) {
      console.error("Error:", e);
      const mensaje = e.response?.data?.message || e.response?.data?.error || e.message;
      alert(`Error: ${typeof mensaje === 'object' ? JSON.stringify(mensaje) : mensaje}`);
    } finally {
      setGuardando(false);
    }
  };

  // ========== GENERAR PDF ==========
  const descargarPDF = async () => {
    if (items.length === 0) {
      alert("Debe agregar al menos un servicio");
      return;
    }
    setGenerandoPDF(true);
    try {
      const datosFactura = {
        idFactura: facturaExistente?.idFactura || 'PREVIEW',
        fechaEmision,
        fechaVencimiento,
        datosEmisor: {
          razonSocial: 'Neoconstrucciones Integrales SAS',
          nit: '901.421.096-1',
          direccion: 'Calle 11c #80B 70',
          celular: '3017223223',
          correoElectronico: 'neoconstruccionesintegrales@gmail.com'
        },
        nombreEmpresa: infoCliente?.nombreEmp || proyecto.nombreEmp,
        nitCliente: infoCliente?.nit || '',
        nombreSede: infoCliente?.sede || proyecto.nombreSede,
        direccionSede: infoCliente?.direccion || proyecto.direccionSede,
        contactoCliente: infoCliente?.contacto || '',
        correoCliente: infoCliente?.correo || '',
        nombreProyecto: proyecto.nombreProyecto,
        idProyecto: proyecto.idProyecto,
        metodoPago,
        items,
        subtotal,
        iva,
        retencion,
        totalConIva,
        netoACobrar,
        anticipoRequerido,
        anticipoPorcentaje,
        saldoRestante,
        saldoPorcentaje,
        ivaPorcentaje,
        retencionPorcentaje,
        notas,
        notasLegales,
        notasAdicionales,
        estado
      };

      await generarPDFFactura(datosFactura);
    } catch (e) {
      alert('Error generando PDF: ' + e.message);
    } finally {
      setGenerandoPDF(false);
    }
  };

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
        width: '95%', maxWidth: '1100px', maxHeight: '95vh',
        overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }}>
        {/* HEADER */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '20px', borderBottom: '2px solid #fd7e14', paddingBottom: '10px'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#333' }}>
              {modoHito && hitoSeleccionado
                ? `Factura de Hito: ${hitoSeleccionado.nombre} (${hitoSeleccionado.porcentajePago}%)`
                : (esSaldoProyecto
                  ? 'Factura de Saldo - Proyecto'
                  : (cotizacionAdicionalData 
                    ? `${labelFactura} - ${facturaExistente?.idCotizacionAdicional || ''} (${porcentajeManual}%)`
                    : (esEdicion 
                      ? `Editar Factura ${facturaExistente?.idFactura}`
                      : 'Nueva Factura')
                  )
                )
              }
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#fd7e14', fontSize: '0.9em' }}>
              Proyecto: <strong>{proyecto.nombreProyecto}</strong> | ID: {proyecto.idProyecto}
              {proyecto.tipoPago && (
                <span style={{ marginLeft: '10px', background: '#e8f6f3', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85em' }}>
                  Tipo: {proyecto.tipoPago === 'unico' ? 'Pago Único' : 
                         proyecto.tipoPago === 'anticipo_final' ? 'Anticipo + Final' :
                         proyecto.tipoPago === 'por_etapas' ? 'Por Etapas' : 'Personalizado'}
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={descargarPDF} disabled={generandoPDF}
              style={{ padding: '8px 16px', background: generandoPDF ? '#6c757d' : '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em' }}>
              {generandoPDF ? 'Generando...' : 'Descargar PDF'}
            </button>
            <button onClick={onClose}
              style={{ fontSize: '1.5em', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 10px' }}>
              x
            </button>
          </div>
        </div>

        {/* SELECTOR DE HITOS - solo si hay hitos disponibles y no es modo especial */}
        {!modoHito && !esSaldoProyecto && !cotizacionAdicionalData && !esEdicion && hitosDisponibles.length > 0 && (
          <div style={{ marginBottom: '15px', padding: '15px', background: '#e8f6f3', borderRadius: '8px', border: '1px solid #1abc9c' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#16a085', display: 'block', marginBottom: '8px' }}>
              Generar factura desde Hito:
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {hitosDisponibles.map(hito => (
                <button
                  key={hito.idHito}
                  onClick={() => {
                    setHitoSeleccionado(hito);
                    setModoHito(true);
                    setPorcentajeManual(hito.porcentajePago);
                    setEstado(hito.numeroHito === 1 ? 'Pendiente de Anticipo' : 'Pendiente de Saldo');
                    setLabelFactura(`${hito.nombre} (${hito.porcentajePago}%)`);
                    
                    const itemsHito = (proyecto.items || []).map((item, idx) => ({
                      id: Date.now() + idx,
                      idServicio: item.idServicio || '',
                      nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
                      descripcion: item.descripcion || '',
                      cantidad: item.cantidad || 1,
                      precioUnitario: Math.round((item.precioUnitario || 0) * hito.porcentajePago / 100),
                      unidad: item.unidad || 'und',
                      subtotal: Math.round((item.subtotal || 0) * hito.porcentajePago / 100)
                    }));
                    setItems(itemsHito);
                    setNotas(`Factura de ${hito.nombre} - Proyecto: ${proyecto.nombreProyecto}`);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: hitoSeleccionado?.idHito === hito.idHito ? '#fd7e14' : '#1abc9c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85em'
                  }}
                >
                  {hito.nombre} ({hito.porcentajePago}%)
                </button>
              ))}
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', color: '#6c757d' }}>
              Seleccione un hito para generar la factura correspondiente. Los hitos deben completarse en orden.
            </p>
          </div>
        )}

        {/* INFO MODO HITO */}
        {modoHito && hitoSeleccionado && (
          <div style={{ marginBottom: '15px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
            <p style={{ margin: 0, fontSize: '0.9em', color: '#856404' }}>
              <strong>Generando factura para:</strong> {hitoSeleccionado.nombre}<br/>
              <strong>Porcentaje:</strong> {hitoSeleccionado.porcentajePago}% | 
              <strong>Monto estimado:</strong> ${hitoSeleccionado.montoEstimado?.toLocaleString()}<br/>
              <strong>Descripción:</strong> {hitoSeleccionado.descripcion}
            </p>
            {hitoSeleccionado.numeroHito > 1 && (
              <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', color: '#856404' }}>
                ⚠️ Este hito requiere que el hito anterior esté completado y pagado.
              </p>
            )}
          </div>
        )}

        {/* SELECTOR DE PORCENTAJE - solo para cotizaciones adicionales */}
        {cotizacionAdicionalData && !esSaldoProyecto && !modoHito && (
          <div style={{ marginBottom: '15px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.9em' }}>
                Porcentaje a facturar del total:
              </label>
              <select 
                value={porcentajeManual} 
                onChange={(e) => {
                  const nuevoPorcentaje = Number(e.target.value);
                  setPorcentajeManual(nuevoPorcentaje);
                  recalcularItemsConPorcentaje(nuevoPorcentaje, cotizacionAdicionalData.items || []);
                }}
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '0.9em' }}
              >
                <option value={10}>10%</option>
                <option value={20}>20%</option>
                <option value={30}>30%</option>
                <option value={40}>40%</option>
                <option value={50}>50%</option>
                <option value={60}>60%</option>
                <option value={70}>70%</option>
                <option value={80}>80%</option>
                <option value={90}>90%</option>
                <option value={100}>100%</option>
              </select>
              <span style={{ fontSize: '0.85em', color: '#856404' }}>
                Total cotizacion: <strong>${cotizacionAdicionalData?.total?.toLocaleString() || 'N/A'}</strong>
              </span>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', color: '#856404' }}>
              Valor de esta factura: <strong>${subtotal.toLocaleString()}</strong> | 
              Pendiente por facturar: <strong>${(cotizacionAdicionalData?.total - (cotizacionAdicionalData?.total * porcentajeManual / 100))?.toLocaleString() || 'N/A'}</strong>
            </p>
          </div>
        )}

                    {/* INFO SALDO PROYECTO - HITOS MANDAN */}
        {esSaldoProyecto && (
          <div style={{ marginBottom: '15px', padding: '15px', background: '#d4edda', borderRadius: '8px', border: '1px solid #28a745' }}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#155724', display: 'block', marginBottom: '8px' }}>
                Selecciona los hitos que cubre esta factura de saldo:
              </label>
              <span style={{ fontSize: '0.85em', color: '#155724' }}>
                Saldo disponible: <strong>${(() => {
                  const facturasBase = proyecto.facturas?.filter(
                    f => !f.esFacturaAdicional && !f.idCotizacionAdicional &&
                         (f.estado === 'Pagada' || f.estado === 'Anticipo ya Pagado')
                  ) || [];
                  const totalFacturado = facturasBase.reduce((sum, f) => sum + (f.valor || 0), 0);
                  return (proyecto.presupuestoTotal - totalFacturado).toLocaleString();
                })()}</strong>
              </span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.85em', color: '#155724' }}>
              <strong>Porcentaje a facturar: {porcentajeManual}%</strong> | 
              Items recalculados proporcionalmente.
            </p>
          </div>
        )}

              {/* SELECTOR DE HITOS A CUBRIR - HITOS MANDAN EL % */}
        {esSaldoProyecto && hitosPendientesSaldo.length > 0 && (
          <div style={{ 
            marginBottom: '15px', padding: '15px', 
            background: '#fff3cd', borderRadius: '8px', 
            border: '1px solid #ffc107' 
          }}>
            <label style={{ 
              fontWeight: 'bold', fontSize: '0.9em', 
              color: '#856404', display: 'block', marginBottom: '10px' 
            }}>
              ⚠️ Selecciona los hitos que cubre esta factura de saldo:
            </label>
            
            {hitosPendientesSaldo.map(h => (
              <div key={h.idHito} style={{ 
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '6px', fontSize: '0.9em' 
              }}>
                <input
                  type="checkbox"
                  id={`hito-saldo-${h.idHito}`}
                  checked={hitosSeleccionadosSaldo.includes(h.idHito)}
                  onChange={() => toggleHitoSaldo(h.idHito)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor={`hito-saldo-${h.idHito}`} style={{ cursor: 'pointer', flex: 1 }}>
                  <strong>{h.nombre}</strong> ({h.porcentajePago}%) — ${h.montoEstimado?.toLocaleString()}
                </label>
              </div>
            ))}
            
            <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', color: '#856404' }}>
              Total hitos seleccionados: {' '}
              <strong>
                ${hitosPendientesSaldo
                  .filter(h => hitosSeleccionadosSaldo.includes(h.idHito))
                  .reduce((sum, h) => sum + (h.montoEstimado || 0), 0)
                  .toLocaleString()}
              </strong>
              {' '}({hitosPendientesSaldo
                .filter(h => hitosSeleccionadosSaldo.includes(h.idHito))
                .reduce((sum, h) => sum + (h.porcentajePago || 0), 0)}%)
            </p>
            
            {hitosSeleccionadosSaldo.length === 0 && (
              <p style={{ color: '#dc3545', fontSize: '0.85em', marginTop: '5px' }}>
                Debes seleccionar al menos un hito para generar la factura de saldo.
              </p>
            )}
          </div>
        )}
        
        {/* DATOS EMISOR */}
        <div style={{
          background: '#fff3cd', padding: '12px', borderRadius: '8px',
          marginBottom: '15px', border: '1px solid #ffc107', fontSize: '0.85em'
        }}>
          <strong>Emisor:</strong> Neoconstrucciones Integrales SAS | NIT: 901.421.096-1 |
          Direccion: Calle 11c #80B 70 | Cel: 3017223223 |
          neoconstruccionesintegrales@gmail.com
        </div>

        {/* DATOS CLIENTE Y PROYECTO */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px', marginBottom: '20px', padding: '15px',
          background: '#e8f6f3', borderRadius: '8px', border: '1px solid #1abc9c'
        }}>
          <div>
            <label style={{ fontWeight: 'bold', fontSize: '0.85em', color: '#16a085' }}>Cliente:</label>
            <div style={{ padding: '8px', background: 'white', borderRadius: '6px', border: '1px solid #ced4da' }}>
              {infoCliente?.nombreEmp || proyecto.nombreEmp || 'N/A'}
            </div>
          </div>
          <div>
            <label style={{ fontWeight: 'bold', fontSize: '0.85em', color: '#16a085' }}>NIT Cliente:</label>
            <div style={{ padding: '8px', background: 'white', borderRadius: '6px', border: '1px solid #ced4da' }}>
              {infoCliente?.nit || 'N/A'}
            </div>
          </div>
          <div>
            <label style={{ fontWeight: 'bold', fontSize: '0.85em', color: '#16a085' }}>Sede:</label>
            <div style={{ padding: '8px', background: 'white', borderRadius: '6px', border: '1px solid #ced4da' }}>
              {infoCliente?.sede || proyecto.nombreSede}
            </div>
          </div>
          <div>
            <label style={{ fontWeight: 'bold', fontSize: '0.85em', color: '#16a085' }}>Contacto:</label>
            <div style={{ padding: '8px', background: 'white', borderRadius: '6px', border: '1px solid #ced4da' }}>
              {infoCliente?.contacto || 'N/A'}
            </div>
          </div>
        </div>

        {/* CONFIGURACION */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '15px', marginBottom: '20px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85em' }}>Metodo de Pago:</label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}>
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85em' }}>Fecha Emision:</label>
            <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85em' }}>Fecha Vencimiento:</label>
            <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }} />
          </div>
          {esEdicion && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85em' }}>Estado:</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}>
                {ESTADOS_FACTURA.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          )}
        </div>

         {/* PORCENTAJES - solo en edición o si no es modo hito ni saldo */}
        {!modoHito && !esSaldoProyecto && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px', marginBottom: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '6px'
          }}>
            <div>
              <label style={{ fontSize: '0.8em', fontWeight: 'bold' }}>% Anticipo:</label>
              <input type="number" min="0" max="100" value={anticipoPorcentaje}
                onChange={(e) => setAnticipoPorcentaje(Number(e.target.value))}
                style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ced4da' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8em', fontWeight: 'bold' }}>% Saldo:</label>
              <input type="number" min="0" max="100" value={saldoPorcentaje}
                onChange={(e) => setSaldoPorcentaje(Number(e.target.value))}
                style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ced4da' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8em', fontWeight: 'bold' }}>% IVA:</label>
              <input type="number" min="0" max="100" value={ivaPorcentaje}
                onChange={(e) => setIvaPorcentaje(Number(e.target.value))}
                style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ced4da' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8em', fontWeight: 'bold' }}>% Retencion:</label>
              <input type="number" min="0" max="100" value={retencionPorcentaje}
                onChange={(e) => setRetencionPorcentaje(Number(e.target.value))}
                style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ced4da' }} />
            </div>
          </div>
        )}

                {/* CATALOGO DE SERVICIOS - ocultar en modo saldo */}
        {!esSaldoProyecto && (
          <>
            <h3 style={{ color: '#333', borderBottom: '1px solid #dee2e6', paddingBottom: '8px' }}>Catalogo de Servicios:</h3>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '8px',
              marginBottom: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '6px'
            }}>
          {serviciosDisponibles.map(s => (
            <button key={s.idServicio} onClick={() => agregarDesdeCatalogo(s)}
              style={{
                padding: '8px 12px', background: '#fd7e14', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85em'
              }}>
              + {s.nombre}
            </button>
          ))}
          <button onClick={agregarFilaManual}
            style={{
              padding: '8px 12px', background: '#6c757d', color: 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85em'
            }}>
            + Servicio Manual
          </button>
        </div>
         </>
        )}

        {/* TABLA ITEMS */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: '#fd7e14', color: 'white' }}>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>Servicio</th>
              <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #dee2e6' }}>Precio Unit.</th>
              <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>Cant</th>
              <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>Und</th>
              <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #dee2e6' }}>Subtotal</th>
              <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>Acc.</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '8px' }}>
                  <input value={item.nombreServicio} placeholder="Nombre servicio"
                    onChange={(e) => modificarItem(index, 'nombreServicio', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }} />
                </td>
                <td style={{ padding: '8px' }}>
                  <input type="number" value={item.precioUnitario}
                    onChange={(e) => modificarItem(index, 'precioUnitario', Number(e.target.value))}
                    style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', textAlign: 'right' }} />
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <input type="number" value={item.cantidad}
                    onChange={(e) => modificarItem(index, 'cantidad', Number(e.target.value))}
                    style={{ width: '60px', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', textAlign: 'center' }} />
                </td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#6c757d' }}>{item.unidad}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>${item.subtotal.toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <button onClick={() => eliminarItem(index)}
                    style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    X
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* NOTAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85em' }}>Notas:</label>
            <textarea rows="3" value={notas} onChange={(e) => setNotas(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85em' }}>Notas Legales:</label>
            <textarea rows="3" value={notasLegales} onChange={(e) => setNotasLegales(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85em' }}>Notas Adicionales:</label>
            <textarea rows="2" value={notasAdicionales} onChange={(e) => setNotasAdicionales(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }} />
          </div>
        </div>

        {/* TOTALES */}
        <div style={{
          background: '#e8f6f3', padding: '20px', borderRadius: '8px',
          border: '1px solid #1abc9c', marginBottom: '20px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            <div><strong>Subtotal:</strong> ${subtotal.toLocaleString()}</div>
            <div><strong>IVA ({ivaPorcentaje}%):</strong> ${iva.toLocaleString()}</div>
            <div><strong>Retencion ({retencionPorcentaje}%):</strong> ${retencion.toLocaleString()}</div>
            <div><strong>Total FACTURA:</strong> ${totalConIva.toLocaleString()}</div>
            <div style={{ gridColumn: '1 / -1', color: '#856404', fontSize: '0.9em', marginTop: '8px', padding: '8px', background: '#fff3cd', borderRadius: '4px' }}>
              <strong>NOTA:</strong> Esta factura esta sujeta a retencion en la fuente del {retencionPorcentaje}% 
              equivalente a <strong>${retencion.toLocaleString()}</strong>
            </div>
            <div style={{ gridColumn: '1 / -1', fontSize: '1.1em', color: '#16a085', marginTop: '5px' }}>
              <strong>VALOR NETO A PAGAR (informativo):</strong> ${netoACobrar.toLocaleString()}
            </div>
            {anticipoPorcentaje > 0 && !modoHito && (
              <div><strong>Anticipo ({anticipoPorcentaje}%):</strong> ${anticipoRequerido.toLocaleString()}</div>
            )}
            {saldoPorcentaje > 0 && anticipoPorcentaje < 100 && !modoHito && (
              <div><strong>Saldo:</strong> ${saldoRestante.toLocaleString()}</div>
            )}
          </div>
        </div>

        {/* BOTONES */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Cancelar
          </button>

          <button onClick={descargarPDF} disabled={generandoPDF}
            style={{
              padding: '10px 20px', background: generandoPDF ? '#6c757d' : '#dc3545',
              color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
            }}>
            {generandoPDF ? 'Generando...' : 'Vista Previa PDF'}
          </button>
          <button onClick={guardar} disabled={guardando}
            style={{
              padding: '10px 20px', background: guardando ? '#6c757d' : '#fd7e14',
              color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontWeight: 'bold'
            }}>
            {guardando ? 'Guardando...' : (
              modoHito ? `Generar Factura de ${hitoSeleccionado?.nombre || 'Hito'}` :
              esSaldoProyecto ? 'Generar Factura de Saldo' : 
              cotizacionAdicionalData ? 'Generar Siguiente Factura' : 
              esEdicion ? 'Actualizar Factura' : 'Guardar Factura'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
