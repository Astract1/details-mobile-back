import { pool } from "../db.js";

export const getDashboardStats = async (req, res) => {
  try {
    // Total de clientes
    const clientsResult = await pool.query('SELECT COUNT(*) as total FROM Clientes');
    const totalClients = parseInt(clientsResult.rows[0].total);

    // Total de productos
    const productsResult = await pool.query('SELECT COUNT(*) as total FROM Productos');
    const totalProducts = parseInt(productsResult.rows[0].total);

    // Total de facturas
    const invoicesResult = await pool.query('SELECT COUNT(*) as total FROM Facturas');
    const totalInvoices = parseInt(invoicesResult.rows[0].total);

    // Total de ventas (suma de todas las facturas)
    const salesResult = await pool.query('SELECT COALESCE(SUM(total), 0) as total FROM Facturas');
    const totalSales = parseFloat(salesResult.rows[0].total);

    // Ventas del mes actual
    const currentMonthSalesResult = await pool.query(`
      SELECT COALESCE(SUM(total), 0) as total
      FROM Facturas
      WHERE EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);
    const currentMonthSales = parseFloat(currentMonthSalesResult.rows[0].total);

    // Productos con stock bajo (menos de 10)
    const lowStockResult = await pool.query('SELECT COUNT(*) as total FROM Productos WHERE stock < 10');
    const lowStockProducts = parseInt(lowStockResult.rows[0].total);

    // Top 5 productos más vendidos
    const topProductsResult = await pool.query(`
      SELECT
        p.nombre,
        p.id_producto,
        COALESCE(SUM(m.cantidad), 0) as total_vendido
      FROM Productos p
      LEFT JOIN Movimientos m ON p.id_producto = m.id_producto
      GROUP BY p.id_producto, p.nombre
      ORDER BY total_vendido DESC
      LIMIT 5
    `);

    // Top 5 clientes con más compras
    const topClientsResult = await pool.query(`
      SELECT
        c.nombre,
        c.id_cliente,
        COUNT(f.id_factura) as total_facturas,
        COALESCE(SUM(f.total), 0) as total_gastado
      FROM Clientes c
      LEFT JOIN Facturas f ON c.nombre = f.cliente
      GROUP BY c.id_cliente, c.nombre
      ORDER BY total_gastado DESC
      LIMIT 5
    `);

    // Ventas por mes (últimos 6 meses)
    const salesByMonthResult = await pool.query(`
      SELECT
        TO_CHAR(fecha, 'YYYY-MM') as mes,
        COALESCE(SUM(total), 0) as total
      FROM Facturas
      WHERE fecha >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(fecha, 'YYYY-MM')
      ORDER BY mes ASC
    `);

    // Facturas recientes (últimas 5)
    const recentInvoicesResult = await pool.query(`
      SELECT
        id_factura,
        cliente,
        total,
        fecha,
        products
      FROM Facturas
      ORDER BY fecha DESC
      LIMIT 5
    `);

    res.json({
      overview: {
        totalClients,
        totalProducts,
        totalInvoices,
        totalSales,
        currentMonthSales,
        lowStockProducts,
      },
      topProducts: topProductsResult.rows,
      topClients: topClientsResult.rows,
      salesByMonth: salesByMonthResult.rows,
      recentInvoices: recentInvoicesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas del dashboard', error: error.message });
  }
};
