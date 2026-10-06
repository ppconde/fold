import { Component, type ReactNode } from 'react';
import styles from './Player.module.css';

type Props = { children: ReactNode; onError: () => void; message: string; retryLabel: string };

// catches a failed Stage chunk download (offline, or a redeploy removed the hashed file).
// "Try again" reloads: browsers cache a failed dynamic import of the same URL, so re-importing can't recover
export class StageBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <>
        <p className={styles.noWebgl}>{this.props.message}</p>
        <button type="button" className={styles.retry} onClick={() => location.reload()}>
          {this.props.retryLabel}
        </button>
      </>
    );
  }
}
