"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteEvent } from "@/app/(dashboard)/eventos/actions";

export function DeleteEventButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Excluir evento "${name}"?`)) return;
        start(() => {
          void deleteEvent(id).catch(() => undefined);
        });
      }}
    >
      {pending ? "..." : "Excluir"}
    </Button>
  );
}
