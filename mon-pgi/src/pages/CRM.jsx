import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import './CRM.css';

function CRM({ onLogout }) {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const isChargingRef = useRef(false);
  
  // États pour la gestion des commentaires
  const [commentaires, setCommentaires] = useState({});
  const [clientSelectionne, setClientSelectionne] = useState(null);
  const [showModalCommentaires, setShowModalCommentaires] = useState(false);
  const [nouveauCommentaire, setNouveauCommentaire] = useState('');

  // Déterminer le statut d'un client selon les règles d'affaires
  const determinerStatut = (nbCommandes, totalAchats, derniereActivite) => {
    // Prospect : aucune commande
    if (nbCommandes === 0) {
      return 'Prospect';
    }

    // Fidèle : > 5 commandes OU > 3000$ d'achats
    if (nbCommandes > 5 || totalAchats > 3000) {
      return 'Fidèle';
    }

    // Inactif : aucune activité depuis 12 mois
    if (derniereActivite) {
      const dateActivite = new Date(derniereActivite);
      const douzeMoisAgo = new Date();
      douzeMoisAgo.setMonth(douzeMoisAgo.getMonth() - 12);
      
      if (dateActivite < douzeMoisAgo) {
        return 'Inactif';
      }
    }

    // Actif : par défaut si aucune autre condition
    return 'Actif';
  };

  // Charger les clients et leurs commandes
  const chargerClients = useCallback(async () => {
    if (isChargingRef.current) {
      return;
    }

    isChargingRef.current = true;
    setIsLoading(true);
    setError('');

    try {
      // Charger les clients
      const clientsResponse = await fetch('http://localhost:5000/api/ControllerClient', {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        }
      });

      if (!clientsResponse.ok) {
        throw new Error(`Erreur ${clientsResponse.status}: Impossible de charger les clients`);
      }

      const clientsData = await clientsResponse.json();
      if (!Array.isArray(clientsData)) {
        throw new Error('Format de réponse invalide: attendu un tableau de clients');
      }

      console.log('👥 Clients chargés depuis l\'API:', clientsData.length, 'clients');
      if (clientsData.length > 0) {
        console.log('👥 Exemple de client:', clientsData[0]);
        // Afficher tous les IDs de clients
        const clientIds = clientsData.map(c => parseInt(c.id || c.Id || 0)).filter(id => !isNaN(id) && id > 0);
        console.log('👥 IDs de clients (nombres):', clientIds);
      }

      // Charger les commandes
      let commandes = [];
      const commandesEndpoints = [
        'http://localhost:5000/api/ControllerCommande',
        'http://localhost:5000/api/Commande',
        'http://localhost:5000/api/Commandes'
      ];

      for (const endpoint of commandesEndpoints) {
        try {
          const commandesResponse = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'accept': '*/*',
              'Content-Type': 'application/json'
            }
          });

          if (commandesResponse.ok) {
            const data = await commandesResponse.json();
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

      console.log('📦 Commandes chargées depuis l\'API:', commandes.length, 'commandes');
      if (commandes.length > 0) {
        console.log('📦 Exemple de commande (structure complète):', JSON.stringify(commandes[0], null, 2));
        // Afficher tous les champs possibles pour identifier le client
        const tousLesChamps = Object.keys(commandes[0]);
        console.log('📦 Tous les champs de la commande:', tousLesChamps);
        // Afficher tous les IDs de clients dans les commandes (tous les formats possibles)
        const clientIdsDansCommandes = commandes.map(cmd => {
          let id = cmd.clientId || cmd.client_id || cmd.ClientId;
          if (!id && cmd.client && typeof cmd.client === 'object') {
            id = cmd.client.id || cmd.client.Id || cmd.client.clientId;
          }
          if (!id && cmd.Client && typeof cmd.Client === 'object') {
            id = cmd.Client.id || cmd.Client.Id || cmd.Client.clientId;
          }
          return id;
        }).filter(id => id !== undefined && id !== null);
        console.log('📦 IDs de clients trouvés dans les commandes (tous formats):', [...new Set(clientIdsDansCommandes)]);
        console.log('📦 IDs de clients uniques (nombres):', [...new Set(clientIdsDansCommandes.map(id => parseInt(id)).filter(id => !isNaN(id)))]);
      } else {
        console.warn('⚠️ Aucune commande chargée depuis l\'API. Vérifiez que le backend est démarré et que les endpoints sont corrects.');
      }

      // Calculer les statistiques par client
      const clientsAvecStats = clientsData.map((client, index) => {
        // Extraire l'ID du client (convertir en nombre pour comparaison)
        const clientId = parseInt(client.id || client.Id || 0);
        
        if (!clientId || isNaN(clientId)) {
          console.warn('Client sans ID valide:', client, 'Index:', index);
        }
        
        // Extraire les informations du client depuis l'API
        const nomClient = client.nom || client.Nom || '';
        const prenomClient = client.prenom || client.Prenom || '';
        const nomComplet = `${prenomClient} ${nomClient}`.trim() || nomClient || 'Sans nom';
        
        // Filtrer les commandes de ce client (essayer tous les formats possibles)
        const commandesClient = commandes.filter(cmd => {
          // ⭐ PRIORITÉ 1 : Si cmd.client est un objet, extraire l'ID directement
          let cmdClientIdRaw = null;
          
          if (cmd.client && typeof cmd.client === 'object' && !Array.isArray(cmd.client)) {
            // C'est un objet client imbriqué, extraire l'ID
            cmdClientIdRaw = cmd.client.id || cmd.client.Id || cmd.client.clientId || null;
          }
          // ⭐ PRIORITÉ 2 : Si cmd.Client est un objet (PascalCase)
          else if (cmd.Client && typeof cmd.Client === 'object' && !Array.isArray(cmd.Client)) {
            cmdClientIdRaw = cmd.Client.id || cmd.Client.Id || cmd.Client.clientId || null;
          }
          // ⭐ PRIORITÉ 3 : Essayer les champs directs (ID simple, pas objet)
          else {
            cmdClientIdRaw = 
              cmd.clientId || 
              cmd.client_id || 
              cmd.ClientId || 
              cmd.idClient || 
              cmd.IdClient ||
              cmd.clientIdCommande ||
              null;
            
            // Si c'est un objet, ne pas l'utiliser
            if (cmdClientIdRaw && typeof cmdClientIdRaw === 'object') {
              cmdClientIdRaw = null;
            }
          }
          
          if (cmdClientIdRaw === null || cmdClientIdRaw === undefined) {
            // Log pour le premier client pour voir pourquoi aucune correspondance
            if (index === 0 && commandes.length > 0) {
              console.log('⚠️ Commande sans ID client trouvé:', {
                commandeId: cmd.id || cmd.Id,
                client: cmd.client,
                clientId: cmd.clientId,
                tousLesChamps: Object.keys(cmd)
              });
            }
            return false;
          }
          
          // Convertir en nombre pour comparaison
          const cmdClientId = parseInt(cmdClientIdRaw);
          const clientIdNum = parseInt(clientId);
          
          // Comparer les IDs en nombres
          const correspond = cmdClientId === clientIdNum && !isNaN(cmdClientId) && !isNaN(clientIdNum);
          
          // Log pour déboguer le premier client (seulement pour les 3 premières commandes)
          if (index === 0 && commandes.length > 0 && commandes.indexOf(cmd) < 3) {
            console.log(`🔍 Comparaison commande ${commandes.indexOf(cmd) + 1}: cmdClientId=${cmdClientIdRaw} (${typeof cmdClientIdRaw}) -> ${cmdClientId}, clientId=${clientId} -> ${clientIdNum}, correspond=${correspond}`);
          }
          
          return correspond;
        });

        // Log pour déboguer
        if (index === 0) {
          console.log('👤 Premier client - ID:', clientId, 'Type:', typeof clientId);
          console.log('👤 Nom complet:', nomComplet);
          console.log('👤 Total commandes dans l\'API:', commandes.length);
          console.log('👤 Commandes trouvées pour ce client:', commandesClient.length);
          if (commandesClient.length > 0) {
            console.log('👤 Exemple de commande du client:', commandesClient[0]);
          } else if (commandes.length > 0) {
            console.warn('⚠️ Aucune commande trouvée pour ce client malgré', commandes.length, 'commandes dans l\'API');
            // Afficher les IDs de clients dans les commandes pour comparaison
            const idsCommandes = commandes.slice(0, 5).map(cmd => {
              let id = cmd.clientId || cmd.client_id || cmd.ClientId;
              if (!id && cmd.client && typeof cmd.client === 'object') {
                id = cmd.client.id || cmd.client.Id || cmd.client.clientId;
              }
              return { commandeId: cmd.id || cmd.Id, clientId: id, type: typeof id };
            });
            console.warn('⚠️ Exemples d\'IDs dans les commandes:', idsCommandes);
          }
        }

        // Calculer les statistiques depuis les commandes réelles
        let nbCommandes = commandesClient.length;
        
        // ⭐ Si aucune commande trouvée mais qu'il y a des factures, utiliser les factures pour compter
        if (nbCommandes === 0) {
          try {
            // Charger les factures locales pour ce client
            const facturesLocales = JSON.parse(localStorage.getItem('factures_locales') || '[]');
            const facturesClient = facturesLocales.filter(facture => {
              const factureClientId = facture.clientId || facture.client_id || facture.ClientId;
              return factureClientId && parseInt(factureClientId) === parseInt(clientId);
            });
            
            if (facturesClient.length > 0) {
              nbCommandes = facturesClient.length;
              console.log(`✅ Nombre de commandes récupéré depuis les factures pour client ${clientId}: ${nbCommandes}`);
            }
          } catch (error) {
            console.warn('Erreur lors de la récupération des factures pour compter les commandes:', error);
          }
        }
        
        // Calculer le total des achats (somme des montants totaux des commandes)
        // ⭐ LOGIQUE : Calculer depuis les prix des articles de chaque commande
        let totalAchats = commandesClient.reduce((total, cmd) => {
          let montant = 0;
          
          // Priorité 1: montantTotal directement (camelCase)
          if (cmd.montantTotal !== undefined && cmd.montantTotal !== null) {
            montant = parseFloat(cmd.montantTotal);
          }
          // Priorité 2: montant_total (snake_case)
          else if (cmd.montant_total !== undefined && cmd.montant_total !== null) {
            montant = parseFloat(cmd.montant_total);
          }
          // Priorité 3: MontantTotal (PascalCase)
          else if (cmd.MontantTotal !== undefined && cmd.MontantTotal !== null) {
            montant = parseFloat(cmd.MontantTotal);
          }
          // Priorité 4: Calculer depuis les paniers/items de la commande
          else if (cmd.paniers && Array.isArray(cmd.paniers) && cmd.paniers.length > 0) {
            montant = cmd.paniers.reduce((sum, panier) => {
              const prixUnitaire = parseFloat(panier.prixUnitaire || panier.prix_unitaire || panier.PrixUnitaire || panier.prix || panier.Prix || 0);
              const quantite = parseFloat(panier.quantite || panier.Quantite || 1);
              return sum + (prixUnitaire * quantite);
            }, 0);
          }
          // Priorité 5: items (format alternatif)
          else if (cmd.items && Array.isArray(cmd.items) && cmd.items.length > 0) {
            montant = cmd.items.reduce((sum, item) => {
              const prixUnitaire = parseFloat(item.prixUnitaire || item.prix_unitaire || item.PrixUnitaire || item.prix || item.Prix || item.prixVente || 0);
              const quantite = parseFloat(item.quantite || item.Quantite || 1);
              return sum + (prixUnitaire * quantite);
            }, 0);
          }
          // Priorité 6: montant (simple)
          else if (cmd.montant !== undefined && cmd.montant !== null) {
            montant = parseFloat(cmd.montant);
          }
          // Priorité 7: Montant (PascalCase)
          else if (cmd.Montant !== undefined && cmd.Montant !== null) {
            montant = parseFloat(cmd.Montant);
          }
          
          // Debug pour le premier client
          if (index === 0 && commandesClient.length > 0) {
            console.log('🔍 Commande analysée:', {
              id: cmd.id || cmd.Id,
              montantTotal: cmd.montantTotal,
              paniers: cmd.paniers,
              items: cmd.items,
              montantCalculé: montant,
              tousLesChamps: Object.keys(cmd)
            });
          }
          
          if (isNaN(montant) || montant <= 0) {
            if (index === 0 && commandesClient.length > 0) {
              console.warn('⚠️ Montant invalide pour commande:', {
                commandeId: cmd.id || cmd.Id,
                montantCalculé: montant,
                aPaniers: !!cmd.paniers,
                aItems: !!cmd.items,
                tousLesChamps: Object.keys(cmd)
              });
            }
            return total;
          }
          
          return total + montant;
        }, 0);
        
        // ⭐ Si le total est 0 mais qu'il y a des commandes, essayer de récupérer depuis les factures
        if (totalAchats === 0 && commandesClient.length > 0) {
          try {
            // Charger les factures locales
            const facturesLocales = JSON.parse(localStorage.getItem('factures_locales') || '[]');
            // Filtrer les factures pour ce client
            const facturesClient = facturesLocales.filter(facture => {
              const factureClientId = facture.clientId || facture.client_id || facture.ClientId;
              return factureClientId && parseInt(factureClientId) === parseInt(clientId);
            });
            
            if (facturesClient.length > 0) {
              const totalFactures = facturesClient.reduce((sum, f) => {
                const montant = parseFloat(f.montantTotal) || 0;
                return sum + montant;
              }, 0);
              
              if (totalFactures > 0) {
                totalAchats = totalFactures;
                console.log(`✅ Total des achats récupéré depuis les factures pour client ${clientId}: ${totalAchats.toFixed(2)} $`);
              }
            }
          } catch (error) {
            console.warn('Erreur lors de la récupération des factures:', error);
          }
        }

        // Log pour le premier client
        if (index === 0) {
          console.log(`📊 Client ${clientId} (${nomComplet}):`, {
            nbCommandes,
            totalAchats: totalAchats.toFixed(2),
            commandesClient: commandesClient.map(cmd => {
              let montantCmd = 0;
              if (cmd.montantTotal) montantCmd = parseFloat(cmd.montantTotal);
              else if (cmd.paniers && Array.isArray(cmd.paniers)) {
                montantCmd = cmd.paniers.reduce((sum, p) => {
                  const prix = parseFloat(p.prixUnitaire || p.prix_unitaire || p.prix || 0);
                  const qty = parseFloat(p.quantite || 1);
                  return sum + (prix * qty);
                }, 0);
              }
              return {
                id: cmd.id || cmd.Id,
                montantTotal: cmd.montantTotal,
                paniers: cmd.paniers ? `${cmd.paniers.length} items` : 'aucun',
                montantCalculé: montantCmd.toFixed(2)
              };
            })
          });
        }
        
        // Debug supplémentaire si totalAchats est 0 mais qu'il y a des commandes
        if (totalAchats === 0 && commandesClient.length > 0) {
          console.warn(`⚠️ Client ${clientId} (${nomComplet}): ${commandesClient.length} commande(s) mais totalAchats = 0`);
          commandesClient.forEach((cmd, cmdIndex) => {
            let montantCmd = 0;
            if (cmd.montantTotal) montantCmd = parseFloat(cmd.montantTotal);
            else if (cmd.paniers && Array.isArray(cmd.paniers)) {
              montantCmd = cmd.paniers.reduce((sum, p) => {
                const prix = parseFloat(p.prixUnitaire || p.prix_unitaire || p.prix || 0);
                const qty = parseFloat(p.quantite || 1);
                return sum + (prix * qty);
              }, 0);
            }
            console.warn(`  Commande ${cmdIndex + 1}:`, {
              id: cmd.id || cmd.Id,
              montantTotal: cmd.montantTotal,
              paniers: cmd.paniers,
              items: cmd.items,
              montantCalculé: montantCmd,
              tousLesChamps: Object.keys(cmd)
            });
          });
        }

        // Trouver la dernière activité (dernière commande)
        let derniereActivite = null;
        let derniereActiviteFormatee = '—';
        if (commandesClient.length > 0) {
          const datesCommandes = commandesClient
            .map(cmd => {
              const dateStr = cmd.dateCommande || cmd.date_commande || cmd.DateCommande;
              if (!dateStr) return null;
              const date = new Date(dateStr);
              return isNaN(date.getTime()) ? null : date;
            })
            .filter(date => date !== null);
          
          if (datesCommandes.length > 0) {
            const derniereDate = new Date(Math.max(...datesCommandes.map(d => d.getTime())));
            derniereActivite = derniereDate.toISOString();
            derniereActiviteFormatee = derniereDate.toLocaleDateString('fr-CA', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          }
        }

        // Déterminer le statut selon les règles d'affaires
        const statut = determinerStatut(nbCommandes, totalAchats, derniereActivite);

        // Note de satisfaction : mettre à 0 si elle n'existe pas
        const note = client.note || client.satisfaction || client.noteSatisfaction || 0;

        // Type de client (peut être déterminé par l'adresse ou d'autres critères)
        // Pour l'instant, on utilise 'Particulier' par défaut
        // Si vous avez un champ 'type' dans l'API, utilisez-le
        const typeClient = client.type || client.Type || 'Particulier';

        // Date de création du client
        const dateCreation = client.dateCreation || client.date_creation || client.DateCreation;
        let dateCreationFormatee = '—';
        if (dateCreation) {
          try {
            const date = new Date(dateCreation);
            if (!isNaN(date.getTime())) {
              dateCreationFormatee = date.toLocaleDateString('fr-CA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              });
            }
          } catch (e) {
            // Garder la valeur par défaut
          }
        }

        // Formater l'ID client (utiliser l'ID réel, pas un formatage)
        const idFormate = clientId > 0 ? `C${String(clientId).padStart(3, '0')}` : `C${String(index + 1).padStart(3, '0')}`;

        return {
          id: idFormate,
          idOriginal: clientId,
          nom: nomComplet,
          telephone: client.telephone || client.Telephone || '—',
          email: client.email || client.Email || '—',
          adresse: client.adresse || client.Adresse || '—',
          type: typeClient,
          statut,
          note: note > 0 ? Math.min(5, Math.max(0, note)) : 0, // 0 si pas de note
          nbCommandes,
          totalAchats: parseFloat(totalAchats.toFixed(2)) || 0, // S'assurer que c'est toujours un nombre
          derniereActivite: derniereActiviteFormatee,
          derniereActiviteISO: derniereActivite,
          dateCreation: dateCreationFormatee,
          // Informations supplémentaires pour référence
          commandesClient: commandesClient // Garder les commandes pour référence future
        };
      });

      setClients(clientsAvecStats);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      setError(`Impossible de charger les clients. ${error.message}`);
    } finally {
      setIsLoading(false);
      isChargingRef.current = false;
    }
  }, []);

  // Charger les commentaires depuis localStorage
  useEffect(() => {
    try {
      const commentairesSauvegardes = localStorage.getItem('crm_commentaires');
      if (commentairesSauvegardes) {
        setCommentaires(JSON.parse(commentairesSauvegardes));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des commentaires:', error);
    }
  }, []);

  // Sauvegarder les commentaires dans localStorage
  const sauvegarderCommentaires = (nouveauxCommentaires) => {
    try {
      localStorage.setItem('crm_commentaires', JSON.stringify(nouveauxCommentaires));
      setCommentaires(nouveauxCommentaires);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des commentaires:', error);
    }
  };

  // Obtenir le nom de l'employé connecté
  const getNomEmploye = () => {
    try {
      const employeData = localStorage.getItem('employeConnecte');
      if (employeData) {
        const employe = JSON.parse(employeData);
        return `${employe.prenom || employe.Prenom || ''} ${employe.nom || employe.Nom || ''}`.trim() || 'Employé';
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du nom employé:', error);
    }
    return 'Employé';
  };

  // Ouvrir la modal de commentaires pour un client
  const ouvrirModalCommentaires = (client) => {
    setClientSelectionne(client);
    setShowModalCommentaires(true);
    setNouveauCommentaire('');
  };

  // Fermer la modal
  const fermerModalCommentaires = () => {
    setShowModalCommentaires(false);
    setClientSelectionne(null);
    setNouveauCommentaire('');
  };

  // Ajouter un commentaire
  const ajouterCommentaire = () => {
    if (!clientSelectionne || !nouveauCommentaire.trim()) {
      return;
    }

    const clientId = clientSelectionne.idOriginal || clientSelectionne.id;
    const commentairesClient = commentaires[clientId] || [];
    
    const nouveauCommentaireObj = {
      id: Date.now(),
      texte: nouveauCommentaire.trim(),
      date: new Date().toISOString(),
      auteur: getNomEmploye()
    };

    const nouveauxCommentaires = {
      ...commentaires,
      [clientId]: [...commentairesClient, nouveauCommentaireObj]
    };

    sauvegarderCommentaires(nouveauxCommentaires);
    setNouveauCommentaire('');
  };

  // Supprimer un commentaire
  const supprimerCommentaire = (clientId, commentaireId) => {
    const commentairesClient = commentaires[clientId] || [];
    const nouveauxCommentaires = {
      ...commentaires,
      [clientId]: commentairesClient.filter(c => c.id !== commentaireId)
    };

    sauvegarderCommentaires(nouveauxCommentaires);
  };

  // Obtenir le nombre de commentaires pour un client
  const getNombreCommentaires = (clientId) => {
    const commentairesClient = commentaires[clientId] || [];
    return commentairesClient.length;
  };

  // Charger les clients au montage
  useEffect(() => {
    chargerClients();
  }, [chargerClients]);

  // ⭐ PHASE 3 : Écouter les notifications de nouvelles commandes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'crm_evenements' || e.key === 'crm_clients_recalculer') {
        // Recharger les clients pour recalculer les stats
        console.log('Événement CRM détecté, rechargement des clients...');
        chargerClients();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Vérifier périodiquement s'il y a de nouveaux événements
    const interval = setInterval(() => {
      const evenements = JSON.parse(localStorage.getItem('crm_evenements') || '[]');
      if (evenements.length > 0) {
        console.log('Nouveaux événements CRM détectés, rechargement des clients...');
        chargerClients();
        // Nettoyer les événements traités
        localStorage.removeItem('crm_evenements');
      }
    }, 5000); // Vérifier toutes les 5 secondes
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [chargerClients]);

  const filteredClients = clients.filter(client =>
    client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStars = (note) => {
    if (!note || note === 0) return '—';
    return '⭐'.repeat(Math.min(5, Math.max(0, note)));
  };

  const clientsActifs = clients.filter(c => c.statut === 'Actif' || c.statut === 'Fidèle').length;
  const clientsFideles = clients.filter(c => c.statut === 'Fidèle').length;
  const clientsProspects = clients.filter(c => c.statut === 'Prospect').length;
  const tauxFidelisation = clients.length > 0 
    ? ((clientsFideles / clients.length) * 100).toFixed(1)
    : '0.0';
  
  // Calculer le panier moyen : total des achats / nombre total de commandes
  const clientsAvecCommandes = clients.filter(c => c.nbCommandes > 0);
  const totalCommandes = clients.reduce((sum, c) => sum + c.nbCommandes, 0);
  const panierMoyen = totalCommandes > 0
    ? (clients.reduce((sum, c) => sum + c.totalAchats, 0) / totalCommandes).toFixed(2)
    : '0.00';

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

      <div className="crm-page">
        <div className="page-header">
          <h1>👥 Module : Gestion des clients (CRM)</h1>
          {error && (
            <div className="error-message" style={{ marginTop: '1rem', padding: '0.5rem', background: '#fee', color: '#c33', borderRadius: '4px' }}>
              {error}
            </div>
          )}
        </div>

        <div className="crm-summary">
          <div className="summary-item">
            <strong>Total clients :</strong> {clients.length}
          </div>
          <div className="summary-item">
            <strong>Clients actifs :</strong> <span className="active-count">{clientsActifs}</span>
          </div>
          <div className="summary-item">
            <strong>Clients fidèles :</strong> <span className="loyal-count">{clientsFideles}</span>
          </div>
          <div className="summary-item">
            <strong>Prospects :</strong> {clientsProspects}
          </div>
          <div className="summary-item">
            <strong>Taux de fidélisation :</strong> {tauxFidelisation}%
          </div>
          <div className="summary-item">
            <strong>Panier moyen :</strong> {panierMoyen} $
          </div>
        </div>

        <div className="crm-actions">
          <button className="btn btn-add">
            <span>➕</span> Ajouter un client
          </button>
          <button className="btn btn-message">
            <span>📧</span> Envoyer message
          </button>
          <div className="search-container">
            <input
              type="text"
              placeholder="🔍 Rechercher (nom, email, ID)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="table-container">
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
              Chargement des clients...
            </div>
          ) : filteredClients.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
              {searchTerm ? 'Aucun client trouvé pour cette recherche.' : 'Aucun client enregistré.'}
            </div>
          ) : (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>ID Client</th>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Téléphone</th>
                  <th>Email</th>
                  <th>Nb commandes</th>
                  <th>Total achats</th>
                  <th>Dernière activité</th>
                  <th>Note</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => {
                  const clientId = client.idOriginal || client.id;
                  const nbCommentaires = getNombreCommentaires(clientId);
                  return (
                    <tr key={client.id}>
                      <td className="client-id">{client.id}</td>
                      <td className="client-name">{client.nom}</td>
                      <td>{client.type}</td>
                      <td className="phone-cell">{client.telephone}</td>
                      <td className="email-cell">{client.email}</td>
                      <td className="center-cell">{client.nbCommandes}</td>
                      <td className="amount-cell">{client.totalAchats.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</td>
                      <td className="date-cell">{client.derniereActivite}</td>
                      <td className="rating-cell">
                        <span className="stars">{renderStars(client.note)}</span>
                      </td>
                      <td>
                        {client.statut === 'Fidèle' ? (
                          <span className="status-badge loyal">⭐ Fidèle</span>
                        ) : client.statut === 'Actif' ? (
                          <span className="status-badge active">✅ Actif</span>
                        ) : client.statut === 'Prospect' ? (
                          <span className="status-badge prospect">🔍 Prospect</span>
                        ) : (
                          <span className="status-badge inactive">⏸️ Inactif</span>
                        )}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-commentaires"
                          onClick={() => ouvrirModalCommentaires(client)}
                          title="Voir/Ajouter des commentaires"
                        >
                          💬 Commentaires {nbCommentaires > 0 && <span className="comment-count">({nbCommentaires})</span>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="selection-section">
          Sélection : <button>Voir Détails Client</button> <button>Historique d'achats</button> <button>Ajouter une interaction</button>
        </div>

        <div className="business-rules-info">
          <h3>📋 Règles d'affaires appliquées :</h3>
          <ul>
            <li>Statut <strong>Fidèle</strong> : &gt; 5 commandes OU &gt; 3000$ d'achats</li>
            <li>Statut <strong>Inactif</strong> : aucune activité depuis 12 mois</li>
            <li>Statut <strong>Prospect</strong> : aucune commande effectuée</li>
            <li>Alerte si note de satisfaction ≤ 2</li>
          </ul>
        </div>
      </div>

      {/* Modal des commentaires */}
      {showModalCommentaires && clientSelectionne && (
        <div className="modal-overlay" onClick={fermerModalCommentaires}>
          <div className="modal-commentaires" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💬 Commentaires - {clientSelectionne.nom}</h2>
              <button className="modal-close" onClick={fermerModalCommentaires}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Liste des commentaires existants */}
              <div className="commentaires-list">
                {(() => {
                  const clientId = clientSelectionne.idOriginal || clientSelectionne.id;
                  const commentairesClient = commentaires[clientId] || [];
                  
                  if (commentairesClient.length === 0) {
                    return (
                      <div className="no-comments">
                        <p>Aucun commentaire pour ce client.</p>
                        <p>Soyez le premier à ajouter un commentaire !</p>
                      </div>
                    );
                  }

                  return commentairesClient
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(commentaire => (
                      <div key={commentaire.id} className="commentaire-item">
                        <div className="commentaire-header">
                          <div className="commentaire-auteur">
                            <strong>{commentaire.auteur}</strong>
                            <span className="commentaire-date">
                              {new Date(commentaire.date).toLocaleString('fr-CA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <button
                            className="btn-supprimer-commentaire"
                            onClick={() => {
                              if (window.confirm('Voulez-vous vraiment supprimer ce commentaire ?')) {
                                supprimerCommentaire(clientId, commentaire.id);
                              }
                            }}
                            title="Supprimer ce commentaire"
                          >
                            🗑️
                          </button>
                        </div>
                        <div className="commentaire-texte">{commentaire.texte}</div>
                      </div>
                    ));
                })()}
              </div>

              {/* Formulaire pour ajouter un commentaire */}
              <div className="commentaire-form">
                <h3>Ajouter un commentaire</h3>
                <textarea
                  className="commentaire-textarea"
                  placeholder="Écrivez votre commentaire ici..."
                  value={nouveauCommentaire}
                  onChange={(e) => setNouveauCommentaire(e.target.value)}
                  rows="4"
                />
                <div className="commentaire-actions">
                  <button
                    className="btn-ajouter-commentaire"
                    onClick={ajouterCommentaire}
                    disabled={!nouveauCommentaire.trim()}
                  >
                    💾 Enregistrer le commentaire
                  </button>
                  <button
                    className="btn-annuler-commentaire"
                    onClick={fermerModalCommentaires}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CRM;
