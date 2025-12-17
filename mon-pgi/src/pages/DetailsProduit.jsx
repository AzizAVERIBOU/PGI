import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { chargerPanier, sauvegarderPanier, getNombreArticlesPanier, migrerAncienPanier } from '../utils/panierUtils';
import './DetailsProduit.css';

function DetailsProduit({ isAuthenticated }) {
  const { sku } = useParams();
  const navigate = useNavigate();
  const [produit, setProduit] = useState(null);
  const [quantite, setQuantite] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [nombreArticlesPanier, setNombreArticlesPanier] = useState(0);

  useEffect(() => {
    migrerAncienPanier();
    chargerProduit();
    mettreAJourCompteurPanier();
  }, [sku]);

  const mettreAJourCompteurPanier = () => {
    try {
      const total = getNombreArticlesPanier();
      setNombreArticlesPanier(total);
    } catch (error) {
      console.error('Erreur lors du chargement du panier:', error);
    }
  };

  // Fonction pour obtenir le chemin de l'image d'un produit
  const getImagePath = (nomProduit) => {
    if (!nomProduit) return null;
    // Le nom du fichier image correspond exactement au nom du produit + .png
    return `/image/${nomProduit}.png`;
  };

  // Transformer les données de l'API vers le format utilisé dans le composant
  const transformerProduitAPI = (produitAPI) => {
    return {
      code: produitAPI.sku,
      sku: produitAPI.sku,
      nom: produitAPI.nomProduit || produitAPI.nom_produit,
      categorie: produitAPI.categorie,
      quantite: produitAPI.quantiteStock || produitAPI.quantite_stock || 0,
      prixVente: produitAPI.prixVente || produitAPI.prix_vente,
      coutAchat: produitAPI.coutAchat || produitAPI.cout_achat,
      margeBrute: produitAPI.margeBrute || produitAPI.marge_brute,
      seuilReappro: produitAPI.seuilReappro || produitAPI.seuil_reappro || 0,
      stockSecurite: produitAPI.stockSecurite || produitAPI.stock_securite || 0,
      statut: produitAPI.statut || 'Actif',
      description: `${produitAPI.nomProduit || produitAPI.nom_produit} - ${produitAPI.categorie}`,
      fournisseurNom: produitAPI.fournisseurNom || produitAPI.fournisseur_nom,
      fournisseurCode: produitAPI.fournisseurCode || produitAPI.fournisseur_code,
      poidsKg: produitAPI.poidsKg || produitAPI.poids_kg,
      delaiLivraisonJours: produitAPI.delaiLivraisonJours || produitAPI.delai_livraison_jours,
      emplacementEntrepot: produitAPI.emplacementEntrepot || produitAPI.emplacement_entrepot,
      dateEntreeStock: produitAPI.dateEntreeStock || produitAPI.date_entree_stock
    };
  };

  const chargerProduit = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`http://localhost:5000/api/ControllerProduit/${sku}`, {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const produitTransforme = transformerProduitAPI(data);
        setProduit(produitTransforme);
      } else if (response.status === 404) {
        setError('Produit non trouvé');
      } else {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du produit:', error);
      
      // Message d'erreur plus spécifique selon le type d'erreur
      let messageErreur = 'Impossible de charger le produit.';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        messageErreur = 'Le serveur backend n\'est pas accessible. Veuillez vérifier que le serveur est démarré sur http://localhost:5000';
      } else if (error.message) {
        messageErreur = `Erreur: ${error.message}`;
      }
      
      setError(messageErreur);
    } finally {
      setIsLoading(false);
    }
  };

  const modifierQuantite = (delta) => {
    const nouvelleQuantite = quantite + delta;
    if (nouvelleQuantite >= 1 && nouvelleQuantite <= (produit?.quantite || 999)) {
      setQuantite(nouvelleQuantite);
    }
  };

  const ajouterAuPanier = () => {
    if (!produit) return;

    try {
      let panier = chargerPanier();
      
      // Vérifier si le produit existe déjà
      const index = panier.findIndex(item => item.code === produit.code || item.sku === produit.sku);
      
      if (index !== -1) {
        // Augmenter la quantité
        panier[index].quantite += quantite;
      } else {
        // Ajouter le produit avec la quantité choisie
        panier.push({ ...produit, quantite: quantite });
      }
      
      sauvegarderPanier(panier);
      mettreAJourCompteurPanier();
      alert(`${quantite} x ${produit.nom} ajouté${quantite > 1 ? 's' : ''} au panier !`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout au panier:', error);
      alert('Erreur lors de l\'ajout au panier');
    }
  };

  if (isLoading) {
    return (
      <div className="details-produit-page">
        <div className="loading-message">
          <p>Chargement des détails du produit...</p>
        </div>
      </div>
    );
  }

  if (error || !produit) {
    return (
      <div className="details-produit-page">
        <div className="error-message">
          <p>❌ {error || 'Produit non trouvé'}</p>
          <Link to="/" className="btn-retour">
            ← Retour à la boutique
          </Link>
        </div>
      </div>
    );
  }

  const prixTotal = (produit.prixVente * quantite).toFixed(2);
  const tps = (produit.prixVente * quantite * 0.05).toFixed(2);
  const tvq = (produit.prixVente * quantite * 0.09975).toFixed(2);
  const totalAvecTaxes = (parseFloat(prixTotal) + parseFloat(tps) + parseFloat(tvq)).toFixed(2);

  return (
    <div className="details-produit-page">
      {/* Header */}
      <header className="details-header">
        <div className="details-header-content">
          <Link to="/" className="back-link">
            ← Retour à la boutique
          </Link>
          <div className="details-logo">
            <h1>🔰 Nordik Adventures</h1>
          </div>
          <nav className="details-nav">
            <Link to="/panier" className="nav-link nav-link-panier">
              🛒 Panier {nombreArticlesPanier > 0 && <span className="panier-badge">{nombreArticlesPanier}</span>}
            </Link>
            <Link to={isAuthenticated ? "/compte" : "/connexion"} className="nav-link nav-link-compte">
              👤 Mon compte
            </Link>
            {!isAuthenticated && (
              <>
                <Link to="/connexion" className="nav-link">Connexion</Link>
                <Link to="/inscription" className="nav-link nav-link-primary">S'inscrire</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="details-main">
        <div className="details-container">
          <div className="details-content">
            {/* Image et informations principales */}
            <div className="details-left">
              <div className="product-image-large">
                <img 
                  src={getImagePath(produit.nom)} 
                  alt={produit.nom}
                  onError={(e) => {
                    // Fallback vers placeholder si l'image ne charge pas
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex';
                    }
                  }}
                />
                <span style={{ display: 'none' }}>📦</span>
                <div className="product-badge">{produit.categorie}</div>
              </div>
              
              <div className="product-stock-info">
                {produit.quantite > 0 ? (
                  <div className="stock-available-large">
                    <span className="stock-icon">✓</span>
                    <div>
                      <strong>En stock</strong>
                      <p>{produit.quantite} unité{produit.quantite > 1 ? 's' : ''} disponible{produit.quantite > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ) : (
                  <div className="stock-unavailable-large">
                    <span className="stock-icon">✗</span>
                    <div>
                      <strong>Rupture de stock</strong>
                      <p>Ce produit n'est actuellement pas disponible</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Détails et actions */}
            <div className="details-right">
              <div className="product-header">
                <h1 className="product-title">{produit.nom}</h1>
                <p className="product-sku">SKU: {produit.sku}</p>
              </div>

              <div className="product-price-section">
                <div className="price-main">
                  <span className="price-amount">{produit.prixVente.toFixed(2)} $</span>
                  <span className="price-unit">/ unité</span>
                </div>
                {produit.margeBrute && (
                  <p className="price-note">Marge brute: {(produit.margeBrute * 100).toFixed(1)}%</p>
                )}
              </div>

              {/* Sélection de quantité */}
              <div className="quantity-section">
                <label>Quantité :</label>
                <div className="quantity-selector">
                  <button 
                    className="quantity-btn" 
                    onClick={() => modifierQuantite(-1)}
                    disabled={quantite <= 1}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={produit.quantite}
                    value={quantite}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      if (val >= 1 && val <= produit.quantite) {
                        setQuantite(val);
                      }
                    }}
                    className="quantity-input"
                  />
                  <button 
                    className="quantity-btn" 
                    onClick={() => modifierQuantite(1)}
                    disabled={quantite >= produit.quantite}
                  >
                    +
                  </button>
                </div>
                <p className="quantity-hint">
                  Maximum disponible : {produit.quantite} unité{produit.quantite > 1 ? 's' : ''}
                </p>
              </div>

              {/* Résumé du prix */}
              <div className="price-summary">
                <div className="summary-line">
                  <span>Sous-total ({quantite} x {produit.prixVente.toFixed(2)} $)</span>
                  <span>{prixTotal} $</span>
                </div>
                <div className="summary-line">
                  <span>TPS (5%)</span>
                  <span>{tps} $</span>
                </div>
                <div className="summary-line">
                  <span>TVQ (9.975%)</span>
                  <span>{tvq} $</span>
                </div>
                <div className="summary-separator"></div>
                <div className="summary-line summary-total">
                  <span>Total</span>
                  <span>{totalAvecTaxes} $</span>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="action-buttons">
                <button 
                  className="btn-add-cart"
                  onClick={ajouterAuPanier}
                  disabled={produit.quantite === 0}
                >
                  🛒 Ajouter au panier ({quantite})
                </button>
                <Link to="/" className="btn-continue-shopping">
                  Continuer mes achats
                </Link>
              </div>

              {/* Informations détaillées */}
              <div className="product-details-section">
                <h3>Détails du produit</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Catégorie</span>
                    <span className="detail-value">{produit.categorie}</span>
                  </div>
                  {produit.fournisseurNom && (
                    <div className="detail-item">
                      <span className="detail-label">Fournisseur</span>
                      <span className="detail-value">{produit.fournisseurNom}</span>
                    </div>
                  )}
                  {produit.poidsKg && (
                    <div className="detail-item">
                      <span className="detail-label">Poids</span>
                      <span className="detail-value">{produit.poidsKg} kg</span>
                    </div>
                  )}
                  {produit.delaiLivraisonJours && (
                    <div className="detail-item">
                      <span className="detail-label">Délai de livraison</span>
                      <span className="detail-value">{produit.delaiLivraisonJours} jour{produit.delaiLivraisonJours > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {produit.emplacementEntrepot && (
                    <div className="detail-item">
                      <span className="detail-label">Emplacement entrepôt</span>
                      <span className="detail-value">{produit.emplacementEntrepot}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="product-description-section">
                <h3>Description</h3>
                <p>{produit.description || `Produit de qualité ${produit.categorie} pour vos aventures en plein air.`}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="details-footer">
        <div className="details-footer-content">
          <p>&copy; 2025 Nordik Adventures - Tous droits réservés</p>
          <p>Votre partenaire pour l'aventure en plein air</p>
        </div>
      </footer>
    </div>
  );
}

export default DetailsProduit;

