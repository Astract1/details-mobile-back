import express from "express";
import cors from "cors";
import clientsRoutes from "./routes/clients.routes.js";
import productsRoutes from "./routes/products.routes.js";
import invoicesRoutes from "./routes/invoices.routes.js";
import movementsRoutes from "./routes/movements.routes.js";
import { initializeDatabase } from "./db-init.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Inicializar base de datos antes de iniciar el servidor
async function startServer() {
  try {
    // Inicializar tablas
    await initializeDatabase();
    
    // Configurar rutas
    app.use("/clients", clientsRoutes);
    app.use("/products", productsRoutes);
    app.use("/invoices", invoicesRoutes);
    app.use("/movements", movementsRoutes);
    
    // Iniciar servidor en todas las interfaces (0.0.0.0) para permitir conexiones desde dispositivos móviles
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📱 Accesible desde la red local en: http://192.168.1.14:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

startServer();
