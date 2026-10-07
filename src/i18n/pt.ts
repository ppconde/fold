import type { Dictionary } from './en';

export const pt: Dictionary = {
  shell: {
    menu: 'Menu',
    close: 'Fechar',
    nav: { home: 'Início', library: 'Biblioteca', about: 'Sobre' },
    language: 'Idioma',
    languageNames: { en: 'English', pt: 'Português' }
  },
  titles: {
    home: 'Fold',
    library: 'Biblioteca · Fold',
    about: 'Sobre · Fold',
    model: (name) => `${name} · Fold`,
    notFound: 'Página não encontrada · Fold'
  },
  errors: {
    pageNotFound: 'Página não encontrada',
    modelNotFound: 'Modelo não encontrado',
    modelUnreadable: 'Não foi possível ler este modelo',
    checkConnection: 'Verifica a tua ligação e tenta novamente.',
    browseLibrary: 'Ver a biblioteca'
  },
  home: {
    lede: 'Escolhe um origami e segue-o dobra a dobra, rodando o papel em 3D enquanto avanças.',
    start: 'começar a dobrar',
    craneSoon: 'aprender o grou — em breve',
    craneLabel: 'Um grou de papel a flutuar devagar. Toca em qualquer lado para começar a dobrar.'
  },
  library: {
    title: 'Biblioteca',
    models: 'Modelos',
    difficulty: { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' },
    search: 'Pesquisar dobras',
    category: 'Categoria',
    categories: { all: 'Todas', animals: 'Animais', flowers: 'Flores', objects: 'Objetos', geometric: 'Geometria' },
    level: 'Dificuldade',
    noMatch: 'Nenhuma dobra corresponde.',
    clear: 'Limpar filtros'
  },
  about: {
    title: 'Sobre',
    intro: 'O Fold ensina origami com um modelo 3D que podes rodar e o padrão de vincos de cada passo.',
    howTo:
      'Carrega em seguinte para ver cada dobra, arrasta a barra para avançar ao teu ritmo e roda o papel para o veres de qualquer lado.',
    credits: 'Créditos',
    creditFold: 'Os modelos usam o formato de ficheiro FOLD, de Erik Demaine e outros.',
    creditCrane: '“3D Origami crane” de JuanG3D, licenciado CC BY 4.0.',
    creditFonts: 'Shippori Mincho, Instrument Sans e Zen Kurenaido, sob a SIL Open Font License.',
    licence:
      'O código é software livre sob a GPLv3. Os modelos são partilhados sob CC BY-NC-SA, salvo indicação em contrário.'
  },
  player: {
    firstInstruction: 'Começa com a folha de papel com o lado colorido para cima.',
    stepOf: (n, total) => `Passo ${n} · ${total}`,
    count: (n, total) => `${n}/${total}`,
    instructions: 'Instruções',
    hideSteps: 'esconder passos',
    showSteps: 'mostrar passos',
    stageLabel: 'Vista 3D do papel. Arrasta para o rodar; aperta ou desliza para aproximar.',
    noWebgl: 'A vista 3D não está disponível neste dispositivo. Segue o padrão de vincos e as instruções.',
    stageFailed: 'A vista 3D não carregou. Segue o padrão de vincos e as instruções.',
    tryAgain: 'Tentar novamente',
    startOver: 'Recomeçar',
    previous: 'Passo anterior',
    replay: 'Repetir passo',
    next: 'Passo seguinte',
    speed: (s) => `Velocidade ${s}×`,
    resetView: 'Repor vista',
    foldProgress: 'Progresso da dobra',
    percentFolded: (n) => `${n}% dobrado`,
    hint: '← anterior · seguinte → · passa o rato para ver os nomes',
    isComplete: (name) => `${name} está concluído.`,
    diagramTitle: (active) =>
      `Padrão de vincos${active ? `, ${active} vinco${active === 1 ? '' : 's'} em destaque neste passo` : ''}`
  }
};
