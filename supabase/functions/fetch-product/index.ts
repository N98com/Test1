// Edge Function: fetch-product
// Haalt een productpagina van een bekende webshop server-side op (voorkomt CORS)
// en leest daar titel, artikelnummer en EAN uit, plus het bijbehorende bedrijf
// op basis van het domein. Alleen ingelogde admins mogen dit aanroepen.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Alleen bekende webshop-domeinen mogen opgehaald worden (voorkomt dat deze
// functie als open url-fetch-proxy misbruikt kan worden).
function companyForHost(hostname: string): 'lisl' | 'eb' | null {
  const host = hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'ledinbouwspotsleds.nl' || host === 'ledinbouwspotsleds.be') return 'lisl';
  if (host === 'ecobright.nl') return 'eb';
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function extractDescription(html: string): string | null {
  const h1Match = html.match(/<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const text = decodeHtmlEntities(stripTags(h1Match[1]));
    if (text) return text;
  }
  const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
  if (ogTitleMatch) {
    const text = decodeHtmlEntities(ogTitleMatch[1]);
    if (text) return text;
  }
  return null;
}

function extractArticleNumber(html: string): string | null {
  const microdataMatch = html.match(/itemprop="sku"[^>]*>\s*([^<]+?)\s*</i);
  if (microdataMatch) return decodeHtmlEntities(microdataMatch[1]);

  const tableMatch = html.match(/data-th="SKU">([^<]+)</i);
  if (tableMatch) return decodeHtmlEntities(tableMatch[1]);

  const jsonLdMatch = html.match(/"sku"\s*:\s*"([^"]+)"/i);
  if (jsonLdMatch) return decodeHtmlEntities(jsonLdMatch[1]);

  return null;
}

function extractEan(html: string): string | null {
  const tableMatch = html.match(/data-th="EAN">([^<]+)</i);
  if (tableMatch) return decodeHtmlEntities(tableMatch[1]);

  const jsonLdMatch = html.match(/"gtin13"\s*:\s*"?(\d+)"?/i) ?? html.match(/"gtin"\s*:\s*"?(\d+)"?/i);
  if (jsonLdMatch) return jsonLdMatch[1];

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Niet ingelogd.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: 'Sessie ongeldig, log opnieuw in.' }, 401);
    }

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return json({ error: 'Alleen admins kunnen artikelen via een link toevoegen.' }, 403);
    }

    const body = await req.json().catch(() => null);
    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!rawUrl) {
      return json({ error: 'Vul een link in.' }, 400);
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return json({ error: 'Dit is geen geldige link.' }, 400);
    }

    if (parsed.protocol !== 'https:') {
      return json({ error: 'Alleen https-links worden ondersteund.' }, 400);
    }

    const companyId = companyForHost(parsed.hostname);
    if (!companyId) {
      return json(
        { error: 'Deze link wordt niet herkend. Gebruik een productlink van ledinbouwspotsleds.nl of ecobright.nl.' },
        400,
      );
    }

    const pageRes = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoorraadbeheerBot/1.0)' },
    });
    if (!pageRes.ok) {
      return json({ error: `Kon de pagina niet ophalen (status ${pageRes.status}).` }, 400);
    }
    const html = await pageRes.text();

    const description = extractDescription(html);
    const articleNumber = extractArticleNumber(html);
    const ean = extractEan(html);

    if (!description || !articleNumber || !ean) {
      return json(
        {
          error: 'Niet alle gegevens konden op deze pagina gevonden worden. Vul de ontbrekende velden handmatig aan.',
          description,
          articleNumber,
          ean,
          companyId,
          // Tijdelijke diagnose-info, te verwijderen zodra de extractie voor alle sites werkt.
          debug: {
            requestedUrl: parsed.toString(),
            finalUrl: pageRes.url,
            status: pageRes.status,
            htmlLength: html.length,
            hasPageTitleH1: /<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>/i.test(html),
            hasOgTitle: /<meta\s+property="og:title"/i.test(html),
            hasSkuMicrodata: /itemprop="sku"/i.test(html),
            hasJsonLdSku: /"sku"\s*:\s*"/i.test(html),
            htmlSnippet: html.slice(0, 800),
          },
        },
        200,
      );
    }

    return json({ description, articleNumber, ean, companyId }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Onbekende fout.' }, 500);
  }
});
