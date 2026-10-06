import { createFileRoute, Link } from '@tanstack/react-router';
import { fetchIndex } from '../models/catalog';

// ponytail: plain list until the M4 library (search, filter chips, paper cards) replaces it.
export const Route = createFileRoute('/library')({
  head: () => ({ meta: [{ title: 'Library · Fold' }] }),
  loader: () => fetchIndex(),
  component: Library
});

function Library() {
  const models = Route.useLoaderData();
  return (
    <main className="page">
      <h1>Library</h1>
      <ul aria-label="Models">
        {models.map((m) => (
          <li key={m.id}>
            <Link to="/fold/$id" params={{ id: m.id }} search={{}}>
              {m.name}
            </Link>{' '}
            · {m.difficulty}
          </li>
        ))}
      </ul>
    </main>
  );
}
