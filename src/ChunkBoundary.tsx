import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode; onError?: () => void };

// catches a lazy chunk that fails to download (offline, or a redeploy removed the hashed file) and shows `fallback`
export class ChunkBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
