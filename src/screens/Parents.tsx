import { useEffect, useMemo, useRef, useState } from 'react';
import { LETTERS } from '../content/letters.ts';
import { NUMBERS } from '../content/numbers.ts';
import { COLORS } from '../content/colors.ts';
import { WORDS } from '../content/words.ts';
import { SESSIONS, buildReview, sessionKnown, weakestSkills } from '../learn/path.ts';
import { masteryOf, type Mastery, type SkillKind } from '../learn/progress.ts';
import { skillLabel, recommend } from '../learn/labels.ts';
import { AREA_HE } from '../learn/questions.ts';
import { useStore } from '../state/store.tsx';
import { useNav } from '../state/nav.tsx';
import { Screen } from '../ui/Screen.tsx';
import { GameRunner } from './GameRunner.tsx';
import { audio } from '../audio/player.ts';
import { clipId } from '../audio/clips.ts';
import { saveRecording, deleteRecording, listRecordingIds } from '../audio/recordings.ts';
import ttsAudit from '../audio/tts-audit.json';
import phonemeAudit from '../audio/phoneme-audit.json';
import { IconMic, IconSpeaker } from '../ui/icons.tsx';

const M_HE: Record<Mastery, string> = { known: 'יודעת', learning: 'בתהליך', weak: 'צריך חיזוק', new: 'עוד לא תורגל' };

function Cell({ label, m, en = true }: { label: string; m: Mastery; en?: boolean }) {
  return (
    <span className={`mcell mcell--${m}`} title={M_HE[m]}>
      <b dir={en ? 'ltr' : undefined} lang={en ? 'en' : undefined}>{label}</b>
      <small>{M_HE[m]}</small>
    </span>
  );
}

function countBy(save: ReturnType<typeof useStore>['save'], kind: SkillKind, items: (string | number)[]) {
  const ms = items.map((i) => masteryOf(save, kind, i));
  return { known: ms.filter((m) => m === 'known').length, weak: ms.filter((m) => m === 'weak').length, tried: ms.filter((m) => m !== 'new').length, total: items.length };
}

export function ParentsScreen() {
  const { save, reset } = useStore();
  const nav = useNav();
  const [quick, setQuick] = useState(false);
  const weak = useMemo(() => weakestSkills(save, 8), [save]);
  const quickQs = useMemo(() => (quick ? buildReview(save, 10) : []), [quick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (quick) {
    return (
      <Screen title="תרגול מהיר" tone="purple">
        <GameRunner questions={quickQs} title="תרגול מהיר" onExit={() => setQuick(false)} onFinish={() => setQuick(false)} finishLabel="חזרה לאזור ההורים" />
      </Screen>
    );
  }

  const L = LETTERS.map((l) => l.id);
  const names = countBy(save, 'letterName', L);
  const sounds = countBy(save, 'letterSound', L);
  const nums = countBy(save, 'number', NUMBERS.map((n) => n.n));
  const cols = countBy(save, 'color', COLORS.map((c) => c.id));
  const words = countBy(save, 'word', WORDS.map((w) => w.id));
  const totalAnswers = Object.values(save.skills).reduce((s, x) => s + x.a, 0);
  const hardSounds = LETTERS.filter((l) => masteryOf(save, 'letterSound', l.id) === 'weak');

  return (
    <Screen title="אזור הורים" tone="blue" noSlow>
      <div className="parents">
        <p className="lead">כאן רואים מה נועה באמת יודעת: רק תשובות נכונות בניסיון הראשון נחשבות. "יודעת" = 3 תשובות נכונות ברצף. סה״כ {totalAnswers} תשובות.</p>

        <section className="p-card p-card--rec">
          <h2>המלצה לתרגול הבא</h2>
          <p>{totalAnswers ? recommend(weak) : 'עוד אין מספיק תשובות. כדאי להתחיל במפגש 1 במסלול.'}</p>
          {weak.length > 0 && <ul className="chips">{weak.map((k) => <li key={k}>{skillLabel(k)}</li>)}</ul>}
          <button type="button" className="btn btn--primary" onClick={() => setQuick(true)}>תרגול מהיר – 10 שאלות על מה שהכי קשה</button>
        </section>

        <section className="p-card">
          <h2>מסלול הלמידה</h2>
          <ul className="p-path">
            {SESSIONS.map((s) => {
              const r = save.sessions[s.id];
              const k = sessionKnown(save, s);
              return (
                <li key={s.id}>
                  <b>מפגש {s.n}: {s.title}</b>
                  <span>{r?.done ? `הושלם (${r.runs} פעמים), אחרון: ${r.lastCorrect}/${r.lastTotal} נכון` : 'עוד לא הושלם'}</span>
                  {k && <span>שליטה: {k.known}/{k.total}</span>}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="p-card">
          <h2>אותיות – שמות <small>{names.known}/16 יודעת</small></h2>
          <div className="mgrid">{LETTERS.map((l) => <Cell key={l.id} label={l.upper + l.lower} m={masteryOf(save, 'letterName', l.id)} />)}</div>
          <h2>אותיות – צלילים <small>{sounds.known}/16 יודעת</small></h2>
          <div className="mgrid">{LETTERS.map((l) => <Cell key={l.id} label={`/${l.ipa}/ ${l.upper}`} m={masteryOf(save, 'letterSound', l.id)} />)}</div>
          {hardSounds.length > 0 && <p className="warn">צלילים שעדיין קשים: <b dir="ltr">{hardSounds.map((l) => l.upper).join(', ')}</b></p>}
          <h2>אות גדולה/קטנה וכתיבה</h2>
          <div className="mgrid">{LETTERS.map((l) => <Cell key={l.id} label={l.upper + l.lower} m={worse(masteryOf(save, 'letterCase', l.id), masteryOf(save, 'letterWrite', l.id))} />)}</div>
        </section>

        <section className="p-card">
          <h2>מספרים בהאזנה <small>{nums.known}/20 יודעת · {nums.weak} צריכים חיזוק</small></h2>
          <div className="mgrid mgrid--num">{NUMBERS.map((n) => <Cell key={n.n} label={String(n.n)} m={masteryOf(save, 'number', n.n)} />)}</div>
          <h2>צבעים בהאזנה <small>{cols.known}/10 יודעת</small></h2>
          <div className="mgrid">{COLORS.map((c) => <Cell key={c.id} label={c.id} m={masteryOf(save, 'color', c.id)} />)}</div>
          <h2>קריאת המילים <small>{words.known}/7 יודעת</small></h2>
          <div className="mgrid">{WORDS.map((w) => <Cell key={w.id} label={w.id} m={masteryOf(save, 'word', w.id)} />)}</div>
        </section>

        <section className="p-card">
          <h2>מבחנים לדוגמה</h2>
          {save.exams.length === 0 ? <p>עוד לא נעשה מבחן.</p> : (
            <table className="area-table">
              <thead><tr><th>תאריך</th><th>ציון</th><th>לפי תחום</th></tr></thead>
              <tbody>
                {save.exams.slice().reverse().map((e) => (
                  <tr key={e.at}>
                    <td>{new Date(e.at).toLocaleDateString('he-IL')}</td>
                    <td><b>{e.score}</b></td>
                    <td className="small">{Object.entries(e.byDomain).map(([a, v]) => `${AREA_HE[a as keyof typeof AREA_HE] ?? a} ${v.c}/${v.t}`).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="p-card">
          <h2>שמע</h2>
          <p>בדיקת הצלילים הפונטיים, הקלטה עצמית של צליל, ודוח הבדיקה האוטומטית של קובצי השמע.</p>
          <button type="button" className="btn btn--ghost" onClick={() => nav.go({ name: 'soundcheck' })}>בדיקת צלילים והקלטות</button>
        </section>

        <section className="p-card p-card--danger">
          <h2>איפוס</h2>
          <p>ההתקדמות נשמרת רק במכשיר הזה. איפוס מוחק את כל התשובות והמבחנים.</p>
          <button type="button" className="btn btn--danger" onClick={() => { if (confirm('למחוק את כל ההתקדמות של נועה במכשיר הזה?')) reset(); }}>איפוס התקדמות</button>
        </section>
      </div>
    </Screen>
  );
}

function worse(a: Mastery, b: Mastery): Mastery {
  const order: Mastery[] = ['weak', 'new', 'learning', 'known'];
  return order[Math.min(order.indexOf(a), order.indexOf(b))];
}

// ------------------------------------------------------------------ sound check

const REVIEW_KEY = 'noa-english:phoneme-review';
type Review = Record<string, 'ok' | 'bad'>;
function loadReview(): Review {
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY) ?? '{}'); } catch { return {}; }
}

export function SoundCheckScreen() {
  const [review, setReview] = useState<Review>(loadReview);
  const [recs, setRecs] = useState<string[]>([]);
  const [recording, setRecording] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  useEffect(() => { void listRecordingIds().then(setRecs); }, []);
  useEffect(() => { try { localStorage.setItem(REVIEW_KEY, JSON.stringify(review)); } catch { /* ignore */ } }, [review]);

  const record = async (id: string) => {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/mp4' });
        const trimmed = await trimSilence(blob).catch(() => blob);
        await saveRecording(clipId.phoneme(id), trimmed);
        setRecs(await listRecordingIds());
        setRecording(null);
        void audio.play(clipId.phoneme(id));
      };
      mr.current = rec;
      setRecording(id);
      rec.start();
      setTimeout(() => rec.state === 'recording' && rec.stop(), 2000);
    } catch {
      setErr('אין גישה למיקרופון. צריך לאשר גישה למיקרופון בדפדפן.');
      setRecording(null);
    }
  };

  const unconfirmed = ttsAudit.unconfirmed;
  return (
    <Screen title="בדיקת צלילים" tone="blue" noSlow>
      <div className="parents">
        <section className="p-card">
          <h2>הצלילים הפונטיים</h2>
          <p>
            כל צליל נחתך אוטומטית ממילה אמיתית שהוקלטה (למשל /b/ מתוך bat), בלי "אה" אחרי העיצור. בדיקה ממוחשבת עברה, אבל <b>אוזן אנושית צריכה לאשר</b>.
            הקשיבי לכל צליל: אם הוא נשמע נכון – "נשמע נכון". אם לא – אפשר להקליט את הצליל בקולך (2 שניות), וההקלטה תחליף את הקובץ במכשיר הזה.
          </p>
          {err && <p className="warn">{err}</p>}
          <table className="sound-table">
            <thead><tr><th>אות</th><th>צליל</th><th>מקור</th><th>שמיעה</th><th>אישור</th><th>הקלטה</th></tr></thead>
            <tbody>
              {phonemeAudit.map((p) => {
                const hasRec = recs.includes(clipId.phoneme(p.id));
                const l = LETTERS.find((x) => x.id === p.id);
                return (
                  <tr key={p.id} className={review[p.id] === 'ok' ? 'is-ok' : review[p.id] === 'bad' ? 'is-bad' : ''}>
                    <td dir="ltr"><b>{l ? l.upper + l.lower : p.id}</b>{!l && <small> (למילים)</small>}</td>
                    <td dir="ltr">/{p.ipa}/</td>
                    <td><small>{hasRec ? 'הקלטה שלך' : <>מתוך <span dir="ltr" lang="en">{p.carrier}</span></>}</small></td>
                    <td>
                      <button type="button" className="btn btn--icon" onClick={() => void audio.play(clipId.phoneme(p.id))} aria-label="השמעה"><IconSpeaker /></button>
                      {l && <button type="button" className="btn btn--icon btn--small" onClick={() => void audio.play(clipId.word(l.example))} aria-label="מילה לדוגמה"><span dir="ltr" lang="en">{l.example}</span></button>}
                    </td>
                    <td className="nowrap">
                      <button type="button" className={`btn btn--small ${review[p.id] === 'ok' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setReview({ ...review, [p.id]: 'ok' })}>נשמע נכון</button>
                      <button type="button" className={`btn btn--small ${review[p.id] === 'bad' ? 'btn--danger' : 'btn--ghost'}`} onClick={() => setReview({ ...review, [p.id]: 'bad' })}>לא</button>
                    </td>
                    <td className="nowrap">
                      <button type="button" className={`btn btn--small btn--ghost ${recording === p.id ? 'is-rec' : ''}`} disabled={!!recording} onClick={() => void record(p.id)}><IconMic /> {recording === p.id ? 'מקליטה…' : 'הקלטה'}</button>
                      {hasRec && <button type="button" className="btn btn--small btn--ghost" onClick={async () => { await deleteRecording(clipId.phoneme(p.id)); setRecs(await listRecordingIds()); }}>מחיקה</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="small">אושרו: {Object.values(review).filter((x) => x === 'ok').length}/{phonemeAudit.length}</p>
        </section>

        <section className="p-card">
          <h2>בדיקה אוטומטית של קובצי הדיבור</h2>
          <p>
            {ttsAudit.total} קבצים (רגיל + איטי) נבדקו ב־{ttsAudit.checkedAt} בזיהוי דיבור אנגלי עצמאי. {ttsAudit.confirmed} זוהו בדיוק כמו שצריך.
            את הקבצים הבאים מנוע הזיהוי לא הצליח לאשר (המנוע עצמו מתבלבל באותיות בודדות ובמילים קצרות, גם בקולות אחרים) – כדאי להקשיב להם:
          </p>
          <ul className="chips">
            {unconfirmed.map((u) => (
              <li key={u.id + u.slow}>
                <button type="button" className="chip-btn" onClick={() => void audio.play(u.id, { slow: u.slow })} dir="ltr">🔊 {u.id}{u.slow ? ' (slow)' : ''}</button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Screen>
  );
}

/** Trim silence from a recording and return it as WAV (plays everywhere, incl. Safari). */
async function trimSilence(blob: Blob): Promise<Blob> {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const data = await blob.arrayBuffer();
  const buf = await new Promise<AudioBuffer>((res, rej) => { ctx.decodeAudioData(data, res, rej); });
  const d = buf.getChannelData(0);
  let peak = 0;
  for (const x of d) peak = Math.max(peak, Math.abs(x));
  const th = peak * 0.08;
  let a = 0;
  let b = d.length - 1;
  while (a < d.length && Math.abs(d[a]) < th) a++;
  while (b > a && Math.abs(d[b]) < th) b--;
  a = Math.max(0, a - Math.round(0.03 * buf.sampleRate));
  b = Math.min(d.length, b + Math.round(0.06 * buf.sampleRate));
  const seg = d.slice(a, b);
  const gain = peak > 0 ? 0.85 / peak : 1;
  const n = seg.length;
  const out = new DataView(new ArrayBuffer(44 + n * 2));
  const w = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); out.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * 2, true);
  out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) out.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(seg[i] * gain * 32767))), true);
  void ctx.close();
  return new Blob([out.buffer], { type: 'audio/wav' });
}


