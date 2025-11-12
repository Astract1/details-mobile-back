import { Router } from "express";
import {
  exportInvoicesPDF,
  exportInvoicesExcel,
  exportMovementsPDF,
  exportMovementsExcel,
} from "../controllers/export.controllers.js";

const router = Router();

router.get("/invoices/pdf", exportInvoicesPDF);
router.get("/invoices/excel", exportInvoicesExcel);
router.get("/movements/pdf", exportMovementsPDF);
router.get("/movements/excel", exportMovementsExcel);

export default router;
