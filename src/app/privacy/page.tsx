export default function Privacy() {
  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '800px' }}>
      <h1 className="title">Politique de Confidentialité</h1>
      <div className="card" style={{ textAlign: 'left', lineHeight: '1.6' }}>
        <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
        
        <h3>1. Collecte de données</h3>
        <p>Guess The Review est un jeu gratuit. Nous ne collectons aucune donnée personnelle nominative directement lors de vos parties, à l'exception des pseudonymes que vous choisissez pour le mode multijoueur.</p>
        
        <h3>2. Cookies et Publicité</h3>
        <p>Nous utilisons des services tiers comme Google AdSense pour diffuser des publicités. Ces services peuvent utiliser des cookies pour diffuser des annonces basées sur vos visites précédentes sur ce site ou sur d'autres sites web.</p>
        
        <h3>3. Services tiers</h3>
        <p>Google utilise des cookies publicitaires qui lui permettent, ainsi qu'à ses partenaires, de diffuser des annonces en fonction de votre navigation sur notre site et/ou d'autres sites.</p>
        
        <h3>4. Contact</h3>
        <p>Pour toute question concernant cette politique, contactez-nous à : <strong>guessthereviewcontact@gmail.com</strong></p>
      </div>
      <a href="/" className="btn btn-primary" style={{ marginTop: '2rem' }}>Retour au jeu</a>
    </div>
  );
}
