import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'Fold' }] }),
  component: Home
});

function Home() {
  return (
    <main className="page">
      <h1>Fold</h1>
      <p>Learn origami, one fold at a time.</p>
      <Link to="/library">Start folding</Link>
    </main>
  );
}
