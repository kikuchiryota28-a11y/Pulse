'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ACTOR_KEY = 'pulse:social:actor';
const ONBOARDING_KEY = 'pulse:social:onboarded';

function currentAnonymousActor() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ACTOR_KEY) || '';
}

function promoteIdentity(userId) {
  if (typeof window === 'undefined' || !userId) return;
  window.localStorage.setItem(ACTOR_KEY, userId);
  window.localStorage.setItem(ONBOARDING_KEY, '1');
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

    supabase.auth.getSession().then(({ data }) => finish(data.session || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void finish(nextSession || null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInGoogle = async () => {
    setBusy(true); setError(''); setMessage('');
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (signInError) setError(signInError.message);
    setBusy(false);
  };

  const signInEmail = async (event) => {
    event.preventDefault();
    const value = email.trim();
    if (!value) { setError('Enter your email address.'); return; }
    setBusy(true); setError(''); setMessage('');
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
    });
    if (signInError) setError(signInError.message);
    else setMessage('Check your email. We sent you a secure sign-in link.');
    setBusy(false);
  };

  if (!ready) {
    return <div className="auth-screen"><div className="auth-mark">p</div><p className="auth-loading">Loading Pulse…</p></div>;
  }

  if (session) return children;

  return <main className="auth-screen">
    <section className="auth-panel">
      <div className="auth-mark">p</div>
      <div className="auth-copy">
        <p className="auth-eyebrow">PULSE</p>
        <h1>Start with a world someone else can change.</h1>
        <p>Your account keeps your Pulses, moves, reactions, and profile with you across devices.</p>
      </div>
      <button className="auth-provider" onClick={signInGoogle} disabled={busy}><span className="auth-provider-icon">G</span><span>{busy ? 'Connecting…' : 'Continue with Google'}</span></button>
      <div className="auth-divider"><span>or use email</span></div>
      <form onSubmit={signInEmail} className="auth-email-form">
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" inputMode="email" />
        <button className="auth-email-button" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
      </form>
      {message && <p className="auth-success">{message}</p>}
      {error && <p className="auth-error">{error}</p>}
      <p className="auth-note">More sign-in providers can be added to the same account system later.</p>
    </section>
  </main>;
}
