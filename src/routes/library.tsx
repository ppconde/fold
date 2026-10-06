import { createFileRoute, Link } from '@tanstack/react-router';
import { useLang, useT } from '../i18n/LanguageProvider';
import { currentLang, dictionary, localized } from '../i18n/lang';
import { fetchIndex } from '../models/catalog';
import pages from '../styles/pages.module.css';

// ponytail: plain list until the M4 library (search, filter chips, paper cards) replaces it.
export const Route = createFileRoute('/library')({
  head: () => ({ meta: [{ title: dictionary(currentLang()).titles.library }] }),
  loader: async () => (await fetchIndex()).models,
  component: Library
});

const DOTS = { easy: ['a'], medium: ['a', 'b'], hard: ['a', 'b', 'c'] } as const;

function Library() {
  const models = Route.useLoaderData();
  const t = useT().library;
  const [lang] = useLang();
  return (
    <main className={`page ${pages.page}`}>
      <h1>{t.title}</h1>
      <ul className={pages.list} aria-label={t.models}>
        {models.map((m) => (
          <li key={m.id} className={pages.row}>
            <Link className={pages.name} to="/fold/$id" params={{ id: m.id }} search={{}}>
              {localized(m.name, lang)}
            </Link>
            {m.japaneseName && (
              <span className={pages.ja} lang="ja">
                {m.japaneseName}
              </span>
            )}
            <span className={pages.dots} aria-hidden="true">
              {DOTS[m.difficulty].map((k) => (
                <i key={k} />
              ))}
            </span>
            <span className="sr-only">{t.difficulty[m.difficulty]}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
