// biome-ignore-all lint/a11y/noSvgWithoutTitle: decorative icons, aria-hidden via the shared props
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
} as const;
export const StartIcon = () => (
  <svg {...base} width={22} height={22} strokeWidth={1.4}>
    <path d="M7 5.5v13" />
    <path d="M18 6 10.4 12 18 18" />
  </svg>
);
export const BackIcon = () => (
  <svg {...base} width={22} height={22} strokeWidth={1.4}>
    <path d="M14.6 5.6 8.6 12l6 6.4" />
  </svg>
);
export const AgainIcon = () => (
  <svg {...base} width={22} height={22} strokeWidth={1.4}>
    <path d="M18.4 12.3a6.4 6.4 0 1 1-2-4.7" />
    <path d="M16.9 4.2l-.5 3.6-3.6-.4" />
  </svg>
);
export const NextIcon = () => (
  <svg {...base} width={28} height={28} strokeWidth={1.8}>
    <path d="M9.4 5.6l6 6.4-6 6.4" />
  </svg>
);
export const ViewIcon = () => (
  <svg {...base} width={22} height={22} strokeWidth={1.4}>
    <path d="M4.5 8.5v-4h4M15.5 4.5h4v4M19.5 15.5v4h-4M8.5 19.5h-4v-4" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);
/** The phone sheet's slot toggle: the How sketches (a row of frames), the crease pattern, the key to the marks (the
 * push arrow it explains). */
export const MovesIcon = () => (
  <svg {...base} width={16} height={16} strokeWidth={1.5}>
    <path d="M3 7h5v10H3zM9.5 7h5v10h-5zM16 7h5v10h-5z" />
  </svg>
);
export const CreasesIcon = () => (
  <svg {...base} width={16} height={16} strokeWidth={1.5}>
    <path d="M5 5h14v14H5zM5 5l14 14M19 5 5 19" />
  </svg>
);
export const MarksIcon = () => (
  <svg {...base} width={16} height={16} strokeWidth={1.5}>
    <path d="M4 12l7-6v3.5h9v5h-9V18z" />
  </svg>
);
