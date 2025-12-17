import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Stock.css';

// Mapping des IDs de fournisseurs vers leurs noms
const MAPPING_FOURNISSEURS = {
  1: 'NorthEquip',
  2: 'Summit Gear',
  3: 'Outland',
  4: 'AventureX',
  5: 'AventureX',
  // Ajouter d'autres mappings si nécessaire
};

// Mapping inverse : noms vers IDs
const MAPPING_FOURNISSEURS_INVERSE = {
  'NorthEquip': 1,
  'Summit Gear': 2,
  'Outland': 3,
  'AventureX': 5, // Utiliser 5 comme ID par défaut pour AventureX
};

// Obtenir le nom du fournisseur à partir de l'ID ou du nom (avec liste dynamique)
const getFournisseurNom = (fournisseurId, fournisseurNom, fournisseursList = []) => {
  // Si on a déjà le nom et qu'il n'est pas un nombre, l'utiliser directement
  if (fournisseurNom && typeof fournisseurNom === 'string' && fournisseurNom.trim() !== '') {
    // Vérifier si ce n'est pas juste un nombre (cas où le backend enverrait "5" au lieu du nom)
    const numValue = parseInt(fournisseurNom);
    if (isNaN(numValue) || numValue.toString() !== fournisseurNom.trim()) {
      return fournisseurNom;
    }
  }
  
  // Essayer de trouver dans la liste dynamique des fournisseurs
  if (fournisseursList.length > 0) {
    const id = fournisseurId || (fournisseurNom ? parseInt(fournisseurNom) : null);
    if (id) {
      const fournisseur = fournisseursList.find(f => f.id === id || f.Id === id);
      if (fournisseur) {
        return fournisseur.nom || fournisseur.Nom || fournisseurNom;
      }
    }
  }
  
  // Fallback : utiliser le mapping statique
  const id = fournisseurId || (fournisseurNom ? parseInt(fournisseurNom) : null);
  if (id && MAPPING_FOURNISSEURS[id]) {
    return MAPPING_FOURNISSEURS[id];
  }
  
  // Dernier fallback : retourner le nom tel quel ou "Non spécifié"
  return fournisseurNom || 'Non spécifié';
};

// Obtenir l'ID du fournisseur à partir du nom (avec liste dynamique)
const getFournisseurId = (fournisseurNom, fournisseursList = []) => {
  if (!fournisseurNom) return null;
  
  // Essayer de trouver dans la liste dynamique
  if (fournisseursList.length > 0) {
    const fournisseur = fournisseursList.find(
      f => (f.nom === fournisseurNom || f.Nom === fournisseurNom)
    );
    if (fournisseur) {
      return fournisseur.id || fournisseur.Id;
    }
  }
  
  // Fallback : utiliser le mapping statique
  return MAPPING_FOURNISSEURS_INVERSE[fournisseurNom] || null;
};

// Transformer les données de l'API vers le format utilisé dans le composant
// Note: Cette fonction sera utilisée dans le composant pour avoir accès à fournisseurs

function Stock({ onLogout }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showRapportInventaire, setShowRapportInventaire] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]); // Liste des fournisseurs chargés depuis l'API
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Références pour éviter les appels multiples
  const isChargingFournisseursRef = useRef(false);
  const isChargingProduitsRef = useRef(false);
  
  const [formData, setFormData] = useState({
    sku: '',
    nomProduit: '',
    categorie: 'Camping',
    quantiteStock: '',
    seuilReappro: '',
    stockSecurite: '',
    coutAchat: '',
    prixVente: '',
    fournisseurNom: '',
    fournisseurCode: '',
    statut: 'Actif'
  });


  // Transformer les données de l'API vers le format utilisé dans le composant
  const transformerProduitAPI = useCallback((produitAPI) => {
    // Déterminer le nom du fournisseur avec la liste dynamique
    const fournisseurNomFinal = getFournisseurNom(
      produitAPI.fournisseurId || produitAPI.FournisseurId, 
      produitAPI.fournisseurNom || produitAPI.fournisseur_nom,
      fournisseurs
    );
    
    return {
      code: produitAPI.sku, // Utiliser SKU comme code unique
      sku: produitAPI.sku,
      nom: produitAPI.nomProduit || produitAPI.nom_produit,
      categorie: produitAPI.categorie,
      quantite: produitAPI.quantiteStock || produitAPI.quantite_stock || 0,
      seuil: produitAPI.seuilReappro || produitAPI.seuil_reappro || 0,
      stockSecurite: produitAPI.stockSecurite || produitAPI.stock_securite || 0,
      coutAchat: produitAPI.coutAchat || produitAPI.cout_achat,
      prixVente: produitAPI.prixVente || produitAPI.prix_vente,
      margeBrute: produitAPI.margeBrute || produitAPI.marge_brute,
      fournisseur: fournisseurNomFinal,
      fournisseurNom: fournisseurNomFinal,
      fournisseurCode: produitAPI.fournisseurCode || produitAPI.fournisseur_code,
      fournisseurId: produitAPI.fournisseurId || produitAPI.FournisseurId,
      remiseFournisseurPct: produitAPI.remiseFournisseurPct || produitAPI.remise_fournisseur_pct,
      statut: produitAPI.statut || 'Actif',
      delaiLivraisonJours: produitAPI.delaiLivraisonJours || produitAPI.delai_livraison_jours,
      poidsKg: produitAPI.poidsKg || produitAPI.poids_kg,
      emplacementEntrepot: produitAPI.emplacementEntrepot || produitAPI.emplacement_entrepot,
      entrepotId: produitAPI.entrepotId || produitAPI.EntrepotId,
      dateEntreeStock: produitAPI.dateEntreeStock || produitAPI.date_entree_stock
    };
  }, [fournisseurs]);

  // Transformer les données du composant vers le format API
  const transformerProduitVersAPI = useCallback((produit) => {
    // Convertir le nom du fournisseur en ID si nécessaire
    const fournisseurId = produit.fournisseurId || 
                         (produit.fournisseurNom ? getFournisseurId(produit.fournisseurNom, fournisseurs) : null);
    
    return {
      sku: produit.sku,
      nomProduit: produit.nomProduit || produit.nom,
      categorie: produit.categorie,
      quantiteStock: parseInt(produit.quantiteStock || produit.quantite) || 0,
      seuilReappro: parseInt(produit.seuilReappro || produit.seuil) || 0,
      stockSecurite: parseInt(produit.stockSecurite) || 0,
      coutAchat: parseFloat(produit.coutAchat) || 0,
      prixVente: parseFloat(produit.prixVente) || 0,
      fournisseurId: fournisseurId, // Envoyer l'ID au lieu du nom
      fournisseurNom: produit.fournisseurNom || null, // Garder pour compatibilité si le backend l'accepte
      fournisseurCode: produit.fournisseurCode || null,
      statut: produit.statut || 'Actif',
      delaiLivraisonJours: produit.delaiLivraisonJours || null,
      poidsKg: produit.poidsKg || null,
      emplacementEntrepot: produit.emplacementEntrepot || null,
      entrepotId: produit.entrepotId || null,
      remiseFournisseurPct: produit.remiseFournisseurPct || null
    };
  }, [fournisseurs]);

  // Charger les fournisseurs depuis l'API (si disponible)
  const chargerFournisseurs = useCallback(async () => {
    // Éviter les appels multiples simultanés
    if (isChargingFournisseursRef.current) {
      console.log('Chargement des fournisseurs déjà en cours, ignoré');
      return;
    }

    isChargingFournisseursRef.current = true;
    
    try {
      // Essayer différents endpoints possibles
      const endpoints = [
        'http://localhost:5000/api/ControllerFournisseur',
        'http://localhost:5000/api/Fournisseur',
        'http://localhost:5000/api/Fournisseurs'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'accept': '*/*',
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              console.log('Fournisseurs chargés depuis:', endpoint, data);
              setFournisseurs(data);
              isChargingFournisseursRef.current = false;
              return;
            }
          }
        } catch {
          // Continuer avec le prochain endpoint
          continue;
        }
      }
      
      // Si aucun endpoint ne fonctionne, utiliser le mapping statique
      console.log('Aucun endpoint de fournisseurs trouvé, utilisation du mapping statique');
    } catch (error) {
      console.warn('Impossible de charger les fournisseurs, utilisation du mapping statique:', error);
    } finally {
      isChargingFournisseursRef.current = false;
    }
  }, []);

  // Charger les produits depuis l'API
  const chargerProduits = useCallback(async () => {
    // Éviter les appels multiples simultanés
    if (isChargingProduitsRef.current) {
      console.log('Chargement des produits déjà en cours, ignoré');
      return;
    }

    isChargingProduitsRef.current = true;
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/ControllerProduit', {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Format de réponse invalide: attendu un tableau');
        }

        // Transformer les données de l'API
        const produitsTransformes = data.map(produitAPI => transformerProduitAPI(produitAPI));
        setProducts(produitsTransformes);
        setError('');
      } else {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      setError(`Impossible de charger les produits. ${error.message}`);
    } finally {
      setIsLoading(false);
      isChargingProduitsRef.current = false;
    }
  }, [transformerProduitAPI]);

  // Charger les fournisseurs une seule fois au montage
  useEffect(() => {
    chargerFournisseurs();
  }, [chargerFournisseurs]);

  // Charger les produits après que les fournisseurs soient chargés (ou au montage)
  useEffect(() => {
    chargerProduits();
  }, [chargerProduits]);

  // Fonction helper pour calculer la marge brute
  const calculerMargeBrute = (prixVente, coutAchat) => {
    if (!prixVente || prixVente === 0) return '0.0';
    return (((prixVente - coutAchat) / prixVente) * 100).toFixed(1);
  };

  const filteredProducts = products.filter(product =>
    product.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categorie.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const alertProducts = products.filter(p => p.quantite <= p.seuil);
  const produitsBasStock = products.filter(p => p.quantite <= p.seuil * 1.5 && p.quantite > p.seuil);
  const produitsActifs = products.filter(p => p.statut === 'Actif');
  const produitsInactifs = products.filter(p => p.statut === 'Inactif');
  
  const valeurTotaleStock = products.reduce((total, p) => total + (p.quantite * p.coutAchat), 0);
  const valeurPotentielleVente = products.reduce((total, p) => total + (p.quantite * p.prixVente), 0);
  const profitPotentiel = valeurPotentielleVente - valeurTotaleStock;
  const margeBruteMoyenne = products.length > 0 
    ? products.reduce((sum, p) => sum + parseFloat(calculerMargeBrute(p.prixVente, p.coutAchat)), 0) / products.length 
    : 0;
  
  // Grouper par catégorie
  const produitsParCategorie = products.reduce((acc, p) => {
    const cat = p.categorie || 'Non catégorisé';
    if (!acc[cat]) {
      acc[cat] = { produits: [], valeur: 0, quantite: 0 };
    }
    acc[cat].produits.push(p);
    acc[cat].valeur += p.quantite * p.coutAchat;
    acc[cat].quantite += p.quantite;
    return acc;
  }, {});
  
  // Grouper par fournisseur
  const produitsParFournisseur = products.reduce((acc, p) => {
    const fournisseur = p.fournisseur || 'Non spécifié';
    if (!acc[fournisseur]) {
      acc[fournisseur] = { produits: [], valeur: 0, quantite: 0 };
    }
    acc[fournisseur].produits.push(p);
    acc[fournisseur].valeur += p.quantite * p.coutAchat;
    acc[fournisseur].quantite += p.quantite;
    return acc;
  }, {});

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Préparer les données pour l'API
      const produitAPI = transformerProduitVersAPI(formData);

      console.log('Ajout produit:', produitAPI);

      const response = await fetch('http://localhost:5000/api/ControllerProduit', {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(produitAPI)
      });

      if (response.ok) {
        const nouveauProduit = await response.json();
        // Transformer et ajouter à la liste
        const produitTransforme = transformerProduitAPI(nouveauProduit);
        setProducts([...products, produitTransforme]);
        setShowAddForm(false);
        resetForm();
        alert('✅ Produit ajouté avec succès !');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.title || `Erreur ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      setError(`Erreur lors de l'ajout: ${error.message}`);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Préparer les données pour l'API
      const produitAPI = transformerProduitVersAPI({
        ...formData,
        sku: selectedProduct.sku // Conserver le SKU original
      });

      console.log('Modification produit:', selectedProduct.sku, produitAPI);

      const response = await fetch(`http://localhost:5000/api/ControllerProduit/${selectedProduct.sku}`, {
        method: 'PUT',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(produitAPI)
      });

      if (response.ok) {
        const produitModifie = await response.json();
        // Transformer et mettre à jour la liste
        const produitTransforme = transformerProduitAPI(produitModifie);
        setProducts(products.map(p => p.sku === selectedProduct.sku ? produitTransforme : p));
        setShowEditForm(false);
        setSelectedProduct(null);
        resetForm();
        alert('✅ Produit modifié avec succès !');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.title || `Erreur ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      setError(`Erreur lors de la modification: ${error.message}`);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (sku) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le produit ${sku} ?`)) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:5000/api/ControllerProduit/${sku}`, {
        method: 'DELETE',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setProducts(products.filter(p => p.sku !== sku));
        alert('✅ Produit supprimé avec succès !');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.title || `Erreur ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setError(`Erreur lors de la suppression: ${error.message}`);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditForm = (product) => {
    setSelectedProduct(product);
    setFormData({
      sku: product.sku,
      nomProduit: product.nom,
      categorie: product.categorie,
      quantiteStock: product.quantite.toString(),
      seuilReappro: product.seuil.toString(),
      stockSecurite: (product.stockSecurite || 0).toString(),
      coutAchat: product.coutAchat.toString(),
      prixVente: product.prixVente.toString(),
      fournisseurNom: product.fournisseurNom || product.fournisseur || '',
      fournisseurCode: product.fournisseurCode || '',
      statut: product.statut
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      nomProduit: '',
      categorie: 'Camping',
      quantiteStock: '',
      seuilReappro: '',
      stockSecurite: '',
      coutAchat: '',
      prixVente: '',
      fournisseurNom: '',
      fournisseurCode: '',
      statut: 'Actif'
    });
    setError('');
  };

  return (
    <div className="page-wrapper">
      <div className="page-top-bar">
        <div className="top-bar-content">
          <Link to="/" className="home-button">
            ← Retour à l'accueil
          </Link>
          <h1 className="page-logo">🔰 PGI Nordik Adventures</h1>
          <button onClick={onLogout} className="logout-button">
            Déconnexion
          </button>
        </div>
      </div>

      <div className="stock-page">
        <div className="page-header">
          <h1>🏷️ Module : Gestion des stocks</h1>
          {error && (
            <div className="error-message" style={{ marginTop: '1rem', padding: '0.5rem', background: '#fee', color: '#c33', borderRadius: '4px' }}>
              {error}
            </div>
          )}
        </div>

        <div className="search-section">
          <div className="search-box">
            <label>🔍 Rechercher un produit :</label>
            <input
              type="text"
              placeholder="Nom, code ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button className="search-btn">Chercher</button>
          </div>
        </div>

        {alertProducts.length > 0 && (
          <div className="alert-box">
            <h3>⚠️ Produits sous le seuil de réapprovisionnement ({alertProducts.length})</h3>
            <ul>
              {alertProducts.map(product => (
                <li key={product.code}>
                  <strong>{product.code}</strong> - {product.nom} : 
                  <span className="alert-quantity"> {product.quantite} unités</span> 
                  (seuil: {product.seuil}) - <strong>À commander</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="stats-box">
          <div className="stat-item">
            <strong>Valeur totale du stock :</strong> {valeurTotaleStock.toFixed(2)} $
          </div>
          <div className="stat-item">
            <strong>Nombre de produits :</strong> {products.length}
          </div>
          <div className="stat-item">
            <strong>Alertes de réapprovisionnement :</strong> {alertProducts.length}
          </div>
        </div>

        {isLoading ? (
          <div className="loading-message" style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Chargement des produits...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th>Qté</th>
                  <th>Seuil</th>
                  <th>Coût achat</th>
                  <th>Prix vente</th>
                  <th>Marge %</th>
                  <th>Fournisseur</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>
                      {searchTerm ? 'Aucun produit trouvé pour cette recherche.' : 'Aucun produit en stock.'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(product => (
                    <tr key={product.sku} className={product.quantite <= product.seuil ? 'row-alert' : ''}>
                      <td className="sku-cell">{product.sku}</td>
                      <td className="product-name">{product.nom}</td>
                      <td>{product.categorie}</td>
                      <td className="quantity-cell">
                        <span className={product.quantite <= product.seuil ? 'low-stock' : 'normal-stock'}>
                          {product.quantite}
                        </span>
                      </td>
                      <td>{product.seuil}</td>
                      <td className="price-cell">{product.coutAchat.toFixed(2)} $</td>
                      <td className="price-cell">{product.prixVente.toFixed(2)} $</td>
                      <td className="margin-cell">{calculerMargeBrute(product.prixVente, product.coutAchat)} %</td>
                      <td>{product.fournisseur}</td>
                      <td>
                        {product.quantite <= product.seuil ? (
                          <span className="status-badge danger">⚠️ À commander</span>
                        ) : product.quantite <= product.seuil * 1.5 ? (
                          <span className="status-badge warning">⚡ Bas</span>
                        ) : (
                          <span className="status-badge success">✅ OK</span>
                        )}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button 
                            className="mini-btn edit" 
                            onClick={() => openEditForm(product)} 
                            title="Modifier"
                            disabled={isSubmitting}
                          >
                            ✏️
                          </button>
                          <button 
                            className="mini-btn delete" 
                            onClick={() => handleDeleteProduct(product.sku)} 
                            title="Supprimer"
                            disabled={isSubmitting}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="action-buttons">
          <button className="btn btn-success" onClick={() => setShowAddForm(true)}>
            <span>➕</span> Ajouter un produit
          </button>
          <button className="btn btn-info" onClick={() => setShowRapportInventaire(true)}>
            <span>📊</span> Rapport d'inventaire
          </button>
        </div>
      </div>

      {/* Modal Ajouter produit */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Ajouter un nouveau produit</h2>
            <form onSubmit={handleAddProduct}>
              <div className="form-row">
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    placeholder="Ex: TNT-ARC-001"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nom du produit *</label>
                  <input
                    type="text"
                    value={formData.nomProduit}
                    onChange={(e) => setFormData({...formData, nomProduit: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Catégorie *</label>
                  <input
                    type="text"
                    value={formData.categorie}
                    onChange={(e) => setFormData({...formData, categorie: e.target.value})}
                    placeholder="Ex: Tentes & abris"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Statut *</label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({...formData, statut: e.target.value})}
                  >
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantité en stock *</label>
                  <input
                    type="number"
                    value={formData.quantiteStock}
                    onChange={(e) => setFormData({...formData, quantiteStock: e.target.value})}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Seuil de réapprovisionnement *</label>
                  <input
                    type="number"
                    value={formData.seuilReappro}
                    onChange={(e) => setFormData({...formData, seuilReappro: e.target.value})}
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Stock de sécurité</label>
                  <input
                    type="number"
                    value={formData.stockSecurite}
                    onChange={(e) => setFormData({...formData, stockSecurite: e.target.value})}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Fournisseur *</label>
                  <select
                    value={formData.fournisseurNom}
                    onChange={(e) => setFormData({...formData, fournisseurNom: e.target.value})}
                    required
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {fournisseurs.length > 0 ? (
                      // Utiliser la liste dynamique chargée depuis l'API
                      fournisseurs.map(f => (
                        <option key={f.id || f.Id} value={f.nom || f.Nom}>
                          {f.nom || f.Nom} {f.code ? `(${f.code || f.Code})` : ''}
                        </option>
                      ))
                    ) : (
                      // Fallback : utiliser le mapping statique
                      <>
                        <option value="NorthEquip">NorthEquip</option>
                        <option value="Summit Gear">Summit Gear</option>
                        <option value="Outland">Outland</option>
                        <option value="AventureX">AventureX</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Code fournisseur</label>
                  <input
                    type="text"
                    value={formData.fournisseurCode}
                    onChange={(e) => setFormData({...formData, fournisseurCode: e.target.value})}
                    placeholder="Ex: ALPHA001 (optionnel)"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Coût d'achat *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.coutAchat}
                    onChange={(e) => setFormData({...formData, coutAchat: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Prix de vente *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.prixVente}
                    onChange={(e) => setFormData({...formData, prixVente: e.target.value})}
                    required
                  />
                </div>
              </div>
              {formData.coutAchat && formData.prixVente && (
                <div className="margin-preview">
                  <strong>Marge brute : {calculerMargeBrute(parseFloat(formData.prixVente), parseFloat(formData.coutAchat))}%</strong>
                </div>
              )}
              {error && (
                <div className="error-message" style={{ marginTop: '1rem', padding: '0.5rem', background: '#fee', color: '#c33', borderRadius: '4px' }}>
                  {error}
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                  {isSubmitting ? 'Ajout en cours...' : 'Ajouter le produit'}
                </button>
                <button type="button" className="btn btn-cancel" onClick={() => { setShowAddForm(false); resetForm(); }} disabled={isSubmitting}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modifier produit */}
      {showEditForm && (
        <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ Modifier le produit {selectedProduct?.sku}</h2>
            <form onSubmit={handleEditProduct}>
              <div className="form-row">
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    required
                    disabled
                    style={{ background: '#f5f5f5' }}
                  />
                  <small style={{ color: '#666' }}>Le SKU ne peut pas être modifié</small>
                </div>
                <div className="form-group">
                  <label>Nom du produit *</label>
                  <input
                    type="text"
                    value={formData.nomProduit}
                    onChange={(e) => setFormData({...formData, nomProduit: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Catégorie *</label>
                  <input
                    type="text"
                    value={formData.categorie}
                    onChange={(e) => setFormData({...formData, categorie: e.target.value})}
                    placeholder="Ex: Tentes & abris"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Statut *</label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({...formData, statut: e.target.value})}
                  >
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantité en stock *</label>
                  <input
                    type="number"
                    value={formData.quantiteStock}
                    onChange={(e) => setFormData({...formData, quantiteStock: e.target.value})}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Seuil de réapprovisionnement *</label>
                  <input
                    type="number"
                    value={formData.seuilReappro}
                    onChange={(e) => setFormData({...formData, seuilReappro: e.target.value})}
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Stock de sécurité</label>
                  <input
                    type="number"
                    value={formData.stockSecurite}
                    onChange={(e) => setFormData({...formData, stockSecurite: e.target.value})}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Fournisseur *</label>
                  <select
                    value={formData.fournisseurNom}
                    onChange={(e) => setFormData({...formData, fournisseurNom: e.target.value})}
                    required
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {fournisseurs.length > 0 ? (
                      // Utiliser la liste dynamique chargée depuis l'API
                      fournisseurs.map(f => (
                        <option key={f.id || f.Id} value={f.nom || f.Nom}>
                          {f.nom || f.Nom} {f.code ? `(${f.code || f.Code})` : ''}
                        </option>
                      ))
                    ) : (
                      // Fallback : utiliser le mapping statique
                      <>
                        <option value="NorthEquip">NorthEquip</option>
                        <option value="Summit Gear">Summit Gear</option>
                        <option value="Outland">Outland</option>
                        <option value="AventureX">AventureX</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Code fournisseur</label>
                  <input
                    type="text"
                    value={formData.fournisseurCode}
                    onChange={(e) => setFormData({...formData, fournisseurCode: e.target.value})}
                    placeholder="Ex: ALPHA001 (optionnel)"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Coût d'achat *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.coutAchat}
                    onChange={(e) => setFormData({...formData, coutAchat: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Prix de vente *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.prixVente}
                    onChange={(e) => setFormData({...formData, prixVente: e.target.value})}
                    required
                  />
                </div>
              </div>
              {formData.coutAchat && formData.prixVente && (
                <div className="margin-preview">
                  <strong>Marge brute : {calculerMargeBrute(parseFloat(formData.prixVente), parseFloat(formData.coutAchat))}%</strong>
                </div>
              )}
              {error && (
                <div className="error-message" style={{ marginTop: '1rem', padding: '0.5rem', background: '#fee', color: '#c33', borderRadius: '4px' }}>
                  {error}
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button type="button" className="btn btn-cancel" onClick={() => { setShowEditForm(false); resetForm(); }} disabled={isSubmitting}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rapport d'inventaire */}
      {showRapportInventaire && (
        <div className="modal-overlay" onClick={() => setShowRapportInventaire(false)}>
          <div className="modal-content rapport-inventaire" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>📊 Rapport d'inventaire</h2>
              <button 
                onClick={() => setShowRapportInventaire(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <p style={{ color: '#666', marginBottom: '0.5rem' }}>
                <strong>Date du rapport :</strong> {new Date().toLocaleDateString('fr-CA', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Résumé exécutif */}
            <div style={{ 
              background: '#f8f9fa', 
              padding: '1.5rem', 
              borderRadius: '8px', 
              marginBottom: '2rem',
              border: '1px solid #dee2e6'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#2d5016' }}>📈 Résumé exécutif</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <strong>Total produits :</strong> {products.length}
                </div>
                <div>
                  <strong>Produits actifs :</strong> {produitsActifs.length}
                </div>
                <div>
                  <strong>Produits inactifs :</strong> {produitsInactifs.length}
                </div>
                <div>
                  <strong>Valeur totale du stock :</strong> {valeurTotaleStock.toFixed(2)} $
                </div>
                <div>
                  <strong>Valeur potentielle de vente :</strong> {valeurPotentielleVente.toFixed(2)} $
                </div>
                <div>
                  <strong>Profit potentiel :</strong> {profitPotentiel.toFixed(2)} $
                </div>
                <div>
                  <strong>Marge brute moyenne :</strong> {margeBruteMoyenne.toFixed(1)} %
                </div>
                <div>
                  <strong>Alertes réapprovisionnement :</strong> {alertProducts.length}
                </div>
              </div>
            </div>

            {/* Produits à réapprovisionner */}
            {alertProducts.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#c33', marginBottom: '1rem' }}>⚠️ Produits à réapprovisionner ({alertProducts.length})</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#fee', borderBottom: '2px solid #fcc' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>SKU</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Produit</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Quantité</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Seuil</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Manquant</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Fournisseur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertProducts.map(p => (
                        <tr key={p.sku} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '0.5rem' }}>{p.sku}</td>
                          <td style={{ padding: '0.5rem' }}>{p.nom}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: '#c33', fontWeight: 'bold' }}>{p.quantite}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>{p.seuil}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: '#c33' }}>
                            {Math.max(0, p.seuil - p.quantite)}
                          </td>
                          <td style={{ padding: '0.5rem' }}>{p.fournisseur}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Produits à stock bas */}
            {produitsBasStock.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#f39c12', marginBottom: '1rem' }}>⚡ Produits à stock bas ({produitsBasStock.length})</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#fff3cd', borderBottom: '2px solid #ffc107' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>SKU</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Produit</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Quantité</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Seuil</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Fournisseur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produitsBasStock.map(p => (
                        <tr key={p.sku} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '0.5rem' }}>{p.sku}</td>
                          <td style={{ padding: '0.5rem' }}>{p.nom}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: '#f39c12' }}>{p.quantite}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>{p.seuil}</td>
                          <td style={{ padding: '0.5rem' }}>{p.fournisseur}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Répartition par catégorie */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#2d5016' }}>📁 Répartition par catégorie</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#e8dcc8', borderBottom: '2px solid #a0826d' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Catégorie</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Nombre de produits</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Quantité totale</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Valeur totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(produitsParCategorie).map(([categorie, data]) => (
                      <tr key={categorie} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{categorie}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{data.produits.length}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{data.quantite}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{data.valeur.toFixed(2)} $</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Répartition par fournisseur */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#2d5016' }}>🏢 Répartition par fournisseur</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#e8dcc8', borderBottom: '2px solid #a0826d' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Fournisseur</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Nombre de produits</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Quantité totale</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Valeur totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(produitsParFournisseur).map(([fournisseur, data]) => (
                      <tr key={fournisseur} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{fournisseur}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{data.produits.length}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{data.quantite}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{data.valeur.toFixed(2)} $</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Liste complète des produits */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#2d5016' }}>📋 Liste complète des produits ({products.length})</h3>
              <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>SKU</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Produit</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Catégorie</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Qté</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Coût unit.</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Prix unit.</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Marge %</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Valeur</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr 
                        key={p.sku} 
                        style={{ 
                          borderBottom: '1px solid #eee',
                          background: p.quantite <= p.seuil ? '#fee' : p.quantite <= p.seuil * 1.5 ? '#fff3cd' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '0.5rem' }}>{p.sku}</td>
                        <td style={{ padding: '0.5rem' }}>{p.nom}</td>
                        <td style={{ padding: '0.5rem' }}>{p.categorie}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{p.quantite}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{p.coutAchat.toFixed(2)} $</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{p.prixVente.toFixed(2)} $</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{calculerMargeBrute(p.prixVente, p.coutAchat)} %</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(p.quantite * p.coutAchat).toFixed(2)} $</td>
                        <td style={{ padding: '0.5rem' }}>
                          {p.statut === 'Actif' ? '✅ Actif' : '❌ Inactif'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '2px solid #dee2e6', textAlign: 'center' }}>
              <button 
                onClick={() => window.print()} 
                className="btn btn-info"
                style={{ marginRight: '1rem' }}
              >
                🖨️ Imprimer le rapport
              </button>
              <button 
                onClick={() => setShowRapportInventaire(false)} 
                className="btn btn-cancel"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Stock;


