import { computeResult, GABARITO } from '@/lib/gabarito';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
// Sempre processa em runtime — nunca cacheia uma submissão.
export const dynamic = 'force-dynamic';

interface SubmitBody {
  manychat_id?: string | null;
  phone?: string | null;
  whatsappid?: string | null;
  whatsapp_id?: string | null;
  wa_id?: string | null;
  email?: string | null;
  nome?: string | null;
  source?: string | null;
  raw_query?: Record<string, string> | null;
  answers?: unknown;
  user_agent?: string | null;
}

function digits(v: unknown): string | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const d = String(v).replace(/\D/g, '');
  return d.length ? d : null;
}

/**
 * Normaliza o telefone para WhatsApp ID em formato E.164 com DDI do Brasil: +55DDNXXXXXXXX.
 * - Número nacional (10 ou 11 dígitos): adiciona o 55.
 * - Já com DDI 55 (12 ou 13 dígitos): mantém.
 * Retorna null se não houver dígitos.
 */
function toWhatsAppId(v: unknown): string | null {
  const d = digits(v);
  if (!d) return null;
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return '+' + d;
  if (d.length === 10 || d.length === 11) return '+55' + d;
  // formato inesperado: melhor esforço — garante o DDI sem duplicar
  return d.startsWith('55') ? '+' + d : '+55' + d;
}

function clean(v: unknown, max = 300): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, max);
  // descarta merge fields não-renderizados do ManyChat (ex: "{{FullName}}")
  if (!t.length || /^\{\{.*\}\}$/.test(t)) return null;
  return t;
}

/** Mantém só pares string/num/bool curtos e poucas chaves — evita gravar lixo grande. */
function sanitizeQuery(q: unknown): Record<string, string> {
  if (!q || typeof q !== 'object' || Array.isArray(q)) return {};
  const out: Record<string, string> = {};
  let n = 0;
  for (const [k, val] of Object.entries(q as Record<string, unknown>)) {
    if (n >= 25) break;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      out[String(k).slice(0, 60)] = String(val).slice(0, 300);
      n++;
    }
  }
  return out;
}

/** Valida o array de respostas: comprimento certo, cada item null ou 0..3. */
function parseAnswers(raw: unknown): (number | null)[] | null {
  if (!Array.isArray(raw) || raw.length !== GABARITO.length) return null;
  const out: (number | null)[] = [];
  for (const a of raw) {
    if (a === null) {
      out.push(null);
    } else if (typeof a === 'number' && Number.isInteger(a) && a >= 0 && a <= 3) {
      out.push(a);
    } else {
      return null;
    }
  }
  return out;
}

export async function POST(request: Request) {
  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON inválido.' }, { status: 400 });
  }

  const answers = parseAnswers(body.answers);
  if (!answers) {
    return Response.json(
      { ok: false, error: `answers deve ser um array de ${GABARITO.length} itens (null ou 0–3).` },
      { status: 422 },
    );
  }

  // Recalcula nota, desempenho por matéria e tags no servidor (não confia no cliente).
  const result = computeResult(answers);

  const row = {
    manychat_id: clean(body.manychat_id, 120),
    phone: toWhatsAppId(body.whatsappid ?? body.whatsapp_id ?? body.wa_id ?? body.phone),
    email: clean(body.email, 160)?.toLowerCase() ?? null,
    nome: clean(body.nome, 120),
    source: clean(body.source, 40) ?? 'unknown',
    raw_query: sanitizeQuery(body.raw_query),
    answers,
    score: result.score,
    total: result.total,
    percent: result.percent,
    por_materia: result.porMateria,
    materia_mais_fraca: result.materiaMaisFraca,
    faixa_nota: result.faixa, // tag: nota geral
    completou: true,          // tag: conclusão
    user_agent: clean(body.user_agent, 400),
  };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('quiz_submissions')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error('[submit] erro Supabase:', error);
      return Response.json({ ok: false, error: 'Falha ao gravar no banco.' }, { status: 502 });
    }

    return Response.json({
      ok: true,
      id: data.id,
      score: result.score,
      total: result.total,
      percent: result.percent,
      faixa_nota: result.faixa,
    });
  } catch (e) {
    console.error('[submit] erro inesperado:', e);
    return Response.json({ ok: false, error: 'Erro interno.' }, { status: 500 });
  }
}
