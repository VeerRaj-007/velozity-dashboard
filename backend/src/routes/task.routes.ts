import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { validate } from "../middleware/validate";
import { listTasks, createTask, updateTaskStatus, getActivityFeed } from "../controllers/task.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    projectId: z.string().uuid(),
    assigneeId: z.string().uuid().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    dueDate: z.string(),
  }),
  query: z.any(),
  params: z.any(),
});

const statusSchema = z.object({
  body: z.object({ status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]) }),
  query: z.any(),
  params: z.object({ id: z.string().uuid() }),
});

router.get("/", asyncHandler(listTasks));
router.post("/", requireRole("ADMIN", "PM"), validate(createSchema), asyncHandler(createTask));
router.patch("/:id/status", validate(statusSchema), asyncHandler(updateTaskStatus));
router.get("/activity/feed", asyncHandler(getActivityFeed));

export default router;
