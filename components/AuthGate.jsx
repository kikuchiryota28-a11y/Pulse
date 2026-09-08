'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ACTOR_KEY = 'pulse:social:actor';
const ONBOARDING_KEY = 'pulse:social:onboarded';
const CANONICAL_SITE_URL = 'https://pulse-krml1.vercel.app';

function authRedirectUrl() {
  if (typeof window === 'undefined') return CANONICAL_SITE_URL;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return CANONICAL_SITE_URL;
}

function currentAnonymousActor() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ACTOR_KEY) || '';
}

function promoteIdentity(userId) {
  if (typeof window === 'undefined' || !userId) return;
  window.localStorage.setItem(ACTOR_KEY, userId);
  window.localStorage.setItem(ONBOARDING_KEY, '1');
}

function authErrorFromUrl() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return params.get('error_description') || params.get('error') || '';
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const claimCurrentActor = async (user) => {
    if (!user?.id) return;
    const oldActor = currentAnonymousActor();
    if (oldActor && oldActor !== user.id) {
      const { error: claimError } = await supabase.rpc('claim_actor_identity', {
        p_old_actor_id: oldActor,
        p_new_actor_id: user.id,
      });
      if (claimError) throw claimError;
    }
    promoteIdentity(user.id);
  };

  useEffect(() => {
    let mounted = true;
    const urlError = authErrorFromUrl();
    if (urlError) {
      try {
        setError(decodeURIComponent(urlError.replace(/\+/g, ' ')));
      } catch {
        setError(urlError);
      }
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }

    const finish = async (nextSession) => {
      try {
        if (nextSession?.user) await claimCurrentActor(nextSession.user);
        if (mounted) setSession(nextSession || null);
      } catch (e) {
        if (mounted) setError(e?.message || 'Could not finish account setup.');
      } finally {
        if (mounted) setReady(true);
      }
    };

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setError(sessionError.message);
      void finish(data?.session || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void finish(nextSession || null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInGoogle = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl() },
    });
    if (signInError) setError(signInError.message);
    setBusy(false);
  };

  const signInEmail = async (event) => {
    event.preventDefault();
    const value = email.trim();
    if (!value) {
      setError('Enter your email address.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: value,
      options: {
        emailRedirectTo: authRedirectUrl(),
        shouldCreateUser: true,
      },
    });
    if (signInError) setError(signInError.message);
    else setMessage('Check your email. We sent you a secure sign-in link.');
    setBusy(false);
  };

  if (!ready) {
    return <div className="auth-screen"><div className="auth-mark">p</div><p className="auth-loading">Loading Pulse…</p></div>;
  }

  // Auth is intentionally not a global gate. Anonymous users must be able to
  // discover Pulses and reach the core interaction before account conversion.
  // The existing auth actions remain here for the account surface to call next.
  return children;
}
