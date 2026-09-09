'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Heart, Share2, Users, Zap, AlertTriangle, RefreshCw, X, RotateCcw, GitBranch } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import {
  actorId,
  buildMoveContent,
  contentFromMove,
  contentPreview,
  formatRelative,
  mediaFromContent,
  participantCount,
  seedFromPulse,
  directorFor,
  cleanText,
} from '../../../lib/pulse-social';

function statusLabel(pulse) {
  if (!pulse) return 'MOVING';
  if (pulse.status !== 'active') return 'REVEALED';
  return pulse.move_count > 0 ? 'SOMEONE IS MOVING' : 'WAITING FOR YOU';
}

function Media({ src, alt }) {
  if (!src) {
    return (
      <div className="pulse-state-media-placeholder" aria-hidden="true">
        <span>THE PULSE IS WAITING</span>
      </div>
    );
  }
  return <img src={src} alt={alt || 'Pulse'} className="pulse-state-media" />;
}

function MoveEditor({ director, draft, setDraft, onSubmit, busy, error, onClose }) {
  const reduceMotion = useReducedMotion();
  const choices = director?.choices || [];
  const inputType = director?.inputType || 'text';

  return (
    <div className="pulse-focus-backdrop" onClick={onClose} role="presentation">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.24 }}
        className="pulse-move-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-sheet-title"
      >
        <div className="pulse-sheet-handle" />
        <div className="pulse-sheet-top">
          <div>
            <div className="pulse-eyebrow">YOUR MOVE</div>
            <h2 id="move-sheet-title">{director?.title || 'Change what happens next.'}</h2>
          </div>
          <button type="button" onClick={onClose} className="pulse-icon-button" aria-label="Close move interface">
            <X size={17} />
          </button>
        </div>

        <p className="pulse-sheet-prompt">{director?.prompt || 'Add something that changes the current state.'}</p>

        {inputType === 'choice' && choices.length > 0 ? (
          <div className="pulse-choice-list">
            {choices.map((choice) => (
              <button key={choice} type="button" onClick={() => onSubmit(choice)} disabled={busy} className="pulse-choice-row">
                <span>{choice}</span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        ) : (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              autoFocus
              placeholder={director?.hint || 'What do you notice, add, or change?'}
              className="pulse-move-textarea"
              disabled={busy}
              aria-label="Your move"
            />
            <div className="pulse-sheet-actions">
              <span className="pulse-character-count">{draft.length}/500</span>
              <button
                type="button"
                disabled={!draft.trim() || busy}
                onClick={() => onSubmit(draft)}
                className="pulse-move-primary"
              >
                {busy ? 'CHANGING…' : 'MOVE'}
                {!busy && <ArrowRight size={16} />}
              </button>
            </div>
          </>
        )}
        {error && <p className="pulse-inline-error" role="alert">{error}</p>}
      </motion.div>
    </div>
  );
}

function Consequence({ result, nextPrompt, onContinue }) {
  const reduceMotion = useReducedMotion();
  if (!result) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0 }}
        className="pulse-consequence-overlay"
      >
        <div className="pulse-consequence-inner">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.06, duration: reduceMotion ? 0 : 0.3 }}
          >
            <div className="pulse-eyebrow pulse-eyebrow-light">CONSEQUENCE</div>
            <h2>YOU MOVED.</h2>
            <p className="pulse-consequence-lead">Your action entered the Pulse. Now look at what changed.</p>
          </motion.div>

          <div className="pulse-causality-stack">
            <motion.section
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.16, duration: reduceMotion ? 0 : 0.28 }}
              className="pulse-causality-step"
            >
              <div className="pulse-causality-kicker">YOUR MOVE</div>
              <p>{contentPreview(contentFromMove(result), 300)}</p>
            </motion.section>

            <div className="pulse-causality-line" aria-hidden="true" />

            <motion.section
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.28, duration: reduceMotion ? 0 : 0.28 }}
              className="pulse-causality-step pulse-causality-state"
            >
              <div className="pulse-causality-kicker">STATE CHANGED</div>
              <p>{result.state_after?.summary || 'The Pulse now contains your move.'}</p>
            </motion.section>

            <div className="pulse-causality-line" aria-hidden="true" />

            <motion.section
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.40, duration: reduceMotion ? 0 : 0.28 }}
              className="pulse-causality-step pulse-causality-next"
            >
              <div className="pulse-causality-kicker">NEXT PERSON</div>
              <p>{nextPrompt || 'Someone else can move this Pulse now.'}</p>
            </motion.section>
          </div>

          <motion.button
            type="button"
            onClick={onContinue}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.54, duration: reduceMotion ? 0 : 0.26 }}
            className="pulse-consequence-continue"
          >
            SEE THE NEW STATE <ArrowRight size={16} />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Trace({ seed, ordered, actor }) {
  return (
    <section className="pulse-section" aria-labelledby="trace-heading">
      <div className="pulse-section-heading">
        <div>
          <div className="pulse-eyebrow" id="trace-heading">TRACE</div>
          <p>How this Pulse arrived here.</p>
        </div>
        {ordered.length > 0 && <span className="pulse-section-count">{ordered.length} MOVES</span>}
      </div>

      <div className="pulse-trace-list">
        <div className="pulse-trace-item">
          <div className="pulse-trace-node">00</div>
          <div className="pulse-trace-content">
            <div className="pulse-trace-label">SEED</div>
            <p>{seed?.text || 'The starting state of this Pulse.'}</p>
          </div>
        </div>

        {ordered.map((move, index) => (
          <div className="pulse-trace-item" key={move.id}>
            <div className="pulse-trace-rail" aria-hidden="true" />
            <div className="pulse-trace-node">{String(index + 1).padStart(2, '0')}</div>
            <div className={`pulse-trace-content ${move.actor_id === actor ? 'is-yours' : ''}`}>
              <div className="pulse-trace-topline">
                <span className="pulse-trace-label">MOVE {index + 1}</span>
                <span className="pulse-trace-meta">{move.actor_id === actor ? 'YOU' : 'SOMEONE'} · {formatRelative(move.created_at)}</span>
              </div>
              <p>{contentPreview(contentFromMove(move), 250)}</p>
              {mediaFromContent(contentFromMove(move)) && (
                <img src={mediaFromContent(contentFromMove(move))} alt="Move result" className="pulse-trace-image" />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PulseDeepLink({ params }) {
  const routeParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = routeParams?.id;
  const reduceMotion = useReducedMotion();
  const [pulse, setPulse] = useState(null);
  const [moves, setMoves] = useState([]);
  const [actor, setActor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [moveError, setMoveError] = useState('');
  const [lastMoveResult, setLastMoveResult] = useState(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [{ data: p, error: pe }, { data: m, error: me }] = await Promise.all([
        supabase.from('pulses').select('*').eq('id', id).maybeSingle(),
        supabase.from('pulse_moves').select('*').eq('pulse_id', id).order('created_at', { ascending: true }),
      ]);
      if (pe) throw pe;
      if (me) throw me;
      if (!p) throw new Error('This Pulse is no longer available.');
      setPulse(p);
      setMoves(m || []);
    } catch (e) {
      setError(e?.message || 'Could not open this Pulse.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActor(actorId());
    setMoveOpen(searchParams.get('move') === '1');
    load();
  }, [id, searchParams]);

  useEffect(() => {
    if (!pulse?.id) return;
    const channel = supabase.channel(`pulse-deep-link:${pulse.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pulses', filter: `id=eq.${pulse.id}` }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulse_moves', filter: `pulse_id=eq.${pulse.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pulse?.id]);

  const seed = pulse ? seedFromPulse(pulse) : null;
  const ordered = useMemo(() => [...moves].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [moves]);
  const current = ordered.at(-1) || null;
  const currentState = pulse?.current_state || current?.state_after || null;
  const joined = ordered.some((m) => m.actor_id === actor);
  const isCreator = Boolean(pulse && pulse.creator_id === actor);
  const director = useMemo(() => pulse ? directorFor({ intent: pulse.intent, pulse, moves: ordered }) : null, [pulse, ordered]);
  const currentMedia = mediaFromContent(current?.content) || seed?.dataUrl;
  const canMove = pulse?.status === 'active' && !joined && !isCreator;
  const nextPrompt = director?.prompt || 'Someone else can continue from this new state.';

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: pulse?.title || 'Pulse', text: 'See what happened in this Pulse.', url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      try { await navigator.clipboard.writeText(url); } catch { window.prompt('Copy this Pulse link', url); }
    }
  };

  const like = async () => {
    if (!pulse || !actor) return;
    const next = !liked;
    setLiked(next);
    try {
      if (next) {
        const { error: e } = await supabase.from('pulse_reactions').insert({ pulse_id: pulse.id, actor_id: actor, reaction: 'like' });
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('pulse_reactions').delete().eq('pulse_id', pulse.id).eq('actor_id', actor).eq('reaction', 'like');
        if (e) throw e;
      }
    } catch {
      setLiked(!next);
    }
  };

  const submitMove = async (rawText) => {
    const text = cleanText(rawText, 500);
    if (!text || !pulse || busy || isCreator) return;
    setBusy(true);
    setMoveError('');
    try {
      if (pulse.status !== 'active') throw new Error('This Pulse has already been revealed.');
      if (joined) throw new Error('You already changed this Pulse. Come back later to see what happened next.');
      if (!actor) throw new Error('Your Pulse identity is not ready yet.');

      const submissionId = crypto.randomUUID();
      const actionType = director?.actionType || 'interpret';
      const inputType = director?.inputType || 'text';
      const content = buildMoveContent({ inputType, text, choice: inputType === 'choice' ? text : undefined });

      const { data: move, error: rpcError } = await supabase.rpc('submit_pulse_move', {
        p_pulse_id: pulse.id,
        p_actor_id: actor,
        p_parent_move_id: current?.id || null,
        p_action_type: actionType,
        p_input_type: inputType,
        p_prompt: director?.prompt || 'Change what happens next.',
        p_content: content,
        p_submission_id: submissionId,
        p_expected_revision: Number(pulse.revision || 0),
      });

      if (rpcError) {
        const message = rpcError.message || '';
        if (message.includes('changed before your move')) throw new Error('Someone moved while you were here.');
        if (message.includes('cannot make the next move')) throw new Error('Someone else needs to make the next move.');
        throw rpcError;
      }
      if (!move?.id) throw new Error('The move result could not be confirmed.');
      setDraft('');
      setMoveOpen(false);
      setLastMoveResult(move);
      await load();
    } catch (e) {
      const message = e?.message || 'Could not save your move.';
      if (message.includes('Someone moved while you were here')) {
        await load();
        setMoveError('Someone moved while you were here. The world changed — look at the new state.');
      } else if (message.includes('Someone else needs')) {
        setMoveError('YOU CREATED THIS PULSE. Someone else needs to make the next move.');
      } else if (message.includes('already been revealed')) {
        setMoveError('THIS PULSE HAS ALREADY BEEN REVEALED.');
      } else {
        setMoveError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="pulse-detail-screen pulse-detail-loading">
        <div className="pulse-detail-wrap">
          <div className="pulse-detail-topbar"><div className="pulse-skeleton-pill"/><div className="pulse-skeleton-actions"/></div>
          <div className="pulse-detail-grid">
            <div className="pulse-skeleton-block pulse-skeleton-hero" />
            <div className="pulse-skeleton-block pulse-skeleton-side" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !pulse) {
    return (
      <main className="pulse-detail-screen pulse-detail-error-screen">
        <div className="pulse-error-panel">
          <div className="pulse-error-mark"><AlertTriangle size={20} /></div>
          <div className="pulse-eyebrow">PULSE UNAVAILABLE</div>
          <h1>{error || 'This Pulse could not be found.'}</h1>
          <div className="pulse-error-actions">
            <button type="button" onClick={load} className="pulse-move-primary"><RefreshCw size={15} /> RETRY</button>
            <button type="button" onClick={() => router.push('/')} className="pulse-secondary-button">BACK</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pulse-detail-screen">
      <div className="pulse-detail-wrap">
        <header className="pulse-detail-topbar">
          <button type="button" onClick={() => router.back()} className="pulse-back-button"><ArrowLeft size={17} /> <span>BACK</span></button>
          <div className="pulse-topbar-actions">
            <button type="button" onClick={like} className={`pulse-icon-button ${liked ? 'is-liked' : ''}`} aria-label="Like Pulse">
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button type="button" onClick={share} className="pulse-icon-button" aria-label="Share Pulse"><Share2 size={17} /></button>
          </div>
        </header>

        <div className="pulse-detail-grid">
          <article className="pulse-state-stage">
            <div className="pulse-state-stage-topline">
              <div className="pulse-status"><span className="pulse-status-dot" />{statusLabel(pulse)}</div>
              <span className="pulse-stage-revision">STATE {Number(pulse.revision || 0)}</span>
            </div>

            <div className="pulse-state-copy">
              <div className="pulse-eyebrow">CURRENT STATE</div>
              <h1>{currentState?.summary || seed?.text || 'A new world is waiting for a first move.'}</h1>
              <p className="pulse-state-context">{pulse.title}</p>
            </div>

            <div className="pulse-state-media-wrap">
              <Media src={currentMedia} alt={pulse.title} />
            </div>

            <div className="pulse-state-meta">
              <div className="pulse-meta-item"><Users size={15} /><span>{participantCount(ordered)} PEOPLE</span></div>
              <div className="pulse-meta-item"><Zap size={14} /><span>{ordered.length} MOVES</span></div>
              <div className="pulse-meta-item"><span className="pulse-meta-creator">BY</span><span>{pulse.creator_id === actor ? 'YOU' : 'CREATOR'}</span></div>
            </div>
          </article>

          <aside className="pulse-detail-rail">
            <section className="pulse-move-panel" aria-labelledby="move-heading">
              <div className="pulse-eyebrow" id="move-heading">YOUR MOVE</div>
              {isCreator ? (
                <>
                  <h2>You started this.</h2>
                  <p>Watch the world change, but let someone else make the next move.</p>
                  <div className="pulse-locked-note">THE CREATOR CANNOT ADVANCE THEIR OWN PULSE.</div>
                </>
              ) : joined ? (
                <>
                  <h2>You were here.</h2>
                  <p>Your move is now part of the story. Come back to see what happened after you.</p>
                  <button type="button" onClick={load} className="pulse-secondary-wide"><RotateCcw size={15} /> SEE WHAT CHANGED</button>
                </>
              ) : pulse.status !== 'active' ? (
                <>
                  <h2>This Pulse is revealed.</h2>
                  <p>The moving has stopped. Follow the trace to see how the world changed.</p>
                </>
              ) : (
                <>
                  <div className="pulse-move-prompt">{director?.prompt || 'Change what happens next.'}</div>
                  <button type="button" onClick={() => setMoveOpen(true)} className="pulse-move-cta" disabled={!canMove}>
                    <span>MOVE</span><ArrowRight size={18} />
                  </button>
                  <div className="pulse-move-hint">Your action becomes the next person's context.</div>
                </>
              )}
            </section>

            <section className="pulse-next-panel" aria-labelledby="next-heading">
              <div className="pulse-eyebrow" id="next-heading">NEXT PERSON</div>
              <p>{nextPrompt}</p>
              <div className="pulse-next-arrow"><ArrowRight size={16} /></div>
            </section>

            {ordered.length > 1 && (
              <div className="pulse-branch-note"><GitBranch size={15} /><span>{ordered.length - 1} previous path{ordered.length - 1 === 1 ? '' : 's'} in this Pulse</span></div>
            )}
          </aside>
        </div>

        <Trace seed={seed} ordered={ordered} actor={actor} />

        <section className="pulse-return-card">
          <div>
            <div className="pulse-eyebrow">YOUR TRACE</div>
            <h2>{joined ? 'Your action is still moving.' : 'A trace starts with one move.'}</h2>
            <p>{joined ? 'Someone else can continue from where you left the world.' : 'Make a move, then come back later to see what it became.'}</p>
          </div>
          {joined ? (
            <button type="button" onClick={load} className="pulse-return-button">REVISIT <ArrowRight size={16} /></button>
          ) : canMove ? (
            <button type="button" onClick={() => setMoveOpen(true)} className="pulse-return-button">MAKE YOUR MOVE <ArrowRight size={16} /></button>
          ) : null}
        </section>
      </div>

      {canMove && (
        <div className="pulse-mobile-move-bar">
          <div>
            <div className="pulse-eyebrow">YOUR MOVE</div>
            <span>Change the current state.</span>
          </div>
          <button type="button" onClick={() => setMoveOpen(true)} className="pulse-move-primary">MOVE <ArrowRight size={16} /></button>
        </div>
      )}

      {moveOpen && canMove && (
        <MoveEditor
          director={director}
          draft={draft}
          setDraft={setDraft}
          onSubmit={submitMove}
          busy={busy}
          error={moveError}
          onClose={() => setMoveOpen(false)}
        />
      )}

      {lastMoveResult && (
        <Consequence
          result={lastMoveResult}
          nextPrompt={nextPrompt}
          onContinue={() => setLastMoveResult(null)}
        />
      )}
    </main>
  );
}
