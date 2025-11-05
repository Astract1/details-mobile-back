// Script para inicializar las tablas automáticamente
import { pool } from "./db.js";

export async function initializeDatabase() {
  try {
    console.log("🔧 Inicializando base de datos...");

    // Crear tabla de Clientes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Clientes (
        id_cliente SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        direccion VARCHAR(255) DEFAULT NULL,
        telefono VARCHAR(50) DEFAULT NULL
      )
    `);
    console.log("✅ Tabla 'Clientes' verificada/creada");

    // Crear tabla de Productos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Productos (
        id_producto SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        precio_unitario DECIMAL(10, 2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0
      )
    `);
    console.log("✅ Tabla 'Productos' verificada/creada");

    // Crear tabla de Facturas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Facturas (
        id_factura SERIAL PRIMARY KEY,
        id_cliente INTEGER DEFAULT NULL,
        products INTEGER DEFAULT NULL,
        fecha DATE NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        CONSTRAINT facturas_ibfk_1 FOREIGN KEY (id_cliente) 
          REFERENCES Clientes(id_cliente) 
          ON DELETE SET NULL 
          ON UPDATE CASCADE
      )
    `);
    console.log("✅ Tabla 'Facturas' verificada/creada");

    // Crear tabla de Movimientos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Movimientos (
        id_movimiento SERIAL PRIMARY KEY,
        id_factura INTEGER DEFAULT NULL,
        id_cliente INTEGER DEFAULT NULL,
        id_producto INTEGER DEFAULT NULL,
        cantidad INTEGER NOT NULL,
        precio_unitario_facturado DECIMAL(10, 2) NOT NULL,
        precio_total_linea DECIMAL(10, 2) NOT NULL,
        CONSTRAINT movimientos_ibfk_1 FOREIGN KEY (id_factura) 
          REFERENCES Facturas(id_factura) 
          ON DELETE CASCADE 
          ON UPDATE CASCADE,
        CONSTRAINT movimientos_ibfk_2 FOREIGN KEY (id_producto) 
          REFERENCES Productos(id_producto) 
          ON DELETE CASCADE 
          ON UPDATE CASCADE,
        CONSTRAINT movimientos_ibfk_3 FOREIGN KEY (id_cliente) 
          REFERENCES Clientes(id_cliente) 
          ON DELETE SET NULL 
          ON UPDATE CASCADE
      )
    `);
    console.log("✅ Tabla 'Movimientos' verificada/creada");

    // Crear índices para mejorar el rendimiento
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON Facturas(id_cliente)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_movimientos_factura ON Movimientos(id_factura)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_movimientos_cliente ON Movimientos(id_cliente)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON Movimientos(id_producto)
    `);
    console.log("✅ Índices creados");

    console.log("🎉 Base de datos inicializada correctamente");
  } catch (error) {
    console.error("❌ Error al inicializar la base de datos:", error);
    throw error;
  }
}

