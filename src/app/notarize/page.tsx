import { NotarizeWorkbench } from "@/components/notarize-workbench";
import { PageNav } from "@/components/page-nav";

export default function NotarizePage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 lg:px-10">
      <PageNav backLabel="Back" homeLabel="Main page" />
      <NotarizeWorkbench />
    </main>
  );
}
