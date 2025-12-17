import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { chargerPanier, sauvegarderPanier, getNombreArticlesPanier, migrerAncienPanier } from '../utils/panierUtils';
import './Vitrine.css';

function Vitrine({ isAuthenticated }) {
  const [produits, setProduits] = useState([]);
  const [produitsFiltres, setProduitsFiltres] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [categorieFiltre, setCategorieFiltre] = useState('Tous');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [nombreArticlesPanier, setNombreArticlesPanier] = useState(0);
  const [imageZoom, setImageZoom] = useState(null); // État pour l'image agrandie
  const [heroSlideIndex, setHeroSlideIndex] = useState(0); // Index du slide du hero
  
  // Référence pour éviter les appels multiples
  const isChargingRef = useRef(false);

  // Mémoriser la fonction de mise à jour du compteur panier
  const mettreAJourCompteurPanier = useCallback(() => {
    try {
      const total = getNombreArticlesPanier();
      setNombreArticlesPanier(total);
    } catch (error) {
      console.error('Erreur lors du chargement du panier:', error);
    }
  }, []);

  // Migrer l'ancien panier lors du montage du composant
  useEffect(() => {
    migrerAncienPanier();
    mettreAJourCompteurPanier();
  }, [mettreAJourCompteurPanier]);

  // Recharger les produits si la catégorie change (optionnel - pour filtrage côté serveur)
  // Pour l'instant, on garde le filtrage côté client
  // useEffect(() => {
  //   if (categorieFiltre !== 'Tous') {
  //     chargerProduits(categorieFiltre);
  //   } else {
  //     chargerProduits();
  //   }
  // }, [categorieFiltre]);

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
    // Normaliser le nom (supprimer les espaces en début/fin)
    const nomNormalise = nomProduit.trim();
    const chemin = `/image/${nomNormalise}.png`;
    console.log(`Chemin image généré pour "${nomProduit}": ${chemin}`);
    return chemin;
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

  // Fonction pour générer une phrase incitative basée sur le produit
  const genererPhraseIncitative = useCallback((produit) => {
    const nom = produit.nom.toLowerCase();
    const categorie = produit.categorie.toLowerCase();
    
    // Phrases pour les tentes
    if (nom.includes('tente')) {
      return "Ne perdez plus jamais votre chemin grâce à un abri sûr et confortable !";
    }
    
    // Phrases pour les abris
    if (nom.includes('abri')) {
      return "Profitez de vos repas en plein air, même sous la pluie !";
    }
    
    // Phrases pour les sacs à dos
    if (nom.includes('sac') && nom.includes('dos')) {
      return "Aventurez-vous plus loin avec un sac qui vous suit partout !";
    }
    
    // Phrases pour les boussoles
    if (nom.includes('boussole')) {
      return "Ne perdez plus jamais votre chemin grâce à une navigation précise !";
    }
    
    // Phrases pour les montres GPS
    if (nom.includes('gps') || nom.includes('montre')) {
      return "Explorez en toute sécurité avec un GPS fiable à votre poignet !";
    }
    
    // Phrases pour les lampes
    if (nom.includes('lampe')) {
      return "Éclairez vos nuits d'aventure avec une lumière puissante et durable !";
    }
    
    // Phrases pour les chargeurs solaires
    if (nom.includes('chargeur') || nom.includes('solaire')) {
      return "Restez connecté même en pleine nature grâce à l'énergie solaire !";
    }
    
    // Phrases pour les tapis
    if (nom.includes('tapis')) {
      return "Dormez confortablement même sur le sol le plus dur !";
    }
    
    // Phrases pour les sacs de couchage
    if (nom.includes('couchage')) {
      return "Passez des nuits chaudes et reposantes, même par grand froid !";
    }
    
    // Phrases pour les toiles imperméables
    if (nom.includes('toile') || nom.includes('imperméable')) {
      return "Restez au sec peu importe les conditions météo !";
    }
    
    // Phrases pour les radios
    if (nom.includes('radio')) {
      return "Soyez informé des conditions météo en temps réel !";
    }
    
    // Phrases pour les bâtons de marche
    if (nom.includes('bâton') || nom.includes('baton')) {
      return "Marchez plus loin et plus confortablement avec un support fiable !";
    }
    
    // Phrases pour les mâts
    if (nom.includes('mât') || nom.includes('mat')) {
      return "Érigez votre campement rapidement et facilement !";
    }
    
    // Phrases pour les housses
    if (nom.includes('housse')) {
      return "Protégez votre équipement des intempéries !";
    }
    
    // Phrase générique par catégorie
    if (categorie.includes('tentes') || categorie.includes('abris')) {
      return "Créez votre espace de vie en pleine nature !";
    }
    
    if (categorie.includes('navigation') || categorie.includes('orientation')) {
      return "Explorez en toute confiance avec un équipement de navigation fiable !";
    }
    
    if (categorie.includes('éclairage') || categorie.includes('lampe')) {
      return "Éclairez vos aventures avec un éclairage performant !";
    }
    
    // Phrase par défaut
    return "Découvrez l'aventure qui vous attend avec cet équipement de qualité !";
  }, []);

  // Images pour le carousel du hero (utiliser tous les produits)
  const heroImages = useMemo(() => {
    if (produits.length > 0) {
      const images = produits.map(produit => {
        const imagePath = getImagePath(produit.nom);
        console.log(`Hero image pour "${produit.nom}": ${imagePath}`);
        return {
          nom: produit.nom,
          imagePath: imagePath
        };
      }).filter(item => item.imagePath !== null); // Filtrer les produits sans image
      console.log('Hero images préparées:', images);
      return images;
    }
    return [];
  }, [produits]);

  // Auto-défilement du carousel
  useEffect(() => {
    if (heroImages.length === 0) return;
    
    const interval = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000); // Change toutes les 5 secondes

    return () => clearInterval(interval);
  }, [heroImages.length]);

  // Transformer les données de l'API vers le format utilisé dans le composant
  const transformerProduitAPI = useCallback((produitAPI) => {
    return {
      code: produitAPI.sku, // Utiliser SKU comme code unique
      sku: produitAPI.sku,
      nom: produitAPI.nomProduit,
      categorie: produitAPI.categorie,
      quantite: produitAPI.quantiteStock || 0,
      prixVente: produitAPI.prixVente,
      coutAchat: produitAPI.coutAchat,
      margeBrute: produitAPI.margeBrute,
      seuilReappro: produitAPI.seuilReappro || 0,
      stockSecurite: produitAPI.stockSecurite || 0,
      statut: produitAPI.statut || 'Actif',
      description: `${produitAPI.nomProduit} - ${produitAPI.categorie}`,
      // Données supplémentaires de l'API
      fournisseurNom: produitAPI.fournisseurNom,
      fournisseurCode: produitAPI.fournisseurCode,
      poidsKg: produitAPI.poidsKg,
      delaiLivraisonJours: produitAPI.delaiLivraisonJours,
      emplacementEntrepot: produitAPI.emplacementEntrepot
    };
  }, []);

  const ajouterAuPanier = (produit) => {
    try {
      let panier = chargerPanier();
      
      // Vérifier si le produit existe déjà (par SKU/code)
      const index = panier.findIndex(item => item.code === produit.code || item.sku === produit.sku);
      
      if (index !== -1) {
        // Augmenter la quantité
        panier[index].quantite += 1;
      } else {
        // Ajouter le produit
        panier.push({ ...produit, quantite: 1 });
      }
      
      sauvegarderPanier(panier);
      mettreAJourCompteurPanier();
      alert(`${produit.nom} ajouté au panier !`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout au panier:', error);
      alert('Erreur lors de l\'ajout au panier');
    }
  };

  const chargerProduits = useCallback(async (categorieFiltreAPI = null) => {
    // Éviter les appels multiples simultanés
    if (isChargingRef.current) {
      console.log('Chargement déjà en cours, ignoré');
      return;
    }

    isChargingRef.current = true;
    setIsLoading(true);
    setError('');
    
    try {
      // Construire l'URL avec filtre de catégorie si spécifié
      let apiUrl = 'http://localhost:5000/api/ControllerProduit';
      if (categorieFiltreAPI && categorieFiltreAPI !== 'Tous') {
        // Encoder la catégorie pour l'URL
        const categorieEncodee = encodeURIComponent(categorieFiltreAPI);
        apiUrl += `?categorie=${categorieEncodee}`;
      }

      console.log('Chargement des produits depuis:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        }
      });

      console.log('Réponse API:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('Données reçues de l\'API:', data);
        
        // Vérifier que c'est un tableau
        if (!Array.isArray(data)) {
          throw new Error('Format de réponse invalide: attendu un tableau');
        }

        // Transformer les données de l'API vers le format du composant
        const produitsTransformes = data
          .map(produitAPI => transformerProduitAPI(produitAPI))
          // Filtrer seulement les produits actifs avec stock disponible
          .filter(p => p.statut === 'Actif' && p.quantite > 0);

        console.log('Produits transformés:', produitsTransformes);
        
        setProduits(produitsTransformes);
        setProduitsFiltres(produitsTransformes);
        setError(''); // Réinitialiser l'erreur en cas de succès
      } else {
        const errorText = await response.text();
        console.error('Erreur API:', response.status, errorText);
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      
      // Message d'erreur plus spécifique selon le type d'erreur
      let messageErreur = 'Impossible de charger les produits.';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        messageErreur = 'Le serveur backend n\'est pas accessible. Veuillez vérifier que le serveur est démarré sur http://localhost:5000';
      } else if (error.message) {
        messageErreur = `Erreur: ${error.message}`;
      }
      
      setError(messageErreur);
      
      // En cas d'erreur, on peut garder les produits déjà chargés ou afficher un message
      // Ne pas utiliser de données de démonstration pour forcer l'utilisation de l'API
      setProduitsFiltres(prev => prev.length === 0 ? [] : prev);
    } finally {
      setIsLoading(false);
      isChargingRef.current = false;
    }
  }, [transformerProduitAPI]);

  // Charger les produits depuis le backend au montage du composant
  useEffect(() => {
    chargerProduits();
    mettreAJourCompteurPanier();
  }, [chargerProduits, mettreAJourCompteurPanier]);

  // Filtrer les produits
  useEffect(() => {
    let filtres = produits;

    // Filtre par catégorie
    if (categorieFiltre !== 'Tous') {
      filtres = filtres.filter(p => p.categorie === categorieFiltre);
    }

    // Filtre par recherche
    if (recherche.trim()) {
      const rechercheLower = recherche.toLowerCase();
      filtres = filtres.filter(p =>
        p.nom.toLowerCase().includes(rechercheLower) ||
        p.description?.toLowerCase().includes(rechercheLower) ||
        p.categorie.toLowerCase().includes(rechercheLower) ||
        p.sku?.toLowerCase().includes(rechercheLower)
      );
    }

    setProduitsFiltres(filtres);
  }, [recherche, categorieFiltre, produits]);

  // Obtenir les catégories uniques
  const categories = ['Tous', ...new Set(produits.map(p => p.categorie))];

  return (
    <div className="vitrine-page">
      {/* Header */}
      <header className="vitrine-header">
        <div className="vitrine-header-content">
          <div className="vitrine-logo">
            <h1>🔰 Nordik Adventures</h1>
            <p>Équipement de plein air de qualité</p>
          </div>
          <nav className="vitrine-nav">
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

      {/* Hero Section avec Carousel */}
      <section className="vitrine-hero">
        {heroImages.length > 0 ? (
          <div className="hero-carousel">
            {heroImages.map((heroItem, index) => (
              <div 
                key={index}
                className={`hero-slide ${index === heroSlideIndex ? 'active' : ''}`}
              >
                <img 
                  src={heroItem.imagePath} 
                  alt={heroItem.nom}
                  className="hero-slide-img"
                  onError={(e) => {
                    console.error(`Erreur de chargement de l'image: ${heroItem.imagePath}`);
                    // Si l'image ne charge pas, masquer le slide
                    if (e.target.parentElement) {
                      e.target.parentElement.style.display = 'none';
                    }
                  }}
                  onLoad={() => {
                    console.log(`Image chargée avec succès: ${heroItem.imagePath}`);
                  }}
                />
                <div className="hero-slide-overlay"></div>
              </div>
            ))}
            
            {/* Indicateurs de slide */}
            <div className="hero-indicators">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  className={`hero-indicator ${index === heroSlideIndex ? 'active' : ''}`}
                  onClick={() => setHeroSlideIndex(index)}
                  aria-label={`Aller au slide ${index + 1}`}
                />
              ))}
            </div>
            
            {/* Boutons de navigation */}
            <button 
              className="hero-nav hero-nav-prev"
              onClick={() => setHeroSlideIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length)}
              aria-label="Slide précédent"
            >
              ‹
            </button>
            <button 
              className="hero-nav hero-nav-next"
              onClick={() => setHeroSlideIndex((prev) => (prev + 1) % heroImages.length)}
              aria-label="Slide suivant"
            >
              ›
            </button>
          </div>
        ) : (
          <div className="hero-carousel hero-carousel-loading">
            <div className="hero-slide">
              <div className="hero-slide-overlay"></div>
            </div>
          </div>
        )}
      </section>

      {/* Filtres et recherche */}
      <section className="vitrine-filters">
        <div className="vitrine-filters-content">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Rechercher un produit..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-btn ${categorieFiltre === cat ? 'active' : ''}`}
                onClick={() => setCategorieFiltre(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Liste des produits */}
      <main className="vitrine-main">
        <div className="vitrine-container">
          {isLoading ? (
            <div className="loading-message">
              <p>Chargement des produits...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <p>❌ {error}</p>
              <button 
                onClick={() => chargerProduits()} 
                className="btn-retry"
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
              >
                🔄 Réessayer
              </button>
            </div>
          ) : produitsFiltres.length === 0 ? (
            <div className="no-products">
              <p>Aucun produit trouvé.</p>
            </div>
          ) : (
            <>
              <div className="products-count">
                <p>{produitsFiltres.length} produit{produitsFiltres.length > 1 ? 's' : ''} trouvé{produitsFiltres.length > 1 ? 's' : ''}</p>
              </div>
              <div className="products-grid">
                {produitsFiltres.map(produit => (
                  <div key={produit.code} className="product-card">
                    <div 
                      className="product-image-placeholder"
                      onClick={() => ouvrirImageZoom(produit.nom)}
                      style={{ cursor: 'pointer' }}
                      title="Cliquez pour agrandir"
                    >
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
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{produit.nom}</h3>
                      <div className="product-category-badge">{produit.categorie}</div>
                      {produit.description && (
                        <p className="product-description">{produit.description}</p>
                      )}
                      <div className="product-details">
                        <div className="product-stock">
                          {produit.quantite > 0 ? (
                            <>
                              <span className="stock-available">✓ En stock ({produit.quantite})</span>
                              {/* ⭐ PHASE 4 : Afficher alerte si stock limité */}
                              {produit.quantite <= (produit.seuilReappro || 0) && (
                                <span className="stock-alert" style={{ 
                                  display: 'block', 
                                  color: '#f39c12', 
                                  fontSize: '0.85rem', 
                                  marginTop: '0.25rem',
                                  fontWeight: 'bold'
                                }}>
                                  ⚠️ Stock limité
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="stock-unavailable">✗ Rupture de stock</span>
                          )}
                        </div>
                        <div className="product-price">
                          {produit.prixVente.toFixed(2)} $
                        </div>
                      </div>
                      <div className="product-actions">
                        <Link 
                          to={`/produit/${produit.sku}`}
                          className="product-btn product-btn-details"
                        >
                           Voir détails
                        </Link>
                        <button 
                          className={`product-btn product-btn-cart ${produit.quantite <= 0 ? 'disabled' : ''}`}
                          onClick={() => ajouterAuPanier(produit)}
                          disabled={produit.quantite <= 0}
                          title={produit.quantite <= 0 ? 'Rupture de stock' : 'Ajouter au panier'}
                        >
                          {produit.quantite <= 0 ? 'Rupture de stock' : 'Ajouter au panier'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="vitrine-footer">
        <div className="vitrine-footer-content">
          <p>&copy; 2025 Nordik Adventures - Tous droits réservés</p>
          <p>Votre partenaire pour l'aventure en plein air</p>
        </div>
      </footer>

      {/* Modal pour l'image agrandie */}
      {imageZoom && (
        <div className="image-zoom-overlay" onClick={fermerImageZoom}>
          <div className="image-zoom-container" onClick={(e) => e.stopPropagation()}>
            <button className="image-zoom-close" onClick={fermerImageZoom}>×</button>
            <img 
              src={imageZoom.path} 
              alt={imageZoom.nom}
              className="image-zoom-img"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'flex';
                }
              }}
            />
            <span style={{ display: 'none' }} className="image-zoom-placeholder">📦</span>
            <p className="image-zoom-title">{imageZoom.nom}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vitrine;

