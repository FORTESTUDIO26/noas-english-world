// Progress saved on this device (localStorage). Only FIRST-TRY answers count
// as evidence: opening a screen or answering after a retry never marks
// anything as known.

export type SkillKind =
  | 'letterName' | 'letterSound' | 'letterCase' | 'letterWrite' | 'letterSeq'
  | 'number' | 'count' | 'numberRead'
  | 'color' | 'colorRead'
  | 'word' | 'wordListen' | 'wordFirst' | 'wordSpell'
  | 'listen2';

export interface SkillStat {
  /** attempts (first tries only) */
  a: number;
  /** correct first tries */
  c: number;
  /** last results, newest last: '1' correct, '0' wrong (max 8) */
  r: string;
  /** last time answered */
  t: number;
}

export interface SessionRecord {
  done: boolean;
  runs: number;
  lastCorrect: number;
  lastTotal: number;
  finishedAt?: number;
}

export interface ExamRecord {
  at: number;
  score: number;
  correct: number;
  total: number;
  byDomain: Record<string, { c: number; t: number }>;
}

export interface Save {
  v: 1;
  skills: Record<string, SkillStat>;
  sessions: Record<string, SessionRecord>;
  exams: ExamRecord[];
  /** cards opened (only informative, never counts as learned) */
  opened: Record<string, number>;
  settings: { slow: boolean };
  /** step to continue from, per meeting that was left in the middle */
  resume?: Record<string, number>;
}


export function emptySave(): Save {
  return { v: 1, skills: {}, sessions: {}, exams: [], opened: {}, settings: { slow: false } };
}

export function loadSave(key: string, storage: Pick<Storage, 'getItem'> = localStorage): Save {
  try {
    const raw = storage.getItem(key);
    if (!raw) return emptySave();
    const s = JSON.parse(raw) as Partial<Save>;
    if (s.v !== 1) return emptySave();
    const base = emptySave();
    return { ...base, ...s, settings: { ...base.settings, ...s.settings } } as Save;
  } catch {
    return emptySave();
  }
}

export function writeSave(key: string, save: Save, storage: Pick<Storage, 'setItem'> = localStorage) {
  try {
    storage.setItem(key, JSON.stringify(save));
  } catch {
    /* storage full / private mode */
  }
}

export const skillKey = (kind: SkillKind, item: string | number) => `${kind}:${item}`;

export function recordAnswer(save: Save, key: string, correct: boolean, now = Date.now()): Save {
  const prev = save.skills[key] ?? { a: 0, c: 0, r: '', t: 0 };
  const next: SkillStat = {
    a: prev.a + 1,
    c: prev.c + (correct ? 1 : 0),
    r: (prev.r + (correct ? '1' : '0')).slice(-8),
    t: now,
  };
  return { ...save, skills: { ...save.skills, [key]: next } };
}

export type Mastery = 'new' | 'learning' | 'weak' | 'known';

/**
 * known  = at least 3 first-try answers and the last 3 were all right
 * weak   = the last answer was wrong, or 2+ mistakes in the last 4
 * learning = answered, but not enough evidence yet
 */
export function mastery(stat: SkillStat | undefined): Mastery {
  if (!stat || stat.a === 0) return 'new';
  const r = stat.r;
  const last4 = r.slice(-4);
  const errors4 = [...last4].filter((x) => x === '0').length;
  if (r.endsWith('0') || errors4 >= 2) return 'weak';
  if (stat.a >= 3 && r.slice(-3) === '111') return 'known';
  return 'learning';
}

export function masteryOf(save: Save, kind: SkillKind, item: string | number): Mastery {
  return mastery(save.skills[skillKey(kind, item)]);
}

/** Weight for choosing practice items: weak and new items come up more. */
export function practiceWeight(stat: SkillStat | undefined): number {
  switch (mastery(stat)) {
    case 'weak': return 6;
    case 'new': return 4;
    case 'learning': return 3;
    case 'known': return 1;
  }
}

export function weightedPick<T>(items: T[], weight: (x: T) => number, count: number, rnd = Math.random): T[] {
  const pool = items.map((x) => ({ x, w: Math.max(0.01, weight(x)) }));
  const out: T[] = [];
  while (out.length < count && pool.length) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let roll = rnd() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      roll -= pool[i].w;
      if (roll <= 0) break;
    }
    out.push(pool[i].x);
    pool.splice(i, 1);
  }
  return out;
}

export function shuffle<T>(arr: T[], rnd = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
