import React, { useEffect, useMemo, useState } from 'react';
import {
  Mail, Send, Eye, Users, Building2, AlertTriangle, CheckCircle2, XCircle,
  Clock, RefreshCw, History, Pencil, X, Loader2, Info, FileText,
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'password_reset',
    label: 'Avis de réinitialisation du mot de passe',
    subject: 'Action requise : Réinitialisez votre mot de passe OpenHRApp',
    body: `<p>Bonjour {{name}},</p>
<p>Nous avons récemment migré notre plateforme et votre compte nécessite une réinitialisation de mot de passe avant de pouvoir vous connecter.</p>
<p>Veuillez cliquer sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien est unique à votre compte et expire dans 24 heures.</p>
<p><a href="{{reset_link}}" style="background:#4f46e5;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Réinitialiser mon mot de passe</a></p>
<p>Si vous n'avez pas fait cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
<p>Cordialement,<br/>L'équipe OpenHRApp</p>`,
  },
  {
    id: 'newsletter',
    label: 'Lettre d’information (Newsletter)',
    subject: 'Mise à jour mensuelle d’OpenHRApp — [Mois Année]',
    body: `<p>Bonjour {{name}},</p>
<h2>Nouveautés de ce mois-ci</h2>
<p>Voici les dernières mises à jour et améliorations que nous avons déployées :</p>
<ul>
  <li><strong>Fonctionnalité :</strong> Décrivez la nouvelle fonctionnalité ici.</li>
  <li><strong>Correctif :</strong> Décrivez le correctif ici.</li>
  <li><strong>Amélioration :</strong> Décrivez l'amélioration ici.</li>
</ul>
<h2>Prochainement</h2>
<p>Partagez les fonctionnalités ou projets à venir ici.</p>
<p>Merci d'utiliser OpenHRApp. Nous nous engageons à rendre la gestion des ressources humaines simple pour votre équipe.</p>
<p>Cordialement,<br/>L'équipe OpenHRApp</p>`,
  },
  {
    id: 'maintenance',
    label: 'Maintenance du système',
    subject: 'Maintenance planifiée : OpenHRApp sera indisponible le [Date]',
    body: `<p>Bonjour {{name}},</p>
<p>Nous souhaitons vous informer à l'avance d'une maintenance planifiée sur la plateforme OpenHRApp.</p>
<p><strong>Date :</strong> [Date]<br/>
<strong>Heure :</strong> [Heure de début] – [Heure de fin] ([Fuseau horaire])<br/>
<strong>Indisponibilité prévue :</strong> [Durée]</p>
<p>Pendant cette période, la plateforme sera temporairement inaccessible. Veuillez prendre vos dispositions et enregistrer tout travail en cours avant le début de la maintenance.</p>
<p>Nous vous prions de nous excuser pour la gêne occasionnée et vous remercions de votre patience.</p>
<p>Cordialement,<br/>L'équipe OpenHRApp</p>`,
  },
  {
    id: 'announcement',
    label: 'Annonce générale',
    subject: 'Annonce importante d’OpenHRApp',
    body: `<p>Bonjour {{name}},</p>
<p>Nous avons une mise à jour importante à partager avec vous.</p>
<p>[Rédigez votre annonce ici.]</p>
<p>Si vous avez des questions, n'hésitez pas à nous contacter à l'adresse <a href="mailto:support@openhrapp.com">support@openhrapp.com</a>.</p>
<p>Cordialement,<br/>L'équipe OpenHRApp</p>`,
  },
  {
    id: 'welcome',
    label: 'Bienvenue / Intégration (Onboarding)',
    subject: 'Bienvenue sur OpenHRApp, {{name}} !',
    body: `<p>Bonjour {{name}},</p>
<p>Bienvenue sur <strong>OpenHRApp</strong> — votre plateforme de gestion des ressources humaines tout-en-un.</p>
<p>Voici comment démarrer :</p>
<ol>
  <li><strong>Connectez-vous</strong> sur <a href="https://app.openhrapp.com">app.openhrapp.com</a></li>
  <li><strong>Complétez votre profil</strong> — ajoutez vos informations et votre photo</li>
  <li><strong>Explorez le tableau de bord</strong> — consultez les présences, les congés et les annonces</li>
</ol>
<p>Si vous avez besoin d'aide, contactez votre administrateur RH ou écrivez-nous à <a href="mailto:support@openhrapp.com">support@openhrapp.com</a>.</p>
<p>Cordialement,<br/>L'équipe OpenHRApp</p>`,
  },
];
import RichTextEditor from '../blog/RichTextEditor';
import {
  superAdminService,
  type BulkEmailFilter,
  type BulkCampaignSummary,
  type BulkCampaignDetailRow,
} from '../../services/superadmin.service';
import { Organization, SubscriptionStatus } from '../../types';

interface BulkEmailManagerProps {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

type Audience = 'ALL_ADMINS' | 'ALL_USERS' | 'ORG' | 'BY_SUBSCRIPTION';
type RolesScope = 'ALL' | 'ADMINS';
type View = 'compose' | 'history';

const SUBSCRIPTION_OPTIONS: SubscriptionStatus[] = ['TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'AD_SUPPORTED'];

const BulkEmailManager: React.FC<BulkEmailManagerProps> = ({ onMessage }) => {
  const [view, setView] = useState<View>('compose');

  // Compose state
  const [audience, setAudience] = useState<Audience>('ALL_ADMINS');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [orgRolesScope, setOrgRolesScope] = useState<RolesScope>('ALL');
  const [subStatuses, setSubStatuses] = useState<SubscriptionStatus[]>(['TRIAL']);
  const [subRolesScope, setSubRolesScope] = useState<RolesScope>('ADMINS');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [preview, setPreview] = useState<{ count: number; sampleEmails: string[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // History state
  const [campaigns, setCampaigns] = useState<BulkCampaignSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<BulkCampaignSummary | null>(null);
  const [detailRows, setDetailRows] = useState<BulkCampaignDetailRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setOrgsLoading(true);
    superAdminService.getAllOrganizations().then(o => {
      if (alive) setOrgs(o);
      setOrgsLoading(false);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (view === 'history') loadHistory();
  }, [view]);

  // Reset preview whenever audience inputs change
  useEffect(() => {
    setPreview(null);
  }, [audience, selectedOrgId, orgRolesScope, subStatuses, subRolesScope]);

  const buildFilter = (): BulkEmailFilter | null => {
    if (audience === 'ALL_ADMINS') return { kind: 'ALL_ADMINS' };
    if (audience === 'ALL_USERS') return { kind: 'ALL_USERS' };
    if (audience === 'ORG') {
      if (!selectedOrgId) return null;
      return { kind: 'ORG', organizationId: selectedOrgId, rolesScope: orgRolesScope };
    }
    if (audience === 'BY_SUBSCRIPTION') {
      if (subStatuses.length === 0) return null;
      return { kind: 'BY_SUBSCRIPTION', statuses: subStatuses, rolesScope: subRolesScope };
    }
    return null;
  };

  const audienceLabel = useMemo(() => {
    if (audience === 'ALL_ADMINS') return 'Tous les administrateurs d’organisations (rôles ADMIN + RH)';
    if (audience === 'ALL_USERS') return 'Tous les utilisateurs enregistrés (hors Super Administrateurs)';
    if (audience === 'ORG') {
      const o = orgs.find(x => x.id === selectedOrgId);
      const role = orgRolesScope === 'ADMINS' ? 'les administrateurs (ADMIN + RH)' : 'les utilisateurs';
      return o ? `${role} de ${o.name}` : 'Organisation spécifique';
    }
    if (audience === 'BY_SUBSCRIPTION') {
      const role = subRolesScope === 'ADMINS' ? 'les administrateurs (ADMIN + RH)' : 'les utilisateurs';
      return `${role} dans les organisations avec le statut : ${subStatuses.join(', ') || '—'}`;
    }
    return '';
  }, [audience, orgs, selectedOrgId, orgRolesScope, subStatuses, subRolesScope]);

  const handlePreview = async () => {
    const filter = buildFilter();
    if (!filter) {
      onMessage({ type: 'error', text: 'Veuillez d’abord sélectionner l’audience' });
      return;
    }
    setPreviewing(true);
    try {
      const result = await superAdminService.previewBulkRecipients(filter);
      setPreview(result);
      if (result.count === 0) {
        onMessage({ type: 'error', text: 'Aucun destinataire ne correspond à cette audience' });
      }
    } catch (e: any) {
      onMessage({ type: 'error', text: e?.message ? `Échec de l'aperçu : ${e.message}` : 'Échec de l’aperçu. Vérifiez la console pour plus de détails.' });
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    const filter = buildFilter();
    if (!filter) return;
    setSending(true);
    try {
      const result = await superAdminService.sendBulkEmail(filter, subject, body);
      if (result.success) {
        onMessage({ type: 'success', text: result.message });
        setSubject('');
        setBody('');
        setPreview(null);
      } else {
        onMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      console.error('[BulkEmail] sendBulkEmail failed:', err);
      onMessage({ type: 'error', text: 'Échec de l’envoi. Vérifiez la console pour plus de détails.' });
    } finally {
      setSending(false);
      setConfirmOpen(false);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const list = await superAdminService.getRecentBulkCampaigns(30);
      setCampaigns(list);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openDetail = async (c: BulkCampaignSummary) => {
    setDetailCampaign(c);
    setDetailLoading(true);
    try {
      const rows = await superAdminService.getBulkCampaignDetail(c.campaignId);
      setDetailRows(rows);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailCampaign(null);
    setDetailRows([]);
  };

  const toggleSubStatus = (s: SubscriptionStatus) => {
    setSubStatuses(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
  };

  const canSend =
    !!preview && preview.count > 0 && subject.trim().length > 0 && body.trim().length > 0 && !sending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Mail size={22} className="text-primary" />
            E-mails en masse
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Diffusez des annonces, des alertes ou des avertissements aux administrateurs ou utilisateurs d'organisations sur l'ensemble de la plateforme.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button
            onClick={() => setView('compose')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              view === 'compose' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Pencil size={16} /> Rédiger
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              view === 'history' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History size={16} /> Historique
          </button>
        </div>
      </div>

      {view === 'compose' && (
        <div className="space-y-6">
          {/* Sélecteur d'audience */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Users size={18} />
              <h4 className="font-bold">Audience</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { v: 'ALL_ADMINS', label: 'Tous les admins d’org', desc: 'Chaque ADMIN de toutes les organisations' },
                { v: 'ALL_USERS', label: 'Tous les utilisateurs', desc: 'Chaque utilisateur enregistré (hors Super Admins)' },
                { v: 'ORG', label: 'Organisation spécifique', desc: 'Choisissez une org et ciblez ses admins ou utilisateurs' },
                { v: 'BY_SUBSCRIPTION', label: 'Par statut d’abonnement', desc: 'Ciblez les orgs en ESSAI / EXPIRÉ / etc.' },
              ] as Array<{ v: Audience; label: string; desc: string }>).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setAudience(opt.v)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    audience === opt.v
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-slate-900 text-sm">{opt.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>

            {audience === 'ORG' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Organisation</label>
                  <select
                    value={selectedOrgId}
                    onChange={e => setSelectedOrgId(e.target.value)}
                    disabled={orgsLoading}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="">{orgsLoading ? 'Chargement…' : 'Sélectionnez une organisation'}</option>
                    {orgs.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} {o.userCount ? `(${o.userCount} utilisateurs)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <ScopeRadio value={orgRolesScope} onChange={setOrgRolesScope} />
              </div>
            )}

            {audience === 'BY_SUBSCRIPTION' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">Statuts d'abonnement</label>
                  <div className="flex flex-wrap gap-2">
                    {SUBSCRIPTION_OPTIONS.map(s => {
                      const active = subStatuses.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSubStatus(s)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            active
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ScopeRadio value={subRolesScope} onChange={setSubRolesScope} />
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-xs">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                Les destinataires sont tous les utilisateurs enregistrés correspondant à l'audience ci-dessus (hors Super Administrateurs). Le statut de vérification est ignoré — les administrateurs/RH nouvellement inscrits qui n'ont pas cliqué sur leur lien de vérification restent joignables. La liste est dédupliquée par e-mail.
              </span>
            </div>
          </div>

          {/* Carte de rédaction */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Pencil size={18} />
              <h4 className="font-bold">Message</h4>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Modèle</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedTemplate}
                    onChange={e => {
                      const id = e.target.value;
                      setSelectedTemplate(id);
                      if (id) {
                        const tpl = EMAIL_TEMPLATES.find(t => t.id === id);
                        if (tpl) { setSubject(tpl.subject); setBody(tpl.body); }
                      }
                    }}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm appearance-none"
                  >
                    <option value="">— Commencer de zéro —</option>
                    {EMAIL_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                {selectedTemplate && (
                  <button
                    onClick={() => { setSelectedTemplate(''); setSubject(''); setBody(''); }}
                    className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                    title="Effacer le modèle"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Sélectionnez un modèle pour pré-remplir l'objet et le corps. Vous pouvez les modifier librement ensuite. Utilisez <code className="bg-slate-100 px-1 rounded">{"{{name}}"}</code> pour le prénom du destinataire et <code className="bg-slate-100 px-1 rounded">{"{{reset_link}}"}</code> pour un lien unique de réinitialisation de mot de passe.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Objet</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value.slice(0, 200))}
                placeholder="ex. Important : maintenance planifiée ce week-end"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-1">{subject.length}/200</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Corps</label>
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Rédigez votre annonce, avertissement ou alerte ici. La mise en forme et les liens sont pris en charge."
              />
            </div>
          </div>

          {/* Aperçu + envoi */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Eye size={18} />
              <h4 className="font-bold">Aperçu des destinataires</h4>
            </div>
            <p className="text-sm text-slate-500">
              Audience : <span className="font-medium text-slate-700">{audienceLabel}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePreview}
                disabled={previewing}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-60"
              >
                {previewing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {previewing ? 'Calcul en cours…' : 'Aperçu des destinataires'}
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={!canSend}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} /> Envoyer à {preview?.count ?? '—'} destinataire{preview?.count === 1 ? '' : 's'}
              </button>
            </div>

            {preview && (
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{preview.count}</span>
                  <span className="text-sm text-slate-500">destinataire{preview.count === 1 ? '' : 's'}</span>
                </div>
                {preview.sampleEmails.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500">
                    Exemple : {preview.sampleEmails.join(', ')}
                    {preview.count > preview.sampleEmails.length && ` …et ${preview.count - preview.sampleEmails.length} de plus`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <History size={18} /> Campagnes récentes
            </h4>
            <button
              onClick={loadHistory}
              disabled={historyLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold flex items-center gap-1 hover:bg-slate-200"
            >
              {historyLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Actualiser
            </button>
          </div>

          {historyLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Chargement…</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Aucune campagne en masse pour le moment.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-3">Envoyé le</th>
                    <th className="py-2 pr-3">Objet</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2 pr-3">Envoyés</th>
                    <th className="py-2 pr-3">Échecs</th>
                    <th className="py-2 pr-3">En attente</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.campaignId} className="border-b border-slate-50">
                      <td className="py-2 pr-3 text-slate-600 whitespace-nowrap">
                        {c.sentAt ? new Date(c.sentAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-3 text-slate-900 font-medium max-w-xs truncate">{c.subject}</td>
                      <td className="py-2 pr-3 text-slate-600">{c.totalRows}</td>
                      <td className="py-2 pr-3 text-emerald-700 font-medium">{c.sentCount}</td>
                      <td className={`py-2 pr-3 font-medium ${c.failedCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {c.failedCount}
                      </td>
                      <td className={`py-2 pr-3 font-medium ${c.pendingCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {c.pendingCount}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => openDetail(c)}
                          className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                        >
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmation d'envoi */}
      {confirmOpen && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle size={20} />
              <h4 className="font-bold text-slate-900">Confirmer l'envoi en masse</h4>
            </div>
            <p className="text-sm text-slate-600">
              Vous êtes sur le point d'envoyer un e-mail à <b>{preview.count}</b> destinataire{preview.count === 1 ? '' : 's'} (
              {audienceLabel}). Cette action est irréversible.
            </p>
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <div><span className="font-bold text-slate-700">Objet :</span> {subject}</div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={sending}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-60"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? 'Mise en file d’attente…' : 'Oui, envoyer maintenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détail de la campagne */}
      {detailCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900">{detailCampaign.subject}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {detailCampaign.totalRows} destinataires · {detailCampaign.sentCount} envoyés ·{' '}
                  {detailCampaign.failedCount} échecs · {detailCampaign.pendingCount} en attente
                </p>
              </div>
              <button onClick={closeDetail} className="p-2 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {detailLoading ? (
                <div className="text-center py-8 text-slate-400 text-sm">Chargement…</div>
              ) : detailRows.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Aucune ligne.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-100">
                      <th className="py-2 pr-3">Destinataire</th>
                      <th className="py-2 pr-3">Statut</th>
                      <th className="py-2 pr-3">Envoyé le</th>
                      <th className="py-2">Erreur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map(r => (
                      <tr key={r.id} className="border-b border-slate-50">
                        <td className="py-2 pr-3 text-slate-700">{r.recipientEmail}</td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">
                          {r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-2 text-red-600 text-xs max-w-xs truncate">{r.errorMessage || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScopeRadio: React.FC<{ value: RolesScope; onChange: (v: RolesScope) => void }> = ({ value, onChange }) => (
  <div className="flex items-center gap-3 text-sm">
    <span className="text-xs font-bold text-slate-600">Portée :</span>
    {(['ALL', 'ADMINS'] as RolesScope[]).map(v => (
      <label key={v} className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="radio"
          checked={value === v}
          onChange={() => onChange(v)}
          className="accent-primary"
        />
        <span>{v === 'ALL' ? 'Tous les utilisateurs' : 'Admins uniquement'}</span>
      </label>
    ))}
  </div>
);

const StatusBadge: React.FC<{ status: 'PENDING' | 'SENT' | 'FAILED' }> = ({ status }) => {
  const map = {
    SENT: { cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={12} /> },
    FAILED: { cls: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
    PENDING: { cls: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
  } as const;
  const m = map[status];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${m.cls}`}>
      {m.icon} {status}
    </span>
  );
};

// Suppression de l'avertissement pour Building2 non utilisé (conservé pour une future icône d'audience)
void Building2;

export default BulkEmailManager;