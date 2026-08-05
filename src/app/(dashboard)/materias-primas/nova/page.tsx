import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { RawMaterialForm } from "@/components/materias/raw-material-form";

export const metadata = { title: "Nova matéria prima" };

export default function NewRawMaterialPage() {
  return (
    <div className="max-w-xl space-y-6">
      <CardHeader
        title="Nova matéria prima"
        description="Informe a embalagem que você compra (1kg, 5L, caixa com 24un...) e o custo total. O Brownie-se calcula o custo por g/ml/un automaticamente."
      />
      <Card>
        <RawMaterialForm mode="create" />
      </Card>
      <Link
        href="/materias-primas"
        className="text-sm text-[var(--color-slate)] hover:underline"
      >
        Voltar para a lista
      </Link>
    </div>
  );
}
