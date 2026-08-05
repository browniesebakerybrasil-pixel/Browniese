import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { CustomerForm } from "@/components/clientes/customer-form";

export const metadata = { title: "Novo cliente" };

export default function NewCustomerPage() {
  return (
    <div className="max-w-xl space-y-6">
      <CardHeader
        title="Novo cliente"
        description="Preencha o que tiver — só o nome é obrigatório."
      />
      <Card>
        <CustomerForm mode="create" />
      </Card>
      <Link
        href="/clientes"
        className="text-sm text-[var(--color-slate)] hover:underline"
      >
        Voltar para a lista
      </Link>
    </div>
  );
}
