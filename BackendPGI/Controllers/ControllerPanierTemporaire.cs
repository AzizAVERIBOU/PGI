using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Serilog;
using BackendPGI.Data;
using BackendPGI.Models;
using BackendPGI.Models.DTOs;

namespace BackendPGI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ControllerPanierTemporaire : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ControllerPanierTemporaire(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Récupère le panier temporaire complet d'un client
        /// </summary>
        [HttpGet("client/{clientId}")]
        public async Task<IActionResult> GetPanierByClient(int clientId)
        {
            try
            {
                Log.Information("Récupération du panier temporaire pour le client ID : {ClientId}", clientId);

                // Vérifier que le client existe
                var client = await _context.Clients.FindAsync(clientId);
                if (client == null)
                {
                    Log.Warning("Client avec l'ID {ClientId} non trouvé", clientId);
                    return NotFound(new { message = "Client non trouvé" });
                }

                // Récupérer tous les articles du panier temporaire du client
                var panierItems = await _context.PaniersTemporaires
                    .Include(pt => pt.Produit)
                    .Where(pt => pt.ClientId == clientId)
                    .OrderByDescending(pt => pt.DateAjout)
                    .ToListAsync();

                // Calculer le montant total
                decimal montantTotal = 0;
                var articles = new List<PanierTemporaireResponseDto>();

                foreach (var item in panierItems)
                {
                    var prixApresRemise = item.PrixUnitaire * (1 - item.Remise / 100);
                    var sousTotal = prixApresRemise * item.Quantite;
                    montantTotal += sousTotal;

                    articles.Add(new PanierTemporaireResponseDto
                    {
                        Id = item.Id,
                        ClientId = item.ClientId,
                        ProduitSku = item.ProduitSku,
                        NomProduit = item.Produit.NomProduit,
                        Quantite = item.Quantite,
                        PrixUnitaire = item.PrixUnitaire,
                        Remise = item.Remise,
                        SousTotal = sousTotal,
                        DateAjout = item.DateAjout
                    });
                }

                var response = new PanierClientResponseDto
                {
                    ClientId = clientId,
                    ClientNom = client.Nom,
                    Articles = articles,
                    MontantTotal = montantTotal,
                    NombreArticles = articles.Sum(a => a.Quantite)
                };

                Log.Information("Panier temporaire récupéré pour le client {ClientId} : {Count} articles, Total: {MontantTotal}",
                    clientId, articles.Count, montantTotal);

                return Ok(response);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la récupération du panier temporaire pour le client {ClientId}", clientId);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la récupération du panier." });
            }
        }

        /// <summary>
        /// Ajoute un produit au panier temporaire d'un client (ou met à jour la quantité si déjà présent)
        /// </summary>
        [HttpPost("client/{clientId}")]
        public async Task<IActionResult> AddToPanier(int clientId, [FromBody] AddPanierTemporaireDto dto)
        {
            try
            {
                Log.Information("Ajout au panier temporaire - ClientId: {ClientId}, ProduitSku: {ProduitSku}, Quantite: {Quantite}",
                    clientId, dto.ProduitSku, dto.Quantite);

                // Validation du modèle
                if (!ModelState.IsValid)
                {
                    Log.Warning("Données invalides pour l'ajout au panier");
                    return BadRequest(ModelState);
                }

                // Vérifier que le client existe
                var client = await _context.Clients.FindAsync(clientId);
                if (client == null)
                {
                    Log.Warning("Client avec l'ID {ClientId} non trouvé", clientId);
                    return NotFound(new { message = "Client non trouvé" });
                }

                // Vérifier que le produit existe et est actif
                var produit = await _context.Produits.FindAsync(dto.ProduitSku);
                if (produit == null)
                {
                    Log.Warning("Produit avec le SKU {ProduitSku} non trouvé", dto.ProduitSku);
                    return NotFound(new { message = $"Le produit avec le SKU {dto.ProduitSku} n'existe pas." });
                }

                if (produit.Statut != "Actif")
                {
                    Log.Warning("Tentative d'ajout d'un produit inactif au panier - SKU: {ProduitSku}", dto.ProduitSku);
                    return BadRequest(new { message = "Ce produit n'est plus disponible." });
                }

                // Vérifier le stock disponible
                if (produit.QuantiteStock < dto.Quantite)
                {
                    Log.Warning("Stock insuffisant pour le produit {ProduitSku} - Stock: {Stock}, Demandé: {Quantite}",
                        dto.ProduitSku, produit.QuantiteStock, dto.Quantite);
                    return BadRequest(new { message = $"Stock insuffisant. Stock disponible : {produit.QuantiteStock}" });
                }

                // Vérifier si l'article existe déjà dans le panier
                var panierExistant = await _context.PaniersTemporaires
                    .FirstOrDefaultAsync(pt => pt.ClientId == clientId && pt.ProduitSku == dto.ProduitSku);

                if (panierExistant != null)
                {
                    // Mettre à jour la quantité
                    var nouvelleQuantite = panierExistant.Quantite + dto.Quantite;

                    // Vérifier le stock avec la nouvelle quantité
                    if (produit.QuantiteStock < nouvelleQuantite)
                    {
                        Log.Warning("Stock insuffisant après mise à jour - Stock: {Stock}, Nouvelle quantité: {Quantite}",
                            produit.QuantiteStock, nouvelleQuantite);
                        return BadRequest(new { message = $"Stock insuffisant. Stock disponible : {produit.QuantiteStock}" });
                    }

                    panierExistant.Quantite = nouvelleQuantite;
                    panierExistant.PrixUnitaire = produit.PrixVente; // Mettre à jour le prix au cas où il aurait changé
                    panierExistant.Remise = dto.Remise;
                    panierExistant.DateAjout = DateTime.Now;

                    Log.Information("Quantité mise à jour dans le panier - ClientId: {ClientId}, ProduitSku: {ProduitSku}, Nouvelle quantité: {Quantite}",
                        clientId, dto.ProduitSku, nouvelleQuantite);
                }
                else
                {
                    // Créer un nouvel article dans le panier
                    var nouveauPanier = new PanierTemporaire
                    {
                        ClientId = clientId,
                        ProduitSku = dto.ProduitSku,
                        Quantite = dto.Quantite,
                        PrixUnitaire = produit.PrixVente,
                        Remise = dto.Remise,
                        DateAjout = DateTime.Now
                    };

                    _context.PaniersTemporaires.Add(nouveauPanier);
                    Log.Information("Nouvel article ajouté au panier - ClientId: {ClientId}, ProduitSku: {ProduitSku}, Quantite: {Quantite}",
                        clientId, dto.ProduitSku, dto.Quantite);
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = panierExistant != null ? "Quantité mise à jour dans le panier" : "Article ajouté au panier avec succès"
                });
            }
            catch (DbUpdateException ex)
            {
                // Gérer les violations de contrainte unique (doublon)
                if (ex.InnerException != null && 
                    (ex.InnerException.Message.Contains("Duplicate entry") || 
                     ex.InnerException.Message.Contains("uk_client_produit")))
                {
                    Log.Warning("Tentative d'ajout d'un doublon détectée - ClientId: {ClientId}, ProduitSku: {ProduitSku}. Tentative de récupération...",
                        clientId, dto.ProduitSku);
                    
                    // Réessayer en récupérant l'article existant et en mettant à jour
                    try
                    {
                        var panierExistant = await _context.PaniersTemporaires
                            .FirstOrDefaultAsync(pt => pt.ClientId == clientId && pt.ProduitSku == dto.ProduitSku);
                        
                        if (panierExistant != null)
                        {
                            var produit = await _context.Produits.FindAsync(dto.ProduitSku);
                            if (produit != null)
                            {
                                var nouvelleQuantite = panierExistant.Quantite + dto.Quantite;
                                
                                if (produit.QuantiteStock < nouvelleQuantite)
                                {
                                    return BadRequest(new { message = $"Stock insuffisant. Stock disponible : {produit.QuantiteStock}" });
                                }
                                
                                panierExistant.Quantite = nouvelleQuantite;
                                panierExistant.PrixUnitaire = produit.PrixVente;
                                panierExistant.Remise = dto.Remise;
                                panierExistant.DateAjout = DateTime.Now;
                                
                                await _context.SaveChangesAsync();
                                
                                Log.Information("Doublon résolu - Quantité mise à jour dans le panier - ClientId: {ClientId}, ProduitSku: {ProduitSku}, Nouvelle quantité: {Quantite}",
                                    clientId, dto.ProduitSku, nouvelleQuantite);
                                
                                return Ok(new
                                {
                                    success = true,
                                    message = "Quantité mise à jour dans le panier (doublon résolu)"
                                });
                            }
                        }
                    }
                    catch (Exception retryEx)
                    {
                        Log.Error(retryEx, "Erreur lors de la tentative de récupération du doublon");
                    }
                }
                
                Log.Error(ex, "Erreur de base de données lors de l'ajout au panier");
                return StatusCode(500, new { message = "Une erreur est survenue lors de l'ajout au panier." });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de l'ajout au panier temporaire");
                return StatusCode(500, new { message = "Une erreur est survenue lors de l'ajout au panier." });
            }
        }

        /// <summary>
        /// Met à jour la quantité d'un article dans le panier temporaire
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePanierItem(int id, [FromBody] AddPanierTemporaireDto dto)
        {
            try
            {
                Log.Information("Mise à jour de l'article de panier ID : {Id}", id);

                // Validation du modèle
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var panierItem = await _context.PaniersTemporaires
                    .Include(pt => pt.Produit)
                    .FirstOrDefaultAsync(pt => pt.Id == id);

                if (panierItem == null)
                {
                    Log.Warning("Article de panier avec l'ID {Id} non trouvé", id);
                    return NotFound(new { message = "Article de panier non trouvé" });
                }

                // Vérifier le stock disponible
                if (panierItem.Produit.QuantiteStock < dto.Quantite)
                {
                    Log.Warning("Stock insuffisant pour le produit {ProduitSku} - Stock: {Stock}, Demandé: {Quantite}",
                        panierItem.ProduitSku, panierItem.Produit.QuantiteStock, dto.Quantite);
                    return BadRequest(new { message = $"Stock insuffisant. Stock disponible : {panierItem.Produit.QuantiteStock}" });
                }

                // Mettre à jour
                panierItem.Quantite = dto.Quantite;
                panierItem.PrixUnitaire = panierItem.Produit.PrixVente; // Mettre à jour le prix au cas où il aurait changé
                panierItem.Remise = dto.Remise;
                panierItem.DateAjout = DateTime.Now;

                await _context.SaveChangesAsync();

                Log.Information("Article de panier mis à jour avec succès - ID: {Id}", id);

                return Ok(new { success = true, message = "Article mis à jour avec succès" });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la mise à jour de l'article de panier");
                return StatusCode(500, new { message = "Une erreur est survenue lors de la mise à jour." });
            }
        }

        /// <summary>
        /// Supprime un article du panier temporaire
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> RemoveFromPanier(int id)
        {
            try
            {
                Log.Information("Suppression de l'article de panier ID : {Id}", id);

                var panierItem = await _context.PaniersTemporaires.FindAsync(id);
                if (panierItem == null)
                {
                    Log.Warning("Article de panier avec l'ID {Id} non trouvé", id);
                    return NotFound(new { message = "Article de panier non trouvé" });
                }

                _context.PaniersTemporaires.Remove(panierItem);
                await _context.SaveChangesAsync();

                Log.Information("Article supprimé du panier avec succès - ID: {Id}", id);

                return Ok(new { success = true, message = "Article supprimé du panier avec succès" });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la suppression de l'article de panier");
                return StatusCode(500, new { message = "Une erreur est survenue lors de la suppression." });
            }
        }

        /// <summary>
        /// Vide complètement le panier temporaire d'un client
        /// </summary>
        [HttpDelete("client/{clientId}")]
        public async Task<IActionResult> ClearPanier(int clientId)
        {
            try
            {
                Log.Information("Vidage du panier temporaire pour le client ID : {ClientId}", clientId);

                // Vérifier que le client existe
                var client = await _context.Clients.FindAsync(clientId);
                if (client == null)
                {
                    Log.Warning("Client avec l'ID {ClientId} non trouvé", clientId);
                    return NotFound(new { message = "Client non trouvé" });
                }

                var panierItems = await _context.PaniersTemporaires
                    .Where(pt => pt.ClientId == clientId)
                    .ToListAsync();

                if (panierItems.Count == 0)
                {
                    Log.Information("Le panier du client {ClientId} est déjà vide", clientId);
                    return Ok(new { success = true, message = "Le panier est déjà vide" });
                }

                _context.PaniersTemporaires.RemoveRange(panierItems);
                await _context.SaveChangesAsync();

                Log.Information("Panier vidé avec succès pour le client {ClientId} - {Count} articles supprimés",
                    clientId, panierItems.Count);

                return Ok(new
                {
                    success = true,
                    message = "Panier vidé avec succès",
                    articlesSupprimes = panierItems.Count
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors du vidage du panier temporaire");
                return StatusCode(500, new { message = "Une erreur est survenue lors du vidage du panier." });
            }
        }

        /// <summary>
        /// Vérifie et nettoie les doublons dans le panier temporaire d'un client
        /// </summary>
        [HttpPost("client/{clientId}/cleanup-duplicates")]
        public async Task<IActionResult> CleanupDuplicates(int clientId)
        {
            try
            {
                Log.Information("Nettoyage des doublons dans le panier temporaire pour le client ID : {ClientId}", clientId);

                // Trouver les doublons (même ClientId + ProduitSku)
                var doublons = await _context.PaniersTemporaires
                    .Where(pt => pt.ClientId == clientId)
                    .GroupBy(pt => new { pt.ClientId, pt.ProduitSku })
                    .Where(g => g.Count() > 1)
                    .Select(g => new
                    {
                        g.Key.ClientId,
                        g.Key.ProduitSku,
                        Items = g.OrderByDescending(pt => pt.DateAjout).ToList()
                    })
                    .ToListAsync();

                if (doublons.Count == 0)
                {
                    Log.Information("Aucun doublon trouvé pour le client {ClientId}", clientId);
                    return Ok(new
                    {
                        success = true,
                        message = "Aucun doublon trouvé",
                        doublonsNettoyes = 0
                    });
                }

                int totalNettoyes = 0;
                var idsASupprimer = new List<int>();

                foreach (var doublon in doublons)
                {
                    // Garder le plus récent (premier dans la liste triée par DateAjout desc)
                    var aGarder = doublon.Items.First();
                    var aSupprimer = doublon.Items.Skip(1).ToList();

                    // Additionner les quantités dans l'élément à garder
                    int quantiteTotale = aGarder.Quantite;
                    foreach (var item in aSupprimer)
                    {
                        quantiteTotale += item.Quantite;
                        idsASupprimer.Add(item.Id);
                    }

                    // Mettre à jour la quantité totale
                    aGarder.Quantite = quantiteTotale;
                    aGarder.DateAjout = DateTime.Now; // Mettre à jour la date

                    totalNettoyes += aSupprimer.Count;

                    Log.Information("Doublon nettoyé - ClientId: {ClientId}, ProduitSku: {ProduitSku}, Quantité totale: {QuantiteTotale}, Articles supprimés: {Count}",
                        clientId, doublon.ProduitSku, quantiteTotale, aSupprimer.Count);
                }

                // Supprimer les doublons
                if (idsASupprimer.Count > 0)
                {
                    var itemsASupprimer = await _context.PaniersTemporaires
                        .Where(pt => idsASupprimer.Contains(pt.Id))
                        .ToListAsync();

                    _context.PaniersTemporaires.RemoveRange(itemsASupprimer);
                    await _context.SaveChangesAsync();
                }

                Log.Information("Nettoyage terminé pour le client {ClientId} - {Count} doublons nettoyés", clientId, totalNettoyes);

                return Ok(new
                {
                    success = true,
                    message = $"Nettoyage terminé : {totalNettoyes} doublon(s) supprimé(s)",
                    doublonsNettoyes = totalNettoyes,
                    groupesNettoyes = doublons.Count
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors du nettoyage des doublons pour le client {ClientId}", clientId);
                return StatusCode(500, new { message = "Une erreur est survenue lors du nettoyage des doublons." });
            }
        }

        /// <summary>
        /// Vérifie les doublons dans le panier temporaire d'un client
        /// </summary>
        [HttpGet("client/{clientId}/check-duplicates")]
        public async Task<IActionResult> CheckDuplicates(int clientId)
        {
            try
            {
                Log.Information("Vérification des doublons dans le panier temporaire pour le client ID : {ClientId}", clientId);

                // Trouver les doublons (même ClientId + ProduitSku)
                var doublons = await _context.PaniersTemporaires
                    .Include(pt => pt.Produit)
                    .Where(pt => pt.ClientId == clientId)
                    .GroupBy(pt => new { pt.ClientId, pt.ProduitSku })
                    .Where(g => g.Count() > 1)
                    .Select(g => new
                    {
                        ClientId = g.Key.ClientId,
                        ProduitSku = g.Key.ProduitSku,
                        NomProduit = g.First().Produit.NomProduit,
                        NombreDoublons = g.Count(),
                        Items = g.OrderByDescending(pt => pt.DateAjout).Select(pt => new
                        {
                            pt.Id,
                            pt.Quantite,
                            pt.PrixUnitaire,
                            pt.DateAjout
                        }).ToList()
                    })
                    .ToListAsync();

                if (doublons.Count == 0)
                {
                    return Ok(new
                    {
                        success = true,
                        hasDuplicates = false,
                        message = "Aucun doublon trouvé",
                        doublons = new List<object>()
                    });
                }

                return Ok(new
                {
                    success = true,
                    hasDuplicates = true,
                    message = $"{doublons.Count} groupe(s) de doublons trouvé(s)",
                    doublons = doublons,
                    totalDoublons = doublons.Sum(d => d.NombreDoublons - 1) // Nombre d'éléments en trop
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la vérification des doublons pour le client {ClientId}", clientId);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la vérification des doublons." });
            }
        }
    }
}

