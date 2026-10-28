// Edge Function: update-account
// Laat een ingelogde gebruiker het eigen e-mailadres en/of wachtwoord wijzigen,
// na controle van het huidige wachtwoord. Loopt via de service-role sleutel
// zodat er geen bevestigingsmail nodig is (e-mail wordt direct als bevestigd
// gezet) en het e-mailadres in profiles meteen mee verandert.

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

    // Client "als de aanroeper" om te checken wie dit is.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user?.email) {
      return json({ error: 'Sessie ongeldig, log opnieuw in.' }, 401);
    }
    const user = userData.user;

    const body = await req.json().catch(() => null);
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const newEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const newPassword = typeof body?.password === 'string' ? body.password : '';

    if (!newEmail && !newPassword) {
      return json({ error: 'Geen wijziging opgegeven.' }, 400);
    }
    if (newEmail && !newEmail.includes('@')) {
      return json({ error: 'Vul een geldig e-mailadres in.' }, 400);
    }
    if (newPassword && newPassword.length < 6) {
      return json({ error: 'Wachtwoord moet minimaal 6 tekens zijn.' }, 400);
    }

    // Huidige wachtwoord controleren, zodat iemand die toevallig achter een
    // ingelogde computer zit het account niet kan overnemen.
    const checkClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { error: checkError } = await checkClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (checkError) {
      return json({ error: 'Huidig wachtwoord is onjuist.' }, 400);
    }

    // Deze client heeft volledige rechten (service role) en omzeilt RLS bewust,
    // alleen voor de acties hieronder.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      ...(newEmail ? { email: newEmail, email_confirm: true } : {}),
      ...(newPassword ? { password: newPassword } : {}),
    });
    if (updateError) {
      return json({ error: updateError.message }, 400);
    }

    if (newEmail) {
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', user.id);
      if (profileError) {
        return json({ error: `E-mailadres gewijzigd, maar profiel bijwerken mislukte: ${profileError.message}` }, 500);
      }
    }

    // Logregels voor "Logs". Via de service role kent de database de aanroeper
    // niet, dus die wordt hier zelf meegegeven. Mislukt het loggen, dan is de
    // wijziging toch al doorgevoerd: niet als fout teruggeven.
    const logRows = [];
    if (newEmail) {
      logRows.push({ action: 'email_changed', target: newEmail, details: { from: user.email, to: newEmail } });
    }
    if (newPassword) {
      logRows.push({ action: 'password_changed', target: newEmail || user.email, details: {} });
    }
    await adminClient
      .from('activity_log')
      .insert(logRows.map((row) => ({ ...row, actor_id: user.id, actor_email: newEmail || user.email })));

    return json({ success: true }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Onbekende fout.' }, 500);
  }
});
