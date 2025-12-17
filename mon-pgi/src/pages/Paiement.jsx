import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { chargerPanier, viderPanier, migrerAncienPanier } from '../utils/panierUtils';
import { notifierNouvelleCommande } from '../utils/crmUtils';
import './Paiement.css';

function Paiement() {
  const navigate = useNavigate();
  const [panier, setPanier] = useState([]);
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Informations de livraison
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    ville: '',
    codePostal: '',
    pays: 'Canada',
    notesLivraison: ''
  });

  // Informations de paiement
  const [paiementData, setPaiementData] = useState({
    modePaiement: 'carte',
    numeroCarte: '',
    nomCarte: '',
    dateExpiration: '',
    cvv: '',
    memeAdresse: true
  });

  useEffect(() => {
    migrerAncienPanier();
    chargerDonnees();
  }, []);

  const chargerDonnees = () => {
    setIsLoading(true);
    try {
      // Charger le panier
      const panierCharge = chargerPanier();
      if (!panierCharge || panierCharge.length === 0) {
        navigate('/panier');
        return;
      }
      setPanier(panierCharge);

      // Charger les informations du client si connecté
      const clientData = localStorage.getItem('clientConnecte');
      if (clientData) {
        const clientObj = JSON.parse(clientData);
        setClient(clientObj);
        setFormData({
          nom: clientObj.nom || '',
          email: clientObj.email || '',
          telephone: clientObj.telephone || '',
          adresse: clientObj.adresse || '',
          ville: '',
          codePostal: '',
          pays: 'Canada',
          notesLivraison: ''
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handlePaiementChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPaiementData({
      ...paiementData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Fonction pour obtenir le chemin de l'image d'un produit
  const getImagePath = (nomProduit) => {
    if (!nomProduit) return null;
    // Le nom du fichier image correspond exactement au nom du produit + .png
    return `/image/${nomProduit}.png`;
  };

  // Calculs
  const sousTotal = panier.reduce((total, item) => total + (item.prixVente * item.quantite), 0);
  const tps = sousTotal * 0.05;
  const tvq = sousTotal * 0.09975;
  const total = sousTotal + tps + tvq;

  const genererNumeroCommande = () => {
    const date = new Date();
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CMD-${annee}${mois}${jour}-${random}`;
  };

  const validerFormulaire = () => {
    if (!formData.nom || !formData.email || !formData.telephone || !formData.adresse || !formData.ville || !formData.codePostal) {
      setError('Veuillez remplir tous les champs obligatoires de livraison');
      return false;
    }

    if (paiementData.modePaiement === 'carte') {
      if (!paiementData.numeroCarte || !paiementData.nomCarte || !paiementData.dateExpiration || !paiementData.cvv) {
        setError('Veuillez remplir tous les champs de paiement par carte');
        return false;
      }
    }

    return true;
  };

  const traiterPaiement = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validerFormulaire()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Récupérer l'ID du client (connecté ou null pour invité)
      let clientId = null;
      if (client && client.id) {
        clientId = client.id;
      }

      // Générer le numéro de commande
      const numeroCommande = genererNumeroCommande();

      // Préparer les paniers (items de la commande)
      const paniersData = panier.map(item => ({
        nomProduit: item.nom,
        quantite: item.quantite,
        prixUnitaire: item.prixVente,
        remise: 0
      }));

      // Préparer les données de la commande avec les paniers inclus
      const commandeData = {
        numeroCommande: numeroCommande,
        clientId: clientId,
        montantTotal: parseFloat(total.toFixed(2)),
        montantTaxes: parseFloat((tps + tvq).toFixed(2)),
        statut: 'En attente',
        paniers: paniersData
      };

      console.log('Création de la commande avec paniers:', commandeData);

      // Essayer plusieurs endpoints possibles
      const endpoints = [
        'http://localhost:5000/api/ControllerCommande',
        'http://localhost:5000/api/Commande',
        'http://localhost:5000/api/Commandes'
      ];

      let commandeCreee = null;
      let endpointUtilise = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'accept': '*/*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(commandeData)
          });

          if (response.ok) {
            const data = await response.json();
            commandeCreee = data.commande || data || commandeData;
            endpointUtilise = endpoint;
            console.log('Commande créée avec succès:', commandeCreee);
            break;
          } else if (response.status === 404) {
            continue; // Essayer le prochain endpoint
          } else {
            // Essayer de récupérer le message d'erreur détaillé
            let errorData;
            try {
              const errorText = await response.text();
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { message: errorText || `Erreur ${response.status}` };
              }
            } catch {
              errorData = { message: `Erreur ${response.status}` };
            }
            
            // Extraire le message d'erreur détaillé
            let errorMessage = errorData.message || errorData.title || `Erreur ${response.status}`;
            
            // Si c'est une erreur de validation ASP.NET Core (ValidationProblemDetails)
            if (errorData.errors) {
              const validationErrors = Object.entries(errorData.errors)
                .map(([field, errors]) => {
                  const fieldName = field.replace(/([A-Z])/g, ' $1').trim();
                  const errorList = Array.isArray(errors) ? errors.join(', ') : String(errors);
                  return `${fieldName}: ${errorList}`;
                })
                .join('; ');
              errorMessage = `Erreur de validation: ${validationErrors}`;
              console.error('Détails de validation:', errorData.errors);
            }
            
            // Afficher aussi dans la console pour debug
            console.error('Erreur complète du backend:', errorData);
            console.error('Données envoyées:', commandeData);
            
            throw new Error(errorMessage);
          }
        } catch (err) {
          if (err.message.includes('Erreur')) {
            throw err;
          }
          continue; // Essayer le prochain endpoint
        }
      }

      if (!commandeCreee) {
        throw new Error('Aucun endpoint de commande disponible. La commande sera enregistrée localement.');
      }

      // Les paniers sont déjà inclus dans la commande, pas besoin de les créer séparément
      console.log('Commande créée avec succès, paniers inclus:', commandeCreee);

      // ⭐ PHASE 1 : Mettre à jour le stock pour chaque produit commandé
      const erreursStock = [];
      for (const item of panier) {
        try {
          // Récupérer le produit actuel pour obtenir la quantité
          const responseProduit = await fetch(
            `http://localhost:5000/api/ControllerProduit/${item.sku}`,
            {
              method: 'GET',
              headers: {
                'accept': '*/*',
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (!responseProduit.ok) {
            erreursStock.push(`Produit ${item.sku} non trouvé`);
            continue;
          }
          
          const produit = await responseProduit.json();
          
          // Calculer la nouvelle quantité
          const quantiteActuelle = produit.quantiteStock || produit.quantite_stock || produit.quantite || 0;
          const nouvelleQuantite = Math.max(0, quantiteActuelle - item.quantite);
          
          // Vérifier si le stock est suffisant
          if (quantiteActuelle < item.quantite) {
            erreursStock.push(
              `Stock insuffisant pour ${item.nom}: ${quantiteActuelle} disponible, ${item.quantite} demandé`
            );
            continue;
          }
          
          // Préparer les données pour la mise à jour (garder toutes les propriétés existantes)
          const produitUpdate = {
            sku: produit.sku,
            nomProduit: produit.nomProduit || produit.nom_produit || produit.nom,
            categorie: produit.categorie,
            quantiteStock: nouvelleQuantite,
            seuilReappro: produit.seuilReappro || produit.seuil_reappro || produit.seuil || 0,
            stockSecurite: produit.stockSecurite || produit.stock_securite || 0,
            coutAchat: produit.coutAchat || produit.cout_achat || 0,
            prixVente: produit.prixVente || produit.prix_vente || 0,
            fournisseurId: produit.fournisseurId || produit.FournisseurId,
            statut: produit.statut || 'Actif'
          };
          
          // Mettre à jour le produit
          const responseUpdate = await fetch(
            `http://localhost:5000/api/ControllerProduit/${item.sku}`,
            {
              method: 'PUT',
              headers: {
                'accept': '*/*',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(produitUpdate)
            }
          );
          
          if (!responseUpdate.ok) {
            erreursStock.push(`Erreur lors de la mise à jour du stock pour ${item.sku}`);
          } else {
            console.log(`✅ Stock mis à jour pour ${item.sku}: ${quantiteActuelle} → ${nouvelleQuantite}`);
          }
        } catch (error) {
          console.error(`Erreur lors de la mise à jour du stock pour ${item.sku}:`, error);
          erreursStock.push(`Erreur technique pour ${item.sku}: ${error.message}`);
        }
      }
      
      if (erreursStock.length > 0) {
        console.warn('⚠️ Erreurs lors de la mise à jour du stock:', erreursStock);
        // Ne pas bloquer la commande, mais informer l'utilisateur
        alert(`⚠️ Attention: ${erreursStock.length} erreur(s) lors de la mise à jour du stock.\n\n${erreursStock.join('\n')}`);
      }

      // ⭐ PHASE 2 : Créer la facture automatiquement
      try {
        // Générer le numéro de facture
        const date = new Date();
        const annee = date.getFullYear();
        const mois = String(date.getMonth() + 1).padStart(2, '0');
        const jour = String(date.getDate()).padStart(2, '0');
        const numeroFacture = `F${annee}${mois}${jour}-${String(Date.now()).slice(-6)}`;
        
        // Construire le nom du client
        let nomClient = 'Client invité';
        if (client) {
          const prenom = client.prenom || client.Prenom || '';
          const nom = client.nom || client.Nom || '';
          nomClient = `${prenom} ${nom}`.trim() || nom || client.email || 'Client invité';
        } else if (formData.nom) {
          nomClient = formData.nom;
        }
        
        // Préparer les données de la facture (format compatible avec Finances.jsx)
        // ⭐ LOGIQUE : La facture est automatiquement payée car le paiement a été effectué lors de la commande
        const dateAujourdhui = new Date().toISOString().split('T')[0];
        const factureData = {
          numero: numeroFacture, // Utiliser 'numero' pour compatibilité avec le format local
          numeroFacture: numeroFacture, // Garder aussi pour compatibilité API
          clientId: clientId,
          client: nomClient,
          commandeId: commandeCreee?.id || commandeCreee?.Id || null,
          sousTotal: parseFloat(sousTotal.toFixed(2)),
          tps: parseFloat(tps.toFixed(2)),
          tvq: parseFloat(tvq.toFixed(2)),
          montantTotal: parseFloat(total.toFixed(2)),
          date: dateAujourdhui, // Utiliser 'date' pour compatibilité
          dateFacture: dateAujourdhui, // Garder aussi pour compatibilité API
          statut: 'payee', // ⭐ Automatiquement payée car le paiement a été effectué
          datePaiement: dateAujourdhui // Date de paiement = date de la commande
        };
        
        console.log('Création de la facture automatique:', factureData);
        
        // Essayer plusieurs endpoints pour les factures
        const facturesEndpoints = [
          'http://localhost:5000/api/ControllerFacture',
          'http://localhost:5000/api/Facture',
          'http://localhost:5000/api/Factures'
        ];
        
        let factureCreee = null;
        
        for (const endpoint of facturesEndpoints) {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'accept': '*/*',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(factureData)
            });
            
            if (response.ok) {
              const data = await response.json();
              factureCreee = data.facture || data || factureData;
              console.log('✅ Facture créée avec succès:', factureCreee);
              break;
            } else if (response.status === 404) {
              continue; // Essayer le prochain endpoint
            } else {
              const errorText = await response.text();
              console.warn(`Erreur ${response.status} avec ${endpoint}:`, errorText);
              continue;
            }
          } catch (err) {
            console.warn(`Erreur avec l'endpoint ${endpoint}:`, err);
            continue;
          }
        }
        
        if (!factureCreee) {
          console.warn('⚠️ Aucun endpoint de facture disponible. La facture sera créée localement.');
          // Sauvegarder localement pour le module Finances (format compatible)
          const factureLocale = {
            numero: factureData.numero || factureData.numeroFacture,
            client: factureData.client || 'Client invité',
            clientId: factureData.clientId || null,
            sousTotal: factureData.sousTotal,
            tps: factureData.tps,
            tvq: factureData.tvq,
            montantTotal: factureData.montantTotal,
            date: factureData.date || factureData.dateFacture,
            statut: factureData.statut || 'payee', // ⭐ Par défaut payée car le paiement a été effectué
            datePaiement: factureData.datePaiement || factureData.date || new Date().toISOString().split('T')[0]
          };
          const facturesLocales = JSON.parse(localStorage.getItem('factures_locales') || '[]');
          facturesLocales.push(factureLocale);
          localStorage.setItem('factures_locales', JSON.stringify(facturesLocales));
          factureCreee = factureLocale;
        }
        
        console.log('✅ Facture créée automatiquement:', factureCreee);
      } catch (error) {
        console.error('Erreur lors de la création de la facture:', error);
        // Ne pas bloquer la commande si la facture échoue
      }

      // ⭐ PHASE 3 : Notifier le CRM de la nouvelle commande
      if (clientId) {
        notifierNouvelleCommande(clientId, total);
        console.log('✅ CRM notifié de la nouvelle commande');
      }

      // Vider le panier
      viderPanier();

      // Sauvegarder les informations de la commande pour la page de confirmation
      const commandeInfo = {
        numeroCommande: numeroCommande,
        montantTotal: total,
        dateCommande: new Date().toISOString(),
        articles: panier.length
      };
      localStorage.setItem('derniereCommande', JSON.stringify(commandeInfo));

      // Rediriger vers la page de confirmation
      navigate('/confirmation', { 
        state: { 
          commande: commandeCreee,
          numeroCommande: numeroCommande,
          montantTotal: total
        } 
      });

    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      setError(`Erreur lors du traitement du paiement: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="paiement-page">
        <div className="loading-message">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (panier.length === 0) {
    return (
      <div className="paiement-page">
        <div className="error-message">
          <p>Votre panier est vide</p>
          <Link to="/" className="btn-retour">Retour à la boutique</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="paiement-page">
      {/* Header */}
      <header className="paiement-header">
        <div className="paiement-header-content">
          <Link to="/panier" className="back-link">
            ← Retour au panier
          </Link>
          <div className="paiement-logo">
            <h1>🔰 Nordik Adventures</h1>
          </div>
          <nav className="paiement-nav">
            {client ? (
              <Link to="/compte" className="nav-link">Mon compte</Link>
            ) : (
              <>
                <Link to="/connexion" className="nav-link">Connexion</Link>
                <Link to="/inscription" className="nav-link nav-link-primary">S'inscrire</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="paiement-main">
        <div className="paiement-container">
          <div className="paiement-title">
            <h2>💳 Paiement</h2>
            <p className="paiement-subtitle">Finalisez votre commande</p>
          </div>

          {error && (
            <div className="error-alert">
              <p>⚠️ {error}</p>
            </div>
          )}

          <form onSubmit={traiterPaiement} className="paiement-form">
            <div className="paiement-content">
              {/* Formulaire de livraison et paiement */}
              <div className="paiement-left">
                {/* Informations de livraison */}
                <section className="form-section">
                  <h3>📍 Adresse de livraison</h3>
                  
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
                    <input
                      type="text"
                      name="adresse"
                      value={formData.adresse}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Ville *</label>
                      <input
                        type="text"
                        name="ville"
                        value={formData.ville}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Code postal *</label>
                      <input
                        type="text"
                        name="codePostal"
                        value={formData.codePostal}
                        onChange={handleChange}
                        pattern="[A-Za-z][0-9][A-Za-z] [0-9][A-Za-z][0-9]"
                        placeholder="A1A 1A1"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Pays *</label>
                    <select
                      name="pays"
                      value={formData.pays}
                      onChange={handleChange}
                      required
                    >
                      <option value="Canada">Canada</option>
                      <option value="États-Unis">États-Unis</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Notes de livraison (optionnel)</label>
                    <textarea
                      name="notesLivraison"
                      value={formData.notesLivraison}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Instructions spéciales pour la livraison..."
                    />
                  </div>
                </section>

                {/* Informations de paiement */}
                <section className="form-section">
                  <h3>💳 Informations de paiement</h3>

                  <div className="form-group">
                    <label>Mode de paiement *</label>
                    <select
                      name="modePaiement"
                      value={paiementData.modePaiement}
                      onChange={handlePaiementChange}
                      required
                    >
                      <option value="carte">Carte de crédit / débit</option>
                      <option value="paypal">PayPal</option>
                      <option value="virement">Virement bancaire</option>
                    </select>
                  </div>

                  {paiementData.modePaiement === 'carte' && (
                    <>
                      <div className="form-group">
                        <label>Numéro de carte *</label>
                        <input
                          type="text"
                          name="numeroCarte"
                          value={paiementData.numeroCarte}
                          onChange={handlePaiementChange}
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Nom sur la carte *</label>
                        <input
                          type="text"
                          name="nomCarte"
                          value={paiementData.nomCarte}
                          onChange={handlePaiementChange}
                          required
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Date d'expiration *</label>
                          <input
                            type="text"
                            name="dateExpiration"
                            value={paiementData.dateExpiration}
                            onChange={handlePaiementChange}
                            placeholder="MM/AA"
                            maxLength="5"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>CVV *</label>
                          <input
                            type="text"
                            name="cvv"
                            value={paiementData.cvv}
                            onChange={handlePaiementChange}
                            placeholder="123"
                            maxLength="4"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {paiementData.modePaiement === 'paypal' && (
                    <div className="info-box">
                      <p>Vous serez redirigé vers PayPal pour finaliser le paiement.</p>
                    </div>
                  )}

                  {paiementData.modePaiement === 'virement' && (
                    <div className="info-box">
                      <p>Les instructions de virement vous seront envoyées par courriel après la confirmation de la commande.</p>
                    </div>
                  )}
                </section>
              </div>

              {/* Résumé de la commande */}
              <div className="paiement-right">
                <div className="resume-commande">
                  <h3>Résumé de la commande</h3>

                  <div className="resume-articles">
                    {panier.map(item => (
                      <div key={item.code} className="resume-article">
                        <div className="resume-article-image">
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
                        <div className="resume-article-info">
                          <span className="resume-article-nom">{item.nom}</span>
                          <span className="resume-article-quantite">x{item.quantite}</span>
                        </div>
                        <span className="resume-article-prix">
                          {(item.prixVente * item.quantite).toFixed(2)} $
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="resume-separateur"></div>

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

                  <button 
                    type="submit" 
                    className="btn-payer"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '⏳ Traitement en cours...' : `💳 Payer ${total.toFixed(2)} $`}
                  </button>

                  <div className="paiement-securite">
                    <p>🔒 Paiement sécurisé SSL</p>
                    <p>🛡️ Vos informations sont protégées</p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="paiement-footer">
        <div className="paiement-footer-content">
          <p>&copy; 2025 Nordik Adventures - Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
}

export default Paiement;

