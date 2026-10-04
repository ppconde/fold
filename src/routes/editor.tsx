import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/editor')({ component: Editor });

function Editor() {
  return (
    <main className="page">
      <h1>Editor</h1>
    </main>
  );
}
