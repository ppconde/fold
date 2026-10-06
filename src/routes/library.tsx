import { createFileRoute, Link } from '@tanstack/react-router';
import { useLang, useT } from '../i18n/LanguageProvider';
import { currentLang, dictionary, localized } from '../i18n/lang';
import { fetchIndex } from '../models/catalog';

// ponytail: plain list until the M4 library (search, filter chips, paper cards) replaces it.
export const Route = createFileRoute('/library')({
  head: () => ({ meta: [{ title: dictionary(currentLang()).titles.library }] }),
  loader: async () => (await fetchIndex()).models,
  component: Library
});

function Library() {
  const models = Route.useLoaderData();
  const t = useT().library;
  const [lang] = useLang();
  return (
    <main className="page">
      <h1>{t.title}</h1>
      <ul aria-label={t.models}>
        {models.map((m) => (
          <li key={m.id}>
            <Link to="/fold/$id" params={{ id: m.id }} search={{}}>
              {localized(m.name, lang)}
            </Link>{' '}
            · {t.difficulty[m.difficulty]}
          </li>
        ))}
      </ul>
    </main>
  );
}
