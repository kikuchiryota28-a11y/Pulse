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

function AccountSheet({ session, onClose }) {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMode(session ? 'signed-in' : 'signup');
    setMessage('');
    setError('');
  }, [session]);

  const submit = async (event) => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return setError('メールアドレスを入力してください。');
    if (!password) return setError('パスワードを入力してください。');
    setBusy(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: value,
          password,
          options: { emailRedirectTo: authRedirectUrl() },
        });
        if (signUpError) throw signUpError;
        if (data?.session?.user) {
          setMessage('アカウントを作成しました。');
          setTimeout(onClose, 400);
        } else {
          setMessage('確認メールを送りました。メールのリンクを開いて登録を完了してください。');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: value,
          password,
        });
        if (signInError) throw signInError;
        setMessage('ログインしました。');
        setTimeout(onClose, 400);
      }
    } catch (e) {
      setError(e?.message || 'アカウント操作に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  return <>
    <div className="sheet-backdrop" onClick={onClose}/>
    <section className="sheet" role="dialog" aria-modal="true" aria-label="Account">
      <div className="sheet-handle"/>
      <div className="flex items-start justify-between gap-8">
        <div>
          <p className="pulse-kicker">YOUR ACCOUNT</p>
          <h2 className="sheet-title">{mode === 'signed-in' ? 'You are in.' : mode === 'signup' ? 'Keep your Pulse.' : 'Welcome back.'}</h2>
        </div>
        <button className="icon-button" aria-label="Close" onClick={onClose}>×</button>
      </div>

      {mode === 'signed-in' ? <>
        <div className="prompt-card" style={{ marginTop: 18 }}>
          <span className="prompt-label">SIGNED IN</span>
          <p>{session?.user?.email}</p>
        </div>
        <div className="sheet-actions">
          <button className="secondary-button" onClick={async () => { await supabase.auth.signOut(); onClose(); }}>Sign out</button>
          <button className="primary-button" onClick={onClose}>Done</button>
        </div>
      </> : <>
        <p className="sheet-subtitle">アカウントを作ると、別の端末でも自分のPulseを続けられます。</p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={busy}/>
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 characters or more" minLength={8} disabled={busy}/>
          </div>
          {error && <div className="error">{error}</div>}
          {message && <div className="prompt-card" style={{ marginTop: 12 }}><p>{message}</p></div>}
          <div className="sheet-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Later</button>
            <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
          </div>
        </form>
        <button type="button" className="secondary-button" style={{ width: '100%', marginTop: 10 }} onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setMessage(''); }} disabled={busy}>
          {mode === 'signup' ? 'すでにアカウントがある → ログイン' : '新しくアカウントを作る →'}
        </button>
      </>}
    </section>
  </>;
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [urlError, setUrlError] = useState('');

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
    const rawUrlError = authErrorFromUrl();
    if (rawUrlError) {
      try {
        setUrlError(decodeURIComponent(rawUrlError.replace(/\+/g, ' ')));
      } catch {
        setUrlError(rawUrlError);
      }
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }

    const finish = async (nextSession) => {
      try {
        if (nextSession?.user) await claimCurrentActor(nextSession.user);
        if (mounted) setSession(nextSession || null);
      } catch (e) {
        if (mounted) setUrlError(e?.message || 'Could not finish account setup.');
      } finally {
        if (mounted) setReady(true);
      }
    };

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setUrlError(sessionError.message);
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

  if (!ready) {
    return <div className="auth-screen"><div className="auth-mark">p</div><p className="auth-loading">Loading Pulse…</p></div>;
  }

  return <>
    {urlError && <div className="error" style={{ position: 'fixed', top: 14, left: 14, right: 14, zIndex: 80, padding: '10px 14px', background: '#efe2d9' }}>{urlError}<button style={{ float: 'right', fontWeight: 900 }} onClick={() => setUrlError('')}>×</button></div>}
    {children}
    {!session && <button type="button" className="secondary-button" style={{ position: 'fixed', right: 14, bottom: 82, zIndex: 45, borderRadius: 999, padding: '10px 14px', boxShadow: '0 8px 24px rgba(32,34,29,.10)' }} onClick={() => setShowAccount(true)}>Create account</button>}
    {session && <button type="button" className="secondary-button" style={{ position: 'fixed', right: 14, bottom: 82, zIndex: 45, borderRadius: 999, padding: '10px 14px', boxShadow: '0 8px 24px rgba(32,34,29,.10)' }} onClick={() => setShowAccount(true)}>Account</button>}
    {showAccount && <AccountSheet session={session} onClose={() => setShowAccount(false)}/>} 
  </>;
}
