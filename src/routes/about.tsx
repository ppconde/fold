import { createFileRoute } from '@tanstack/react-router';
import { useT } from '../i18n/LanguageProvider';
import { currentLang, dictionary } from '../i18n/lang';

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: dictionary(currentLang()).titles.about }] }),
  component: About
});

function About() {
  const t = useT().about;
  return (
    <main className="page">
      <h1>{t.title}</h1>
      <p>{t.intro}</p>
      <p>{t.howTo}</p>
      <h2>{t.credits}</h2>
      <ul>
        <li>{t.creditFold}</li>
        <li>{t.creditCrane}</li>
        <li>{t.creditFonts}</li>
      </ul>
      <p>{t.licence}</p>
    </main>
  );
}
