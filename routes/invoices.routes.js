import { Router } from "express";
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from "../controllers/invoices.controllers.js";

const router = Router();

router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.post("", createInvoice);
router.put("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);

export default router;
