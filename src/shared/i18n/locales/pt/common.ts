import type { PtLocaleShape } from '../../types';
import type { common as en, nav as enNav } from '../en/common';

export const common: PtLocaleShape<typeof en> = {
  back: 'Voltar',
  close: 'Fechar',
  cancel: 'Cancelar',
  continue: 'Continuar',
  start: 'Começar',
  skip: 'Saltar',
  save: 'Guardar',
  tryAgain: 'Tentar novamente',
  notNow: 'Agora não',
  openSettings: 'Abrir Definições',
  delete: 'Eliminar',
  and: ' e ',
  next: 'Seguinte',
  done: 'Concluído',
  goBack: 'Voltar atrás',
  error: 'Erro',
  tryAgainLater: 'Tente novamente mais tarde',
  somethingWentWrong: 'Algo correu mal',
  dontShowAgain: 'Não mostrar novamente',
  reminderHour: 'Hora do lembrete',
  reminderMinute: 'Minuto do lembrete',
  minutesShort_one: '{{count}} min',
  minutesShort_many: '{{count}} min',
  minutesShort_other: '{{count}} min',
  daysShort_one: '{{count}} d',
  daysShort_many: '{{count}} d',
  daysShort_other: '{{count}} d',
  offline: 'Offline',
  offlineToastTitle: 'Sem ligação à internet',
  offlineToastMessage: 'O teu progresso fica guardado no dispositivo e sincroniza quando voltares a ter ligação.',
};

export const nav: PtLocaleShape<typeof enNav> = {
  home: 'Início',
  exercises: 'Exercícios',
  progress: 'Progresso',
  account: 'Conta',
};
