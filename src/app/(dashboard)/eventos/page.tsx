import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { EventForm } from "@/components/eventos/event-form";
import { DeleteEventButton } from "@/components/eventos/delete-event-button";
import type { EventItem } from "@/types";

export const metadata = { title: "Eventos" };

/**
 * Lista simples de eventos programados: festivais, feiras, datas especiais.
 * O dashboard executivo mostra o "próximo" pra visão rápida. Sem recorrência,
 * sem calendário. Só data + nome.
 */
export default async function EventsPage() {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  const todayStr = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", organization.id)
    .order("event_date", { ascending: true });

  const events = (data ?? []) as EventItem[];
  const upcoming = events.filter((e) => e.event_date >= todayStr);
  const past = events.filter((e) => e.event_date < todayStr).reverse();

  return (
    <div className="space-y-6">
      <CardHeader
        title="Eventos"
        description="Festivais, feiras e datas especiais. O próximo evento aparece na visão geral."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <h3 className="font-serif text-lg text-[var(--color-navy)]">
              Próximos
            </h3>
            <div className="mt-4">
              {upcoming.length === 0 ? (
                <EmptyState
                  title="Sem eventos programados"
                  description="Cadastre um festival ou feira aqui do lado."
                />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {upcoming.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--color-navy)]">
                          {e.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-slate)]">
                          {formatEventDate(e.event_date)}
                        </p>
                        {e.notes ? (
                          <p className="mt-1 text-sm text-[var(--color-slate)]">
                            {e.notes}
                          </p>
                        ) : null}
                      </div>
                      <DeleteEventButton id={e.id} name={e.name} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {past.length > 0 ? (
            <Card>
              <h3 className="font-serif text-lg text-[var(--color-navy)]">
                Passados
              </h3>
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {past.slice(0, 10).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between py-2 text-sm text-[var(--color-slate)]"
                  >
                    <span>{e.name}</span>
                    <span className="font-mono text-xs">
                      {formatEventDate(e.event_date)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Novo evento
          </h3>
          <div className="mt-4">
            <EventForm />
          </div>
        </Card>
      </div>
    </div>
  );
}

function formatEventDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
