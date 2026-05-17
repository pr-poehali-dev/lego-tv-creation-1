import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const EPISODES_URL = 'https://functions.poehali.dev/f93bc995-6043-4b4d-8e84-9804ff8c30a1';
const UPLOAD_URL = 'https://functions.poehali.dev/1c300a80-27c8-4c8e-a40c-157e7ba95802';
const STUDIO_IMG = 'https://cdn.poehali.dev/projects/b397efa2-a431-4517-a0dc-9ca5ab4e622c/files/547f742a-ffca-4ef8-a795-7a63791cb71f.jpg';
const SPLASH_IMG = 'https://cdn.poehali.dev/projects/b397efa2-a431-4517-a0dc-9ca5ab4e622c/files/9a5a1f21-b98a-47f1-b47e-ec8c6f8b3bbe.jpg';

type Episode = {
  id: number;
  title: string;
  summary: string;
  content: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  episode_number: number;
  aired_at: string;
};

const NAV_ITEMS = ['Главная', 'Новости', 'Программа', 'Трансляция', 'О канале', 'Контакты'];
const SCHEDULE = [
  { time: '10:00', title: 'Утренние новости', live: false },
  { time: '11:00', title: 'Кирпич дня', live: false },
  { time: '12:00', title: 'Дневной выпуск', live: false },
  { time: '13:30', title: 'Репортаж с места', live: false },
  { time: '15:00', title: 'Специальный репортаж', live: true },
  { time: '17:00', title: 'Вечерние новости', live: false },
  { time: '19:00', title: 'Итоги дня', live: false },
];
const TICKER_TEXT = '🧱 BREAKING: В Лего-Сити открылся новый аэропорт из 50 000 кирпичиков • 🔴 LIVE: Специальный репортаж в 15:00 • 🧱 Лего-метро запустило новую линию метро «Пластиковая» • 🔴 LIVE: Следите за трансляцией на LEGO ТВ • 🧱 Мэр Блокбурга объявил строительный конкурс среди жителей •';

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const h = time.getHours(), m = time.getMinutes(), s = time.getSeconds();
  const isOnAir = h >= 10 && h < 19;
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-sm text-white/60">
        {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      </span>
      {isOnAir && (
        <div className="flex items-center gap-1.5 bg-red-600 px-2 py-0.5 rounded-sm">
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-white inline-block" />
          <span className="text-white text-xs font-bold tracking-widest" style={{ fontFamily: 'Oswald, sans-serif' }}>LIVE</span>
        </div>
      )}
    </div>
  );
}

function EpisodeSplash({ episode, onDone }: { episode: Episode; onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600);
    const t2 = setTimeout(() => setPhase('out'), 3800);
    const t3 = setTimeout(() => onDone(), 4400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{
        background: '#0D0F13',
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 0.6s ease' : phase === 'in' ? 'opacity 0.5s ease' : 'none',
      }}
    >
      {/* Background image */}
      <img
        src={SPLASH_IMG}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.18 }}
      />

      {/* Animated scan lines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)',
      }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: 'var(--lego-yellow)' }} />

      {/* Content */}
      <div className="relative z-10 text-center px-8" style={{
        transform: phase === 'in' ? 'scale(0.88)' : 'scale(1)',
        transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Logo */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-sm flex items-center justify-center text-3xl font-black shadow-lg" style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>L</div>
          <div className="text-left">
            <div className="text-5xl font-black tracking-widest text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>
              LEGO <span style={{ color: 'var(--lego-yellow)' }}>ТВ</span>
            </div>
            <div className="text-xs tracking-[0.4em] text-white/40 mt-1">НОВОСТИ ИЗ КИРПИЧИКОВ</div>
          </div>
        </div>

        {/* Episode badge */}
        <div className="inline-flex items-center gap-3 mb-4 px-5 py-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.2)' }}>
          <span className="live-dot w-2 h-2 rounded-full inline-block" style={{ background: 'var(--lego-red)' }} />
          <span className="text-sm tracking-[0.3em] text-white/60" style={{ fontFamily: 'Oswald, sans-serif' }}>
            ВЫПУСК #{episode.episode_number}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-4xl text-white max-w-2xl mx-auto leading-tight mb-3" style={{ fontFamily: 'Oswald, sans-serif' }}>
          {episode.title}
        </h2>
        <p className="text-white/40 text-sm">{episode.aired_at}</p>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{
        background: 'linear-gradient(90deg, var(--lego-red) 0%, var(--lego-yellow) 50%, var(--lego-red) 100%)',
        animation: 'splashBar 3.5s linear forwards',
      }} />

      <style>{`
        @keyframes splashBar {
          from { transform: scaleX(0); transform-origin: left; }
          to   { transform: scaleX(1); transform-origin: left; }
        }
      `}</style>
    </div>
  );
}

function TTSPlayer({ text, title }: { text: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const [supported] = useState(() => 'speechSynthesis' in window);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(() => {
    if (!supported) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const utt = new SpeechSynthesisUtterance(title + '. ' + text);
    utt.lang = 'ru-RU';
    utt.rate = 0.95;
    utt.pitch = 1.05;
    utt.onend = () => setPlaying(false);
    utt.onerror = () => setPlaying(false);
    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
    setPlaying(true);
  }, [playing, text, title, supported]);

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  if (!supported) return null;

  return (
    <button
      onClick={speak}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
        playing
          ? 'bg-yellow-400 text-black'
          : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
      }`}
    >
      <Icon name={playing ? 'Square' : 'Volume2'} size={14} />
      {playing ? 'Остановить' : 'Слушать'}
    </button>
  );
}

function EpisodeModal({ ep, onClose }: { ep: Episode; onClose: () => void }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  if (showSplash) {
    return <EpisodeSplash episode={ep} onDone={() => setShowSplash(false)} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl rounded-sm fade-up"
        style={{ background: '#161A22', border: '1px solid #252A36' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: '#252A36' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-sm font-bold tracking-wider" style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>
                ВЫПУСК #{ep.episode_number}
              </span>
              <span className="text-xs text-white/40">{ep.aired_at}</span>
            </div>
            <h2 className="text-xl text-white leading-snug" style={{ fontFamily: 'Oswald, sans-serif' }}>{ep.title}</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors ml-4 flex-shrink-0">
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Video or thumbnail */}
        {ep.video_url ? (
          <video controls className="w-full max-h-72 object-cover bg-black" src={ep.video_url} />
        ) : ep.thumbnail_url ? (
          <img src={ep.thumbnail_url} alt={ep.title} className="w-full max-h-56 object-cover" />
        ) : null}

        {/* Content */}
        <div className="p-5">
          <p className="text-white/60 text-sm mb-4 leading-relaxed">{ep.summary}</p>
          <div className={`text-white/85 text-sm leading-relaxed mb-4 rounded-sm p-3 transition-all`} style={{ background: 'rgba(255,255,255,0.03)' }}>
            {ep.content}
          </div>
          <div className="flex items-center gap-3">
            <TTSPlayer text={ep.content} title={ep.title} />
            {ep.duration_seconds > 0 && (
              <span className="text-white/30 text-xs flex items-center gap-1">
                <Icon name="Clock" size={12} />
                {formatDuration(ep.duration_seconds)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [form, setForm] = useState({ title: '', summary: '', content: '', episode_number: 1 });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const toBase64 = (f: File) => new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

  const submit = async () => {
    if (!form.title || !form.summary || !form.content) { setError('Заполните все поля'); return; }
    setLoading(true); setError('');
    try {
      const body: Record<string, unknown> = { ...form };
      if (videoFile) body.video = await toBase64(videoFile);
      if (thumbFile) body.thumbnail = await toBase64(thumbFile);
      const res = await fetch(UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Ошибка загрузки');
      onUploaded();
      onClose();
    } catch {
      setError('Не удалось загрузить выпуск. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-black/30 border rounded-sm px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 transition-colors";
  const borderStyle = { borderColor: '#252A36' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg rounded-sm fade-up" style={{ background: '#161A22', border: '1px solid #252A36' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={borderStyle}>
          <h2 className="text-lg text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>Новый выпуск</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><Icon name="X" size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          <input className={inputCls} style={borderStyle} placeholder="Заголовок выпуска" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <textarea className={inputCls} style={borderStyle} rows={2} placeholder="Краткое описание" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
          <textarea className={inputCls} style={borderStyle} rows={4} placeholder="Полный текст новости (будет озвучен голосом)" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          <div className="flex gap-3">
            <input type="number" min={1} className={`${inputCls} w-32`} style={borderStyle} placeholder="№ выпуска" value={form.episode_number} onChange={e => setForm(f => ({ ...f, episode_number: +e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col items-center gap-2 border border-dashed rounded-sm p-3 cursor-pointer hover:border-yellow-400 transition-colors text-white/40 hover:text-white/70" style={borderStyle}>
              <Icon name="Video" size={18} />
              <span className="text-xs text-center">{videoFile ? videoFile.name : 'Видео (.mp4)'}</span>
              <input type="file" accept="video/mp4" className="hidden" onChange={e => setVideoFile(e.target.files?.[0] || null)} />
            </label>
            <label className="flex flex-col items-center gap-2 border border-dashed rounded-sm p-3 cursor-pointer hover:border-yellow-400 transition-colors text-white/40 hover:text-white/70" style={borderStyle}>
              <Icon name="Image" size={18} />
              <span className="text-xs text-center">{thumbFile ? thumbFile.name : 'Превью (.jpg)'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => setThumbFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-2.5 rounded-sm font-bold text-sm tracking-wide transition-all disabled:opacity-50"
            style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}
          >
            {loading ? 'Загружаю...' : 'Опубликовать выпуск'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('Главная');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedEp, setSelectedEp] = useState<Episode | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const fetchEpisodes = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const url = `${EPISODES_URL}?search=${encodeURIComponent(q)}&limit=20`;
      const res = await fetch(url);
      const data = await res.json();
      setEpisodes(data.episodes || []);
      setTotal(data.total || 0);
    } catch {
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEpisodes(); }, [fetchEpisodes]);

  useEffect(() => {
    const t = setTimeout(() => fetchEpisodes(search), 350);
    return () => clearTimeout(t);
  }, [search, fetchEpisodes]);

  const now = new Date();
  const h = now.getHours();
  const isOnAir = h >= 10 && h < 19;

  const getCurrentShow = () => {
    const totalMin = h * 60 + now.getMinutes();
    let current = SCHEDULE[0];
    for (const s of SCHEDULE) {
      const [sh, sm] = s.time.split(':').map(Number);
      if (totalMin >= sh * 60 + sm) current = s;
    }
    return current;
  };

  return (
    <div className="min-h-screen lego-grid" style={{ background: 'var(--lego-dark)' }}>

      {/* Top bar */}
      <div className="border-b px-4 py-2 flex items-center justify-between" style={{ borderColor: '#252A36', background: '#0a0c10' }}>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Icon name="MapPin" size={12} />
          <span>Лего-Сити, Пластиковый проспект, 1</span>
        </div>
        <LiveClock />
      </div>

      {/* Ticker */}
      <div className="overflow-hidden py-2 border-b" style={{ background: 'var(--lego-red)', borderColor: 'transparent' }}>
        <div className="ticker-track flex gap-12 items-center" style={{ width: 'max-content' }}>
          {[0, 1].map(i => (
            <span key={i} className="text-white text-xs font-medium tracking-wide whitespace-nowrap" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {TICKER_TEXT}
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="px-4 md:px-8 py-4 flex items-center justify-between" style={{ background: '#0D0F13', borderBottom: '2px solid var(--lego-yellow)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm flex items-center justify-center text-xl font-black" style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>L</div>
          <div>
            <div className="text-xl font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '0.1em' }}>LEGO <span style={{ color: 'var(--lego-yellow)' }}>ТВ</span></div>
            <div className="text-xs text-white/35">Новости из кирпичиков • 10:00 — 19:00</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map(item => (
            <button key={item} onClick={() => setActiveSection(item)} className={`nav-link text-sm text-white/65 hover:text-white ${activeSection === item ? 'active' : ''}`}>
              {item}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/show')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold tracking-wide transition-all hover:opacity-90"
            style={{ background: 'var(--lego-red)', color: 'white', fontFamily: 'Oswald, sans-serif' }}
          >
            <Icon name="Zap" size={13} />
            5 МЛН
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold tracking-wide transition-all hover:opacity-90"
            style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}
          >
            <Icon name="Plus" size={13} />
            Выпуск
          </button>
          <button className="md:hidden text-white/60 hover:text-white" onClick={() => setMobileMenu(v => !v)}>
            <Icon name={mobileMenu ? 'X' : 'Menu'} size={22} />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="md:hidden border-b px-4 py-3 flex flex-col gap-3" style={{ background: '#0D0F13', borderColor: '#252A36' }}>
          {NAV_ITEMS.map(item => (
            <button key={item} onClick={() => { setActiveSection(item); setMobileMenu(false); }} className={`text-left text-sm text-white/65 hover:text-white ${activeSection === item ? 'text-yellow-400' : ''}`}>
              {item}
            </button>
          ))}
          <button onClick={() => { setShowUpload(true); setMobileMenu(false); }} className="text-left text-sm font-bold" style={{ color: 'var(--lego-yellow)' }}>
            + Добавить выпуск
          </button>
        </div>
      )}

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">

        {/* === ГЛАВНАЯ === */}
        {activeSection === 'Главная' && (
          <div className="space-y-10 fade-up">
            {/* Hero */}
            <div className="relative rounded-sm overflow-hidden" style={{ minHeight: 340 }}>
              <img src={STUDIO_IMG} alt="LEGO ТВ студия" className="absolute inset-0 w-full h-full object-cover opacity-40" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(13,15,19,0.95) 0%, rgba(13,15,19,0.6) 100%)' }} />
              <div className="relative z-10 p-8 md:p-12 flex flex-col justify-end h-full" style={{ minHeight: 340 }}>
                {isOnAir && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="live-dot w-2 h-2 rounded-full inline-block" style={{ background: 'var(--lego-red)' }} />
                    <span className="text-xs font-bold tracking-widest text-white/80" style={{ fontFamily: 'Oswald, sans-serif' }}>В ЭФИРЕ СЕЙЧАС</span>
                    <span className="text-xs text-white/50">— {getCurrentShow().title}</span>
                  </div>
                )}
                <h1 className="text-4xl md:text-6xl text-white mb-3 leading-tight" style={{ fontFamily: 'Oswald, sans-serif' }}>
                  LEGO <span style={{ color: 'var(--lego-yellow)' }}>ТВ</span>
                </h1>
                <p className="text-white/55 text-lg max-w-md mb-6">Первый новостной канал Лего-Сити. Настоящие события, настоящие кирпичики.</p>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => setActiveSection('Трансляция')} className="flex items-center gap-2 px-5 py-2.5 rounded-sm font-bold text-sm transition-all hover:opacity-90" style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>
                    <Icon name="Play" size={15} />
                    Смотреть трансляцию
                  </button>
                  <button onClick={() => setActiveSection('Новости')} className="flex items-center gap-2 px-5 py-2.5 rounded-sm font-bold text-sm text-white/70 hover:text-white transition-all border" style={{ borderColor: '#252A36' }}>
                    <Icon name="Archive" size={15} />
                    Архив выпусков
                  </button>
                </div>
              </div>
            </div>

            {/* Latest episodes */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>Последние <span style={{ color: 'var(--lego-yellow)' }}>выпуски</span></h2>
                <button onClick={() => setActiveSection('Новости')} className="text-xs text-white/40 hover:text-yellow-400 transition-colors flex items-center gap-1">
                  Все выпуски <Icon name="ArrowRight" size={12} />
                </button>
              </div>
              {loading ? (
                <div className="flex gap-4">
                  {[0,1,2].map(i => <div key={i} className="flex-1 h-40 rounded-sm animate-pulse" style={{ background: '#161A22' }} />)}
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {episodes.slice(0, 3).map((ep, i) => (
                    <div key={ep.id} className={`ep-card rounded-sm overflow-hidden cursor-pointer fade-up-${i+1}`} style={{ background: '#161A22' }} onClick={() => setSelectedEp(ep)}>
                      {ep.thumbnail_url && <img src={ep.thumbnail_url} alt={ep.title} className="w-full h-36 object-cover opacity-70" />}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-1.5 py-0.5 font-bold rounded-sm" style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>#{ep.episode_number}</span>
                          <span className="text-xs text-white/35">{ep.aired_at}</span>
                        </div>
                        <h3 className="text-white text-sm font-semibold mb-1 line-clamp-2 leading-snug" style={{ fontFamily: 'Oswald, sans-serif' }}>{ep.title}</h3>
                        <p className="text-white/45 text-xs line-clamp-2">{ep.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule preview */}
            <div className="rounded-sm p-5" style={{ background: '#161A22', border: '1px solid #252A36' }}>
              <h2 className="text-xl text-white mb-4" style={{ fontFamily: 'Oswald, sans-serif' }}>Программа <span style={{ color: 'var(--lego-yellow)' }}>передач</span></h2>
              <div className="grid md:grid-cols-2 gap-2">
                {SCHEDULE.map(s => {
                  const [sh, sm] = s.time.split(':').map(Number);
                  const totalMin = h * 60 + now.getMinutes();
                  const isCurrent = totalMin >= sh * 60 + sm && totalMin < sh * 60 + sm + 90;
                  return (
                    <div key={s.time} className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-all ${isCurrent ? 'border' : ''}`}
                      style={isCurrent ? { background: 'rgba(255,215,0,0.07)', borderColor: 'rgba(255,215,0,0.3)' } : {}}>
                      <span className="font-mono text-sm w-12 flex-shrink-0" style={{ color: isCurrent ? 'var(--lego-yellow)' : '#ffffff60' }}>{s.time}</span>
                      <span className="text-sm text-white/80">{s.title}</span>
                      {isCurrent && <span className="live-dot w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0" style={{ background: 'var(--lego-red)' }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* === НОВОСТИ / АРХИВ === */}
        {(activeSection === 'Новости') && (
          <div className="fade-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>Архив <span style={{ color: 'var(--lego-yellow)' }}>выпусков</span></h2>
                <p className="text-white/40 text-sm mt-1">Найдено выпусков: {total}</p>
              </div>
              <div className="flex gap-3 items-center">
                <div className="relative">
                  <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Поиск по выпускам..."
                    className="bg-black/30 border rounded-sm pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 transition-colors w-64"
                    style={{ borderColor: '#252A36' }}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                      <Icon name="X" size={13} />
                    </button>
                  )}
                </div>
                <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold tracking-wide" style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>
                  <Icon name="Plus" size={13} />
                  Добавить
                </button>
              </div>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0,1,2,3,4,5].map(i => <div key={i} className="h-52 rounded-sm animate-pulse" style={{ background: '#161A22' }} />)}
              </div>
            ) : episodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Icon name="SearchX" size={40} className="text-white/20 mb-4" />
                <p className="text-white/40 text-lg" style={{ fontFamily: 'Oswald, sans-serif' }}>Выпусков не найдено</p>
                {search && <p className="text-white/25 text-sm mt-1">Попробуйте другой запрос</p>}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {episodes.map((ep, i) => (
                  <div key={ep.id} className={`ep-card rounded-sm overflow-hidden cursor-pointer fade-up-${Math.min(i+1,4)}`} style={{ background: '#161A22' }} onClick={() => setSelectedEp(ep)}>
                    {ep.thumbnail_url ? (
                      <img src={ep.thumbnail_url} alt={ep.title} className="w-full h-40 object-cover opacity-70" />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center" style={{ background: '#0D0F13' }}>
                        <Icon name="Film" size={32} className="text-white/15" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-1.5 py-0.5 font-bold rounded-sm" style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>#{ep.episode_number}</span>
                        <span className="text-xs text-white/35">{ep.aired_at}</span>
                        {ep.duration_seconds > 0 && (
                          <span className="ml-auto text-xs text-white/30 flex items-center gap-1">
                            <Icon name="Clock" size={10} />
                            {formatDuration(ep.duration_seconds)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-white text-base font-semibold mb-1.5 line-clamp-2 leading-snug" style={{ fontFamily: 'Oswald, sans-serif' }}>{ep.title}</h3>
                      <p className="text-white/45 text-xs line-clamp-3 leading-relaxed">{ep.summary}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-yellow-400 flex items-center gap-1">
                          <Icon name="Volume2" size={11} />
                          Озвучка доступна
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === ПРОГРАММА === */}
        {activeSection === 'Программа' && (
          <div className="fade-up max-w-2xl">
            <h2 className="text-3xl text-white mb-2" style={{ fontFamily: 'Oswald, sans-serif' }}>Программа <span style={{ color: 'var(--lego-yellow)' }}>передач</span></h2>
            <p className="text-white/40 text-sm mb-6">Ежедневно с 10:00 до 19:00</p>
            <div className="space-y-2">
              {SCHEDULE.map((s, i) => {
                const [sh, sm] = s.time.split(':').map(Number);
                const totalMin = h * 60 + now.getMinutes();
                const isCurrent = isOnAir && totalMin >= sh * 60 + sm && totalMin < sh * 60 + sm + 90;
                return (
                  <div key={s.time} className={`flex items-center gap-4 px-4 py-3 rounded-sm fade-up-${Math.min(i+1,4)} transition-all ${isCurrent ? 'border' : ''}`}
                    style={{ background: isCurrent ? 'rgba(255,215,0,0.07)' : '#161A22', border: isCurrent ? '1px solid rgba(255,215,0,0.3)' : '1px solid #252A36' }}>
                    <span className="font-mono text-base w-14 flex-shrink-0 font-bold" style={{ color: 'var(--lego-yellow)', fontFamily: 'Oswald, sans-serif' }}>{s.time}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{s.title}</p>
                      {isCurrent && <p className="text-xs text-yellow-400 mt-0.5 flex items-center gap-1"><span className="live-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--lego-red)' }} /> Сейчас в эфире</p>}
                    </div>
                    {s.live && <span className="text-xs px-2 py-0.5 rounded-sm font-bold" style={{ background: 'var(--lego-red)', color: 'white', fontFamily: 'Oswald, sans-serif' }}>LIVE</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === ТРАНСЛЯЦИЯ === */}
        {activeSection === 'Трансляция' && (
          <div className="fade-up">
            <h2 className="text-3xl text-white mb-2" style={{ fontFamily: 'Oswald, sans-serif' }}>Прямая <span style={{ color: 'var(--lego-yellow)' }}>трансляция</span></h2>
            <p className="text-white/40 text-sm mb-6">Эфир идёт ежедневно с 10:00 до 19:00</p>
            <div className="aspect-video rounded-sm overflow-hidden flex items-center justify-center" style={{ background: '#0D0F13', border: '1px solid #252A36' }}>
              {isOnAir ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--lego-red)' }}>
                    <Icon name="Radio" size={30} className="text-white" />
                  </div>
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <span className="live-dot w-2 h-2 rounded-full inline-block" style={{ background: 'var(--lego-red)' }} />
                    <span className="text-white font-bold text-lg" style={{ fontFamily: 'Oswald, sans-serif' }}>В ЭФИРЕ</span>
                  </div>
                  <p className="text-white/50 text-sm">{getCurrentShow().title}</p>
                  <p className="text-white/30 text-xs mt-1">Загрузите видеофайл выпуска через кнопку «+Выпуск»</p>
                </div>
              ) : (
                <div className="text-center">
                  <Icon name="MoonStar" size={40} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/30" style={{ fontFamily: 'Oswald, sans-serif' }}>Эфир завершён</p>
                  <p className="text-white/20 text-sm mt-1">Следующий выпуск в 10:00</p>
                </div>
              )}
            </div>
            {episodes.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl text-white mb-4" style={{ fontFamily: 'Oswald, sans-serif' }}>Последний <span style={{ color: 'var(--lego-yellow)' }}>выпуск</span></h3>
                <div className="ep-card rounded-sm overflow-hidden cursor-pointer" style={{ background: '#161A22' }} onClick={() => setSelectedEp(episodes[0])}>
                  <div className="flex gap-4 p-4">
                    {episodes[0].thumbnail_url && <img src={episodes[0].thumbnail_url} alt="" className="w-32 h-20 object-cover rounded-sm opacity-70 flex-shrink-0" />}
                    <div>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-sm" style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>#{episodes[0].episode_number}</span>
                      <h4 className="text-white mt-1 text-base font-semibold" style={{ fontFamily: 'Oswald, sans-serif' }}>{episodes[0].title}</h4>
                      <p className="text-white/45 text-xs mt-1 line-clamp-2">{episodes[0].summary}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === О КАНАЛЕ === */}
        {activeSection === 'О канале' && (
          <div className="fade-up max-w-2xl">
            <h2 className="text-3xl text-white mb-6" style={{ fontFamily: 'Oswald, sans-serif' }}>О <span style={{ color: 'var(--lego-yellow)' }}>канале</span></h2>
            <div className="rounded-sm overflow-hidden mb-6" style={{ border: '1px solid #252A36' }}>
              <img src={STUDIO_IMG} alt="Студия LEGO ТВ" className="w-full h-48 object-cover opacity-60" />
            </div>
            <div className="space-y-4 text-white/65 text-sm leading-relaxed">
              <p><span className="text-white font-semibold">LEGO ТВ</span> — первый новостной телеканал Лего-Сити, который ежедневно информирует жителей пластикового мегаполиса о важнейших событиях.</p>
              <p>Съёмочная группа состоит из опытных минифигурок-журналистов, которые выезжают на места событий в специально оборудованных машинах из жёлтых кирпичиков.</p>
              <p>Трансляция ведётся ежедневно с <span style={{ color: 'var(--lego-yellow)' }}>10:00 до 19:00</span>. Все выпуски сохраняются в архиве и доступны для просмотра в любое время.</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[
                { label: 'Выпусков', value: String(total), icon: 'Film' },
                { label: 'В эфире', value: '9 ч/день', icon: 'Radio' },
                { label: 'Язык', value: 'Русский', icon: 'Globe' },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-sm text-center" style={{ background: '#161A22', border: '1px solid #252A36' }}>
                  <Icon name={s.icon as 'Film'} size={22} className="mx-auto mb-2" style={{ color: 'var(--lego-yellow)' }} />
                  <div className="text-xl font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>{s.value}</div>
                  <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === КОНТАКТЫ === */}
        {activeSection === 'Контакты' && (
          <div className="fade-up max-w-xl">
            <h2 className="text-3xl text-white mb-6" style={{ fontFamily: 'Oswald, sans-serif' }}>Контакты</h2>
            <div className="space-y-3">
              {[
                { icon: 'MapPin', label: 'Адрес', value: 'Лего-Сити, Пластиковый проспект, 1' },
                { icon: 'Clock', label: 'Эфир', value: 'Ежедневно 10:00 – 19:00' },
                { icon: 'Mail', label: 'Почта', value: 'news@legotv.city' },
                { icon: 'Phone', label: 'Телефон', value: '+7 (000) LEGO-TV' },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-4 p-4 rounded-sm" style={{ background: '#161A22', border: '1px solid #252A36' }}>
                  <Icon name={c.icon as 'MapPin'} size={18} style={{ color: 'var(--lego-yellow)' }} className="flex-shrink-0" />
                  <div>
                    <div className="text-xs text-white/35">{c.label}</div>
                    <div className="text-sm text-white/80">{c.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 rounded-sm" style={{ background: '#161A22', border: '1px solid #252A36' }}>
              <p className="text-sm text-white/50 mb-3">Отправить сообщение редакции</p>
              <textarea rows={3} placeholder="Ваше сообщение..." className="w-full bg-black/30 border rounded-sm px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 transition-colors mb-3 resize-none" style={{ borderColor: '#252A36' }} />
              <button className="px-4 py-2 rounded-sm font-bold text-sm transition-all hover:opacity-90" style={{ background: 'var(--lego-yellow)', color: '#0D0F13', fontFamily: 'Oswald, sans-serif' }}>
                Отправить
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-16 px-8 py-6 border-t text-center" style={{ borderColor: '#252A36' }}>
        <p className="text-white/25 text-xs">© 2024 LEGO ТВ • Лего-Сити • Все события вымышлены и предназначены для детской аудитории</p>
      </footer>

      {/* Modals */}
      {selectedEp && <EpisodeModal ep={selectedEp} onClose={() => setSelectedEp(null)} />}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={() => fetchEpisodes(search)} />}
    </div>
  );
}