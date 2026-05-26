import { DashboardWorkbench } from "@/components/dashboard-workbench";
import { PageShell } from "@/components/page-shell";

export default function DashboardPage() {
  return (
    <PageShell showBack>
      <DashboardWorkbench />
    </PageShell>
  );
}
