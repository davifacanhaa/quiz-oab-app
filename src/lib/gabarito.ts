/**
 * Fonte da verdade do quiz no SERVIDOR.
 *
 * O cliente (public/quiz-engine.js) envia apenas o array `answers`
 * (índice marcado por questão, ou null). O servidor recalcula nota,
 * desempenho por matéria e as TAGS aqui — assim o resultado não depende
 * de valores enviados pelo cliente (que poderiam ser adulterados).
 *
 * A ordem das 20 questões abaixo é EXATAMENTE a mesma do array `Q` em
 * public/quiz-engine.js. Se as questões mudarem lá, atualize aqui.
 */

export type Faixa = 'excelente' | 'bom' | 'ok' | 'ruim';

/** Gabarito: matéria + índice da alternativa correta (0=A,1=B,2=C,3=D). */
export const GABARITO: { m: string; c: number }[] = [
  { m: 'Ética', c: 2 },               // 1
  { m: 'Ética', c: 3 },               // 2
  { m: 'Constitucional', c: 0 },      // 3
  { m: 'Constitucional', c: 2 },      // 4
  { m: 'Administrativo', c: 1 },      // 5
  { m: 'Administrativo', c: 1 },      // 6
  { m: 'Tributário', c: 2 },          // 7
  { m: 'Tributário', c: 0 },          // 8
  { m: 'Civil', c: 2 },               // 9
  { m: 'Civil', c: 1 },               // 10
  { m: 'Processo Civil', c: 1 },      // 11
  { m: 'Processo Civil', c: 1 },      // 12
  { m: 'Penal', c: 0 },               // 13
  { m: 'Penal', c: 1 },               // 14
  { m: 'Processo Penal', c: 3 },      // 15
  { m: 'Processo Penal', c: 0 },      // 16
  { m: 'Trabalho', c: 3 },            // 17
  { m: 'Trabalho', c: 3 },            // 18
  { m: 'Processo do Trabalho', c: 3 },// 19
  { m: 'Processo do Trabalho', c: 0 },// 20
];

/**
 * Faixa de nota geral — TAG INTERNA (não exibida ao usuário; vai pro banco
 * e para a segmentação no ManyChat/ActiveCampaign).
 *   excelente >= 80%
 *   bom       60–79%
 *   ok        40–59%
 *   ruim      <  40%
 */
export function faixaFromPercent(percent: number): Faixa {
  if (percent >= 80) return 'excelente';
  if (percent >= 60) return 'bom';
  if (percent >= 40) return 'ok';
  return 'ruim';
}

export interface MateriaScore {
  acertos: number;
  total: number;
  percent: number;
}

export interface QuizResult {
  score: number;
  total: number;
  percent: number;
  porMateria: Record<string, MateriaScore>;
  materiaMaisFraca: string | null;
  faixa: Faixa;
}

/** Recalcula tudo a partir das respostas cruas. */
export function computeResult(answers: (number | null)[]): QuizResult {
  const total = GABARITO.length;
  let score = 0;
  const porMateria: Record<string, MateriaScore> = {};

  GABARITO.forEach((g, i) => {
    if (!porMateria[g.m]) porMateria[g.m] = { acertos: 0, total: 0, percent: 0 };
    porMateria[g.m].total++;
    if (answers[i] === g.c) {
      score++;
      porMateria[g.m].acertos++;
    }
  });

  for (const v of Object.values(porMateria)) {
    v.percent = Math.round((v.acertos / v.total) * 100);
  }

  // Matéria com pior aproveitamento (empate -> primeira encontrada).
  let materiaMaisFraca: string | null = null;
  let worst = Infinity;
  for (const [m, v] of Object.entries(porMateria)) {
    if (v.percent < worst) {
      worst = v.percent;
      materiaMaisFraca = m;
    }
  }

  const percent = Math.round((score / total) * 100);
  return { score, total, percent, porMateria, materiaMaisFraca, faixa: faixaFromPercent(percent) };
}
