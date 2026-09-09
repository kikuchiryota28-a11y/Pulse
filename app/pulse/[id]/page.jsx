'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Heart, Share2, Users, Zap, AlertTriangle, RefreshCw, X, RotateCcw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { actorId, buildMoveContent, contentFromMove, contentPreview, formatRelative, mediaFromContent, participantCount, seedFromPulse, directorFor, cleanText } from '../../../lib/pulse-social';
import '../../../src/pulse-ui-v1.css';

function Media({ src, alt }) { return src ? <img src={src} alt={alt || 'Pulse'} className="pulse-v1-media-img" /> : <div className="pulse-v1-media-empty" aria-hidden="true" />; }

function MoveEditor({ director, draft, setDraft, onSubmit, busy, error, onClose }) {
  const choices = director?.choices || [];
  const inputType = director?.inputType || 'text';
  return <div className="pulse-v1-overlay" role="dialog" aria-modal="true" aria-labelledby="move-title" onClick={onClose}>
    <div className="pulse-v1-sheet" onClick={(e)=>e.stopPropagation()}>
      <div className="pulse-v1-grip" aria-hidden="true" />
      <div className="pulse-v1-sheet-head"><div><div className="precision-label">YOUR MOVE</div><h2 id="move-title" className="pulse-v1-sheet-title">{director?.title || 'Change what happens next.'}</h2></div><button className="precision-icon" onClick={onClose} aria-label="Close"><X size={17}/></button></div>
      <p className="precision-body">{director?.prompt || 'Add something that changes the current state.'}</p>
      {inputType === 'choice' && choices.length ? <div className="pulse-v1-choice-list">{choices.map((choice)=><button className="pulse-v1-choice" key={choice} onClick={()=>onSubmit(choice)} disabled={busy}><span>{choice}</span><ArrowRight size={16}/></button>)}</div> : <><textarea className="pulse-v1-textarea" value={draft} onChange={(e)=>setDraft(e.target.value)} maxLength={500} autoFocus disabled={busy} placeholder={director?.hint || 'What do you add, change, or notice?'}/><div className="pulse-v1-input-footer"><span>{draft.length}/500</span><button className="precision-button" disabled={!draft.trim() || busy} onClick={()=>onSubmit(draft)}>{busy ? 'Changing…' : 'MOVE'} <ArrowRight size={14}/></button></div></>}
      {error && <p className="pulse-v1-error">{error}</p>}
    </div>
  </div>;
}

function Consequence({ result, onContinue }) {
  if (!result) return null;
  return <AnimatePresence><motion.div className="pulse-v1-consequence" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} role="dialog" aria-modal="true" aria-labelledby="consequence-title">
    <div className="pulse-v1-consequence-inner">
      <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.35}}><div className="precision-label precision-label-dark">CONSEQUENCE</div><h2 id="consequence-title" className="pulse-v1-consequence-title">YOU MOVED.</h2></motion.div>
      <motion.div className="pulse-v1-cause" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.1}}><div className="pulse-v1-flow-label"><span>YOUR MOVE</span><b>→</b><span>PULSE CHANGED</span></div><p>{contentPreview(contentFromMove(result),260)}</p></motion.div>
      <motion.div className="pulse-v1-state-dark" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.22}}><div className="precision-label precision-label-dark">STATE CHANGED</div><p>{result.state_after?.summary || 'The Pulse now contains your move.'}</p></motion.div>
      <motion.div className="pulse-v1-next-dark" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.34}}><div><div className="precision-label precision-label-dark">NEXT PERSON</div><strong>Someone else can make the next move.</strong></div><button onClick={onContinue} className="precision-icon light" aria-label="Continue"><ArrowRight size={18}/></button></motion.div>
    </div>
  </motion.div></AnimatePresence>;
}

export default function PulseDeepLink({ params }) {
  const routeParams = use(params); const router = useRouter(); const searchParams = useSearchParams(); const id = routeParams?.id;
  const [pulse,setPulse]=useState(null); const [moves,setMoves]=useState([]); const [actor,setActor]=useState(''); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [liked,setLiked]=useState(false); const [moveOpen,setMoveOpen]=useState(false); const [draft,setDraft]=useState(''); const [busy,setBusy]=useState(false); const [moveError,setMoveError]=useState(''); const [lastMoveResult,setLastMoveResult]=useState(null);
  const load = async()=>{ if(!id)return; setLoading(true); setError(''); try{ const [{data:p,error:pe},{data:m,error:me}]=await Promise.all([supabase.from('pulses').select('*').eq('id',id).maybeSingle(),supabase.from('pulse_moves').select('*').eq('pulse_id',id).order('created_at',{ascending:true})]); if(pe)throw pe;if(me)throw me;if(!p)throw new Error('This Pulse is no longer available.');setPulse(p);setMoves(m||[]);}catch(e){setError(e?.message||'Could not open this Pulse.')}finally{setLoading(false)}};
  useEffect(()=>{setActor(actorId());setMoveOpen(searchParams.get('move')==='1');load()},[id,searchParams]);
  useEffect(()=>{if(!pulse?.id)return;const channel=supabase.channel(`pulse-deep-link:${pulse.id}`).on('postgres_changes',{event:'*',schema:'public',table:'pulses',filter:`id=eq.${pulse.id}`},load).on('postgres_changes',{event:'INSERT',schema:'public',table:'pulse_moves',filter:`pulse_id=eq.${pulse.id}`},load).subscribe();return()=>{supabase.removeChannel(channel)}},[pulse?.id]);
  const ordered=useMemo(()=>[...moves].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)),[moves]); const current=ordered.at(-1)||null; const joined=ordered.some(m=>m.actor_id===actor); const isCreator=Boolean(pulse&&pulse.creator_id===actor); const director=useMemo(()=>pulse?directorFor({intent:pulse.intent,pulse,moves:ordered}):null,[pulse,ordered]); const seed=pulse?seedFromPulse(pulse):null; const currentMedia=mediaFromContent(current?.content)||seed?.dataUrl; const canMove=pulse?.status==='active'&&!joined&&!isCreator;
  const share=async()=>{const url=window.location.href;try{if(navigator.share)await navigator.share({title:pulse?.title||'Pulse',text:'See what happened in this Pulse.',url});else await navigator.clipboard.writeText(url)}catch{try{await navigator.clipboard.writeText(url)}catch{window.prompt('Copy this Pulse link',url)}}};
  const like=async()=>{if(!pulse||!actor)return;const next=!liked;setLiked(next);try{if(next){const{error:e}=await supabase.from('pulse_reactions').insert({pulse_id:pulse.id,actor_id:actor,reaction:'like'});if(e)throw e}else{const{error:e}=await supabase.from('pulse_reactions').delete().eq('pulse_id',pulse.id).eq('actor_id',actor).eq('reaction','like');if(e)throw e}}catch{setLiked(!next)}};
  const submitMove=async(raw)=>{const text=cleanText(raw,500);if(!text||!pulse||busy||isCreator)return;setBusy(true);setMoveError('');try{if(pulse.status!=='active')throw new Error('THIS PULSE HAS ALREADY BEEN REVEALED.');if(joined)throw new Error('You already moved this Pulse. Come back later to see what happened.');if(!actor)throw new Error('Your Pulse identity is not ready yet.');const submissionId=crypto.randomUUID();const inputType=director?.inputType||'text';const content=buildMoveContent({inputType,text,choice:inputType==='choice'?text:undefined});const{data:move,error:rpcError}=await supabase.rpc('submit_pulse_move',{p_pulse_id:pulse.id,p_actor_id:actor,p_parent_move_id:current?.id||null,p_action_type:director?.actionType||'interpret',p_input_type:inputType,p_prompt:director?.prompt||'Change what happens next.',p_content:content,p_submission_id:submissionId,p_expected_revision:Number(pulse.revision||0)});if(rpcError)throw rpcError;if(!move?.id)throw new Error('The Pulse changed, but the move result could not be confirmed.');setDraft('');setMoveOpen(false);setLastMoveResult(move);await load()}catch(e){const message=e?.message||'Could not save your move.';if(message.toLowerCase().includes('changed before your move')){await load();setMoveError('Someone moved first. See the new state and try again.')}else setMoveError(message)}finally{setBusy(false)}};
  if(loading)return <main className="pulse-v1-page"><div className="pulse-v1-skeleton"><div/><div/><div/></div></main>;
  if(error||!pulse)return <main className="pulse-v1-page pulse-v1-center"><div className="precision-card pad"><div className="precision-label">PULSE UNAVAILABLE</div><h1 className="pulse-page-title">Something changed.</h1><p className="precision-body">{error||'This Pulse could not be found.'}</p><button className="precision-button" onClick={load}><RefreshCw size={14}/> Retry</button></div></main>;
  const stateText=current?.state_after?.summary||seed?.text||'A new world is waiting for a first move.';
  return <main className="pulse-v1-page">
    <header className="pulse-v1-topbar"><button className="precision-icon" onClick={()=>router.back()} aria-label="Back"><ArrowLeft size={17}/></button><div className="pulse-v1-wordmark">PULSE</div><div className="pulse-v1-top-actions"><button className={`precision-icon ${liked?'is-liked':''}`} onClick={like} aria-label="Like"><Heart size={17} fill={liked?'currentColor':'none'}/></button><button className="precision-icon" onClick={share} aria-label="Share"><Share2 size={17}/></button></div></header>
    <div className="pulse-v1-detail">
      <section className="pulse-v1-detail-intro"><div className="pulse-move-chip live">{pulse.status==='active'?'MOVING':'REVEALED'}</div><h1>{pulse.title}</h1><p>{pulse.intent||'Someone starts. Someone else changes it.'}</p><div className="pulse-v1-detail-meta"><span>{participantCount(ordered)} PEOPLE</span><span>{ordered.length} MOVES</span><span>{formatRelative(pulse.updated_at)}</span></div></section>
      <section className="pulse-v1-detail-grid">
        <div className="pulse-v1-state-panel"><div className="precision-label">CURRENT STATE</div><p>{stateText}</p><div className="pulse-v1-state-media"><Media src={currentMedia} alt="Current Pulse state"/></div></div>
        <div className="pulse-v1-trace-panel"><div className="precision-label">TRACE</div><div className="pulse-v1-trace"> <div className="pulse-v1-trace-node"><span>SEED</span><p>{seed?.text||'Pulse begins here.'}</p></div>{ordered.map((move,i)=><div className={`pulse-v1-trace-node ${i===ordered.length-1?'current':''}`} key={move.id}><span>MOVE {i+1}</span><p>{contentPreview(contentFromMove(move),180)}</p><small>{move.actor_id===actor?'YOU':'SOMEONE'} · {formatRelative(move.created_at)}</small></div>)}</div>{ordered.length>1&&<div className="pulse-v1-branch">{ordered.length-1} OTHER PATH{ordered.length-1===1?'':'S'} HAPPENED</div>}</div>
        <div className="pulse-v1-action-panel"><div className="precision-label">YOUR MOVE</div><h2>{director?.title||'Change what happens next.'}</h2><p>{director?.prompt||'Add something that changes the current state.'}</p>{isCreator?<div className="pulse-v1-notice">YOU CREATED THIS PULSE.<br/>Someone else needs to make the next move.</div>:joined?<div className="pulse-v1-notice">YOUR TRACE STARTED.<br/>Come back later to see what happened after you.</div>:pulse.status!=='active'?<div className="pulse-v1-notice">THIS PULSE HAS ALREADY BEEN REVEALED.</div>:<button className="pulse-v1-move" onClick={()=>setMoveOpen(true)}><span>MOVE</span><ArrowRight size={18}/></button>}</div>
      </section>
      {joined&&<div className="revisit-box"><strong>YOUR TRACE CONTINUED</strong><p>Someone may have changed the Pulse after you. Revisit to see the consequence.</p><button className="precision-button secondary" onClick={load}>REVISIT <RotateCcw size={14}/></button></div>}
    </div>
    {moveOpen&&canMove&&<MoveEditor director={director} draft={draft} setDraft={setDraft} onSubmit={submitMove} busy={busy} error={moveError} onClose={()=>setMoveOpen(false)}/>} {lastMoveResult&&<Consequence result={lastMoveResult} onContinue={()=>setLastMoveResult(null)}/>} 
  </main>;
}