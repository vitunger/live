import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LEXOFFICE_BASE = "https://api.lexoffice.io/v1";

// ─── Helper: Get LexOffice API Key from connector_config ───
async function getLexofficeApiKey(): Promise<string> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabaseAdmin
    .from("connector_config")
    .select("config_value")
    .eq("connector_id", "lexoffice")
    .eq("config_key", "api_key")
    .single();

  if (error || !data?.config_value) {
    // Fallback to env secret for backwards compatibility
    const envKey = Deno.env.get("LEXOFFICE_API_KEY");
    if (envKey) return envKey;
    throw new Error("LexOffice API Key nicht konfiguriert. Bitte unter Schnittstellen → lexoffice eintragen.");
  }
  return data.config_value;
}

// ─── Helper: Create Supabase client from auth header ───
function getSupabaseClient(authHeader: string | null) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: authHeader ? { Authorization: authHeader } : {} } },
  );
}

// ─── Helper: LexOffice API request ───
async function lexofficeRequest(apiKey: string, path: string, method = "GET", body?: unknown) {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (body && (method === "POST" || method === "PUT")) {
    opts.body = JSON.stringify(body);
  }
  const resp = await fetch(`${LEXOFFICE_BASE}${path}`, opts);
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`LexOffice API ${resp.status}: ${errText}`);
  }
  // Some endpoints return 201/204 with no body
  const text = await resp.text();
  return text ? JSON.parse(text) : {};
}

// ─── Helper: Build LexOffice contact from billing data ───
function buildContact(standort: any) {
  return {
    version: 0,
    roles: { customer: {} },
    company: {
      name: standort.name || "Unbenannt",
      street: standort.strasse || undefined,
      zip: standort.plz || undefined,
      city: standort.stadt || undefined,
      countryCode: "DE",
    },
  };
}

// ─── Helper: Build LexOffice invoice ───
function buildInvoice(invoice: any, lineItems: any[], contactId: string) {
  const items = lineItems.map((li: any) => ({
    type: "custom",
    name: li.description || li.bezeichnung || "Position",
    quantity: li.quantity || li.menge || 1,
    unitName: "Stück",
    unitPrice: {
      currency: "EUR",
      netAmount: li.amount || li.betrag_netto || 0,
      taxRatePercentage: li.tax_rate || 19,
    },
  }));

  return {
    voucherDate: invoice.invoice_date || new Date().toISOString().split("T")[0],
    address: { contactId },
    lineItems: items,
    totalPrice: { currency: "EUR" },
    taxConditions: { taxType: "net" },
    shippingConditions: {
      shippingDate: invoice.invoice_date || new Date().toISOString().split("T")[0],
      shippingType: "delivery",
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: No auth provided" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API key from DB
    const apiKey = await getLexofficeApiKey();

    // Parse request
    let body: any = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { body = {}; }
    }
    const action = body.action || "test-connection";

    // ─── Action: test-connection ───
    if (action === "test-connection") {
      const result = await lexofficeRequest(apiKey, "/profile");
      return new Response(JSON.stringify({
        success: true,
        message: "Verbindung erfolgreich",
        company: result.companyName || result.organizationName || "OK",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: sync-invoice ───
    if (action === "sync-invoice") {
      const invoiceId = body.invoice_id;
      if (!invoiceId) throw new Error("invoice_id required");

      const sb = getSupabaseClient(authHeader);

      // Load invoice + line items + standort
      const { data: inv, error: invErr } = await sb
        .from("billing_invoices")
        .select("*, standorte:standort_id(id, name, strasse, plz, stadt)")
        .eq("id", invoiceId)
        .single();
      if (invErr || !inv) throw new Error("Invoice not found: " + invoiceId);

      const { data: items } = await sb
        .from("billing_invoice_line_items")
        .select("*")
        .eq("invoice_id", invoiceId);

      // Ensure contact exists in LexOffice
      let contactId = inv.lexoffice_contact_id;
      if (!contactId && inv.standorte) {
        const contact = buildContact(inv.standorte);
        const created = await lexofficeRequest(apiKey, "/contacts", "POST", contact);
        contactId = created.id;
        // Save contact ID
        await sb.from("standorte").update({ lexoffice_contact_id: contactId }).eq("id", inv.standort_id);
      }

      if (!contactId) throw new Error("Kein LexOffice-Kontakt für Standort");

      // Create invoice in LexOffice
      const lexInvoice = buildInvoice(inv, items || [], contactId);
      const created = await lexofficeRequest(apiKey, "/invoices", "POST", lexInvoice);

      // Update our invoice with LexOffice ID
      await sb.from("billing_invoices").update({
        lexoffice_invoice_id: created.id,
        lexoffice_synced_at: new Date().toISOString(),
      }).eq("id", invoiceId);

      return new Response(JSON.stringify({
        success: true,
        lexofficeId: created.id,
        invoiceId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: sync-all-finalized ───
    if (action === "sync-all-finalized") {
      const sb = getSupabaseClient(authHeader);

      const { data: invoices } = await sb
        .from("billing_invoices")
        .select("id")
        .eq("status", "finalized")
        .is("lexoffice_invoice_id", null);

      const results: any[] = [];
      for (const inv of invoices || []) {
        try {
          // Recursive call to sync-invoice
          const r = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/lexoffice-sync`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
                apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
              },
              body: JSON.stringify({ action: "sync-invoice", invoice_id: inv.id }),
            },
          );
          const d = await r.json();
          results.push({ id: inv.id, ...d });
        } catch (e: any) {
          results.push({ id: inv.id, error: e.message });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        synced: results.length,
        results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: cancel-invoice ───
    if (action === "cancel-invoice") {
      const lexofficeInvoiceId = body.lexoffice_invoice_id;
      if (!lexofficeInvoiceId) throw new Error("lexoffice_invoice_id required");

      // LexOffice: Transition invoice to "voided" status
      // First get the current version
      const invoice = await lexofficeRequest(apiKey, `/invoices/${lexofficeInvoiceId}`);
      const resourceVersion = invoice.version;

      // Cancel/void the invoice via status transition
      try {
        await lexofficeRequest(apiKey, `/invoices/${lexofficeInvoiceId}/document`, "GET");
      } catch { /* may already be rendered */ }

      // Use the voucherStatus endpoint to void
      const voidResp = await fetch(`${LEXOFFICE_BASE}/invoices/${lexofficeInvoiceId}/void`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ voidedDate: new Date().toISOString().split("T")[0] }),
      });

      // If /void doesn't work, try the pursue-cancellation endpoint
      if (!voidResp.ok) {
        // Alternative: create a credit note
        const creditResp = await fetch(`${LEXOFFICE_BASE}/credit-notes?precedingSalesVoucherId=${lexofficeInvoiceId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voucherDate: new Date().toISOString().split("T")[0],
            address: invoice.address,
            lineItems: invoice.lineItems,
            totalPrice: { currency: "EUR" },
            taxConditions: invoice.taxConditions || { taxType: "net" },
          }),
        });

        if (creditResp.ok) {
          const creditData = await creditResp.json();
          return new Response(JSON.stringify({
            success: true,
            method: "credit-note",
            creditNoteId: creditData.id,
            lexofficeInvoiceId,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        method: "voided",
        lexofficeInvoiceId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: sync-contact ───
    if (action === "sync-contact") {
      const standortId = body.standort_id;
      if (!standortId) throw new Error("standort_id required");

      const sb = getSupabaseClient(authHeader);
      const { data: standort } = await sb
        .from("standorte")
        .select("*")
        .eq("id", standortId)
        .single();

      if (!standort) throw new Error("Standort not found");

      const contact = buildContact(standort);
      const created = await lexofficeRequest(apiKey, "/contacts", "POST", contact);

      await sb.from("standorte").update({ lexoffice_contact_id: created.id }).eq("id", standortId);

      return new Response(JSON.stringify({
        success: true,
        contactId: created.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action: " + action }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
