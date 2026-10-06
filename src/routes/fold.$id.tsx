import { createFileRoute, type ErrorComponentProps, Link, notFound } from '@tanstack/react-router';
import { useCallback } from 'react';
import { FoldError } from '../fold/load-model';
import { fetchModel } from '../models/catalog';
import { loadStage } from '../player/load-stage';
import { Player } from '../player/Player';

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
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.entry.name} · Fold` : 'Fold' }] }),
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
  return (
    <main className="page">
      <h1>Model not found</h1>
      <p>
        <Link to="/library">Browse the library</Link>
      </p>
    </main>
  );
}

function ModelError({ error }: ErrorComponentProps) {
  return (
    <main className="page">
      <h1>This model couldn't be read</h1>
      <p>{error instanceof FoldError ? error.message : 'Check your connection and try again.'}</p>
      <p>
        <Link to="/library">Browse the library</Link>
      </p>
    </main>
  );
}
