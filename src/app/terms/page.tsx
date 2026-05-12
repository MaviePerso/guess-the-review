export default function Terms() {
  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '800px' }}>
      <h1 className="title">Conditions d'Utilisation</h1>
      <div className="card" style={{ textAlign: 'left', lineHeight: '1.6' }}>
        <h3>1. Acceptation des conditions</h3>
        <p>En accédant à Guess The Review, vous acceptez d'être lié par les présentes conditions d'utilisation.</p>
        <h3>2. Utilisation du service</h3>
        <p>Guess The Review est un service de divertissement. L'utilisateur s'engage à ne pas tenter de perturber le bon fonctionnement du site ou des serveurs de jeu.</p>
        <h3>3. Propriété intellectuelle</h3>
        <p>Le contenu du site, les logos et le code sont la propriété de MiraMayvi. Les images des produits appartiennent à leurs propriétaires respectifs (Amazon, BestBuy, etc.).</p>
        <h3>4. Limitation de responsabilité</h3>
        <p>Nous ne garantissons pas que le service sera ininterrompu ou sans erreur. Les prix affichés sont à titre indicatif et proviennent de données tierces.</p>
      </div>
      <a href="/" className="btn btn-primary" style={{ marginTop: '2rem' }}>Retour au jeu</a>
    </div>
  );
}