import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { chargerPanier as chargerPanierUtil, sauvegarderPanier as sauvegarderPanierUtil, migrerAncienPanier } from '../utils/panierUtils';
import './Panier.css';

function Panier() {
  const [panier, setPanier] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [imageZoom, setImageZoom] = useState(null); // État pour l'image agrandie

  // Charger le panier depuis localStorage
  useEffect(() => {
    // Migrer l'ancien panier (ne fait rien pour les invités)
    migrerAncienPanier();
    // Charger le panier de l'utilisateur actuel (vide pour les invités si aucun article ajouté)
    chargerPanierLocal();
  }, []);

  // Fermer le modal avec la touche Escape
  useEffect(() => {
    if (!imageZoom) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        fermerImageZoom();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [imageZoom]);

  // Fonction pour obtenir le chemin de l'image d'un produit
  const getImagePath = (nomProduit) => {
    if (!nomProduit) return null;
    // Le nom du fichier image correspond exactement au nom du produit + .png
    return `/image/${nomProduit}.png`;
  };

  // Fonction pour ouvrir l'image en grand
  const ouvrirImageZoom = (nomProduit) => {
    const imagePath = getImagePath(nomProduit);
    if (imagePath) {
      setImageZoom({ nom: nomProduit, path: imagePath });
    }
  };

  // Fonction pour fermer l'image agrandie
  const fermerImageZoom = () => {
    setImageZoom(null);
  };

  const chargerPanierLocal = () => {
    setIsLoading(true);
    try {
      const panierCharge = chargerPanierUtil();
      setPanier(panierCharge);
    } catch (error) {
      console.error('Erreur lors du chargement du panier:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sauvegarderPanierLocal = (nouveauPanier) => {
    sauvegarderPanierUtil(nouveauPanier);
    setPanier(nouveauPanier);
  };

  const modifierQuantite = (code, nouvelleQuantite) => {
    if (nouvelleQuantite < 1) return;
    
    const panierMisAJour = panier.map(item =>
      item.code === code ? { ...item, quantite: nouvelleQuantite } : item
    );
    sauvegarderPanierLocal(panierMisAJour);
  };

  const retirerDuPanier = (code) => {
    const panierMisAJour = panier.filter(item => item.code !== code);
    sauvegarderPanierLocal(panierMisAJour);
  };

  const viderPanier = () => {
    if (window.confirm('Voulez-vous vraiment vider le panier ?')) {
      sauvegarderPanierLocal([]);
    }
  };

  // Calculs
  const sousTotal = panier.reduce((total, item) => total + (item.prixVente * item.quantite), 0);
  const tps = sousTotal * 0.05;
  const tvq = sousTotal * 0.09975;
  const total = sousTotal + tps + tvq;
  const nombreArticles = panier.reduce((total, item) => total + item.quantite, 0);

  return (
    <div className="panier-page">
      {/* Header */}
      <header className="panier-header">
        <div className="panier-header-content">
          <Link to="/" className="back-link">
            ← Retour à la boutique
          </Link>
          <div className="panier-logo">
            <h1>🔰 Nordik Adventures</h1>
          </div>
          <nav className="panier-nav">
            <Link to="/connexion" className="nav-link">Connexion</Link>
            <Link to="/inscription" className="nav-link nav-link-primary">S'inscrire</Link>
          </nav>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="panier-main">
        <div className="panier-container">
          <div className="panier-title-section">
            <h2>🛒 Mon Panier</h2>
            {panier.length > 0 && (
              <p className="panier-count">{nombreArticles} article{nombreArticles > 1 ? 's' : ''}</p>
            )}
          </div>

          {isLoading ? (
            <div className="loading-message">
              <p>Chargement du panier...</p>
            </div>
          ) : panier.length === 0 ? (
            <div className="panier-vide">
              <div className="panier-vide-icon">🛒</div>
              <h3>Votre panier est vide</h3>
              <p>Découvrez nos produits et ajoutez-les à votre panier</p>
              <Link to="/" className="btn-continuer">
                Continuer mes achats
              </Link>
            </div>
          ) : (
            <div className="panier-content">
              {/* Liste des articles */}
              <div className="panier-articles">
                <div className="panier-articles-header">
                  <h3>Articles</h3>
                  <button onClick={viderPanier} className="btn-vider">
                    Vider le panier
                  </button>
                </div>

                <div className="articles-list">
                  {panier.map(item => (
                    <div key={item.code} className="article-item">
                      <div 
                        className="article-image"
                        onClick={() => ouvrirImageZoom(item.nom)}
                        style={{ cursor: 'pointer' }}
                        title="Cliquez pour agrandir"
                      >
                        <img 
                          src={getImagePath(item.nom)} 
                          alt={item.nom}
                          onError={(e) => {
                            // Fallback vers placeholder si l'image ne charge pas
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                        <span style={{ display: 'none' }}>📦</span>
                      </div>
                      <div className="article-info">
                        <h4>{item.nom}</h4>
                        <p className="article-categorie">{item.categorie}</p>
                        <p className="article-prix-unitaire">
                          {item.prixVente.toFixed(2)} $ / unité
                        </p>
                      </div>
                      <div className="article-quantite">
                        <button
                          onClick={() => modifierQuantite(item.code, item.quantite - 1)}
                          className="btn-quantite"
                          disabled={item.quantite <= 1}
                        >
                          −
                        </button>
                        <span className="quantite-value">{item.quantite}</span>
                        <button
                          onClick={() => modifierQuantite(item.code, item.quantite + 1)}
                          className="btn-quantite"
                        >
                          +
                        </button>
                      </div>
                      <div className="article-prix-total">
                        {(item.prixVente * item.quantite).toFixed(2)} $
                      </div>
                      <button
                        onClick={() => retirerDuPanier(item.code)}
                        className="btn-retirer"
                        title="Retirer du panier"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Résumé de la commande */}
              <div className="panier-resume">
                <h3>Résumé de la commande</h3>
                
                <div className="resume-ligne">
                  <span>Sous-total</span>
                  <span>{sousTotal.toFixed(2)} $</span>
                </div>
                
                <div className="resume-ligne">
                  <span>TPS (5%)</span>
                  <span>{tps.toFixed(2)} $</span>
                </div>
                
                <div className="resume-ligne">
                  <span>TVQ (9.975%)</span>
                  <span>{tvq.toFixed(2)} $</span>
                </div>
                
                <div className="resume-separateur"></div>
                
                <div className="resume-ligne resume-total">
                  <span>Total</span>
                  <span>{total.toFixed(2)} $</span>
                </div>

                <Link to="/paiement" className="btn-commander">
                  Passer la commande
                </Link>

                <Link to="/" className="btn-continuer-achats">
                  Continuer mes achats
                </Link>

                <div className="resume-info">
                  <p>💳 Paiement sécurisé</p>
                  <p>🚚 Livraison gratuite dès 100$</p>
                  <p>↩️ Retours sous 30 jours</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="panier-footer">
        <div className="panier-footer-content">
          <p>&copy; 2025 Nordik Adventures - Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
}

export default Panier;

