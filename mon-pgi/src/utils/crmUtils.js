// Utilitaires pour la synchronisation CRM

/**
 * Met à jour les statistiques d'un client après une commande/facture
 * Note: Les stats sont recalculées automatiquement lors du chargement,
 * mais cette fonction peut être utilisée pour forcer une mise à jour
 */
export const notifierNouvelleCommande = (clientId, montantTotal) => {
  if (!clientId) {
    console.log('Pas de clientId, notification CRM ignorée');
    return;
  }
  
  // Sauvegarder un événement pour forcer le recalcul des stats
  const evenements = JSON.parse(localStorage.getItem('crm_evenements') || '[]');
  evenements.push({
    type: 'commande',
    clientId: clientId,
    montantTotal: montantTotal,
    date: new Date().toISOString()
  });
  localStorage.setItem('crm_evenements', JSON.stringify(evenements));
  console.log('✅ CRM notifié de la nouvelle commande pour client', clientId);
};

/**
 * Marquer qu'un client doit être recalculé
 */
export const marquerClientARecalculer = (clientId) => {
  if (!clientId) return;
  
  const clientsARecalculer = JSON.parse(localStorage.getItem('crm_clients_recalculer') || '[]');
  if (!clientsARecalculer.includes(clientId)) {
    clientsARecalculer.push(clientId);
    localStorage.setItem('crm_clients_recalculer', JSON.stringify(clientsARecalculer));
  }
};

