import { pool } from "../db.js";

// Obtener todos los productos
export const getProductos = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM Productos");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener productos", error });
  }
};

export const getProductosA = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id_producto AS id,
        nombre AS name,
        precio_unitario AS price,
        stock AS quantity
      FROM Productos
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ message: "Error al obtener productos", error });
  }
};

export const updateProducts = async (req, res) => {
  try {
    const { newProducts, total, cliente, id_factura } = req.body;

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

    console.log("newProducts", newProducts);

    await Promise.all(
      newProducts.map(async (newProd) => {
        await pool.query(
          "UPDATE Productos SET stock=$1 WHERE id_producto=$2",
          [newProd.quantity - newProd.cantidadTotal, newProd.id]
        );
      })
    );

    await Promise.all(
      newProducts.map(async (newProd) => {
        await pool.query(
          `INSERT INTO Movimientos 
       (id_factura, id_cliente, id_producto, cantidad, precio_unitario_facturado, precio_total_linea)
       VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            id_factura,
            id_cliente,
            newProd.id,
            newProd.cantidadTotal,
            +newProd.price,
            +newProd.price * newProd.cantidadTotal,
          ]
        );
      })
    );

    res.json({ message: "Productos actualizados correctamente" });
  } catch (error) {
    console.error("Error al actualizar productos:", error);
    res.status(500).json({ message: "Error al actualizar productos", error });
  }
};

// Crear producto
export const createProducto = async (req, res) => {
  try {
    console.log(req.body);
    const { nombre, precio_unitario, stock } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO Productos (nombre, precio_unitario, stock) VALUES ($1, $2, $3) RETURNING id_producto",
      [nombre, precio_unitario, stock]
    );
    res
      .status(201)
      .json({ id: rows[0].id_producto, nombre, precio_unitario, stock });
  } catch (error) {
    res.status(500).json({ message: "Error al crear producto", error });
  }
};

// Editar producto
export const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio_unitario, stock } = req.body;

    const result = await pool.query(
      "UPDATE Productos SET nombre=$1, precio_unitario=$2, stock=$3 WHERE id_producto=$4",
      [nombre, precio_unitario, stock, id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: "Producto no encontrado" });

    res.json({ message: "Producto actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar producto", error });
  }
};

// Eliminar producto
export const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM Productos WHERE id_producto = $1",
      [id]
    );

    console.log("result", result);

    if (result.rowCount === 0)
      return res.status(404).json({ message: "Producto no encontrado" });

    res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar producto", error });
  }
};
