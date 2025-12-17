/**
 * Utilitaires pour la gestion du panier avec clés spécifiques par utilisateur
 */

/**
 * Obtient l'identifiant unique de l'utilisateur connecté
 * @returns {string|null} L'identifiant unique (email ou id) ou null si non connecté
 */
export const getUserId = () => {
  try {
    // Vérifier d'abord si c'est un client
    const clientConnecte = localStorage.getItem('clientConnecte');
    if (clientConnecte) {
      const client = JSON.parse(clientConnecte);
      // Utiliser l'email comme identifiant unique (plus fiable que l'id)
      return client.email || `client_${client.id}`;
    }

    // Sinon vérifier si c'est un employé
    const employeConnecte = localStorage.getItem('employeConnecte');
    if (employeConnecte) {
      const employe = JSON.parse(employeConnecte);
      // Utiliser l'email si disponible, sinon le numéro d'employé
      return employe.email || employe.numeroEmploye || `employe_${employe.id}`;
    }

    // Si aucun utilisateur connecté, retourner null
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'identifiant utilisateur:', error);
    return null;
  }
};

/**
 * Obtient la clé du panier pour l'utilisateur actuel
 * @returns {string} La clé du panier (ex: 'panier_client@example.com' ou 'panier_guest')
 */
export const getPanierKey = () => {
  const userId = getUserId();
  if (userId) {
    return `panier_${userId}`;
  }
  // Si aucun utilisateur connecté, utiliser une clé pour les invités
  return 'panier_guest';
};

/**
 * Charge le panier de l'utilisateur actuel depuis localStorage
 * @returns {Array} Le panier (tableau vide si aucun panier)
 */
export const chargerPanier = () => {
  try {
    const panierKey = getPanierKey();
    const panierLocal = localStorage.getItem(panierKey);
    if (panierLocal) {
      return JSON.parse(panierLocal);
    }
    return [];
  } catch (error) {
    console.error('Erreur lors du chargement du panier:', error);
    return [];
  }
};

/**
 * Sauvegarde le panier de l'utilisateur actuel dans localStorage
 * @param {Array} panier - Le panier à sauvegarder
 */
export const sauvegarderPanier = (panier) => {
  try {
    const panierKey = getPanierKey();
    localStorage.setItem(panierKey, JSON.stringify(panier));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du panier:', error);
  }
};

/**
 * Vide le panier de l'utilisateur actuel
 */
export const viderPanier = () => {
  try {
    const panierKey = getPanierKey();
    localStorage.removeItem(panierKey);
  } catch (error) {
    console.error('Erreur lors de la suppression du panier:', error);
  }
};

/**
 * Calcule le nombre total d'articles dans le panier
 * @returns {number} Le nombre total d'articles
 */
export const getNombreArticlesPanier = () => {
  const panier = chargerPanier();
  return panier.reduce((total, item) => total + (item.quantite || 0), 0);
};

/**
 * Nettoie le panier invité (panier_guest) si nécessaire
 * Utile pour s'assurer que les invités commencent avec un panier vide
 */
export const nettoyerPanierGuest = () => {
  try {
    const userId = getUserId();
    // Ne nettoyer que si personne n'est connecté (guest)
    if (!userId) {
      const panierGuest = localStorage.getItem('panier_guest');
      if (panierGuest) {
        try {
          const panier = JSON.parse(panierGuest);
          // Si le panier guest contient des articles, on peut le vider
          // (optionnel - on peut aussi le garder pour permettre aux invités de continuer)
          // Pour l'instant, on le garde mais on pourrait ajouter une option pour le vider
        } catch (e) {
          // Si erreur de parsing, supprimer
          localStorage.removeItem('panier_guest');
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage du panier guest:', error);
  }
};

/**
 * Nettoie les anciens paniers (migration depuis l'ancienne clé 'panier')
 * À appeler lors de la connexion d'un utilisateur
 * Ne migre QUE si un utilisateur est connecté (pas pour les invités)
 */
export const migrerAncienPanier = () => {
  try {
    const userId = getUserId();
    // Ne migrer que si un utilisateur est connecté (pas pour les invités)
    if (!userId) {
      // Pour les invités, supprimer l'ancien panier global s'il existe
      // pour éviter qu'il soit utilisé par erreur
      const ancienPanier = localStorage.getItem('panier');
      if (ancienPanier) {
        try {
          const panierParse = JSON.parse(ancienPanier);
          // Si l'ancien panier contient des articles, on le supprime pour les invités
          // car ils ne devraient pas avoir de panier persistant
          if (panierParse && panierParse.length > 0) {
            localStorage.removeItem('panier');
            console.log('Ancien panier global supprimé pour les invités');
          }
        } catch (e) {
          // Si erreur de parsing, supprimer quand même
          localStorage.removeItem('panier');
        }
      }
      
      // Aussi nettoyer le panier guest s'il existe déjà (données résiduelles)
      // Les invités devraient commencer avec un panier vide
      const panierGuest = localStorage.getItem('panier_guest');
      if (panierGuest) {
        try {
          const panierGuestParse = JSON.parse(panierGuest);
          // Si le panier guest contient des articles, on le vide
          // car les invités ne devraient pas avoir de panier persistant entre sessions
          if (panierGuestParse && panierGuestParse.length > 0) {
            localStorage.removeItem('panier_guest');
            console.log('Panier guest nettoyé (les invités commencent avec un panier vide)');
          }
        } catch (e) {
          // Si erreur de parsing, supprimer quand même
          localStorage.removeItem('panier_guest');
        }
      }
      
      return;
    }

    // Migration pour utilisateur connecté
    const ancienPanier = localStorage.getItem('panier');
    if (ancienPanier) {
      const panierKey = getPanierKey();
      // Si l'utilisateur n'a pas encore de panier, migrer l'ancien
      if (!localStorage.getItem(panierKey)) {
        localStorage.setItem(panierKey, ancienPanier);
        console.log('Ancien panier migré vers:', panierKey);
      }
      // Supprimer l'ancien panier global après migration
      localStorage.removeItem('panier');
    }
  } catch (error) {
    console.error('Erreur lors de la migration du panier:', error);
  }
};

