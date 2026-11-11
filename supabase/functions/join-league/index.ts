// First-time coach sign-up: check a one-time passcode, then create the coach's own username and password.
// Public on purpose (the passcode is the permission). Passwords go straight to Supabase Auth and are never stored or logged here.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
// Must match admin-accounts/password.ts and src/data/config.js.
const USERNAME_RULE = /^[a-z0-9_]{3,20}$/;
const emailFor = (u: string) => `${u}@accounts.mfl-league.com`;
const PASSWORD_MIN = 8;

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply(405, { error: "POST only" });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: "Bad request" }); }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const lookup = async () => {
    const { data, error } = await admin.rpc("invite_lookup", { p_code: text(body.code) });
    if (error) throw new Error(error.message);
    return data as { id: number; coach_name: string; team_id: string; team_name: string };
  };

  try {
    if (body.action === "check") {
      const inv = await lookup();
      return reply(200, { coachName: inv.coach_name, teamId: inv.team_id, teamName: inv.team_name });
    }
    if (body.action !== "join") return reply(400, { error: "Unknown action" });

    const username = text(body.username).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!USERNAME_RULE.test(username)) throw new Error("Username must be 3 to 20 characters: lowercase letters, numbers or _");
    if (password.length < PASSWORD_MIN) throw new Error(`Use at least ${PASSWORD_MIN} characters for your password`);
    const inv = await lookup();

    const { data: taken } = await admin.from("profiles").select("user_id").eq("team_id", inv.team_id).eq("role", "coach");
    if ((taken ?? []).length) throw new Error("That team already has a coach. Ask the commissioner.");

    const { data, error } = await admin.auth.admin.createUser({ email: emailFor(username), password, email_confirm: true });
    if (error || !data.user) throw new Error(error?.message.includes("already") ? "That username is taken. Try another." : "Could not create your account");

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: data.user.id, username, role: "coach", team_id: inv.team_id, display_name: inv.coach_name, must_change_password: false,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw new Error(profileError.message.includes("duplicate") ? "That username is taken. Try another." : "Could not create your account");
    }
    const { error: doneError } = await admin.rpc("invite_complete", { p_id: inv.id, p_user: data.user.id });
    if (doneError) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw new Error(doneError.message);
    }
    return reply(200, { username, coachName: inv.coach_name, teamId: inv.team_id });
  } catch (e) {
    return reply(400, { error: e instanceof Error ? e.message : "Something went wrong" });
  }
});
