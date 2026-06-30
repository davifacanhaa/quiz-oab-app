-- ════════════════════════════════════════════════════════════════
-- Quiz OAB · schema do Supabase
-- Rode este arquivo no SQL Editor do painel do Supabase (uma vez).
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create table if not exists public.quiz_submissions (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),

  -- Identidade do lead (qualquer uma pode ser null dependendo da origem)
  manychat_id        text,          -- subscriber/contact id vindo do link do ManyChat
  phone              text,          -- WhatsApp ID E.164 com DDI BR (ex: +5585989659744)
  email              text,          -- e-mail do lead (fallback form ou ?email= do ManyChat)
  nome               text,
  source             text,          -- 'manychat' | 'direct' | 'fallback_form' | 'unknown'
  raw_query          jsonb default '{}'::jsonb,  -- todos os params da URL (debug / n8n)

  -- Respostas e resultado (recalculado no servidor)
  answers            jsonb not null,             -- [idx|null] x 20
  score              int  not null,
  total              int  not null,
  percent            int  not null,
  por_materia        jsonb not null,             -- { "Ética": {acertos,total,percent}, ... }
  materia_mais_fraca text,

  -- TAGS (seus critérios) — prontas pra empurrar pro ManyChat/AC depois
  faixa_nota         text not null,              -- 'excelente' | 'bom' | 'ok' | 'ruim' (tag interna)
  completou          boolean not null default true,

  user_agent         text
);

create index if not exists idx_quiz_phone    on public.quiz_submissions (phone);
create index if not exists idx_quiz_email    on public.quiz_submissions (email);
create index if not exists idx_quiz_manychat on public.quiz_submissions (manychat_id);
create index if not exists idx_quiz_created  on public.quiz_submissions (created_at desc);
create index if not exists idx_quiz_faixa    on public.quiz_submissions (faixa_nota);

-- RLS ligado e SEM políticas públicas: toda escrita passa pela API do app,
-- que usa a service_role key (a service_role ignora o RLS). Assim ninguém
-- consegue ler/escrever direto do navegador com a anon key.
alter table public.quiz_submissions enable row level security;
