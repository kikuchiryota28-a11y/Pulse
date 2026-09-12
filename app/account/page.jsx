'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Mail, LogOut, UserRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import '../../src/pulse-design-system.css';

const ACTOR_KEY = 'pulse:social:actor';
const spring = { type: 'spring', stiffness: 380, damping: 30 };
const enter = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } };

function currentActor() { if (typeof window === 'undefined') return ''; return window.localStorage.getItem(ACTOR_KEY) || ''; }
async function claimActor(userId) { const oldActor = currentActor(); if (!userId) return; if (oldActor && oldActor !== userId) { const { error } = await supabase.rpc('claim_actor_identity', { p_old_actor_id: oldActor, p_new_actor_id: userId }); if (error) throw error; } window.localStorage.setItem(ACTOR_KEY, userId); }

const fieldClass = 'w-full bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-3 text-[#FAFAFA] placeholder:text-zinc-600 focus:outline-none focus:border-[#00FF87] transition-all duration-200';

export default function AccountPage() {
  const [mode, setMode] = useState('create'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [userEmail, setUserEmail] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUserEmail(data.session?.user?.email || '')); }, []);
  const submit = async (event) => { event.preventDefault(); const cleanEmail = email.trim().toLowerCase(); if (!cleanEmail) return setError('Please enter an email address.'); if (password.length < 8) return setError('Use at least 8 characters.'); if (mode === 'create' && password !== confirm) return setError('Passwords do not match.'); setBusy(true); setError(''); setMessage(''); try { if (mode === 'create') { const { data, error: signUpError } = await supabase.auth.signUp({ email: cleanEmail, password, options: { emailRedirectTo: window.location.origin + '/' } }); if (signUpError) throw signUpError; if (data.session?.user) { await claimActor(data.session.user.id); setUserEmail(data.session.user.email || cleanEmail); setMessage('Your account is ready.'); } else setMessage('Check your email to finish creating the account.'); } else { const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password }); if (signInError) throw signInError; if (data.user) { await claimActor(data.user.id); setUserEmail(data.user.email || cleanEmail); setMessage('You are signed in.'); } } } catch (e) { const text = String(e?.message || ''); if (text.toLowerCase().includes('email address not authorized')) setError('Supabase cannot send verification mail to this address right now.'); else if (text.toLowerCase().includes('already registered')) setError('That email is already registered. Try logging in.'); else if (text.toLowerCase().includes('invalid login credentials')) setError('The email or password is incorrect.'); else setError(text || 'Account action failed.'); } finally { setBusy(false); } };
  const logout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  if (userEmail) return <motion.main {...enter} className="pulse-page account-v2"><header className="pulse-page-header"><div><div className="pulse-page-kicker"><UserRound size={12}/> ACCOUNT</div><h1 className="pulse-page-title">You're in.</h1><p className="pulse-page-subtitle">Your Pulse identity is connected to this account.</p></div><motion.button whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} transition={spring} className="precision-icon" onClick={() => { window.location.href = '/you'; }} aria-label="Back"><ArrowLeft size={17}/></motion.button></header><motion.section {...enter} transition={{ ...enter.transition, delay: 0.08 }} className="account-card"><span>CONNECTED ACCOUNT</span><strong>{userEmail}</strong><motion.button whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} transition={spring} className="precision-button secondary" onClick={logout}><LogOut size={15}/> LOG OUT</motion.button></motion.section></motion.main>;

  return <motion.main {...enter} className="pulse-page account-v2">
    <header className="pulse-page-header"><div><div className="pulse-page-kicker"><UserRound size={12}/> ACCOUNT</div><h1 className="pulse-page-title">Keep your<br/>Pulse.</h1><p className="pulse-page-subtitle">Sign in so what you create and change stays with you.</p></div><motion.button whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} transition={spring} className="precision-icon" onClick={() => { window.location.href = '/'; }} aria-label="Back"><ArrowLeft size={17}/></motion.button></header>
    <div className="account-switch flex w-full max-w-sm mx-auto gap-2 rounded-2xl bg-white/[0.03] p-1">
      <motion.button whileTap={{ scale: 0.98 }} transition={spring} className={`flex-1 rounded-xl px-4 py-3 text-xs font-bold tracking-wider ${mode === 'create' ? 'bg-white/[0.10] text-white' : 'text-zinc-500 hover:text-white'}`} onClick={() => { setMode('create'); setError(''); setMessage(''); }}>CREATE</motion.button>
      <motion.button whileTap={{ scale: 0.98 }} transition={spring} className={`flex-1 rounded-xl px-4 py-3 text-xs font-bold tracking-wider ${mode === 'login' ? 'bg-white/[0.10] text-white' : 'text-zinc-500 hover:text-white'}`} onClick={() => { setMode('login'); setError(''); setMessage(''); }}>LOG IN</motion.button>
    </div>
    <form className="flex flex-col gap-5 w-full max-w-sm mx-auto mt-6" onSubmit={submit}>
      <label className="flex flex-col gap-2"><span className="font-mono text-[10px] tracking-[0.2em] text-zinc-400 uppercase">EMAIL</span><input className={fieldClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label className="flex flex-col gap-2"><span className="font-mono text-[10px] tracking-[0.2em] text-zinc-400 uppercase">PASSWORD</span><input className={fieldClass} type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 characters or more"/></label>
      <AnimatePresence mode="wait" initial={false}>{mode === 'create' && <motion.label key="confirm" {...enter} className="flex flex-col gap-2"><span className="font-mono text-[10px] tracking-[0.2em] text-zinc-400 uppercase">CONFIRM PASSWORD</span><input className={fieldClass} type="password" autoComplete="new-password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} placeholder="Enter it again"/></motion.label>}</AnimatePresence>
      {error&&<motion.div {...enter} className="account-error">{error}</motion.div>}{message&&<motion.div {...enter} className="account-message"><Mail size={15}/>{message}</motion.div>}
      <motion.button whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} transition={spring} className="pulse-join-primary w-full" type="submit" disabled={busy}>{busy?'WORKING…':mode==='create'?'CREATE ACCOUNT':'LOG IN'} {!busy&&<ArrowRight size={15}/>}</motion.button>
    </form>
  </motion.main>;
}
