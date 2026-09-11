import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { adminDashboard, pmDashboard, developerDashboard } from "../controllers/dashboard.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);

router.get("/admin", requireRole("ADMIN"), asyncHandler(adminDashboard));
router.get("/pm", requireRole("PM"), asyncHandler(pmDashboard));
router.get("/developer", requireRole("DEVELOPER"), asyncHandler(developerDashboard));

export default router;
