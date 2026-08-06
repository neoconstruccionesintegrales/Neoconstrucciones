import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Genera un PDF de Cotización (Homogéneo al diseño de Factura)
 * @param {Object} cotizacion - Datos completos de la cotización
 * @param {Object} datosCliente - Datos del cliente (nombre, nit, direccion, etc.)
 * @param {Array} items - Lista de servicios [{nombreServicio, precioUnitario, cantidad, subtotal}]
 * @param {string} logoBase64 - Logo en base64 (opcional)
 */
export async function generarPDFCotizacion(cotizacion, datosCliente, items, logoBase64 = null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Colores Corporativos (Mismos que la factura)
  const colorPrimario = [19, 145, 200];   // Azul claro (#1391c8)
  const colorSecundario = [0, 119, 177];  // Azul oscuro (#0077b1)
  const colorTextoGris = [71, 85, 105];   // Gris oscuro

  // ========== ENCABEZADO AZUL ==========
  doc.setFillColor(...colorPrimario);
  doc.rect(0, 0, pageWidth, 48, 'F');

  // ✅ LOGO: Se pinta igual que en la factura
  if (logoBase64) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin - 2, 14, 44, 20, 3, 3, 'F'); // Fondo blanco redondeado atrás del logo
      doc.addImage(logoBase64, 'PNG', margin, 16, 40, 16);
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }
  }

  // TÍTULO CENTRO
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('COTIZACIÓN', pageWidth / 2, 28, { align: 'center' });

  // INFO COTIZACIÓN DERECHA
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`No. ${cotizacion.idCotizacion || 'PREVIEW'}`, pageWidth - margin, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Emisión: ${cotizacion.fechaEmision ? new Date(cotizacion.fechaEmision).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO')}`,
    pageWidth - margin, 30, { align: 'right' }
  );
  doc.text(
    `Vencimiento: ${cotizacion.fechaVencimiento ? new Date(cotizacion.fechaVencimiento).toLocaleDateString('es-CO') : 'N/A'}`,
    pageWidth - margin, 38, { align: 'right' }
  );
  
  // ========== DATOS CLIENTE ==========
  doc.setTextColor(...colorTextoGris);
  doc.setFontSize(10);

  // Datos del Cliente
  doc.setTextColor(...colorSecundario);
  doc.setFont('helvetica', 'bold');
  doc.text('COTIZAR A', margin, 62);

  doc.setTextColor(...colorTextoGris);
  doc.setFont('helvetica', 'normal');
  doc.text(datosCliente.nombreEmp || 'N/A', margin, 68);
  doc.text(`NIT: ${datosCliente.nit || 'N/A'}`, margin, 73);
  doc.text(`Sede: ${datosCliente.nombreSede || 'N/A'}`, margin, 78);
  doc.text(`Dirección: ${datosCliente.direccion || 'N/A'}`, margin, 83);
  doc.text(`Celular: ${datosCliente.contacto || 'N/A'}`, margin, 88);
  doc.text(`Correo Electrónico: ${datosCliente.correo || 'N/A'}`, margin, 93);

  // Línea separadora
  doc.setDrawColor(...colorPrimario);
  doc.setLineWidth(0.5);
  doc.line(margin, 98, pageWidth - margin, 98);

  // ========== INFO PROYECTO / ESTADO ==========
  doc.setTextColor(...colorSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ESTADO DE LA COTIZACIÓN:', margin, 103);

  doc.setTextColor(...colorTextoGris);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cotizacion.estado_general || 'Pendiente'}`, margin + 55, 103);
  doc.text(`Método de Pago sugerido: ${cotizacion.metodoPago || 'Transferencia Bancaria'}`, margin, 108);

  // ========== TABLA DE ITEMS ==========
  const itemsData = (items || []).map(item => {
    return [
      item.nombreServicio || 'Servicio',
      item.descripcion || item.nombreServicio || '-',
      item.cantidad || 1,
      item.unidad || 'und',
      `$${Number(item.precioUnitario || 0).toLocaleString('es-CO')}`,
      `$${Number(item.subtotal || 0).toLocaleString('es-CO')}`
    ];
  });

  if (itemsData.length === 0) {
    itemsData.push(['No hay servicios cotizados', '', '', '', '$0', '$0']);
  }

  autoTable(doc, {
    startY: 113,
    head: [['Servicio', 'Descripción', 'Cant.', 'Und.', 'P. Unit.', 'Subtotal']],
    body: itemsData,
    theme: 'grid',
    headStyles: {
      fillColor: colorPrimario,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: colorTextoGris
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  // ========== TOTALES (Estilo Factura) ==========
  const finalY = doc.lastAutoTable?.finalY + 10 || 160;

  const totalesX = pageWidth - margin - 100;
  const boxAltura = 48;
  doc.setFillColor(248, 249, 250);
  doc.rect(totalesX, finalY, 100, boxAltura, 'F');
  doc.setDrawColor(...colorPrimario);
  doc.setLineWidth(0.5);
  doc.rect(totalesX, finalY, 100, boxAltura);

  doc.setFontSize(9);
  doc.setTextColor(...colorTextoGris);

  // Cálculos de cotización (Puedes pasarlos como parámetros si ya los tienes calculados en el componente)
  const subtotalGeneral = items.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
  const iva = subtotalGeneral * 0.19;
  const totalGeneral = subtotalGeneral + iva;
  const anticipo = totalGeneral * 0.40;

  const totales = [
    ['Subtotal:', `$${Number(subtotalGeneral).toLocaleString('es-CO')}`],
    [`IVA (19%):`, `$${Number(iva).toLocaleString('es-CO')}`],
    [`Anticipo Requerido (40%):`, `$${Number(anticipo).toLocaleString('es-CO')}`],
  ];

  let yPos = finalY + 10;
  totales.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, totalesX + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(value, totalesX + 95, yPos, { align: 'right' });
    yPos += 8;
  });

  // TOTAL DESTACADO
  const netoY = finalY + boxAltura - 14;
  doc.setFillColor(...colorSecundario);
  doc.rect(totalesX, netoY, 100, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL COTIZADO:', totalesX + 5, netoY + 9);
  doc.text(`$${Number(totalGeneral).toLocaleString('es-CO')}`, totalesX + 95, netoY + 9, { align: 'right' });

  // ========== ✅ NOTAS LEGALES (Igual que en la factura) ==========
  const notasY = finalY + boxAltura + 10; // Posición dinámica justo debajo del bloque de totales

  // Solo renderizamos el recuadro si hay notas legales
  if (cotizacion.notasLegales && cotizacion.notasLegales.trim() !== '') {
    // Calculamos el ancho del recuadro (desde el margen hasta el inicio del bloque de totales)
    const anchoNotas = totalesX - margin - 10;
    
    // Dibujamos el recuadro blanco con borde azul
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...colorPrimario);
    doc.setLineWidth(0.8);
    doc.rect(margin, notasY, anchoNotas, 20, 'FD'); // Altura fija de 20, o puedes hacerla dinámica si el texto es muy largo

    doc.setTextColor(...colorTextoGris);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('NOTAS LEGALES:', margin + 3, notasY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    // Dividimos el texto en múltiples líneas si es necesario
    const notasSplit = doc.splitTextToSize(cotizacion.notasLegales, anchoNotas - 6);
    doc.text(notasSplit, margin + 3, notasY + 11);
  }

  // ========== PIE DE PÁGINA ==========
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...colorPrimario);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Neoconstrucciones Integrales SAS - NIT: 901.421.096-1', pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.text('Calle 11c No.80B-70 - Celular: 3017223223 - Correo electrónico: neoconstruccionesintegrales@gmail.com', pageWidth / 2, pageHeight - 6, { align: 'center' });

  // Guardar
  doc.save(`Cotizacion-${cotizacion.idCotizacion || 'preview'}.pdf`);
}