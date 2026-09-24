/**
 * CLI script to bootstrap or reset the initial admin account.
 * Usage: npx tsx prisma/bootstrap-admin.ts
 *
 * Required environment variables:
 *   DATABASE_URL
 *   ADMIN_BOOTSTRAP_SECRET
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as readline from "readline";
import * as process from "process";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

function hiddenQuestion(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin as any;
    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    process.stdout.write(prompt);
    let password = "";
    stdin.once("data", (chunk: Buffer) => {
      password += chunk.toString();
      if (password.endsWith("\n") || password.endsWith("\r")) {
        password = password.slice(0, -1);
        if (password.endsWith("\n") || password.endsWith("\r")) {
          password = password.slice(0, -1);
        }
      }
      if (stdin.setRawMode) {
        stdin.setRawMode(false);
      }
      process.stdout.write("\n");
      resolve(password);
    });
  });
}

async function main() {
  try {
    const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!secret || secret === "change-this-admin-bootstrap-secret") {
      console.error("ERROR: ADMIN_BOOTSTRAP_SECRET is not set or is still the default value.");
      console.error("Set a strong secret in your environment before bootstrapping an admin.");
      process.exit(1);
    }

    console.log("=== Admin Bootstrap Tool ===\n");

    const existingAdmin = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    if (existingAdmin) {
      console.log(`An admin account already exists: ${existingAdmin.email}`);
      console.log(
        "This will RESET the admin password. Continue? (type RESET to confirm, anything else to abort)"
      );
      const confirm = await question("> ");
      if (confirm !== "RESET") {
        console.log("Aborted. No changes made.");
        return;
      }
    } else {
      console.log("No admin account found. Creating a new one.");
    }

    const name = await question("Admin name: ");
    const email = await question("Admin email: ");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("ERROR: Invalid email format.");
      process.exit(1);
    }

    const password = await hiddenQuestion("Admin password: ");
    if (password.length < 8) {
      console.error("ERROR: Password must be at least 8 characters.");
      process.exit(1);
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      console.error("ERROR: Password must contain uppercase, lowercase, and a number.");
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (existingAdmin) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          name,
          email,
          passwordHash,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
      });
      console.log(`\nAdmin account updated. Email: ${email}`);
    } else {
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          settings: {
            create: {},
          },
        },
      });
      console.log(`\nAdmin account created. Email: ${email}`);
    }

    await prisma.auditLog.create({
      data: {
        userId: existingAdmin?.id ?? "",
        action: "ADMIN_BOOTSTRAP_CLI",
        entity: "User",
        details: JSON.stringify({ email, via: "cli" }),
      },
    });
  } catch (error) {
    console.error("[BOOTSTRAP_ERROR]", error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
