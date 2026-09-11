import cron from "node-cron";
import { prisma } from "../config/prisma";

export function startOverdueJob() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const result = await prisma.task.updateMany({
        where: {
          dueDate: { lt: new Date() },
          status: { not: "DONE" },
          isOverdue: false,
        },
        data: { isOverdue: true },
      });
      if (result.count > 0)
        console.log(`[overdueJob] flagged ${result.count} task(s) as overdue`);
    } catch (err) {
      console.error("[overdueJob] failed:", err);
    }
  });
}
