import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '@/components/ui/icon';

const GAME_START_URL = 'https://functions.poehali.dev/5cb0e6a6-ffb4-4462-8b64-28c082a574ef';
const GAME_ACTION_URL = 'https://functions.poehali.dev/5f65fe21-293e-45de-9b0f-c70c93d85ca2';
const SHOW_SPLASH_IMG = 'https://cdn.poehali.dev/projects/b397efa2-a431-4517-a0dc-9ca5ab4e622c/files/80a90130-25db-4c96-8356-4efd20bef6b5.jpg';

type Player = {
  id: number; name: string; avatar: string;
  mistakes: number; eliminated: boolean;
  eliminated_at_round?: number; is_winner: boolean; seat: number;
};
type Question = { number: number; text: string; correct_answer: boolean; explanation: string; };
type Phase =
  | 'intro'        // видео-заставка шоу
  | 'setup'        // ввод имён игроков
  | 'loading'      // генерируем вопросы
  | 'question'     // вопрос на экране
  | 'answering'    // игроки отвечают
  | 'reveal'       // показываем правильный ответ
  | 'elimination'  // выбывание
  | 'final'        // финал — 2 игрока
  | 'winner';      // победитель

const DEFAULT_NAMES = ['Алекс', 'Мария', 'Дмитрий', 'Анна', 'Сергей', 'Елена'];
const AVATARS = ['🧱', '🟡', '🔴', '🔵', '🟢', '🟠'];

// ── Счётчик обратного отсчёта ──────────────────────────────────────────────
function Countdown({ from, onDone }: { from: number; onDone: () => void }) {
  const [n, setN] = useState(from);
  useEffect(() => {
    if (n <= 0) { onDone(); return; }
    const t = setTimeout(() => setN(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [n, onDone]);
  return (
    <div className="text-8xl font-black text-center" style={{ fontFamily: 'Oswald, sans-serif', color: 'var(--lego-yellow)', textShadow: '0 0 40px rgba(255,215,0,0.5)' }}>
      {n}
    </div>
  );
}

// ── Видео-заставка шоу ─────────────────────────────────────────────────────
function ShowIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'black' | 'bg' | 'logo' | 'title' | 'out'>('black');

  useEffect(() => {
    const seq: [typeof phase, number][] = [
      ['bg', 300], ['logo', 900], ['title', 1800], ['out', 4200],
    ];
    const timers = seq.map(([p, delay]) => setTimeout(() => setPhase(p), delay));
    const done = setTimeout(onDone, 5000);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{ background: '#000', opacity: phase === 'out' ? 0 : 1, transition: phase === 'out' ? 'opacity 0.8s ease' : 'none' }}>

      {/* BG */}
      <img src={SHOW_SPLASH_IMG} alt="" className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: phase === 'black' ? 0 : 0.25, transition: 'opacity 0.8s ease' }} />

      {/* Scan lines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg,rgba(0,0,0,0.12) 0,rgba(0,0,0,0.12) 1px,transparent 1px,transparent 3px)'
      }} />

      {/* Top/bottom bars */}
      <div className="absolute top-0 left-0 right-0 h-2" style={{ background: 'var(--lego-yellow)', opacity: phase === 'black' ? 0 : 1, transition: 'opacity 0.4s ease' }} />
      <div className="absolute bottom-0 left-0 right-0 h-2" style={{ background: 'var(--lego-red)', opacity: phase === 'black' ? 0 : 1, transition: 'opacity 0.4s ease' }} />

      {/* Content */}
      <div className="relative z-10 text-center px-8"
        style={{ opacity: phase === 'black' || phase === 'bg' ? 0 : 1, transform: phase === 'logo' ? 'scale(0.85)' : 'scale(1)', transition: 'all 0.7s cubic-bezier(0.34,1.56,0.64,1)' }}>

        <div className="text-xs tracking-[0.5em] text-white/40 mb-4" style={{ fontFamily: 'Oswald, sans-serif' }}>LEGO ТВ ПРЕДСТАВЛЯЕТ</div>

        <div className="mb-3" style={{ opacity: phase === 'title' || phase === 'out' ? 1 : 0, transition: 'opacity 0.5s ease 0.3s' }}>
          <div className="text-7xl md:text-9xl font-black leading-none" style={{
            fontFamily: 'Oswald, sans-serif',
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            textShadow: 'none', filter: 'drop-shadow(0 0 30px rgba(255,215,0,0.4))'
          }}>5 МЛН</div>
          <div className="text-3xl md:text-4xl text-white/80 mt-2 tracking-widest" style={{ fontFamily: 'Oswald, sans-serif' }}>РУБЛЕЙ</div>
        </div>

        <div className="text-white/30 text-sm tracking-[0.3em] mt-6" style={{ fontFamily: 'Oswald, sans-serif', opacity: phase === 'title' || phase === 'out' ? 1 : 0, transition: 'opacity 0.5s ease 0.6s' }}>
          6 УЧАСТНИКОВ • 25 ВОПРОСОВ • 1 ПОБЕДИТЕЛЬ
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-2 left-0 right-0 h-0.5 bg-white/10">
        <div style={{
          height: '100%', background: 'var(--lego-yellow)',
          animation: phase !== 'black' ? 'introProgress 4.5s linear forwards' : 'none',
        }} />
      </div>
      <style>{`@keyframes introProgress { from{width:0} to{width:100%} }`}</style>
    </div>
  );
}

// ── Карточка игрока ────────────────────────────────────────────────────────
function PlayerCard({ player, selected, onToggle, showAnswer, isCorrect, answered }: {
  player: Player; selected: boolean; onToggle?: () => void;
  showAnswer?: boolean; isCorrect?: boolean; answered?: boolean;
}) {
  const active = !player.eliminated;
  return (
    <div
      onClick={active && onToggle ? onToggle : undefined}
      className={`relative rounded-sm p-3 text-center transition-all select-none
        ${active && onToggle ? 'cursor-pointer' : ''}
        ${player.eliminated ? 'opacity-30' : ''}
        ${selected ? 'ring-2' : ''}
      `}
      style={{
        background: player.eliminated ? '#0D0F13' : selected ? 'rgba(255,215,0,0.1)' : '#161A22',
        border: `1px solid ${player.eliminated ? '#1a1a1a' : selected ? 'var(--lego-yellow)' : '#252A36'}`,
        ringColor: 'var(--lego-yellow)',
        ...(showAnswer && answered !== undefined ? {
          background: isCorrect ? 'rgba(0,166,80,0.15)' : 'rgba(227,0,11,0.15)',
          border: `1px solid ${isCorrect ? '#00A650' : '#E3000B'}`,
        } : {}),
      }}
    >
      {player.eliminated && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-xs font-bold tracking-widest text-red-500/60" style={{ fontFamily: 'Oswald, sans-serif' }}>ВЫБЫЛ</span>
        </div>
      )}
      <div className="text-3xl mb-1">{player.avatar}</div>
      <div className="text-xs font-bold text-white truncate" style={{ fontFamily: 'Oswald, sans-serif' }}>{player.name}</div>
      <div className="flex justify-center gap-1 mt-1.5 flex-wrap">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full" style={{ background: i < player.mistakes ? 'var(--lego-red)' : '#252A36' }} />
        ))}
      </div>
      {showAnswer && answered !== undefined && !player.eliminated && (
        <div className="mt-1.5 text-xs font-bold" style={{ color: isCorrect ? '#00A650' : '#E3000B', fontFamily: 'Oswald, sans-serif' }}>
          {isCorrect ? '✓ ВЕРНО' : '✗ НЕВЕРНО'}
        </div>
      )}
    </div>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────
export default function ShowPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES);
  const [topic, setTopic] = useState('общие знания, наука, история, спорт и культура');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [playerAnswers, setPlayerAnswers] = useState<Record<number, boolean | null>>({});
  const [revealData, setRevealData] = useState<{ correct: boolean; results: Record<string, boolean>; eliminated: { id: number; name: string }[]; winner: { id: number; name: string } | null } | null>(null);
  const [round, setRound] = useState(1);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [eliminatedNow, setEliminatedNow] = useState<Player[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [showElimination, setShowElimination] = useState(false);
  const submitRef = useRef(false);

  const activePlayers = players.filter(p => !p.eliminated);

  // Старт игры
  const startGame = async () => {
    setPhase('loading');
    setLoadingMsg('ИИ генерирует 25 вопросов...');
    setError('');
    try {
      const res = await fetch(GAME_START_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: names, topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      setSessionId(data.session_id);
      setPlayers(data.players.map((p: Player) => ({ ...p, mistakes: 0, eliminated: false, is_winner: false })));
      setPhase('question');
      loadQuestion(data.session_id, 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка запуска');
      setPhase('setup');
    }
  };

  const loadQuestion = async (sid: number, qnum: number) => {
    const res = await fetch(`${GAME_ACTION_URL}?action=state&session_id=${sid}`);
    const data = await res.json();
    if (data.question) {
      setQuestion(data.question);
      setPlayers(data.players);
      setRound(data.round);
      setPlayerAnswers({});
      submitRef.current = false;
    }
  };

  // Установить ответ игрока
  const setAnswer = (playerId: number, answer: boolean) => {
    if (phase !== 'answering' && phase !== 'question') return;
    setPhase('answering');
    setPlayerAnswers(prev => ({ ...prev, [playerId]: answer }));
  };

  // Отправить все ответы
  const submitAnswers = async () => {
    if (!sessionId || !question || submitRef.current) return;
    submitRef.current = true;

    // Для не ответивших — ставим неверный ответ (противоположный правильному)
    const finalAnswers: Record<number, boolean> = {};
    activePlayers.forEach(p => {
      finalAnswers[p.id] = playerAnswers[p.id] ?? !question.correct_answer;
    });

    const res = await fetch(`${GAME_ACTION_URL}?action=answer&session_id=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: finalAnswers }),
    });
    const data = await res.json();

    setRevealData(data);
    setPhase('reveal');

    // Обновляем счётчики ошибок локально
    setPlayers(prev => prev.map(p => ({
      ...p,
      mistakes: p.mistakes + (data.results[String(p.id)] === false ? 1 : 0),
    })));

    if (data.eliminated?.length > 0) {
      const elim = players.filter(p => data.eliminated.some((e: { id: number }) => e.id === p.id));
      setEliminatedNow(elim);
    }

    if (data.winner) {
      const w = players.find(p => p.id === data.winner.id) || null;
      setWinner(w);
    }
  };

  // После показа ответа — следующий шаг
  const nextStep = () => {
    if (!sessionId || !question) return;
    if (revealData?.winner) {
      setPlayers(prev => prev.map(p => ({ ...p, eliminated: !revealData.eliminated?.some(e => e.id !== p.id) && p.id !== revealData.winner!.id ? p.eliminated : p.eliminated })));
      setPhase('winner');
      return;
    }
    if (eliminatedNow.length > 0) {
      setShowElimination(true);
      setPlayers(prev => prev.map(p => ({ ...p, eliminated: p.eliminated || eliminatedNow.some(e => e.id === p.id) })));
      setEliminatedNow([]);
      return;
    }
    const nextQ = (question.number || 0) + 1;
    if (nextQ > 25) { setPhase('winner'); return; }

    // Проверяем: если осталось 2 — финал
    const stillActive = players.filter(p => !p.eliminated).length;
    if (stillActive === 2 && question.number >= 20) {
      setPhase('final');
    }
    loadQuestion(sessionId, nextQ);
    setPhase('question');
  };

  const closeElimination = () => {
    setShowElimination(false);
    if (revealData?.winner) { setPhase('winner'); return; }
    const nextQ = (question?.number || 0) + 1;
    if (nextQ > 25) { setPhase('winner'); return; }
    loadQuestion(sessionId!, nextQ);
    setPhase('question');
  };

  const answeredCount = Object.keys(playerAnswers).length;
  const allAnswered = answeredCount >= activePlayers.length;

  // ── RENDER ──────────────────────────────────────────────────────────────

  if (phase === 'intro') return <ShowIntro onDone={() => setPhase('setup')} />;

  if (phase === 'setup') return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--lego-dark)' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl font-black mb-1" style={{ fontFamily: 'Oswald, sans-serif', background: 'linear-gradient(135deg,#FFD700,#FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>5 МЛН</div>
          <div className="text-white/40 text-sm tracking-widest" style={{ fontFamily: 'Oswald, sans-serif' }}>ИНТЕЛЛЕКТУАЛЬНОЕ ШОУ • LEGO ТВ</div>
        </div>

        <div className="rounded-sm p-6 space-y-4" style={{ background: '#161A22', border: '1px solid #252A36' }}>
          <p className="text-white/50 text-sm">Введите имена 6 участников:</p>
          <div className="grid grid-cols-2 gap-3">
            {names.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xl">{AVATARS[i]}</span>
                <input
                  value={name}
                  onChange={e => setNames(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                  className="flex-1 bg-black/30 border rounded-sm px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 transition-colors"
                  style={{ borderColor: '#252A36' }}
                  placeholder={`Игрок ${i + 1}`}
                />
              </div>
            ))}
          </div>

          <div>
            <p className="text-white/40 text-xs mb-1">Тема вопросов (для ИИ):</p>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full bg-black/30 border rounded-sm px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 transition-colors"
              style={{ borderColor: '#252A36' }}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button onClick={startGame} className="w-full py-3 rounded-sm font-black text-lg tracking-wide transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#FFD700,#FFA500)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>
            НАЧАТЬ ШОУ
          </button>
        </div>

        <p className="text-center text-white/20 text-xs mt-4">6 участников → вопросы 1–10 → выбывают 2 → вопросы 11–20 → выбывают 2 → финал 11–25 → победитель</p>
      </div>
    </div>
  );

  if (phase === 'loading') return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--lego-dark)' }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-yellow-400 border-t-transparent animate-spin mx-auto mb-6" />
        <p className="text-white text-xl font-bold" style={{ fontFamily: 'Oswald, sans-serif' }}>{loadingMsg}</p>
        <p className="text-white/30 text-sm mt-2">ИИ создаёт уникальные вопросы для игры...</p>
      </div>
    </div>
  );

  // Экран финала
  if (phase === 'final') return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.95)' }}>
      <div className="text-center px-8">
        <div className="text-xs tracking-[0.5em] text-white/40 mb-4" style={{ fontFamily: 'Oswald, sans-serif' }}>ФИНАЛ</div>
        <div className="text-6xl font-black text-white mb-6" style={{ fontFamily: 'Oswald, sans-serif', color: 'var(--lego-yellow)' }}>ФИНАЛЬНЫЙ БОЙ</div>
        <div className="flex justify-center gap-8 mb-8">
          {activePlayers.map(p => (
            <div key={p.id} className="text-center">
              <div className="text-5xl mb-2">{p.avatar}</div>
              <div className="text-white font-bold" style={{ fontFamily: 'Oswald, sans-serif' }}>{p.name}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setPhase('question')} className="px-8 py-3 rounded-sm font-black text-lg"
          style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>
          НАЧАТЬ ФИНАЛ
        </button>
      </div>
    </div>
  );

  // Экран победителя
  if (phase === 'winner') return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--lego-dark)' }}>
      <div className="text-center">
        <div className="text-6xl mb-6">🏆</div>
        <div className="text-xs tracking-[0.5em] text-white/40 mb-2" style={{ fontFamily: 'Oswald, sans-serif' }}>ПОБЕДИТЕЛЬ</div>
        <div className="text-6xl font-black mb-2" style={{ fontFamily: 'Oswald, sans-serif', background: 'linear-gradient(135deg,#FFD700,#FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {winner?.name || players.find(p => p.is_winner)?.name || activePlayers[0]?.name}
        </div>
        <div className="text-3xl font-bold text-white/80 mb-8" style={{ fontFamily: 'Oswald, sans-serif' }}>ВЫИГРАЛ 5 000 000 ₽</div>
        <div className="flex justify-center gap-4 flex-wrap mb-8">
          {players.map(p => (
            <div key={p.id} className={`text-center p-3 rounded-sm ${p.is_winner || p.id === winner?.id ? 'ring-2' : 'opacity-40'}`}
              style={{ background: '#161A22', border: '1px solid #252A36', ringColor: 'var(--lego-yellow)' }}>
              <div className="text-2xl">{p.avatar}</div>
              <div className="text-xs text-white mt-1" style={{ fontFamily: 'Oswald, sans-serif' }}>{p.name}</div>
              <div className="text-xs text-white/40">{p.mistakes} ош.</div>
            </div>
          ))}
        </div>
        <button onClick={() => { setPhase('intro'); setSessionId(null); setPlayers([]); setQuestion(null); setRevealData(null); setWinner(null); setRound(1); }}
          className="px-8 py-3 rounded-sm font-black text-lg"
          style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>
          НОВАЯ ИГРА
        </button>
      </div>
    </div>
  );

  // ── Основной игровой экран ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--lego-dark)' }}>

      {/* Elimination overlay */}
      {showElimination && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.92)' }}>
          <div className="text-center px-8 fade-up">
            <div className="text-xs tracking-[0.5em] text-red-500/80 mb-4" style={{ fontFamily: 'Oswald, sans-serif' }}>КОНЕЦ РАУНДА {round - 1}</div>
            <div className="text-5xl font-black text-white mb-6" style={{ fontFamily: 'Oswald, sans-serif' }}>ВЫБЫВАЮТ</div>
            <div className="flex justify-center gap-6 mb-8">
              {eliminatedNow.length > 0 ? eliminatedNow.map(p => (
                <div key={p.id} className="text-center">
                  <div className="text-5xl mb-2 grayscale">{p.avatar}</div>
                  <div className="text-white font-bold" style={{ fontFamily: 'Oswald, sans-serif' }}>{p.name}</div>
                  <div className="text-red-400 text-sm mt-1">{p.mistakes} ошибок</div>
                </div>
              )) : <p className="text-white/40">Никто не выбывает</p>}
            </div>
            <div className="text-white/40 text-sm mb-6">Продолжают игру: {players.filter(p => !p.eliminated).length} участников</div>
            <button onClick={closeElimination} className="px-8 py-3 rounded-sm font-black text-lg"
              style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>
              ПРОДОЛЖИТЬ
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ background: '#0D0F13', borderColor: '#252A36' }}>
        <div className="flex items-center gap-3">
          <div className="text-xl font-black" style={{ fontFamily: 'Oswald, sans-serif', color: 'var(--lego-yellow)' }}>5 МЛН</div>
          <span className="text-white/30 text-xs" style={{ fontFamily: 'Oswald, sans-serif' }}>LEGO ТВ</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-xs">РАУНД {round}/3</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm" style={{ background: '#161A22', border: '1px solid #252A36' }}>
            <span className="text-white/60 text-xs">Вопрос</span>
            <span className="font-bold text-sm" style={{ color: 'var(--lego-yellow)', fontFamily: 'Oswald, sans-serif' }}>{question?.number || '–'}</span>
            <span className="text-white/30 text-xs">/25</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-black/30">
        <div style={{ width: `${((question?.number || 0) / 25) * 100}%`, height: '100%', background: 'var(--lego-yellow)', transition: 'width 0.5s ease' }} />
      </div>

      <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 max-w-5xl mx-auto w-full">

        {/* Question */}
        {question && (
          <div className="rounded-sm p-6 text-center" style={{ background: '#161A22', border: '1px solid #252A36' }}>
            <div className="text-xs tracking-[0.4em] text-white/30 mb-4" style={{ fontFamily: 'Oswald, sans-serif' }}>
              ВОПРОС {question.number} • {question.number <= 10 ? 'РАУНД 1' : question.number <= 20 ? 'РАУНД 2' : 'ФИНАЛ'}
            </div>
            <p className="text-xl md:text-2xl text-white font-semibold leading-relaxed" style={{ fontFamily: 'Oswald, sans-serif' }}>
              {question.text}
            </p>

            {/* Reveal answer */}
            {phase === 'reveal' && revealData && (
              <div className="mt-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm" style={{ background: question.correct_answer ? 'rgba(0,166,80,0.15)' : 'rgba(227,0,11,0.15)', border: `1px solid ${question.correct_answer ? '#00A650' : '#E3000B'}` }}>
                  <span className="font-black text-lg" style={{ color: question.correct_answer ? '#00A650' : '#E3000B', fontFamily: 'Oswald, sans-serif' }}>
                    {question.correct_answer ? '✓ ВЕРНО' : '✗ НЕВЕРНО'}
                  </span>
                </div>
                {question.explanation && (
                  <p className="text-white/40 text-sm mt-2">{question.explanation}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Answer buttons */}
        {(phase === 'question' || phase === 'answering') && (
          <div className="text-center text-white/40 text-sm">
            <span style={{ fontFamily: 'Oswald, sans-serif' }}>Нажмите на игрока, затем выберите его ответ:</span>
          </div>
        )}

        {/* Players grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {players.map(p => (
            <PlayerCard
              key={p.id}
              player={p}
              selected={p.id in playerAnswers}
              showAnswer={phase === 'reveal'}
              answered={revealData ? revealData.results[String(p.id)] : undefined}
              isCorrect={revealData ? revealData.results[String(p.id)] : undefined}
            />
          ))}
        </div>

        {/* Answer buttons для активных */}
        {(phase === 'question' || phase === 'answering') && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto w-full">
              {activePlayers.map(p => (
                <div key={p.id} className="rounded-sm overflow-hidden" style={{ border: '1px solid #252A36', background: '#161A22' }}>
                  <div className="px-3 py-1.5 text-xs font-bold text-center border-b" style={{ borderColor: '#252A36', fontFamily: 'Oswald, sans-serif', color: playerAnswers[p.id] !== undefined ? 'var(--lego-yellow)' : 'rgba(255,255,255,0.4)' }}>
                    {p.avatar} {p.name} {playerAnswers[p.id] !== undefined ? (playerAnswers[p.id] ? '→ ВЕРНО' : '→ НЕВЕРНО') : ''}
                  </div>
                  <div className="flex">
                    <button onClick={() => setAnswer(p.id, true)}
                      className="flex-1 py-2.5 text-xs font-black tracking-wide transition-all"
                      style={{ fontFamily: 'Oswald, sans-serif', background: playerAnswers[p.id] === true ? '#00A650' : 'transparent', color: playerAnswers[p.id] === true ? 'white' : '#00A650', borderRight: '1px solid #252A36' }}>
                      ВЕРНО
                    </button>
                    <button onClick={() => setAnswer(p.id, false)}
                      className="flex-1 py-2.5 text-xs font-black tracking-wide transition-all"
                      style={{ fontFamily: 'Oswald, sans-serif', background: playerAnswers[p.id] === false ? '#E3000B' : 'transparent', color: playerAnswers[p.id] === false ? 'white' : '#E3000B' }}>
                      НЕВЕРНО
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-white/30 text-sm">{answeredCount}/{activePlayers.length} ответили</span>
              <button
                onClick={submitAnswers}
                disabled={answeredCount === 0}
                className="px-8 py-3 rounded-sm font-black text-lg tracking-wide transition-all disabled:opacity-30 hover:opacity-90"
                style={{ background: allAnswered ? 'var(--lego-yellow)' : '#252A36', color: allAnswered ? '#0D0F13' : 'white', fontFamily: 'Oswald, sans-serif' }}>
                {allAnswered ? 'ПРОВЕРИТЬ ОТВЕТЫ' : 'ПРИНЯТЬ ОТВЕТЫ'}
              </button>
            </div>
          </div>
        )}

        {/* Next button after reveal */}
        {phase === 'reveal' && (
          <div className="text-center">
            <button onClick={nextStep} className="px-8 py-3 rounded-sm font-black text-lg tracking-wide"
              style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>
              {question && question.number === 25 ? 'ОБЪЯВИТЬ ПОБЕДИТЕЛЯ' : 'СЛЕДУЮЩИЙ ВОПРОС →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
