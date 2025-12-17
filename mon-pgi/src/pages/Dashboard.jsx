import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

function Dashboard({ onLogout }) {
  // États pour les statistiques
  const [statsStocks, setStatsStocks] = useState({
    nombreProduits: 0,
    valeurTotaleStock: 0,
    alertesReappro: 0,
    margeBruteMoyenne: 0
  });

  const [statsFinances, setStatsFinances] = useState({
    revenusMois: 0,
    nombreVentes: 0,
    facturesEnAttente: 0,
    profitBrut: 0
  });

  const [statsCRM, setStatsCRM] = useState({
    totalClients: 0,
    clientsActifs: 0,
    satisfactionMoyenne: 0,
    tauxFidelisation: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const isChargingRef = useRef(false);

  // Charger les statistiques du module Stocks
  const chargerStatsStocks = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ControllerProduit', {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const produits = await response.json();
        if (Array.isArray(produits)) {
          const nombreProduits = produits.length;
          
          // Valeur totale du stock (quantité * coût d'achat)
          const valeurTotaleStock = produits.reduce((total, p) => {
            const quantite = p.quantiteStock || p.quantite_stock || 0;
            const coutAchat = p.coutAchat || p.cout_achat || 0;
            return total + (quantite * coutAchat);
          }, 0);

          // Alertes de réapprovisionnement (quantité <= seuil)
          const alertesReappro = produits.filter(p => {
            const quantite = p.quantiteStock || p.quantite_stock || 0;
            const seuil = p.seuilReappro || p.seuil_reappro || 0;
            return quantite <= seuil;
          }).length;

          // Marge brute moyenne
          const marges = produits
            .filter(p => {
              const prixVente = p.prixVente || p.prix_vente || 0;
              const coutAchat = p.coutAchat || p.cout_achat || 0;
              return prixVente > 0 && coutAchat > 0;
            })
            .map(p => {
              const prixVente = p.prixVente || p.prix_vente || 0;
              const coutAchat = p.coutAchat || p.cout_achat || 0;
              return ((prixVente - coutAchat) / prixVente) * 100;
            });

          const margeBruteMoyenne = marges.length > 0
            ? marges.reduce((sum, m) => sum + m, 0) / marges.length
            : 0;

          setStatsStocks({
            nombreProduits,
            valeurTotaleStock,
            alertesReappro,
            margeBruteMoyenne: parseFloat(margeBruteMoyenne.toFixed(1))
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats stocks:', error);
    }
  }, []);

  // Charger les statistiques du module Finances
  const chargerStatsFinances = useCallback(async () => {
    try {
      // Essayer plusieurs endpoints pour les commandes
      const endpoints = [
        'http://localhost:5000/api/ControllerCommande',
        'http://localhost:5000/api/Commande',
        'http://localhost:5000/api/Commandes'
      ];

      let commandes = [];
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
              break;
            } else if (data.commandes && Array.isArray(data.commandes)) {
              commandes = data.commandes;
              break;
            }
          }
        } catch {
          continue;
        }
      }

      // Calculer les revenus du mois actuel
      const maintenant = new Date();
      const moisActuel = maintenant.getMonth();
      const anneeActuelle = maintenant.getFullYear();

      const commandesMois = commandes.filter(cmd => {
        const dateCommande = new Date(cmd.dateCommande || cmd.date_commande || cmd.DateCommande);
        return dateCommande.getMonth() === moisActuel && 
               dateCommande.getFullYear() === anneeActuelle;
      });

      const revenusMois = commandesMois.reduce((total, cmd) => {
        return total + (parseFloat(cmd.montantTotal || cmd.montant_total || cmd.MontantTotal || 0));
      }, 0);

      const nombreVentes = commandes.length;

      // Essayer de charger les factures
      let factures = [];
      try {
        const facturesEndpoints = [
          'http://localhost:5000/api/ControllerFacture',
          'http://localhost:5000/api/Facture',
          'http://localhost:5000/api/Factures'
        ];

        for (const endpoint of facturesEndpoints) {
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
                factures = data;
                break;
              } else if (data.factures && Array.isArray(data.factures)) {
                factures = data.factures;
                break;
              }
            }
          } catch {
            continue;
          }
        }
      } catch (error) {
        console.warn('Impossible de charger les factures:', error);
      }

      const facturesEnAttente = factures.filter(f => {
        const statut = f.statut || f.Statut || '';
        return statut.toLowerCase().includes('non payée') || 
               statut.toLowerCase().includes('en attente') ||
               statut.toLowerCase().includes('pending');
      }).length;

      // Calculer le profit brut (revenus - coûts)
      // Pour simplifier, on utilise les revenus du mois comme profit brut
      // (dans un vrai système, on soustrairait les coûts d'achat)
      const profitBrut = revenusMois * 0.3; // Estimation à 30% de marge

      setStatsFinances({
        revenusMois: parseFloat(revenusMois.toFixed(2)),
        nombreVentes,
        facturesEnAttente,
        profitBrut: parseFloat(profitBrut.toFixed(2))
      });
    } catch (error) {
      console.error('Erreur lors du chargement des stats finances:', error);
    }
  }, []);

  // Charger les statistiques du module CRM
  const chargerStatsCRM = useCallback(async () => {
    try {
      // Charger les clients
      const response = await fetch('http://localhost:5000/api/ControllerClient', {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const clients = await response.json();
        if (Array.isArray(clients)) {
          const totalClients = clients.length;

          // Charger les commandes pour déterminer les clients actifs
          let commandes = [];
          try {
            const commandesEndpoints = [
              'http://localhost:5000/api/ControllerCommande',
              'http://localhost:5000/api/Commande',
              'http://localhost:5000/api/Commandes'
            ];

            for (const endpoint of commandesEndpoints) {
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
                    break;
                  } else if (data.commandes && Array.isArray(data.commandes)) {
                    commandes = data.commandes;
                    break;
                  }
                }
              } catch {
                continue;
              }
            }
          } catch (error) {
            console.warn('Impossible de charger les commandes pour CRM:', error);
          }

          // Clients actifs : ceux qui ont au moins une commande dans les 12 derniers mois
          const maintenant = new Date();
          const douzeMoisAgo = new Date();
          douzeMoisAgo.setMonth(douzeMoisAgo.getMonth() - 12);

          const clientsAvecCommandes = new Set(
            commandes
              .filter(cmd => {
                const dateCommande = new Date(cmd.dateCommande || cmd.date_commande || cmd.DateCommande);
                return dateCommande >= douzeMoisAgo;
              })
              .map(cmd => cmd.clientId || cmd.client_id || cmd.ClientId)
          );

          const clientsActifs = clientsAvecCommandes.size;

          // Taux de fidélisation : clients avec plus de 5 commandes ou plus de 3000$ d'achats
          const commandesParClient = {};
          commandes.forEach(cmd => {
            const clientId = cmd.clientId || cmd.client_id || cmd.ClientId;
            if (!commandesParClient[clientId]) {
              commandesParClient[clientId] = {
                count: 0,
                total: 0
              };
            }
            commandesParClient[clientId].count++;
            commandesParClient[clientId].total += parseFloat(cmd.montantTotal || cmd.montant_total || cmd.MontantTotal || 0);
          });

          const clientsFideles = Object.values(commandesParClient).filter(
            stats => stats.count > 5 || stats.total > 3000
          ).length;

          const tauxFidelisation = totalClients > 0
            ? (clientsFideles / totalClients) * 100
            : 0;

          // Satisfaction moyenne (par défaut 4.2 si non disponible)
          const satisfactionMoyenne = 4.2;

          setStatsCRM({
            totalClients,
            clientsActifs,
            satisfactionMoyenne,
            tauxFidelisation: parseFloat(tauxFidelisation.toFixed(1))
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats CRM:', error);
    }
  }, []);

  // Charger toutes les statistiques
  const chargerToutesStats = useCallback(async () => {
    if (isChargingRef.current) {
      return;
    }

    isChargingRef.current = true;
    setIsLoading(true);

    try {
      await Promise.all([
        chargerStatsStocks(),
        chargerStatsFinances(),
        chargerStatsCRM()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setIsLoading(false);
      isChargingRef.current = false;
    }
  }, [chargerStatsStocks, chargerStatsFinances, chargerStatsCRM]);

  // Charger les statistiques au montage
  useEffect(() => {
    chargerToutesStats();
  }, [chargerToutesStats]);

  return (
    <div className="dashboard-full">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🔰 PGI Nordik Adventures</h1>
          <div className="header-actions">
            <Link to="/vitrine" className="vitrine-button">
              🏪 Boutique
            </Link>
            <Link to="/compte" className="compte-button">
              👤 Mon compte
            </Link>
            <button onClick={onLogout} className="logout-button">
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-container">
        <h2 className="dashboard-title">📊 Tableau de bord général</h2>

        <div className="modules-grid">
          {/* Module Stocks */}
          <div className="module-card">
            <div className="module-header">
              <h3>📦 Gestion des stocks</h3>
            </div>
            <div className="module-content">
              {isLoading ? (
                <div className="stat-loading">Chargement...</div>
              ) : (
                <>
                  <div className="stat-line">
                    <span>Nombre de produits :</span>
                    <strong>{statsStocks.nombreProduits}</strong>
                  </div>
                  <div className="stat-line">
                    <span>Valeur totale du stock :</span>
                    <strong>{statsStocks.valeurTotaleStock.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</strong>
                  </div>
                  <div className="stat-line alert">
                    <span>Alertes de réapprovisionnement :</span>
                    <strong>{statsStocks.alertesReappro} produit{statsStocks.alertesReappro > 1 ? 's' : ''}</strong>
                  </div>
                  <div className="stat-line">
                    <span>Marge brute moyenne :</span>
                    <strong>{statsStocks.margeBruteMoyenne}%</strong>
                  </div>
                </>
              )}
            </div>
            <div className="module-footer">
              <Link to="/stocks" className="module-button">
                Accéder au module Stocks
              </Link>
            </div>
          </div>

          {/* Module Finances */}
          <div className="module-card">
            <div className="module-header">
              <h3>💵 Gestion financière</h3>
            </div>
            <div className="module-content">
              {isLoading ? (
                <div className="stat-loading">Chargement...</div>
              ) : (
                <>
                  <div className="stat-line">
                    <span>Revenus du mois :</span>
                    <strong>{statsFinances.revenusMois.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</strong>
                  </div>
                  <div className="stat-line">
                    <span>Nombre de ventes :</span>
                    <strong>{statsFinances.nombreVentes}</strong>
                  </div>
                  <div className="stat-line">
                    <span>Factures en attente :</span>
                    <strong>{statsFinances.facturesEnAttente}</strong>
                  </div>
                  <div className="stat-line">
                    <span>Profit brut :</span>
                    <strong>{statsFinances.profitBrut.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</strong>
                  </div>
                </>
              )}
            </div>
            <div className="module-footer">
              <Link to="/finances" className="module-button">
                Accéder au module Finances
              </Link>
            </div>
          </div>

          {/* Module CRM */}
          <div className="module-card">
            <div className="module-header">
              <h3>👥 Gestion des clients (CRM)</h3>
            </div>
            <div className="module-content">
              {isLoading ? (
                <div className="stat-loading">Chargement...</div>
              ) : (
                <>
                  <div className="stat-line">
                    <span>Total clients :</span>
                    <strong>{statsCRM.totalClients}</strong>
                  </div>
                  <div className="stat-line">
                    <span>Clients actifs :</span>
                    <strong>{statsCRM.clientsActifs}</strong>
                  </div>
                  <div className="stat-line">
                    <span>Satisfaction moyenne :</span>
                    <strong>{statsCRM.satisfactionMoyenne} / 5</strong>
                  </div>
                  <div className="stat-line">
                    <span>Taux de fidélisation :</span>
                    <strong>{statsCRM.tauxFidelisation}%</strong>
                  </div>
                </>
              )}
            </div>
            <div className="module-footer">
              <Link to="/clients" className="module-button">
                Accéder au module CRM
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
