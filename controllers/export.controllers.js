import { pool } from "../db.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

// Export invoices to PDF
export const exportInvoicesPDF = async (req, res) => {
  try {
    const { start_date, end_date, client } = req.query;

    let query = `
      SELECT f.id_factura, c.nombre as cliente, f.total, f.fecha, f.products
      FROM Facturas f
      INNER JOIN Clientes c ON f.id_cliente = c.id_cliente
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (start_date) {
      query += ` AND f.fecha >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      query += ` AND f.fecha <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    if (client) {
      query += ` AND c.nombre ILIKE $${paramIndex}`;
      params.push(`%${client}%`);
      paramIndex++;
    }

    query += ' ORDER BY f.fecha DESC';

    const result = await pool.query(query, params);
    const invoices = result.rows;

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=facturas.pdf');

    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Reporte de Facturas', { align: 'center' });
    doc.moveDown();

    // Add filters info if any
    if (start_date || end_date || client) {
      doc.fontSize(10).text('Filtros aplicados:', { underline: true });
      if (start_date) doc.text(`Desde: ${start_date}`);
      if (end_date) doc.text(`Hasta: ${end_date}`);
      if (client) doc.text(`Cliente: ${client}`);
      doc.moveDown();
    }

    // Add table header
    doc.fontSize(12);
    const tableTop = doc.y;
    doc.text('ID', 50, tableTop);
    doc.text('Cliente', 100, tableTop);
    doc.text('Productos', 250, tableTop);
    doc.text('Total', 350, tableTop);
    doc.text('Fecha', 450, tableTop);
    doc.moveDown();

    // Add invoices
    doc.fontSize(10);
    invoices.forEach((invoice, i) => {
      const y = doc.y;
      doc.text(invoice.id_factura, 50, y);
      doc.text((invoice.cliente || 'N/A').substring(0, 20), 100, y);
      doc.text(invoice.products || 0, 250, y);
      doc.text(`$${parseFloat(invoice.total).toLocaleString()}`, 350, y);
      doc.text(new Date(invoice.fecha).toLocaleDateString('es-ES'), 450, y);
      doc.moveDown(0.5);

      // Add page break if needed
      if (doc.y > 700) {
        doc.addPage();
      }
    });

    // Add summary
    const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    doc.moveDown();
    doc.fontSize(12).text(`Total de facturas: ${invoices.length}`, { align: 'right' });
    doc.text(`Monto total: $${totalAmount.toLocaleString()}`, { align: 'right' });

    doc.end();
  } catch (error) {
    console.error('Error exporting invoices to PDF:', error);
    res.status(500).json({ message: 'Error al exportar facturas a PDF', error: error.message });
  }
};

// Export invoices to Excel
export const exportInvoicesExcel = async (req, res) => {
  try {
    const { start_date, end_date, client } = req.query;

    let query = `
      SELECT f.id_factura, c.nombre as cliente, f.total, f.fecha, f.products
      FROM Facturas f
      INNER JOIN Clientes c ON f.id_cliente = c.id_cliente
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (start_date) {
      query += ` AND f.fecha >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      query += ` AND f.fecha <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    if (client) {
      query += ` AND c.nombre ILIKE $${paramIndex}`;
      params.push(`%${client}%`);
      paramIndex++;
    }

    query += ' ORDER BY f.fecha DESC';

    const result = await pool.query(query, params);
    const invoices = result.rows;

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Facturas');

    // Add headers
    worksheet.columns = [
      { header: 'ID Factura', key: 'id_factura', width: 15 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Productos', key: 'products', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Fecha', key: 'fecha', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007AFF' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add data
    invoices.forEach(invoice => {
      worksheet.addRow({
        id_factura: invoice.id_factura,
        cliente: invoice.cliente,
        products: invoice.products,
        total: parseFloat(invoice.total),
        fecha: new Date(invoice.fecha).toLocaleDateString('es-ES'),
      });
    });

    // Add total row
    const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    worksheet.addRow({});
    const totalRow = worksheet.addRow({
      id_factura: '',
      cliente: '',
      products: 'TOTAL',
      total: totalAmount,
      fecha: '',
    });
    totalRow.font = { bold: true };

    // Format total column as currency
    worksheet.getColumn('total').numFmt = '$#,##0.00';

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=facturas.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting invoices to Excel:', error);
    res.status(500).json({ message: 'Error al exportar facturas a Excel', error: error.message });
  }
};

// Export movements to PDF
export const exportMovementsPDF = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT
        m.*,
        f.fecha,
        c.nombre AS client,
        p.nombre AS product
      FROM Movimientos m
      LEFT JOIN Facturas f ON m.id_factura = f.id_factura
      INNER JOIN Clientes c ON m.id_cliente = c.id_cliente
      INNER JOIN Productos p ON m.id_producto = p.id_producto
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (start_date) {
      query += ` AND f.fecha >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      query += ` AND f.fecha <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    query += ' ORDER BY f.fecha DESC';

    const result = await pool.query(query, params);
    const movements = result.rows;

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=movimientos.pdf');

    doc.pipe(res);

    doc.fontSize(20).text('Reporte de Movimientos', { align: 'center' });
    doc.moveDown();

    if (start_date || end_date) {
      doc.fontSize(10).text('Filtros aplicados:', { underline: true });
      if (start_date) doc.text(`Desde: ${start_date}`);
      if (end_date) doc.text(`Hasta: ${end_date}`);
      doc.moveDown();
    }

    doc.fontSize(12);
    const tableTop = doc.y;
    doc.text('Cliente', 50, tableTop);
    doc.text('Producto', 150, tableTop);
    doc.text('Cantidad', 300, tableTop);
    doc.text('Precio Total', 400, tableTop);
    doc.moveDown();

    doc.fontSize(10);
    movements.forEach((movement) => {
      const y = doc.y;
      doc.text((movement.client || 'N/A').substring(0, 15), 50, y);
      doc.text((movement.product || 'N/A').substring(0, 20), 150, y);
      doc.text(movement.cantidad, 300, y);
      doc.text(`$${parseFloat(movement.precio_total_linea).toLocaleString()}`, 400, y);
      doc.moveDown(0.5);

      if (doc.y > 700) {
        doc.addPage();
      }
    });

    const totalAmount = movements.reduce((sum, mov) => sum + parseFloat(mov.precio_total_linea), 0);
    doc.moveDown();
    doc.fontSize(12).text(`Total de movimientos: ${movements.length}`, { align: 'right' });
    doc.text(`Monto total: $${totalAmount.toLocaleString()}`, { align: 'right' });

    doc.end();
  } catch (error) {
    console.error('Error exporting movements to PDF:', error);
    res.status(500).json({ message: 'Error al exportar movimientos a PDF', error: error.message });
  }
};

// Export movements to Excel
export const exportMovementsExcel = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT
        m.*,
        f.fecha,
        c.nombre AS client,
        p.nombre AS product
      FROM Movimientos m
      LEFT JOIN Facturas f ON m.id_factura = f.id_factura
      INNER JOIN Clientes c ON m.id_cliente = c.id_cliente
      INNER JOIN Productos p ON m.id_producto = p.id_producto
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (start_date) {
      query += ` AND f.fecha >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      query += ` AND f.fecha <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    query += ' ORDER BY f.fecha DESC';

    const result = await pool.query(query, params);
    const movements = result.rows;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Movimientos');

    worksheet.columns = [
      { header: 'ID Movimiento', key: 'id_movimiento', width: 15 },
      { header: 'Cliente', key: 'client', width: 30 },
      { header: 'Producto', key: 'product', width: 30 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Precio Total', key: 'precio_total_linea', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007AFF' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    movements.forEach(movement => {
      worksheet.addRow({
        id_movimiento: movement.id_movimiento,
        client: movement.client,
        product: movement.product,
        cantidad: movement.cantidad,
        precio_total_linea: parseFloat(movement.precio_total_linea),
      });
    });

    const totalAmount = movements.reduce((sum, mov) => sum + parseFloat(mov.precio_total_linea), 0);
    worksheet.addRow({});
    const totalRow = worksheet.addRow({
      id_movimiento: '',
      client: '',
      product: '',
      cantidad: 'TOTAL',
      precio_total_linea: totalAmount,
    });
    totalRow.font = { bold: true };

    worksheet.getColumn('precio_total_linea').numFmt = '$#,##0.00';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=movimientos.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting movements to Excel:', error);
    res.status(500).json({ message: 'Error al exportar movimientos a Excel', error: error.message });
  }
};
