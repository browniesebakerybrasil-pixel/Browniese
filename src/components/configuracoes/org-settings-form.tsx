"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import { updateOrganization } from "@/app/(dashboard)/configuracoes/actions";
import { emptyActionState, type ActionState } from "@/lib/validation";
import type { Organization } from "@/types";

const TYPES = [
  { value: "hamburgueria", label: "Hamburgueria" },
  { value: "confeitaria", label: "Confeitaria" },
  { value: "lanchonete", label: "Lanchonete" },
  { value: "restaurante", label: "Restaurante" },
  { value: "delivery", label: "Delivery" },
  { value: "outro", label: "Outro" },
];

export function OrgSettingsForm({ organization }: { organization: Organization }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateOrganization,
    emptyActionState(),
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do negócio</Label>
        <Input
          id="name"
          name="name"
          defaultValue={organization.name}
          required
        />
        <FieldError message={state.fieldErrors?.name?.[0]} />
      </div>
      <div>
        <Label htmlFor="type">Tipo</Label>
        <Select
          id="type"
          name="type"
          defaultValue={organization.type ?? "outro"}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>
      {state.error && !state.fieldErrors ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-emerald-700">Atualizado.</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
