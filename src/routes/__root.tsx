import { createRootRoute, Link } from '@tanstack/react-router';
import { useT } from '../i18n/LanguageProvider';
import { titles } from '../i18n/lang';
import { AppShell } from '../shell/AppShell';
import pages from '../styles/pages.module.css';

export const Route = createRootRoute({
  head: () => ({ meta: [{ title: titles().home }] }),
  component: AppShell,
  notFoundComponent: NotFound
});

function NotFound() {
  const t = useT();
  return (
    <main className={`page ${pages.page}`}>
      <h1>{t.errors.pageNotFound}</h1>
      <p className={pages.prose}>
        <Link className="ink-link" to="/library">
          {t.errors.browseLibrary}
        </Link>
      </p>
    </main>
  );
}
