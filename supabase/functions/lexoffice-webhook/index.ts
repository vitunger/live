import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://app.lexoffice.de",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lxo-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// HMAC-SHA256 Signatur-Verifizierung fuer LexOffice Webhooks
async function verifyLexofficeSignature(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get("LEXOFFICE_WEBHOOK_SECRET");
  if (!secret) {
    // Kein Secret konfiguriert – Warnung loggen, aber durchlassen (Abwaertskompatibilitaet)
    console.warn("LEXOFFICE_WEBHOOK_SECRET nicht gesetzt – Signatur-Pruefung uebersprungen");
    return true;
  }
  const signature = req.headers.get("x-lxo-signature") || req.headers.get("x-lexoffice-signature") || "";
  if (!signature) {
    console.warn("LexOffice Webhook ohne Signatur empfangen");
    return false;
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");
  return signature === expected;
}

// ─── Helper: Get LexOffice API Key from connector_config ───
async function getLexofficeApiKey(supabaseAdmin: any): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("connector_config")
    .select("config_value")
    .eq("connector_id", "lexoffice")
    .eq("config_key", "api_key")
    .single();

  if (error || !data?.config_value) {
    const envKey = Deno.env.get("LEXOFFICE_API_KEY");
    if (envKey) return envKey;
    throw new Error("LexOffice API Key nicht konfiguriert.");
  }
  return data.config_value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Webhook from LexOffice – kein JWT, aber HMAC-Signatur wenn konfiguriert
  try {
    const rawBody = await req.text();
    const validSig = await verifyLexofficeSignature(req, rawBody);
    if (!validSig) {
      console.error("LexOffice Webhook: Ungueltige Signatur");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = JSON.parse(rawBody);
    console.log("LexOffice webhook received:", JSON.stringify(body));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const eventType = body.eventType || body.event_type || "";
    const resourceId = body.resourceId || body.resource_id || "";

    // Log the webhook event
    await supabaseAdmin.from("portal_events").insert({
      event_type: "lexoffice_webhook",
      event_data: {
        eventType,
        resourceId,
        raw: body,
      },
      created_at: new Date().toISOString(),
    }).then(() => {}).catch(() => {});

    // Handle specific events
    if (eventType === "invoice.status.changed" && resourceId) {
      // Fetch updated invoice status from LexOffice
      try {
        const apiKey = await getLexofficeApiKey(supabaseAdmin);
        const resp = await fetch(`https://api.lexoffice.io/v1/invoices/${resourceId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        });

        if (resp.ok) {
          const lexInvoice = await resp.json();
          const voucherStatus = lexInvoice.voucherStatus;

          // Update our invoice status based on LexOffice status
          if (voucherStatus) {
            const { data: ourInvoice } = await supabaseAdmin
              .from("billing_invoices")
              .select("id, status")
              .eq("lexoffice_invoice_id", resourceId)
              .single();

            if (ourInvoice) {
              let newStatus = ourInvoice.status;
              if (voucherStatus === "paid" || voucherStatus === "paidoff") {
                newStatus = "paid";
              } else if (voucherStatus === "voided") {
                newStatus = "cancelled";
              }

              if (newStatus !== ourInvoice.status) {
                await supabaseAdmin
                  .from("billing_invoices")
                  .update({
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                    notes: `Status von LexOffice aktualisiert: ${voucherStatus}`,
                  })
                  .eq("id", ourInvoice.id);

                // Also update linked shop_order if exists
                const { data: linkedOrder } = await supabaseAdmin
                  .from("shop_orders")
                  .select("id, status")
                  .eq("billing_invoice_id", ourInvoice.id)
                  .single();

                if (linkedOrder && newStatus === "paid" && linkedOrder.status === "confirmed") {
                  await supabaseAdmin
                    .from("shop_orders")
                    .update({
                      status: "paid",
                      paid_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", linkedOrder.id);
                  console.log(`Shop order ${linkedOrder.id} auto-marked as paid via LexOffice webhook`);
                }
              }
            }
          }
        }
      } catch (e: any) {
        console.error("Failed to process invoice status webhook:", e.message);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("LexOffice webhook error:", err.message);
    // Always return 200 to prevent LexOffice from retrying
    return new Response(JSON.stringify({ received: true, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
