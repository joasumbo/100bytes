import { getSession } from "@/lib/auth";
import Shell from "../components/Shell";
import Settings from "./Settings";

export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await getSession();
  return (
    <Shell user={s?.name} title="Definições">
      <Settings />
    </Shell>
  );
}
