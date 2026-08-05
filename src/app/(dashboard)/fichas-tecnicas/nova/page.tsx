import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { SheetForm } from "@/components/fichas/sheet-form";

export const metadata = { title: "Nova ficha técnica" };

export default function NewSheetPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <CardHeader
        title="Nova ficha técnica"
        description="Cadastre primeiro o esqueleto. Após criar, você adiciona os ingredientes na página de edição e o CMV calcula sozinho."
      />
      <Card>
        <SheetForm mode="create" />
      </Card>
      <Link
        href="/fichas-tecnicas"
        className="text-sm text-[var(--color-slate)] hover:underline"
      >
        Voltar para a lista
      </Link>
    </div>
  );
}
