import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import styles from '../home/Home.module.css';
import { SceneBoundary } from '../home/SceneBoundary';
import { evenPace, UNFOLD_SECONDS, unfoldAll } from '../home/unfold';
import { useLang, useT } from '../i18n/LanguageProvider';
import { localized, titles } from '../i18n/lang';
import { fetchIndex, fetchModel } from '../models/catalog';
import { prefersReducedMotion, readLastModel } from '../player/browser';

const loadScene = () => import('../home/HomeScene').then((m) => ({ default: m.HomeScene }));

/** Seconds over which the unfolding sheet turns to the lesson stage's view, and rests before the lesson opens. */
const SETTLE_SECONDS = 1.2;
const REST_SECONDS = 0.3;

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: titles().home }] }),
  loader: async () => {
    void loadScene().catch(() => {});
    // the lesson opened last, else the library's default; the homepage still works without either
    const fallback = await fetchIndex().then(
      (i) => i.defaultModel,
      () => 'crane'
    );
    const last = readLastModel();
    const found =
      (last && (await fetchModel(last).catch(() => null))) || (await fetchModel(fallback).catch(() => null));
    return { id: found?.entry.id ?? fallback, found };
  },
  component: Home
});

const LazyScene = lazy(loadScene);

function Home() {
  const t = useT();
  const [lang] = useLang();
  const { id, found } = Route.useLoaderData();
  const navigate = useNavigate();
  const [still] = useState(prefersReducedMotion);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  // shown as one step from flat to finished, so it opens out all at once
  const model = useMemo(() => found && unfoldAll(found.model), [found]);
  const pace = useMemo(() => model && evenPace(model), [model]);
  const [at, setAt] = useState(1);
  const [settle, setSettle] = useState(0);
  const [entering, setEntering] = useState(false);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  // the flat sheet hands over to the lesson's stage (view-transition-name: paper)
  const go = () => navigate({ to: '/fold/$id', params: { id }, search: {}, viewTransition: true });

  // unfold to the flat sheet, faster than a lesson plays, then open the lesson at its start
  const enter = () => {
    if (still || !pace) return void go();
    if (entering) return;
    setEntering(true);
    const start = performance.now();
    const tick = (now: number) => {
      // a frame's timestamp can come just before the click's performance.now()
      const elapsed = Math.max(0, now - start) / 1000;
      // eased in time, then spread evenly over how far the paper moves
      const u = Math.min(1, elapsed / UNFOLD_SECONDS);
      setAt(pace(1 - u * u * (3 - 2 * u)));
      // over the last stretch, the sheet turns to the lesson stage's view; it rests there a moment, then hands over
      setSettle(Math.min(1, Math.max(0, (elapsed - UNFOLD_SECONDS + SETTLE_SECONDS) / SETTLE_SECONDS)));
      if (elapsed < UNFOLD_SECONDS + REST_SECONDS) frame.current = requestAnimationFrame(tick);
      else void go();
    };
    frame.current = requestAnimationFrame(tick);
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
        {/* the name is never translated */}
        <h1>Fold</h1>
        <p className={styles.lede}>{t.home.lede}</p>
        <Link
          to="/fold/$id"
          params={{ id }}
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
      </div>
      <div className={styles.crane}>
        <span className={styles.mark} aria-hidden="true">
          折
        </span>
        {found && model && (
          <SceneBoundary>
            <Suspense fallback={null}>
              <LazyScene
                model={model}
                at={at}
                settle={settle}
                pointer={pointer}
                still={still}
                label={t.home.modelLabel(localized(found.entry.name, lang))}
              />
            </Suspense>
          </SceneBoundary>
        )}
      </div>
    </main>
  );
}
