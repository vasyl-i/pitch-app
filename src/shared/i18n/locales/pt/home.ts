import type { PtLocaleShape } from '../../types';
import type { home as en } from '../en/home';

export const home: PtLocaleShape<typeof en> = {
  heading: 'Hora de praticar 🎧️️',
  monitorBanner: {
    title: 'Veja a sua voz ao vivo',
    subtitle: 'Cante à vontade e veja cada nota',
  },
  trialEndsTomorrow: 'O período experimental termina amanhã',
  practice: 'Praticar',
  shine: {
    title: 'Encontre. Acerte. Brilhe!',
    body: 'Pratique um pouco todos os dias e veja a diferença!',
  },
  redo: {
    title: 'Repetir o exercício?',
    message: 'Isto apaga os resultados anteriores deste exercício.',
  },
  plan: {
    title: 'Plano de hoje',
    morePractice: 'Mais prática',
    preparing: 'A preparar a sessão de hoje…',
    complete: 'Prática concluída — excelente trabalho hoje.',
    completeExplore: 'Prática concluída — excelente trabalho. Volte amanhã ou explore livremente abaixo.',
    continue: 'Continuar a prática de hoje',
    start: 'Começar a prática de hoje',
  },
  status: {
    completed: 'Concluído',
    inProgress: 'Em curso',
    ready: 'Pronto',
  },
  stats: {
    accuracy: 'Precisão',
    inARow: 'Seguidos',
    practiceTime: 'Tempo de prática',
  },
  progress: {
    title: 'O seu progresso',
  },
  exerciseDescription: {
    noteEcho: 'Ouça uma nota e repita-a',
    pitchMemory: 'Ouça uma nota e repita-a ao fim de 1 minuto',
    singInterval: 'Ouça um intervalo e repita-o',
    melodyEcho: 'Ouça uma escala e repita-a',
    chordTones: 'Ouça as notas do acorde',
    majorMinor: 'Ouça e distinga maior de menor',
    oddOneOut: 'Encontre a nota que não pertence',
    finishMelody: 'Ouça uma melodia e cante a última nota',
    echoInterval: 'Ouça um intervalo e repita-o',
  },
};
