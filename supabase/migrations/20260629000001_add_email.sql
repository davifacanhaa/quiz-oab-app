-- Adiciona e-mail do lead (capturado no formulário de fallback ou via ?email= do ManyChat).
alter table public.quiz_submissions add column if not exists email text;
create index if not exists idx_quiz_email on public.quiz_submissions (email);
