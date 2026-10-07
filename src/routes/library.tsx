import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useLang, useT } from '../i18n/LanguageProvider';
import { localized, titles } from '../i18n/lang';
import { fetchIndex } from '../models/catalog';
import { CATEGORIES, DIFFICULTIES, filterModels, type LibrarySearch, parseLibrarySearch } from '../models/filter';
import pages from '../styles/pages.module.css';
import styles from './Library.module.css';

export const Route = createFileRoute('/library')({
  validateSearch: parseLibrarySearch,
  head: () => ({ meta: [{ title: titles().library }] }),
  loader: async () => (await fetchIndex()).models,
  component: Library
});

const DOTS = { easy: ['a'], medium: ['a', 'b'], hard: ['a', 'b', 'c'] } as const;

function Library() {
  const models = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const t = useT().library;
  const [lang] = useLang();
  // the box keeps what was typed (spaces included); the URL keeps the trimmed query
  const [query, setQuery] = useState(search.q ?? '');
  // the q this page last put in the URL; any other change (the menu's Library link, back) resets the box
  const ours = useRef(search.q);
  useEffect(() => {
    if (search.q === ours.current) return;
    ours.current = search.q;
    setQuery(search.q ?? '');
  }, [search.q]);
  const update = (next: LibrarySearch) => {
    const parsed = parseLibrarySearch({ ...search, ...next });
    ours.current = parsed.q;
    void navigate({ search: parsed, replace: true });
  };
  const clear = () => {
    ours.current = undefined;
    setQuery('');
    void navigate({ search: {}, replace: true });
  };
  const shown = filterModels(models, search);

  return (
    <main className={`page ${pages.page}`}>
      <h1>{t.title}</h1>
      <div className={styles.tools}>
        <label className={styles.search}>
          <span className="sr-only">{t.search}</span>
          <input
            type="search"
            value={query}
            placeholder={t.search}
            onChange={(e) => {
              setQuery(e.target.value);
              update({ q: e.target.value });
            }}
          />
        </label>
        <div className={styles.chips}>
          <fieldset>
            <legend className="sr-only">{t.category}</legend>
            {[undefined, ...CATEGORIES].map((cat) => (
              <button
                key={cat ?? 'all'}
                type="button"
                aria-pressed={search.cat === cat}
                onClick={() => update({ cat })}
              >
                {t.categories[cat ?? 'all']}
              </button>
            ))}
          </fieldset>
          <fieldset>
            <legend className="sr-only">{t.level}</legend>
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff}
                type="button"
                aria-pressed={search.diff === diff}
                onClick={() => update({ diff: search.diff === diff ? undefined : diff })}
              >
                {t.difficulty[diff]}
              </button>
            ))}
          </fieldset>
        </div>
        {(search.q || search.cat || search.diff) && (
          <button type="button" className={`ink-link ${styles.clear}`} onClick={clear}>
            {t.clear}
          </button>
        )}
      </div>
      {shown.length ? (
        <ul className={styles.grid} aria-label={t.models}>
          {shown.map((m) => (
            <li key={m.id}>
              <Link className={`${styles.card} paper`} to="/fold/$id" params={{ id: m.id }} search={{}}>
                {m.thumbnail ? (
                  <img className={styles.thumb} src={m.thumbnail} alt="" width={240} height={240} loading="lazy" />
                ) : (
                  <span className={styles.placeholder} aria-hidden="true" />
                )}
                <span className={styles.name}>{localized(m.name, lang)}</span>
                {m.japaneseName && (
                  <span className={styles.ja} lang="ja">
                    {m.japaneseName}
                  </span>
                )}
                <span className={styles.level}>
                  <span className={styles.dots} aria-hidden="true">
                    {DOTS[m.difficulty].map((k) => (
                      <i key={k} />
                    ))}
                  </span>
                  {t.difficulty[m.difficulty]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{t.noMatch}</p>
      )}
    </main>
  );
}
