import { createFileRoute } from '@tanstack/react-router';
import { useT } from '../i18n/LanguageProvider';
import { titles } from '../i18n/lang';
import pages from '../styles/pages.module.css';

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: titles().about }] }),
  component: About
});

function About() {
  const t = useT().about;
  return (
    <main className={`page ${pages.page}`}>
      <h1>{t.title}</h1>
      <div className={pages.prose}>
        <p>{t.intro}</p>
        <p>{t.howTo}</p>
      </div>
      <h2>{t.credits}</h2>
      <ul className={pages.plain}>
        <li>{t.creditFold}</li>
        <li>{t.creditFonts}</li>
      </ul>
      <p className={pages.prose}>{t.licence}</p>
      <span className={pages.fold} aria-hidden="true">
        折
      </span>
    </main>
  );
}
