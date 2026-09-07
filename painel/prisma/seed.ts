import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  const email = (process.env.PANEL_ADMIN_EMAIL || "joasumbo@gmail.com").toLowerCase();
  const name = process.env.PANEL_ADMIN_NAME || "João Sumbo";
  let pw = process.env.PANEL_ADMIN_PASSWORD;
  const generated = !pw;
  if (!pw) pw = randomBytes(9).toString("base64url");

  const passwordHash = await bcrypt.hash(pw, 10);
  await prisma.panelUser.upsert({
    where: { email },
    update: { name, active: true },
    create: { email, name, passwordHash },
  });

  console.log(`Utilizador do painel: ${email}`);
  if (generated) console.log(`PASSWORD GERADA: ${pw}`);
  else console.log("Password definida a partir de PANEL_ADMIN_PASSWORD.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
