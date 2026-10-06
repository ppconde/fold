import { createFileRoute, Link } from '@tanstack/react-router';
import { useT } from '../i18n/LanguageProvider';
import { currentLang, dictionary } from '../i18n/lang';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: dictionary(currentLang()).titles.home }] }),
  component: Home
});

function Home() {
  const t = useT();
  return (
    <main className="page">
      <h1>{t.home.headline}</h1>
      <p>{t.home.lede}</p>
      <Link to="/library">{t.home.start}</Link>
    </main>
  );
}
