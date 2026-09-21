// OpenHRApp — Fonction Edge de création d'organisation par le Super Admin
// Appelable uniquement par le SUPER_ADMIN. Utilise le rôle de service pour créer l'utilisateur d'authentification + l'organisation.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'Méthode non autorisée');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonError(401, 'En-tête d\'autorisation manquant');

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user: caller } } = await anonClient.auth.getUser();
  if (!caller) return jsonError(401, 'Jeton invalide');

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', caller.id).single();
  if (callerProfile?.role !== 'SUPER_ADMIN') return jsonError(403, 'Seul le SUPER_ADMIN peut créer des organisations');

  try {
    const body = await req.json();
    const { name, address, subscriptionStatus, adminName, adminEmail, adminPassword } = body;

    if (!name || !adminEmail || !adminPassword || !adminName) {
      return jsonError(400, 'Champs obligatoires manquants : name, adminName, adminEmail, adminPassword');
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Création de l'organisation
    const { data: org, error: orgErr } = await adminClient
      .from('organizations')
      .insert({
        name,
        address: address || '',
        subscription_status: subscriptionStatus || 'TRIAL',
        trial_end_date: (subscriptionStatus === 'ACTIVE') ? null : trialEndDate.toISOString(),
      })
      .select('id')
      .single();
    if (orgErr || !org) return jsonError(400, 'Échec de la création de l\'organisation : ' + orgErr?.message);

    // Création de l'utilisateur d'authentification
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: adminName },
    });
    if (authErr || !authData.user) {
      await adminClient.from('organizations').delete().eq('id', org.id);
      return jsonError(400, 'Échec de la création de l\'utilisateur administrateur : ' + authErr?.message);
    }

    const randId = Math.floor(1000 + Math.random() * 9000);
    const ts = Date.now().toString().slice(-4);

    // Création du profil
    const { error: profileErr } = await adminClient.from('profiles').insert({
      id: authData.user.id,
      organization_id: org.id,
      name: adminName,
      role: 'ADMIN',
      employee_id: `ADM-${ts}-${randId}`,
      designation: 'System Admin',
      department: 'Management',
      verified: true,
    });
    if (profileErr) console.error('[SUPERADMIN-CREATE-ORG] Erreur de profil (non fatale) :', profileErr.message);

    // Paramètres par défaut
    try {
      await adminClient.from('settings').insert([
        { organization_id: org.id, key: 'app_config', value: { companyName: name, workingDays: ['Monday','Tuesday','Wednesday','Thursday','Sunday'], officeStartTime: '09:00', officeEndTime: '18:00' } },
        { organization_id: org.id, key: 'departments', value: ['Engineering','HR','Sales','Marketing'] },
        { organization_id: org.id, key: 'designations', value: ['Manager','Lead','Associate','Intern'] },
      ]);
    } catch (e) { console.warn('[SUPERADMIN-CREATE-ORG] Échec de l\'initialisation des paramètres (non fatal) :', e); }

    return new Response(JSON.stringify({ success: true, organizationId: org.id, message: 'Organisation créée avec succès' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return jsonError(500, 'Erreur interne du serveur : ' + (err as Error).message);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ success: false, message }), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}