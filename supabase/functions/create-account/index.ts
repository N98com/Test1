// Edge Function: create-account
// Laat een ingelogde Admin een nieuw account uitnodigen (via e-mail) en
// direct een rol toewijzen. Gebruikt de service-role sleutel, die alleen
// hier server-side bestaat en nooit naar de browser gaat.

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client "als de aanroeper" om te checken wie dit is en welke rol die heeft.
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
      return json({ error: 'Alleen admins kunnen accounts aanmaken.' }, 403);
    }

    const body = await req.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const role = body?.role === 'admin' ? 'admin' : 'user';

    if (!email || !email.includes('@')) {
      return json({ error: 'Vul een geldig e-mailadres in.' }, 400);
    }

    // Deze client heeft volledige rechten (service role) en omzeilt RLS bewust,
    // alleen voor de twee acties hieronder.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);
    if (inviteError || !invited.user) {
      return json({ error: inviteError?.message ?? 'Uitnodigen is mislukt.' }, 400);
    }

    if (role === 'admin') {
      const { error: roleError } = await adminClient
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', invited.user.id);
      if (roleError) {
        return json({ error: `Account uitgenodigd, maar rol instellen mislukte: ${roleError.message}` }, 500);
      }
    }

    return json({ success: true }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Onbekende fout.' }, 500);
  }
});
