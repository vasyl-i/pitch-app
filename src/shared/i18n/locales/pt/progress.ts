import type { PtLocaleShape } from '../../types';
import type { progress as en } from '../en/progress';

export const progress: PtLocaleShape<typeof en> = {
  empty: 'Ainda não há nada aqui. Conclua a prática de hoje no Início e o seu progresso começa a crescer.',
  perfectRuns: 'Execuções perfeitas',
  stats: {
    pitchAccuracy: 'Afinação',
    perfectNotes: 'Notas perfeitas',
    rhythm: 'Ritmo',
    pitchStability: 'Estabilidade',
    daysPracticed: 'Dias de prática',
    practiceTime: 'Tempo de prática',
    openHistory: 'Mostra como evoluiu ao longo do tempo',
  },
  sections: {
    consistency: 'Acompanhe a regularidade do seu treino auditivo',
    masteryChanges: 'Evolução das capacidades nos últimos 7 dias',
    summary: 'Resumo dos últimos 7 dias',
  },
  masteryEmpty: 'Nenhuma capacidade mudou nos últimos 7 dias. Alguns exercícios e as mudanças aparecem aqui.',
  masteryChange: '{{from}}% → {{to}}%',
  history: {
    range: { '4w': '4 sem', '3m': '3 meses', '6m': '6 meses', '1y': '1 ano' },
    now: 'O seu nível agora',
    allTime: 'Desde o início',
    gained: '+{{delta}} neste período',
    lost: '−{{delta}} neste período',
    unchanged: 'Sem alterações neste período',
    inRange: '{{value}} neste período',
    bucket_one: 'Cada barra é {{count}} semana',
    bucket_many: 'Cada barra são {{count}} semanas',
    bucket_other: 'Cada barra são {{count}} semanas',
    today: 'Hoje',
    whatItMeans: 'O que este número significa',
    skillEmpty: 'Faça exercícios que treinem esta capacidade e o histórico vai surgindo aqui.',
    explain: {
      skill: 'O seu nível a longo prazo nesta capacidade, de 0 a 100. É uma média contínua de todos os exercícios que a treinam, com mais peso na prática recente: um mau dia quase não a altera, a prática regular sim. Todos começam nos 30.',
      perfectNotes: 'Todas as notas que cantou exatamente no alvo, em qualquer exercício, desde o início. O gráfico mostra quantas acertou em cada período.',
      practiceDays: 'Dias com pelo menos um exercício concluído, desde o início. Falhar um dia nunca faz este número descer.',
      practiceTime: 'Tempo passado nos exercícios, a ouvir e a cantar, desde o início. Cada exercício conta no máximo 10 minutos.',
    },
  },
  perfect: {
    title: 'Tarefas perfeitas',
    subtitle: 'Exercícios que concluiu com uma execução de 3 estrelas',
    empty: 'Ainda não há nada aqui. Obtenha 90 ou mais em qualquer exercício para ganhar 3 estrelas e ele aparece nesta lista.',
    meta: 'Melhor {{best}} · {{runs}} · {{date}}',
    runs_one: '{{count}} execução perfeita',
    runs_many: '{{count}} execuções perfeitas',
    runs_other: '{{count}} execuções perfeitas',
  },
  calendar: {
    previous: 'Mês anterior',
    next: 'Mês seguinte',
    // Seg/Sex and Qua/Qui share their first two letters, so Portuguese keeps three
    weekdays: { mo: 'Seg', tu: 'Ter', we: 'Qua', th: 'Qui', fr: 'Sex', sa: 'Sáb', su: 'Dom' },
  },
  duration: {
    underMinute: '<1 min',
    minutes: '{{m}} min',
    hours: '{{h}} h',
    hoursMinutes: '{{h}} h {{m}} min',
    totalMinutes: '{{m}} min',
    totalHours: '{{h}} h',
  },
};
