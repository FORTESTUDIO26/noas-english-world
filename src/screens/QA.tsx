// Listening quality control (parents' area, not reachable from the games).
// Every clip can be played (normal / slow), marked "תקין" or "דורש תיקון" and
// given a note. Nothing is marked as verified until a person listened to it.
// The marks are stored on this device per audio version, so new recordings
// never inherit an old approval.
import { useEffect, useMemo, useRef, useState } from 'react';
import { T } from '../text/he.ts';
import { Screen } from '../ui/Screen.tsx';
import { MixedText } from '../ui/MixedText.tsx';
import { HandwritingPad, writeMessage } from '../ui/HandwritingPad.tsx';
import { audio } from '../audio/player.ts';
import { clipId, buildTtsClips, buildPhonemeClips, AUDIO_VERSION } from '../audio/clips.ts';
import { speechClips } from '../audio/speech.ts';
import { LETTERS } from '../content/letters.ts';
import { NUMBERS } from '../content/numbers.ts';
import { COLORS } from '../content/colors.ts';
import { saveRecording, deleteRecording, listRecordings, reactivateRecording, recordingIsCurrent, type Recording } from '../audio/recordings.ts';
import { trimSilence } from './Parents.tsx';
import ttsAudit from '../audio/tts-audit.json';
import phonemeAudit from '../audio/phoneme-audit.json';
import heClips from '../audio/he-clips.json';
import { IconMic, IconSpeaker, IconTurtle } from '../ui/icons.tsx';

const Q = T.qa;
const KEY = 'noa-english:qa';
type Mark = { status?: 'ok' | 'fix'; note?: string };
type Marks = Record<string, Mark>;
const markKey = (id: string) => `${id}@${AUDIO_VERSION}`;

function loadMarks(): Marks {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}

interface Item {
  id: string;
  label: string;
  /** clip ids played for this item */
  clips: string[];
  slow?: boolean;
  /** shown in Hebrew/English mixed text */
  mixed?: boolean;
  autoNote?: string;
}

const unconfirmed = new Set(ttsAudit.unconfirmed.map((u) => u.id));

function groups(): { key: string; title: string; items: Item[] }[] {
  const tts = buildTtsClips();
  const auto = (id: string) => (unconfirmed.has(id) ? Q.autoUnconfirmed : undefined);
  const ph = Object.fromEntries(phonemeAudit.map((p) => [p.id, p]));
  return [
    {
      key: 'names', title: Q.groups.names,
      items: LETTERS.map((l) => ({ id: clipId.letterName(l.id), label: `${l.upper}${l.lower}`, clips: [clipId.letterName(l.id)], slow: true, autoNote: auto(clipId.letterName(l.id)) })),
    },
    {
      key: 'sounds', title: Q.groups.sounds,
      items: buildPhonemeClips().map((p) => {
        const l = LETTERS.find((x) => x.id === p.id);
        const a = ph[p.id];
        return { id: clipId.phoneme(p.id), label: `/${p.ipa}/ ${l ? l.upper + l.lower : p.id}${l ? ` · ${l.example}` : ''}`, clips: [clipId.phoneme(p.id)], autoNote: a ? (a.autoOk ? Q.autoOk : Q.autoFail) : undefined };
      }),
    },
    {
      key: 'numbers', title: Q.groups.numbers,
      items: NUMBERS.map((n) => ({ id: clipId.number(n.n), label: `${n.n} · ${n.word}`, clips: [clipId.number(n.n)], slow: true, autoNote: auto(clipId.number(n.n)) })),
    },
    {
      key: 'colors', title: Q.groups.colors,
      items: COLORS.map((c) => ({ id: clipId.color(c.id), label: `${c.id} · ${c.he}`, clips: [clipId.color(c.id)], slow: true, autoNote: auto(clipId.color(c.id)) })),
    },
    {
      key: 'words', title: Q.groups.words,
      items: tts.filter((c) => c.group === 'word').map((c) => ({ id: c.id, label: c.text.replace('.', ''), clips: [c.id], slow: true, autoNote: auto(c.id) })),
    },
    {
      key: 'english', title: Q.groups.english,
      items: tts.filter((c) => c.group === 'instruction').map((c) => ({ id: c.id, label: c.text, clips: [c.id], slow: true, autoNote: auto(c.id) })),
    },
    {
      key: 'hebrew', title: Q.groups.hebrew,
      items: Object.entries(heClips as Record<string, string>).map(([id, text]) => ({ id, label: text, clips: [id], slow: true })),
    },
    {
      key: 'mixed', title: Q.groups.mixed,
      items: [
        T.q.paintLearn('ball', 'orange'), T.q.paintLearn('cat', 'brown'), T.q.paintLearn('hat', 'pink'),
        T.q.upperToLower('a'), T.q.upperToLower('g'),
      ].map((t, k) => ({ id: `mixed-${k}`, label: t, clips: speechClips(t), slow: true, mixed: true })),
    },
  ];
}

function Row({ item, mark, setMark }: { item: Item; mark: Mark; setMark: (m: Mark) => void }) {
  const [noteOpen, setNoteOpen] = useState(!!mark.note);
  return (
    <li className={`qa-row ${mark.status ? `is-${mark.status}` : ''}`}>
      <div className="qa-row__main">
        <span className="qa-row__label" dir={item.mixed ? 'rtl' : 'auto'}>{item.mixed ? <MixedText text={item.label} /> : item.label}</span>
        <span className="qa-row__state">
          {mark.status === 'ok' ? Q.statusOk : mark.status === 'fix' ? Q.statusFix : Q.statusPending}
          {item.autoNote && <small> · {item.autoNote}</small>}
        </span>
      </div>
      <div className="qa-row__btns">
        <button type="button" className="btn btn--icon btn--small" aria-label={Q.play} onClick={() => void audio.playSequence(item.clips, { gapMs: 350 })}><IconSpeaker size={18} /></button>
        {item.slow && <button type="button" className="btn btn--icon btn--small" aria-label={Q.playSlow} onClick={() => void audio.playSequence(item.clips, { slow: true, gapMs: 450 })}><IconTurtle size={18} /></button>}
        <button type="button" className={`btn btn--small ${mark.status === 'ok' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setMark({ ...mark, status: 'ok' })}>{Q.ok}</button>
        <button type="button" className={`btn btn--small ${mark.status === 'fix' ? 'btn--danger' : 'btn--ghost'}`} onClick={() => { setMark({ ...mark, status: 'fix' }); setNoteOpen(true); }}>{Q.fix}</button>
        <button type="button" className="btn btn--small btn--ghost" onClick={() => setNoteOpen(!noteOpen)}>{Q.note}</button>
      </div>
      {noteOpen && (
        <input className="qa-row__note" placeholder={Q.notePlaceholder} defaultValue={mark.note ?? ''}
          onBlur={(e) => setMark({ ...mark, note: e.target.value.trim() || undefined })} />
      )}
    </li>
  );
}

export function SoundCheckScreen() {
  const [marks, setMarks] = useState<Marks>(loadMarks);
  const [open, setOpen] = useState<string>('samples');
  const [copied, setCopied] = useState(false);
  const all = useMemo(groups, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(marks)); } catch { /* ignore */ } }, [marks]);
  const get = (id: string) => marks[markKey(id)] ?? {};
  const set = (id: string) => (m: Mark) => setMarks((s) => ({ ...s, [markKey(id)]: m }));

  const counts = all.flatMap((g) => g.items).reduce((c, it) => {
    const s = get(it.id).status;
    if (s === 'ok') c.ok++; else if (s === 'fix') c.fix++; else c.pending++;
    return c;
  }, { ok: 0, fix: 0, pending: 0 });

  const report = () => {
    const out: Record<string, Mark & { label: string }> = {};
    for (const g of all) for (const it of g.items) {
      const m = get(it.id);
      if (m.status || m.note) out[it.id] = { label: it.label, ...m };
    }
    return JSON.stringify({ audioVersion: AUDIO_VERSION, marks: out }, null, 1);
  };

  return (
    <Screen title={Q.title} tone="blue" noSlow>
      <div className="parents qa">
        <p className="lead">{Q.lead}</p>
        <p className="qa-counts">{Q.counts(counts.ok, counts.fix, counts.pending)}</p>

        <section className="p-card">
          <button type="button" className="qa-head" onClick={() => setOpen(open === 'samples' ? '' : 'samples')} aria-expanded={open === 'samples'}>{Q.samplesTitle}</button>
          {open === 'samples' && <Samples get={get} set={set} />}
        </section>

        <section className="p-card">
          <button type="button" className="qa-head" onClick={() => setOpen(open === 'writing' ? '' : 'writing')} aria-expanded={open === 'writing'}>{Q.writingTitle}</button>
          {open === 'writing' && <WritingDemos />}
        </section>

        {all.map((g) => (
          <section key={g.key} className="p-card">
            <button type="button" className="qa-head" onClick={() => setOpen(open === g.key ? '' : g.key)} aria-expanded={open === g.key}>
              {g.title} <small>({g.items.length})</small>
            </button>
            {open === g.key && (
              <>
                {g.key === 'sounds' && <RecordingsPanel />}
                <ul className="qa-list">{g.items.map((it) => <Row key={it.id} item={it} mark={get(it.id)} setMark={set(it.id)} />)}</ul>
              </>
            )}
          </section>
        ))}

        <section className="p-card">
          <h2>{Q.reportTitle}</h2>
          <p>{Q.reportLead}</p>
          <button type="button" className="btn btn--primary" onClick={async () => {
            try { await navigator.clipboard.writeText(report()); setCopied(true); } catch { setCopied(false); }
          }}>{Q.copyReport}</button>
          {copied && <p className="ok">{Q.copied}</p>}
        </section>
      </div>
    </Screen>
  );
}

/** Stage-1 samples to approve before everything else. */
function Samples({ get, set }: { get: (id: string) => Mark; set: (id: string) => (m: Mark) => void }) {
  const items: Item[] = [
    { id: 'sample-name-b', label: Q.sample.nameB, clips: [clipId.letterName('b')], slow: true },
    { id: 'sample-sound-b', label: Q.sample.soundB, clips: [clipId.phoneme('b')] },
    { id: 'sample-name-a', label: Q.sample.nameA, clips: [clipId.letterName('a')], slow: true },
    { id: 'sample-sound-a', label: Q.sample.soundA, clips: [clipId.phoneme('a')] },
    { id: 'sample-all-m', label: Q.sample.allM, clips: [clipId.letterName('m'), clipId.phoneme('m'), clipId.word('moon')] },
    { id: 'sample-number', label: Q.sample.number, clips: [clipId.number(17)], slow: true },
    { id: 'sample-color', label: Q.sample.color, clips: [clipId.color('purple')], slow: true },
    { id: 'sample-he', label: T.q.hearNumber, clips: speechClips(T.q.hearNumber), slow: true, mixed: true },
    { id: 'sample-mixed', label: T.q.paintLearn('ball', 'orange'), clips: speechClips(T.q.paintLearn('ball', 'orange')), slow: true, mixed: true },
    { id: 'sample-listen', label: Q.sample.listen, clips: [...speechClips(T.q.listenDo), clipId.colorThing('ball', 'orange')], slow: true },
  ];
  return (
    <>
      <p>{Q.samplesLead}</p>
      <ul className="qa-list">{items.map((it) => <Row key={it.id} item={it} mark={get(it.id)} setMark={set(it.id)} />)}</ul>
    </>
  );
}

function WritingDemos() {
  const [pick, setPick] = useState<{ id: 'a' | 'b'; which: 'upper' | 'lower' }>({ id: 'a', which: 'upper' });
  const [msg, setMsg] = useState<string | null>(null);
  const opts: { id: 'a' | 'b'; which: 'upper' | 'lower'; label: string }[] = [
    { id: 'a', which: 'upper', label: 'A' }, { id: 'a', which: 'lower', label: 'a' },
    { id: 'b', which: 'upper', label: 'B' }, { id: 'b', which: 'lower', label: 'b' },
  ];
  return (
    <>
      <p>{Q.writingLead}</p>
      <div className="seg" role="radiogroup">
        {opts.map((o) => (
          <button key={o.label} type="button" className={pick.id === o.id && pick.which === o.which ? 'is-on' : ''} onClick={() => { setPick(o); setMsg(null); }} lang="en">{o.label}</button>
        ))}
      </div>
      <HandwritingPad key={`${pick.id}${pick.which}`} letter={pick.id} which={pick.which} onResult={(r) => setMsg(writeMessage(r))} />
      {msg && <p className="hint" role="status">{msg}</p>}
    </>
  );
}

/** Parent recordings of phonics sounds: old ones (made for v1 sounds) are not played until re-activated. */
function RecordingsPanel() {
  const [recs, setRecs] = useState<Recording[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const refresh = () => void listRecordings().then(setRecs);
  useEffect(refresh, []);
  const mr = useRef<MediaRecorder | null>(null);

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
        await saveRecording(clipId.phoneme(id), await trimSilence(blob).catch(() => blob));
        setBusy(null);
        refresh();
        void audio.play(clipId.phoneme(id));
      };
      mr.current = rec;
      setBusy(id);
      rec.start();
      setTimeout(() => rec.state === 'recording' && rec.stop(), 2000);
    } catch {
      setErr(T.sound.micDenied);
      setBusy(null);
    }
  };

  const byId = new Map(recs.map((r) => [r.id, r]));
  return (
    <div className="qa-rec">
      <p>{Q.recLead}</p>
      {err && <p className="warn">{err}</p>}
      <div className="qa-rec__grid">
        {buildPhonemeClips().map((p) => {
          const r = byId.get(clipId.phoneme(p.id));
          const old = r && !recordingIsCurrent(r);
          return (
            <div key={p.id} className="qa-rec__item">
              <b dir="ltr">/{p.ipa}/</b>
              {r ? <small>{old ? Q.recOld : Q.recActive}</small> : <small>{Q.recNone}</small>}
              <button type="button" className={`btn btn--small btn--ghost ${busy === p.id ? 'is-rec' : ''}`} disabled={!!busy} onClick={() => void record(p.id)}><IconMic /> {busy === p.id ? T.sound.recording : T.sound.record}</button>
              {old && <button type="button" className="btn btn--small btn--ghost" onClick={async () => { await reactivateRecording(clipId.phoneme(p.id)); refresh(); }}>{Q.recReactivate}</button>}
              {r && <button type="button" className="btn btn--small btn--ghost" onClick={async () => { if (confirm(Q.recConfirmDelete)) { await deleteRecording(clipId.phoneme(p.id)); refresh(); } }}>{T.sound.del}</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
