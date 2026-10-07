import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { CraneBoundary } from '../home/CraneBoundary';
import styles from '../home/Home.module.css';
import { loadCrane } from '../home/load-crane';
import { useT } from '../i18n/LanguageProvider';
import { currentLang, dictionary } from '../i18n/lang';
import { fetchIndex } from '../models/catalog';
import { prefersReducedMotion } from '../player/browser';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: dictionary(currentLang()).titles.home }] }),
  loader: () => {
    void loadCrane().catch(() => {});
    return fetchIndex().then(
      (i) => i.defaultModel,
      () => 'fold-in-quarters'
    );
  },
  component: Home
});

const LazyCrane = lazy(loadCrane);

function Home() {
  const t = useT();
  const defaultModel = Route.useLoaderData();
  const navigate = useNavigate();
  const [still] = useState(prefersReducedMotion);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [entering, setEntering] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const go = () => navigate({ to: '/fold/$id', params: { id: defaultModel }, search: {} });

  const enter = () => {
    if (still) return void go();
    if (entering) return;
    setEntering(true);
    timer.current = window.setTimeout(go, 600);
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: tap-anywhere is an enhancement; the link below is the accessible path
    <main
      className={`${styles.home} ${entering ? styles.entering : ''}`}
      data-motion={still ? 'off' : 'on'}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || still) return;
        setPointer({ x: (e.clientX / innerWidth) * 2 - 1, y: (e.clientY / innerHeight) * 2 - 1 });
      }}
      onClick={(e) => {
        if (e.target instanceof Element && e.target.closest('a, button, dialog, [role="dialog"]')) return;
        enter();
      }}
    >
      <div className={styles.text}>
        <h1>{t.home.headline}</h1>
        <p className={styles.lede}>{t.home.lede}</p>
        <Link
          to="/fold/$id"
          params={{ id: defaultModel }}
          search={{}}
          className="ink-link"
          onClick={(e) => {
            if (still || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            enter();
          }}
        >
          {t.home.start} →
        </Link>
        <p className={styles.soon}>{t.home.craneSoon}</p>
      </div>
      <div className={styles.crane}>
        <span className={styles.mark} aria-hidden="true">
          折
        </span>
        <CraneBoundary onError={() => {}}>
          <Suspense fallback={null}>
            <LazyCrane pointer={pointer} entering={entering} still={still} label={t.home.craneLabel} />
          </Suspense>
        </CraneBoundary>
      </div>
    </main>
  );
}
