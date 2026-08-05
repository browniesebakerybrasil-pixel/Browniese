import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { SupplyForm } from "@/components/insumos/supply-form";

export const metadata = { title: "Novo insumo" };

export default function NewSupplyPage() {
  return (
    <div className="max-w-xl space-y-6">
      <CardHeader
        title="Novo insumo"
        description="Crie o esqueleto do preparo. Os ingredientes são adicionados na página de edição."
      />
      <Card>
        <SupplyForm mode="create" />
      </Card>
      <Link
        href="/insumos"
        className="text-sm text-[var(--color-slate)] hover:underline"
      >
        Voltar para a lista
      </Link>
    </div>
  );
}
