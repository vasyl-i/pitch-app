import type { PtLocaleShape } from '../../types';
import type { notifications as en } from '../en/notifications';

export const notifications: PtLocaleShape<typeof en> = {
  reminders: [
    { title: 'Sem tempo para uma prática completa?', body: 'Cinco minutos chegam para cuidar da sua voz hoje.' },
    { title: 'Consegue ouvir a diferença? 👂', body: 'Volte para o treino de afinação de hoje e veja como está.' },
    { title: 'Uma nota mais perto 🎵', body: 'Melhore a sua afinação, uma pequena prática de cada vez.' },
    { title: 'O seu ginásio vocal está à espera 🎤', body: 'Pronto para um treino rápido? A próxima nota espera por si.' },
    { title: 'A sua voz cresce com a prática. 🎶', body: 'Um treino pequeno. Um passo importante.' },
    { title: 'Vamos tornar estas notas suas.', body: 'Cinco minutos. Uma pequena vitória.' },
    { title: 'O seu próximo avanço começa com uma nota.', body: 'Mantenha o ouvido curioso. 👂' },
    { title: 'Pronto para encontrar a sua afinação?', body: 'A sua voz merece cinco minutos hoje.' },
  ],
  catchUp: [
    { title: 'Um pouco de música antes de o dia acabar 🌙', body: 'Tire cinco minutos para si e para a sua voz.' },
    { title: 'Cada regresso conta 🩵', body: 'Falhou um dia? Não faz mal. Continue de onde ficou.' },
  ],
  screen: {
    title: 'Está tudo em dia',
    body: 'Nada de novo por agora. Os lembretes de prática e as novidades aparecem aqui.',
  },
  channel: {
    name: 'Lembretes de prática',
    description: 'Lembretes diários de prática e avisos do período experimental',
  },
  trialEnding: {
    title: 'O seu período experimental termina amanhã',
    body: 'Só um aviso — a sua subscrição começa amanhã. Pode geri-la a qualquer momento nas definições.',
  },
};
