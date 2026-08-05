import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook Clerk -> mantem a tabela `organizations` em sincronia com as contas
 * Clerk. Eventos tratados:
 *   - user.created : cria stub de organizacao (idempotente)
 *   - user.deleted : remove organizacao + dados em cascata via FK
 *
 * Configure este endpoint no dashboard do Clerk (Webhooks) e copie o
 * "Signing Secret" (`whsec_...`) para a variavel CLERK_WEBHOOK_SECRET.
 *
 * Verificamos a assinatura Svix manualmente usando Web Crypto, sem dep extra.
 * Formato Svix: header "svix-signature" contem "v1,<base64>". O payload
 * assinado e `${svix-id}.${svix-timestamp}.${rawBody}`, com chave HMAC-SHA256
 * sendo a parte base64 do secret apos `whsec_`.
 */

export const runtime = "nodejs"; // precisamos de buffer/crypto.subtle

interface ClerkUserEvent {
  type: "user.created" | "user.deleted" | "user.updated" | string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string | null;
    username?: string | null;
  };
}

async function verifySvixSignature(req: Request, body: string) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    // Em dev sem webhook configurado — log e ignora.
    console.warn("[clerk webhook] CLERK_WEBHOOK_SECRET nao configurado");
    return true;
  }

  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signatureHeader = req.headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const secretB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const keyData = Uint8Array.from(atob(secretB64), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const data = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, data);
  const expected = btoa(
    String.fromCharCode(...new Uint8Array(sigBuf)),
  );

  return signatureHeader
    .split(" ")
    .map((s) => s.split(",")[1])
    .some((s) => s === expected);
}

export async function POST(req: Request) {
  const body = await req.text();
  const valid = await verifySvixSignature(req, body);
  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: ClerkUserEvent;
  try {
    event = JSON.parse(body) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === "user.created") {
    const fallbackName =
      event.data.first_name?.trim() ||
      event.data.username ||
      event.data.email_addresses?.[0]?.email_address?.split("@")[0] ||
      "Meu negócio";

    const { error } = await supabase.from("organizations").upsert(
      {
        clerk_user_id: event.data.id,
        name: fallbackName,
        plan: "basico",
        plan_status: "trialing",
      },
      { onConflict: "clerk_user_id" },
    );
    if (error) {
      console.error("[clerk webhook] upsert org", error);
      return NextResponse.json({ error: "db error" }, { status: 500 });
    }
  }

  if (event.type === "user.deleted") {
    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("clerk_user_id", event.data.id);
    if (error) {
      console.error("[clerk webhook] delete org", error);
      return NextResponse.json({ error: "db error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
