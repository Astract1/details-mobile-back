import { pool } from "../db.js";

// Obtener todos los movimientos con filtros opcionales
export const getMovements = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Construir query dinámicamente con filtros
    let query = `
      SELECT
        m.id_movimiento,
        c.nombre AS client,
        m.id_factura,
        m.precio_total_linea,
        m.cantidad,
        m.id_producto,
        p.nombre AS product,
        f.fecha AS fecha
      FROM Movimientos m
      JOIN Productos p ON m.id_producto = p.id_producto
      INNER JOIN Clientes c ON m.id_cliente = c.id_cliente
      LEFT JOIN Facturas f ON m.id_factura = f.id_factura
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filtro por fecha de inicio (usando la fecha de la factura)
    if (start_date) {
      query += ` AND f.fecha >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    // Filtro por fecha de fin (usando la fecha de la factura)
    if (end_date) {
      query += ` AND f.fecha <= $${paramIndex}`;
      params.push(end_date + ' 23:59:59'); // Incluir todo el día
      paramIndex++;
    }

    // Ordenar por fecha descendente (más recientes primero)
    query += ` ORDER BY f.fecha DESC, m.id_movimiento DESC`;

    const { rows } = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener los movimientos" });
  }
};

// Crear movimiento
export const createMovement = async (req, res) => {
  try {
    const {
      id_factura,
      id_producto,
      cantidad,
      precio_unitario_facturado,
      precio_total_linea,
    } = req.body;

    if (
      !id_factura ||
      !id_producto ||
      !cantidad ||
      !precio_unitario_facturado ||
      !precio_total_linea
    ) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const { rows } = await pool.query(
      `INSERT INTO Movimientos 
       (id_factura, id_producto, cantidad, precio_unitario_facturado, precio_total_linea)
       VALUES ($1, $2, $3, $4, $5) RETURNING id_movimiento`,
      [
        id_factura,
        id_producto,
        cantidad,
        precio_unitario_facturado,
        precio_total_linea,
      ]
    );

    res.status(201).json({
      message: "Movimiento creado correctamente",
      movimiento: {
        id_movimiento: rows[0].id_movimiento,
        id_factura,
        id_producto,
        cantidad,
        precio_unitario_facturado,
        precio_total_linea,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear el movimiento" });
  }
};

// Actualizar movimiento
export const updateMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      id_factura,
      id_producto,
      cantidad,
      precio_unitario_facturado,
      precio_total_linea,
    } = req.body;

    const result = await pool.query(
      `UPDATE Movimientos
       SET id_factura = $1, id_producto = $2, cantidad = $3, 
           precio_unitario_facturado = $4, precio_total_linea = $5
       WHERE id_movimiento = $6`,
      [
        id_factura,
        id_producto,
        cantidad,
        precio_unitario_facturado,
        precio_total_linea,
        id,
      ]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: "Movimiento no encontrado" });

    res.json({ message: "Movimiento actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el movimiento" });
  }
};

// Eliminar movimiento
export const deleteMovement = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM Movimientos WHERE id_movimiento = $1",
      [req.params.id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: "Movimiento no encontrado" });

    res.json({ message: "Movimiento eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el movimiento" });
  }
};
