import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './Confirmation.css';

function Confirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [commandeInfo, setCommandeInfo] = useState(null);

  useEffect(() => {
    // Récupérer les informations de la commande depuis location.state ou localStorage
    const stateCommande = location.state;
    const localCommande = localStorage.getItem('derniereCommande');

    if (stateCommande && stateCommande.numeroCommande) {
      setCommandeInfo({
        numeroCommande: stateCommande.numeroCommande,
        montantTotal: stateCommande.montantTotal,
        dateCommande: new Date().toISOString()
      });
    } else if (localCommande) {
      try {
        const commande = JSON.parse(localCommande);
        setCommandeInfo(commande);
      } catch (error) {
        console.error('Erreur lors du parsing de la commande:', error);
      }
    } else {
      // Pas de commande trouvée, rediriger vers la boutique
      navigate('/');
    }
  }, [location, navigate]);

  if (!commandeInfo) {
    return (
      <div className="confirmation-page">
        <div className="loading-message">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  const dateFormatee = new Date(commandeInfo.dateCommande).toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="confirmation-page">
      {/* Header */}
      <header className="confirmation-header">
        <div className="confirmation-header-content">
          <div className="confirmation-logo">
            <h1>🔰 Nordik Adventures</h1>
          </div>
          <nav className="confirmation-nav">
            <Link to="/" className="nav-link">Accueil</Link>
            <Link to="/vitrine" className="nav-link">Boutique</Link>
          </nav>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="confirmation-main">
        <div className="confirmation-container">
          <div className="confirmation-success">
            <div className="success-icon">✅</div>
            <h2>Commande confirmée !</h2>
            <p className="success-message">
              Merci pour votre achat ! Votre commande a été enregistrée avec succès.
            </p>
          </div>

          <div className="confirmation-details">
            <div className="detail-card">
              <h3>📦 Détails de la commande</h3>
              <div className="detail-row">
                <span className="detail-label">Numéro de commande:</span>
                <span className="detail-value">{commandeInfo.numeroCommande}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{dateFormatee}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Montant total:</span>
                <span className="detail-value total-amount">
                  {parseFloat(commandeInfo.montantTotal).toFixed(2)} $
                </span>
              </div>
            </div>

            <div className="info-card">
              <h3>📧 Prochaines étapes</h3>
              <ul className="steps-list">
                <li>
                  <strong>Email de confirmation</strong>
                  <p>Un email de confirmation vous sera envoyé sous peu avec tous les détails de votre commande.</p>
                </li>
                <li>
                  <strong>Préparation de la commande</strong>
                  <p>Notre équipe va préparer votre commande et vous contactera si nécessaire.</p>
                </li>
                <li>
                  <strong>Livraison</strong>
                  <p>Vous recevrez un email avec les informations de suivi dès que votre commande sera expédiée.</p>
                </li>
              </ul>
            </div>

            <div className="actions-card">
              <h3>🔍 Suivre votre commande</h3>
              <p>Vous pouvez consulter l'état de votre commande dans votre compte client.</p>
              <div className="action-buttons">
                <Link to="/compte" className="btn-compte">
                  Voir mes commandes
                </Link>
                <Link to="/vitrine" className="btn-continuer">
                  Continuer mes achats
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="confirmation-footer">
        <div className="confirmation-footer-content">
          <p>&copy; 2025 Nordik Adventures - Tous droits réservés</p>
          <p>Merci de votre confiance !</p>
        </div>
      </footer>
    </div>
  );
}

export default Confirmation;

