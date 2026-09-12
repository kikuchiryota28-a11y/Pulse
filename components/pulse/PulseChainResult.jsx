'use client';

import { motion } from 'framer-motion';

const FALLBACK_MOVES = [
  { id: '01', action: '駅員さんに聞いてみた', user: 'USER_01', time: '12m ago', type: 'TEXT' },
  { id: '02', action: 'そのカフェに来た', user: 'USER_07', time: '9m ago', type: 'PHOTO' },
  { id: '03', action: '知らない路地を一本だけ歩いた', user: 'USER_14', time: '5m ago', type: 'TEXT' },
];

function relativeTime(value) {
  if (!value) return 'NOW';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'NOW';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function PulseChainResult({
  moves = FALLBACK_MOVES,
  status = 'ACTIVE',
  result,
  title = 'WHAT IF...\n今日、知らない道を1本だけ歩いて帰ったら？',
}) {
  const normalizedMoves = moves.map((move, index) => ({
    ...move,
    id: String(move.id ?? index + 1).padStart(2, '0'),
    action: move.action ?? move.text ?? move.content ?? 'MOVE RECORDED',
    user: move.user ?? move.username ?? `USER_${String(index + 1).padStart(2, '0')}`,
    time: move.time ?? relativeTime(move.created_at),
    type: move.type ?? (move.photo_url || move.image_url ? 'PHOTO' : 'TEXT'),
  }));

  const isEnded = status === 'ENDED' || status === 'RESULT' || Boolean(result);
  const resultData = {
    participants: result?.participants ?? 24,
    moves: result?.moves ?? normalizedMoves.length,
    summary:
      result?.summary ??
      '24人が参加し、36個のMoveを経て、1日の小さな街歩きガイドが完成した',
    label: result?.label ?? 'A SMALL CITY GUIDE',
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#08080A] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(85,255,154,0.07),transparent_32%)]" />

      <div className="relative mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
        <header className="mb-20 flex items-start justify-between border-b border-zinc-900 pb-5 font-mono text-[9px] tracking-[0.18em] text-zinc-600">
          <div>
            <span className="text-zinc-400">PULSE / CHAIN</span>
            <span className="ml-4">{normalizedMoves.length} MOVES</span>
          </div>
          <span className={isEnded ? 'text-zinc-300' : 'text-emerald-300'}>
            {isEnded ? 'RESULT' : 'LIVE'}
          </span>
        </header>

        <div className="mb-24 max-w-4xl">
          <div className="mb-5 font-mono text-[9px] tracking-[0.22em] text-zinc-600">SEED / TRACE</div>
          <h1 className="whitespace-pre-line text-4xl font-black leading-[0.95] tracking-[-0.055em] text-zinc-100 sm:text-6xl">
            {title}
          </h1>
        </div>

        <div className="relative pl-8 sm:pl-12">
          <div className="absolute bottom-0 left-[7px] top-0 w-px bg-zinc-800 sm:left-[11px]" />

          <div className="space-y-14">
            {normalizedMoves.map((move, index) => (
              <motion.article
                key={move.id}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.25) }}
                className="relative"
              >
                <span className="absolute -left-[32px] top-1.5 h-[9px] w-[9px] rounded-full border border-zinc-600 bg-[#08080A] sm:-left-[36px]" />

                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[9px] tracking-[0.14em] text-zinc-600">
                  <span className="text-zinc-400">MOVE #{move.id}</span>
                  <span>{move.user}</span>
                  <span>{move.time}</span>
                  <span>{move.type}</span>
                </div>

                <h2 className="mt-3 max-w-2xl text-xl font-semibold tracking-[-0.025em] text-zinc-100 sm:text-2xl">
                  {move.action}
                </h2>

                {move.photo_url || move.image_url ? (
                  <div className="mt-5 max-w-xl overflow-hidden border border-zinc-900 bg-zinc-950">
                    <img
                      src={move.photo_url || move.image_url}
                      alt=""
                      className="block aspect-[16/9] w-full object-cover opacity-90"
                      loading="lazy"
                    />
                  </div>
                ) : move.text || move.content ? (
                  <p className="mt-4 max-w-xl font-mono text-xs leading-6 text-zinc-500">
                    {move.text || move.content}
                  </p>
                ) : null}
              </motion.article>
            ))}
          </div>
        </div>

        {isEnded && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
            className="mt-32 border-t border-zinc-800 pt-16"
          >
            <div className="font-mono text-[10px] tracking-[0.22em] text-zinc-600">RESULT / FINAL STATE</div>
            <div className="mt-8 max-w-4xl">
              <p className="font-mono text-[10px] tracking-[0.2em] text-emerald-300">{resultData.label}</p>
              <h2 className="mt-5 text-5xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-zinc-100 sm:text-8xl">
                WHAT IT
                <br />
                BECAME
              </h2>
              <p className="mt-10 max-w-2xl text-xl font-medium leading-relaxed tracking-[-0.02em] text-zinc-300 sm:text-2xl">
                {resultData.summary}
              </p>
            </div>

            <div className="mt-14 flex flex-wrap gap-x-10 gap-y-5 border-t border-zinc-900 pt-6 font-mono text-[10px] tracking-[0.16em] text-zinc-500">
              <span>{resultData.participants} PARTICIPANTS</span>
              <span>{resultData.moves} MOVES</span>
              <span>STATUS / ENDED</span>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
