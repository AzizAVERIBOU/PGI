import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { notifierNouvelleCommande } from '../utils/crmUtils';
import './Finances.css';

function Finances({ onLogout }) {
  const [factures, setFactures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Référence pour éviter les appels multiples
  const isChargingRef = useRef(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [formData, setFormData] = useState({
    client: '',
    clientId: '', // ⭐ PHASE 5 : Ajouter clientId
    sousTotal: '',
    date: '',
    statut: 'attente'
  });

  // Transformer une facture de l'API au format attendu
  const transformerFactureAPI = useCallback((factureAPI, clientsMap) => {
    // Extraire les valeurs avec différentes variantes de noms de champs
    const numero = factureAPI.numeroFacture || factureAPI.numero_facture || factureAPI.NumeroFacture || factureAPI.id || `F${factureAPI.id || 'N/A'}`;
    const clientId = factureAPI.clientId || factureAPI.client_id || factureAPI.ClientId;
    const clientNom = clientsMap[clientId] || factureAPI.clientNom || factureAPI.client_nom || factureAPI.ClientNom || 'Client inconnu';
    
    // Montants
    const sousTotal = parseFloat(factureAPI.sousTotal || factureAPI.sous_total || factureAPI.SousTotal || factureAPI.montantTotal || factureAPI.montant_total || factureAPI.MontantTotal || 0);
    const tps = parseFloat(factureAPI.tps || factureAPI.TPS || (sousTotal * 0.05));
    const tvq = parseFloat(factureAPI.tvq || factureAPI.TVQ || (sousTotal * 0.09975));
    const montantTotal = parseFloat(factureAPI.montantTotal || factureAPI.montant_total || factureAPI.MontantTotal || (sousTotal + tps + tvq));
    
    // Dates
    const date = factureAPI.dateFacture || factureAPI.date_facture || factureAPI.DateFacture || factureAPI.date || factureAPI.Date || new Date().toISOString().split('T')[0];
    const datePaiement = factureAPI.datePaiement || factureAPI.date_paiement || factureAPI.DatePaiement || null;
    
    // Statut
    const statutAPI = (factureAPI.statut || factureAPI.Statut || factureAPI.estPayee || factureAPI.est_payee || factureAPI.EstPayee || 'attente').toString().toLowerCase();
    const statut = statutAPI.includes('payée') || statutAPI.includes('payee') || statutAPI === 'true' || statutAPI === true ? 'payee' : 'attente';
    
    return {
      id: factureAPI.id || factureAPI.Id,
      numero,
      client: clientNom,
      clientId,
      sousTotal,
      tps,
      tvq,
      montantTotal,
      date: date.split('T')[0], // Garder seulement la date
      statut,
      datePaiement: datePaiement ? datePaiement.split('T')[0] : null
    };
  }, []);

  // Charger les clients pour obtenir les noms
  const [clientsList, setClientsList] = useState([]); // ⭐ PHASE 5 : Garder la liste des clients
  
  const chargerClients = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ControllerClient', {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const clientsListData = Array.isArray(data) ? data : (data.clients || []);
        setClientsList(clientsListData); // ⭐ PHASE 5 : Sauvegarder la liste
        
        // Créer un map pour accès rapide par ID
        const clientsMap = {};
        clientsListData.forEach(client => {
          const id = client.id || client.Id;
          // Construire le nom complet (prénom + nom)
          const prenom = client.prenom || client.Prenom || '';
          const nom = client.nom || client.Nom || '';
          const nomComplet = `${prenom} ${nom}`.trim() || nom || 'Client inconnu';
          if (id) {
            clientsMap[id] = nomComplet;
          }
        });
        
        return clientsMap;
      }
      return {};
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      return {};
    }
  }, []);

  // Charger les factures depuis l'API
  const chargerFactures = useCallback(async (clientsMap = {}) => {
    if (isChargingRef.current) return;
    isChargingRef.current = true;
    setIsLoading(true);
    setError('');

    try {
      // Essayer plusieurs endpoints pour les factures
      const facturesEndpoints = [
        'http://localhost:5000/api/ControllerFacture',
        'http://localhost:5000/api/Facture',
        'http://localhost:5000/api/Factures'
      ];

      let facturesAPI = [];
      
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
              facturesAPI = data;
              console.log('Factures chargées depuis:', endpoint, facturesAPI);
              break;
            } else if (data.factures && Array.isArray(data.factures)) {
              facturesAPI = data.factures;
              console.log('Factures chargées depuis:', endpoint, facturesAPI);
              break;
            }
          }
        } catch (err) {
          console.warn(`Erreur avec l'endpoint ${endpoint}:`, err);
          continue;
        }
      }

      // PHASE 2 : Toujours charger les factures locales (en plus de l'API si disponible)
      try {
        const facturesLocales = JSON.parse(localStorage.getItem('factures_locales') || '[]');
        if (facturesLocales.length > 0) {
          console.log('Chargement des factures locales:', facturesLocales.length);
          // Fusionner avec les factures de l'API (éviter les doublons par numéro)
          const numerosAPI = new Set(facturesAPI.map(f => f.numero || f.numeroFacture || f.id));
          const facturesLocalesUniques = facturesLocales.filter(f => {
            const numero = f.numero || f.numeroFacture || f.id;
            return numero && !numerosAPI.has(numero);
          });
          facturesAPI = [...facturesAPI, ...facturesLocalesUniques];
          console.log('Factures totales après fusion:', facturesAPI.length, '(API:', facturesAPI.length - facturesLocalesUniques.length, '+ Locales:', facturesLocalesUniques.length, ')');
        }
      } catch (error) {
        console.warn('Erreur lors du chargement des factures locales:', error);
      }

      // Transformer les factures au format attendu
      const facturesTransformees = facturesAPI.map(facture => {
        // Si la facture est déjà au bon format (facture locale), la retourner telle quelle
        if (facture.numero && facture.client && facture.sousTotal !== undefined && facture.montantTotal !== undefined) {
          // C'est une facture locale, s'assurer qu'elle a tous les champs nécessaires
          const factureLocale = {
            id: facture.id || null,
            numero: facture.numero,
            client: facture.client,
            clientId: facture.clientId || null,
            sousTotal: parseFloat(facture.sousTotal) || 0,
            tps: parseFloat(facture.tps) || 0,
            tvq: parseFloat(facture.tvq) || 0,
            montantTotal: parseFloat(facture.montantTotal) || 0,
            date: facture.date || new Date().toISOString().split('T')[0],
            statut: facture.statut || 'attente',
            datePaiement: facture.datePaiement || null
          };
          // Vérifier que les calculs sont corrects
          const totalCalcule = factureLocale.sousTotal + factureLocale.tps + factureLocale.tvq;
          if (Math.abs(totalCalcule - factureLocale.montantTotal) > 0.01) {
            console.warn(` Facture ${factureLocale.numero}: montantTotal incorrect. Attendu: ${totalCalcule.toFixed(2)}, Trouvé: ${factureLocale.montantTotal.toFixed(2)}`);
            factureLocale.montantTotal = totalCalcule; // Corriger le montant
          }
          return factureLocale;
        }
        // Sinon, transformer depuis le format API
        return transformerFactureAPI(facture, clientsMap);
      });
      
      console.log('Factures transformées:', facturesTransformees.length, facturesTransformees);
      
      // Vérifier et valider toutes les factures pour s'assurer que les montants sont des nombres
      const facturesValides = facturesTransformees.map(f => {
        // S'assurer que tous les montants sont des nombres
        const factureValide = {
          ...f,
          sousTotal: parseFloat(f.sousTotal) || 0,
          tps: parseFloat(f.tps) || 0,
          tvq: parseFloat(f.tvq) || 0,
          montantTotal: parseFloat(f.montantTotal) || 0
        };
        
        // Si montantTotal est 0 mais qu'on a un sousTotal, recalculer
        if (factureValide.montantTotal === 0 && factureValide.sousTotal > 0) {
          factureValide.montantTotal = factureValide.sousTotal + factureValide.tps + factureValide.tvq;
          console.log(`⚠️ Facture ${factureValide.numero}: montantTotal recalculé à ${factureValide.montantTotal}`);
        }
        
        return factureValide;
      });
      
      console.log('Factures validées:', facturesValides.length);
      if (facturesValides.length > 0) {
        console.log('Première facture validée:', facturesValides[0]);
        console.log('MontantTotal première facture:', facturesValides[0].montantTotal, typeof facturesValides[0].montantTotal);
        const totalTest = facturesValides.reduce((sum, f) => sum + (parseFloat(f.montantTotal) || 0), 0);
        console.log('Total calculé pour test:', totalTest);
      }
      
      setFactures(facturesValides);
      
      if (facturesValides.length === 0) {
        setError('Aucune facture trouvée. Les factures seront créées automatiquement lors des commandes.');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error);
      setError('Impossible de charger les factures. Vérifiez que le serveur backend est démarré.');
    } finally {
      setIsLoading(false);
      isChargingRef.current = false;
    }
  }, [transformerFactureAPI]);

  // Charger les données au montage
  useEffect(() => {
    const chargerDonnees = async () => {
      const clientsMap = await chargerClients();
      await chargerFactures(clientsMap);
    };
    
    chargerDonnees();
  }, [chargerClients, chargerFactures]);

  // ⭐ Écouter les changements dans localStorage pour recharger automatiquement les factures
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'factures_locales') {
        console.log('🔄 Changement détecté dans factures_locales, rechargement...');
        const chargerDonnees = async () => {
          const clientsMap = await chargerClients();
          await chargerFactures(clientsMap);
        };
        chargerDonnees();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Vérifier périodiquement s'il y a de nouvelles factures (pour le même onglet)
    const interval = setInterval(() => {
      const facturesLocales = JSON.parse(localStorage.getItem('factures_locales') || '[]');
      if (facturesLocales.length > factures.length) {
        console.log('🔄 Nouvelles factures détectées, rechargement...');
        const chargerDonnees = async () => {
          const clientsMap = await chargerClients();
          await chargerFactures(clientsMap);
        };
        chargerDonnees();
      }
    }, 2000); // Vérifier toutes les 2 secondes
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [chargerClients, chargerFactures, factures.length]);

  const calculerTPS = (sousTotal) => (parseFloat(sousTotal) * 0.05).toFixed(2);
  const calculerTVQ = (sousTotal) => (parseFloat(sousTotal) * 0.09975).toFixed(2);

  // Calculer les statistiques
  // Debug : vérifier les factures
  console.log('📊 Calcul des statistiques - Nombre de factures:', factures.length);
  if (factures.length > 0) {
    console.log('📊 Exemple de facture:', factures[0]);
    console.log('📊 MontantTotal de la première facture:', factures[0].montantTotal, typeof factures[0].montantTotal);
  }
  
  const totalMois = factures.reduce((sum, f) => {
    const montant = parseFloat(f.montantTotal) || 0;
    return sum + montant;
  }, 0);
  
  const totalPayee = factures
    .filter(f => f.statut === 'payee')
    .reduce((sum, f) => {
      const montant = parseFloat(f.montantTotal) || 0;
      return sum + montant;
    }, 0);
  
  const totalAttente = factures
    .filter(f => f.statut === 'attente')
    .reduce((sum, f) => {
      const montant = parseFloat(f.montantTotal) || 0;
      return sum + montant;
    }, 0);
  
  const nombreFactures = factures.length;
  const nombrePayees = factures.filter(f => f.statut === 'payee').length;
  const nombreAttente = factures.filter(f => f.statut === 'attente').length;

  // Calcul du profit brut (estimation: 30% du total des ventes)
  const profitBrut = (totalMois * 0.30);
  const tauxPaiement = nombreFactures > 0 ? ((nombrePayees / nombreFactures) * 100).toFixed(0) : '0';
  
  // Debug : afficher les statistiques calculées
  console.log('📊 Statistiques calculées:', {
    totalMois,
    totalPayee,
    totalAttente,
    profitBrut,
    nombreFactures,
    nombrePayees,
    nombreAttente
  });

  const handleAddFacture = async (e) => {
    e.preventDefault();
    const sousTotal = parseFloat(formData.sousTotal);
    const tps = parseFloat(calculerTPS(sousTotal));
    const tvq = parseFloat(calculerTVQ(sousTotal));
    const montantTotal = sousTotal + tps + tvq;
    
    const newFacture = {
      numero: `F${1000 + factures.length + 1}`,
      client: formData.client,
      clientId: formData.clientId || null,
      sousTotal: sousTotal,
      tps: tps,
      tvq: tvq,
      montantTotal: montantTotal,
      date: formData.date,
      statut: formData.statut,
      datePaiement: formData.statut === 'payee' ? formData.date : null
    };

    // ⭐ PHASE 5 : Si un clientId est fourni, créer une commande associée
    if (formData.clientId) {
      try {
        // Générer le numéro de commande
        const date = new Date();
        const annee = date.getFullYear();
        const mois = String(date.getMonth() + 1).padStart(2, '0');
        const jour = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const numeroCommande = `CMD-${annee}${mois}${jour}-${random}`;
        
        // Créer une commande associée
        const commandeData = {
          numeroCommande: numeroCommande,
          clientId: parseInt(formData.clientId),
          montantTotal: montantTotal,
          montantTaxes: tps + tvq,
          statut: 'En attente',
          dateCommande: formData.date || new Date().toISOString().split('T')[0]
        };
        
        const commandesEndpoints = [
          'http://localhost:5000/api/ControllerCommande',
          'http://localhost:5000/api/Commande',
          'http://localhost:5000/api/Commandes'
        ];
        
        let commandeCreee = false;
        for (const endpoint of commandesEndpoints) {
          try {
            const commandeResponse = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'accept': '*/*',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(commandeData)
            });
            
            if (commandeResponse.ok) {
              console.log(' Commande créée pour la facture');
              commandeCreee = true;
              // Notifier le CRM
              notifierNouvelleCommande(parseInt(formData.clientId), montantTotal);
              break;
            }
          } catch (error) {
            console.warn(`Erreur avec l'endpoint ${endpoint}:`, error);
            continue;
          }
        }
        
        if (!commandeCreee) {
          console.warn(' Impossible de créer la commande associée, mais la facture sera créée');
        }
      } catch (error) {
        console.warn('Erreur lors de la création de la commande associée:', error);
        // Ne pas bloquer la création de la facture
      }
    }

    // S'assurer que tous les montants sont des nombres
    const factureFinale = {
      ...newFacture,
      sousTotal: parseFloat(newFacture.sousTotal) || 0,
      tps: parseFloat(newFacture.tps) || 0,
      tvq: parseFloat(newFacture.tvq) || 0,
      montantTotal: parseFloat(newFacture.montantTotal) || 0
    };
    
    const facturesMisesAJour = [...factures, factureFinale];
    setFactures(facturesMisesAJour);
    
    // Sauvegarder aussi dans localStorage
    const facturesLocales = JSON.parse(localStorage.getItem('factures_locales') || '[]');
    facturesLocales.push(factureFinale);
    localStorage.setItem('factures_locales', JSON.stringify(facturesLocales));
    
    console.log('✅ Facture créée:', factureFinale);
    console.log('📊 Nouvelles statistiques après ajout:', {
      totalFactures: facturesMisesAJour.length,
      totalMois: facturesMisesAJour.reduce((sum, f) => sum + (parseFloat(f.montantTotal) || 0), 0)
    });
    
    // Recharger les factures pour s'assurer que tout est synchronisé
    setTimeout(async () => {
      const clientsMap = await chargerClients();
      await chargerFactures(clientsMap);
    }, 100);
    
    setShowAddForm(false);
    setFormData({ client: '', clientId: '', sousTotal: '', date: '', statut: 'attente' });
    
    alert('✅ Facture créée avec succès !');
  };

  const handleEditFacture = (e) => {
    e.preventDefault();
    const sousTotal = parseFloat(formData.sousTotal);
    const tps = parseFloat(calculerTPS(sousTotal));
    const tvq = parseFloat(calculerTVQ(sousTotal));
    const montantTotal = sousTotal + tps + tvq;

    const updatedFactures = factures.map(f => 
      f.numero === selectedFacture.numero 
        ? {
            ...f,
            client: formData.client,
            sousTotal: parseFloat(sousTotal) || 0,
            tps: parseFloat(tps) || 0,
            tvq: parseFloat(tvq) || 0,
            montantTotal: parseFloat(montantTotal) || 0,
            date: formData.date,
            statut: formData.statut,
            datePaiement: formData.statut === 'payee' ? (formData.datePaiement || formData.date) : null
          }
        : f
    );

    setFactures(updatedFactures);
    console.log('✅ Facture modifiée:', updatedFactures.find(f => f.numero === selectedFacture.numero));
    
    // Mettre à jour aussi dans localStorage
    const facturesLocales = JSON.parse(localStorage.getItem('factures_locales') || '[]');
    const factureIndex = facturesLocales.findIndex(f => f.numero === selectedFacture.numero);
    if (factureIndex !== -1) {
      facturesLocales[factureIndex] = updatedFactures.find(f => f.numero === selectedFacture.numero);
      localStorage.setItem('factures_locales', JSON.stringify(facturesLocales));
    }
    
    setShowEditForm(false);
    setSelectedFacture(null);
    setFormData({ client: '', clientId: '', sousTotal: '', date: '', statut: 'attente' });
    
    alert('✅ Facture modifiée avec succès !');
  };

  const handleDeleteFacture = (numero) => {
    if (window.confirm(`Voulez-vous vraiment supprimer la facture ${numero} ?`)) {
      const facturesMisesAJour = factures.filter(f => f.numero !== numero);
      setFactures(facturesMisesAJour);
      
      // Mettre à jour aussi dans localStorage
      const facturesLocales = JSON.parse(localStorage.getItem('factures_locales') || '[]');
      const facturesLocalesMisesAJour = facturesLocales.filter(f => f.numero !== numero);
      localStorage.setItem('factures_locales', JSON.stringify(facturesLocalesMisesAJour));
      
      alert('✅ Facture supprimée avec succès !');
    }
  };

  const openEditForm = (facture) => {
    setSelectedFacture(facture);
    setFormData({
      client: facture.client,
      clientId: facture.clientId || '', // ⭐ PHASE 5 : Inclure clientId
      sousTotal: facture.sousTotal.toString(),
      date: facture.date,
      statut: facture.statut,
      datePaiement: facture.datePaiement || ''
    });
    setShowEditForm(true);
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

      <div className="finances-page">
        <div className="page-header">
          <h1>💵 Module : Gestion financière</h1>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="error-message" style={{ padding: '1rem', marginBottom: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33' }}>
            ⚠️ {error}
          </div>
        )}

        {/* État de chargement */}
        {isLoading && (
          <div className="loading-message" style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Chargement des factures...</p>
          </div>
        )}

        {/* Statistiques visuelles */}
        {!isLoading && (
          <Fragment>
            <div className="stats-grid">
              <div className="stat-box total">
                <h3>Total du mois</h3>
                <p className="stat-value">
                  {isNaN(totalMois) ? '0.00' : totalMois.toFixed(2)} $
                </p>
                <p className="stat-label">{nombreFactures} facture{nombreFactures > 1 ? 's' : ''}</p>
              </div>
              <div className="stat-box paid">
                <h3>Montant payé</h3>
                <p className="stat-value">
                  {isNaN(totalPayee) ? '0.00' : totalPayee.toFixed(2)} $
                </p>
                <p className="stat-label">{nombrePayees} facture{nombrePayees > 1 ? 's' : ''} payée{nombrePayees > 1 ? 's' : ''}</p>
              </div>
              <div className="stat-box pending">
                <h3>En attente</h3>
                <p className="stat-value">
                  {isNaN(totalAttente) ? '0.00' : totalAttente.toFixed(2)} $
                </p>
                <p className="stat-label">{nombreAttente} facture{nombreAttente > 1 ? 's' : ''} en attente</p>
              </div>
              <div className="stat-box profit">
                <h3>Profit brut estimé</h3>
                <p className="stat-value">
                  {isNaN(profitBrut) ? '0.00' : profitBrut.toFixed(2)} $
                </p>
                <p className="stat-label">Taux de paiement : {tauxPaiement}%</p>
              </div>
            </div>

            <div className="finance-actions">
              <button className="btn btn-create" onClick={() => setShowAddForm(true)}>
                <span>➕</span> Créer une nouvelle facture
              </button>
              <button 
                className="btn btn-view" 
                onClick={async () => {
                  const clientsMap = await chargerClients();
                  await chargerFactures(clientsMap);
                  alert('✅ Factures rechargées !');
                }}
                title="Recharger les factures depuis localStorage et API"
              >
                🔄 Recharger les factures
              </button>
              <button className="btn btn-report">
                <span>📊</span> État financier
              </button>
            </div>

            <div className="table-container">
          {factures.length === 0 ? (
            <div className="no-data-message" style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>📋 Aucune facture trouvée</p>
              <p>Les factures sont créées automatiquement lors des commandes.</p>
            </div>
          ) : (
          <table className="finance-table">
            <thead>
              <tr>
                <th>#Facture</th>
                <th>Client</th>
                <th>Sous-total</th>
                <th>TPS (5%)</th>
                <th>TVQ (9.975%)</th>
                <th>Montant total</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Date paiement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {factures.map(facture => (
                <tr key={facture.numero}>
                  <td className="invoice-number">{facture.numero}</td>
                  <td className="client-name">{facture.client}</td>
                  <td className="amount-cell">{facture.sousTotal.toFixed(2)} $</td>
                  <td className="tax-cell">{facture.tps.toFixed(2)} $</td>
                  <td className="tax-cell">{facture.tvq.toFixed(2)} $</td>
                  <td className="total-cell">{facture.montantTotal.toFixed(2)} $</td>
                  <td className="date-cell">{facture.date}</td>
                  <td>
                    {facture.statut === 'payee' ? (
                      <span className="status-badge paid">✅ Payée</span>
                    ) : (
                      <span className="status-badge pending">⏳ En attente</span>
                    )}
                  </td>
                  <td className="date-cell">{facture.datePaiement || '—'}</td>
                  <td>
                    <div className="action-btns">
                      <button className="mini-btn edit" onClick={() => openEditForm(facture)} title="Modifier">✏️</button>
                      <button className="mini-btn delete" onClick={() => handleDeleteFacture(facture.numero)} title="Supprimer">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
            </div>
          </Fragment>
        )}

        {!isLoading && factures.length > 0 && (
          <Fragment>
            <div className="total-summary">
              <strong>Total du mois : {totalMois.toFixed(2)} $</strong>
            </div>

            <div className="tax-info">
              <h3> Information fiscale</h3>
              <p>• TPS (Taxe sur les produits et services) : 5%</p>
              <p>• TVQ (Taxe de vente du Québec) : 9.975%</p>
              <p>• Formule : Montant total = Sous-total + TPS + TVQ</p>
            </div>
          </Fragment>
        )}
      </div>

      {/* Modal Ajouter facture */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Créer une nouvelle facture</h2>
            <form onSubmit={handleAddFacture}>
              <div className="form-group">
                <label>Client *</label>
                <select
                  value={formData.clientId || ''}
                  onChange={(e) => {
                    const clientId = e.target.value;
                    const client = clientsList.find(c => (c.id || c.Id) == clientId);
                    setFormData({
                      ...formData,
                      clientId: clientId,
                      client: client ? (client.nom || client.Nom || `${client.prenom || client.Prenom || ''} ${client.nom || client.Nom || ''}`.trim()) : formData.client
                    });
                  }}
                  required
                >
                  <option value="">Sélectionner un client</option>
                  {clientsList.map(client => {
                    const clientId = client.id || client.Id;
                    const nomComplet = `${client.prenom || client.Prenom || ''} ${client.nom || client.Nom || ''}`.trim() || client.nom || client.Nom || 'Client sans nom';
                    return (
                      <option key={clientId} value={clientId}>
                        {nomComplet} ({client.email || client.Email || 'Pas d\'email'})
                      </option>
                    );
                  })}
                </select>
                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  ⭐ Si un client est sélectionné, une commande sera créée automatiquement pour mettre à jour les stats CRM
                </small>
              </div>
              <div className="form-group">
                <label>Sous-total (avant taxes) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.sousTotal}
                  onChange={(e) => setFormData({...formData, sousTotal: e.target.value})}
                  required
                />
              </div>
              {formData.sousTotal && (
                <div className="tax-preview">
                  <p>TPS (5%) : {calculerTPS(formData.sousTotal)} $</p>
                  <p>TVQ (9.975%) : {calculerTVQ(formData.sousTotal)} $</p>
                  <p><strong>Total : {(parseFloat(formData.sousTotal) + parseFloat(calculerTPS(formData.sousTotal)) + parseFloat(calculerTVQ(formData.sousTotal))).toFixed(2)} $</strong></p>
                </div>
              )}
              <div className="form-group">
                <label>Date de la facture *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Statut *</label>
                <select
                  value={formData.statut}
                  onChange={(e) => setFormData({...formData, statut: e.target.value})}
                >
                  <option value="attente">En attente</option>
                  <option value="payee">Payée</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-success">Créer la facture</button>
                <button type="button" className="btn btn-cancel" onClick={() => setShowAddForm(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modifier facture */}
      {showEditForm && (
        <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ Modifier la facture {selectedFacture?.numero}</h2>
            <form onSubmit={handleEditFacture}>
              <div className="form-group">
                <label>Nom du client *</label>
                <input
                  type="text"
                  value={formData.client}
                  onChange={(e) => setFormData({...formData, client: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Sous-total (avant taxes) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.sousTotal}
                  onChange={(e) => setFormData({...formData, sousTotal: e.target.value})}
                  required
                />
              </div>
              {formData.sousTotal && (
                <div className="tax-preview">
                  <p>TPS (5%) : {calculerTPS(formData.sousTotal)} $</p>
                  <p>TVQ (9.975%) : {calculerTVQ(formData.sousTotal)} $</p>
                  <p><strong>Total : {(parseFloat(formData.sousTotal) + parseFloat(calculerTPS(formData.sousTotal)) + parseFloat(calculerTVQ(formData.sousTotal))).toFixed(2)} $</strong></p>
                </div>
              )}
              <div className="form-group">
                <label>Date de la facture *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Statut *</label>
                <select
                  value={formData.statut}
                  onChange={(e) => setFormData({...formData, statut: e.target.value})}
                >
                  <option value="attente">En attente</option>
                  <option value="payee">Payée</option>
                </select>
              </div>
              {formData.statut === 'payee' && (
                <div className="form-group">
                  <label>Date de paiement</label>
                  <input
                    type="date"
                    value={formData.datePaiement}
                    onChange={(e) => setFormData({...formData, datePaiement: e.target.value})}
                  />
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="btn btn-success">Enregistrer</button>
                <button type="button" className="btn btn-cancel" onClick={() => setShowEditForm(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Finances;
