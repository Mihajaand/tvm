
declare global {
  interface Window {
    PasswordCredential: typeof PasswordCredential;
  }
  interface PasswordCredentialData {
    id: string;
    password: string;
    name?: string;
    iconURL?: string;
  }
  class PasswordCredential extends Credential {
    constructor(data: PasswordCredentialData);
    readonly password: string;
  }
}

import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, RefreshCw, Eye, EyeOff, Download, X, Share, MoreVertical, RotateCcw, Building2, Send, Home, CheckCircle2 } from 'lucide-react';
import { hrService } from '../services/hrService';
import { authService } from '../services/auth.service';
import { isSupabaseConfigured } from '../services/supabase';
import { useToast } from '../context/ToastContext';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onRegisterClick: () => void;
  onBackToLanding?: () => void;
  initError?: string;
}

const BrandLogo = () => (
  <div className="flex flex-col items-center justify-center gap-6">
    <div className="relative w-24 h-24 md:w-32 md:h-32">
      <div className="absolute inset-0 bg-primary-light blur-[50px] rounded-full -z-10 opacity-50"></div>
      <div className="relative w-full h-full bg-white rounded-[1.75rem] shadow-xl flex items-center justify-center p-4 border-2 border-primary/20">
        <img
          src="/img/logo.webp"
          className="w-full h-full object-contain"
          alt="OpenHRApp Logo"
        />
      </div>
    </div>
    <div className="text-center">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter flex items-center justify-center">
        <span className="text-primary">Bienvenue</span>
        
      </h1>
      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Application de Pointage</p>
    </div>
  </div>
);

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onRegisterClick, onBackToLanding, initError }) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initError || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [forgotError, setForgotError] = useState('');

  // Install Help State
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    // 1. Detect platform
    // iOS: only Safari-based browsers on Apple devices
    // Mobile: Android, HarmonyOS (Honor/Huawei), or any other mobile device
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const mobile = /Android|HarmonyOS|webOS|BlackBerry|Opera Mini|IEMobile|Mobile/i.test(ua) || ios;
    setIsIOS(ios);
    setIsMobile(mobile);

    // 2. Check if already installed as PWA (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // 3. Check Native Prompt Status (Immediate)
    if ((window as any).deferredPWAPrompt) {
      setCanPrompt(true);
    }

    // 4. Listen for Native Prompt Event (Async)
    const handlePwaReady = () => setCanPrompt(true);
    window.addEventListener('pwa-install-available', handlePwaReady);

    return () => window.removeEventListener('pwa-install-available', handlePwaReady);
  }, []);

  const handleInstallClick = async () => {
    // 1. Try Native Prompt First (Android/Desktop Chrome)
    const promptEvent = (window as any).deferredPWAPrompt;

    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      console.log(`User response to install prompt: ${outcome}`);

      if (outcome === 'accepted') {
        (window as any).deferredPWAPrompt = null;
        setCanPrompt(false);
      }
    } else {
      // 2. Fallback: Show instructions
      // On iOS: show Safari share instructions
      // On Android (non-Chrome browsers like Honor): show browser menu instructions
      setShowInstallHelp(true);
    }
  };

  // Full "nuclear" reset — destroys every client-side trace of the app so a
  // post-migration stale cache (Workbox precache, Supabase auth IndexedDB,
  // stale subscription ref, etc.) cannot survive into the next session.
  // Steps run in best-effort order; any individual failure must not block the
  // final reload.
  const handleSystemReset = async () => {
    if (!confirm("Réinitialiser le cache de l'application ? Cela vous déconnectera et rechargera l'application.")) return;
    try {
      // 1. Wipe Workbox / runtime caches (the SW unregister below does NOT
      //    clear these — they live independently in CacheStorage).
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k).catch(() => false)));
      }
      // 2. Unregister every service worker.
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister().catch(() => false)));
      }
      // 3. Drop every IndexedDB database (Supabase auth lives here on some
      //    browsers; clearing it ensures a fully fresh session).
      if ('indexedDB' in window && (indexedDB as any).databases) {
        try {
          const dbs: { name?: string }[] = await (indexedDB as any).databases();
          await Promise.all(
            dbs.map(db =>
              db.name
                ? new Promise<void>((res) => {
                    const req = indexedDB.deleteDatabase(db.name!);
                    req.onsuccess = req.onerror = req.onblocked = () => res();
                  })
                : Promise.resolve()
            )
          );
        } catch { /* indexedDB.databases() not supported on Safari < 14 */ }
      }
      // 4. Wipe web storage.
      try { localStorage.clear(); } catch { /* private mode */ }
      try { sessionStorage.clear(); } catch { /* private mode */ }
    } finally {
      // 5. Hard reload with a cache-bust query so the HTML shell itself is
      //    re-requested from the network.
      window.location.replace(window.location.pathname + '?_=' + Date.now());
    }
  };

 
  const handleCheckForUpdates = async () => {
    if (!('serviceWorker' in navigator)) {
      showToast('Les Service Workers ne sont pas pris en charge par ce navigateur.', 'error');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        showToast('l\'application n\'est pas encore installer en mode PWA.', 'info');
        return;
      }
      await reg.update();
      if (reg.waiting) {
        showToast('Mise à jour trouvée — rechargement en cours…', 'success');
        // Ask the waiting SW to take over; controllerchange triggers reload.
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        showToast('Vous disposez de la dernière version.', 'success');
      }
    } catch (err: any) {
      console.error('[Connexion] Échec de la vérification des mises à jour :', err);
      showToast('Impossible de vérifier les mises à jour.', 'error');
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    try {
      const result = await hrService.requestVerificationEmail(email);
      showToast(result.message || "Un nouveau lien de vérification a été envoyé à votre adresse e-mail.", result.success ? "success" : "info");
      if (result.success && result.message.includes('already verified')) {
        // Account is already confirmed — clear the error so user can retry login
        setError("");
      }
      setShowResend(false);
    } catch (e) {
      showToast("Échec de l'envoi du mail de vérification.", "error");
    }
  };
  //   so the form is submitted first, then login completes.
  const triggerSafariPasswordSave = (onComplete: () => void) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.name = 'safari-password-save';
      iframe.src = 'about:blank';
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = window.location.href;
      form.target = 'safari-password-save';
      form.autocomplete = 'on';

      const emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.name = 'username';
      emailInput.autocomplete = 'username';
      emailInput.value = email;
      form.appendChild(emailInput);

      const pwInput = document.createElement('input');
      pwInput.type = 'password';
      pwInput.name = 'password';
      pwInput.autocomplete = 'current-password';
      pwInput.value = password;
      form.appendChild(pwInput);

      document.body.appendChild(form);

      // Hand control back to React immediately — the dashboard transition is
      // now off the critical path. The form submission still runs (in the
      // same tick) so Safari sees the keystrokes-on-form and offers to save
      // credentials; we just don't gate the navigation on rAF anymore.
      // Previously double-rAF blocked onComplete for 30–100ms on slow iOS
      // devices.
      try { form.submit(); } catch { /* iframe may absorb error */ }
      onComplete();
      setTimeout(() => {
        try { form.remove(); } catch { /* already gone */ }
        try { iframe.remove(); } catch { /* already gone */ }
      }, 3000);
    } catch (_) {
      // If anything fails, still complete login
      onComplete();
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotStatus('loading');
    const result = await authService.requestPasswordReset(forgotEmail);
    if (result.ok) {
      setForgotStatus('sent');
    } else {
      setForgotError(result.error || 'Impossible d\'envoyer l\'e-mail de réinitialisation. Veuillez réessayer.');
      setForgotStatus('error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      setError(`CRITIQUE : Le backend n'est pas configuré.`);
      return;
    }
    setIsLoading(true);
    setError('');
    setShowResend(false);

    try {
      const result = await hrService.login(email, password);
      if (result.user) {
        
        const ua = navigator.userAgent;
        const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;

       

        if (isIOSDevice) {
          triggerSafariPasswordSave(() => {
            onLoginSuccess(result.user!);
          });
        } else {
          onLoginSuccess(result.user);

          setTimeout(() => {
            try {
              if (window.PasswordCredential) {
                const cred = new window.PasswordCredential({
                  id: email,
                  password: password,
                  name: result.user!.name || email,
                });
                navigator.credentials.store(cred).catch(() => {});
              }
            } catch (_) { /* Silently ignore */ }
          }, 300);
        }
      } else {
        const msg = result.error || 'Échec de la vérification. Vérifiez vos identifiants.';
        setError(msg);
        if (msg.toLowerCase().includes('verified') || msg.toLowerCase().includes('vérification')) {
          setShowResend(true);
        }
      }
    } catch (err: any) {
      setError(`System Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f8fafc] items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-light blur-[100px] rounded-full -z-10"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/5 blur-[100px] rounded-full -z-10"></div>
      
      <div className="w-full max-w-[400px] animate-in fade-in zoom-in duration-500">
        <div className="bg-white md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:border border-slate-100 rounded-xl overflow-hidden">
          
          <div className="p-8 md:p-12 space-y-10">
            {/* Brand Header */}
            <BrandLogo />

            {/* Forgot Password Flow */}
            {showForgot ? (
              <div className="space-y-6">
                {forgotStatus === 'sent' ? (
                  <div className="flex flex-col items-center gap-5 text-center py-2">
                    <div className="p-4 bg-emerald-50 rounded-full">
                      <CheckCircle2 size={36} className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Consultez vos e-mails</p>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                       Un lien de réinitialisation du mot de passe a été envoyé à <span className="font-bold text-slate-600">{forgotEmail}</span>. Vérifiez vos spams si vous ne le voyez pas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(false); setForgotStatus('idle'); setForgotEmail(''); setForgotError(''); }}
                      className="w-full py-4 bg-primary text-white rounded-xl font-semibold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-hover active:scale-[0.97] transition-all flex items-center justify-center gap-3"
                    >
                      Back to Login <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="text-center space-y-1">
                      <p className="text-sm font-semibold text-slate-800">Réinitialiser le mot de passe</p>
                      <p className="text-xs text-slate-400">Saisissez votre adresse e-mail et nous vous enverrons un lien de réinitialisation.</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-1">Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors z-10" size={18} />
                        <input
                          type="email"
                          required
                          autoComplete="email"
                          className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary-light placeholder:text-slate-300"
                          placeholder="e.g. name@company.com"
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    {forgotStatus === 'error' && (
                      <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider">
                        <AlertCircle size={14} className="flex-shrink-0" />
                        <span>{forgotError}</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={forgotStatus === 'loading'}
                      className="w-full py-4 bg-primary text-white rounded-xl font-semibold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-hover active:scale-[0.97] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                    >
                      {forgotStatus === 'loading' ? <RefreshCw className="animate-spin" size={18} /> : <>Envoyer le lien <ArrowRight size={16} /></>}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(false); setForgotStatus('idle'); setForgotError(''); }}
                      className="w-full py-2.5 text-slate-400 text-[10px] font-semibold uppercase tracking-widest hover:text-primary transition-colors"
                    >
                      Revenir à la page de connexion
                    </button>
                  </form>
                )}
              </div>
            ) : (
            <form onSubmit={handleLogin} className="space-y-6" autoComplete="on" method="post" action=".">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors z-10" size={18} />
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      autoComplete="username"
                      required
                      className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary-light placeholder:text-slate-300"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="email@exemple.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-1">Mot de passe</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors z-10" size={18} />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      required
                      className="w-full pl-14 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary-light placeholder:text-slate-300"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="*************"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors z-10 p-1"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 animate-in shake space-y-2">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3 text-[10px] font-semibold uppercase tracking-wider">
                    <div className="flex items-center gap-3">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                    {showResend && (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        className="ml-auto flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm text-rose-600 hover:text-rose-800 transition-colors"
                      >
                        <Send size={10} /> Renvoyer le lien
                      </button>
                    )}
                  </div>
                  {showResend && (
                    <p className="text-[11px] font-medium normal-case tracking-normal text-rose-500/90 leading-snug">
                      Vous avez déjà demandé un lien ?<span className="font-bold">Vérifiez votre spam ou de courrier indésirable.</span> avant de renvoyer les e-mails de vérification de <span className="font-mono">noreply@openhrapp.com</span> y atterrissent parfois.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-primary text-white rounded-xl font-semibold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-hover active:scale-[0.97] transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-2"
                >
                  {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <>Continuer <ArrowRight size={16} /></>}
                </button>

                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotStatus('idle'); setForgotError(''); }}
                  className="w-full py-2 text-slate-400 text-[10px] font-semibold uppercase tracking-widest hover:text-primary transition-colors"
                >
                  Mot de Passe Oublié?
                </button>

                <button
                  type="button"
                  onClick={onRegisterClick}
                  className="w-full py-3 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl font-semibold text-[10px] uppercase tracking-widest hover:bg-white hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                >
                  <Building2 size={14} /> Creer un nouveau organisation
                </button>

                {/* Back to Home */}
                {onBackToLanding && (
                  <button
                    type="button"
                    onClick={onBackToLanding}
                    className="w-full py-2.5 text-slate-400 text-[10px] font-semibold uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2"
                  >
                    <Home size={12} /> Revenir au menu
                  </button>
                )}

                {/* Utils Row: Install & Reset */}
                <div className="flex justify-center items-center gap-4 pt-4 border-t border-slate-50">
                   {!isInstalled && (
                   <button
                     type="button"
                     onClick={handleInstallClick}
                     className="flex items-center gap-2 px-4 py-2 text-slate-400 rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:text-primary transition-colors"
                   >
                     <Download size={12} /> {isIOS && !canPrompt ? 'App Guide' : 'Installer le PWA'}
                   </button>
                   )}

                   <div className="w-px h-3 bg-slate-200"></div>

                   <button
                     type="button"
                     onClick={handleCheckForUpdates}
                     className="flex items-center gap-2 px-4 py-2 text-slate-400 rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:text-primary transition-colors"
                     title="Check for app updates without signing out"
                   >
                     <RefreshCw size={12} /> Mettre à jour
                   </button>

                   <div className="w-px h-3 bg-slate-200"></div>

                   <button
                     type="button"
                     onClick={handleSystemReset}
                     className="flex items-center gap-2 px-4 py-2 text-slate-400 rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:text-rose-600 transition-colors"
                     title="Clear all app data and reload (destructive — signs you out)"
                   >
                     <RotateCcw size={12} /> vider Caches
                   </button>
                </div>
              </div>
            </form>
            )} {/* end showForgot */}
          </div>
        </div>

        {/* System Version */}
        <p className="text-center mt-6 text-[8px] font-semibold text-slate-300 uppercase tracking-[0.4em]">v1.2 Fonctionnel</p>
      </div>

      {/* Database Connection Indicator */}
      <div className="fixed top-6 right-6 hidden md:flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
        <div className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
        <span className="text-[8px] font-semibold uppercase text-slate-500 tracking-[0.2em]">{isConfigured ? 'Serveur cloud connecté' : 'Pas de connection'}</span>
      </div>

      {/* Installation Instructions Popup */}
      {showInstallHelp && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-xl animate-in slide-in-from-bottom-10 border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                   <Download size={16} className="text-primary"/>Guide d'installation
                 </h3>
                 <button onClick={() => setShowInstallHelp(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors"><X size={16}/></button>
              </div>
              
              {isIOS ? (
                <div className="space-y-5">
                   <p className="text-xs font-medium text-slate-500 leading-relaxed">Pour installer cette application sur votre iPhone ou iPad, veuillez suivre ces étapes :</p>
                   <div className="space-y-3">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-500"><Share size={18} /></div>
                         <div className="text-xs font-bold text-slate-700">1. Appuyez sur <span className="text-blue-600">Partager</span> Safari</div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-900 font-semibold text-[10px]">+</div>
                         <div className="text-xs font-bold text-slate-700">2. Choisir <span className="text-slate-900">Ajouter à l'écran d'accueil</span></div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-900 font-semibold text-[10px]">Ajouter</div>
                         <div className="text-xs font-bold text-slate-700">3. Appuyez <span className="text-blue-600">Ajouter</span> (en haut à droite)</div>
                      </div>
                   </div>
                </div>
              ) : isMobile ? (
                <div className="space-y-5">
                   <p className="text-xs font-medium text-slate-500 leading-relaxed">Pour une expérience optimale, ouvrez cette page dans <span className="text-slate-900 font-bold">Google Chrome</span> Si vous utilisez déjà Chrome ou un autre navigateur, suivez ces étapes :</p>
                   <div className="space-y-3">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-600"><MoreVertical size={18} /></div>
                         <div className="text-xs font-bold text-slate-700">1. Appuyez sur le <span className="text-slate-900">Menu</span> button (⋮ ou ⋯)</div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary"><Download size={18} /></div>
                         <div className="text-xs font-bold text-slate-700">2. Rechercher <span className="text-slate-900">Installer l'application</span>, <span className="text-slate-900">Ajouter à l'écran d'accueil</span>, ou <span className="text-slate-900">Ajouter un raccourci</span></div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-500 font-semibold text-[10px]">✓</div>
                         <div className="text-xs font-bold text-slate-700">3. Confirmez et l'application sera ajoutée à votre <span className="text-slate-900">Écran d'accueil</span></div>
                      </div>
                   </div>

                </div>
              ) : (
                <div className="space-y-5">
                   <p className="text-xs font-medium text-slate-500 leading-relaxed">Si l'invite automatique ne s'est pas affichée, vous pouvez procéder à une installation manuelle :</p>
                   <div className="space-y-3">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-600"><MoreVertical size={18} /></div>
                         <div className="text-xs font-bold text-slate-700">1. Cliquez sur <span className="text-slate-900">le menu du navigateur</span> (⋮)</div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary"><Download size={18} /></div>
                         <div className="text-xs font-bold text-slate-700">2. Choisir <span className="text-slate-900"> Installer l'application</span> ou <span className="text-slate-900">Installer en PWA</span></div>
                      </div>
                   </div>
                </div>
              )}
              
              <button onClick={() => setShowInstallHelp(false)} className="w-full mt-6 py-4 bg-primary text-white rounded-2xl font-semibold uppercase text-[10px] tracking-widest shadow-lg shadow-primary-light">Fermer l'instruction</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Login;
