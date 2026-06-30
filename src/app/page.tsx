import Script from "next/script";

export default function Home() {
  return (
    <>
      <header>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-logo" src="/logo-ultimato.svg" alt="Ultimato OAB 2026" />
        <div className="spacer" />
        <div className="score-pill" id="score-pill">
          0 / 0
        </div>
      </header>

      {/* O motor do quiz (public/quiz-engine.js) renderiza dentro de #root
          e, ao final, envia as respostas para /api/submit. */}
      <div id="root" />
      <div id="pdf-content" className="print-only" />

      {/* html2pdf é carregado sob demanda (só ao clicar em baixar PDF) — ver gerarPDF() */}
      <Script src="/quiz-engine.js" strategy="afterInteractive" />
    </>
  );
}
