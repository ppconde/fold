import { createRootRoute, Link } from '@tanstack/react-router';
import { useT } from '../i18n/LanguageProvider';
import { currentLang, dictionary } from '../i18n/lang';
import { AppShell } from '../shell/AppShell';

export const Route = createRootRoute({
  head: () => ({ meta: [{ title: dictionary(currentLang()).titles.home }] }),
  component: AppShell,
  notFoundComponent: NotFound
});

function NotFound() {
  const t = useT();
  return (
    <main className="page">
      <h1>{t.errors.pageNotFound}</h1>
      <p>
        <Link to="/library">{t.errors.browseLibrary}</Link>
      </p>
    </main>
  );
}
