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
    modelLabel: (name: string) =>
      `${name} em papel, a flutuar devagar. Toca em qualquer lado para o desdobrar e começar a dobrar.`
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
    creditFonts: 'Shippori Mincho, Instrument Sans e Zen Kurenaido, sob a SIL Open Font License.',
    licence:
      '© 2026 Pedro Conde. Todos os direitos reservados. O código, os modelos e os padrões de papel não podem ser copiados, redistribuídos nem usados para treinar sistemas de IA sem autorização.'
  },
  papers: {
    plain: 'Liso',
    ichimatsu: 'Ichimatsu',
    shippo: 'Shippō',
    asanoha: 'Asanoha',
    stripes: 'Riscas à mão',
    'mame-shibori': 'Mame shibori',
    'same-komon': 'Same komon',
    'shippo-hanabishi': 'Shippō hanabishi',
    hanabishi: 'Treliça hanabishi',
    ajiro: 'Trama ajiro',
    'wavy-cords': 'Cordões ondulados',
    kusari: 'Riscas kusari',
    'sakura-komon': 'Sakura komon',
    ume: 'Ume (flor de ameixeira)',
    cho: 'Chō (borboletas)',
    ine: 'Ine (arroz)',
    'tatewaku-kumo': 'Tatewaku kumo',
    ryusui: 'Ryūsui (água corrente)',
    seigaiha: 'Seigaiha',
    sayagata: 'Sayagata'
  },
  player: {
    firstInstruction: 'Começa com a folha de papel com o lado colorido para cima.',
    stepOf: (n, total) => `Passo ${n} · ${total}`,
    count: (n, total) => `${n}/${total}`,
    goToStep: 'Ir para o passo',
    instructions: 'Instruções',
    hideSteps: 'esconder passos',
    showSteps: 'mostrar passos',
    reverseFold: 'dobra invertida',
    how: 'Gestos',
    creases: 'Vincos',
    howSteps: [
      'Abre um pouco as camadas. A dobra a amarelo é a que vais virar do avesso',
      'Empurra a dobra para dentro pela linha: vira e entra entre as camadas',
      'Fecha e alisa. A dobra aponta agora ao contrário: a aba está do avesso'
    ],
    insideOut: 'A aba vira do avesso e entra entre as camadas do corpo.',
    marks: {
      title: 'O que querem dizer as marcas',
      foldLine: 'A linha da dobra, uma dobra em montanha: o papel dobra para longe de ti ao longo dela',
      push: 'Empurra a dobra para dentro aqui',
      tip: 'Para onde vai a ponta'
    },
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
    paper: 'Papel',
    paperIs: (name: string) => `Papel: ${name}`,
    done: 'Feito',
    isComplete: (name) => `${name} está concluído.`,
    diagramTitle: (active) =>
      `Padrão de vincos${active ? `, ${active} vinco${active === 1 ? '' : 's'} em destaque neste passo` : ''}`
  }
};
