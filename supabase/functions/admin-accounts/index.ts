// Account manager entry point: only the unlocked commissioner can create, reset, move or remove coach logins.
// The site owner may only list accounts (look, don't touch).
import { createClient } from "npm:@supabase/supabase-js@2";
import { actions } from "./actions.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply(405, { error: "POST only" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Ask the database, as the caller, whether they are the commissioner with his key entered.
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  let body: { action?: string; [k: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "Bad request" });
  }

  const { data: isCommish } = await asCaller.rpc("is_commissioner");
  if (isCommish !== true) {
    const { data: isOwner } = await asCaller.rpc("is_site_owner");
    if (!(isOwner === true && body.action === "list")) return reply(403, { error: "Commissioner key required" });
  }

  const run = actions[body.action ?? ""];
  if (!run) return reply(400, { error: "Unknown action" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  try {
    return reply(200, await run(admin, body));
  } catch (e) {
    return reply(400, { error: e instanceof Error ? e.message : "Something went wrong" });
  }
});
