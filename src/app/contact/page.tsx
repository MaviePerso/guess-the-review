export default function Contact() {
  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '600px', textAlign: 'center' }}>
      <h1 className="title">Contactez-nous</h1>
      <div className="card">
        <p style={{ marginBottom: '2rem' }}>Une question, un bug ou une suggestion ? N'hésitez pas à nous contacter.</p>
        <div style={{ padding: '1.5rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', border: '1px solid var(--primary)' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>guessthereviewcontact@gmail.com</p>
        </div>
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nous essayons de répondre sous 48h.</p>
      </div>
      <a href="/" className="btn btn-primary" style={{ marginTop: '2rem' }}>Retour au jeu</a>
    </div>
  );
}