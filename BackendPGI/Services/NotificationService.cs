using Microsoft.EntityFrameworkCore;
using Serilog;
using BackendPGI.Data;
using BackendPGI.Models;
using System.Text.Json;

namespace BackendPGI.Services
{
    /// <summary>
    /// Service pour gérer les notifications automatiques pour les différents départements
    /// </summary>
    public class NotificationService
    {
        private readonly ApplicationDbContext _context;

        public NotificationService(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Crée une notification pour un département
        /// </summary>
        public async Task CreerNotificationAsync(
            int departementId,
            string type,
            string titre,
            string? message = null,
            string priorite = "Info",
            string? lienAction = null,
            string? referenceId = null,
            object? donneesSupplementaires = null)
        {
            try
            {
                var notification = new Notification
                {
                    DepartementId = departementId,
                    Type = type,
                    Titre = titre,
                    Message = message,
                    Priorite = priorite,
                    LienAction = lienAction,
                    ReferenceId = referenceId,
                    DateCreation = DateTime.Now,
                    DonneesSupplementaires = donneesSupplementaires != null 
                        ? JsonSerializer.Serialize(donneesSupplementaires) 
                        : null
                };

                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                Log.Information("✅ Notification créée - Département: {DepartementId}, Type: {Type}, Titre: {Titre}",
                    departementId, type, titre);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la création de la notification - Département: {DepartementId}, Type: {Type}",
                    departementId, type);
            }
        }

        /// <summary>
        /// Notifie tous les départements concernés lors d'un paiement/commande
        /// </summary>
        public async Task NotifierPaiementCommandeAsync(Commande commande)
        {
            try
            {
                Log.Information("🔔 Génération des notifications pour la commande {NumeroCommande}", commande.NumeroCommande);

                // 1. NOTIFICATION SERVICE CLIENTÈLE (Département 1)
                await CreerNotificationAsync(
                    departementId: 1, // ServiceClientele
                    type: "NouvelleCommande",
                    titre: $"Nouvelle commande #{commande.NumeroCommande}",
                    message: $"Une nouvelle commande de {commande.MontantTotal:C} a été passée par le client.",
                    priorite: "Info",
                    lienAction: $"/api/ControllerCommande/{commande.Id}",
                    referenceId: commande.Id.ToString(),
                    donneesSupplementaires: new
                    {
                        commandeId = commande.Id,
                        numeroCommande = commande.NumeroCommande,
                        clientId = commande.ClientId,
                        montantTotal = commande.MontantTotal,
                        statut = commande.Statut
                    }
                );

                // 2. NOTIFICATION STOCKS (Département 2)
                // Vérifier les produits avec stock faible après réduction
                var produitsAvecStockFaible = new List<object>();

                foreach (var panier in commande.Paniers ?? new List<Panier>())
                {
                    var produit = await _context.Produits.FindAsync(panier.ProduitSku);
                    if (produit != null)
                    {
                        var stockApresReduction = produit.QuantiteStock;

                        if (stockApresReduction <= produit.StockSecurite)
                        {
                            produitsAvecStockFaible.Add(new
                            {
                                sku = produit.Sku,
                                nomProduit = produit.NomProduit,
                                stockActuel = stockApresReduction,
                                seuilSecurite = produit.StockSecurite,
                                seuilReappro = produit.SeuilReappro,
                                priorite = "Critical"
                            });

                            // Notification critique pour chaque produit en stock critique
                            await CreerNotificationAsync(
                                departementId: 2, // Stocks
                                type: "StockCritique",
                                titre: $"⚠️ Stock CRITIQUE - {produit.NomProduit}",
                                message: $"Le stock du produit {produit.NomProduit} est tombé à {stockApresReduction} unités (seuil de sécurité: {produit.StockSecurite}). Réapprovisionnement URGENT requis !",
                                priorite: "Critical",
                                lienAction: $"/api/ControllerProduit/{produit.Sku}",
                                referenceId: produit.Sku,
                                donneesSupplementaires: new
                                {
                                    sku = produit.Sku,
                                    nomProduit = produit.NomProduit,
                                    stockActuel = stockApresReduction,
                                    seuilSecurite = produit.StockSecurite,
                                    seuilReappro = produit.SeuilReappro
                                }
                            );
                        }
                        else if (stockApresReduction <= produit.SeuilReappro)
                        {
                            produitsAvecStockFaible.Add(new
                            {
                                sku = produit.Sku,
                                nomProduit = produit.NomProduit,
                                stockActuel = stockApresReduction,
                                seuilSecurite = produit.StockSecurite,
                                seuilReappro = produit.SeuilReappro,
                                priorite = "Warning"
                            });

                            // Notification d'alerte pour stock faible
                            await CreerNotificationAsync(
                                departementId: 2, // Stocks
                                type: "StockFaible",
                                titre: $"⚠️ Stock faible - {produit.NomProduit}",
                                message: $"Le stock du produit {produit.NomProduit} est tombé à {stockApresReduction} unités (seuil de réapprovisionnement: {produit.SeuilReappro}). Pensez à réapprovisionner.",
                                priorite: "Warning",
                                lienAction: $"/api/ControllerProduit/{produit.Sku}",
                                referenceId: produit.Sku,
                                donneesSupplementaires: new
                                {
                                    sku = produit.Sku,
                                    nomProduit = produit.NomProduit,
                                    stockActuel = stockApresReduction,
                                    seuilSecurite = produit.StockSecurite,
                                    seuilReappro = produit.SeuilReappro
                                }
                            );
                        }

                        // Notification générale de réduction de stock
                        await CreerNotificationAsync(
                            departementId: 2, // Stocks
                            type: "ReductionStock",
                            titre: $"Stock réduit - {produit.NomProduit}",
                            message: $"Le stock de {produit.NomProduit} a été réduit de {panier.Quantite} unité(s) pour la commande {commande.NumeroCommande}. Stock actuel: {stockApresReduction}",
                            priorite: "Info",
                            lienAction: $"/api/ControllerProduit/{produit.Sku}",
                            referenceId: produit.Sku,
                            donneesSupplementaires: new
                            {
                                sku = produit.Sku,
                                nomProduit = produit.NomProduit,
                                quantiteReduite = panier.Quantite,
                                stockActuel = stockApresReduction,
                                numeroCommande = commande.NumeroCommande
                            }
                        );
                    }
                }

                // 3. NOTIFICATION FINANCES (Département 3)
                // Vérifier si une facture a été créée automatiquement
                var facture = await _context.Factures
                    .FirstOrDefaultAsync(f => f.CommandeId == commande.Id);

                if (facture != null)
                {
                    await CreerNotificationAsync(
                        departementId: 3, // Finances
                        type: "NouvelleFacture",
                        titre: $"Nouvelle facture #{facture.NumeroFacture}",
                        message: $"Une nouvelle facture de {facture.MontantTotal:C} a été générée pour la commande {commande.NumeroCommande}.",
                        priorite: "Info",
                        lienAction: $"/api/ControllerFacture/{facture.Id}",
                        referenceId: facture.Id.ToString(),
                        donneesSupplementaires: new
                        {
                            factureId = facture.Id,
                            numeroFacture = facture.NumeroFacture,
                            commandeId = commande.Id,
                            numeroCommande = commande.NumeroCommande,
                            montantTotal = facture.MontantTotal,
                            statut = facture.Statut
                        }
                    );
                }
                else
                {
                    // Notification de paiement reçu
                    await CreerNotificationAsync(
                        departementId: 3, // Finances
                        type: "PaiementRecu",
                        titre: $"Paiement reçu - Commande #{commande.NumeroCommande}",
                        message: $"Un paiement de {commande.MontantTotal:C} a été reçu pour la commande {commande.NumeroCommande}.",
                        priorite: "Info",
                        lienAction: $"/api/ControllerCommande/{commande.Id}",
                        referenceId: commande.Id.ToString(),
                        donneesSupplementaires: new
                        {
                            commandeId = commande.Id,
                            numeroCommande = commande.NumeroCommande,
                            montantTotal = commande.MontantTotal,
                            statut = commande.Statut
                        }
                    );
                }

                Log.Information("✅ Toutes les notifications ont été créées pour la commande {NumeroCommande}", commande.NumeroCommande);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la génération des notifications pour la commande {NumeroCommande}", commande.NumeroCommande);
            }
        }
    }
}

