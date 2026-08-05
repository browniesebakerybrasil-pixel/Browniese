"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import {
  createSalesChannel,
  updateSalesChannel,
} from "@/app/(dashboard)/canais/actions";
import { emptyActionState, type ActionState } from "@/lib/validation";
import type { SalesChannel } from "@/types";

interface Props {
  mode: "create" | "edit";
  channel?: SalesChannel;
  onDone?: () => void;
}

export function ChannelForm({ mode, channel, onDone }: Props) {
  const action =
    mode === "create"
      ? createSalesChannel
      : updateSalesChannel.bind(null, channel!.id);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    emptyActionState(),
  );

  if (state.ok && onDone) onDone();

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor={`name-${mode}`}>Nome</Label>
        <Input
          id={`name-${mode}`}
          name="name"
          required
          defaultValue={channel?.name ?? ""}
          placeholder="iFood"
        />
        <FieldError message={state.fieldErrors?.name?.[0]} />
      </div>
      <div>
        <Label htmlFor={`fee-${mode}`} hint="taxa cobrada pela plataforma (%)">
          Taxa
        </Label>
        <Input
          id={`fee-${mode}`}
          name="fee_percentage"
          type="text"
          inputMode="decimal"
          defaultValue={String(channel?.fee_percentage ?? 0)}
          placeholder="23"
        />
        <FieldError message={state.fieldErrors?.fee_percentage?.[0]} />
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--color-slate)]">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={channel?.is_active ?? true}
          className="accent-[var(--color-brown)]"
        />
        Ativo
      </label>
      {state.error && !state.fieldErrors ? (
        <p className="text-xs text-red-700">{state.error}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Adicionar" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
