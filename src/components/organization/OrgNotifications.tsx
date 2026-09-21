import React, { useState, useEffect } from 'react';
import { Bell, Mail, Moon, Save, Loader2 } from 'lucide-react';
import { OrgNotificationConfig, NotificationType, EmailDigestFrequency } from '../../types';
import { useToast } from '../../context/ToastContext';

interface Props {
  config: OrgNotificationConfig;
  onSave: (config: OrgNotificationConfig) => Promise<void>;
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { label: string; description: string }> = {
  ANNOUNCEMENT: { label: 'Annonces', description: 'Tableau d’affichage et annonces à l’échelle de l’entreprise' },
  LEAVE: { label: 'Demandes de congé', description: 'Soumissions, approbations et rejets de congés' },
  ATTENDANCE: { label: 'Présence', description: 'Rappels de pointage, alertes de retard, pointages de sortie manqués' },
  REVIEW: { label: 'Évaluations de performance', description: 'Mises à jour des cycles d’évaluation et notifications d’appréciation' },
  SYSTEM: { label: 'Système', description: 'Alertes système, maintenance et notifications administrateur' },
  NEW_REGISTRATION: { label: 'Nouvelles inscriptions', description: 'Alertes d’inscription de nouvelles organisations' },
  UPGRADE_REQUEST: { label: 'Demandes de mise à niveau', description: 'Alertes de demande de mise à niveau d’organisation' },
};

const DIGEST_OPTIONS: { value: EmailDigestFrequency; label: string }[] = [
  { value: 'IMMEDIATE', label: 'Immédiat' },
  { value: 'DAILY', label: 'Résumé quotidien' },
  { value: 'WEEKLY', label: 'Résumé hebdomadaire' },
  { value: 'OFF', label: 'Désactivé' },
];

export const OrgNotifications: React.FC<Props> = ({ config, onSave }) => {
  const { showToast } = useToast();
  const [localConfig, setLocalConfig] = useState<OrgNotificationConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  const updateConfig = (updates: Partial<OrgNotificationConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const toggleType = (type: NotificationType) => {
    const enabled = localConfig.enabledTypes.includes(type);
    const next = enabled
      ? localConfig.enabledTypes.filter(t => t !== type)
      : [...localConfig.enabledTypes, type];
    updateConfig({ enabledTypes: next });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localConfig);
      setHasChanges(false);
    } catch {
      showToast('Échec de l’enregistrement de la configuration des notifications.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1 : Types de notifications activés */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <Bell size={18} className="text-primary" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Types de notifications activés</h3>
            <p className="text-[10px] text-slate-400 font-medium">Contrôlez les types de notifications actifs pour votre organisation</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {(Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[]).map(type => {
            const { label, description } = NOTIFICATION_TYPE_LABELS[type];
            const isEnabled = localConfig.enabledTypes.includes(type);
            return (
              <label key={type} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-100'}`}>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => toggleType(type)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">{label}</p>
                  <p className="text-[10px] text-slate-400">{description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Section 2 : Résumé par e-mail */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <Mail size={18} className="text-primary" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Fréquence des résumés par e-mail</h3>
            <p className="text-[10px] text-slate-400 font-medium">Fréquence par défaut des résumés par e-mail pour tous les utilisateurs</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DIGEST_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateConfig({ emailDigestFrequency: opt.value })}
                className={`py-3 px-4 rounded-xl text-xs font-semibold border transition-all ${localConfig.emailDigestFrequency === opt.value ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3 : Heures de silence */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <Moon size={18} className="text-primary" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Heures de silence</h3>
            <p className="text-[10px] text-slate-400 font-medium">Désactivez les notifications pendant les heures spécifiées</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
            <input
              type="checkbox"
              checked={localConfig.quietHoursEnabled}
              onChange={e => updateConfig({ quietHoursEnabled: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm font-semibold text-slate-700">Activer les heures de silence</span>
          </label>

          {localConfig.quietHoursEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 min-w-0">
                <label className="text-[10px] font-semibold text-slate-400 uppercase px-1">Heure de début</label>
                <input
                  type="time"
                  value={localConfig.quietHoursStart}
                  onChange={e => updateConfig({ quietHoursStart: e.target.value })}
                  className="w-full min-w-0 px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <label className="text-[10px] font-semibold text-slate-400 uppercase px-1">Heure de fin</label>
                <input
                  type="time"
                  value={localConfig.quietHoursEnd}
                  onChange={e => updateConfig({ quietHoursEnd: e.target.value })}
                  className="w-full min-w-0 px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bouton Enregistrer */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm shadow-lg hover:bg-primary-hover transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Enregistrer les paramètres de notification
          </button>
        </div>
      )}
    </div>
  );
};