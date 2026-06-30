/* ════════════════════════════════════════════════════════════
   IDENTIDADE DO LEAD
   Lê os dados vindos do link do ManyChat (?mc=&phone=&nome=).
   Se nada vier, o quiz pede o WhatsApp antes de começar (fallback).
   ════════════════════════════════════════════════════════════ */
function normalizePhone(v){
  if(!v) return null;
  const d = String(v).replace(/\D/g,'');
  return d.length ? d : null;
}

// Máscara ao digitar: (85) 98965-9744 (celular 11 díg.) ou (85) 3333-4444 (fixo 10 díg.)
function fmtPhone(el){
  const d = el.value.replace(/\D/g,'').slice(0,11);
  let out = '';
  if(d.length > 0) out = '(' + d.slice(0,2);
  if(d.length >= 3){
    out += ') ';
    if(d.length <= 10){ out += d.slice(2,6); if(d.length > 6) out += '-' + d.slice(6,10); }
    else { out += d.slice(2,7); if(d.length > 7) out += '-' + d.slice(7,11); }
  }
  el.value = out;
}

const __params = new URLSearchParams(window.location.search);
const identity = {
  manychat_id: __params.get('mc') || __params.get('subscriber_id') || __params.get('contact_id') || null,
  phone: normalizePhone(__params.get('phone') || __params.get('whatsapp') || ''),
  email: (__params.get('email') || '').trim().toLowerCase() || null,
  nome: __params.get('nome') || __params.get('name') || __params.get('first_name') || null,
  source: null,
  raw_query: Object.fromEntries(__params.entries())
};
identity.source = identity.manychat_id ? 'manychat' : (identity.phone ? 'direct' : 'unknown');

let submitted = false;
function submitQuiz(){
  if(submitted) return;
  submitted = true;
  const payload = {
    manychat_id: identity.manychat_id,
    phone: identity.phone,
    email: identity.email,
    nome: identity.nome,
    source: identity.source,
    raw_query: identity.raw_query,
    answers: ans,                 // [idx|null] x Q.length — servidor recalcula nota/tags
    user_agent: navigator.userAgent
  };
  fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(()=>{ /* falha de rede não trava a UX; n8n/retry tratam depois */ });
}

/* ── Ícones (Better Icons · lucide + mdi) — substituem todos os emojis ── */
const ICONS={
  'circle-check':'<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12l2 2l4-4"/></g>',
  'circle-x':'<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9l-6 6m0-6l6 6"/></g>',
  'check':'<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/>',
  'x':'<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M18 6L6 18M6 6l12 12"/>',
  'alert-triangle':'<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4m0 4h.01"/>',
  'book':'<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 7v14m-9-3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4a4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3a3 3 0 0 0-3-3z"/>',
  'octagon-alert':'<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 16h.01M12 8v4m3.312-10a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"/>',
  'circle-alert':'<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></g>',
  'party':'<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3L2 22l10.7-3.79M4 3h.01M22 8h.01M15 2h.01M22 20h.01M22 2l-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10m8 3l-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17M11 2l.33.82c.34.86-.2 1.82-1.11 1.98c-.7.1-1.22.72-1.22 1.43V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5s-3.07-.07-5-2s-2.83-4.17-2-5s3.07.07 5 2"/></g>',
  'cap':'<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></g>',
  'file-down':'<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5m-8 10v-6m-3 3l3 3l3-3"/></g>',
  'rotate':'<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9a9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></g>',
  'scale':'<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18m7-13l3 8a5 5 0 0 1-6 0zV7"/><path d="M3 7h1a17 17 0 0 0 8-2a17 17 0 0 0 8 2h1M5 8l3 8a5 5 0 0 1-6 0zV7m2 14h10"/></g>',
  'dot':'<path fill="currentColor" d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"/>',
  'clock':'<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></g>',
  'play':'<path fill="currentColor" d="M6 4.5v15a1 1 0 0 0 1.5.87l13-7.5a1 1 0 0 0 0-1.74l-13-7.5A1 1 0 0 0 6 4.5"/>',
  'list':'<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></g>'
};
function ic(name,color){
  const s=color?(' style="color:'+color+'"'):'';
  return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"'+s+'>'+(ICONS[name]||'')+'</svg>';
}

const L=['A','B','C','D'];
const INC={
  'Etica':{top:['Direitos e Prerrogativas dos Advogados','Incompatibilidades e Impedimentos'],second:['Infrações e Sanções Disciplinares','Sociedade de Advogados'],presNum:5,presence:'5/5',note:'Ética tem presença garantida em TODA prova (5/5). Direitos e Prerrogativas + Incompatibilidades somam ~14 questões no período.'},
  'Constitucional':{top:['Controle de Constitucionalidade'],second:['Processo Legislativo','Repartição de Competências'],presNum:4,presence:'4/5',note:'Controle de Constitucionalidade caiu em 4 das 5 provas — aposta mais segura da disciplina.'},
  'Civil':{top:[],second:['Contratos','Direitos Reais','Família','Responsabilidade Civil','LGPD'],presNum:3,presence:'3/5',note:'Disciplina pulverizada. Seis temas empatam em 3/5. LGPD virou presença recorrente.'},
  'Processo Civil':{top:['Execução / Cumprimento de Sentença','Recursos'],second:['Tutela Provisória'],presNum:5,presence:'5/5',note:'Execução e Recursos caíram em 100% das provas — juntos ~15 questões no período. Maior volume bruto.'},
  'Penal':{top:['Tipicidade / Fato Típico','Eficácia da Lei Penal'],second:['Iter Criminis','Concurso de Pessoas'],presNum:4,presence:'4/5',note:'Parte Geral domina. Tipicidade e Eficácia da Lei Penal lideram com 4/5 cada.'},
  'Processo Penal':{top:['Recursos','Prisões / Medidas Cautelares'],second:['Ação Penal','Provas / Nulidade'],presNum:5,presence:'5/5',note:'Recursos caiu em 100% das provas. Prisões/Medidas Cautelares em 4/5. Dupla mais segura.'},
  'Administrativo':{top:['Improbidade Administrativa','Intervenção do Estado na Propriedade'],second:['Contratos Administrativos','LINDB'],presNum:4,presence:'4/5',note:'Improbidade e Intervenção do Estado empatam em 4/5 — apostas certeiras da disciplina.'},
  'Trabalho':{top:[],second:['Jornada de Trabalho','Extinção do Contrato de Trabalho'],presNum:3,presence:'3/5',note:'Disciplina pulverizada. Jornada lidera (3/5). Extinção do Contrato vem em dobro quando cai.'},
  'Processo do Trabalho':{top:['Recursos (ordinário, adesivo)','Provas / Perícia / Ônus da Prova'],second:['Execução','Procedimentos'],presNum:4,presence:'4/5',note:'Recursos e Provas/Perícia caíram em 4/5 — a base do Processo do Trabalho na prova.'},
  'Tributario':{top:['Princípios Tributários (Anterioridade, Legalidade)'],second:['Execução Fiscal','Imunidades Tributárias'],presNum:4,presence:'4/5',note:'Princípios Tributários é o mais cobrado — 4/5 com força crescente nas provas 45 e 46.'}
};
function mkey(m){return m.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function getInc(mat){
  // Match exato pela chave normalizada — não usar prefixo, senão "Processo Penal" e
  // "Processo do Trabalho" casariam com "Processo Civil" (todos começam com "Proce").
  const k=mkey(mat).toLowerCase();
  for(const[key,val]of Object.entries(INC)){
    if(k===mkey(key).toLowerCase())return val;
  }return null;
}
function lvl(mat){const d=getInc(mat);if(!d)return'cold';if(d.presNum>=5)return'hot';if(d.presNum>=4)return'warm';return'cold';}
function lvlColor(lv){return lv==='hot'?'#dc2626':lv==='warm'?'#d97706':'#7c3aed';}
function scoreColor(p){return p>=75?'#16a34a':p>=50?'#d97706':'#dc2626';}

const Q=[
  {m:'Ética',tema:'Infrações e Sanções Disciplinares',q:'Antônio, advogado experiente, usou IA generativa para elaborar peças processuais. Após revisão com estagiário, um magistrado o notifica por recurso manifestamente incabível com doutrina e jurisprudência deturpadas. Segundo o Estatuto da OAB:',o:['Por não ter agido dolosamente, Antônio não poderá sofrer qualquer sanção disciplinar.','Após devido processo disciplinar, poderá ser apenado com suspensão de 30 dias a 12 meses.','Poderá ser aplicada pena de censura, convertível em advertência em ofício reservado, se presente circunstância atenuante.','Em caso de reincidência, poderá ser apenado com exclusão e cancelamento de inscrição na OAB.'],c:2,e:['O advogado pode ser responsabilizado disciplinarmente por condutas culposas. Art. 34, XIV da Lei 8.906/94 prevê sanções mesmo sem dolo.','A suspensão exige infração de maior gravidade. A sanção cabível é a censura, conforme a Lei 8.906/94.','Art. 34, XIV do Estatuto: deturpar conteúdo de dispositivos legais, doutrinários ou jurisprudenciais — com dolo ou culpa — configura infração disciplinar sujeita à censura.','A exclusão é penalidade excepcional, aplicada apenas em situações de extrema gravidade e reincidência qualificada (art. 38, Lei 8.906/94).']},
  {m:'Ética',tema:'Direitos e Prerrogativas dos Advogados',q:'Aurélio, advogado inscrito na OAB, dirige-se à delegacia para assistir seu amigo Adalberto, preso em flagrante por homicídio. O Delegado nega o acesso alegando gravidade do crime e falta de procuração. Com base no Estatuto da OAB:',o:['A negativa foi legítima, pois em crimes graves pode-se limitar a comunicação com o advogado.','A comunicação só poderia ocorrer mediante apresentação de procuração assinada.','A atuação de Aurélio é ilegal, pois advogar para amigos configura conflito ético-profissional.','A negativa foi ilegal: Aurélio tem direito de se comunicar pessoal e reservadamente com Adalberto, mesmo sem procuração.'],c:3,e:['Art. 7º, III da Lei 8.906/94 garante ao advogado comunicação com o preso independentemente da gravidade do delito.','Art. 7º, III do Estatuto não exige procuração para comunicação com o preso.','Não há impedimento legal para advogar em favor de amigos. O art. 7º, III assegura o direito independentemente do vínculo.','Art. 7º, III da Lei 8.906/94 assegura comunicação pessoal e reservada com o preso em qualquer fase, mesmo sem procuração.']},
  {m:'Constitucional',tema:'Remédios Constitucionais',q:'João possui informações inexatas em banco de dados de órgão público. Após pedido de retificação indeferido administrativamente, contratou advogado(a). A medida judicial correta é:',o:['Habeas Data, pois o Mandado de Segurança é remédio residual e não se presta a retificar informações pessoais.','Ação Ordinária, pois a comprovação do direito líquido e certo pressupõe dilação probatória.','Mandado de Segurança, observando o prazo decadencial de 120 dias.','A situação é exceção à esfera judicial, devendo a solução se esgotar na via administrativa.'],c:0,e:['Habeas Data é o remédio constitucional para conhecer ou retificar informações em registros ou bancos de dados de entidades governamentais (CF, art. 5º, LXXII).','A ação ordinária não exige direito líquido e certo — este é requisito do Mandado de Segurança.','O Mandado de Segurança visa invalidar ato de autoridade coatora que viola direito líquido e certo — não retifica dados pessoais.','Não é obrigatório esgotar a via administrativa. Existe a ação judicial (Habeas Data), vedando violação à inafastabilidade da jurisdição.']},
  {m:'Constitucional',tema:'Controle de Constitucionalidade',q:'O Presidente da República emitiu decreto autônomo disciplinando a Administração Federal. O Partido Beta deseja questioná-lo pelo controle concentrado. Os advogados informaram corretamente que o decreto autônomo:',o:['Deve ser atacado por ação popular, por ser ato do Poder Executivo.','Não se submete ao controle concentrado, pois não possui natureza normativa.','Pode ser objeto de ADI, por ser diploma normativo com fundamento de validade direto na Constituição.','Só pode ser impugnado por ADPF, instrumento adequado para atos administrativos do Executivo.'],c:2,e:['A ação popular defende patrimônio público e moralidade — não é instrumento de controle de constitucionalidade.','O decreto autônomo (art. 84, VI, CF) tem natureza normativa primária, extraindo fundamento direto da Constituição.','O decreto autônomo é ato normativo primário com fundamento direto na CF. Pode ser objeto de ADI no STF (art. 102, I, "a", CF).','A ADPF é subsidiária — só cabe quando não há outro meio eficaz. Como cabe ADI, não se usa a ADPF.']},
  {m:'Administrativo',tema:'LINDB – Segurança Jurídica',q:'José, servidor de controle interno, depara-se com ato administrativo viciado que ainda produz efeitos. À luz da LINDB (Lei 13.655/2018), o esclarecimento correto da assessoria jurídica é:',o:['A existência de vício exige invalidação com efeitos retroativos, mesmo impondo ônus anormais ou excessivos.','Constatado vício insanável, a decisão de invalidação deve indicar expressamente suas consequências jurídicas e administrativas.','Qualquer vício deve ensejar necessariamente invalidação, independentemente de alternativas ao interesse público.','Na esfera controladora, a anulação é imperiosa de ofício, prescindindo de ampla defesa e contraditório.'],c:1,e:['Art. 20 da LINDB exige consideração das consequências práticas, vedando invalidação automática quando gerar ônus anormais ou excessivos.','Art. 21 da LINDB: a decisão que invalide ato com vício insanável deve indicar expressamente suas consequências jurídicas e administrativas.','A Lei 13.655/2018 afastou a invalidação automática, impondo à Administração a ponderação de alternativas menos gravosas.','A invalidação exige motivação adequada e observância do contraditório e ampla defesa (CF/88, art. 5º, LV; LINDB, art. 21).']},
  {m:'Administrativo',tema:'Intervenção do Estado na Propriedade',q:'Município Alfa editou lei restringindo número de pavimentos em imóveis à beira-mar, atingindo proprietários indeterminados. Gustavo, afetado, consulta advogado(a) sobre a modalidade de intervenção estatal:',o:['Servidão administrativa, embasada no poder hierárquico e supremacia do interesse público.','Limitação administrativa, embasada no poder de polícia, visando condicionar a propriedade à função social.','Requisição administrativa, embasada no poder disciplinar, para compatibilizar propriedade e função social.','Desapropriação indireta, embasada no poder regulamentar, por reduzir parcialmente o direito de propriedade.'],c:1,e:['Trata-se de limitação administrativa decorrente do poder de polícia — não de servidão nem de poder hierárquico.','Ato genérico imposto a proprietários indeterminados para cumprir função social, via poder de polícia. Não gera indenização.','Trata-se de limitação administrativa via poder de polícia. A requisição só se aplica em casos de iminente perigo público.','Trata-se de limitação administrativa. A desapropriação indireta ocorre quando o Estado toma o bem sem o procedimento expropriatório regular.']},
  {m:'Tributário',tema:'Imunidades Tributárias',q:'Entidade religiosa ABC requereu imunidade de IPTU do imóvel de culto e do imóvel vizinho usado como moradia de ministros religiosos. O Município reconheceu apenas o imóvel de culto, alegando matrículas distintas. Sua orientação correta é:',o:['A entidade deve escolher sobre qual imóvel recai a imunidade, pois possuem matrículas distintas.','Apenas o imóvel de culto tem direito à imunidade, dada a duplicidade de matrículas.','A imunidade religiosa beneficia o imóvel de culto e todos os imóveis afetados à finalidade essencial, mesmo com matrículas distintas.','Para ambos gozarem da imunidade, seria necessário unificar as matrículas.'],c:2,e:['A CF não limita a imunidade religiosa a um único imóvel. Art. 150, VI, "b" garante imunidade sem restrição de quantidade.','Não existe exigência constitucional que limite a imunidade a um imóvel — a proteção se estende a todos os bens usados na finalidade religiosa.','A imunidade religiosa (art. 150, VI, "b" CF) estende-se a imóveis afetados à finalidade essencial. STF (AgR ARE 895972/RJ) confirmou que residências de ministros são protegidas.','A unificação de matrículas não é requisito constitucional. O STF não exige essa condição.']},
  {m:'Tributário',tema:'Princípios Tributários',q:'Lei municipal de 20/02/2024 instituiu contribuição vinculada ao custeio, expansão e melhoria da iluminação pública e de sistemas de monitoramento para segurança de logradouros. Sobre essa lei:',o:['A contribuição poderia ser instituída e vinculada a todas essas finalidades, por expressa previsão constitucional.','É inconstitucional custear iluminação pública por espécie tributária distinta de impostos.','Os sistemas de monitoramento só poderiam ser custeados com taxas, não com contribuição.','Os sistemas de monitoramento só poderiam ser custeados com impostos, não com contribuição.'],c:0,e:['Art. 149-A da CF autoriza Municípios e DF a instituir contribuição para custeio, expansão e melhoria da iluminação pública e de sistemas de monitoramento para segurança de logradouros.','O tributo aplicável é a contribuição do art. 149-A da CF — não impostos.','O custeio de iluminação pública não pode ser cobrado por taxa (Súmula 670 STF), mas por contribuição (art. 149-A CF).','A implantação de sistemas de monitoramento pode ser custeada por contribuição, conforme art. 149-A da CF.']},
  {m:'Civil',tema:'Defeitos do Negócio Jurídico',q:'Joaquim vê sua filha em grave risco de vida por reação alérgica. O médico exige pagamento antecipado exorbitante como condição para atender. Joaquim paga em desespero. O defeito do negócio jurídico é:',o:['Dolo, com prazo decadencial de seis meses.','Lesão, com prazo decadencial de dois anos.','Estado de perigo, com prazo decadencial de quatro anos.','Estado de necessidade, sem prazo decadencial.'],c:2,e:['O dolo ocorre quando uma parte engana a outra para celebrar o negócio — não é o caso aqui.','Na lesão (art. 157 CC), o prejuízo é patrimonial por premente necessidade ou inexperiência, sem risco de vida da vítima.','Estado de perigo (art. 156 CC): Joaquim assume obrigação excessivamente onerosa premido pela necessidade de salvar a filha de grave dano, com o aproveitamento do médico. Prazo: 4 anos.','Estado de necessidade é excludente de ilicitude no Direito Penal — não é defeito de negócio jurídico no Código Civil.']},
  {m:'Civil',tema:'Bem de Família – Impenhorabilidade',q:'Joana trabalhou 15 anos como doméstica de Alzira, nunca recebendo férias, 13º nem INSS. Após sentença transitada em julgado, requer penhora do único imóvel de Alzira (60m², onde ela reside). A afirmativa correta é:',o:['O imóvel é impenhorável, mas os móveis que o guarnecem são penhoráveis, independentemente do valor.','O imóvel é impenhorável, bem como são impenhoráveis os móveis que guarnecem a casa, exceto obras de arte e adornos suntuosos.','O imóvel é, em qualquer hipótese, penhorável na execução promovida por Joana.','O imóvel é penhorável desde que comprovada a má-fé da devedora.'],c:1,e:['São impenhoráveis os móveis que guarnecem a casa — exceto veículos, obras de arte e adornos suntuosos (art. 2º, Lei 8.009/90).','O imóvel residencial é impenhorável (art. 1º, Lei 8.009/90), assim como os móveis — exceto veículos, obras de arte e adornos suntuosos (art. 2º).','O imóvel residencial próprio é impenhorável conforme art. 1º da Lei 8.009/90.','A impenhorabilidade não depende de análise de má-fé — é proteção legal do bem de família.']},
  {m:'Processo Civil',tema:'Tutela Provisória de Urgência',q:'A mãe de Bruno busca tutela de urgência após negativa imotivada do plano de saúde para cirurgia que deve ocorrer em 48h ou ele morre. Com laudo e negativa comprovados, sua orientação correta é:',o:['Para a tutela de urgência, basta a probabilidade do direito, dispensando o perigo de dano.','Para a tutela de urgência, devem existir elementos que evidenciem a probabilidade do direito e o perigo de dano ou risco ao resultado útil do processo.','Se concedida, o juiz não precisa motivar o convencimento em razão da urgência.','Se não concedida, não é possível interpor recurso, pois a demanda se estabilizará.'],c:1,e:['Art. 300, caput, CPC exige tanto a probabilidade do direito quanto o perigo de dano ou risco ao resultado útil do processo.','Art. 300, caput, CPC: a tutela de urgência será concedida quando houver elementos que evidenciem a probabilidade do direito e o perigo de dano ou o risco ao resultado útil do processo.','O juiz deve motivar suas decisões, inclusive na concessão de tutela de urgência — exigência constitucional.','Das decisões sobre tutela provisória cabe agravo de instrumento (art. 1.015, I, CPC).']},
  {m:'Processo Civil',tema:'Recursos – Agravo de Instrumento',q:'O magistrado concedeu tutela provisória de urgência determinando bloqueio de bens de Ana, em ação de indenização por danos morais e materiais ajuizada por José. Qual recurso Ana deve interpor?',o:['Não cabe recurso imediato contra decisão que defere tutela provisória de urgência.','Agravo de instrumento, pois a decisão é interlocutória impugnável por tal recurso.','Apelação, pois a decisão tem natureza de sentença.','Apelação, pois a decisão interlocutória é impugnável por tal recurso.'],c:1,e:['O sistema processual oferece o agravo de instrumento para controlar a legalidade das decisões de urgência (art. 1.015, I, CPC).','A decisão que concede ou nega tutela de urgência é decisão interlocutória. Cabe agravo de instrumento (art. 1.015, I, CPC).','A decisão não encerra o processo (não é sentença, art. 203, §2º, CPC). O processo continuará para discutir o mérito.','Embora seja interlocutória, o recurso cabível é o agravo de instrumento — não apelação.']},
  {m:'Penal',tema:'Erro de Tipo Invencível',q:'Pedro, coveiro, foi enganado por Maria e José com documentos falsos indicando o falecimento de Maria. Sem desconfiar, realizou a cremação — e Maria estava viva. Sobre a conduta de Pedro:',o:['Ele não praticou crime, pois agiu com base em erro de tipo invencível.','Ele praticou apenas o delito de vilipêndio culposo das cinzas do cadáver.','Ele praticou homicídio culposo por descumprir dever de cuidado objetivo.','Ele praticou homicídio qualificado pela impossibilidade de reação da vítima.'],c:0,e:['Pedro agiu em erro de tipo invencível — era impossível saber que Maria estava viva. Art. 20, §2º, CP: responde pelo crime o terceiro que determina o erro.','O crime de vilipêndio de cadáver (art. 212 CP) não admite forma culposa por ausência de previsão legal.','Não houve descumprimento de dever de cuidado por Pedro. A causa determinante foi a ação de Maria e José.','Não houve dolo de matar. Pedro não tinha elementos para inferir tratar-se de morte simulada.']},
  {m:'Penal',tema:'Coação Moral Irresistível – Culpabilidade',q:'Bernardo, gerente bancário, teve o filho sequestrado. Os sequestradores exigiram R$1 milhão. Ele subtraiu o valor do banco onde trabalhava e foi flagrado ao chegar em casa. Sobre sua situação:',o:['Agiu amparado por exercício regular de direito.','Está isento de pena por inexigibilidade de conduta diversa (coação moral irresistível).','Agiu em legítima defesa de terceiro, excluída a antijuridicidade.','Deve responder por furto consumado, pois chegou a ter posse pacífica do dinheiro.'],c:1,e:['Exercício regular de direito aplica-se a situações como esportes violentos — não à conduta motivada por coação.','Art. 22 do CP: se o fato é cometido sob coação irresistível, só é punível o autor da coação. Bernardo agiu sob coação moral irresistível, afastando sua culpabilidade.','Não configura legítima defesa de terceiros. A conduta não envolveu defesa direta contra agressão atual ao patrimônio.','Bernardo não agiu com dolo de furto. A coação moral irresistível afasta sua culpabilidade.']},
  {m:'Processo Penal',tema:'Lei Maria da Penha – Competência',q:'Cauã e Mayara são indígenas integrados em relação íntima de afeto. Motivado por ciúmes, Cauã agrediu Mayara causando lesão corporal leve. Sobre a orientação do(a) advogado(a) de defesa de Mayara:',o:['Ação penal pública incondicionada, competência da Vara Criminal Estadual (disputa sobre direito indígena).','Ação penal condicionada à representação, Juizado Especial Criminal, Justiça Federal.','Ação penal pública incondicionada, competência da Justiça Federal por envolver indígenas.','Ação penal pública incondicionada, competência do Juizado de Violência Doméstica e Familiar contra a Mulher.'],c:3,e:['Não é disputa sobre direito indígena — é violência doméstica. São indígenas integrados, afastando a competência federal.','A ação é pública incondicionada (Súmula 542 STJ). Não cabe Juizado Especial Criminal em violência doméstica.','Por serem indígenas integrados, não há interesse específico de comunidade indígena — afasta-se a competência federal.','Ação pública incondicionada. Competência do Juizado de Violência Doméstica e Familiar (art. 14, Lei 11.340/06), pela relação íntima de afeto entre autor e vítima.']},
  {m:'Processo Penal',tema:'Recursos – Execução Penal',q:'Arthur cumpre pena por furto qualificado e ficou tetraplégico durante a execução. O Presidente concedeu indulto natalino abrangendo tetraplegia superveniente em crimes sem violência. O juízo indeferiu o pedido de extinção da punibilidade sem fundamentação. O recurso correto é:',o:['Agravo em execução, prazo de cinco dias. Sem prejuízo, pode ser impetrado habeas corpus.','Recurso de apelação, prazo de cinco dias. Sem prejuízo, pode ser impetrado habeas corpus.','Agravo em execução, prazo de cinco dias. Habeas corpus só cabe se não interposto recurso.','RESE, prazo de cinco dias. Alternativamente, habeas corpus (unirecorribilidade).'],c:0,e:['Agravo em execução (art. 197, LEP) é o recurso típico contra decisões na execução penal, prazo de 5 dias (Súmula 700 STF). Habeas corpus também é cabível simultaneamente (art. 648 CPP).','Na fase de execução penal, não cabe apelação. O recurso é o agravo em execução (art. 197, LEP).','É possível interpor simultaneamente agravo em execução e habeas corpus — não são excludentes.','RESE não cabe na fase de execução penal. O recurso adequado é o agravo em execução (art. 197, LEP).']},
  {m:'Trabalho',tema:'Trabalho do Menor',q:'ONG busca orientação sobre trabalho de menores como empregados. A opção correta é:',o:['É permitido ao menor de 18 e maior de 16 anos trabalhar em bilheterias de cinemas das 22h às 24h.','É permitido ao maior de 16 e menor de 18 anos trabalhar como frentista em posto de gasolina.','É permitido ao menor trabalhar em quiosques de orla que vendem comidas e bebidas alcoólicas.','É permitido ao menor, a partir de 14 anos, trabalhar na condição de aprendiz.'],c:3,e:['O trabalho noturno (22h às 5h) é terminantemente vedado a menores de 18 anos (art. 404 CLT; art. 7º, XXXIII CF).','Trabalho como frentista expõe a agentes inflamáveis e riscos de explosão — atividade perigosa vedada a menores de 18 anos (Decreto 6.481/2008, Lista TIP).','Art. 405, §3º, "a" CLT proíbe o trabalho do menor de 18 anos em locais destinados à venda de bebidas alcoólicas.','A CF permite trabalho a partir de 14 anos na condição de aprendiz — exceção à idade mínima geral de 16 anos.']},
  {m:'Trabalho',tema:'Proteção do Trabalho da Mulher – Insalubridade',q:'Jéssica trabalha em hospital no setor de infectocontagiosas, recebendo adicional de insalubridade grau máximo. Grávida, foi transferida para o setor de convênios (ambiente salubre). Sobre o adicional de insalubridade:',o:['Jéssica faz jus ao adicional durante a gestação, que cessará após o nascimento — não se estende à lactação.','O adicional deve cessar porque a transferência foi necessidade para a qual a empresa não colaborou.','Jéssica terá direito à metade do adicional que recebia, enquanto estiver em local sem agente agressor.','A empresa deve pagar o adicional à gestante no setor de convênios, compensando esse valor na cota-parte do INSS.'],c:3,e:['O direito se estende também ao período de lactação (amamentação), não apenas à gestação (art. 394-A, III e §2º, CLT).','O direito ao adicional não cessa com a transferência — que é obrigação legal de proteção. Redução salarial configuraria alteração contratual lesiva.','Não há previsão legal para pagamento de metade do adicional. A integralidade deve ser mantida.','Art. 394-A, §2º, CLT: a empresa paga o adicional de insalubridade à gestante/lactante e compensa no recolhimento das contribuições previdenciárias.']},
  {m:'Processo do Trabalho',tema:'Honorários Periciais – Sucumbência',q:'Em reclamação trabalhista por doença profissional, ambas as partes quesitaram e indicaram assistentes técnicos. O laudo confirmou a doença ocupacional e o juiz julgou procedente. Sobre honorários do perito e assistentes:',o:['A empresa arcará com honorários do perito e do assistente técnico do autor.','A Justiça arcará com honorários do perito; cada parte paga seu assistente técnico.','Cada parte arca com metade dos honorários do perito e integralmente com os do seu assistente.','O réu pagará os honorários do perito (sucumbente na perícia) e arcará com os do assistente técnico por ele indicado.'],c:3,e:['Os honorários do perito são pagos pela parte sucumbente na pretensão objeto da perícia (art. 790-B CLT) — não necessariamente pela empresa.','Os honorários do perito são pagos pela parte sucumbente na perícia (art. 790-B CLT), não pela Justiça.','Não há previsão de rateio dos honorários periciais. A responsabilidade é da parte sucumbente na pretensão.','Art. 790-B CLT: honorários periciais pagos pela parte sucumbente (réu). Súmula 341 TST: honorários do assistente técnico pagos pela parte que o indicou, mesmo vencedora.']},
  {m:'Processo do Trabalho',tema:'Recursos – Dissídio Coletivo',q:'Sindicato ajuizou dissídio coletivo de natureza econômica perante o TRT competente. O processo foi extinto sem resolução do mérito. Como advogado(a) do sindicato, o recurso cabível e o prazo são:',o:['Recurso ordinário, no prazo de 8 dias.','Recurso de revista, no prazo de 8 dias.','Agravo de petição, no prazo de 15 dias.','Recurso extraordinário, no prazo de 15 dias.'],c:0,e:['Art. 895, II, CLT prevê recurso ordinário (prazo de 8 dias) contra decisões definitivas ou terminativas dos TRTs em processos de competência originária, como o dissídio coletivo.','O recurso de revista cabe contra decisões dos TRTs em sede de recurso ordinário (fase recursal), não contra decisões originárias.','O agravo de petição (art. 897, "a", CLT) é específico da fase de execução. Além disso, o prazo é de 8 dias, não 15.','O recurso extraordinário é direcionado ao STF para questões constitucionais após esgotadas as instâncias trabalhistas — inaplicável aqui.']}
];

/* ── Embaralhamento balanceado da POSIÇÃO das alternativas ──
   A nota é avaliada pelo índice ORIGINAL (q.c), que continua igual no servidor.
   Aqui só mudamos onde cada alternativa aparece, pra distribuir a correta em
   A/B/C/D de forma equilibrada (5 de cada) e sem agrupar respostas iguais. */
const TARGET=[0,1,2,3,1,2,3,0,2,3,0,1,3,0,1,2,0,2,1,3]; // posição de exibição da correta por questão
Q.forEach((q,i)=>{
  const tp=TARGET[i%TARGET.length];
  const others=[0,1,2,3].filter(x=>x!==q.c);
  const ord=[]; let oi=0;
  for(let p=0;p<4;p++){ ord[p]=(p===tp)?q.c:others[oi++]; }
  q.order=ord; // ordem de exibição: posição p mostra a alternativa original ord[p]
});

let cur=0,score=0,ans=new Array(Q.length).fill(null);
// Durante o quiz mostramos só quantas foram respondidas (sem revelar acertos).
function pill(){const d=ans.filter(a=>a!==null).length;const el=document.getElementById('score-pill');if(el)el.textContent=d+' / '+Q.length;}

/* ── Timer (7 min para as 20 questões) ── */
const TIMER_SECONDS=7*60;
let timerId=null, deadline=0;
function fmtTime(s){const m=Math.floor(s/60);const ss=s%60;return m+':'+(ss<10?'0':'')+ss;}
function tick(){
  const rem=Math.max(0,Math.round((deadline-Date.now())/1000));
  const el=document.getElementById('timer');
  if(el){el.innerHTML=ic('clock')+' '+fmtTime(rem);el.classList.toggle('timer-low',rem<=60);}
  if(rem<=0){stopTimer();if(cur<Q.length){showRes();}}
}
function startTimer(){deadline=Date.now()+TIMER_SECONDS*1000;clearInterval(timerId);timerId=setInterval(tick,250);tick();}
function stopTimer(){clearInterval(timerId);timerId=null;}

/* ── SVG Gauges ── */
function miniG(p){
  const cx=70,cy=58,r=46,col=scoreColor(p);
  const bg='#241c36';
  const a=Math.PI+(p/100)*Math.PI,ex=cx+r*Math.cos(a),ey=cy+r*Math.sin(a),lg=p>50?1:0;
  const tr='M '+(cx-r)+' '+cy+' A '+r+' '+r+' 0 0 1 '+(cx+r)+' '+cy;
  const fi='M '+(cx-r)+' '+cy+' A '+r+' '+r+' 0 '+lg+' 1 '+ex+' '+ey;
  const nl=33,nx=cx+nl*Math.cos(a),ny=cy+nl*Math.sin(a);
  return '<svg viewBox="0 0 140 90" style="width:100%;display:block">'
    +'<path d="'+tr+'" fill="none" stroke="'+bg+'" stroke-width="10" stroke-linecap="round"/>'
    +'<path d="'+fi+'" fill="none" stroke="'+col+'" stroke-width="10" stroke-linecap="round"/>'
    +'<line x1="'+cx+'" y1="'+cy+'" x2="'+nx+'" y2="'+ny+'" stroke="'+col+'" stroke-width="2.5" stroke-linecap="round"/>'
    +'<circle cx="'+cx+'" cy="'+cy+'" r="4" fill="'+col+'"/>'
    +'<text x="'+cx+'" y="'+(cy+22)+'" text-anchor="middle" font-size="15" font-weight="700" fill="'+col+'" font-family="Poppins,sans-serif">'+p+'%</text>'
    +'<text x="11" y="'+(cy+5)+'" text-anchor="middle" font-size="9" fill="#c4b5fd" font-family="Poppins,sans-serif">0</text>'
    +'<text x="129" y="'+(cy+5)+'" text-anchor="middle" font-size="9" fill="#c4b5fd" font-family="Poppins,sans-serif">100</text>'
    +'</svg>';}

function bigG(p){
  const cx=145,cy=108,r=94,col=scoreColor(p);
  const bg='#241c36';
  const a=Math.PI+(p/100)*Math.PI,ex=cx+r*Math.cos(a),ey=cy+r*Math.sin(a),lg=p>50?1:0;
  const tr='M '+(cx-r)+' '+cy+' A '+r+' '+r+' 0 0 1 '+(cx+r)+' '+cy;
  const fi='M '+(cx-r)+' '+cy+' A '+r+' '+r+' 0 '+lg+' 1 '+ex+' '+ey;
  const nl=72,nx=cx+nl*Math.cos(a),ny=cy+nl*Math.sin(a);
  return '<svg viewBox="0 0 290 150" style="width:100%;max-width:300px;display:block;margin:0 auto">'
    +'<path d="'+tr+'" fill="none" stroke="'+bg+'" stroke-width="20" stroke-linecap="round"/>'
    +'<path d="'+fi+'" fill="none" stroke="'+col+'" stroke-width="20" stroke-linecap="round"/>'
    +'<line x1="'+cx+'" y1="'+cy+'" x2="'+nx+'" y2="'+ny+'" stroke="'+col+'" stroke-width="4" stroke-linecap="round"/>'
    +'<circle cx="'+cx+'" cy="'+cy+'" r="7" fill="'+col+'"/>'
    +'<text x="'+cx+'" y="'+(cy+34)+'" text-anchor="middle" font-size="32" font-weight="700" fill="'+col+'" font-family="Poppins,sans-serif">'+p+'%</text>'
    +'<text x="20" y="'+(cy+10)+'" font-size="12" fill="#c4b5fd" font-family="Poppins,sans-serif">0%</text>'
    +'<text x="225" y="'+(cy+10)+'" font-size="12" fill="#c4b5fd" font-family="Poppins,sans-serif">100%</text>'
    +'</svg>';}


/* ── Quiz render ── (sem revelar o gabarito; alternativas embaralhadas) */
function render(){
  const root=document.getElementById('root');
  if(cur>=Q.length){renderResult(root);return;}
  const q=Q[cur];const ua=ans[cur];
  const pct=Math.round(((cur+1)/Q.length)*100);
  const progress='<div class="progress-wrap"><div class="progress-meta">'
    +'<span>Questão '+(cur+1)+' / '+Q.length+'</span>'
    +'<span class="timer-pill" id="timer">'+ic('clock')+' '+fmtTime(TIMER_SECONDS)+'</span>'
    +'</div><div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div></div>';
  const qCard='<div class="q-card"><div class="materia-badge">'+q.m+'</div>'
    +'<div class="question-num">Questão '+(cur+1)+' de '+Q.length+' · '+q.tema+'</div>'
    +'<div class="question-text">'+q.q+'</div></div>';
  const options='<div class="options">'+q.order.map((orig,p)=>{
      const sel=(ua===orig)?' selected':'';
      return '<button class="opt-btn'+sel+'" onclick="sel('+orig+')"><span class="opt-letter">'+L[p]+'</span><span>'+q.o[orig]+'</span></button>';
    }).join('')+'</div>';
  const answered=ua!==null;
  const nav='<div class="nav-row"><div>'+(cur>0?'<button class="nav-btn" onclick="go(-1)">&#8592; Anterior</button>':'<span></span>')+'</div>'
    +'<div>'+(cur<Q.length-1
        ?'<button class="nav-btn primary" '+(answered?'':'disabled')+' onclick="go(1)">Próxima &#8594;</button>'
        :'<button class="nav-btn primary" '+(answered?'':'disabled')+' onclick="showRes()">Ver diagnóstico &#8594;</button>')+'</div></div>';
  root.innerHTML='<div class="quiz-shell">'+progress+qCard+options+nav+'</div>';
  pill();
  if(timerId)tick(); // mantém o timer atualizado logo após o re-render
}

// Seleciona (índice ORIGINAL). Pode trocar enquanto não avança; não revela acerto.
function sel(i){ans[cur]=i;render();}
function go(d){cur+=d;render();window.scrollTo({top:0,behavior:'smooth'});}
function showRes(){stopTimer();cur=Q.length;render();}

/* ── Result ── */
function renderResult(root){
  stopTimer();
  score=ans.reduce((acc,a,i)=>acc+(a===Q[i].c?1:0),0); // nota calculada no fim
  submitQuiz();   // grava a submissão no Supabase assim que o diagnóstico é exibido
  const total=Q.length,pct=Math.round((score/total)*100);
  document.getElementById('score-pill').textContent=score+' / '+total;
  const ms={};
  Q.forEach((q,i)=>{
    if(!ms[q.m])ms[q.m]={t:0,a:0,erros:[]};
    ms[q.m].t++;
    if(ans[i]===q.c)ms[q.m].a++;
    else ms[q.m].erros.push({qi:i+1,tema:q.tema,q:q.q,myIdx:ans[i],minha:(ans[i]!=null?q.o[ans[i]]:null),cIdx:q.c,certa:q.o[q.c],exp:q.e[q.c]});
  });

  // Sort: high incidence + low score first
  const sorted=Object.entries(ms).map(([m,s])=>({
    m,pct:Math.round((s.a/s.t)*100),a:s.a,t:s.t,erros:s.erros,
    presNum:(getInc(m)||{presNum:0}).presNum,
    presence:(getInc(m)||{presence:'?'}).presence
  })).sort((a,b)=>(b.presNum*100-b.pct)-(a.presNum*100-a.pct));

  const erroTotal=sorted.reduce((s,x)=>s+x.erros.length,0);
  const worstErr=sorted.find(s=>s.erros.length>0)||sorted[sorted.length-1];
  const bestScore=[...sorted].sort((a,b)=>b.pct-a.pct)[0];

  let badge,bc,hl,adv;
  if(pct>=80){badge='Aprovado com louvor';bc='#16a34a';hl='Você está pronto(a)!';adv='Desempenho excelente. Mantenha revisão em <b>'+worstErr.m+'</b> para chegar 100% na prova.';}
  else if(pct>=60){badge='Na zona de aprovação';bc='#7c3aed';hl='Bom caminho, mas atenção!';adv='Você está perto da aprovação. Fragilidade em <b>'+worstErr.m+'</b> ('+worstErr.pct+'%) — prioridade máxima. Seu melhor: <b>'+bestScore.m+'</b> ('+bestScore.pct+'%).';}
  else if(pct>=40){badge='Precisa de reforço';bc='#d97706';hl='Ainda há espaço para crescer.';adv='Intensifique os estudos. '+erroTotal+' erros no total — veja os temas com maior incidência na prova e comece por eles.';}
  else{badge='Zona de risco';bc='#dc2626';hl='Hora de revisar do zero.';adv='Aproveitamento abaixo do mínimo. Você errou '+erroTotal+' de '+total+' questões. Foque nas matérias com maior incidência na OAB — elas estão destacadas em vermelho abaixo.';}

  /* ── incidence cards ── */
  const cards=sorted.map(s=>{
    const d=getInc(s.m)||{presNum:3,presence:'3/5',top:[],second:[],note:''};
    const lv=lvl(s.m);
    const scoreCol=scoreColor(s.pct);
    const incCol=lvlColor(lv);
    const incBar=Math.round((d.presNum/5)*100);
    const scoreBar=s.pct;

    // verdict: cross score x incidence
    let vdict,vcls;
    if(s.pct>=75){vdict=ic('circle-check')+' Você domina esse tema.';vcls='ok';}
    else if(s.pct>=50&&lv==='hot'){vdict=ic('alert-triangle')+' Você foi mediano num tema de alta incidência — revisar.';vcls='warm';}
    else if(s.pct>=50){vdict=ic('book')+' Aproveitamento razoável. Vale revisar.';vcls='cold';}
    else if(s.pct<50&&lv==='hot'){vdict=ic('octagon-alert')+' Você errou em tema que cai em toda prova. Prioridade máxima!';vcls='hot';}
    else if(s.pct<50&&lv==='warm'){vdict=ic('alert-triangle')+' Você errou em tema de alta incidência. Prioridade alta.';vcls='warm';}
    else{vdict=ic('circle-alert')+' Tema de incidência moderada com erros. Revisar.';vcls='warm';}

    const presChip='<span class="chip chip-'+lv+'">'+d.presence+' provas</span>';

    return '<div class="inc-card">'
      +'<div class="inc-card-top">'
        +'<div class="inc-card-mat">'+s.m+'</div>'
        +'<div class="inc-card-chips">'+presChip+'</div>'
      +'</div>'
      +'<div class="gauge-row">'
        +'<div class="gauge-mini-wrap">'+miniG(s.pct)+'</div>'
        +'<div class="gauge-score-col">'
          +'<div class="gauge-pct" style="color:'+scoreCol+'">'+s.pct+'%</div>'
          +'<div class="gauge-fraction">'+s.a+'/'+s.t+' acertos</div>'
        +'</div>'
      +'</div>'
      +'<div class="inc-bar-sect">'
        +'<div class="inc-bar-label"><span>Acerto</span><span style="color:'+scoreCol+'">'+scoreBar+'%</span></div>'
        +'<div class="inc-bar-track"><div class="inc-bar-fill" style="width:'+scoreBar+'%;background:'+scoreCol+'"></div></div>'
      +'</div>'
      +'<div class="inc-bar-sect" style="margin-bottom:.75rem">'
        +'<div class="inc-bar-label"><span>Incidência OAB</span><span style="color:'+incCol+'">'+d.presence+'</span></div>'
        +'<div class="inc-bar-track"><div class="inc-bar-fill" style="width:'+incBar+'%;background:'+incCol+'"></div></div>'
      +'</div>'
      +'<div class="inc-verdict-mini '+vcls+'">'+vdict+'</div>'
      +'</div>';
  }).join('');

  /* ── study suggestions ── */
  const urgentMats=sorted.filter(s=>s.pct<75).slice(0,6);
  const rankColors=['#dc2626','#dc2626','#d97706','#d97706','#7c3aed','#7c3aed'];
  const rankBg=['#fee2e2','#fee2e2','#fef3c7','#fef3c7','#ede9fe','#ede9fe'];
  const studyItems=urgentMats.length===0
    ?'<div style="text-align:center;color:#4ade80;font-weight:600;padding:1rem">'+ic('party')+' Parabéns! Você domina todas as matérias.</div>'
    :urgentMats.map((s,i)=>{
      const d=getInc(s.m)||{top:[],second:[],note:''};
      const lv=lvl(s.m);
      const tips=[];
      if(s.erros.length)tips.push('Você errou <b>'+s.erros.length+'</b> quest'+(s.erros.length>1?'ões':'ão')+' aqui — priorize a revisão do gabarito comentado.');
      else tips.push('Aproveitamento abaixo do ideal — vale uma revisão dirigida.');
      const presChip='<span class="chip chip-'+lv+'">'+s.presence+' provas</span>';
      const errChip=s.erros.length?'<span class="chip" style="background:#fee2e2;color:#b91c1c">'+s.erros.length+' erro'+(s.erros.length>1?'s':'')+'</span>':'';
      return '<div class="study-item">'
        +'<div class="study-rank" style="background:'+rankBg[i]+';color:'+rankColors[i]+'">'+(i+1)+'º</div>'
        +'<div class="study-body">'
          +'<div class="study-mat">'+s.m+'</div>'
          +'<div class="study-tip">'+tips.join(' ')+'</div>'
          +'<div class="study-chips">'+presChip+errChip+'</div>'
        +'</div>'
        +'</div>';
    }).join('');

  /* ── apostas da banca (consolidado por matéria) ── */
  const apostasItems=sorted.map(s=>{
    const d=getInc(s.m);if(!d)return'';
    const lv=lvl(s.m);
    return '<div class="apostas-item">'
      +'<div class="apostas-head"><span class="apostas-mat">'+s.m+'</span><span class="chip chip-'+lv+'">'+d.presence+' provas</span></div>'
      +(d.top.length?'<div class="apostas-line"><b>Mais cai:</b> '+d.top.join(', ')+'</div>':'')
      +(d.second.length?'<div class="apostas-line apostas-2"><b>Segunda linha:</b> '+d.second.slice(0,3).join(', ')+'</div>':'')
      +(d.note?'<div class="apostas-note">'+d.note+'</div>':'')
      +'</div>';
  }).join('');

  /* ── resumo das questões (revelado só ao clicar) ── */
  const resumoItems=Q.map((q,i)=>{
    const ua=ans[i];const acertou=ua===q.c;const semResp=ua===null;
    const opts=q.order.map((orig,p)=>{
      const isC=orig===q.c;const isU=orig===ua;
      const cls=isC?'correta':(isU?'errada':'neutra');
      const status=isC?ic('check')+' Correta':(isU?ic('x')+' Sua resposta':'');
      return '<div class="exp-item"><div class="exp-tag '+cls+'">'+L[p]+') '+status+'</div>'
        +'<div class="exp-text"><span class="exp-opt">'+q.o[orig]+'</span>'
        +((isC||isU)?'<span class="exp-why">'+q.e[orig]+'</span>':'')+'</div></div>';
    }).join('');
    return '<div class="resumo-q">'
      +'<div class="resumo-head '+(acertou?'acertou':'errou')+'">'+(acertou?ic('circle-check'):ic('circle-x'))
      +' Questão '+(i+1)+(semResp?' · não respondida':'')+' <span class="resumo-meta">'+q.m+' · '+q.tema+'</span></div>'
      +'<div class="resumo-qtext">'+q.q+'</div>'+opts
    +'</div>';
  }).join('');

  root.innerHTML='<div class="result-shell">'
    // Overall
    +'<div class="overall-card">'
      +'<div class="materia-badge" style="margin-bottom:1rem">Diagnóstico OABeiro</div>'
      +'<div class="overall-title">'+hl+'</div>'
      +'<div class="overall-sub">Você acertou '+score+' de '+total+' questões &nbsp;·&nbsp; '+erroTotal+' erro'+(erroTotal!==1?'s':'')+' para revisar</div>'
      +'<div class="big-gauge-wrap">'+bigG(pct)+'</div>'
      +'<div class="overall-badge" style="background:'+bc+'18;color:'+bc+';border:1.5px solid '+bc+'33;margin-top:.5rem">'+badge+'</div>'
      +'<div class="overall-advice">'+adv+'</div>'
    +'</div>'
    // Resumo das questões (toggle)
    +'<button class="resumo-btn" id="resumo-btn" onclick="toggleResumo()">'+ic('list')+' Resumo das questões · ver acertos e erros</button>'
    +'<div class="resumo-box" id="resumo">'+resumoItems+'</div>'
    // Incidence x score cards
    +'<div class="section-label">Incidência real × seu desempenho · OAB 42–46</div>'
    +'<div class="inc-grid">'+cards+'</div>'
    // Study suggestions
    +'<div class="study-box">'
      +'<div class="study-box-title">'+ic('cap')+' Sugestão de estudos · por onde começar</div>'
      +studyItems
    +'</div>'
    // Apostas da banca (consolidado — substitui o "apostas" que ficava em cada questão)
    +'<div class="study-box">'
      +'<div class="study-box-title">'+ic('book')+' Apostas da banca · o que mais cai · OAB 42–46</div>'
      +'<div class="apostas-box">'+apostasItems+'</div>'
    +'</div>'
    // Actions
    +'<div class="action-row">'
      +'<button class="action-btn btn-primary" onclick="gerarPDF()">'+ic('file-down')+' Baixar PDF de revisão</button>'
      +'<button class="action-btn btn-secondary" onclick="restart()">'+ic('rotate')+' Refazer quiz</button>'
    +'</div>'
  +'</div>';

  buildPDF(sorted,score,total,pct,badge,adv,erroTotal);}

function toggleResumo(){
  const el=document.getElementById('resumo');const btn=document.getElementById('resumo-btn');
  if(!el)return;
  const open=el.classList.toggle('open');
  if(btn)btn.classList.toggle('open',open);
  if(open)el.scrollIntoView({behavior:'smooth',block:'start'});
}

/* ── PDF builder (print-based) ── */
function buildPDF(sorted,sc,total,pct,badge,adv,erroTotal){
  const now=new Date();
  const dateStr=now.toLocaleDateString('pt-BR');
  const scoreCol=scoreColor(pct);

  let html='<div class="pdf-page">'
    +'<div class="pdf-header">'
    +'<div class="pdf-title">'+ic('scale')+' Relatório de Revisão OAB – 1ª Fase</div>'
    +'<div class="pdf-sub">Gerado em '+dateStr+' · Baseado nas questões desta simulação</div>'
    +'</div>'
    +'<div class="pdf-score-row">'
    +'<div class="pdf-score-box"><div class="pdf-score-num" style="color:'+scoreCol+'">'+pct+'%</div><div class="pdf-score-lbl">Aproveitamento</div></div>'
    +'<div class="pdf-score-box"><div class="pdf-score-num" style="color:'+scoreCol+'">'+sc+'/'+total+'</div><div class="pdf-score-lbl">Acertos</div></div>'
    +'<div class="pdf-score-box"><div class="pdf-score-num" style="color:#dc2626">'+erroTotal+'</div><div class="pdf-score-lbl">Para revisar</div></div>'
    +'</div>'
    +'<div style="background:#f5f0ff;border-radius:8px;padding:10px 14px;font-size:11px;color:#3d2a6e;line-height:1.7;margin-bottom:16px"><b>'+badge+':</b> '+adv.replace(/<b>/g,'').replace(/<\/b>/g,'')+'</div>'
    +'<div style="font-size:12px;font-weight:700;color:#5b21b6;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Prioridade de Revisão · OAB 42–46</div>'
    +sorted.map((s,i)=>{
      const lv=lvl(s.m);const col=scoreColor(s.pct);
      const urg=i<=1?ic('dot','#dc2626')+' Urgente':i<=3?ic('dot','#d97706')+' Alta':s.pct<75?ic('dot','#d97706')+' Média':ic('dot','#16a34a')+' Manter';
      const urgCls=i<=1?'pdf-priority-urgent':i<=3?'pdf-priority-high':'';
      return '<div class="pdf-priority-row '+urgCls+'">'
        +'<span style="font-size:11px;font-weight:700;color:#1e1030">'+s.m+'</span>'
        +'<span style="font-size:10px;color:'+col+';font-weight:700">'+s.pct+'% &nbsp;('+s.a+'/'+s.t+')</span>'
        +'<span style="font-size:9px;color:'+(lv==='hot'?'#b91c1c':lv==='warm'?'#b45309':'#5b21b6')+';font-weight:700">'+s.presence+' provas</span>'
        +'<span style="font-size:10px">'+urg+'</span>'
        +(s.erros.length?'<span style="font-size:10px;color:#dc2626">'+s.erros.length+' erro'+(s.erros.length>1?'s':'')+'</span>':'<span style="color:#16a34a;font-size:10px">'+ic('check')+' Zerou</span>')
        +'</div>';
    }).join('')
    +'</div>';

  // Detalhamento dos erros — flui em páginas contínuas; cada matéria evita quebrar no meio.
  const erroMats=sorted.filter(s=>s.erros.length>0);
  if(erroMats.length){
    html+='<div class="pdf-page"><div class="pdf-section-title">Gabarito comentado dos seus erros</div>'
      +erroMats.map(s=>{
        const d=getInc(s.m)||{};
        return '<div class="pdf-mat-section">'
          +'<div class="pdf-mat-title">'+s.m+' &nbsp;·&nbsp; '+s.presence+' provas &nbsp;·&nbsp; '+s.pct+'% de acerto</div>'
          +(d.note?'<div style="background:#f5f0ff;border-radius:7px;padding:8px 12px;font-size:10px;color:#4c1d95;margin-bottom:14px;line-height:1.5">'+d.note+'</div>':'')
          +s.erros.map(e=>{
            const isUnans=e.myIdx===null||e.myIdx===undefined;
            return '<div class="pdf-err-item">'
              +'<div style="font-size:9px;color:#5b21b6;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Q'+e.qi+' · '+e.tema+'</div>'
              +'<div class="pdf-err-q">'+e.q+'</div>'
              +'<div class="pdf-err-row">'
              +(isUnans?'<div class="pdf-err-box w"><b>'+ic('x')+' Sem resposta</b></div>'
                :'<div class="pdf-err-box w"><b>'+ic('x')+' Você marcou ('+L[e.myIdx]+'):</b> '+e.minha+'</div>')
              +'<div class="pdf-err-box r"><b>'+ic('check')+' Correta ('+L[e.cIdx]+'):</b> '+e.certa+'</div>'
              +'</div>'
              +'<div class="pdf-err-exp"><b>Por que está certa:</b> '+e.exp+'</div>'
              +'</div>';
          }).join('')
        +'</div>';
      }).join('')
    +'</div>';
  }

  document.getElementById('pdf-content').innerHTML=html;}

// Carrega a lib de PDF só na hora do download (não pesa no carregamento inicial).
let __pdfLoading=false;
function loadHtml2pdf(cb){
  if(window.html2pdf)return cb();
  if(__pdfLoading)return; // evita duplo-load no clique repetido
  __pdfLoading=true;
  const s=document.createElement('script');
  s.src='/vendor/html2pdf.bundle.min.js';
  s.onload=function(){__pdfLoading=false;cb();};
  s.onerror=function(){__pdfLoading=false;cb();};
  document.head.appendChild(s);
}
function gerarPDF(){
  const src=document.getElementById('pdf-content');
  const btn=document.querySelector('.action-btn.btn-primary');
  if(!src)return;
  if(btn){btn.dataset.t=btn.innerHTML;btn.innerHTML=ic('file-down')+' Gerando PDF…';btn.disabled=true;}
  const restore=function(){if(btn){btn.innerHTML=btn.dataset.t;btn.disabled=false;}};
  loadHtml2pdf(function(){
    if(!window.html2pdf){restore();window.print();return;} // fallback se a lib falhar
    const doc=document.createElement('div');
    doc.className='pdf-doc';
    doc.innerHTML=src.innerHTML;
    const wrap=document.createElement('div');
    wrap.style.cssText='position:fixed;left:-99999px;top:0;width:794px;background:#fff;';
    wrap.appendChild(doc);document.body.appendChild(wrap);
    const slug=identity.nome?'-'+identity.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''):'';
    const done=function(){try{document.body.removeChild(wrap);}catch(e){}restore();};
    window.html2pdf().set({
      margin:[10,10,12,10],
      filename:'diagnostico-oab'+slug+'.pdf',
      image:{type:'jpeg',quality:0.96},
      html2canvas:{scale:2,backgroundColor:'#ffffff',useCORS:true,windowWidth:794},
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
      pagebreak:{mode:['css','legacy','avoid-all']}
    }).from(doc).save().then(done).catch(done);
  });
}
function restart(){startQuiz();}

/* ── Tela de captura (fallback quando o link não traz identidade) ── */
function renderCapture(){
  const root=document.getElementById('root');
  root.innerHTML='<div class="capture-shell">'
    +'<div class="capture-card">'
      +'<img class="capture-logo" src="/logo-ultimato.svg" alt="Ultimato OAB 2026"/>'
      +'<div class="capture-title">Descubra o seu nível para a prova da OAB em 7 minutos.</div>'
      +'<div class="capture-sub">Informe seu e-mail e WhatsApp para receber o resultado completo e o plano de ação faltando 40 dias para a prova.</div>'
      +'<input id="cap-nome" class="capture-input" type="text" placeholder="Seu nome" autocomplete="name"/>'
      +'<input id="cap-email" class="capture-input" type="email" placeholder="seuemail@provedor.com" autocomplete="email" inputmode="email"/>'
      +'<input id="cap-phone" class="capture-input" type="tel" inputmode="numeric" placeholder="(00) 00000-0000" autocomplete="tel" oninput="fmtPhone(this)" maxlength="16"/>'
      +'<div id="cap-err" class="capture-err"></div>'
      +'<button class="action-btn btn-primary" style="width:100%;justify-content:center" onclick="startWithPhone()">Começar o quiz &#8594;</button>'
    +'</div>'
  +'</div>';
  const sp=document.getElementById('score-pill');if(sp)sp.textContent='';
}
function startWithPhone(){
  const email=(document.getElementById('cap-email').value||'').trim().toLowerCase();
  const phone=normalizePhone(document.getElementById('cap-phone').value);
  const err=document.getElementById('cap-err');
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){err.textContent='Digite um e-mail válido.';return;}
  if(!phone||phone.length<10){err.textContent='Digite um WhatsApp válido com DDD.';return;}
  identity.email=email;
  identity.phone=phone;
  identity.nome=document.getElementById('cap-nome').value.trim()||identity.nome;
  identity.source='fallback_form';
  startQuiz(); // quem preenche o formulário vai direto pras questões (sem a capa)
}

/* ── Tela de capa (todos passam por aqui antes de começar; o timer só inicia no play) ── */
function renderCover(){
  const root=document.getElementById('root');
  const nome=identity.nome?(', '+String(identity.nome).split(' ')[0]):'';
  root.innerHTML='<div class="cover-shell"><div class="cover-card">'
    +'<img class="capture-logo" src="/logo-ultimato.svg" alt="Ultimato OAB 2026"/>'
    +'<div class="cover-title">Diagnóstico OAB · 1ª Fase</div>'
    +'<div class="cover-sub">Bora descobrir como você está'+nome+'? São <b>20 questões</b> no estilo da banca para medir seu nível por matéria.</div>'
    +'<div class="cover-rules">'
      +'<div class="cover-rule">'+ic('list')+' 20 questões</div>'
      +'<div class="cover-rule">'+ic('clock')+' 7 minutos</div>'
      +'<div class="cover-rule">'+ic('circle-check')+' Gabarito + diagnóstico no final</div>'
    +'</div>'
    +'<button class="action-btn btn-primary cover-play" onclick="startQuiz()">'+ic('play')+' Começar agora</button>'
    +'<div class="cover-foot">O cronômetro de 7 minutos começa quando você tocar em começar.</div>'
  +'</div></div>';
  const sp=document.getElementById('score-pill');if(sp)sp.textContent='';
}
function startQuiz(){
  cur=0;score=0;ans=new Array(Q.length).fill(null);
  startTimer();
  render();
  window.scrollTo(0,0);
}

/* ── Boot ── */
function boot(){
  if(identity.manychat_id || identity.phone){ renderCover(); }
  else { renderCapture(); }
}
boot();
