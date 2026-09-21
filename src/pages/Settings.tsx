import React, { useState, useEffect } from 'react';
import {
  User, ArrowLeft, Save, RefreshCw, Mail, UserCheck, Hash, Lock, Key, Eye, EyeOff,
  Send, Loader2, CheckCircle, AlertCircle, MessageSquare, Clock, Users
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { User as UserType, Employee, Shift } from '../types';
import { ThemeSelector } from '../components/settings/ThemeSelector';
import { AdminVerificationPanel } from '../components/admin/AdminVerificationPanel';
import HelpButton from '../components/onboarding/HelpButton';
import { ReEnableSetupGuide } from '../components/onboarding/SetupChecklist';
import { contactService } from '../services/contact.service';
import { useToast } from '../context/ToastContext';

interface SettingsProps {
  user: UserType;
  onBack?: () => void;
}

const ProfileSkeleton = () => (
  <div className="max-w-3xl animate-pulse">
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10 space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-50 pb-8">
        <div className="w-20 h-20 bg-slate-100 rounded-xl"></div>
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-slate-100 rounded-lg w-1/3"></div>
          <div className="h-4 bg-slate-50 rounded-lg w-1/4"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-slate-50 rounded w-1/4 ml-1"></div>
            <div className="h-14 bg-slate-50 border border-slate-100 rounded-2xl w-full"></div>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-4">
        <div className="h-14 bg-slate-100 rounded-xl w-40"></div>
      </div>
    </div>
  </div>
);

const Settings: React.FC<SettingsProps> = ({ user, onBack }) => {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Partial<Employee> & { managerName?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // État du changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // État du formulaire de contact
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const [contactResult, setContactResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [contactInitialized, setContactInitialized] = useState(false);

  const isAdmin = user.role === 'ADMIN';
  const [myShift, setMyShift] = useState<Shift | null>(null);
  const [myTeamName, setMyTeamName] = useState<string>('Aucune équipe');

  useEffect(() => {
    const load = async () => {
      try {
        const [employees, shifts, teams] = await Promise.all([
          hrService.getEmployees(),
          hrService.getShifts(),
          hrService.getTeams()
        ]);
        const myData = employees.find(e => e.id === user.id);

        if (myData) {
          const manager = employees.find(e => e.id === myData.lineManagerId);
          setProfile({
            ...myData,
            email: myData.email || user.email,
            managerName: manager ? manager.name : 'Aucun responsable direct'
          });

          // Résolution du shift
          if (myData.shiftId) {
            const shift = shifts.find(s => s.id === myData.shiftId);
            setMyShift(shift || null);
          }

          // Résolution de l'équipe
          if (myData.teamId) {
            const team = teams.find(t => t.id === myData.teamId);
            setMyTeamName(team ? team.name : 'Aucune équipe');
          }
        } else {
          setProfile({
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            designation: user.designation,
            employeeId: user.employeeId,
            managerName: 'Aucun responsable direct'
          } as any);
        }
      } catch (err) {
        console.error("Échec du chargement des paramètres :", err);
      }
    };
    load();
  }, [user.id, user.name, user.email, user.role, user.department, user.designation, user.employeeId]);

  // Pré-remplissage du formulaire de contact avec les informations de l'utilisateur
  useEffect(() => {
    if (!contactInitialized && user.name && user.email) {
      setContactForm(prev => ({ ...prev, name: user.name || '', email: user.email || '' }));
      setContactInitialized(true);
    }
  }, [user.name, user.email, contactInitialized]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactResult(null);

    if (!contactForm.message.trim()) {
      setContactResult({ type: 'error', message: 'Veuillez saisir un message.' });
      return;
    }

    setIsContactSubmitting(true);
    try {
      const response = await contactService.submitContactForm(contactForm);
      if (response.success) {
        setContactResult({ type: 'success', message: response.message });
        setContactForm(prev => ({ ...prev, subject: '', message: '' }));
      } else {
        setContactResult({ type: 'error', message: response.message });
      }
    } catch {
      setContactResult({ type: 'error', message: 'Une erreur est survenue. Veuillez réessayer plus tard.' });
    } finally {
      setIsContactSubmitting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (profile) {
        const updatePayload: any = {
           name: profile.name,
           email: profile.email
        };

        if (newPassword) {
          if (!currentPassword) {
            showToast("Veuillez saisir votre mot de passe actuel pour modifier votre mot de passe.", 'warning');
            setIsSaving(false);
            return;
          }
          if (newPassword.length < 8) {
            showToast("Le mot de passe doit contenir au moins 8 caractères.", 'warning');
            setIsSaving(false);
            return;
          }
          if (newPassword !== confirmPassword) {
            showToast("Les mots de passe ne correspondent pas.", 'warning');
            setIsSaving(false);
            return;
          }
          updatePayload.password = newPassword;
          updatePayload.oldPassword = currentPassword;
        }

        await hrService.updateProfile(user.id, updatePayload);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Profil mis à jour avec succès.', 'success');
        window.location.reload();
      }
    } catch (e: any) {
      showToast(`Échec de l'opération : ${e.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><ArrowLeft size={20} /></button>}
          <div>
            <div className="flex items-center gap-2"><h1 className="text-3xl font-bold text-slate-900 tracking-tight">Système et profil</h1><HelpButton helpPointId="settings.profile" /></div>
            <p className="text-slate-500 font-medium">Gérez vos préférences, l'apparence et vos données personnelles</p>
          </div>
        </div>
      </header>

      {/* Module de sélection du thème */}
      <div className="max-w-3xl">
        <ThemeSelector />
      </div>

      {!profile ? (
        <ProfileSkeleton />
      ) : (
        <div className="max-w-3xl">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10 space-y-8 animate-in slide-in-from-left-4">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-8">
              <div className="w-20 h-20 bg-primary-light rounded-xl flex items-center justify-center text-primary font-semibold text-2xl uppercase relative overflow-hidden">
                 {profile.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : profile.name?.[0]}
              </div>
              <div>
                 <h3 className="text-xl font-semibold text-slate-900">{profile.name}</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{profile.designation} • {profile.department}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Identifiant d'employé officiel</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" readOnly className="w-full pl-12 pr-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-500 cursor-not-allowed" value={profile.employeeId || 'Non assigné'} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Rattaché(e) à</label>
                <div className="relative">
                  <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" readOnly className="w-full pl-12 pr-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-500 cursor-not-allowed" value={profile.managerName || 'Aucun responsable direct'} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Équipe</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" readOnly className="w-full pl-12 pr-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-500 cursor-not-allowed" value={myTeamName} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Shift assigné</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" readOnly className="w-full pl-12 pr-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-500 cursor-not-allowed" value={myShift ? `${myShift.name} (${myShift.startTime} - ${myShift.endTime})` : 'Aucun shift assigné'} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light" value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">E-mail professionnel</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="email" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light" value={profile.email || user.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section mot de passe */}
            <div className="pt-6 border-t border-slate-50">
               <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-tight flex items-center gap-2 mb-4">
                  <Lock size={16} className="text-primary"/> Paramètres de sécurité
               </h4>
               <div className="space-y-1.5 mb-6">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Mot de passe actuel</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Entrez le mot de passe actuel"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                      />
                    </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Nouveau mot de passe</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Laisser vide pour conserver l'actuel"
                        className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                        {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Confirmer le nouveau mot de passe</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Confirmer les modifications"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light" 
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
               </div>
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={handleSave} disabled={isSaving} className="px-12 py-5 bg-primary text-white rounded-xl font-semibold uppercase text-xs tracking-widest shadow-xl transition-all flex items-center gap-3 hover:bg-primary-hover">
                {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} 
                Mettre à jour mes informations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panneau de vérification administrateur */}
      {isAdmin && (
        <div className="max-w-3xl animate-in slide-in-from-bottom-8">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2">
            <UserCheck size={24} className="text-emerald-500" /> Outils d'administration
          </h3>
          <AdminVerificationPanel />
        </div>
      )}

      {/* Réactiver le guide de configuration (affiché uniquement s'il a été masqué) */}
      <ReEnableSetupGuide userRole={user.role} />

      {/* Contacter le support */}
      <div className="max-w-3xl animate-in slide-in-from-bottom-8">
        <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2">
          <MessageSquare size={24} className="text-primary" /> Contacter le support
        </h3>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10 space-y-6">
          <p className="text-sm text-slate-500">Vous avez une question, une remarque ou besoin d'aide ? Envoyez-nous un message et nous vous répondrons dans les plus brefs délais.</p>
          <form onSubmit={handleContactSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Nom</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Sujet</label>
              <input
                type="text"
                value={contactForm.subject}
                onChange={e => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Quel est l'objet de votre demande ?"
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                value={contactForm.message}
                onChange={e => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Dites-nous ce qui vous préoccupe..."
                rows={4}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light resize-none"
              />
            </div>

            {contactResult && (
              <div className={`flex items-start gap-3 p-4 rounded-2xl text-sm font-medium ${
                contactResult.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {contactResult.type === 'success' ? <CheckCircle size={18} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />}
                <span>{contactResult.message}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isContactSubmitting}
                className="px-10 py-4 bg-primary text-white rounded-xl font-semibold uppercase text-xs tracking-widest shadow-xl transition-all flex items-center gap-3 hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isContactSubmitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Envoi en cours...</>
                ) : (
                  <><Send size={18} /> Envoyer le message</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;