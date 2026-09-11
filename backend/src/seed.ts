import { PrismaClient, TaskStatus, Priority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  console.log("Seeding...");
  await prisma.notification.deleteMany();
  await prisma.taskActivity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Asha Admin",
      email: "admin@velozity.test",
      passwordHash,
      role: "ADMIN",
    },
  });

  const pm1 = await prisma.user.create({
    data: {
      name: "Priya Sharma",
      email: "pm1@velozity.test",
      passwordHash,
      role: "PM",
    },
  });
  const pm2 = await prisma.user.create({
    data: {
      name: "Rohan Mehta",
      email: "pm2@velozity.test",
      passwordHash,
      role: "PM",
    },
  });

  const devs = await Promise.all(
    ["Ravi Kumar", "Sana Iqbal", "Devika Nair", "Arjun Rao"].map((name, i) =>
      prisma.user.create({
        data: {
          name,
          email: `dev${i + 1}@velozity.test`,
          passwordHash,
          role: "DEVELOPER",
        },
      }),
    ),
  );

  const clientA = await prisma.client.create({
    data: { name: "Nimbus Retail" },
  });
  const clientB = await prisma.client.create({
    data: { name: "Fernbank Logistics" },
  });
  const clientC = await prisma.client.create({
    data: { name: "Orchid Health" },
  });

  const project1 = await prisma.project.create({
    data: {
      name: "Nimbus Storefront Revamp",
      description: "E-commerce redesign",
      clientId: clientA.id,
      managerId: pm1.id,
    },
  });
  const project2 = await prisma.project.create({
    data: {
      name: "Fernbank Fleet Tracker",
      description: "Internal logistics dashboard",
      clientId: clientB.id,
      managerId: pm1.id,
    },
  });
  const project3 = await prisma.project.create({
    data: {
      name: "Orchid Patient Portal",
      description: "Patient-facing scheduling app",
      clientId: clientC.id,
      managerId: pm2.id,
    },
  });

  const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
  const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  const projects = [project1, project2, project3];
  let overdueMade = 0;

  for (const project of projects) {
    for (let i = 0; i < 6; i++) {
      const assignee = devs[(i + projects.indexOf(project)) % devs.length];
      const status = statuses[i % statuses.length];
      const makeOverdue = overdueMade < 2 && status !== "DONE";
      const dueDate = makeOverdue
        ? new Date(Date.now() - 3 * DAY)
        : new Date(Date.now() + (i + 1) * DAY);
      if (makeOverdue) overdueMade++;

      const task = await prisma.task.create({
        data: {
          title: `${project.name} — Task ${i + 1}`,
          description: "Auto-generated seed task.",
          projectId: project.id,
          assigneeId: assignee.id,
          status,
          priority: priorities[i % priorities.length],
          dueDate,
          isOverdue: makeOverdue,
        },
      });

      await prisma.taskActivity.create({
        data: {
          taskId: task.id,
          userId: assignee.id,
          fromStatus: null,
          toStatus: "TODO",
        },
      });
      if (status !== "TODO") {
        await prisma.taskActivity.create({
          data: {
            taskId: task.id,
            userId: assignee.id,
            fromStatus: "TODO",
            toStatus: status,
          },
        });
      }
    }
  }

  console.log("Seed complete.");
  console.log("Login as any of:");
  console.log("  admin@velozity.test / Password123!");
  console.log(
    "  pm1@velozity.test / Password123!  (manages Nimbus + Fernbank)",
  );
  console.log("  pm2@velozity.test / Password123!  (manages Orchid)");
  console.log("  dev1@velozity.test .. dev4@velozity.test / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
