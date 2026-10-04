import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/library')({ component: Library });

function Library() {
  return (
    <main className="page">
      <h1>Library</h1>
    </main>
  );
}
