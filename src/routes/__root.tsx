import { createRootRoute, Link } from '@tanstack/react-router';
import { AppShell } from '../shell/AppShell';

export const Route = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFound
});

function NotFound() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <p>
        <Link to="/library">Browse the library</Link>
      </p>
    </main>
  );
}
