# Quiz OAB · Guia de Integrações (payloads)

Tudo que você precisa para montar as integrações (ManyChat, ActiveCampaign, n8n):
contrato dos dados, como ler do Supabase, as tags/segmentação e o **banco completo de
questões com gabarito**.

- **App:** https://quiz-oab-app.vercel.app
- **API de submissão:** `POST /api/submit`
- **Banco:** Supabase, tabela `public.quiz_submissions`
- **Projeto Supabase:** `hnrrqgnqlatkpflfzbrw` → base URL `https://hnrrqgnqlatkpflfzbrw.supabase.co`

---

## 1. De onde vêm os dados (fluxo)

1. Lead abre o link (ManyChat com merge fields, ou cai no formulário).
2. Responde as 20 questões (timer de 7 min).
3. No fim, o **navegador** faz `POST /api/submit`.
4. O **servidor recalcula** nota/tags e grava **uma linha** em `quiz_submissions`.

> A nota e as tags são calculadas no servidor (o cliente só manda as respostas cruas).
> Para as integrações, **a fonte da verdade é a linha do Supabase.**

---

## 2. A linha gravada (`quiz_submissions`) — payload principal

Cada quiz concluído = 1 linha. Colunas:

| coluna | tipo | descrição |
|---|---|---|
| `id` | uuid | id da submissão |
| `created_at` | timestamptz | data/hora (UTC) |
| `manychat_id` | text \| null | Contact/Subscriber ID do ManyChat (chave p/ taguear de volta) |
| `phone` | text \| null | **WhatsApp ID em E.164**, ex: `+5585988887777` |
| `email` | text \| null | e-mail (minúsculo) |
| `nome` | text \| null | **nome completo** |
| `source` | text | `manychat` \| `direct` \| `fallback_form` \| `unknown` |
| `raw_query` | jsonb | params da URL (debug) — saneado, sem `{{...}}` |
| `answers` | jsonb | array de 20 respostas (índice **original** 0–3, ou `null`) — ver §7 |
| `score` | int | nº de acertos (0–20) |
| `total` | int | sempre 20 |
| `percent` | int | `round(score/total*100)` |
| `por_materia` | jsonb | desempenho por matéria (ver §6) |
| `materia_mais_fraca` | text \| null | matéria com menor % |
| `faixa_nota` | text | **tag interna**: `excelente` \| `bom` \| `ok` \| `ruim` (ver §5) |
| `completou` | bool | sempre `true` (só grava ao terminar) |
| `user_agent` | text \| null | navegador |

### Exemplo de linha (JSON)
```json
{
  "id": "e50f008e-2062-4a52-969a-07fdaeb5f3c5",
  "created_at": "2026-06-30T19:27:45.903Z",
  "manychat_id": "123456789",
  "phone": "+5585988887777",
  "email": "maria@email.com",
  "nome": "Maria Clara de Souza",
  "source": "manychat",
  "raw_query": { "mc": "123456789", "whatsappid": "5585988887777" },
  "answers": [2,3,0,2,1,1,2,0,2,1,1,1,0,1,3,0,3,3,3,0],
  "score": 20,
  "total": 20,
  "percent": 100,
  "por_materia": {
    "Ética": {"acertos":2,"total":2,"percent":100},
    "Constitucional": {"acertos":2,"total":2,"percent":100}
  },
  "materia_mais_fraca": "Ética",
  "faixa_nota": "excelente",
  "completou": true,
  "user_agent": "Mozilla/5.0 ..."
}
```

---

## 3. Como LER os dados (Supabase REST)

Endpoint: `GET https://hnrrqgnqlatkpflfzbrw.supabase.co/rest/v1/quiz_submissions`

Headers (a tabela tem **RLS**; só a `service_role` lê/escreve):
```
apikey: <SERVICE_ROLE_KEY>
Authorization: Bearer <SERVICE_ROLE_KEY>
```
> ⚠️ A `service_role key` dá acesso total. Use-a **só no servidor** (ex: dentro do n8n),
> nunca no navegador/ManyChat. Pegue o valor em Supabase → Project Settings → API
> (ou no `.env.local`). Se precisar de leitura mais restrita, crie uma *policy* + chave dedicada.

Exemplos:
```bash
# últimas submissões
GET /rest/v1/quiz_submissions?select=*&order=created_at.desc&limit=50

# só quem tirou nota ruim (pra sequência de reforço)
GET /rest/v1/quiz_submissions?faixa_nota=eq.ruim&select=nome,phone,email,manychat_id

# incremental (a partir de um horário) — ideal pra n8n rodando de X em X min
GET /rest/v1/quiz_submissions?created_at=gt.2026-07-01T00:00:00Z&select=*

# achar um contato específico
GET /rest/v1/quiz_submissions?manychat_id=eq.123456789
GET /rest/v1/quiz_submissions?phone=eq.%2B5585988887777   (o + vira %2B)
```

### Onde plugar o n8n (3 opções)
- **Polling (mais simples):** n8n a cada N min → query incremental por `created_at` → dispara ManyChat/AC.
- **Supabase Database Webhook:** dispara um POST pro n8n a cada `INSERT` na tabela (Supabase → Database → Webhooks).
- **Encaixe no app:** dá pra adicionar um `fetch` no fim de `/api/submit` chamando um webhook do n8n (me peça se quiser).

---

## 4. Contrato da API `POST /api/submit` (referência)

Corpo aceito (todos opcionais menos `answers`):
```json
{
  "manychat_id": "123456789",
  "whatsappid": "5585988887777",   // ou whatsapp_id / wa_id / phone
  "email": "maria@email.com",
  "nome": "Maria Clara de Souza",
  "source": "manychat",
  "raw_query": { "qualquer": "coisa" },
  "answers": [2,3,0,2,1,1,2,0,2,1,1,1,0,1,3,0,3,3,3,0],
  "user_agent": "..."
}
```
Resposta:
```json
{ "ok": true, "id": "<uuid>", "score": 20, "total": 20, "percent": 100, "faixa_nota": "excelente" }
```
Regras: `answers` deve ter **20 itens** (`null` ou `0–3`); merge fields `{{...}}` viram `null`;
`phone` é normalizado para `+55…`.

---

## 5. Tags / segmentação (seus critérios)

Calculadas no servidor a partir de `percent`:

| `faixa_nota` | faixa | sugestão de tag |
|---|---|---|
| `excelente` | ≥ 80% | `quiz_oab_excelente` |
| `bom` | 60–79% | `quiz_oab_bom` |
| `ok` | 40–59% | `quiz_oab_ok` |
| `ruim` | < 40% | `quiz_oab_ruim` |

Outros campos úteis p/ segmentar: `completou` (sempre true = fez o quiz),
`materia_mais_fraca` (ex: taguear `fraco_penal`), `percent` (número puro).

> **Importante:** `faixa_nota` é interno (não aparece pro lead). O texto que a pessoa vê é
> um badge motivacional separado.

---

## 6. `por_materia` (JSON) + matérias

Estrutura:
```json
{ "Ética": {"acertos":1,"total":2,"percent":50}, "Penal": {"acertos":0,"total":2,"percent":0} }
```
São **10 matérias, 2 questões cada** (20 no total):
`Ética`, `Constitucional`, `Administrativo`, `Tributário`, `Civil`,
`Processo Civil`, `Penal`, `Processo Penal`, `Trabalho`, `Processo do Trabalho`.

---

## 7. ⚠️ Como interpretar `answers` (leia com atenção)

- `answers` é um array de **20 posições**, na **ordem das questões abaixo (§9)** — índice 0 = Questão 1, …, índice 19 = Questão 20.
- Cada valor é o **índice ORIGINAL da alternativa escolhida** (0=A, 1=B, 2=C, 3=D **na ordem original** listada em §9), ou `null` se pulou.
- **Acertou a questão `i`** se `answers[i] === gabarito[i]` (coluna "índice" da tabela em §8).
- As alternativas são **embaralhadas na tela** pra equilibrar A/B/C/D, mas o valor gravado usa **sempre o índice original** — então o gabarito abaixo é a referência definitiva, independente da ordem que o lead viu.

Gabarito como array (índice original da correta, por questão 1→20):
```
[2,3,0,2,1,1,2,0,2,1,1,1,0,1,3,0,3,3,3,0]
```

---

## 8. Gabarito resumido

| Q | Matéria | Tema | Índice correto | Letra (ordem original) |
|--:|---|---|:--:|:--:|
| 1 | Ética | Infrações e Sanções Disciplinares | 2 | C |
| 2 | Ética | Direitos e Prerrogativas dos Advogados | 3 | D |
| 3 | Constitucional | Remédios Constitucionais | 0 | A |
| 4 | Constitucional | Controle de Constitucionalidade | 2 | C |
| 5 | Administrativo | LINDB – Segurança Jurídica | 1 | B |
| 6 | Administrativo | Intervenção do Estado na Propriedade | 1 | B |
| 7 | Tributário | Imunidades Tributárias | 2 | C |
| 8 | Tributário | Princípios Tributários | 0 | A |
| 9 | Civil | Defeitos do Negócio Jurídico | 2 | C |
| 10 | Civil | Bem de Família – Impenhorabilidade | 1 | B |
| 11 | Processo Civil | Tutela Provisória de Urgência | 1 | B |
| 12 | Processo Civil | Recursos – Agravo de Instrumento | 1 | B |
| 13 | Penal | Erro de Tipo Invencível | 0 | A |
| 14 | Penal | Coação Moral Irresistível | 1 | B |
| 15 | Processo Penal | Lei Maria da Penha – Competência | 3 | D |
| 16 | Processo Penal | Recursos – Execução Penal | 0 | A |
| 17 | Trabalho | Trabalho do Menor | 3 | D |
| 18 | Trabalho | Proteção do Trabalho da Mulher – Insalubridade | 3 | D |
| 19 | Processo do Trabalho | Honorários Periciais – Sucumbência | 3 | D |
| 20 | Processo do Trabalho | Recursos – Dissídio Coletivo | 0 | A |

Distribuição da correta: **A=5, B=6, C=4, D=5** (posições são embaralhadas na tela).

---

## 9. Banco completo de questões (enunciado, alternativas, gabarito, explicações)

> A ordem das alternativas (A→D) abaixo é a **ordem original** (a que o índice de `answers` usa).
> Na tela o lead vê essas alternativas embaralhadas.

### Q1 — Ética · Infrações e Sanções Disciplinares
Antônio, advogado experiente, usou IA generativa para elaborar peças processuais. Após revisão com estagiário, um magistrado o notifica por recurso manifestamente incabível com doutrina e jurisprudência deturpadas. Segundo o Estatuto da OAB:
- A) Por não ter agido dolosamente, Antônio não poderá sofrer qualquer sanção disciplinar.
- B) Após devido processo disciplinar, poderá ser apenado com suspensão de 30 dias a 12 meses.
- **C) ✅ Poderá ser aplicada pena de censura, convertível em advertência em ofício reservado, se presente circunstância atenuante.**
- D) Em caso de reincidência, poderá ser apenado com exclusão e cancelamento de inscrição na OAB.

Explicações: **A)** O advogado pode ser responsabilizado disciplinarmente por condutas culposas. Art. 34, XIV da Lei 8.906/94 prevê sanções mesmo sem dolo. · **B)** A suspensão exige infração de maior gravidade. A sanção cabível é a censura, conforme a Lei 8.906/94. · **C)** Art. 34, XIV do Estatuto: deturpar conteúdo de dispositivos legais, doutrinários ou jurisprudenciais — com dolo ou culpa — configura infração disciplinar sujeita à censura. · **D)** A exclusão é penalidade excepcional, aplicada apenas em situações de extrema gravidade e reincidência qualificada (art. 38, Lei 8.906/94).

### Q2 — Ética · Direitos e Prerrogativas dos Advogados
Aurélio, advogado inscrito na OAB, dirige-se à delegacia para assistir seu amigo Adalberto, preso em flagrante por homicídio. O Delegado nega o acesso alegando gravidade do crime e falta de procuração. Com base no Estatuto da OAB:
- A) A negativa foi legítima, pois em crimes graves pode-se limitar a comunicação com o advogado.
- B) A comunicação só poderia ocorrer mediante apresentação de procuração assinada.
- C) A atuação de Aurélio é ilegal, pois advogar para amigos configura conflito ético-profissional.
- **D) ✅ A negativa foi ilegal: Aurélio tem direito de se comunicar pessoal e reservadamente com Adalberto, mesmo sem procuração.**

Explicações: **A)** Art. 7º, III da Lei 8.906/94 garante ao advogado comunicação com o preso independentemente da gravidade do delito. · **B)** Art. 7º, III do Estatuto não exige procuração para comunicação com o preso. · **C)** Não há impedimento legal para advogar em favor de amigos. O art. 7º, III assegura o direito independentemente do vínculo. · **D)** Art. 7º, III da Lei 8.906/94 assegura comunicação pessoal e reservada com o preso em qualquer fase, mesmo sem procuração.

### Q3 — Constitucional · Remédios Constitucionais
João possui informações inexatas em banco de dados de órgão público. Após pedido de retificação indeferido administrativamente, contratou advogado(a). A medida judicial correta é:
- **A) ✅ Habeas Data, pois o Mandado de Segurança é remédio residual e não se presta a retificar informações pessoais.**
- B) Ação Ordinária, pois a comprovação do direito líquido e certo pressupõe dilação probatória.
- C) Mandado de Segurança, observando o prazo decadencial de 120 dias.
- D) A situação é exceção à esfera judicial, devendo a solução se esgotar na via administrativa.

Explicações: **A)** Habeas Data é o remédio constitucional para conhecer ou retificar informações em registros ou bancos de dados de entidades governamentais (CF, art. 5º, LXXII). · **B)** A ação ordinária não exige direito líquido e certo — este é requisito do Mandado de Segurança. · **C)** O Mandado de Segurança visa invalidar ato de autoridade coatora que viola direito líquido e certo — não retifica dados pessoais. · **D)** Não é obrigatório esgotar a via administrativa. Existe a ação judicial (Habeas Data), vedando violação à inafastabilidade da jurisdição.

### Q4 — Constitucional · Controle de Constitucionalidade
O Presidente da República emitiu decreto autônomo disciplinando a Administração Federal. O Partido Beta deseja questioná-lo pelo controle concentrado. Os advogados informaram corretamente que o decreto autônomo:
- A) Deve ser atacado por ação popular, por ser ato do Poder Executivo.
- B) Não se submete ao controle concentrado, pois não possui natureza normativa.
- **C) ✅ Pode ser objeto de ADI, por ser diploma normativo com fundamento de validade direto na Constituição.**
- D) Só pode ser impugnado por ADPF, instrumento adequado para atos administrativos do Executivo.

Explicações: **A)** A ação popular defende patrimônio público e moralidade — não é instrumento de controle de constitucionalidade. · **B)** O decreto autônomo (art. 84, VI, CF) tem natureza normativa primária, extraindo fundamento direto da Constituição. · **C)** O decreto autônomo é ato normativo primário com fundamento direto na CF. Pode ser objeto de ADI no STF (art. 102, I, "a", CF). · **D)** A ADPF é subsidiária — só cabe quando não há outro meio eficaz. Como cabe ADI, não se usa a ADPF.

### Q5 — Administrativo · LINDB – Segurança Jurídica
José, servidor de controle interno, depara-se com ato administrativo viciado que ainda produz efeitos. À luz da LINDB (Lei 13.655/2018), o esclarecimento correto da assessoria jurídica é:
- A) A existência de vício exige invalidação com efeitos retroativos, mesmo impondo ônus anormais ou excessivos.
- **B) ✅ Constatado vício insanável, a decisão de invalidação deve indicar expressamente suas consequências jurídicas e administrativas.**
- C) Qualquer vício deve ensejar necessariamente invalidação, independentemente de alternativas ao interesse público.
- D) Na esfera controladora, a anulação é imperiosa de ofício, prescindindo de ampla defesa e contraditório.

Explicações: **A)** Art. 20 da LINDB exige consideração das consequências práticas, vedando invalidação automática quando gerar ônus anormais ou excessivos. · **B)** Art. 21 da LINDB: a decisão que invalide ato com vício insanável deve indicar expressamente suas consequências jurídicas e administrativas. · **C)** A Lei 13.655/2018 afastou a invalidação automática, impondo à Administração a ponderação de alternativas menos gravosas. · **D)** A invalidação exige motivação adequada e observância do contraditório e ampla defesa (CF/88, art. 5º, LV; LINDB, art. 21).

### Q6 — Administrativo · Intervenção do Estado na Propriedade
Município Alfa editou lei restringindo número de pavimentos em imóveis à beira-mar, atingindo proprietários indeterminados. Gustavo, afetado, consulta advogado(a) sobre a modalidade de intervenção estatal:
- A) Servidão administrativa, embasada no poder hierárquico e supremacia do interesse público.
- **B) ✅ Limitação administrativa, embasada no poder de polícia, visando condicionar a propriedade à função social.**
- C) Requisição administrativa, embasada no poder disciplinar, para compatibilizar propriedade e função social.
- D) Desapropriação indireta, embasada no poder regulamentar, por reduzir parcialmente o direito de propriedade.

Explicações: **A)** Trata-se de limitação administrativa decorrente do poder de polícia — não de servidão nem de poder hierárquico. · **B)** Ato genérico imposto a proprietários indeterminados para cumprir função social, via poder de polícia. Não gera indenização. · **C)** Trata-se de limitação administrativa via poder de polícia. A requisição só se aplica em casos de iminente perigo público. · **D)** Trata-se de limitação administrativa. A desapropriação indireta ocorre quando o Estado toma o bem sem o procedimento expropriatório regular.

### Q7 — Tributário · Imunidades Tributárias
Entidade religiosa ABC requereu imunidade de IPTU do imóvel de culto e do imóvel vizinho usado como moradia de ministros religiosos. O Município reconheceu apenas o imóvel de culto, alegando matrículas distintas. Sua orientação correta é:
- A) A entidade deve escolher sobre qual imóvel recai a imunidade, pois possuem matrículas distintas.
- B) Apenas o imóvel de culto tem direito à imunidade, dada a duplicidade de matrículas.
- **C) ✅ A imunidade religiosa beneficia o imóvel de culto e todos os imóveis afetados à finalidade essencial, mesmo com matrículas distintas.**
- D) Para ambos gozarem da imunidade, seria necessário unificar as matrículas.

Explicações: **A)** A CF não limita a imunidade religiosa a um único imóvel. Art. 150, VI, "b" garante imunidade sem restrição de quantidade. · **B)** Não existe exigência constitucional que limite a imunidade a um imóvel — a proteção se estende a todos os bens usados na finalidade religiosa. · **C)** A imunidade religiosa (art. 150, VI, "b" CF) estende-se a imóveis afetados à finalidade essencial. STF (AgR ARE 895972/RJ) confirmou que residências de ministros são protegidas. · **D)** A unificação de matrículas não é requisito constitucional. O STF não exige essa condição.

### Q8 — Tributário · Princípios Tributários
Lei municipal de 20/02/2024 instituiu contribuição vinculada ao custeio, expansão e melhoria da iluminação pública e de sistemas de monitoramento para segurança de logradouros. Sobre essa lei:
- **A) ✅ A contribuição poderia ser instituída e vinculada a todas essas finalidades, por expressa previsão constitucional.**
- B) É inconstitucional custear iluminação pública por espécie tributária distinta de impostos.
- C) Os sistemas de monitoramento só poderiam ser custeados com taxas, não com contribuição.
- D) Os sistemas de monitoramento só poderiam ser custeados com impostos, não com contribuição.

Explicações: **A)** Art. 149-A da CF autoriza Municípios e DF a instituir contribuição para custeio, expansão e melhoria da iluminação pública e de sistemas de monitoramento para segurança de logradouros. · **B)** O tributo aplicável é a contribuição do art. 149-A da CF — não impostos. · **C)** O custeio de iluminação pública não pode ser cobrado por taxa (Súmula 670 STF), mas por contribuição (art. 149-A CF). · **D)** A implantação de sistemas de monitoramento pode ser custeada por contribuição, conforme art. 149-A da CF.

### Q9 — Civil · Defeitos do Negócio Jurídico
Joaquim vê sua filha em grave risco de vida por reação alérgica. O médico exige pagamento antecipado exorbitante como condição para atender. Joaquim paga em desespero. O defeito do negócio jurídico é:
- A) Dolo, com prazo decadencial de seis meses.
- B) Lesão, com prazo decadencial de dois anos.
- **C) ✅ Estado de perigo, com prazo decadencial de quatro anos.**
- D) Estado de necessidade, sem prazo decadencial.

Explicações: **A)** O dolo ocorre quando uma parte engana a outra para celebrar o negócio — não é o caso aqui. · **B)** Na lesão (art. 157 CC), o prejuízo é patrimonial por premente necessidade ou inexperiência, sem risco de vida da vítima. · **C)** Estado de perigo (art. 156 CC): Joaquim assume obrigação excessivamente onerosa premido pela necessidade de salvar a filha de grave dano, com o aproveitamento do médico. Prazo: 4 anos. · **D)** Estado de necessidade é excludente de ilicitude no Direito Penal — não é defeito de negócio jurídico no Código Civil.

### Q10 — Civil · Bem de Família – Impenhorabilidade
Joana trabalhou 15 anos como doméstica de Alzira, nunca recebendo férias, 13º nem INSS. Após sentença transitada em julgado, requer penhora do único imóvel de Alzira (60m², onde ela reside). A afirmativa correta é:
- A) O imóvel é impenhorável, mas os móveis que o guarnecem são penhoráveis, independentemente do valor.
- **B) ✅ O imóvel é impenhorável, bem como são impenhoráveis os móveis que guarnecem a casa, exceto obras de arte e adornos suntuosos.**
- C) O imóvel é, em qualquer hipótese, penhorável na execução promovida por Joana.
- D) O imóvel é penhorável desde que comprovada a má-fé da devedora.

Explicações: **A)** São impenhoráveis os móveis que guarnecem a casa — exceto veículos, obras de arte e adornos suntuosos (art. 2º, Lei 8.009/90). · **B)** O imóvel residencial é impenhorável (art. 1º, Lei 8.009/90), assim como os móveis — exceto veículos, obras de arte e adornos suntuosos (art. 2º). · **C)** O imóvel residencial próprio é impenhorável conforme art. 1º da Lei 8.009/90. · **D)** A impenhorabilidade não depende de análise de má-fé — é proteção legal do bem de família.

### Q11 — Processo Civil · Tutela Provisória de Urgência
A mãe de Bruno busca tutela de urgência após negativa imotivada do plano de saúde para cirurgia que deve ocorrer em 48h ou ele morre. Com laudo e negativa comprovados, sua orientação correta é:
- A) Para a tutela de urgência, basta a probabilidade do direito, dispensando o perigo de dano.
- **B) ✅ Para a tutela de urgência, devem existir elementos que evidenciem a probabilidade do direito e o perigo de dano ou risco ao resultado útil do processo.**
- C) Se concedida, o juiz não precisa motivar o convencimento em razão da urgência.
- D) Se não concedida, não é possível interpor recurso, pois a demanda se estabilizará.

Explicações: **A)** Art. 300, caput, CPC exige tanto a probabilidade do direito quanto o perigo de dano ou risco ao resultado útil do processo. · **B)** Art. 300, caput, CPC: a tutela de urgência será concedida quando houver elementos que evidenciem a probabilidade do direito e o perigo de dano ou o risco ao resultado útil do processo. · **C)** O juiz deve motivar suas decisões, inclusive na concessão de tutela de urgência — exigência constitucional. · **D)** Das decisões sobre tutela provisória cabe agravo de instrumento (art. 1.015, I, CPC).

### Q12 — Processo Civil · Recursos – Agravo de Instrumento
O magistrado concedeu tutela provisória de urgência determinando bloqueio de bens de Ana, em ação de indenização por danos morais e materiais ajuizada por José. Qual recurso Ana deve interpor?
- A) Não cabe recurso imediato contra decisão que defere tutela provisória de urgência.
- **B) ✅ Agravo de instrumento, pois a decisão é interlocutória impugnável por tal recurso.**
- C) Apelação, pois a decisão tem natureza de sentença.
- D) Apelação, pois a decisão interlocutória é impugnável por tal recurso.

Explicações: **A)** O sistema processual oferece o agravo de instrumento para controlar a legalidade das decisões de urgência (art. 1.015, I, CPC). · **B)** A decisão que concede ou nega tutela de urgência é decisão interlocutória. Cabe agravo de instrumento (art. 1.015, I, CPC). · **C)** A decisão não encerra o processo (não é sentença, art. 203, §2º, CPC). O processo continuará para discutir o mérito. · **D)** Embora seja interlocutória, o recurso cabível é o agravo de instrumento — não apelação.

### Q13 — Penal · Erro de Tipo Invencível
Pedro, coveiro, foi enganado por Maria e José com documentos falsos indicando o falecimento de Maria. Sem desconfiar, realizou a cremação — e Maria estava viva. Sobre a conduta de Pedro:
- **A) ✅ Ele não praticou crime, pois agiu com base em erro de tipo invencível.**
- B) Ele praticou apenas o delito de vilipêndio culposo das cinzas do cadáver.
- C) Ele praticou homicídio culposo por descumprir dever de cuidado objetivo.
- D) Ele praticou homicídio qualificado pela impossibilidade de reação da vítima.

Explicações: **A)** Pedro agiu em erro de tipo invencível — era impossível saber que Maria estava viva. Art. 20, §2º, CP: responde pelo crime o terceiro que determina o erro. · **B)** O crime de vilipêndio de cadáver (art. 212 CP) não admite forma culposa por ausência de previsão legal. · **C)** Não houve descumprimento de dever de cuidado por Pedro. A causa determinante foi a ação de Maria e José. · **D)** Não houve dolo de matar. Pedro não tinha elementos para inferir tratar-se de morte simulada.

### Q14 — Penal · Coação Moral Irresistível – Culpabilidade
Bernardo, gerente bancário, teve o filho sequestrado. Os sequestradores exigiram R$1 milhão. Ele subtraiu o valor do banco onde trabalhava e foi flagrado ao chegar em casa. Sobre sua situação:
- A) Agiu amparado por exercício regular de direito.
- **B) ✅ Está isento de pena por inexigibilidade de conduta diversa (coação moral irresistível).**
- C) Agiu em legítima defesa de terceiro, excluída a antijuridicidade.
- D) Deve responder por furto consumado, pois chegou a ter posse pacífica do dinheiro.

Explicações: **A)** Exercício regular de direito aplica-se a situações como esportes violentos — não à conduta motivada por coação. · **B)** Art. 22 do CP: se o fato é cometido sob coação irresistível, só é punível o autor da coação. Bernardo agiu sob coação moral irresistível, afastando sua culpabilidade. · **C)** Não configura legítima defesa de terceiros. A conduta não envolveu defesa direta contra agressão atual ao patrimônio. · **D)** Bernardo não agiu com dolo de furto. A coação moral irresistível afasta sua culpabilidade.

### Q15 — Processo Penal · Lei Maria da Penha – Competência
Cauã e Mayara são indígenas integrados em relação íntima de afeto. Motivado por ciúmes, Cauã agrediu Mayara causando lesão corporal leve. Sobre a orientação do(a) advogado(a) de defesa de Mayara:
- A) Ação penal pública incondicionada, competência da Vara Criminal Estadual (disputa sobre direito indígena).
- B) Ação penal condicionada à representação, Juizado Especial Criminal, Justiça Federal.
- C) Ação penal pública incondicionada, competência da Justiça Federal por envolver indígenas.
- **D) ✅ Ação penal pública incondicionada, competência do Juizado de Violência Doméstica e Familiar contra a Mulher.**

Explicações: **A)** Não é disputa sobre direito indígena — é violência doméstica. São indígenas integrados, afastando a competência federal. · **B)** A ação é pública incondicionada (Súmula 542 STJ). Não cabe Juizado Especial Criminal em violência doméstica. · **C)** Por serem indígenas integrados, não há interesse específico de comunidade indígena — afasta-se a competência federal. · **D)** Ação pública incondicionada. Competência do Juizado de Violência Doméstica e Familiar (art. 14, Lei 11.340/06), pela relação íntima de afeto entre autor e vítima.

### Q16 — Processo Penal · Recursos – Execução Penal
Arthur cumpre pena por furto qualificado e ficou tetraplégico durante a execução. O Presidente concedeu indulto natalino abrangendo tetraplegia superveniente em crimes sem violência. O juízo indeferiu o pedido de extinção da punibilidade sem fundamentação. O recurso correto é:
- **A) ✅ Agravo em execução, prazo de cinco dias. Sem prejuízo, pode ser impetrado habeas corpus.**
- B) Recurso de apelação, prazo de cinco dias. Sem prejuízo, pode ser impetrado habeas corpus.
- C) Agravo em execução, prazo de cinco dias. Habeas corpus só cabe se não interposto recurso.
- D) RESE, prazo de cinco dias. Alternativamente, habeas corpus (unirecorribilidade).

Explicações: **A)** Agravo em execução (art. 197, LEP) é o recurso típico contra decisões na execução penal, prazo de 5 dias (Súmula 700 STF). Habeas corpus também é cabível simultaneamente (art. 648 CPP). · **B)** Na fase de execução penal, não cabe apelação. O recurso é o agravo em execução (art. 197, LEP). · **C)** É possível interpor simultaneamente agravo em execução e habeas corpus — não são excludentes. · **D)** RESE não cabe na fase de execução penal. O recurso adequado é o agravo em execução (art. 197, LEP).

### Q17 — Trabalho · Trabalho do Menor
ONG busca orientação sobre trabalho de menores como empregados. A opção correta é:
- A) É permitido ao menor de 18 e maior de 16 anos trabalhar em bilheterias de cinemas das 22h às 24h.
- B) É permitido ao maior de 16 e menor de 18 anos trabalhar como frentista em posto de gasolina.
- C) É permitido ao menor trabalhar em quiosques de orla que vendem comidas e bebidas alcoólicas.
- **D) ✅ É permitido ao menor, a partir de 14 anos, trabalhar na condição de aprendiz.**

Explicações: **A)** O trabalho noturno (22h às 5h) é terminantemente vedado a menores de 18 anos (art. 404 CLT; art. 7º, XXXIII CF). · **B)** Trabalho como frentista expõe a agentes inflamáveis e riscos de explosão — atividade perigosa vedada a menores de 18 anos (Decreto 6.481/2008, Lista TIP). · **C)** Art. 405, §3º, "a" CLT proíbe o trabalho do menor de 18 anos em locais destinados à venda de bebidas alcoólicas. · **D)** A CF permite trabalho a partir de 14 anos na condição de aprendiz — exceção à idade mínima geral de 16 anos.

### Q18 — Trabalho · Proteção do Trabalho da Mulher – Insalubridade
Jéssica trabalha em hospital no setor de infectocontagiosas, recebendo adicional de insalubridade grau máximo. Grávida, foi transferida para o setor de convênios (ambiente salubre). Sobre o adicional de insalubridade:
- A) Jéssica faz jus ao adicional durante a gestação, que cessará após o nascimento — não se estende à lactação.
- B) O adicional deve cessar porque a transferência foi necessidade para a qual a empresa não colaborou.
- C) Jéssica terá direito à metade do adicional que recebia, enquanto estiver em local sem agente agressor.
- **D) ✅ A empresa deve pagar o adicional à gestante no setor de convênios, compensando esse valor na cota-parte do INSS.**

Explicações: **A)** O direito se estende também ao período de lactação (amamentação), não apenas à gestação (art. 394-A, III e §2º, CLT). · **B)** O direito ao adicional não cessa com a transferência — que é obrigação legal de proteção. Redução salarial configuraria alteração contratual lesiva. · **C)** Não há previsão legal para pagamento de metade do adicional. A integralidade deve ser mantida. · **D)** Art. 394-A, §2º, CLT: a empresa paga o adicional de insalubridade à gestante/lactante e compensa no recolhimento das contribuições previdenciárias.

### Q19 — Processo do Trabalho · Honorários Periciais – Sucumbência
Em reclamação trabalhista por doença profissional, ambas as partes quesitaram e indicaram assistentes técnicos. O laudo confirmou a doença ocupacional e o juiz julgou procedente. Sobre honorários do perito e assistentes:
- A) A empresa arcará com honorários do perito e do assistente técnico do autor.
- B) A Justiça arcará com honorários do perito; cada parte paga seu assistente técnico.
- C) Cada parte arca com metade dos honorários do perito e integralmente com os do seu assistente.
- **D) ✅ O réu pagará os honorários do perito (sucumbente na perícia) e arcará com os do assistente técnico por ele indicado.**

Explicações: **A)** Os honorários do perito são pagos pela parte sucumbente na pretensão objeto da perícia (art. 790-B CLT) — não necessariamente pela empresa. · **B)** Os honorários do perito são pagos pela parte sucumbente na perícia (art. 790-B CLT), não pela Justiça. · **C)** Não há previsão de rateio dos honorários periciais. A responsabilidade é da parte sucumbente na pretensão. · **D)** Art. 790-B CLT: honorários periciais pagos pela parte sucumbente (réu). Súmula 341 TST: honorários do assistente técnico pagos pela parte que o indicou, mesmo vencedora.

### Q20 — Processo do Trabalho · Recursos – Dissídio Coletivo
Sindicato ajuizou dissídio coletivo de natureza econômica perante o TRT competente. O processo foi extinto sem resolução do mérito. Como advogado(a) do sindicato, o recurso cabível e o prazo são:
- **A) ✅ Recurso ordinário, no prazo de 8 dias.**
- B) Recurso de revista, no prazo de 8 dias.
- C) Agravo de petição, no prazo de 15 dias.
- D) Recurso extraordinário, no prazo de 15 dias.

Explicações: **A)** Art. 895, II, CLT prevê recurso ordinário (prazo de 8 dias) contra decisões definitivas ou terminativas dos TRTs em processos de competência originária, como o dissídio coletivo. · **B)** O recurso de revista cabe contra decisões dos TRTs em sede de recurso ordinário (fase recursal), não contra decisões originárias. · **C)** O agravo de petição (art. 897, "a", CLT) é específico da fase de execução. Além disso, o prazo é de 8 dias, não 15. · **D)** O recurso extraordinário é direcionado ao STF para questões constitucionais após esgotadas as instâncias trabalhistas — inaplicável aqui.

---

## 10. Exemplos de payload para as plataformas (a partir da linha do banco)

> Estes são exemplos do que você ENVIA para as APIs de destino. Requerem os tokens de cada
> plataforma (não incluídos aqui). Os valores vêm da linha do Supabase.

### ManyChat (taguear o contato pelo `manychat_id`)
```
POST https://api.manychat.com/fb/subscriber/addTagByName
Authorization: Bearer <MANYCHAT_API_TOKEN>
Content-Type: application/json

{ "subscriber_id": "<manychat_id>", "tag_name": "quiz_oab_<faixa_nota>" }
```
E para gravar a nota num custom field:
```
POST https://api.manychat.com/fb/subscriber/setCustomFieldByName
{ "subscriber_id": "<manychat_id>", "field_name": "quiz_percent", "field_value": <percent> }
```

### ActiveCampaign (criar/atualizar contato + tag)
```
POST https://<sua-conta>.api-us1.com/api/3/contact/sync
Api-Token: <AC_API_TOKEN>
Content-Type: application/json

{ "contact": { "email": "<email>", "phone": "<phone>", "firstName": "<primeiro nome de nome>" } }
```
Depois, adicionar a tag ao contato retornado:
```
POST https://<sua-conta>.api-us1.com/api/3/contactTags
{ "contactTag": { "contact": "<contact_id>", "tag": "<id da tag quiz_oab_<faixa>>" } }
```

---

## 11. Lembretes importantes
- `answers` usa **índices originais** (§7) — o embaralhamento é só visual.
- Merge fields `{{...}}` não renderizados são gravados como `null` (não viram lixo).
- `phone` é o **WhatsApp ID** já em `+55…`.
- O ManyChat só substitui `{{...}}` quando **envia de verdade** — testar pelo navegador exige valores reais na URL.
- A `service_role key` é secreta: use só no servidor/n8n.
