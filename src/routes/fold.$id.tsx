import { createFileRoute, type ErrorComponentProps, Link, notFound } from '@tanstack/react-router';
import { useCallback } from 'react';
import { FoldError } from '../fold/load-model';
import { useT } from '../i18n/LanguageProvider';
import { currentLang, dictionary, localized } from '../i18n/lang';
import { fetchModel } from '../models/catalog';
import { loadStage } from '../player/load-stage';
import { Player } from '../player/Player';
import pages from '../styles/pages.module.css';

export const Route = createFileRoute('/fold/$id')({
  validateSearch: (search: Record<string, unknown>): { step?: number } => {
    const n = Number(search.step);
    return search.step !== undefined && Number.isInteger(n) && n >= 0 ? { step: n } : {};
  },
  loader: async ({ params }): Promise<NonNullable<Awaited<ReturnType<typeof fetchModel>>>> => {
    void loadStage().catch(() => {}); // start the 3D chunk alongside the model data
    const found = await fetchModel(params.id);
    if (!found) throw notFound();
    return found;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? dictionary(currentLang()).titles.model(localized(loaderData.entry.name, currentLang()))
          : dictionary(currentLang()).titles.home
      }
    ]
  }),
  component: FoldPage,
  notFoundComponent: ModelNotFound,
  errorComponent: ModelError
});

function FoldPage() {
  const { entry, model } = Route.useLoaderData();
  const { step } = Route.useSearch();
  const navigate = Route.useNavigate();
  const onSettle = useCallback(
    (settled: number) => {
      if (settled !== step) void navigate({ search: { step: settled }, replace: true });
    },
    [navigate, step]
  );
  return <Player key={entry.id} entry={entry} model={model} initialStep={step ?? 0} onSettle={onSettle} />;
}

function ModelNotFound() {
  const t = useT().errors;
  return (
    <main className={`page ${pages.page}`}>
      <h1>{t.modelNotFound}</h1>
      <p>
        <Link className="ink-link" to="/library">
          {t.browseLibrary}
        </Link>
      </p>
    </main>
  );
}

function ModelError({ error }: ErrorComponentProps) {
  const t = useT().errors;
  return (
    <main className={`page ${pages.page}`}>
      <h1>{t.modelUnreadable}</h1>
      <p className={pages.prose}>{error instanceof FoldError ? error.message : t.checkConnection}</p>
      <p>
        <Link className="ink-link" to="/library">
          {t.browseLibrary}
        </Link>
      </p>
    </main>
  );
}
