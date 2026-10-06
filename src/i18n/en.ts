export const en = {
  shell: {
    menu: 'Menu',
    close: 'Close',
    nav: { home: 'Home', library: 'Library', about: 'About' },
    textSize: 'Text size',
    textSizes: ['Normal text', 'Large text', 'Larger text'],
    language: 'Language',
    languageNames: { en: 'English', pt: 'Português' }
  },
  titles: {
    home: 'Fold',
    library: 'Library · Fold',
    about: 'About · Fold',
    model: (name: string) => `${name} · Fold`,
    notFound: 'Page not found · Fold'
  },
  errors: {
    pageNotFound: 'Page not found',
    modelNotFound: 'Model not found',
    modelUnreadable: "This model couldn't be read",
    checkConnection: 'Check your connection and try again.',
    browseLibrary: 'Browse the library'
  },
  home: {
    headline: 'Fold, slowly.',
    lede: 'Choose an origami and follow it fold by fold, turning the paper in 3D as you go.',
    start: 'start folding',
    craneSoon: 'learning the crane — coming soon',
    craneLabel: 'A paper crane, drifting slowly. Tap anywhere to start folding.'
  },
  library: {
    title: 'Library',
    models: 'Models',
    difficulty: { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
  },
  about: {
    title: 'About',
    intro: 'Fold teaches origami with a 3D model you can turn in your hands and the crease pattern for every step.',
    howTo:
      'Press next to watch each fold, drag the slider to go at your own pace, and turn the paper to see it from any side.',
    credits: 'Credits',
    creditFold: 'Models use the FOLD file format by Erik Demaine and others.',
    creditCrane: '“3D Origami crane” by JuanG3D, licensed CC BY 4.0.',
    creditFonts: 'Shippori Mincho, Instrument Sans and Zen Kurenaido, under the SIL Open Font License.',
    licence: 'The code is free software under the GPLv3. Models are shared under CC BY-NC-SA unless stated otherwise.'
  },
  player: {
    firstInstruction: 'Start with your sheet of paper, colored side up.',
    stepOf: (n: number, total: number) => `Step ${n} · ${total}`,
    count: (n: number, total: number) => `${n}/${total}`,
    instructions: 'Instructions',
    hideSteps: 'hide steps',
    showSteps: 'show steps',
    stageLabel: '3D view of the paper. Drag to turn it, pinch or scroll to zoom.',
    noWebgl: "The 3D view isn't available on this device. Follow the crease pattern and instructions instead.",
    stageFailed: "The 3D view didn't load. Follow the crease pattern and instructions instead.",
    tryAgain: 'Try again',
    startOver: 'Start over',
    previous: 'Previous step',
    replay: 'Replay step',
    next: 'Next step',
    speed: (s: number) => `Speed ${s}×`,
    resetView: 'Reset view',
    foldProgress: 'Fold progress',
    percentFolded: (n: number) => `${n}% folded`,
    hint: '← back · next → · hover for names',
    wellFolded: 'Well folded!',
    isComplete: (name: string) => `${name} is complete.`,
    foldAgain: 'Fold again',
    backToLibrary: 'Back to library',
    diagramTitle: (active: number) =>
      `Crease pattern${active ? `, ${active} crease${active === 1 ? '' : 's'} highlighted for this step` : ''}`
  }
};

export type Dictionary = typeof en;
