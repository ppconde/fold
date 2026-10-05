import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About · Fold' }] }),
  component: About
});

function About() {
  return (
    <main className="page">
      <h1>About</h1>
      <p>Fold teaches origami with an interactive 3D model and the crease pattern for every step.</p>
    </main>
  );
}
