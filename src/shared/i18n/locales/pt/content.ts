import type { ContentOverlay } from '../../types';

/**
 * Portuguese for domain content whose English lives inline in the data files
 * (see `localizeContent`). Keyed `<group>.<id>.<field>`; a missing entry
 * falls back to the English source, and `__tests__/content.test.ts` checks
 * every id is covered.
 */
export const ptContent: ContentOverlay = {
  // entities/exercise/library.ts (also the melody entries of the learning catalog);
  // songs keep their original title, so they only carry `source`
  exercise: {
    'c-major-scale': { title: 'Escala de Dó maior', source: 'Aquecimento · solfejo' },
    'major-arpeggio': { title: 'Arpejo maior', source: 'Aquecimento · tríade' },
    'e-minor-scale': { title: 'Escala de Mi menor', source: 'Aquecimento · menor natural' },
    'minor-arpeggio': { title: 'Arpejo menor', source: 'Aquecimento · tríade' },
    twinkle: { source: 'Tradicional · domínio público' },
    'mary-lamb': { source: 'Tradicional · domínio público' },
    'frere-jacques': { source: 'Tradicional · domínio público' },
    'ode-to-joy': { source: 'Beethoven · domínio público' },
    'd-dorian-mode': {
      title: 'Ré dórico',
      source: 'Modo · menor com a sexta elevada',
      hint: 'O dórico é uma escala menor com uma sexta luminosa — repare na subida no B.',
    },
    'c-lydian-mode': {
      title: 'Dó lídio',
      source: 'Modo · maior com a quarta elevada',
      hint: 'A quarta elevada (F#) é todo o carácter — não deslize para o F.',
    },
    'g-mixolydian-mode': {
      title: 'Sol mixolídio',
      source: 'Modo · maior com a sétima baixada',
      hint: 'A sétima mantém-se natural — deve soar por resolver, sem vontade de subir.',
    },
    'major-seventh-arpeggio': {
      title: 'Arpejo de sétima maior',
      source: 'Jazz · Cmaj7',
      hint: 'A sétima (B) fica meio tom abaixo da oitava — aponte um pouco abaixo do Dó.',
    },
    'minor-seventh-arpeggio': { title: 'Arpejo de sétima menor', source: 'Jazz · Am7' },
    'major-ninth-arpeggio': {
      title: 'Arpejo de nona maior',
      source: 'Jazz · acorde estendido · Cmaj9',
      hint: 'Cinco notas a subir antes de voltar — guarde fôlego para o D.',
    },
    'chromatic-climb': {
      title: 'Subida cromática',
      source: 'Cromático · meios-tons',
      hint: 'Os meios-tons são o intervalo mais fácil de cantar largo demais. Pense pequeno.',
    },
    'chromatic-neighbours': {
      title: 'Vizinhas cromáticas',
      source: 'Cromático · superior e inferior',
      hint: 'Saia da nota e volte logo — o regresso tem de ser exato.',
    },
    'agility-triplets': {
      title: 'Tercinas de agilidade',
      source: 'Agilidade · sequência ascendente',
      hint: 'A velocidade vem do relaxamento, não do esforço. Mantenha o maxilar quieto.',
    },
    'melisma-descent': {
      title: 'Melisma descendente',
      source: 'Melisma · uma sílaba, muitas notas',
      hint: 'Tudo isto é um só «Á». Não volte a articular — deixe só a altura mexer-se.',
    },
    'riff-turnaround': { title: 'Riff pentatónico', source: 'Riff · turnaround de R&B' },
    'belt-power-fifths': {
      title: 'Quintas com potência',
      source: 'Belt · registo agudo sustentado',
      hint: 'Apoio nas costelas, não na garganta. Pare se sentir tensão em algum lado.',
    },
    'mix-voice-ladder': {
      title: 'Escada de voz mista',
      source: 'Voz mista · através da passagem',
      hint: 'Atravesse a passagem sem mudar de registo — o mesmo timbre acima e abaixo.',
    },
    'harmony-thirds': {
      title: 'Terceiras acima',
      source: 'Harmonia · cante a voz de cima',
      hint: 'Canta a segunda voz; o acompanhamento mantém a melodia por baixo.',
    },
  },

  // entities/exercise/categories.ts
  exerciseCategory: {
    warmup: { label: 'Escalas, arpejos e aquecimentos', tagline: 'Escalas maiores e menores, tríades e aberturas suaves de extensão.' },
    melody: { label: 'Melodias', tagline: 'Melodias completas para praticar afinação e ritmo em conjunto.' },
    modes: { label: 'Modos', tagline: 'Dórico, lídio e mixolídio — as cores para além do maior e do menor.' },
    jazz: { label: 'Jazz e acordes estendidos', tagline: 'Sétimas, nonas e os arpejos que sustentam as linhas de jazz.' },
    chromatic: { label: 'Exercícios cromáticos', tagline: 'Precisão nos meios-tons — os intervalos mais difíceis de afinar.' },
    agility: { label: 'Agilidade, passagens e melismas', tagline: 'Passagens rápidas, riffs e ornamentos para uma voz flexível.' },
    belt: { label: 'Belt e voz mista', tagline: 'Potência no registo agudo e uma passagem suave pela quebra.' },
    harmony: { label: 'Harmonia', tagline: 'Mantenha a sua linha enquanto outra voz se move ao lado.' },
  },

  // features/ear-training/model/definitions.ts + the ear drills of the learning catalog
  earExercise: {
    'note-echo': { title: 'Repita a nota', tagline: 'Ouça uma nota e cante-a na sua oitava.' },
    'chord-tones': { title: 'Notas do acorde', tagline: 'Ouça um acorde e cante cada uma das suas notas.' },
    'melody-echo': { title: 'Repita a melodia', tagline: 'Ouça uma frase curta e cante-a de imediato.' },
    'pitch-memory': { title: 'Memória de altura', tagline: 'Ouça uma nota, guarde-a na memória e cante-a depois do temporizador.' },
    'echo-interval': { title: 'Repita o intervalo', tagline: 'Ouça duas notas juntas e cante o mesmo intervalo.' },
    'sing-interval': { title: 'Cante o intervalo', tagline: 'Ouça um intervalo e cante a nota alvo de memória.' },
    'finish-melody': { title: 'Termine a melodia', tagline: 'A frase para uma nota antes do fim — cante a nota que a resolve.' },
    'major-minor': { title: 'Maior ou menor?', tagline: 'Ouça um acorde e identifique o modo. Só ouvir — sem cantar.' },
    'odd-one-out': { title: 'Descubra o diferente', tagline: 'Três sons — dois iguais, um diferente. Qual é?' },
  },

  // features/subscription/model/plans.ts
  plan: {
    weekly: { name: 'Semanal' },
    monthly: { name: 'Mensal' },
    yearly: { name: 'Anual' },
  },

  // features/subscription/model/benefits.ts (keyed by PremiumFeature)
  premiumBenefit: {
    'ai-session-feedback': {
      title: 'Feedback personalizado',
      detail: 'Depois de cada sessão: o que correu bem, o que não correu e porquê — nunca elogios genéricos.',
    },
    'adaptive-lessons': {
      title: 'Lições adaptativas diárias',
      detail: 'Uma lição refeita todas as manhãs a partir do seu perfil de capacidades, que evolui consigo.',
    },
    'smart-recommendations': {
      title: 'Planos de prática personalizados',
      detail: 'Exercícios escolhidos a partir do seu histórico, cada um com a explicação da escolha.',
    },
    'weak-spot-training': {
      title: 'Treino de pontos fracos',
      detail: 'Exercícios gerados a partir dos intervalos, notas e transições exatos em que continua a falhar.',
    },
    'attempt-comparison': {
      title: 'Comparação de desempenho',
      detail: 'Veja como canta com a guia e sozinho — precisão, estabilidade e ritmo.',
    },
    'advanced-library': {
      title: 'Exercícios avançados',
      detail: 'Modos, arpejos de jazz, cromatismos, passagens, belt e voz mista.',
    },
    'unlimited-instrumental-uploads': {
      title: 'Instrumentais ilimitados',
      detail: 'Carregue todos os instrumentais que quiser — os 3 primeiros são gratuitos.',
    },
  },

  // features/learning/lib/skillTree.ts
  skillTree: {
    'pitch-1': { title: 'Repita a nota' },
    'pitch-2': { title: 'Escala afinada' },
    'pitch-3': { title: 'Memória de altura curta' },
    'pitch-4': { title: 'Memória de altura longa' },
    'intervals-1': { title: 'Identifique o intervalo' },
    'intervals-1b': { title: 'Repita o intervalo' },
    'intervals-2': { title: 'Intervalos simples' },
    'intervals-3': { title: 'Intervalos mais largos' },
    'intervals-4': { title: 'Todos os intervalos, nos dois sentidos' },
    'chords-1': { title: 'Maior ou menor?' },
    'chords-2': { title: 'Identifique o acorde' },
    'chords-3': { title: 'Cante as notas do acorde' },
    'chords-4': { title: 'Acordes complexos' },
    'melody-1': { title: 'Repita duas notas' },
    'melody-2': { title: 'Repita frases curtas' },
    'melody-3': { title: 'Cante uma canção inteira' },
    'melody-4': { title: 'Repita frases longas' },
    'rhythm-1': { title: 'Canção simples e regular' },
    'rhythm-2': { title: 'Frases mais longas a tempo' },
    'rhythm-3': { title: 'Durações variadas' },
    'tonality-1': { title: 'Identifique a escala' },
    'tonality-2': { title: 'Termine a melodia' },
    'tonality-3': { title: 'Cores menores' },
    'voice-1': { title: 'Arpejo maior' },
    'voice-2': { title: 'Escala menor estável' },
    'voice-3': { title: 'Arpejo menor' },
    'memory-1': { title: 'Guarde uma nota' },
    'memory-2': { title: 'Guarde uma frase' },
    'memory-3': { title: 'Um minuto de memória' },
    'memory-4': { title: 'Frases longas de memória' },
    'sight-1': { title: 'Escala a partir da pauta' },
    'sight-2': { title: 'Primeira canção a partir da partitura' },
    'sight-3': { title: 'Leia um clássico' },
    'sight-4': { title: 'Leituras mais longas' },
    'perform-1': { title: 'Aperfeiçoe uma peça' },
    'perform-2': { title: 'Domine os intervalos' },
    'perform-3': { title: 'Domínio total dos acordes' },
  },
};
