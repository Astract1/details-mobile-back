import { Router } from "express";
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from "../controllers/invoices.controllers.js";
import { detectDevice } from "../middleware/deviceDetection.js";

const router = Router();

router.get("/", getInvoices);
// Aplicar middleware de detección de dispositivo en la ruta de detalles
router.get("/:id", detectDevice, getInvoiceById);
router.post("", createInvoice);
router.put("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);

export default router;
