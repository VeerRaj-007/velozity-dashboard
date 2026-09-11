import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { validate } from "../middleware/validate";
import { listProjects, createProject, getProject } from "../controllers/project.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    clientId: z.string().uuid(),
    managerId: z.string().uuid().optional(),
  }),
  query: z.any(),
  params: z.any(),
});

router.get("/", asyncHandler(listProjects));
router.post("/", requireRole("ADMIN", "PM"), validate(createSchema), asyncHandler(createProject));
router.get("/:id", asyncHandler(getProject));

export default router;
