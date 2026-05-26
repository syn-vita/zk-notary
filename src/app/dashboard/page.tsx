import { DashboardWorkbench } from "@/components/dashboard-workbench";
import { PageNav } from "@/components/page-nav";

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 lg:px-10">
      <PageNav backLabel="Back" homeLabel="Main page" />
      <DashboardWorkbench />
    </main>
  );
}
