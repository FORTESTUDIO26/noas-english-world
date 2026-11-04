import { Fragment } from 'react';
import { parseMixed } from '../audio/speech.ts';

// Latin runs inside Hebrew (words, letters, IPA like /b/) – kept left-to-right.
const LATIN = /[/A-Za-zæɛɪɑʒ][A-Za-z0-9æɛɪɑʒ'/]*(?:[ -][A-Za-z0-9æɛɪɑʒ'/]+)*/g;

function HebrewRun({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LATIN)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    parts.push(<bdi key={m.index} dir="ltr" lang="en" className="mx-latin">{m[0]}</bdi>);
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/**
 * Hebrew sentence (right-to-left) with English learning content inside it.
 * Each English part is isolated (<bdi dir="ltr">) so letters, words and
 * punctuation never flip.
 */
export function MixedText({ text }: { text: string }) {
  return (
    <>
      {parseMixed(text).map((t, i) => (
        <Fragment key={i}>
          {t.kind === 'en'
            ? <bdi dir="ltr" lang="en" className="mx-en">{t.text}</bdi>
            : <HebrewRun text={t.text} />}
        </Fragment>
      ))}
    </>
  );
}
