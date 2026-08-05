"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import {
  createCustomer,
  updateCustomer,
} from "@/app/(dashboard)/clientes/actions";
import { emptyActionState, type ActionState } from "@/lib/validation";
import type { Customer } from "@/types";

interface Props {
  mode: "create" | "edit";
  customer?: Customer;
}

export function CustomerForm({ mode, customer }: Props) {
  const action =
    mode === "create"
      ? createCustomer
      : updateCustomer.bind(null, customer!.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    emptyActionState(),
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={customer?.name ?? ""}
          placeholder="Ex.: Maria Silva"
        />
        <FieldError message={state.fieldErrors?.name?.[0]} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            inputMode="tel"
            defaultValue={customer?.whatsapp ?? ""}
            placeholder="(11) 91234-5678"
          />
        </div>
        <div>
          <Label htmlFor="birthday">Aniversário</Label>
          <Input
            id="birthday"
            name="birthday"
            type="date"
            defaultValue={customer?.birthday ?? ""}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          name="address"
          defaultValue={customer?.address ?? ""}
          placeholder="Rua, número, bairro, complemento"
        />
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={customer?.notes ?? ""}
          placeholder="Preferências, restrições, datas importantes..."
        />
      </div>

      {state.error && !state.fieldErrors ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.ok && mode === "edit" ? (
        <p className="text-sm text-emerald-700">Atualizado.</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Cadastrar" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
