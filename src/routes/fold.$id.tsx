import { createFileRoute, type ErrorComponentProps, Link, notFound } from '@tanstack/react-router';
import { FoldError } from '../fold/load-model';
import { fetchModel } from '../models/catalog';

export const Route = createFileRoute('/fold/$id')({
  validateSearch: (search: Record<string, unknown>): { step?: number } => {
    const n = Number(search.step);
    return search.step !== undefined && Number.isInteger(n) && n >= 0 ? { step: n } : {};
  },
  loader: async ({ params }): Promise<NonNullable<Awaited<ReturnType<typeof fetchModel>>>> => {
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
  const { entry } = Route.useLoaderData();
  return (
    <main className="page">
      <h1>{entry.name}</h1>
    </main>
  );
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
