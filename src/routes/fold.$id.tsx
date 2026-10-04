import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/fold/$id')({ component: FoldPage });

function FoldPage() {
  const { id } = Route.useParams();
  return (
    <main className="page">
      <h1>Folding {id}</h1>
    </main>
  );
}
