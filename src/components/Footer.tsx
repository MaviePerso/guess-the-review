import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ marginTop: '3rem', padding: '2rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', textAlign: 'center' }}>
      <div className="container">
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          © {new Date().getFullYear()} Guess The Review. Tous droits réservés.
        </p>
        <nav style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '500' }}>Confidentialité</Link>
          <Link href="/terms" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '500' }}>Conditions d'utilisation</Link>
          <Link href="/contact" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '500' }}>Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
