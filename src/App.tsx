import React, { useState, useEffect, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SearchProvider } from './context/SearchContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { ToastProvider } from './context/ToastContext';
import MainLayout from './layouts/MainLayout';
import CookieConsent from './components/CookieConsent';
import SearchDialog from './components/search/SearchDialog';
import { PWAUpdateBanner } from './components/PWAUpdateBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { lazyWithReload } from './utils/lazyWithReload';
import { supabase } from './services/supabase';
import { sessionManager } from './services/session/sessionManager';

// Eager: public pages needed for first paint / SEO
import Login from './pages/Login';
import Setup from './pages/Setup';
import RegisterOrganization from './pages/RegisterOrganization';
import { VerifyAccount } from './pages/VerifyAccount';
import { ResetPassword } from './pages/ResetPassword';
import { SuspendedPage } from './components/subscription';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import TutorialsPage from './pages/TutorialsPage';
import TutorialPage from './pages/TutorialPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import NotFoundPage from './pages/NotFoundPage';
import FeaturesPage from './pages/FeaturesPage';
import FeatureDetailPage from './pages/FeatureDetailPage';
import ChangelogPage from './pages/ChangelogPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';

// Lazy: authenticated pages loaded on demand after login.
const Dashboard = lazyWithReload(() => import('./pages/Dashboard'));
const EmployeeDirectory = lazyWithReload(() => import('./pages/EmployeeDirectory'));
const Attendance = lazyWithReload(() => import('./pages/Attendance'));
const AttendanceLogs = lazyWithReload(() => import('./pages/AttendanceLogs'));
const Leave = lazyWithReload(() => import('./pages/Leave'));
const Settings = lazyWithReload(() => import('./pages/Settings'));
const Reports = lazyWithReload(() => import('./pages/Reports'));
const Organization = lazyWithReload(() => import('./pages/Organization'));
const SuperAdmin = lazyWithReload(() => import('./pages/SuperAdmin'));
const Upgrade = lazyWithReload(() => import('./pages/Upgrade'));
const PerformanceReview = lazyWithReload(() => import('./pages/PerformanceReview'));
const Announcements = lazyWithReload(() => import('./pages/Announcements'));
const AdminNotifications = lazyWithReload(() => import('./pages/AdminNotifications'));

import { navigateTo } from './utils/seo';
import { getCurrentRoute, navigateToRoute, replaceRoute } from './utils/deeplink';
import { PushPermissionPrompt } from './components/PushPermissionPrompt';

// Parse features route from pathname
const parseFeaturesRoute = (pathname: string) => {
  if (pathname === '/features' || pathname === '/features/') {
    return { type: 'list' as const };
  }
  const match = pathname.match(/^\/features\/(.+)$/);
  if (match && match[1]) {
    return { type: 'detail' as const, slug: match[1] };
  }
  return null;
};

// Parse changelog route from pathname
const parseChangelogRoute = (pathname: string) => {
  if (pathname === '/changelog' || pathname === '/changelog/') {
    return true;
  }
  return false;
};

// Parse blog route from pathname
const parseBlogRoute = (pathname: string) => {
  if (pathname === '/blog' || pathname === '/blog/') {
    return { type: 'list' as const };
  }
  const match = pathname.match(/^\/blog\/(.+)$/);
  if (match && match[1]) {
    return { type: 'post' as const, slug: match[1] };
  }
  return null;
};

// Parse tutorial route from pathname
const parseTutorialRoute = (pathname: string) => {
  if (pathname === '/how-to-use' || pathname === '/how-to-use/') {
    return { type: 'list' as const };
  }
  const match = pathname.match(/^\/how-to-use\/(.+)$/);
  if (match && match[1]) {
    return { type: 'single' as const, slug: match[1] };
  }
  return null;
};

const AppContent: React.FC = () => {
  const { user, isLoading, isConfigured, setConfigured, login, logout } = useAuth();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const [currentPath, setCurrentPath] = useState('dashboard');
  const [navParams, setNavParams] = useState<any>(null);

  // Public Pages State
  const [showRegister, setShowRegister] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [blogRoute, setBlogRoute] = useState<{ type: 'list' | 'post'; slug?: string } | null>(() => {
    return parseBlogRoute(window.location.pathname);
  });
  const [tutorialRoute, setTutorialRoute] = useState<{ type: 'list' | 'single'; slug?: string } | null>(() => {
    return parseTutorialRoute(window.location.pathname);
  });
  const [policyRoute, setPolicyRoute] = useState<'privacy' | 'terms' | null>(() => {
    const path = window.location.pathname;
    if (path === '/privacy' || path === '/privacy/') return 'privacy';
    if (path === '/terms' || path === '/terms/') return 'terms';
    return null;
  });
  const [featuresRoute, setFeaturesRoute] = useState<{ type: 'list' | 'detail'; slug?: string } | null>(() => {
    return parseFeaturesRoute(window.location.pathname);
  });
  const [changelogRoute, setChangelogRoute] = useState<boolean>(() => {
    return parseChangelogRoute(window.location.pathname);
  });
  const [aboutRoute, setAboutRoute] = useState<boolean>(() => {
    const path = window.location.pathname;
    return path === '/about' || path === '/about/';
  });
  const [contactRoute, setContactRoute] = useState<boolean>(() => {
    const path = window.location.pathname;
    return path === '/contact' || path === '/contact/';
  });
  const [is404, setIs404] = useState<boolean>(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    const search = window.location.search;
    const knownPaths = ['/', '/privacy', '/privacy/', '/terms', '/terms/', '/features', '/features/', '/changelog', '/changelog/', '/about', '/about/', '/contact', '/contact/', '/_/', '/_'];

    if (new URLSearchParams(search).has('token')) return false;
    if (hash.includes('token=')) return false;
    if (hash.includes('/auth/confirm-verification/')) return false;

    if (parseBlogRoute(path)) return false;
    if (parseTutorialRoute(path)) return false;
    if (parseFeaturesRoute(path)) return false;
    if (parseChangelogRoute(path)) return false;
    if (path === '/about' || path === '/about/') return false;
    if (path === '/contact' || path === '/contact/') return false;

    if (hash && hash !== '#' && hash !== '#/') return false;

    if (path === '/_/' || path === '/_') {
      window.history.replaceState(null, '', '/' + search + hash);
      return false;
    }

    if (path.startsWith('/dashboard/')) {
      const dashMatch = path.match(/^\/dashboard\/\d+\/([a-z0-9]{15,})/i);
      if (dashMatch && dashMatch[1]) {
        window.location.replace(`/#/leave/${dashMatch[1]}`);
      } else {
        window.location.replace('/#/dashboard');
      }
      return false;
    }

    if (path === '/dashboard' || path === '/dashboard/') {
      window.location.replace('/#/dashboard');
      return false;
    }

    return !knownPaths.includes(path);
  });

  // Check URL for verification token on mount
  useEffect(() => {
    if (policyRoute || blogRoute || tutorialRoute || featuresRoute || changelogRoute) return;

    let token: string | null = null;

    token = new URLSearchParams(window.location.search).get('token');

    if (!token && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      token = new URLSearchParams(hashQuery).get('token');
    }

    if (!token && window.location.hash.includes('/auth/confirm-verification/')) {
      const match = window.location.hash.match(/\/auth\/confirm-verification\/([^/?#]+)/);
      if (match && match[1]) {
        token = match[1];
      }
    }

    if (token) {
      setVerificationToken(token);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      return;
    }

    const queryReset = new URLSearchParams(window.location.search).get('reset') === '1';
    const hashRecovery = window.location.hash.includes('type=recovery');
    if (queryReset || hashRecovery) {
      setShowPasswordReset(true);
      if (queryReset) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Listen for Supabase auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
      }
      if (event === 'SIGNED_OUT') {
        const snap = sessionManager.getSnapshot();
        if (snap.user) {
          sessionManager.setCurrentUser(null);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Legacy hash redirect
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      if (hash === '#/blog' || hash === '#/blog/') {
        navigateTo('/blog');
        return;
      }
      const blogMatch = hash.match(/^#\/blog\/(.+)$/);
      if (blogMatch && blogMatch[1]) {
        navigateTo(`/blog/${blogMatch[1]}`);
        return;
      }

      if (hash === '#/how-to-use' || hash === '#/how-to-use/') {
        navigateTo('/how-to-use');
        return;
      }
      const tutorialMatch = hash.match(/^#\/how-to-use\/(.+)$/);
      if (tutorialMatch && tutorialMatch[1]) {
        navigateTo(`/how-to-use/${tutorialMatch[1]}`);
        return;
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Deep link hash listener
  useEffect(() => {
    const handleDeepLinkHashChange = () => {
      const route = getCurrentRoute();
      if (route && user) {
        const hash = window.location.hash.replace(/^#/, '').replace(/\/+$/, '');
        let resolvedParams = route.params;
        if (route.path === 'attendance' && !resolvedParams) {
          if (hash === '/attendance/quick-office') resolvedParams = { autoStart: 'OFFICE' };
          else if (hash === '/attendance/quick-factory') resolvedParams = { autoStart: 'FACTORY' };
          else if (hash === '/attendance/finish') resolvedParams = { autoStart: 'FINISH' };
        }
        setCurrentPath(route.path);
        setNavParams(resolvedParams);
      }
    };
    window.addEventListener('hashchange', handleDeepLinkHashChange);
    return () => window.removeEventListener('hashchange', handleDeepLinkHashChange);
  }, [user]);

  // Listen for popstate
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      const knownPaths = ['/', '/privacy', '/privacy/', '/terms', '/terms/', '/features', '/features/', '/changelog', '/changelog/', '/about', '/about/', '/contact', '/contact/', '/_/', '/_'];

      const hasToken = new URLSearchParams(search).has('token') || hash.includes('token=') || hash.includes('/auth/confirm-verification/');
      const hasHashRoute = hash && hash !== '#' && hash !== '#/';

      const clearAll = () => { setPolicyRoute(null); setBlogRoute(null); setTutorialRoute(null); setFeaturesRoute(null); setChangelogRoute(false); setAboutRoute(false); setContactRoute(false); };

      if (path === '/_/' || path === '/_') {
        window.history.replaceState(null, '', '/' + search + hash);
        clearAll();
        setIs404(false);
        return;
      }

      if (parseChangelogRoute(path)) {
        clearAll();
        setChangelogRoute(true);
        setIs404(false);
        return;
      }

      if (path === '/about' || path === '/about/') {
        clearAll();
        setAboutRoute(true);
        setIs404(false);
        return;
      }

      if (path === '/contact' || path === '/contact/') {
        clearAll();
        setContactRoute(true);
        setIs404(false);
        return;
      }

      const featuresMatch = parseFeaturesRoute(path);
      if (featuresMatch) {
        clearAll();
        setFeaturesRoute(featuresMatch);
        setIs404(false);
        return;
      }

      const blogMatch = parseBlogRoute(path);
      if (blogMatch) {
        clearAll();
        setBlogRoute(blogMatch);
        setIs404(false);
        return;
      }

      const tutorialMatch = parseTutorialRoute(path);
      if (tutorialMatch) {
        clearAll();
        setTutorialRoute(tutorialMatch);
        setIs404(false);
        return;
      }

      if (path === '/privacy' || path === '/privacy/') {
        clearAll();
        setPolicyRoute('privacy');
        setIs404(false);
      } else if (path === '/terms' || path === '/terms/') {
        clearAll();
        setPolicyRoute('terms');
        setIs404(false);
      } else if (path === '/' || knownPaths.includes(path) || hasToken || hasHashRoute) {
        clearAll();
        setIs404(false);
      } else {
        clearAll();
        setIs404(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Initial hash reading
  useEffect(() => {
    if (user && !isLoading) {
      const route = getCurrentRoute();
      if (route) {
        const hash = window.location.hash.replace(/^#/, '').replace(/\/+$/, '');
        let resolvedParams = route.params;
        if (route.path === 'attendance' && !resolvedParams) {
          if (hash === '/attendance/quick-office') resolvedParams = { autoStart: 'OFFICE' };
          else if (hash === '/attendance/quick-factory') resolvedParams = { autoStart: 'FACTORY' };
          else if (hash === '/attendance/finish') resolvedParams = { autoStart: 'FINISH' };
        }
        setCurrentPath(route.path);
        setNavParams(resolvedParams);
      } else if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
        replaceRoute('dashboard', null);
      }
    }
  }, [user, isLoading]);

  const handleNavigate = (path: string, params?: any) => {
    if (path === 'attendance-quick-office') {
      setCurrentPath('attendance');
      setNavParams({ autoStart: 'OFFICE' });
      navigateToRoute('attendance', { autoStart: 'OFFICE' });
    } else if (path === 'attendance-quick-factory') {
      setCurrentPath('attendance');
      setNavParams({ autoStart: 'FACTORY' });
      navigateToRoute('attendance', { autoStart: 'FACTORY' });
    } else if (path === 'attendance-finish') {
      setCurrentPath('attendance');
      setNavParams({ autoStart: 'FINISH' });
      navigateToRoute('attendance', { autoStart: 'FINISH' });
    } else {
      setCurrentPath(path);
      setNavParams(params || null);
      navigateToRoute(path, params || null);
    }
  };

  if (!isConfigured) {
    return <Setup onComplete={() => setConfigured(true)} />;
  }

  // Priority 0a: Public Policy Pages
  if (policyRoute === 'privacy') {
    return <PrivacyPolicyPage onBack={() => { navigateTo('/'); }} />;
  }
  if (policyRoute === 'terms') {
    return <TermsOfServicePage onBack={() => { navigateTo('/'); }} />;
  }

  // Priority 0b: Public Features pages
  if (featuresRoute) {
    if (featuresRoute.type === 'detail' && featuresRoute.slug) {
      return <FeatureDetailPage slug={featuresRoute.slug} onBack={() => { navigateTo('/features'); }} onRegisterClick={() => { navigateTo('/'); setShowRegister(true); }} />;
    }
    return <FeaturesPage onBack={() => { navigateTo('/'); }} onRegisterClick={() => { navigateTo('/'); setShowRegister(true); }} />;
  }

  // Priority 0c: Public Changelog
  if (changelogRoute) {
    return <ChangelogPage onBack={() => { navigateTo('/'); }} />;
  }

  // Priority 0c2: Public About
  if (aboutRoute) {
    return <AboutPage onBack={() => { navigateTo('/'); }} onRegisterClick={() => { navigateTo('/'); setShowRegister(true); }} />;
  }

  // Priority 0c3: Public Contact
  if (contactRoute) {
    return <ContactPage onBack={() => { navigateTo('/'); }} onRegisterClick={() => { navigateTo('/'); setShowRegister(true); }} />;
  }

  // Priority 0d: Public Tutorials
  if (tutorialRoute) {
    if (tutorialRoute.type === 'single' && tutorialRoute.slug) {
      return <TutorialPage slug={tutorialRoute.slug} onBack={() => { navigateTo('/how-to-use'); }} />;
    }
    return <TutorialsPage onBack={() => { navigateTo('/'); }} onRegisterClick={() => { navigateTo('/'); setShowRegister(true); }} />;
  }

  // Priority 0: Public Blog
  if (blogRoute) {
    if (blogRoute.type === 'post' && blogRoute.slug) {
      return <BlogPostPage slug={blogRoute.slug} onBack={() => { navigateTo('/blog'); }} />;
    }
    return <BlogPage onBack={() => { navigateTo('/'); }} onRegisterClick={() => { navigateTo('/'); setShowRegister(true); }} />;
  }

  // Priority 1: Verification Flow
  if (verificationToken) {
    return <VerifyAccount token={verificationToken} onFinished={() => { setVerificationToken(null); setShowRegister(false); }} />;
  }

  // Priority 1.5: Password Reset Flow
  if (showPasswordReset) {
    return <ResetPassword onFinished={() => setShowPasswordReset(false)} />;
  }

  // 404: Unknown clean URL path
  if (is404) {
    return <NotFoundPage onGoHome={() => { navigateTo('/'); }} />;
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  // Priority 2: Public Login / Register
  if (!user) {
    if (showRegister) {
      return <RegisterOrganization onBack={() => setShowRegister(false)} onSuccess={login} />;
    }
    return <Login onLoginSuccess={login} onRegisterClick={() => setShowRegister(true)} />;
  }

  // Check if Super Admin
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  // Priority 2.5: Check if organization is suspended
  if (!isSuperAdmin && !isSubscriptionLoading && subscription?.isBlocked) {
    return <SuspendedPage onLogout={logout} />;
  }

  // Priority 3: Authenticated App
  const renderContent = () => {
    if (isSuperAdmin && (currentPath === 'dashboard' || currentPath === 'super-admin')) {
      return <SuperAdmin user={user} onNavigate={handleNavigate} />;
    }

    switch (currentPath) {
      case 'dashboard': return <Dashboard user={user} onNavigate={handleNavigate} />;
      case 'super-admin': return <SuperAdmin user={user} onNavigate={handleNavigate} />;
      case 'upgrade':
        if (user.role === 'ADMIN' || user.role === 'HR') {
          return <Upgrade onBack={() => handleNavigate('dashboard')} />;
        }
        return <Dashboard user={user} onNavigate={handleNavigate} />;
      case 'profile': return <Settings user={user} onBack={() => handleNavigate('dashboard')} />;
      case 'employees': return <EmployeeDirectory user={user} selectedEmployeeId={navParams?.selectedEmployeeId} />;
      case 'attendance':
        return (
          <ErrorBoundary>
            <Attendance
              user={user}
              autoStart={navParams?.autoStart}
              onFinish={() => handleNavigate('dashboard')}
            />
          </ErrorBoundary>
        );
      case 'attendance-logs': return <AttendanceLogs user={user} viewMode="MY" filterEmployeeId={navParams?.filterEmployeeId} />;
      case 'attendance-audit': return <AttendanceLogs user={user} viewMode="AUDIT" />;
      case 'leave': return <Leave user={user} autoOpen={navParams?.autoOpen} openLeaveId={navParams?.openLeaveId} />;
      case 'announcements': return <Announcements user={user} />;
      case 'admin-notifications': return <AdminNotifications user={user} />;
      case 'performance-review': return <PerformanceReview user={user} />;
      case 'settings': return <Settings user={user} />;
      case 'reports': return <Reports user={user} />;
      case 'organization': return <Organization initialTab={navParams?.tab} />;
      default: return <Dashboard user={user} onNavigate={handleNavigate} />;
    }
  };

  const suspenseFallback = (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-primary" size={48} />
    </div>
  );

  const pushPrompt = !isSuperAdmin ? (
    <PushPermissionPrompt userId={user.id} organizationId={user.organizationId as string | undefined} />
  ) : null;

  if (currentPath === 'attendance') {
    return (
      <>
        <Suspense fallback={suspenseFallback}>{renderContent()}</Suspense>
        {pushPrompt}
      </>
    );
  }

  return (
    <MainLayout currentPath={currentPath} onNavigate={handleNavigate}>
      <Suspense fallback={suspenseFallback}>{renderContent()}</Suspense>
      {pushPrompt}
    </MainLayout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ThemeProvider>
          <ToastProvider>
            <SearchProvider>
              <AppContent />
              <SearchDialog />
              <Analytics />
              <CookieConsent />
              <PWAUpdateBanner />
            </SearchProvider>
          </ToastProvider>
        </ThemeProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
};

export default App;