"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { createEvent } from "@/app/(dashboard)/eventos/actions";
import { emptyActionState, type ActionState } from "@/lib/validation";

export function EventForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createEvent,
    emptyActionState(),
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Ex.: Festival de Fatias — Setembro"
        />
        <FieldError message={state.fieldErrors?.name?.[0]} />
      </div>
      <div>
        <Label htmlFor="event_date">Data</Label>
        <Input id="event_date" name="event_date" type="date" required />
        <FieldError message={state.fieldErrors?.event_date?.[0]} />
      </div>
      <div>
        <Label htmlFor="notes" hint="opcional">
          Observações
        </Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Local, público esperado, promoções..."
        />
      </div>

      {state.error && !state.fieldErrors ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-emerald-700">Evento adicionado.</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}
