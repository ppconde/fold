import { useId, useMemo } from 'react';
import type { Model } from '../fold/types';
import styles from './CreaseDiagram.module.css';
import { diagramLines } from './diagram';
import { paperExtent } from './paper-geometry';

export function CreaseDiagram({ model, step }: { model: Model; step: number }) {
  const titleId = useId();
  const lines = useMemo(() => diagramLines(model, step), [model, step]);
  const { minX, maxY, width, height, size } = paperExtent(model);
  const pad = size * 0.06;
  const active = lines.filter((l) => l.state === 'active').length;
  // SVG y grows downwards, paper y grows upwards: draw at −y so the diagram matches the 3D view.
  const viewBox = `${minX - pad} ${-maxY - pad} ${width + pad * 2} ${height + pad * 2}`;
  return (
    <svg className={styles.diagram} viewBox={viewBox} role="img" aria-labelledby={titleId}>
      <title id={titleId}>
        {`Crease pattern${active ? `, ${active} crease${active === 1 ? '' : 's'} highlighted for this step` : ''}`}
      </title>
      {lines.map((l) => (
        <line
          key={l.edge}
          x1={l.from[0]}
          y1={-l.from[1]}
          x2={l.to[0]}
          y2={-l.to[1]}
          className={`${styles[l.kind]} ${styles[l.state]}`}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
