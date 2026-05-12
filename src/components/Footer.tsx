import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ marginTop: '2rem', padding: '1.5rem 1rem', textAlign: 'center', opacity: 0.8 }}>
      <div className="container" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          © {new Date().getFullYear()} Guess The Review. Tous droits réservés.
        </p>
        <nav style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Confidentialité</Link>
          <Link href="/terms" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Conditions d'utilisation</Link>
          <Link href="/contact" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Contact</Link>
        </nav>
      </div>
    </footer>
  );
}