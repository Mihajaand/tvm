import React, { useState, useEffect } from 'react';
import { Globe, Moon, MapPin, Building2, Tag, Sparkles } from 'lucide-react';
import { AppConfig } from '../../types';
import { COUNTRIES, getFlagEmoji } from '../../data/countries';
import { TIMEZONE_OPTIONS } from '../../constants';
import { apiClient } from '../../services/api.client';
import { supabase } from '../../services/supabase';
import { convertFileToWebP } from '../../utils/imageConvert';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => Promise<void>;
}

export const OrgSystem: React.FC<Props> = ({ config, onSave }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  /**
   * La page Organisation est accessible aux rôles ADMIN et RH (Sidebar.tsx). Accepter de publier le
   * nom et la marque de l'entreprise n'est pas une décision relevant d'un employé RH, donc le bloc de vitrine ci-dessous
   * est restreint de manière plus stricte que l'onglet qui l'entoure. Le déclencheur (trigger) de la base de données applique la même règle.
   */
  const isOrgAdmin = user?.role === 'ADMIN';
  const [orgData, setOrgData] = useState({ name: '', country: 'BD', address: '', logo: '', showOnLanding: false });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  /** Faux si le schéma est antérieur à la migration 0024 — masque le contrôle plutôt que de proposer un enregistrement voué à l'échec. */
  const [consentSupported, setConsentSupported] = useState(true);

  useEffect(() => {
    const loadOrgData = async () => {
      const orgId = apiClient.getOrganizationId();
      if (!orgId) return;
      /**
       * `show_on_landing` apparaît avec la migration 0024. Un déploiement qui ne l'a pas encore exécutée —
       * une installation auto-hébergée sur un schéma plus ancien, ou cette branche avant `supabase db push` —
       * renverrait sinon une erreur 42703 sur l'ensemble du select et afficherait un formulaire vide, perdant le
       * nom, le pays, l'adresse et le logo en plus de la colonne manquante. Repli sur la liste des colonnes
       * pré-0024 et considération du consentement comme non donné.
       */
      let { data: org, error } = await supabase
        .from('organizations')
        .select('name, country, address, logo, show_on_landing')
        .eq('id', orgId)
        .maybeSingle();

      if (error?.code === '42703') {
        ({ data: org, error } = await supabase
          .from('organizations')
          .select('name, country, address, logo')
          .eq('id', orgId)
          .maybeSingle());
        setConsentSupported(false);
      }

      if (error || !org) return;
      setOrgData({
        name: org.name || '',
        country: org.country || 'BD',
        address: org.address || '',
        logo: org.logo || '',
        showOnLanding: (org as { show_on_landing?: boolean }).show_on_landing === true,
      });
      if (org.logo) {
        const { data } = supabase.storage.from('org-logos').getPublicUrl(org.logo);
        setLogoPreview(data.publicUrl);
      }
    };
    loadOrgData();
  }, []);

  const handleChange = (key: keyof AppConfig, value: any) => {
    onSave({ ...config, [key]: value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("La taille du fichier du logo doit être inférieure à 2 Mo.", 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showToast("Le logo doit être un fichier image.", 'error');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOrgDataSave = async () => {
    const orgId = apiClient.getOrganizationId();
    if (!orgId) return;
    setIsSaving(true);
    try {
      let logoPath = orgData.logo;
      if (logoFile) {
        const webpLogo = await convertFileToWebP(logoFile);
        const fileName = `${orgId}/logo.webp`;
        const { error: uploadError } = await supabase.storage
          .from('org-logos')
          .upload(fileName, webpLogo, { upsert: true, contentType: 'image/webp' });
        if (uploadError) throw uploadError;
        logoPath = fileName;
      }
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgData.name,
          country: orgData.country,
          address: orgData.address,
          logo: logoPath,
          // Seul un ADMIN peut envoyer ceci. Les RH ne voient aucun contrôle, et le déclencheur le rejette de toute façon.
          ...(isOrgAdmin && consentSupported ? { show_on_landing: orgData.showOnLanding } : {}),
        })
        .eq('id', orgId);
      if (error) throw error;
      showToast('Détails de l’organisation mis à jour avec succès !', 'success');
    } catch (err) {
      console.error('Échec de la mise à jour de l’organisation :', err);
      showToast('Échec de la mise à jour des détails de l’organisation.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section Identité de l'organisation */}
      <div className="bg-white p-10 rounded-xl border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-8 duration-500">
         <div className="flex items-center justify-between">
           <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-3"><Building2 size={24} className="text-primary" /> Identité de l'organisation</h3>
           <button
             onClick={handleOrgDataSave}
             disabled={isSaving}
             className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-all disabled:opacity-50"
           >
             {isSaving ? 'Enregistrement...' : 'Enregistrer l\'organisation'}
           </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Nom de l'organisation</label>
               <input
                 type="text"
                 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                 placeholder="Entrez le nom de l'organisation"
                 value={orgData.name}
                 onChange={e => setOrgData({ ...orgData, name: e.target.value })}
               />
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Pays</label>
               <select
                 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                 value={orgData.country}
                 onChange={e => setOrgData({ ...orgData, country: e.target.value })}
               >
                 {COUNTRIES.map(country => (
                   <option key={country.code} value={country.code}>
                     {getFlagEmoji(country.code)} {country.name}
                   </option>
                 ))}
               </select>
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Logo de l'organisation</label>
               <div className="flex gap-4 items-center">
                 <input
                   type="file"
                   accept="image/*"
                   onChange={handleLogoChange}
                   className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                 />
                 {logoPreview && (
                   <img src={logoPreview} alt="Logo" className="h-12 w-12 object-contain rounded-xl border-2 border-blue-100" />
                 )}
               </div>
            </div>

            {/*
              Consentement de mise en avant — Addendum 4 §5b. Situé directement sous le champ du logo car il s'agit
              de l'écran unique où un administrateur consulte déjà les deux actifs sous licence :
              le nom de l'organisation ci-dessus et le logo immédiatement précédent.
            */}
            {isOrgAdmin && consentSupported && (
              <div className="md:col-span-2">
                <label
                  htmlFor="show-on-landing"
                  className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-blue-200 transition-colors"
                >
                  <input
                    id="show-on-landing"
                    type="checkbox"
                    checked={orgData.showOnLanding}
                    onChange={e => setOrgData({ ...orgData, showOnLanding: e.target.checked })}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-primary focus:ring-4 focus:ring-blue-50 cursor-pointer"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Sparkles size={15} className="text-primary shrink-0" />
                      Mettez-nous en avant sur le site Web OpenHRApp
                    </span>
                    <span className="block mt-1.5 text-xs font-medium text-slate-500 leading-relaxed">
                      Affichez le nom et le logo de votre organisation dans la vitrine de notre page d'accueil.
                      Nous ne les utiliserons nulle part ailleurs, et vous pouvez désactiver cette option à tout moment —
                      l'effet est immédiat. Désactivé par défaut.
                    </span>
                    {orgData.showOnLanding && !logoPreview && (
                      <span className="block mt-2 text-xs font-semibold text-amber-600">
                        Aucun logo téléchargé pour le moment — votre organisation apparaîtra sous forme de monogramme jusqu'à ce que vous en ajoutiez un.
                      </span>
                    )}
                  </span>
                </label>
              </div>
            )}

            <div className="space-y-1 md:col-span-2">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Adresse</label>
               <div className="relative">
                 <MapPin className="absolute left-5 top-5 text-slate-300" size={18} />
                 <textarea
                   className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all resize-none"
                   rows={2}
                   placeholder="Adresse de l'organisation"
                   value={orgData.address}
                   onChange={e => setOrgData({ ...orgData, address: e.target.value })}
                 />
               </div>
            </div>
         </div>
      </div>

      {/* Section Configuration du système */}
      <div className="bg-white p-10 rounded-xl border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-8 duration-500">
         <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-3"><Globe size={24} className="text-primary" /> Configuration du système</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Fuseau horaire</label>
               <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" value={config.timezone} onChange={e => handleChange('timezone', e.target.value)}>
                  {TIMEZONE_OPTIONS.map(group => (
                    <optgroup key={group.group} label={group.group}>
                      {group.zones.map(zone => (
                        <option key={zone.value} value={zone.value}>{zone.label}</option>
                      ))}
                    </optgroup>
                  ))}
               </select>
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Devise</label>
               <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none" value={config.currency} onChange={e => handleChange('currency', e.target.value)} />
            </div>
         </div>

         <div className="pt-8 border-t border-slate-50">
             <div className="grid grid-cols-1 gap-6">
               <div className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                   <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2"><Moon size={16} className="text-indigo-500"/> Automatisation des absences automatiques</h4>
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">Activer la fonctionnalité</span>
                      <input type="checkbox" className="w-5 h-5 accent-indigo-600 rounded-lg" checked={config.autoAbsentEnabled || false} onChange={e => handleChange('autoAbsentEnabled', e.target.checked)} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Heure limite (Fin de journée)</label>
                      <input type="time" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none" value={config.autoAbsentTime || '23:55'} onChange={e => handleChange('autoAbsentTime', e.target.value)} />
                      <p className="text-[9px] text-slate-400 mt-1">Si aucun pointage n'est enregistré d'ici cette heure, marquer comme ABSENT.</p>
                   </div>
               </div>
             </div>
         </div>
      </div>

      {/* Section Libellés des types de service / présence */}
      <div className="bg-white p-10 rounded-xl border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-8 duration-500">
         <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-3"><Tag size={24} className="text-primary" /> Libellés des types de service</h3>
         <p className="text-xs text-slate-400 -mt-4">Personnalisez les noms d'affichage de vos deux types de présence. Les valeurs internes restent inchangées.</p>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Type de service 1 (ex. Bureau, Siège, Télétravail)</label>
               <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none" value={config.dutyLabel1 || 'Office'} onChange={e => handleChange('dutyLabel1', e.target.value)} placeholder="Bureau" />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Type de service 2 (ex. Usine, Terrain, Sur site)</label>
               <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none" value={config.dutyLabel2 || 'Factory'} onChange={e => handleChange('dutyLabel2', e.target.value)} placeholder="Usine" />
            </div>
         </div>
      </div>
    </div>
  );
};