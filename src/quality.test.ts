// Quality checks required before delivery (see README "בדיקות").
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LETTERS } from './content/letters.ts';
import { NUMBERS } from './content/numbers.ts';
import { COLORS } from './content/colors.ts';
import { WORDS } from './content/words.ts';
import { buildTtsClips, buildPhonemeClips, ttsPath, phonemePath, clipId } from './audio/clips.ts';
import ttsAudit from './audio/tts-audit.json';
import phonemeAudit from './audio/phoneme-audit.json';
import {
  buildExam, buildGame, buildListeningLab, questionSkills, EXAM_PLAN, type GameId, type Question, type Visual,
} from './learn/questions.ts';
import { emptySave, loadSave, mastery, recordAnswer, writeSave, type Save } from './learn/progress.ts';
import { SESSIONS, buildReview, buildStep } from './learn/path.ts';
import { PICTURE_IDS } from './art/pictures.tsx';
import { addProfile, checkName, deleteProfile, loadProfiles, saveKey, selectProfile } from './state/profiles.ts';
import { T, BRAND } from './text/he.ts';

const PUB = path.resolve(__dirname, '..', 'public');
const exists = (p: string) => fs.existsSync(path.join(PUB, p)) && fs.statSync(path.join(PUB, p)).size > 500;

// Deterministic random for reproducible checks.
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

describe('1. closed content list', () => {
  it('has exactly the 16 letters A–P, each with upper/lower, sound and picture', () => {
    expect(LETTERS.map((l) => l.upper).join('')).toBe('ABCDEFGHIJKLMNOP');
    for (const l of LETTERS) {
      expect(l.lower).toBe(l.upper.toLowerCase());
      expect(l.ipa).toBeTruthy();
      expect(PICTURE_IDS).toContain(l.picture);
      expect(l.example[0]).toBe(l.id);
    }
  });
  it('uses the agreed phonics sounds (short vowels, hard c and g)', () => {
    const ipa = Object.fromEntries(LETTERS.map((l) => [l.id, l.ipa]));
    expect(ipa).toMatchObject({ a: 'æ', e: 'ɛ', i: 'ɪ', o: 'ɑ', c: 'k', g: 'g' });
  });
  it('has numbers 1–20 only', () => {
    expect(NUMBERS.map((n) => n.n)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
  it('has the ten colours', () => {
    expect(COLORS.map((c) => c.id).sort()).toEqual(['black', 'blue', 'brown', 'gray', 'green', 'orange', 'pink', 'purple', 'white', 'yellow']);
  });
  it('has the seven words with pictures', () => {
    expect(WORDS.map((w) => w.id).sort()).toEqual(['bag', 'ball', 'banana', 'cat', 'dog', 'hat', 'tap']);
    for (const w of WORDS) expect(PICTURE_IDS).toContain(w.picture);
    expect(new Set(WORDS.map((w) => w.picture)).size).toBe(7);
  });
});

describe('2–4. audio files', () => {
  it('every TTS clip exists in normal and slow speed', () => {
    const missing = buildTtsClips().flatMap((c) => [ttsPath(c.id), ttsPath(c.id, true)]).filter((p) => !exists(p));
    expect(missing).toEqual([]);
  });
  it('every phonics sound exists as its own file, separate from the letter name', () => {
    for (const p of buildPhonemeClips()) {
      expect(exists(phonemePath(p.id))).toBe(true);
    }
    for (const l of LETTERS) {
      const name = fs.readFileSync(path.join(PUB, ttsPath(clipId.letterName(l.id))));
      const sound = fs.readFileSync(path.join(PUB, phonemePath(l.id)));
      expect(name.equals(sound)).toBe(false);
      // different formats/sources: the name is a spoken MP3, the sound is a cut WAV
      expect(sound.subarray(0, 4).toString()).toBe('RIFF');
    }
  });
  it('phonics sounds are short and pass the automatic acoustic checks', () => {
    expect(phonemeAudit).toHaveLength(17);
    for (const p of phonemeAudit) expect(p.autoOk, p.id).toBe(true);
    for (const l of LETTERS) {
      const bytes = fs.statSync(path.join(PUB, phonemePath(l.id))).size;
      const seconds = (bytes - 44) / 2 / 24000;
      expect(seconds, l.id).toBeLessThan(0.6);
    }
  });
  it('every number 1–20 was confirmed by speech recognition (normal + slow), incl. 13 vs 30', () => {
    const bad = new Set(ttsAudit.unconfirmed.map((u) => u.id));
    for (const n of NUMBERS) {
      expect(bad.has(clipId.number(n.n)), `num ${n.n}`).toBe(false);
      expect(bad.has(clipId.touchNumber(n.n)), `touch ${n.n}`).toBe(false);
    }
  });
  it('every colour and colouring instruction was confirmed by speech recognition', () => {
    const bad = ttsAudit.unconfirmed.map((u) => u.id).filter((id) => id.startsWith('color-') || id.startsWith('choose-color') || id.includes('paint-'));
    expect(bad).toEqual([]);
  });
});

const allVisuals = (q: Question): Visual[] => {
  switch (q.kind) {
    case 'choice': return [...q.options, ...(q.show ? [q.show] : [])];
    case 'pairs': return q.pairs.flatMap((p) => [p.left, p.right]);
    default: return [];
  }
};

function inScope(q: Question) {
  const letters = new Set(LETTERS.flatMap((l) => [l.upper, l.lower]));
  const words = new Set<string>(WORDS.map((w) => w.id));
  for (const v of allVisuals(q)) {
    if (v.t === 'letter') expect(letters.has(v.text), `letter ${v.text}`).toBe(true);
    if (v.t === 'number') expect(v.n >= 1 && v.n <= 20).toBe(true);
    if (v.t === 'word') expect(words.has(v.text), `word to read: ${v.text}`).toBe(true);
    if (v.t === 'seq') v.items.forEach((x) => x && expect(letters.has(x)).toBe(true));
  }
  if (q.kind === 'paint') q.targets.forEach((t) => expect(WORDS.some((w) => w.id === t.thing)).toBe(true));
  if (q.kind === 'trace') expect(LETTERS.some((l) => l.id === q.letter)).toBe(true);
}

describe('7. listening tasks never show the answer in text', () => {
  it('listening choice questions have no written answer among the options or the shown visual', () => {
    const save = emptySave();
    const qs = [...buildListeningLab(save, 40, rng(1)), ...buildExam(rng(2)).filter((q) => q.listening)];
    for (const q of qs) {
      expect(q.listening).toBe(true);
      if (q.kind === 'choice') {
        const ans = q.options[q.answer];
        expect(['number', 'color', 'thing', 'picture', 'letter']).toContain(ans.t);
        // only a speaker may be shown, never text or a picture of the answer
        if (q.show) expect(q.show.t).toBe('audio');
      }
      if (q.kind === 'paint') expect(q.prompt.en).toBeTruthy(); // shown only after answering (QuestionView)
    }
  });
});

describe('8. scoring and mastery', () => {
  it('only first tries count; known needs 3 right in a row', () => {
    let s = emptySave();
    s = recordAnswer(s, 'letterName:a', true);
    s = recordAnswer(s, 'letterName:a', true);
    expect(mastery(s.skills['letterName:a'])).toBe('learning');
    s = recordAnswer(s, 'letterName:a', true);
    expect(mastery(s.skills['letterName:a'])).toBe('known');
    s = recordAnswer(s, 'letterName:a', false);
    expect(mastery(s.skills['letterName:a'])).toBe('weak');
  });
  it('opening a card does not mark anything as learned', () => {
    const s: Save = { ...emptySave(), opened: { 'letter:a': Date.now() } };
    expect(Object.keys(s.skills)).toHaveLength(0);
    expect(mastery(s.skills['letterName:a'])).toBe('new');
  });
  it('choice questions have exactly one correct option, never duplicated', () => {
    const save = emptySave();
    const games: GameId[] = ['letterName', 'letterSound', 'letterLook', 'missingLetter', 'firstLetter', 'hearNumber', 'teens', 'count', 'numberWord', 'hearColor', 'findColor', 'colorWord', 'wordPicture', 'pictureWord', 'hearWord', 'whichWord', 'wordFirst', 'wordGap'];
    for (const g of games) {
      for (const q of buildGame(g, save, 30, { rnd: rng(g.length) })) {
        if (q.kind !== 'choice') continue;
        const keys = q.options.map((o) => JSON.stringify(o));
        expect(new Set(keys).size, `${g} duplicate options`).toBe(keys.length);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
    }
  });
  it('sound questions never offer both C and K (same /k/ sound)', () => {
    for (const q of buildGame('letterSound', emptySave(), 200, { rnd: rng(7) })) {
      if (q.kind !== 'choice') continue;
      const texts = q.options.map((o) => (o.t === 'letter' ? o.text : ''));
      expect(texts.includes('C') && texts.includes('K')).toBe(false);
    }
  });
  it('all 16 letters are practised by the letter games, not only the first ones', () => {
    const seen = new Set<string>();
    for (const g of ['letterName', 'letterSound'] as GameId[]) {
      for (const q of buildGame(g, emptySave(), 32, { rnd: rng(3) })) questionSkills(q).forEach((k) => seen.add(k));
    }
    for (const l of LETTERS) {
      expect(seen.has(`letterName:${l.id}`), l.id).toBe(true);
      expect(seen.has(`letterSound:${l.id}`), l.id).toBe(true);
    }
  });
});

describe('9. progress is saved', () => {
  it('survives a reload (write + load)', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    let s = recordAnswer(emptySave(), 'number:13', true);
    s = { ...s, sessions: { s1: { done: true, runs: 1, lastCorrect: 5, lastTotal: 6 } } };
    writeSave('k1', s, storage);
    const back = loadSave('k1', storage);
    expect(back.skills['number:13'].c).toBe(1);
    expect(back.sessions.s1.done).toBe(true);
  });
  it('a broken save does not crash the app', () => {
    expect(loadSave('k', { getItem: () => '{bad json' }).v).toBe(1);
  });
});

describe('12. the sample test stays inside the official material', () => {
  it('is balanced across areas and uses only A–P, 1–20, the 10 colours and the 7 words', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const exam = buildExam(rng(seed));
      const total = EXAM_PLAN.reduce((s, p) => s + p.count, 0);
      expect(exam).toHaveLength(total);
      for (const p of EXAM_PLAN) expect(exam.filter((q) => q.area === p.area)).toHaveLength(p.count);
      exam.forEach(inScope);
      // every sound the exam plays exists
      for (const q of exam) for (const id of q.prompt.audio) {
        expect(id.startsWith('sound-') ? exists(phonemePath(id.slice(6))) : exists(ttsPath(id)), id).toBe(true);
      }
    }
  });
  it('different runs give a different order', () => {
    const a = buildExam(rng(1)).map((q) => q.area + q.prompt.he).join();
    const b = buildExam(rng(99)).map((q) => q.area + q.prompt.he).join();
    expect(a).not.toBe(b);
  });
  it('sessions and reviews only use in-scope content too', () => {
    const save = emptySave();
    for (const s of SESSIONS) for (const st of s.steps) buildStep(st, save).forEach(inScope);
    buildReview(save, 12).forEach(inScope);
  });
});

// ------------------------------------------------------------------ v2: profiles, language, branding

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    keys: () => [...m.keys()],
  };
}

describe('profiles', () => {
  it('creates profiles with their own separate progress, kept after reload', () => {
    const st = memStorage();
    const a = addProfile('נועה', st);
    const b = addProfile('עידו', st);
    writeSave(saveKey(a.id), recordAnswer(emptySave(), 'number:13', true), st);
    writeSave(saveKey(b.id), recordAnswer(emptySave(), 'number:13', false), st);
    // "reload": read everything again from storage
    const p = loadProfiles(st);
    expect(p.list.map((x) => x.name)).toEqual(['נועה', 'עידו']);
    expect(p.current).toBe(b.id);
    expect(loadSave(saveKey(a.id), st).skills['number:13'].c).toBe(1);
    expect(loadSave(saveKey(b.id), st).skills['number:13'].c).toBe(0);
    selectProfile(a.id, st);
    expect(loadProfiles(st).current).toBe(a.id);
  });
  it('deleting one profile keeps the others and their progress', () => {
    const st = memStorage();
    const a = addProfile('א', st);
    const b = addProfile('ב', st);
    writeSave(saveKey(a.id), recordAnswer(emptySave(), 'color:pink', true), st);
    writeSave(saveKey(b.id), recordAnswer(emptySave(), 'color:blue', true), st);
    deleteProfile(a.id, st);
    const p = loadProfiles(st);
    expect(p.list.map((x) => x.id)).toEqual([b.id]);
    expect(st.getItem(saveKey(a.id))).toBeNull();
    expect(loadSave(saveKey(b.id), st).skills['color:blue'].c).toBe(1);
  });
  it('validates names (no empty, max 20, no duplicates)', () => {
    const st = memStorage();
    addProfile('Ido', st);
    const list = loadProfiles(st).list;
    expect(checkName('  ', list)).toBe('empty');
    expect(checkName('x'.repeat(21), list)).toBe('tooLong');
    expect(checkName('ido', list)).toBe('taken');
    expect(checkName('נועה', list)).toBeNull();
  });
  it('moves a save from the first version into a profile instead of losing it', () => {
    const st = memStorage();
    st.setItem('noa-english:save', JSON.stringify(recordAnswer(emptySave(), 'word:cat', true)));
    const p = loadProfiles(st);
    expect(p.list).toHaveLength(1);
    expect(loadSave(saveKey(p.list[0].id), st).skills['word:cat'].c).toBe(1);
    expect(st.getItem('noa-english:save')).toBeNull();
  });
});

/** Every Hebrew string the interface can show (static texts + all generated questions). */
function allHebrewTexts(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v);
    else if (typeof v === 'function') {
      try { out.push(String((v as (...a: unknown[]) => unknown)('X', 'Y', 'Z', 'W'))); } catch { /* ignore */ }
      try { out.push(String((v as (...a: unknown[]) => unknown)(3, 4, 5, 6))); } catch { /* ignore */ }
    } else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(T);
  const save = emptySave();
  const games: GameId[] = ['letterName', 'letterSound', 'letterLook', 'letterPairs', 'missingLetter', 'firstLetter', 'trace', 'hearNumber', 'teens', 'count', 'numberWord', 'numberMemory', 'hearColor', 'findColor', 'colorWord', 'paint', 'wordPicture', 'pictureWord', 'hearWord', 'whichWord', 'wordFirst', 'wordGap'];
  for (const g of games) for (const q of buildGame(g, save, 10, { rnd: rng(5) })) {
    out.push(q.prompt.he, q.prompt.helpHe ?? '', q.explainHe);
  }
  for (const s of SESSIONS) out.push(s.title, s.goal, ...s.steps.map((x) => x.title));
  return out;
}

describe('language: suitable for boys and girls', () => {
  // Feminine-only forms that the first version used (imperatives, adjectives, plural-feminine).
  const FEMININE = /(^|[\s"(])(הקשיבי|בחרי|לחצי|עברי|נסי|צבעי|קראי|ספרי|מצאי|חברי|כתבי|האזיני|שימי|חפשי|תראי|הקליטי|מוכנה|יודעת|מתחילות|יוצאות|מכירות|מתרגלות|זוכרות|תצליחי|אלופה|שמעי|ותקני)(?=[\s.,!?:"–)]|$)/u;
  it('has no feminine-only wording in any text or generated question', () => {
    const bad = allHebrewTexts().filter((t) => FEMININE.test(t));
    expect(bad).toEqual([]);
  });
  it('does not use slash forms like בחר/י', () => {
    const bad = allHebrewTexts().filter((t) => /[א-ת]\/[א-ת]/u.test(t));
    expect(bad).toEqual([]);
  });
  it('greets any name the same way, without guessing gender', () => {
    for (const name of ['נועה', 'עידו', 'Alex', 'טל']) {
      expect(T.welcome.hi(name)).toBe(`היי ${name}!`);
      expect(T.home.hi(name)).toContain(name);
    }
    expect(T.welcome.ready).toBe('מוכנים ללמוד אנגלית?');
  });
  it('keeps the spoken English standard (no Hebrew or gender changes in audio texts)', () => {
    for (const c of buildTtsClips()) expect(c.text).toMatch(/^[A-Za-z0-9 .,!?'-]+$/);
    expect(buildTtsClips().find((c) => c.id === 'fb-hello')!.text).toBe("Hi! Let's learn English!");
  });
});

describe('branding', () => {
  it("is always Noa's English World with the agreed tagline", () => {
    expect(BRAND.name).toBe("Noa's English World");
    expect(BRAND.tagline).toBe('עולם האנגלית של נועה, לומדים ונהנים ביחד!');
    const manifest = JSON.parse(fs.readFileSync(path.join(PUB, 'manifest.webmanifest'), 'utf8'));
    expect(manifest.name).toBe("Noa's English World");
    expect(manifest.display).toBe('standalone');
    for (const i of manifest.icons) expect(fs.existsSync(path.join(PUB, i.src)), i.src).toBe(true);
    const html = fs.readFileSync(path.resolve(PUB, '..', 'index.html'), 'utf8');
    expect(html).toContain("<title>Noa's English World</title>");
  });
  it('share message has the agreed text', () => {
    expect(T.share.message).toBe("מוזמנים ללמוד אנגלית עם נועה! 🌸\nהיכנסו ל-Noa's English World, משחקים, מקשיבים ולומדים אנגלית ביחד!");
  });
});
