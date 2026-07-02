import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const superadmin = await prisma.adminUser.upsert({
    where: { email: "admin@100bytes.co.ao" },
    update: {},
    create: {
      name: "Superadmin",
      email: "admin@100bytes.co.ao",
      passwordHash,
      role: "superadmin",
      active: true,
    },
  });

  console.log("✅ Superadmin criado:", superadmin.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
