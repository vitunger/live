/**
 * finapi-proxy – Supabase Edge Function
 *
 * Handles all finAPI communication server-side:
 *   POST /finapi-proxy  { action: "getToken" }
 *   POST /finapi-proxy  { action: "createUser", standortId }
 *   POST /finapi-proxy  { action: "getBankConnections", standortId }
 *   POST /finapi-proxy  { action: "getAccounts", standortId }
 *   POST /finapi-proxy  { action: "syncAccounts", standortId }
 *   POST /finapi-proxy  { action: "deleteUser", standortId }
 *   POST /finapi-proxy  { action: "getWebFormUrl", standortId, callbackUrl }
 *
 * Required Supabase Secrets:
 *   FINAPI_CLIENT_ID      – from finAPI sandbox/production dashboard
 *   FINAPI_CLIENT_SECRET  – from finAPI sandbox/production dashboard
 *   FINAPI_BASE_URL       – https://sandbox.finapi.io  (sandbox)
 *                           https://live.finapi.io     (production)
 *
 * DB tables used (see migration SQL below):
 *   finapi_users   – maps standort_id → finAPI userId + tokens
 *   bank_accounts  – Kontostand + IBAN pro Standort
 *
 * @module supabase/functions/finapi-proxy
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Config ───────────────────────────────────────────────────────────────────
const FINAPI_CLIENT_ID     = Deno.env.get("FINAPI_CLIENT_ID")     ?? "";
const FINAPI_CLIENT_SECRET = Deno.env.get("FINAPI_CLIENT_SECRET") ?? "";
const FINAPI_BASE_URL      = Deno.env.get("FINAPI_BASE_URL")      ?? "https://sandbox.finapi.io";
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")         ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** OAuth2 client_credentials token (app-level, not user-level) */
async function getClientToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type:    "client_credentials",
    client_id:     FINAPI_CLIENT_ID,
    client_secret: FINAPI_CLIENT_SECRET,
  });
  const resp = await fetch(`${FINAPI_BASE_URL}/api/v2/oauth/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) throw new Error(`finAPI auth failed: ${await resp.text()}`);
  const data = await resp.json();
  return data.access_token;
}

/** OAuth2 password grant for a specific finAPI user */
async function getUserToken(finApiUserId: string, finApiPassword: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type:    "password",
    client_id:     FINAPI_CLIENT_ID,
    client_secret: FINAPI_CLIENT_SECRET,
    username:      finApiUserId,
    password:      finApiPassword,
  });
  const resp = await fetch(`${FINAPI_BASE_URL}/api/v2/oauth/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) throw new Error(`finAPI user auth failed: ${await resp.text()}`);
  const data = await resp.json();
  return data.access_token;
}

async function finApiGet(path: string, token: string) {
  const resp = await fetch(`${FINAPI_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`finAPI GET ${path} failed (${resp.status}): ${await resp.text()}`);
  return resp.json();
}

async function finApiPost(path: string, token: string, body: unknown) {
  const resp = await fetch(`${FINAPI_BASE_URL}${path}`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`finAPI POST ${path} failed (${resp.status}): ${await resp.text()}`);
  return resp.json();
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

/** Create a finAPI user for a standort, store in DB */
async function actionCreateUser(sb: ReturnType<typeof createClient>, standortId: string) {
  const clientToken = await getClientToken();

  // Generate stable credentials from standortId
  const finApiUserId = `vitbikes_${standortId.replace(/-/g, "").slice(0, 20)}`;
  const finApiPassword = crypto.randomUUID();

  // Create user in finAPI
  await finApiPost("/api/v2/users", clientToken, {
    id:       finApiUserId,
    password: finApiPassword,
    isAutoUpdateEnabled: true,
  });

  // Store in DB
  const { error } = await sb.from("finapi_users").upsert({
    standort_id:       standortId,
    finapi_user_id:    finApiUserId,
    finapi_password:   finApiPassword, // encrypted at rest by Supabase
    created_at:        new Date().toISOString(),
    updated_at:        new Date().toISOString(),
  }, { onConflict: "standort_id" });

  if (error) throw new Error(`DB upsert finapi_users failed: ${error.message}`);
  return { success: true, finApiUserId };
}

/** Generate WebForm 2.0 URL for bank connection (partner does the auth in browser) */
async function actionGetWebFormUrl(
  sb: ReturnType<typeof createClient>,
  standortId: string,
  callbackUrl: string,
) {
  // Get or create finAPI user
  let { data: fuRow } = await sb.from("finapi_users")
    .select("*").eq("standort_id", standortId).single();

  if (!fuRow) {
    await actionCreateUser(sb, standortId);
    const r = await sb.from("finapi_users").select("*").eq("standort_id", standortId).single();
    fuRow = r.data;
  }

  const userToken = await getUserToken(fuRow.finapi_user_id, fuRow.finapi_password);

  // Create WebForm 2.0 bank import
  const webFormResp = await finApiPost(
    "/api/v2/bankConnections/import",
    userToken,
    { redirectUrl: callbackUrl }
  );

  // finAPI returns a Location header with the WebForm URL in v1, or a url field in v2
  return {
    webFormUrl: webFormResp.url ?? webFormResp.location ?? null,
    webFormId:  webFormResp.id ?? null,
  };
}

/** Get all accounts + balances for a standort */
async function actionGetAccounts(sb: ReturnType<typeof createClient>, standortId: string) {
  const { data: fuRow, error } = await sb.from("finapi_users")
    .select("*").eq("standort_id", standortId).single();

  if (error || !fuRow) return { accounts: [], connected: false };

  const userToken = await getUserToken(fuRow.finapi_user_id, fuRow.finapi_password);
  const accountsResp = await finApiGet("/api/v2/accounts", userToken);

  const accounts = (accountsResp.accounts ?? []).map((a: Record<string, unknown>) => ({
    id:            a.id,
    iban:          a.iban,
    accountName:   a.accountName,
    accountType:   a.accountType,
    balance:       a.balance,
    overdraft:     a.overdraft,
    lastSuccessfulUpdate: a.lastSuccessfulUpdate,
    bankName:      (a as Record<string, Record<string, unknown>>).bankConnection?.bankName,
  }));

  return { accounts, connected: true };
}

/** Sync accounts → update bank_accounts table */
async function actionSyncAccounts(sb: ReturnType<typeof createClient>, standortId: string) {
  const { accounts, connected } = await actionGetAccounts(sb, standortId);
  if (!connected || accounts.length === 0) return { synced: 0, connected: false };

  // Upsert all accounts
  const rows = accounts.map((a: Record<string, unknown>) => ({
    standort_id:    standortId,
    finapi_account_id: String(a.id),
    iban:           a.iban ?? null,
    account_name:   a.accountName ?? null,
    account_type:   a.accountType ?? null,
    balance:        a.balance ?? 0,
    overdraft:      a.overdraft ?? 0,
    bank_name:      a.bankName ?? null,
    last_sync:      new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  }));

  const { error } = await sb.from("bank_accounts").upsert(rows, {
    onConflict: "standort_id,finapi_account_id",
  });
  if (error) throw new Error(`DB upsert bank_accounts failed: ${error.message}`);

  // Update standort last_banking_sync timestamp
  await sb.from("standorte")
    .update({ last_banking_sync: new Date().toISOString() })
    .eq("id", standortId);

  return { synced: rows.length, connected: true, accounts };
}

/** Delete finAPI user (e.g. when partner leaves) */
async function actionDeleteUser(sb: ReturnType<typeof createClient>, standortId: string) {
  const { data: fuRow } = await sb.from("finapi_users")
    .select("*").eq("standort_id", standortId).single();
  if (!fuRow) return { deleted: false, reason: "no finapi user found" };

  const clientToken = await getClientToken();
  await fetch(`${FINAPI_BASE_URL}/api/v2/users/${fuRow.finapi_user_id}`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${clientToken}` },
  });

  await sb.from("finapi_users").delete().eq("standort_id", standortId);
  await sb.from("bank_accounts").delete().eq("standort_id", standortId);
  return { deleted: true };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify caller is authenticated (partner or HQ)
    const { data: { user }, error: authError } = await createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { action, standortId, callbackUrl } = body;

    if (!action) throw new Error("Missing action");

    let result;
    switch (action) {
      case "createUser":
        result = await actionCreateUser(sb, standortId);
        break;
      case "getWebFormUrl":
        result = await actionGetWebFormUrl(sb, standortId, callbackUrl);
        break;
      case "getAccounts":
        result = await actionGetAccounts(sb, standortId);
        break;
      case "syncAccounts":
        result = await actionSyncAccounts(sb, standortId);
        break;
      case "deleteUser":
        result = await actionDeleteUser(sb, standortId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("finapi-proxy error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status:  500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
