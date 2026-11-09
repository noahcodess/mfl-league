// The account manager's actions: list, create, reset password, move team, remove. Coaches only, never the commissioner.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { emailFor, tempPassword, USERNAME_RULE } from "./password.ts";

type Body = Record<string, unknown>;
type Action = (admin: SupabaseClient, body: Body) => Promise<unknown>;

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

async function coachProfile(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("profiles").select("user_id, username, role, team_id").eq("user_id", userId).single();
  if (!data) throw new Error("Account not found");
  if (data.role !== "coach") throw new Error("Only coach accounts can be changed here");
  return data;
}

async function teamIsFree(admin: SupabaseClient, teamId: string, exceptUser?: string) {
  const { data: team } = await admin.from("teams").select("id").eq("id", teamId).single();
  if (!team) throw new Error("That team does not exist");
  const { data: taken } = await admin.from("profiles").select("user_id, username").eq("team_id", teamId).eq("role", "coach");
  const other = (taken ?? []).find((p) => p.user_id !== exceptUser);
  if (other) throw new Error(`That team already has a coach (${other.username})`);
}

// Everyone's username, team and last login. Passwords are never readable, by design.
const list: Action = async (admin) => {
  const { data: profiles, error } = await admin.from("profiles").select("user_id, username, role, team_id, display_name, must_change_password, created_at").order("username");
  if (error) throw new Error(error.message);
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
  const lastIn = new Map((users?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));
  return { accounts: (profiles ?? []).map((p) => ({ ...p, last_sign_in_at: lastIn.get(p.user_id) ?? null })) };
};

const create: Action = async (admin, body) => {
  const username = text(body.username).toLowerCase();
  const teamId = text(body.teamId);
  const displayName = text(body.displayName) || null;
  if (!USERNAME_RULE.test(username)) throw new Error("Username must be 3 to 20 characters: lowercase letters, numbers or _");
  if (teamId) await teamIsFree(admin, teamId);

  const password = tempPassword();
  const { data, error } = await admin.auth.admin.createUser({ email: emailFor(username), password, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message.includes("already") ? "That username is taken" : (error?.message ?? "Could not create account"));

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: data.user.id, username, role: "coach", team_id: teamId || null, display_name: displayName, must_change_password: true,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(profileError.message.includes("duplicate") ? "That username is taken" : profileError.message);
  }
  return { username, tempPassword: password };
};

// New temporary password; the coach must pick their own at next login.
const reset: Action = async (admin, body) => {
  const coach = await coachProfile(admin, text(body.userId));
  const password = tempPassword();
  const { error } = await admin.auth.admin.updateUserById(coach.user_id, { password });
  if (error) throw new Error(error.message);
  await admin.from("profiles").update({ must_change_password: true }).eq("user_id", coach.user_id);
  return { username: coach.username, tempPassword: password };
};

const move: Action = async (admin, body) => {
  const coach = await coachProfile(admin, text(body.userId));
  const teamId = text(body.teamId);
  if (teamId) await teamIsFree(admin, teamId, coach.user_id);
  const { error } = await admin.from("profiles").update({ team_id: teamId || null }).eq("user_id", coach.user_id);
  if (error) throw new Error(error.message);
  return { username: coach.username, teamId: teamId || null };
};

const remove: Action = async (admin, body) => {
  const coach = await coachProfile(admin, text(body.userId));
  const { error } = await admin.auth.admin.deleteUser(coach.user_id);
  if (error) throw new Error(error.message);
  return { username: coach.username, removed: true };
};

export const actions: Record<string, Action> = { list, create, reset, move, remove };
