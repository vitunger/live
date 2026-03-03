import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get invoice_id from URL params
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoice_id");
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "invoice_id parameter required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the invoice from our DB to find the LexOffice ID
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: invoice, error: invErr } = await sb
      .from("billing_invoices")
      .select("lexoffice_invoice_id")
      .eq("id", invoiceId)
      .single();

    if (invErr || !invoice?.lexoffice_invoice_id) {
      return new Response(JSON.stringify({ error: "Keine LexOffice-Rechnung gefunden fuer Invoice " + invoiceId }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API key from DB
    const apiKey = await getLexofficeApiKey();

    // Fetch the PDF document from LexOffice
    const lexId = invoice.lexoffice_invoice_id;

    // First, render the document (finalize it for PDF)
    // LexOffice requires rendering before PDF download
    const renderResp = await fetch(`${LEXOFFICE_BASE}/invoices/${lexId}/document`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    let documentFileId: string | null = null;
    if (renderResp.ok) {
      const renderData = await renderResp.json();
      documentFileId = renderData.documentFileId;
    }

    // Download PDF
    const pdfUrl = documentFileId
      ? `${LEXOFFICE_BASE}/files/${documentFileId}`
      : `${LEXOFFICE_BASE}/invoices/${lexId}/document`;

    const pdfResp = await fetch(pdfUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/pdf",
      },
    });

    if (!pdfResp.ok) {
      const errText = await pdfResp.text();
      throw new Error(`LexOffice PDF download failed: ${pdfResp.status} ${errText}`);
    }

    const pdfBuffer = await pdfResp.arrayBuffer();

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Rechnung-${invoiceId}.pdf"`,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
