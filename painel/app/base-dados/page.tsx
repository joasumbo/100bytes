import { getSession } from "@/lib/auth";
import Shell from "../components/Shell";
import Database from "./Database";

export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await getSession();
  return (
    <Shell user={s?.name} title="Base de dados">
      <Database />
    </Shell>
  );
}
