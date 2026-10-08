import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };

// a failed 3D chunk (offline, redeploy) just drops the decoration; the homepage stays usable
export class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
