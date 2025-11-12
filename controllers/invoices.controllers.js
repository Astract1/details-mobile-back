import { pool } from "../db.js";

// Obtener todas las facturas con filtros opcionales
export const getInvoices = async (req, res) => {
  try {
    const { start_date, end_date, client } = req.query;

    // Construir query dinámicamente con filtros
    let query = `
      SELECT
        f.id_factura AS id,
        c.nombre AS cliente,
        f.fecha AS fecha,
        f.total AS total,
        f.products AS products
      FROM Facturas f
      INNER JOIN Clientes c ON f.id_cliente = c.id_cliente
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filtro por fecha de inicio
    if (start_date) {
      query += ` AND f.fecha >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    // Filtro por fecha de fin
    if (end_date) {
      query += ` AND f.fecha <= $${paramIndex}`;
      params.push(end_date + ' 23:59:59'); // Incluir todo el día
      paramIndex++;
    }

    // Filtro por nombre de cliente (búsqueda parcial, case-insensitive)
    if (client) {
      query += ` AND LOWER(c.nombre) LIKE LOWER($${paramIndex})`;
      params.push(`%${client}%`);
      paramIndex++;
    }

    // Ordenar por fecha descendente (más recientes primero)
    query += ` ORDER BY f.fecha DESC`;

    const { rows } = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener las facturas:", error);
    res.status(500).json({ message: "Error al obtener las facturas" });
  }
};

// Crear una nueva factura
export const createInvoice = async (req, res) => {
  try {
    const { cliente, fecha, total, products } = req.body;

    console.log(req.body);

    const { rows } = await pool.query(
      "SELECT id_cliente FROM Clientes WHERE nombre = $1 LIMIT 1",
      [cliente]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: `No se encontró el cliente con nombre: ${cliente}` });
    }

    const id_cliente = rows[0].id_cliente;

    console.log(id_cliente);

    if (!id_cliente || !fecha || total == null) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const { rows: resultRows } = await pool.query(
      "INSERT INTO Facturas (id_cliente, fecha, total, products) VALUES ($1, $2, $3, $4) RETURNING id_factura",
      [id_cliente, fecha, total, products]
    );

    res.status(201).json({
      message: "Factura creada correctamente",
      factura: { id_factura: resultRows[0].id_factura, id_cliente, fecha, total },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear la factura" });
  }
};

// Actualizar factura
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_cliente, fecha, total } = req.body;

    const result = await pool.query(
      "UPDATE Facturas SET id_cliente = $1, fecha = $2, total = $3 WHERE id_factura = $4",
      [id_cliente, fecha, total, id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: "Factura no encontrada" });

    res.json({ message: "Factura actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar la factura" });
  }
};

// Obtener factura por ID con sus productos
// Devuelve diferente información según el dispositivo (móvil vs PC)
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const isMobile = req.device?.isMobile || false;

    // Obtener información de la factura
    const invoiceResult = await pool.query(`
      SELECT
        f.id_factura AS id,
        c.nombre AS cliente,
        c.id_cliente AS id_cliente,
        f.fecha AS fecha,
        f.total AS total,
        f.products AS products
      FROM Facturas f
      INNER JOIN Clientes c ON f.id_cliente = c.id_cliente
      WHERE f.id_factura = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    // Obtener productos de la factura desde Movimientos
    const productsResult = await pool.query(`
      SELECT
        m.id_producto AS id,
        p.nombre AS name,
        m.cantidad AS quantity,
        m.precio_unitario_facturado AS price,
        m.precio_total_linea AS total
      FROM Movimientos m
      INNER JOIN Productos p ON m.id_producto = p.id_producto
      WHERE m.id_factura = $1
    `, [id]);

    const invoice = {
      ...invoiceResult.rows[0],
      products: productsResult.rows
    };

    // Si es móvil, incluir información adicional para generar facturas
    if (isMobile) {
      // Obtener catálogo completo de productos disponibles
      const catalogResult = await pool.query(`
        SELECT
          id_producto AS id,
          nombre AS name,
          precio_unitario AS price,
          stock
        FROM Productos
        ORDER BY nombre
      `);

      // Obtener lista de clientes disponibles
      const clientsResult = await pool.query(`
        SELECT
          id_cliente AS id,
          nombre AS name,
          direccion AS address,
          telefono AS phone
        FROM Clientes
        ORDER BY nombre
      `);

      // Respuesta completa para móvil
      res.json({
        invoice: invoice,
        availableProducts: catalogResult.rows,
        availableClients: clientsResult.rows,
        deviceType: 'mobile'
      });
    } else {
      // Para PC, solo devolver los detalles de la factura
      res.json({
        invoice: invoice,
        deviceType: 'desktop'
      });
    }
  } catch (error) {
    console.error("Error al obtener la factura:", error);
    res.status(500).json({ message: "Error al obtener la factura" });
  }
};

// Eliminar factura
export const deleteInvoice = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM Facturas WHERE id_factura = $1",
      [req.params.id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: "Factura no encontrada" });

    res.json({ message: "Factura eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la factura" });
  }
};
