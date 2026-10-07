import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; onError: () => void };

// a failed crane chunk (offline, redeploy) just drops the decoration; the homepage stays usable
export class CraneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
