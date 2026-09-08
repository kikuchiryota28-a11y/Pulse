'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Mail, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ACTOR_KEY = 'pulse:social:actor';

function currentActor() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ACTOR_KEY) || '';
}

async function claimActor(userId) {
  const oldActor = currentActor();
  if (!userId) return;
  if (oldActor && oldActor !== userId) {
    const { error } = await supabase.rpc('claim_actor_identity', {
      p_old_actor_id: oldActor,
      p_new_actor_id: userId,
    });
    if (error) throw error;
  }
  window.localStorage.setItem(ACTOR_KEY, userId);
}

export default function AccountPage() {
  const [mode, setMode] = useState('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserEmail(data.session?.user?.email || ''));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError('メールアドレスを入力してください。');
    if (password.length < 8) return setError('パスワードは8文字以上にしてください。');
    if (mode === 'create' && password !== confirm) return setError('パスワードが一致していません。');

    setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'create') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: window.location.origin + '/' },
        });
        if (signUpError) throw signUpError;
        if (data.session?.user) {
          await claimActor(data.session.user.id);
          setUserEmail(data.session.user.email || cleanEmail);
          setMessage('アカウントを作成しました。');
        } else {
          setMessage('確認メールを送りました。メールを確認するとアカウント作成が完了します。');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          await claimActor(data.user.id);
          setUserEmail(data.user.email || cleanEmail);
          setMessage('ログインしました。');
        }
      }
    } catch (e) {
      const text = String(e?.message || '');
      if (text.toLowerCase().includes('email address not authorized')) {
        setError('このメールアドレスには現在Supabaseから確認メールを送れません。');
      } else if (text.toLowerCase().includes('already registered')) {
        setError('このメールアドレスはすでに登録されています。ログインしてください。');
      } else if (text.toLowerCase().includes('invalid login credentials')) {
        setError('メールアドレスまたはパスワードが違います。');
      } else {
        setError(text || 'アカウント操作に失敗しました。');
      }
    } finally { setBusy(false); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (userEmail) {
    return (
      <main className="screen fade-in">
        <div className="pulse-content" style={{ maxWidth: 520, margin: '0 auto' }}>
          <div className="screen-toolbar">
            <button className="back-row" onClick={() => { window.location.href = '/'; }}><span className="icon-button"><ArrowLeft size={18}/></span></button>
            <span className="screen-title">Account</span>
          </div>
          <section className="pulse-feature">
            <div><p className="pulse-kicker">YOUR ACCOUNT</p><h1>You're in.</h1><p>{userEmail}</p></div>
          </section>
          <button className="secondary-button full-button" onClick={logout}><LogOut size={16}/> Log out</button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen fade-in">
      <div className="pulse-content" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="screen-toolbar">
          <button className="back-row" onClick={() => { window.location.href = '/'; }}><span className="icon-button"><ArrowLeft size={18}/></span></button>
          <span className="screen-title">Account</span>
        </div>

        <section className="pulse-feature" style={{ paddingBottom: 18 }}>
          <div>
            <p className="pulse-kicker">PULSE ACCOUNT</p>
            <h1>{mode === 'create' ? <>Keep your<br/>Pulse.</> : <>Welcome<br/>back.</>}</h1>
            <p>{mode === 'create' ? 'Create an account so your Pulses and Moves can stay with you across sessions.' : 'Sign in and continue where you left off.'}</p>
          </div>
        </section>

        <div className="seed-switch" style={{ marginBottom: 16 }}>
          <button className={`seed-option ${mode === 'create' ? 'active' : ''}`} onClick={() => { setMode('create'); setError(''); setMessage(''); }}>Create account</button>
          <button className={`seed-option ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); setMessage(''); }}>Log in</button>
        </div>

        <form onSubmit={submit}>
          <div className="field"><label>Email</label><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></div>
          <div className="field"><label>Password</label><input type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 characters or more"/></div>
          {mode === 'create' && <div className="field"><label>Confirm password</label><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Enter it again"/></div>}
          {error && <div className="error">{error}</div>}
          {message && <div className="live-strip"><Mail size={15}/><span>{message}</span></div>}
          <button className="primary-button full-button" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'create' ? 'Create account' : 'Log in'} {!busy && <ArrowRight size={15}/>}</button>
        </form>
      </div>
    </main>
  );
}
