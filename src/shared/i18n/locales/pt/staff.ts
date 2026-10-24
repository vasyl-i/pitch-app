import type { PtLocaleShape } from '../../types';
import type { staff as en, pitch as enPitch } from '../en/staff';

export const staff: PtLocaleShape<typeof en> = {
  keyChange: {
    higher: 'Meio tom acima',
    lower: 'Meio tom abaixo',
    newKey: 'Uma nova tonalidade',
  },
  prompt: {
    nowIn: 'Agora em {{key}}',
    listenFirst: '{{change}} — ouça primeiro',
    listen: 'Ouça o exemplo',
    follow: 'Siga as notas',
    accompanied: 'Cante com o acompanhamento',
    match: 'Acompanhe cada nota o mais fielmente possível',
    matchHeadphones: 'Acompanhe cada nota — com auscultadores a pontuação é mais fiel',
    yourTurn: 'A sua vez',
    looping: 'Em repetição — cante outra vez',
    solo: 'Cante sem a guia',
  },
  header: {
    todaysPractice: 'Prática de hoje',
    forRange: '{{shift}} para a sua extensão',
  },
  restart: 'Recomeçar',
  skipPreview: 'Saltar pré-visualização',
  metronome: 'Metrónomo',
  noInputTitle: 'Não ouvimos ninguém a cantar.',
  noInputBody: 'Verifique o microfone e experimente — primeiro ouve a melodia e depois canta-a sozinho.',
  singAgain: 'Cantar outra vez',
  singItAgain: 'Cante outra vez',
  nextRound: 'Próxima ronda',
  couldNotStart: 'Não foi possível começar',
  transition: {
    title: 'Agora é a sua vez!',
    firstNote: 'Esta é a sua primeira nota — comece por ela.',
    onYourOwn: 'Cante a melodia sozinho.',
  },
  summary: {
    title: 'Pontuação da frase',
    metaDeviation: 'desvio médio de {{cents}}¢',
    metaRhythm: '{{rhythm}}% de ritmo',
    comparisonTitle: 'Com guia vs. sozinho',
    comparisonWell: 'Desta vez aguentou-se bem sozinho — veja a análise completa de precisão, estabilidade e ritmo com o Premium.',
    comparisonSlipped: 'O Premium mostra exatamente onde a guia o estava a ajudar — precisão, estabilidade e ritmo, lado a lado.',
    unlockComparison: 'Desbloquear comparação →',
  },
};

export const pitch: PtLocaleShape<typeof enPitch> = {
  flat: 'grave',
  sharp: 'agudo',
  inTune: 'afinado',
  confidence: 'Confiança',
  hz: '{{value}} Hz',
  hzLower: '{{value}} Hz',
};
