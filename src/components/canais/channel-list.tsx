"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, TD, TH, THead, TR } from "@/components/ui/table";
import { ChannelForm } from "./channel-form";
import { formatPercent } from "@/lib/utils";
import {
  deleteSalesChannel,
  toggleSalesChannel,
} from "@/app/(dashboard)/canais/actions";
import type { SalesChannel } from "@/types";

export function ChannelList({ channels }: { channels: SalesChannel[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <DataTable>
      <THead>
        <TR>
          <TH>Canal</TH>
          <TH className="w-32">Taxa</TH>
          <TH className="w-24">Ativo</TH>
          <TH className="w-40 text-right">Ações</TH>
        </TR>
      </THead>
      <tbody>
        {channels.map((c) =>
          editingId === c.id ? (
            <TR key={c.id}>
              <TD colSpan={3} className="bg-[var(--color-cream-50)]" />
              <TD className="bg-[var(--color-cream-50)] p-3">
                <div className="space-y-2">
                  <ChannelForm
                    mode="edit"
                    channel={c}
                    onDone={() => setEditingId(null)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </TD>
            </TR>
          ) : (
            <TR key={c.id}>
              <TD className="font-medium text-[var(--color-navy)]">{c.name}</TD>
              <TD>{formatPercent(Number(c.fee_percentage))}</TD>
              <TD>
                <button
                  type="button"
                  onClick={() => {
                    startTransition(() => {
                      void toggleSalesChannel(c.id, !c.is_active).catch(
                        () => undefined,
                      );
                    });
                  }}
                  className={`rounded-full px-2 py-1 text-xs ${
                    c.is_active
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {c.is_active ? "ativo" : "inativo"}
                </button>
              </TD>
              <TD className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingId(c.id)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Excluir o canal "${c.name}"?`)) {
                        startTransition(() => {
                          void deleteSalesChannel(c.id).catch(() => undefined);
                        });
                      }
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </TD>
            </TR>
          ),
        )}
      </tbody>
    </DataTable>
  );
}
