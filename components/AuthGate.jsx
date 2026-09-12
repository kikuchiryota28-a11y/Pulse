'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ACTOR_KEY = 'pulse:social:actor';
const ONBOARDING_KEY = 'pulse:social:onboarded';
const CANONICAL_SITE_URL = 'https://pulse-krml1.vercel.app';

function authRedirectUrl() {
  if (typeof window === 'undefined') return CANONICAL_SITE_URL;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return configured ? configured.replace(/\/$/, '') : CANONICAL_SITE_URL;
}

function currentAnonymousActor() {
  return typeof window === 'undefined' ? '' : window.localStorage.getItem(ACTOR_KEY) || '';
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
        const { data, error: signUpError } = await supabase.auth.signUp({ email: value, password, options: { emailRedirectTo: authRedirectUrl() } });
        if (signUpError) throw signUpError;
        if (data?.session?.user) {
          setMessage('アカウントを作成しました。');
          setTimeout(onClose, 400);
        } else {
          setMessage('確認メールを送りました。メールのリンクを開いて登録を完了してください。');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: value, password });
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
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" onClick={onClose} />
    <section className="fixed inset-x-4 bottom-4 z-50 mx-auto max-h-[90vh] max-w-[620px] overflow-y-auto rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6 text-[#FAFAFA] shadow-2xl backdrop-blur-2xl sm:inset-x-auto sm:w-full sm:p-8" role="dialog" aria-modal="true" aria-label="Account">
      <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />
      <div className="flex items-start justify-between gap-8">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">YOUR ACCOUNT</p>
          <h2 className="mt-2 font-black tracking-tighter text-4xl leading-[0.9] uppercase text-white">{mode === 'signed-in' ? 'You are in.' : mode === 'signup' ? 'Keep your Pulse.' : 'Welcome back.'}</h2>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.05] bg-white/[0.02] text-white" aria-label="Close" onClick={onClose}>×</button>
      </div>

      {mode === 'signed-in' ? <>
        <div className="mt-6 rounded-3xl border border-white/[0.05] bg-white/[0.02] p-4 backdrop-blur-2xl">
          <span className="font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">SIGNED IN</span>
          <p className="mt-2 text-sm text-[#FAFAFA]">{session?.user?.email}</p>
        </div>
        <div className="mt-5 flex gap-2">
          <button className="flex-1 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-sm font-bold text-white" onClick={async () => { await supabase.auth.signOut(); onClose(); }}>Sign out</button>
          <button className="flex-1 rounded-2xl bg-[#00FF87] px-4 py-3 text-sm font-black text-black" onClick={onClose}>Done</button>
        </div>
      </> : <>
        <p className="mt-5 text-sm leading-6 text-zinc-400">アカウントを作ると、別の端末でも自分のPulseを続けられます。</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Email</label>
            <input type="email" className="w-full rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-[#00FF87]/40 focus:ring-1 focus:ring-[#00FF87]/20" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={busy}/>
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Password</label>
            <input type="password" className="w-full rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-[#00FF87]/40 focus:ring-1 focus:ring-[#00FF87]/20" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 characters or more" minLength={8} disabled={busy}/>
          </div>
          {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">{error}</div>}
          {message && <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-xs text-zinc-300">{message}</div>}
          <div className="flex gap-2">
            <button type="button" className="flex-1 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-sm font-bold text-white" onClick={onClose} disabled={busy}>Later</button>
            <button type="submit" className="flex-1 rounded-2xl bg-[#00FF87] px-4 py-3 text-sm font-black text-black disabled:opacity-50" disabled={busy}>{busy ? 'Saving…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
          </div>
        </form>
        <button type="button" className="mt-3 w-full rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-xs font-bold text-zinc-300" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setMessage(''); }} disabled={busy}>{mode === 'signup' ? 'すでにアカウントがある → ログイン' : '新しくアカウントを作る →'}</button>
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
      const { error: claimError } = await supabase.rpc('claim_actor_identity', { p_old_actor_id: oldActor, p_new_actor_id: user.id });
      if (claimError) throw claimError;
    }
    promoteIdentity(user.id);
  };

  useEffect(() => {
    let mounted = true;
    const rawUrlError = authErrorFromUrl();
    if (rawUrlError) {
      try { setUrlError(decodeURIComponent(rawUrlError.replace(/\+/g, ' '))); } catch { setUrlError(rawUrlError); }
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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { void finish(nextSession || null); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  if (!ready) return <div className="grid min-h-screen place-items-center bg-[#060608] text-[#FAFAFA]"><div className="text-center"><div className="font-black text-5xl tracking-tighter text-[#00FF87]">P</div><p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">SYS.RDY</p></div></div>;

  return <>
    {urlError && <div className="fixed inset-x-4 top-4 z-40 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-200">{urlError}<button className="float-right font-black text-white" onClick={() => setUrlError('')}>×</button></div>}
    {children}
    {showAccount && <AccountSheet session={session} onClose={() => setShowAccount(false)}/>} 
  </>;
}