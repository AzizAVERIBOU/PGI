using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Serilog;
using BackendPGI.Data;
using BackendPGI.Models;
using BackendPGI.Models.DTOs;
using BackendPGI.Services;

namespace BackendPGI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ControllerCommande : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly NotificationService _notificationService;

        public ControllerCommande(ApplicationDbContext context)
        {
            _context = context;
            _notificationService = new NotificationService(context);
        }

        [HttpGet]
        public async Task<IActionResult> GetCommandes([FromQuery] int? clientId = null, [FromQuery] string? statut = null)
        {
            Log.Information("Récupération de la liste des commandes - ClientId: {ClientId}, Statut: {Statut}", 
                clientId?.ToString() ?? "Tous", statut ?? "Tous");

            var query = _context.Commandes
                .Include(c => c.Client)
                .Include(c => c.Employe)
                .Include(c => c.Paniers)
                    .ThenInclude(p => p.Produit)
                .AsQueryable();

            if (clientId.HasValue)
                query = query.Where(c => c.ClientId == clientId.Value);

            if (!string.IsNullOrEmpty(statut))
                query = query.Where(c => c.Statut == statut);

            var commandes = await query
                .OrderByDescending(c => c.DateCommande)
                .Select(c => new
                {
                    c.Id,
                    c.NumeroCommande,
                    c.DateCommande,
                    c.Statut,
                    c.MontantTotal,
                    c.MontantTaxes,
                    c.DateLivraisonPrevue,
                    c.DateLivraisonReelle,
                    c.Notes,
                    client = new
                    {
                        c.Client.Id,
                        c.Client.Nom,
                        c.Client.Email
                    },
                    employe = c.Employe != null ? new
                    {
                        c.Employe.Id,
                        c.Employe.NumeroEmploye,
                        c.Employe.Nom,
                        c.Employe.Prenom
                    } : null,
                    paniers = c.Paniers.Select(p => new
                    {
                        p.Id,
                        nomProduit = p.Produit.NomProduit,
                        p.ProduitSku,
                        p.Quantite,
                        p.PrixUnitaire,
                        p.Remise,
                        p.SousTotal
                    }).ToList(),
                    nombrePaniers = c.Paniers.Count
                })
                .ToListAsync();

            Log.Information("Nombre de commandes retournés : {Count}", commandes.Count);
            return Ok(commandes);
        }

        [HttpGet("client/{clientId}")]
        public async Task<IActionResult> GetCommandesByClient(int clientId)
        {
            Log.Information("Récupération des commandes pour le client ID : {ClientId}", clientId);
            
            var commandes = await _context.Commandes
                .Include(c => c.Client)
                .Include(c => c.Employe)
                .Include(c => c.Paniers)
                    .ThenInclude(p => p.Produit)
                .Where(c => c.ClientId == clientId)
                .OrderByDescending(c => c.DateCommande)
                .Select(c => new
                {
                    c.Id,
                    c.NumeroCommande,
                    c.DateCommande,
                    c.Statut,
                    c.MontantTotal,
                    c.MontantTaxes,
                    c.DateLivraisonPrevue,
                    c.DateLivraisonReelle,
                    c.Notes,
                    client = new
                    {
                        c.Client.Id,
                        c.Client.Nom,
                        c.Client.Email
                    },
                    employe = c.Employe != null ? new
                    {
                        c.Employe.Id,
                        c.Employe.NumeroEmploye,
                        c.Employe.Nom,
                        c.Employe.Prenom
                    } : null,
                    paniers = c.Paniers.Select(p => new
                    {
                        p.Id,
                        nomProduit = p.Produit.NomProduit,
                        p.ProduitSku,
                        p.Quantite,
                        p.PrixUnitaire,
                        p.Remise,
                        p.SousTotal
                    }).ToList(),
                    nombrePaniers = c.Paniers.Count
                })
                .ToListAsync();
            
            Log.Information("Nombre de commandes retournés pour le client {ClientId} : {Count}", clientId, commandes.Count);
            return Ok(commandes);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetCommande(int id)
        {
            Log.Information("Récupération de la commande avec l'ID : {CommandeId}", id);

            var commande = await _context.Commandes
                .Include(c => c.Client)
                .Include(c => c.Employe)
                .Include(c => c.Paniers)
                    .ThenInclude(p => p.Produit)
                .Include(c => c.Facture)
                    .ThenInclude(f => f!.Livreur)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (commande == null)
            {
                Log.Warning("Commande avec l'ID {CommandeId} non trouvée", id);
                return NotFound(new { message = $"Commande avec l'ID {id} non trouvée" });
            }

            Log.Information("Commande trouvée : {NumeroCommande}", commande.NumeroCommande);

            var commandeResponse = new
            {
                commande.Id,
                commande.NumeroCommande,
                commande.DateCommande,
                commande.Statut,
                commande.MontantTotal,
                commande.MontantTaxes,
                commande.DateLivraisonPrevue,
                commande.DateLivraisonReelle,
                commande.Notes,
                client = new
                {
                    commande.Client.Id,
                    commande.Client.Nom,
                    commande.Client.Email,
                    commande.Client.Telephone,
                    commande.Client.Adresse
                },
                employe = commande.Employe != null ? new
                {
                    commande.Employe.Id,
                    commande.Employe.NumeroEmploye,
                    commande.Employe.Nom,
                    commande.Employe.Prenom,
                    commande.Employe.Poste
                } : null,
                paniers = commande.Paniers.Select(p => new
                {
                    p.Id,
                    nomProduit = p.Produit.NomProduit,
                    p.ProduitSku,
                    p.Quantite,
                    p.PrixUnitaire,
                    p.Remise,
                    p.SousTotal
                }).ToList(),
                facture = commande.Facture != null ? new
                {
                    commande.Facture.Id,
                    commande.Facture.NumeroFacture,
                    commande.Facture.Statut,
                    commande.Facture.MontantTotal,
                    commande.Facture.ModePaiement,
                    commande.Facture.DateFacture,
                    commande.Facture.DatePaiement,
                    livreur = commande.Facture.Livreur != null ? new
                    {
                        commande.Facture.Livreur.Id,
                        commande.Facture.Livreur.NumeroLivreur,
                        commande.Facture.Livreur.Nom,
                        commande.Facture.Livreur.Prenom
                    } : null
                } : null
            };

            return Ok(commandeResponse);
        }

        [HttpPost]
        public async Task<IActionResult> CreateCommande([FromBody] CreateCommandeDto? commandeDto)
        {
            // Vérifier si le DTO est null
            if (commandeDto == null)
            {
                Log.Warning("Le corps de la requête est null ou invalide");
                return BadRequest(new { message = "Le corps de la requête est requis et doit être un objet JSON valide." });
            }

            // Log immédiat pour voir ce qui est reçu
            Log.Information("=== DÉBUT CRÉATION COMMANDE ===");
            Log.Information("NumeroCommande: {NumeroCommande}", commandeDto.NumeroCommande ?? "NULL");
            Log.Information("ClientId: {ClientId}", commandeDto.ClientId);
            Log.Information("MontantTotal: {MontantTotal}", commandeDto.MontantTotal);
            Log.Information("Paniers est null: {IsNull}", commandeDto.Paniers == null);
            Log.Information("Nombre de paniers: {Count}", commandeDto.Paniers?.Count ?? -1);

            // Log des données reçues pour debug
            Log.Information("=== DÉBUT CRÉATION COMMANDE ===");
            Log.Information("NumeroCommande: {NumeroCommande}", commandeDto.NumeroCommande ?? "NULL");
            Log.Information("ClientId: {ClientId}", commandeDto.ClientId);
            Log.Information("MontantTotal: {MontantTotal}", commandeDto.MontantTotal);
            Log.Information("Paniers est null: {IsNull}", commandeDto.Paniers == null);
            Log.Information("Nombre de paniers: {Count}", commandeDto.Paniers?.Count ?? -1);
            
            if (commandeDto.Paniers != null && commandeDto.Paniers.Count > 0)
            {
                Log.Information("Premier panier : ProduitSku={ProduitSku}, NomProduit={NomProduit}, Quantite={Quantite}, PrixUnitaire={PrixUnitaire}", 
                    commandeDto.Paniers[0].ProduitSku ?? "NULL",
                    commandeDto.Paniers[0].NomProduit ?? "NULL",
                    commandeDto.Paniers[0].Quantite,
                    commandeDto.Paniers[0].PrixUnitaire);
            }
            else
            {
                Log.Warning("AUCUN PANIER TROUVÉ DANS LA COMMANDE !");
            }

            // Vérifier manuellement si les paniers sont présents
            if (commandeDto.Paniers == null || commandeDto.Paniers.Count == 0)
            {
                Log.Warning("Aucun panier fourni dans la commande");
                return BadRequest(new { 
                    message = "Au moins un panier est requis pour créer une commande. Le tableau 'paniers' est manquant ou vide.",
                    error = "PANIER_MANQUANT",
                    receivedData = new
                    {
                        numeroCommande = commandeDto.NumeroCommande,
                        clientId = commandeDto.ClientId,
                        montantTotal = commandeDto.MontantTotal,
                        paniersCount = commandeDto.Paniers?.Count ?? 0,
                        paniersIsNull = commandeDto.Paniers == null
                    },
                    expectedFormat = new
                    {
                        numeroCommande = "CMD-2025-001",
                        clientId = 1,
                        montantTotal = 162.11,
                        montantTaxes = 21.11,
                        statut = "En attente",
                        paniers = new[]
                        {
                            new
                            {
                                nomProduit = "Tente légère 2 places",
                                quantite = 2,
                                prixUnitaire = 149.99,
                                remise = 0
                            }
                        }
                    }
                });
            }

            // Validation du modèle
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .Select(x => new { 
                        field = x.Key, 
                        errors = x.Value?.Errors.Select(e => e.ErrorMessage).ToArray() 
                    })
                    .ToList();

                Log.Warning("Tentative de création d'une commande avec des données invalides. Nombre d'erreurs: {ErrorCount}", errors.Count);
                foreach (var error in errors)
                {
                    Log.Warning("Erreur de validation - Champ: {Field}, Erreurs: {Errors}", 
                        error.field, 
                        string.Join(", ", error.errors ?? Array.Empty<string>()));
                }

                // Créer une réponse détaillée avec toutes les erreurs
                var errorResponse = new
                {
                    message = "Les données de la commande sont invalides.",
                    errors = errors,
                    receivedData = new
                    {
                        numeroCommande = commandeDto.NumeroCommande,
                        clientId = commandeDto.ClientId,
                        montantTotal = commandeDto.MontantTotal,
                        paniersCount = commandeDto.Paniers?.Count ?? 0
                    }
                };
                
                return BadRequest(errorResponse);
            }

            // Vérifier si le numéro de commande existe déjà
            var numeroExists = await _context.Commandes
                .AnyAsync(c => c.NumeroCommande == commandeDto.NumeroCommande);

            if (numeroExists)
            {
                Log.Warning("Tentative de création d'une commande avec un numéro existant : {NumeroCommande}", commandeDto.NumeroCommande);
                return Conflict(new { message = "Une commande avec ce numéro existe déjà." });
            }

            // Vérifier que le client existe
            var client = await _context.Clients.FindAsync(commandeDto.ClientId);
            if (client == null)
            {
                Log.Warning("Tentative de création d'une commande pour un client inexistant : {ClientId}", commandeDto.ClientId);
                return BadRequest(new { message = $"Le client avec l'ID {commandeDto.ClientId} n'existe pas." });
            }

            // Vérifier que l'employé existe (si fourni)
            if (commandeDto.EmployeId.HasValue)
            {
                var employe = await _context.Employes.FindAsync(commandeDto.EmployeId.Value);
                if (employe == null)
                {
                    Log.Warning("Tentative de création d'une commande avec un employé inexistant : {EmployeId}", commandeDto.EmployeId.Value);
                    return BadRequest(new { message = $"L'employé avec l'ID {commandeDto.EmployeId.Value} n'existe pas." });
                }
            }

            try
            {
                // Créer la commande
                var commande = new Commande
                {
                    NumeroCommande = commandeDto.NumeroCommande,
                    ClientId = commandeDto.ClientId,
                    EmployeId = commandeDto.EmployeId,
                    MontantTotal = commandeDto.MontantTotal,
                    MontantTaxes = commandeDto.MontantTaxes,
                    Statut = commandeDto.Statut,
                    Notes = commandeDto.Notes,
                    DateCommande = DateTime.Now,
                    DateLivraisonPrevue = commandeDto.DateLivraisonPrevue
                };

                // Vérifier et créer les paniers
                var paniers = new List<Panier>();
                decimal montantTotalCalcule = 0;
                int delaiLivraisonMax = 0; // Pour calculer la date de livraison prévue

                foreach (var panierDto in commandeDto.Paniers)
                {
                    // Déterminer le SKU du produit (soit directement fourni, soit recherché par nom)
                    string? produitSku = panierDto.ProduitSku;
                    Produit? produit = null;

                    if (!string.IsNullOrWhiteSpace(produitSku))
                    {
                        produit = await _context.Produits.FindAsync(produitSku);
                    }
                    else if (!string.IsNullOrWhiteSpace(panierDto.NomProduit))
                    {
                        // Si pas de SKU mais un nom de produit, chercher par nom
                        produit = await _context.Produits
                            .FirstOrDefaultAsync(p => p.NomProduit == panierDto.NomProduit);
                        if (produit != null)
                        {
                            produitSku = produit.Sku;
                        }
                    }

                    // Vérifier que le produit existe
                    if (produit == null)
                    {
                        var identifiant = !string.IsNullOrWhiteSpace(panierDto.ProduitSku) 
                            ? $"SKU {panierDto.ProduitSku}" 
                            : $"nom {panierDto.NomProduit}";
                        Log.Warning("Tentative d'ajout d'un produit inexistant au panier : {Identifiant}", identifiant);
                        return BadRequest(new { message = $"Le produit avec {identifiant} n'existe pas." });
                    }

                    if (string.IsNullOrWhiteSpace(produitSku))
                    {
                        produitSku = produit.Sku;
                    }

                    // Vérifier que le produit est actif
                    if (produit.Statut != "Actif")
                    {
                        Log.Warning("Tentative d'ajout d'un produit inactif au panier : {Sku} - Statut: {Statut}", 
                            produitSku, produit.Statut);
                        return BadRequest(new { message = $"Le produit {produit.NomProduit} n'est pas disponible (Statut: {produit.Statut})." });
                    }

                    // Vérifier le stock disponible
                    if (produit.QuantiteStock < panierDto.Quantite)
                    {
                        Log.Warning("Stock insuffisant pour le produit {Sku} : demandé {Quantite}, disponible {Stock}", 
                            produitSku, panierDto.Quantite, produit.QuantiteStock);
                        return BadRequest(new { message = $"Stock insuffisant pour le produit {produit.NomProduit}. Stock disponible : {produit.QuantiteStock}" });
                    }

                    // Calculer le sous-total
                    var prixApresRemise = panierDto.PrixUnitaire * (1 - panierDto.Remise / 100);
                    var sousTotal = prixApresRemise * panierDto.Quantite;
                    montantTotalCalcule += sousTotal;

                    // Suivre le délai de livraison maximum
                    if (produit.DelaiLivraisonJours.HasValue && produit.DelaiLivraisonJours.Value > delaiLivraisonMax)
                    {
                        delaiLivraisonMax = produit.DelaiLivraisonJours.Value;
                    }

                    var panier = new Panier
                    {
                        ProduitSku = produitSku,
                        Quantite = panierDto.Quantite,
                        PrixUnitaire = panierDto.PrixUnitaire,
                        Remise = panierDto.Remise,
                        SousTotal = sousTotal
                    };

                    paniers.Add(panier);
                }

                // Calculer automatiquement la date de livraison prévue si non fournie
                if (!commandeDto.DateLivraisonPrevue.HasValue)
                {
                    // Utiliser le délai maximum trouvé, ou un délai par défaut de 7 jours
                    var delaiLivraison = delaiLivraisonMax > 0 ? delaiLivraisonMax : 7;
                    commande.DateLivraisonPrevue = DateTime.Now.AddDays(delaiLivraison);
                    Log.Information("Date de livraison prévue calculée automatiquement : {DateLivraison} (délai: {Delai} jours)", 
                        commande.DateLivraisonPrevue, delaiLivraison);
                }
                else
                {
                    commande.DateLivraisonPrevue = commandeDto.DateLivraisonPrevue;
                }

                // Ajouter les taxes au montant total calculé
                montantTotalCalcule += commandeDto.MontantTaxes;

                // Vérifier que le montant total correspond (avec une tolérance de 0.01)
                if (Math.Abs(commandeDto.MontantTotal - montantTotalCalcule) > 0.01m)
                {
                    Log.Warning("Le montant total fourni ({MontantFourni}) ne correspond pas au montant calculé ({MontantCalcule})", 
                        commandeDto.MontantTotal, montantTotalCalcule);
                    return BadRequest(new { 
                        message = $"Le montant total fourni ({commandeDto.MontantTotal}) ne correspond pas au montant calculé ({montantTotalCalcule})." 
                    });
                }

                // Utiliser une transaction pour garantir la cohérence (commande + réduction de stock)
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Ajouter la commande et les paniers
                    commande.Paniers = paniers;
                    _context.Commandes.Add(commande);
                    await _context.SaveChangesAsync();

                    Log.Information("Commande créée avec succès - ID: {CommandeId}, Numéro: {NumeroCommande}", 
                        commande.Id, commande.NumeroCommande);

                    // Réduire le stock IMMÉDIATEMENT lors de la création de la commande (paiement terminé)
                    // Le stock est réduit pour TOUS les statuts sauf "Annulée"
                    // Car une fois le paiement terminé, le stock doit être réservé immédiatement
                    if (commande.Statut != "Annulée")
                    {
                        Log.Information("✅ Réduction IMMÉDIATE du stock pour la commande {NumeroCommande} (Statut: {Statut}) - Paiement terminé", 
                            commande.NumeroCommande, commande.Statut);

                        foreach (var panier in paniers)
                        {
                            var produit = await _context.Produits.FindAsync(panier.ProduitSku);
                            if (produit != null)
                            {
                                var stockAvant = produit.QuantiteStock;
                                produit.QuantiteStock -= panier.Quantite;

                                // S'assurer que le stock ne devient pas négatif (sécurité supplémentaire)
                                if (produit.QuantiteStock < 0)
                                {
                                    Log.Error("Stock négatif détecté pour le produit {Sku} après réduction. Stock avant: {StockAvant}, Quantité: {Quantite}", 
                                        panier.ProduitSku, stockAvant, panier.Quantite);
                                    await transaction.RollbackAsync();
                                    return BadRequest(new { message = $"Erreur: Stock insuffisant pour le produit {produit.NomProduit}." });
                                }

                                Log.Information("✅ Stock réduit IMMÉDIATEMENT pour {Sku} ({NomProduit}) : {StockAvant} → {StockApres} (quantité: {Quantite})", 
                                    panier.ProduitSku, produit.NomProduit, stockAvant, produit.QuantiteStock, panier.Quantite);

                                // Vérifier les seuils de réapprovisionnement
                                if (produit.QuantiteStock <= produit.StockSecurite)
                                {
                                    Log.Warning("⚠️ ALERTE CRITIQUE - Stock sous le seuil de sécurité pour {Sku} : Stock actuel {Stock}, Seuil sécurité {Seuil}", 
                                        panier.ProduitSku, produit.QuantiteStock, produit.StockSecurite);
                                }
                                else if (produit.QuantiteStock <= produit.SeuilReappro)
                                {
                                    Log.Warning("⚠️ ALERTE - Stock sous le seuil de réapprovisionnement pour {Sku} : Stock actuel {Stock}, Seuil réappro {Seuil}", 
                                        panier.ProduitSku, produit.QuantiteStock, produit.SeuilReappro);
                                }
                            }
                        }

                        await _context.SaveChangesAsync();
                        Log.Information("✅ Stock mis à jour IMMÉDIATEMENT pour la commande {NumeroCommande} - Paiement terminé", commande.NumeroCommande);
                    }
                    else
                    {
                        Log.Information("Stock non réduit pour la commande {NumeroCommande} (Statut: Annulée)", 
                            commande.NumeroCommande);
                    }

                    // Valider la transaction
                    await transaction.CommitAsync();
                    Log.Information("Transaction validée avec succès pour la commande {NumeroCommande}", commande.NumeroCommande);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    Log.Error(ex, "Erreur lors de la transaction pour la commande {NumeroCommande}. Rollback effectué.", commande.NumeroCommande);
                    throw;
                }

                // Charger les relations pour les notifications
                await _context.Entry(commande)
                    .Collection(c => c.Paniers)
                    .Query()
                    .Include(p => p.Produit)
                    .LoadAsync();

                // Générer les notifications pour tous les départements concernés
                await _notificationService.NotifierPaiementCommandeAsync(commande);

                // Charger les relations pour la réponse
                await _context.Entry(commande)
                    .Reference(c => c.Client)
                    .LoadAsync();
                await _context.Entry(commande)
                    .Reference(c => c.Employe)
                    .LoadAsync();
                await _context.Entry(commande)
                    .Collection(c => c.Paniers)
                    .Query()
                    .Include(p => p.Produit)
                    .LoadAsync();

                var commandeResponse = new
                {
                    commande.Id,
                    commande.NumeroCommande,
                    commande.DateCommande,
                    commande.Statut,
                    commande.MontantTotal,
                    commande.MontantTaxes,
                    commande.DateLivraisonPrevue,
                    commande.Notes,
                    client = new
                    {
                        commande.Client.Id,
                        commande.Client.Nom,
                        commande.Client.Email
                    },
                    employe = commande.Employe != null ? new
                    {
                        commande.Employe.Id,
                        commande.Employe.NumeroEmploye,
                        commande.Employe.Nom,
                        commande.Employe.Prenom
                    } : null,
                    paniers = commande.Paniers.Select(p => new
                    {
                        p.Id,
                        nomProduit = p.Produit.NomProduit,
                        p.ProduitSku,
                        p.Quantite,
                        p.PrixUnitaire,
                        p.Remise,
                        p.SousTotal
                    }).ToList()
                };

                return CreatedAtAction(nameof(GetCommande), new { id = commande.Id }, commandeResponse);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la création de la commande : {NumeroCommande}", commandeDto.NumeroCommande);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la création de la commande." });
            }
        }

        /// <summary>
        /// Crée une commande à partir du panier temporaire d'un client
        /// </summary>
        [HttpPost("from-panier-temporaire/{clientId}")]
        public async Task<IActionResult> CreateCommandeFromPanierTemporaire(int clientId, [FromBody] CreateCommandeDto? commandeDto)
        {
            try
            {
                Log.Information("Création d'une commande à partir du panier temporaire pour le client ID : {ClientId}", clientId);

                // Vérifier que le client existe
                var client = await _context.Clients.FindAsync(clientId);
                if (client == null)
                {
                    Log.Warning("Client avec l'ID {ClientId} non trouvé", clientId);
                    return NotFound(new { message = "Client non trouvé" });
                }

                // Récupérer le panier temporaire du client
                var panierTemporaire = await _context.PaniersTemporaires
                    .Include(pt => pt.Produit)
                    .Where(pt => pt.ClientId == clientId)
                    .ToListAsync();

                if (panierTemporaire == null || panierTemporaire.Count == 0)
                {
                    Log.Warning("Le panier temporaire du client {ClientId} est vide", clientId);
                    return BadRequest(new { message = "Le panier est vide. Ajoutez des articles avant de créer une commande." });
                }

                // Calculer le montant total à partir du panier temporaire
                decimal montantTotal = 0;
                decimal montantTaxes = commandeDto?.MontantTaxes ?? 0;
                int delaiLivraisonMax = 0;

                foreach (var item in panierTemporaire)
                {
                    var prixApresRemise = item.PrixUnitaire * (1 - item.Remise / 100);
                    var sousTotal = prixApresRemise * item.Quantite;
                    montantTotal += sousTotal;

                    // Suivre le délai de livraison maximum
                    if (item.Produit.DelaiLivraisonJours.HasValue && item.Produit.DelaiLivraisonJours.Value > delaiLivraisonMax)
                    {
                        delaiLivraisonMax = item.Produit.DelaiLivraisonJours.Value;
                    }
                }

                montantTotal += montantTaxes;

                // Générer un numéro de commande si non fourni
                string numeroCommande = commandeDto?.NumeroCommande ?? $"CMD-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";

                // Calculer automatiquement la date de livraison prévue
                var delaiLivraison = delaiLivraisonMax > 0 ? delaiLivraisonMax : 7;
                var dateLivraisonPrevue = DateTime.Now.AddDays(delaiLivraison);

                // Utiliser une transaction pour garantir la cohérence
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Créer la commande
                    var commande = new Commande
                    {
                        NumeroCommande = numeroCommande,
                        ClientId = clientId,
                        EmployeId = commandeDto?.EmployeId,
                        MontantTotal = montantTotal,
                        MontantTaxes = montantTaxes,
                        Statut = commandeDto?.Statut ?? "En attente",
                        Notes = commandeDto?.Notes,
                        DateCommande = DateTime.Now,
                        DateLivraisonPrevue = commandeDto?.DateLivraisonPrevue ?? dateLivraisonPrevue
                    };

                    // Convertir les paniers temporaires en paniers de commande
                    var paniers = new List<Panier>();
                    foreach (var item in panierTemporaire)
                    {
                        var prixApresRemise = item.PrixUnitaire * (1 - item.Remise / 100);
                        var sousTotal = prixApresRemise * item.Quantite;

                        paniers.Add(new Panier
                        {
                            ProduitSku = item.ProduitSku,
                            Quantite = item.Quantite,
                            PrixUnitaire = item.PrixUnitaire,
                            Remise = item.Remise,
                            SousTotal = sousTotal
                        });
                    }

                    commande.Paniers = paniers;
                    _context.Commandes.Add(commande);
                    await _context.SaveChangesAsync();

                    Log.Information("Commande créée à partir du panier temporaire - ID: {CommandeId}, Numéro: {NumeroCommande}", 
                        commande.Id, commande.NumeroCommande);

                    // Réduire le stock si la commande n'est pas annulée
                    if (commande.Statut != "Annulée")
                    {
                        Log.Information("✅ Réduction IMMÉDIATE du stock pour la commande {NumeroCommande}", commande.NumeroCommande);

                        foreach (var panier in paniers)
                        {
                            var produit = await _context.Produits.FindAsync(panier.ProduitSku);
                            if (produit != null)
                            {
                                var stockAvant = produit.QuantiteStock;
                                produit.QuantiteStock -= panier.Quantite;

                                if (produit.QuantiteStock < 0)
                                {
                                    Log.Error("Stock négatif détecté pour le produit {Sku}", panier.ProduitSku);
                                    await transaction.RollbackAsync();
                                    return BadRequest(new { message = $"Erreur: Stock insuffisant pour le produit {produit.NomProduit}." });
                                }

                                Log.Information("Stock réduit pour {Sku} : {StockAvant} → {StockApres}",
                                    panier.ProduitSku, stockAvant, produit.QuantiteStock);
                            }
                        }
                        await _context.SaveChangesAsync();
                    }

                    // Supprimer le panier temporaire après création de la commande
                    _context.PaniersTemporaires.RemoveRange(panierTemporaire);
                    await _context.SaveChangesAsync();

                    Log.Information("Panier temporaire supprimé après création de la commande - ClientId: {ClientId}", clientId);

                    await transaction.CommitAsync();

                    // Recharger les relations pour les notifications
                    await _context.Entry(commande)
                        .Collection(c => c.Paniers)
                        .Query()
                        .Include(p => p.Produit)
                        .LoadAsync();

                    // Générer les notifications pour tous les départements concernés
                    await _notificationService.NotifierPaiementCommandeAsync(commande);

                    // Recharger les relations pour la réponse
                    await _context.Entry(commande)
                        .Reference(c => c.Client)
                        .LoadAsync();
                    await _context.Entry(commande)
                        .Collection(c => c.Paniers)
                        .Query()
                        .Include(p => p.Produit)
                        .LoadAsync();

                    var commandeResponse = new
                    {
                        commande.Id,
                        commande.NumeroCommande,
                        commande.DateCommande,
                        commande.Statut,
                        commande.MontantTotal,
                        commande.MontantTaxes,
                        commande.DateLivraisonPrevue,
                        commande.Notes,
                        client = new
                        {
                            commande.Client.Id,
                            commande.Client.Nom,
                            commande.Client.Email
                        },
                        paniers = commande.Paniers.Select(p => new
                        {
                            p.Id,
                            nomProduit = p.Produit.NomProduit,
                            p.ProduitSku,
                            p.Quantite,
                            p.PrixUnitaire,
                            p.Remise,
                            p.SousTotal
                        }).ToList()
                    };

                    return CreatedAtAction(nameof(GetCommande), new { id = commande.Id }, commandeResponse);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    Log.Error(ex, "Erreur lors de la création de la commande à partir du panier temporaire");
                    throw;
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la création de la commande à partir du panier temporaire pour le client {ClientId}", clientId);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la création de la commande." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCommande(int id, [FromBody] CreateCommandeDto commandeDto)
        {
            Log.Information("Mise à jour de la commande ID : {CommandeId}", id);

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var commande = await _context.Commandes
                .Include(c => c.Paniers)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (commande == null)
                return NotFound(new { message = $"Commande avec l'ID {id} non trouvée" });

            // Vérifier que le numéro de commande n'est pas utilisé par une autre commande
            if (commandeDto.NumeroCommande != commande.NumeroCommande)
            {
                var numeroExists = await _context.Commandes
                    .AnyAsync(c => c.NumeroCommande == commandeDto.NumeroCommande && c.Id != id);
                if (numeroExists)
                    return Conflict(new { message = "Une commande avec ce numéro existe déjà." });
            }

            try
            {
                // Mettre à jour les propriétés de la commande
                commande.NumeroCommande = commandeDto.NumeroCommande;
                commande.ClientId = commandeDto.ClientId;
                commande.EmployeId = commandeDto.EmployeId;
                commande.MontantTotal = commandeDto.MontantTotal;
                commande.MontantTaxes = commandeDto.MontantTaxes;
                commande.Statut = commandeDto.Statut;
                commande.Notes = commandeDto.Notes;
                commande.DateLivraisonPrevue = commandeDto.DateLivraisonPrevue;

                // Supprimer les anciens paniers
                _context.Paniers.RemoveRange(commande.Paniers);

                // Créer les nouveaux paniers
                var paniers = new List<Panier>();
                foreach (var panierDto in commandeDto.Paniers)
                {
                    var produit = await _context.Produits.FindAsync(panierDto.ProduitSku);
                    if (produit == null)
                        return BadRequest(new { message = $"Le produit avec le SKU {panierDto.ProduitSku} n'existe pas." });

                    var prixApresRemise = panierDto.PrixUnitaire * (1 - panierDto.Remise / 100);
                    var sousTotal = prixApresRemise * panierDto.Quantite;

                    var panier = new Panier
                    {
                        CommandeId = commande.Id,
                        ProduitSku = panierDto.ProduitSku,
                        Quantite = panierDto.Quantite,
                        PrixUnitaire = panierDto.PrixUnitaire,
                        Remise = panierDto.Remise,
                        SousTotal = sousTotal
                    };

                    paniers.Add(panier);
                }

                commande.Paniers = paniers;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Commande mise à jour avec succès", id = commande.Id });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la mise à jour de la commande");
                return StatusCode(500, new { message = "Une erreur est survenue lors de la mise à jour de la commande." });
            }
        }

        [HttpPatch("{id}/statut")]
        public async Task<IActionResult> UpdateStatut(int id, [FromBody] string nouveauStatut)
        {
            var commande = await _context.Commandes
                .Include(c => c.Paniers)
                .FirstOrDefaultAsync(c => c.Id == id);
            
            if (commande == null)
                return NotFound(new { message = $"Commande avec l'ID {id} non trouvée" });

            var ancienStatut = commande.Statut;
            var statutsReductionStock = new[] { "Confirmée", "En préparation", "Expédiée", "Livrée" };
            var statutsAvantReduction = new[] { "En attente" };
            var statutsAssignationLivreur = new[] { "Expédiée", "En préparation" };

            // Utiliser une transaction pour garantir la cohérence
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // NOTE: Le stock est maintenant réduit IMMÉDIATEMENT lors de la création de la commande
                // Donc on ne réduit plus le stock lors du changement de statut (évite la double réduction)
                // On restaure seulement le stock si on annule une commande
                Log.Information("Changement de statut : {AncienStatut} → {NouveauStatut} (Stock déjà réduit lors de la création)", 
                    ancienStatut, nouveauStatut);
                // Si on passe à un statut nécessitant l'assignation d'un livreur
                Livreur? livreurAssigne = null;
                if (statutsAssignationLivreur.Contains(nouveauStatut) && !statutsAssignationLivreur.Contains(ancienStatut))
                {
                    Log.Information("Assignation automatique d'un livreur pour la commande {Id} (Statut: {Statut})", 
                        id, nouveauStatut);
                    
                    // Vérifier si un livreur est déjà assigné via une facture existante
                    if (commande.Facture?.LivreurId.HasValue == true)
                    {
                        livreurAssigne = await _context.Livreurs.FindAsync(commande.Facture.LivreurId);
                        Log.Information("Livreur déjà assigné via facture : {Nom} {Prenom}", 
                            livreurAssigne?.Nom, livreurAssigne?.Prenom);
                    }
                    else
                    {
                        // Chercher un livreur disponible via service d'organisation
                        livreurAssigne = await _context.Livreurs
                            .Where(l => l.Statut == "Disponible" && l.EstActif)
                            .OrderBy(l => l.DateEmbauche) // Priorité aux plus anciens (équitable)
                            .FirstOrDefaultAsync();
                        
                        if (livreurAssigne != null)
                        {
                            // Mettre à jour le statut du livreur
                            livreurAssigne.Statut = "En livraison";
                            Log.Information("✓ Livreur assigné : {Nom} {Prenom} (ID: {LivreurId}, Numéro: {NumeroLivreur})", 
                                livreurAssigne.Nom, livreurAssigne.Prenom, livreurAssigne.Id, livreurAssigne.NumeroLivreur);
                        }
                        else
                        {
                            Log.Warning("⚠️ Aucun livreur disponible trouvé pour la commande {Id}", id);
                        }
                    }
                }
                
                // Si on annule une commande, restaurer le stock (car le stock a été réduit lors de la création)
                if (nouveauStatut == "Annulée" && ancienStatut != "Annulée")
                {
                    Log.Information("Restauration du stock lors de l'annulation : {AncienStatut} → {NouveauStatut}", 
                        ancienStatut, nouveauStatut);
                    
                    foreach (var panier in commande.Paniers)
                    {
                        var produit = await _context.Produits.FindAsync(panier.ProduitSku);
                        if (produit != null)
                        {
                            var stockAvant = produit.QuantiteStock;
                            produit.QuantiteStock += panier.Quantite;
                            
                            Log.Information("Stock restauré pour {Sku} : {StockAvant} → {StockApres} (quantité restaurée: {Quantite})", 
                                panier.ProduitSku, stockAvant, produit.QuantiteStock, panier.Quantite);
                        }
                    }
                    
                    // Libérer le livreur si un était assigné
                    if (commande.Facture?.LivreurId.HasValue == true)
                    {
                        var livreur = await _context.Livreurs.FindAsync(commande.Facture.LivreurId);
                        if (livreur != null)
                        {
                            livreur.Statut = "Disponible";
                            Log.Information("Livreur libéré : {Nom} {Prenom} (ID: {LivreurId})", 
                                livreur.Nom, livreur.Prenom, livreur.Id);
                        }
                    }
                }
                
                // Si la commande est livrée, créer automatiquement une facture
                if (nouveauStatut == "Livrée" && ancienStatut != "Livrée")
                {
                    // Vérifier si une facture existe déjà
                    if (commande.Facture == null)
                    {
                        Log.Information("Création automatique de facture pour la commande {Id}", id);
                        
                        // Utiliser le livreur assigné précédemment ou chercher un disponible
                        Livreur? livreurPourFacture = livreurAssigne;
                        if (livreurPourFacture == null)
                        {
                            // Chercher un livreur disponible
                            livreurPourFacture = await _context.Livreurs
                                .Where(l => l.Statut == "Disponible" && l.EstActif)
                                .OrderBy(l => l.DateEmbauche)
                                .FirstOrDefaultAsync();
                            
                            if (livreurPourFacture != null)
                            {
                                livreurPourFacture.Statut = "En livraison";
                            }
                        }
                        
                        // Générer un numéro de facture unique
                        var annee = DateTime.Now.Year;
                        var dernierNumero = await _context.Factures
                            .Where(f => f.NumeroFacture.StartsWith($"FAC-{annee}-"))
                            .OrderByDescending(f => f.NumeroFacture)
                            .Select(f => f.NumeroFacture)
                            .FirstOrDefaultAsync();
                        
                        int numeroSequence = 1;
                        if (!string.IsNullOrEmpty(dernierNumero))
                        {
                            var parts = dernierNumero.Split('-');
                            if (parts.Length == 3 && int.TryParse(parts[2], out int dernierNum))
                            {
                                numeroSequence = dernierNum + 1;
                            }
                        }
                        
                        var numeroFacture = $"FAC-{annee}-{numeroSequence:D4}";
                        
                        var facture = new Facture
                        {
                            NumeroFacture = numeroFacture,
                            CommandeId = commande.Id,
                            LivreurId = livreurPourFacture?.Id,
                            MontantTotal = commande.MontantTotal,
                            MontantTaxes = commande.MontantTaxes,
                            MontantTransport = 0, // Peut être calculé selon le type de livraison
                            Statut = "Non payée",
                            DateFacture = DateTime.Now,
                            DateLivraison = commande.DateLivraisonReelle ?? DateTime.Now
                        };
                        
                        _context.Factures.Add(facture);
                        Log.Information("Facture créée : {NumeroFacture} pour la commande {CommandeId} avec livreur {LivreurId}", 
                            numeroFacture, commande.Id, livreurPourFacture?.Id);
                        
                        // Si un livreur a été assigné, le libérer maintenant (livraison terminée)
                        if (livreurPourFacture != null)
                        {
                            livreurPourFacture.Statut = "Disponible";
                            Log.Information("Livreur libéré après livraison : {Nom} {Prenom} (ID: {LivreurId})", 
                                livreurPourFacture.Nom, livreurPourFacture.Prenom, livreurPourFacture.Id);
                        }
                    }
                    else
                    {
                        Log.Information("Une facture existe déjà pour la commande {Id} : {NumeroFacture}", 
                            id, commande.Facture.NumeroFacture);
                        
                        // Libérer le livreur si assigné
                        if (commande.Facture.LivreurId.HasValue)
                        {
                            var livreur = await _context.Livreurs.FindAsync(commande.Facture.LivreurId);
                            if (livreur != null && livreur.Statut == "En livraison")
                            {
                                livreur.Statut = "Disponible";
                                Log.Information("Livreur libéré après livraison : {Nom} {Prenom}", 
                                    livreur.Nom, livreur.Prenom);
                            }
                        }
                    }
                }

                // Mettre à jour le statut
                commande.Statut = nouveauStatut;
                
                // Si le statut est "Livrée", mettre à jour la date de livraison réelle
                if (nouveauStatut == "Livrée" && !commande.DateLivraisonReelle.HasValue)
                {
                    commande.DateLivraisonReelle = DateTime.Now;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                Log.Information("Statut de la commande {Id} mis à jour : {AncienStatut} → {NouveauStatut}", 
                    commande.Id, ancienStatut, nouveauStatut);

                return Ok(new { message = "Statut de la commande mis à jour", id = commande.Id, statut = commande.Statut });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Log.Error(ex, "Erreur lors de la mise à jour du statut de la commande {Id}. Rollback effectué.", id);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la mise à jour du statut." });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCommande(int id)
        {
            var commande = await _context.Commandes
                .Include(c => c.Paniers)
                .FirstOrDefaultAsync(c => c.Id == id);
            
            if (commande == null)
                return NotFound(new { message = $"Commande avec l'ID {id} non trouvée" });

            var statutsReductionStock = new[] { "Confirmée", "En préparation", "Expédiée", "Livrée" };
            var doitRestaurerStock = statutsReductionStock.Contains(commande.Statut);

            // Utiliser une transaction pour garantir la cohérence
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Restaurer le stock si la commande avait déjà réduit le stock
                if (doitRestaurerStock)
                {
                    Log.Information("Restauration du stock lors de la suppression de la commande {Id} (Statut: {Statut})", 
                        id, commande.Statut);
                    
                    foreach (var panier in commande.Paniers)
                    {
                        var produit = await _context.Produits.FindAsync(panier.ProduitSku);
                        if (produit != null)
                        {
                            var stockAvant = produit.QuantiteStock;
                            produit.QuantiteStock += panier.Quantite;
                            
                            Log.Information("Stock restauré pour {Sku} : {StockAvant} → {StockApres} (quantité restaurée: {Quantite})", 
                                panier.ProduitSku, stockAvant, produit.QuantiteStock, panier.Quantite);
                        }
                    }
                    
                    await _context.SaveChangesAsync();
                }

                // Supprimer la commande (les paniers seront supprimés automatiquement via CASCADE)
                _context.Commandes.Remove(commande);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                Log.Information("Commande {Id} supprimée avec succès. Stock restauré: {Restaure}", id, doitRestaurerStock);
                return Ok(new { message = $"Commande {id} supprimée avec succès.", stockRestaure = doitRestaurerStock });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Log.Error(ex, "Erreur lors de la suppression de la commande {Id}. Rollback effectué.", id);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la suppression de la commande." });
            }
        }
    }
}

