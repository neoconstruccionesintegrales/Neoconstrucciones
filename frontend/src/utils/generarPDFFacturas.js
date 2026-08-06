import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Genera un PDF de factura
 * @param {Object} factura - Datos completos de la factura
 * @param {string} logoBase64 - Logo en base64 (opcional)
 */
export async function generarPDFFactura(factura, logoBase64 = null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Colores Corporativos
  const colorPrimario = [19, 145, 200];   // Azul claro (#1391c8)
  const colorSecundario = [0, 119, 177];  // Azul oscuro (#0077b1)
  const colorTextoGris = [71, 85, 105];   // Gris oscuro

    // ========== ENCABEZADO AZUL ==========
  doc.setFillColor(...colorPrimario);
  doc.rect(0, 0, pageWidth, 48, 'F');

  // Logo con fondo blanco redondeado (IZQUIERDA - centrado vertical)
  if (logoBase64) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin - 2, 14, 44, 20, 3, 3, 'F');
      doc.addImage(logoBase64, 'PNG', margin, 16, 40, 16);
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e);
    }
  }

  // TÍTULO CENTRO (centrado vertical en la barra azul)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', pageWidth / 2, 28, { align: 'center' });

  // INFO FACTURA DERECHA (alineada verticalmente con el logo)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`No. ${factura.idFactura || 'PREVIEW'}`, pageWidth - margin, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Emision: ${factura.fechaEmision ? new Date(factura.fechaEmision).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO')}`,
    pageWidth - margin, 30, { align: 'right' }
  );
  doc.text(
    `Vencimiento: ${factura.fechaVencimiento ? new Date(factura.fechaVencimiento).toLocaleDateString('es-CO') : 'N/A'}`,
    pageWidth - margin, 38, { align: 'right' }
  );
  
  // ========== DATOS CLIENTE ==========
  doc.setTextColor(...colorTextoGris);
  doc.setFontSize(10);

  const nombreEmpresaFinal = factura.nombreEmpresa || 'N/A';
  const nitClienteFinal = factura.nitCliente || 'N/A';
  const nombreSedeFinal = factura.nombreSede || 'N/A';
  const direccionSedeFinal = factura.direccionSede || 'N/A';
  const contactoClienteFinal = factura.contactoCliente || 'N/A';
  const correoClienteFinal = factura.correoCliente || 'N/A';

  doc.setTextColor(...colorSecundario);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURAR A', margin, 62);

  doc.setTextColor(...colorTextoGris);
  doc.setFont('helvetica', 'normal');
  doc.text(nombreEmpresaFinal, margin, 68);
  doc.text(`NIT: ${nitClienteFinal}`, margin, 73);
  doc.text(`Sede: ${nombreSedeFinal}`, margin, 78);
  doc.text(`Direccion: ${direccionSedeFinal}`, margin, 83);
  doc.text(`Celular: ${contactoClienteFinal}`, margin, 88);
  doc.text(`Correo Electronico: ${correoClienteFinal}`, margin, 93);

  // Linea separadora
  doc.setDrawColor(...colorPrimario);
  doc.setLineWidth(0.5);
  doc.line(margin, 98, pageWidth - margin, 98);

  // ========== PROYECTO ==========
  doc.setTextColor(...colorSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PROYECTO:', margin, 103);

  doc.setTextColor(...colorTextoGris);
  doc.setFont('helvetica', 'normal');
  doc.text(`${factura.nombreProyecto || 'N/A'} (ID: ${factura.idProyecto || 'N/A'})`, margin + 35, 103);
  doc.text(`Metodo de Pago: ${factura.metodoPago || 'Transferencia Bancaria'}`, margin, 108);

  // ========== NOTA ACLARATORIA ==========
  let notaY = 113;
  if (factura.anticipoPorcentaje > 0 && factura.anticipoPorcentaje < 100) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...colorPrimario);
    doc.setLineWidth(0.8);
    doc.rect(margin, notaY, pageWidth - margin * 2, 12, 'FD');

    doc.setTextColor(...colorTextoGris);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`NOTA: Esta factura corresponde al anticipo del ${factura.anticipoPorcentaje}% del proyecto.`, margin + 3, notaY + 7);
    notaY += 16;
  } else if (factura.saldoPorcentaje > 0 && factura.saldoPorcentaje < 100) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...colorPrimario);
    doc.setLineWidth(0.8);
    doc.rect(margin, notaY, pageWidth - margin * 2, 12, 'FD');

    doc.setTextColor(...colorTextoGris);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`NOTA: Esta factura corresponde al saldo del proyecto.`, margin + 3, notaY + 7);
    notaY += 16;
  }

  // ========== TABLA DE ITEMS ==========
  const itemsData = (factura.items || []).map(item => {
    const cantidadMostrar = item.cantidad || 1;
    const subtotalMostrar = item.subtotal || 0;
    const precioMostrar = item.precioUnitario || 0;
    const nombreMostrar = item.nombreServicio || 'Servicio';
    let descripcionMostrar = item.descripcion || item.nombreServicio || '-';

    if (factura.anticipoPorcentaje > 0 && factura.anticipoPorcentaje < 100) {
      descripcionMostrar = `${item.descripcion || item.nombreServicio || 'Servicio'} (Anticipo ${factura.anticipoPorcentaje}%)`;
    } else if (factura.saldoPorcentaje > 0 && factura.anticipoPorcentaje === 0) {
      descripcionMostrar = `${item.descripcion || item.nombreServicio || 'Servicio'} (Saldo ${factura.saldoPorcentaje}%)`;
    }

    return [
      nombreMostrar,
      descripcionMostrar,
      cantidadMostrar,
      item.unidad || 'und',
      `$${Number(precioMostrar).toLocaleString('es-CO')}`,
      `$${Number(subtotalMostrar).toLocaleString('es-CO')}`
    ];
  });

  if (factura.anticipoPorcentaje > 0 && factura.anticipoPorcentaje < 100 && itemsData.length === 0) {
    itemsData.push([
      'Anticipo de proyecto',
      `Pago inicial del ${factura.anticipoPorcentaje}% del proyecto`,
      1,
      'und',
      `$${Number(factura.subtotal || 0).toLocaleString('es-CO')}`,
      `$${Number(factura.subtotal || 0).toLocaleString('es-CO')}`
    ]);
  }

  autoTable(doc, {
    startY: notaY,
    head: [['Servicio', 'Descripcion', 'Cant.', 'Und.', 'P. Unit.', 'Subtotal']],
    body: itemsData.length > 0 ? itemsData : [['No hay items', '', '', '', '', '$0']],
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

  // ========== TOTALES ==========
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

  const totales = [
    ['Subtotal:', `$${Number(factura.subtotal || 0).toLocaleString('es-CO')}`],
    [`IVA (${factura.ivaPorcentaje || 19}%):`, `$${Number(factura.iva || 0).toLocaleString('es-CO')}`],
    [`Retencion (${factura.retencionPorcentaje || 2}%):`, `$${Number(factura.retencion || 0).toLocaleString('es-CO')}`],
  ];

  let yPos = finalY + 10;
  totales.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, totalesX + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(value, totalesX + 95, yPos, { align: 'right' });
    yPos += 8;
  });

  // TOTAL A PAGAR destacado
  const totalPagar = Number(factura.totalConIva || 0);
  const netoY = finalY + boxAltura - 14;
  doc.setFillColor(...colorSecundario);
  doc.rect(totalesX, netoY, 100, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL A PAGAR:', totalesX + 5, netoY + 9);
  doc.text(`$${totalPagar.toLocaleString('es-CO')}`, totalesX + 95, netoY + 9, { align: 'right' });

  // ========== NOTAS Y CONDICIONES ==========
  const notasY = finalY;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...colorPrimario);
  doc.setLineWidth(0.8);
  doc.rect(margin, notasY, totalesX - margin - 10, 20, 'FD');

  doc.setTextColor(...colorTextoGris);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('NOTA INFORMATIVA:', margin + 3, notasY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const retencionTexto = `Esta factura esta sujeta a retencion en la fuente del ${factura.retencionPorcentaje || 2}% ($${Number(factura.retencion || 0).toLocaleString('es-CO')}). La retencion es de caracter informativo; el valor a pagar es el Total con IVA.`;
  const retencionSplit = doc.splitTextToSize(retencionTexto, totalesX - margin - 16);
  doc.text(retencionSplit, margin + 3, notasY + 11);

  // Notas adicionales
  let notaExtraY = notasY + 25;
  if (factura.notas) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Notas:', margin, notaExtraY);
    doc.setFont('helvetica', 'normal');
    const notasSplit = doc.splitTextToSize(factura.notas, totalesX - margin - 10);
    doc.text(notasSplit, margin, notaExtraY + 5);
    notaExtraY += 10 + (notasSplit.length * 3);
  }

  if (factura.notasLegales) {
    doc.setFont('helvetica', 'bold');
    doc.text('Notas Legales:', margin, notaExtraY);
    doc.setFont('helvetica', 'normal');
    const notasLegalesSplit = doc.splitTextToSize(factura.notasLegales, totalesX - margin - 10);
    doc.text(notasLegalesSplit, margin, notaExtraY + 5);
    notaExtraY += 10 + (notasLegalesSplit.length * 3);
  }

  if (factura.notasAdicionales) {
    doc.setFont('helvetica', 'bold');
    doc.text('Notas Adicionales:', margin, notaExtraY);
    doc.setFont('helvetica', 'normal');
    const notasAdSplit = doc.splitTextToSize(factura.notasAdicionales, totalesX - margin - 10);
    doc.text(notasAdSplit, margin, notaExtraY + 5);
  }

  // ========== CONDICIONES DEL PROYECTO ==========
  if (factura.presupuestoTotalProyecto && factura.anticipoPorcentaje > 0 && factura.anticipoPorcentaje < 100) {
    const condY = notaExtraY + 20;
    doc.setDrawColor(...colorPrimario);
    doc.setLineWidth(0.3);
    doc.line(margin, condY - 5, pageWidth - margin, condY - 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colorSecundario);
    doc.text('RESUMEN DEL PROYECTO', margin, condY);

    doc.setTextColor(...colorTextoGris);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    const totalProyecto = Number(factura.presupuestoTotalProyecto || 0);
    const anticipoPct = Number(factura.anticipoPorcentaje || 40);
    const saldoPct = 100 - anticipoPct;
    const anticipoTotal = Math.round(totalProyecto * (anticipoPct / 100));
    const saldoTotal = Math.round(totalProyecto * (saldoPct / 100));

    doc.text(`Valor total del proyecto: $${totalProyecto.toLocaleString('es-CO')}`, margin, condY + 6);
    doc.text(`Anticipo total del proyecto (${anticipoPct}%): $${anticipoTotal.toLocaleString('es-CO')}`, margin, condY + 12);
    doc.text(`Saldo total del proyecto (${saldoPct}%): $${saldoTotal.toLocaleString('es-CO')}`, margin, condY + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL A PAGAR por este documento: $${Number(factura.totalConIva || 0).toLocaleString('es-CO')}`, margin, condY + 26);
  }

  // ========== PIE DE PAGINA ==========
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...colorPrimario);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Neoconstrucciones Integrales SAS - NIT: 901.421.096-1', pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.text('Calle 11c No.80B-70 - Celular: 3017223223 - Correo electronico: neoconstruccionesintegrales@gmail.com', pageWidth / 2, pageHeight - 6, { align: 'center' });

  // Guardar
  doc.save(`Factura-${factura.idFactura || 'preview'}.pdf`);
}