import { Router } from "express";
import { getDashboardStats } from "../controllers/analytics.controllers.js";

const router = Router();

router.get("/dashboard", getDashboardStats);

export default router;
