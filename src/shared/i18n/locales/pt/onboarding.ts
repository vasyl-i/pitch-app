import type { PtLocaleShape } from '../../types';
import type { onboarding as en } from '../en/onboarding';

export const onboarding: PtLocaleShape<typeof en> = {
  welcome: {
    title: 'Melhore a sua afinação',
    subtitle: 'Treine o ouvido. Acerte nas notas.\nVeja progresso real.',
    cta: 'Começar',
  },
  rangeStart: {
    title: 'Vamos descobrir a sua\nextensão vocal',
    subtitle: 'Isto ajuda-nos a personalizar cada exercício\ne a proteger a sua voz.',
  },
  results: {
    title: 'Encontrou a sua extensão!',
    subtitle: 'A partir de agora, cada exercício vai adaptar-se à sua voz.',
    startOver: 'Recomeçar',
    save: 'Guardar e continuar',
  },
  why: {
    title: 'Porque é que a extensão importa',
    fitsTitle: 'Adapta cada exercício à sua voz',
    fitsBody: 'Melodias e exercícios passam para o registo que é realmente confortável para si.',
    strainTitle: 'Evita o esforço excessivo',
    strainBody: 'Nunca o levamos a notas que possam magoar — o conforto vale mais do que impressionar.',
    growsTitle: 'Cresce consigo',
    growsBody: 'À medida que a sua extensão melhora, vamos notar e propor atualizá-la — vai continuar a praticar no limite do que consegue.',
  },
  goals: {
    title: 'O que gostaria\nde melhorar?',
    subtitle: 'Escolha todas as opções que se aplicam',
  },
  rhythm: {
    title: 'Defina o seu ritmo\nde prática',
    subtitle: 'Até 5 minutos podem aproximá-lo\nde uma melhor afinação.',
  },
  reminder: {
    title: 'Lembrete diário',
    subtitle: 'Receba notificações para acelerar o seu\nprogresso.',
    setTime: 'Definir hora do lembrete',
  },
};
