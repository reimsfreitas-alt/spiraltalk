export default function ApresentacaoPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#050505', color: '#f5f5f5', padding: '48px 24px', display: 'grid', placeItems: 'center' }}>
      <section style={{ width: 'min(980px, 100%)' }}>
        <p style={{ letterSpacing: '0.18em', fontSize: 12, opacity: 0.6 }}>SPIRAL TALK</p>
        <h1 style={{ fontSize: 'clamp(42px, 7vw, 84px)', fontWeight: 400, lineHeight: 0.98, margin: '18px 0' }}>Falar.<br /><em>Reorganizar.</em></h1>
        <p style={{ maxWidth: 680, fontSize: 18, lineHeight: 1.6, opacity: 0.72 }}>Quando tudo chega misturado, o Spiral ajuda você a enxergar o que realmente está acontecendo.</p>
        <div style={{ marginTop: 32, borderRadius: 20, overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,.1)' }}>
          <video src="https://spiral-talk-71z7j1.v2.appdeploy.ai/resources/apresentacao.mp4" controls playsInline preload="metadata" style={{ display: 'block', width: '100%' }} />
        </div>
        <p style={{ marginTop: 24, fontSize: 13, opacity: 0.5 }}>Spiral Talk · Spiral Codes</p>
      </section>
    </main>
  );
}
