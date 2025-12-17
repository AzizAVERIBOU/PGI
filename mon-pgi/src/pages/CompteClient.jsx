import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CompteClient.css';

function CompteClient({ onLogout }) {
  const [client, setClient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: ''
  });
  const [commandesHistorique, setCommandesHistorique] = useState([]);
  const [ongletActif, setOngletActif] = useState('profil');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCommandes, setIsLoadingCommandes] = useState(false);
  const [errorCommandes, setErrorCommandes] = useState('');

  useEffect(() => {
    chargerDonneesClient();
    chargerHistoriqueCommandes();
  }, []);

  const chargerDonneesClient = async () => {
    setIsLoading(true);
    try {
      // Charger depuis localStorage
      const clientData = localStorage.getItem('clientConnecte');
      if (clientData) {
        const clientObj = JSON.parse(clientData);
        setClient(clientObj);
        setFormData({
          nom: clientObj.nom || '',
          email: clientObj.email || '',
          telephone: clientObj.telephone || '',
          adresse: clientObj.adresse || ''
        });
      } else {
        // Données de démonstration
        const demoClient = {
          id: 1,
          nom: 'Marie Dupont',
          email: 'marie.dupont@example.com',
          telephone: '418-555-1234',
          adresse: '123 Rue Principale, Québec, QC G1R 4S6',
          dateCreation: '2025-01-15'
        };
        setClient(demoClient);
        setFormData({
          nom: demoClient.nom,
          email: demoClient.email,
          telephone: demoClient.telephone,
          adresse: demoClient.adresse
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement du client:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chargerHistoriqueCommandes = async () => {
    setIsLoadingCommandes(true);
    setErrorCommandes('');
    
    try {
      // Récupérer l'ID du client connecté
      const clientData = localStorage.getItem('clientConnecte');
      if (!clientData) {
        throw new Error('Client non connecté');
      }
      
      const clientObj = JSON.parse(clientData);
      const clientId = clientObj.id;
      
      if (!clientId) {
        throw new Error('ID client manquant');
      }

      // Essayer plusieurs endpoints possibles
      const endpoints = [
        `http://localhost:5000/api/ControllerCommande/client/${clientId}`,
        `http://localhost:5000/api/ControllerCommande?clientId=${clientId}`,
        `http://localhost:5000/api/Commande/client/${clientId}`,
        `http://localhost:5000/api/Commandes/client/${clientId}`
      ];

      let commandes = null;
      
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
              commandes = data;
              console.log('Commandes chargées depuis:', endpoint, commandes);
              break;
            } else if (data.commandes && Array.isArray(data.commandes)) {
              commandes = data.commandes;
              console.log('Commandes chargées depuis:', endpoint, commandes);
              break;
            }
          }
        } catch (err) {
          // Continuer avec le prochain endpoint
          continue;
        }
      }

      if (commandes && commandes.length > 0) {
        // Transformer les données de l'API vers le format attendu
        const commandesTransformees = commandes.map(commandeAPI => transformerCommandeAPI(commandeAPI));
        setCommandesHistorique(commandesTransformees);
      } else {
        // Aucune commande trouvée ou endpoint non disponible
        setCommandesHistorique([]);
        console.log('Aucune commande trouvée ou endpoint non disponible');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des commandes:', error);
      setErrorCommandes(`Impossible de charger les commandes. ${error.message}`);
      // En cas d'erreur, on laisse la liste vide plutôt que d'afficher des données de démo
      setCommandesHistorique([]);
    } finally {
      setIsLoadingCommandes(false);
    }
  };

  // Transformer les données de l'API vers le format utilisé dans le composant
  const transformerCommandeAPI = (commandeAPI) => {
    // Formater la date
    const dateCommande = commandeAPI.dateCommande || commandeAPI.date_commande || commandeAPI.DateCommande;
    let dateFormatee = '';
    if (dateCommande) {
      try {
        const date = new Date(dateCommande);
        dateFormatee = date.toLocaleDateString('fr-CA', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch (e) {
        dateFormatee = dateCommande;
      }
    }

    // Compter les articles (depuis paniers si disponible)
    let nombreArticles = 0;
    if (commandeAPI.paniers && Array.isArray(commandeAPI.paniers)) {
      nombreArticles = commandeAPI.paniers.length;
    } else if (commandeAPI.items && Array.isArray(commandeAPI.items)) {
      nombreArticles = commandeAPI.items.length;
    } else if (commandeAPI.quantite) {
      nombreArticles = commandeAPI.quantite;
    }

    // Calculer le total
    let total = 0;
    if (commandeAPI.montantTotal || commandeAPI.montant_total || commandeAPI.MontantTotal) {
      total = parseFloat(commandeAPI.montantTotal || commandeAPI.montant_total || commandeAPI.MontantTotal);
    } else if (commandeAPI.paniers && Array.isArray(commandeAPI.paniers)) {
      total = commandeAPI.paniers.reduce((sum, panier) => {
        return sum + (parseFloat(panier.sousTotal || panier.sous_total || panier.SousTotal || 0));
      }, 0);
    }

    return {
      id: commandeAPI.id || commandeAPI.Id,
      numeroCommande: commandeAPI.numeroCommande || commandeAPI.numero_commande || commandeAPI.NumeroCommande || `CMD${commandeAPI.id || commandeAPI.Id}`,
      date: dateFormatee || 'Date non disponible',
      dateISO: dateCommande,
      statut: commandeAPI.statut || commandeAPI.Statut || 'En attente',
      total: total || 0,
      articles: nombreArticles,
      montantTaxes: parseFloat(commandeAPI.montantTaxes || commandeAPI.montant_taxes || commandeAPI.MontantTaxes || 0),
      dateLivraisonPrevue: commandeAPI.dateLivraisonPrevue || commandeAPI.date_livraison_prevue || commandeAPI.DateLivraisonPrevue,
      dateLivraisonReelle: commandeAPI.dateLivraisonReelle || commandeAPI.date_livraison_reelle || commandeAPI.DateLivraisonReelle,
      notes: commandeAPI.notes || commandeAPI.Notes,
      paniers: commandeAPI.paniers || commandeAPI.items || [],
      factureId: commandeAPI.factureId || commandeAPI.facture_id || commandeAPI.FactureId
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Appel API pour mettre à jour le client
      const response = await fetch(`http://localhost:5000/api/ControllerClient/${client.id}`, {
        method: 'PUT',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: client.id,
          nom: formData.nom,
          email: formData.email,
          telephone: formData.telephone,
          adresse: formData.adresse,
          motDePasse: client.motDePasse || '',
          dateCreation: client.dateCreation
        })
      });

      if (response.ok) {
        const clientMisAJour = {
          ...client,
          ...formData
        };
        
        setClient(clientMisAJour);
        localStorage.setItem('clientConnecte', JSON.stringify(clientMisAJour));
        setIsEditing(false);
        alert('Informations mises à jour avec succès !');
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour. Veuillez réessayer.');
    }
  };

  const annulerModification = () => {
    setFormData({
      nom: client.nom,
      email: client.email,
      telephone: client.telephone,
      adresse: client.adresse
    });
    setIsEditing(false);
  };

  // Fonction pour obtenir le chemin de l'image d'un produit
  const getImagePath = (nomProduit) => {
    if (!nomProduit) return null;
    // Le nom du fichier image correspond exactement au nom du produit + .png
    return `/image/${nomProduit}.png`;
  };

  const getStatutBadge = (statut) => {
    switch (statut) {
      case 'Livrée':
        return <span className="statut-badge livree">✓ Livrée</span>;
      case 'En cours':
        return <span className="statut-badge en-cours">⏳ En cours</span>;
      case 'Annulée':
        return <span className="statut-badge annulee">✗ Annulée</span>;
      default:
        return <span className="statut-badge">{statut}</span>;
    }
  };

  if (isLoading || !client) {
    return (
      <div className="compte-client-page">
        <div className="loading-message">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="compte-client-page">
      {/* Header */}
      <div className="compte-header">
        <div className="compte-header-content">
          <div className="header-left">
            <Link to="/vitrine" className="home-button">
              ← Retour à la boutique
            </Link>
          </div>
          <h1 className="compte-logo">🔰 Nordik Adventures</h1>
          <button onClick={onLogout} className="logout-button">
            Déconnexion
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="compte-container">
        <div className="compte-sidebar">
          <div className="user-avatar">
            <span>👤</span>
          </div>
          <h2>{client.nom}</h2>
          <p className="user-email">{client.email}</p>
          <p className="user-type">Type: <strong>Client</strong></p>
          
          <nav className="compte-nav">
            <button
              className={`nav-item ${ongletActif === 'profil' ? 'active' : ''}`}
              onClick={() => setOngletActif('profil')}
            >
              👤 Mon profil
            </button>
            <button
              className={`nav-item ${ongletActif === 'commandes' ? 'active' : ''}`}
              onClick={() => setOngletActif('commandes')}
            >
              📦 Mes commandes
            </button>
            <button
              className={`nav-item ${ongletActif === 'securite' ? 'active' : ''}`}
              onClick={() => setOngletActif('securite')}
            >
              🔒 Sécurité
            </button>
          </nav>
        </div>

        <div className="compte-content">
          {/* Onglet Profil */}
          {ongletActif === 'profil' && (
            <div className="onglet-content">
              <div className="content-header">
                <h3>Informations personnelles</h3>
                {!isEditing && (
                  <button onClick={() => setIsEditing(true)} className="btn-edit">
                    ✏️ Modifier
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="profil-form">
                  <div className="form-group">
                    <label>Nom complet *</label>
                    <input
                      type="text"
                      name="nom"
                      value={formData.nom}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Adresse courriel *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Téléphone *</label>
                    <input
                      type="tel"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Adresse *</label>
                    <textarea
                      name="adresse"
                      value={formData.adresse}
                      onChange={handleChange}
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-save">
                      Enregistrer
                    </button>
                    <button type="button" onClick={annulerModification} className="btn-cancel">
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profil-info">
                  <div className="info-row">
                    <span className="info-label">Nom</span>
                    <span className="info-value">{client.nom}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Adresse courriel</span>
                    <span className="info-value">{client.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Téléphone</span>
                    <span className="info-value">{client.telephone || 'Non renseigné'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Adresse</span>
                    <span className="info-value">{client.adresse || 'Non renseignée'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Client depuis</span>
                    <span className="info-value">{client.dateCreation || 'Non disponible'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Onglet Commandes */}
          {ongletActif === 'commandes' && (
            <div className="onglet-content">
              <div className="content-header">
                <h3>Historique des commandes</h3>
                <button 
                  onClick={chargerHistoriqueCommandes} 
                  className="btn-refresh"
                  disabled={isLoadingCommandes}
                >
                  {isLoadingCommandes ? '🔄 Chargement...' : '🔄 Actualiser'}
                </button>
              </div>

              {errorCommandes && (
                <div className="error-message-commandes">
                  <p>⚠️ {errorCommandes}</p>
                </div>
              )}

              {isLoadingCommandes ? (
                <div className="loading-commandes">
                  <p>Chargement de vos commandes...</p>
                </div>
              ) : commandesHistorique.length === 0 ? (
                <div className="no-commandes">
                  <p>Vous n'avez pas encore passé de commande.</p>
                  <Link to="/vitrine" className="btn-acheter">
                    Commencer mes achats
                  </Link>
                </div>
              ) : (
                <div className="commandes-list">
                  {commandesHistorique.map(commande => (
                    <div key={commande.id} className="commande-card">
                      <div className="commande-header">
                        <div>
                          <h4>Commande {commande.numeroCommande}</h4>
                          <p className="commande-date">Passée le {commande.date}</p>
                          {commande.dateLivraisonPrevue && (
                            <p className="commande-livraison">
                              Livraison prévue: {new Date(commande.dateLivraisonPrevue).toLocaleDateString('fr-CA', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          )}
                          {commande.dateLivraisonReelle && (
                            <p className="commande-livraison-reelle">
                              ✓ Livrée le {new Date(commande.dateLivraisonReelle).toLocaleDateString('fr-CA', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          )}
                        </div>
                        {getStatutBadge(commande.statut)}
                      </div>
                      
                      {/* Détails des articles si disponibles */}
                      {commande.paniers && commande.paniers.length > 0 && (
                        <div className="commande-articles">
                          <h5>Articles commandés:</h5>
                          <ul className="articles-list">
                            {commande.paniers.map((panier, index) => {
                              const nomProduit = panier.nomProduit || panier.nom_produit || panier.produitNom || 'Produit';
                              return (
                                <li key={index} className="article-item">
                                  <div className="article-image-small">
                                    <img 
                                      src={getImagePath(nomProduit)} 
                                      alt={nomProduit}
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
                                  <span className="article-nom">
                                    {nomProduit}
                                  </span>
                                  <span className="article-quantite">
                                    x{panier.quantite || panier.Quantite || 1}
                                  </span>
                                  <span className="article-prix">
                                    {(panier.prixUnitaire || panier.prix_unitaire || panier.PrixUnitaire || 0).toFixed(2)} $
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      <div className="commande-details">
                        <div className="detail-item">
                          <span className="detail-label">Articles:</span>
                          <span className="detail-value">{commande.articles} article{commande.articles > 1 ? 's' : ''}</span>
                        </div>
                        {commande.montantTaxes > 0 && (
                          <div className="detail-item">
                            <span className="detail-label">Sous-total:</span>
                            <span className="detail-value">{(commande.total - commande.montantTaxes).toFixed(2)} $</span>
                          </div>
                        )}
                        {commande.montantTaxes > 0 && (
                          <div className="detail-item">
                            <span className="detail-label">Taxes:</span>
                            <span className="detail-value">{commande.montantTaxes.toFixed(2)} $</span>
                          </div>
                        )}
                        <div className="detail-item detail-total">
                          <span className="detail-label">Total:</span>
                          <span className="detail-value">{commande.total.toFixed(2)} $</span>
                        </div>
                      </div>

                      {commande.notes && (
                        <div className="commande-notes">
                          <strong>Notes:</strong> {commande.notes}
                        </div>
                      )}

                      <div className="commande-actions">
                        <button className="btn-voir-details">Voir les détails</button>
                        {commande.factureId && (
                          <button className="btn-telecharger">Télécharger la facture</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Onglet Sécurité */}
          {ongletActif === 'securite' && (
            <div className="onglet-content">
              <div className="content-header">
                <h3>Sécurité du compte</h3>
              </div>

              <div className="securite-section">
                <h4>Mot de passe</h4>
                <p>Protégez votre compte avec un mot de passe sécurisé</p>
                <button className="btn-modifier-mdp">
                  Modifier le mot de passe
                </button>
              </div>

              <div className="securite-section">
                <h4>Authentification à deux facteurs</h4>
                <p>Ajoutez une couche de sécurité supplémentaire à votre compte</p>
                <button className="btn-activer-2fa">
                  Activer l'authentification à deux facteurs
                </button>
              </div>

              <div className="securite-section danger-zone">
                <h4>Supprimer mon compte</h4>
                <p>Cette action est irréversible. Toutes vos données seront supprimées.</p>
                <button className="btn-supprimer-compte">
                  Supprimer définitivement mon compte
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompteClient;

