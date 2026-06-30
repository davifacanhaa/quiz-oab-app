# Quiz OAB · 1ª Fase

Mini-aplicação: um quiz diagnóstico de 20 questões da OAB 1ª Fase (Vício de uma Estudante).
O participante chega via link do **ManyChat**, responde, vê o diagnóstico — e a submissão é
gravada no **Supabase** com as tags de segmentação já calculadas.

## Stack

- **Next.js 16** (App Router) — serve o quiz e a API.
- **Supabase** (Postgres) — banco das submissões.
- O quiz em si vive em [`public/quiz-engine.js`](public/quiz-engine.js) (vanilla JS, portado do
  protótipo original) e é montado por [`src/app/page.tsx`](src/app/page.tsx).

## Como rodar localmente

```bash
npm install
cp .env.example .env.local      # preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
npm run dev                      # http://localhost:3000
```

> O quiz funciona sem Supabase (só a gravação falha silenciosamente). Para gravar de verdade,
> preencha o `.env.local` e rode o schema abaixo.

## Setup do Supabase (uma vez)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **SQL Editor** → cole e rode [`supabase/schema.sql`](supabase/schema.sql) (cria a tabela
   `quiz_submissions`, índices e liga o RLS).
3. **Project Settings → API**: copie a `Project URL` e a `service_role key` para o `.env.local`.

> **Segurança:** toda escrita passa pela rota `/api/submit`, que usa a `service_role key`
> **só no servidor**. O RLS fica ligado sem políticas públicas, então a `anon key` não lê nem
> escreve nada direto do navegador.

## O dado que gravamos

Tabela `quiz_submissions` (uma linha por quiz concluído):

| campo | o que é |
|---|---|
| `manychat_id`, `phone`, `nome` | identidade do lead (origem ManyChat ou fallback) |
| `source` | `manychat` · `direct` · `fallback_form` · `unknown` |
| `raw_query` | todos os parâmetros da URL (debug / n8n) |
| `answers` | array de 20 índices marcados (`0–3` ou `null`) |
| `score` / `total` / `percent` | nota recalculada **no servidor** |
| `por_materia` | acertos/total/% por disciplina |
| `materia_mais_fraca` | disciplina com pior aproveitamento |
| **`faixa_nota`** | **TAG interna — nota geral (não exibida ao lead):** `excelente` (≥80%) · `bom` (≥60%) · `ok` (≥40%) · `ruim` (<40%) |
| **`completou`** | **TAG — conclusão** (sempre `true`, pois só grava ao terminar) |

As duas tags (`faixa_nota` + `completou`) são seus critérios de segmentação, prontas para serem
empurradas ao ManyChat/ActiveCampaign depois.

## Vinculando o lead pelo link do ManyChat (recomendado)

No botão/mensagem do ManyChat, monte a URL com os **merge fields** do contato:

```
https://SEU-DOMINIO/?mc={{Contact Id}}&whatsappid={{WhatsApp ID}}&email={{Email}}&nome={{Full Name}}
```

> Use o campo **WhatsApp ID** do ManyChat (não o campo "Phone", que costuma vir vazio em
> contatos de WhatsApp). O WhatsApp ID já é o número com DDI (ex: `5585988887777`).

Parâmetros aceitos (todos opcionais):

- `mc` (ou `subscriber_id` / `contact_id`) → `manychat_id`
- `whatsappid` (ou `whatsapp_id` / `wa_id` / `phone` / `whatsapp`) → `phone` (normalizado para `+55…`)
- `email` → `email`
- `nome` (ou `full_name` / `fullname` / `name` / `first_name`) → `nome` (use **{{Full Name}}** no ManyChat)

**Fallback:** se o link vier sem `mc` e sem WhatsApp, o quiz mostra uma tela pedindo e-mail e WhatsApp
antes de começar — assim ninguém fica sem identificação (depois é só cruzar pelo telefone com a
sua lista de leads no Supabase).

## Próximos passos (não implementados nesta fase)

- **n8n:** ler novas linhas de `quiz_submissions` (ou receber um webhook) e disparar os fluxos.
- **ManyChat / ActiveCampaign:** aplicar as tags `faixa_nota` / `completou` no contato — o dado
  já está pronto no banco, falta só o conector + credenciais.
