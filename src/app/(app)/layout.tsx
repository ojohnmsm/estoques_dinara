import { BarraNav } from "@/components/barra-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto max-w-lg px-4 pt-4 pb-28">{children}</main>
      <BarraNav />
    </>
  );
}
