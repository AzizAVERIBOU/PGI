using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Serilog;
using BackendPGI.Data;
using BackendPGI.Models;
using BackendPGI.Services;
using OfficeOpenXml;
using System.Globalization;

namespace BackendPGI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ControllerProduit : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public ControllerProduit(ApplicationDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        #region CRUD Operations

        [HttpGet]
        public async Task<IActionResult> GetProduits([FromQuery] string? categorie = null, [FromQuery] string? statut = null)
        {
            Log.Information("Récupération de la liste des produits - Catégorie: {Categorie}, Statut: {Statut}", categorie ?? "Tous", statut ?? "Tous");
            
            var query = _context.Produits.AsQueryable();
            
            if (!string.IsNullOrEmpty(categorie))
                query = query.Where(p => p.Categorie == categorie);
            
            if (!string.IsNullOrEmpty(statut))
                query = query.Where(p => p.Statut == statut);
            
            // Retourner tous les produits avec tous leurs attributs, y compris FournisseurNom et FournisseurCode
            var produits = await query.OrderBy(p => p.NomProduit).ToListAsync();
            
            return Ok(produits);
        }

        [HttpGet("{sku}")]
        public async Task<IActionResult> GetProduit(string sku)
        {
            var produit = await _context.Produits.FindAsync(sku);
            
            if (produit == null)
                return NotFound(new { message = $"Produit avec le SKU {sku} non trouvé" });
            
            // Retourner le produit avec tous ses attributs, y compris FournisseurNom et FournisseurCode
            return Ok(produit);
        }

        [HttpPost]
        public async Task<IActionResult> CreateProduit([FromBody] Produit produit)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var skuExists = await _context.Produits.AnyAsync(p => p.Sku == produit.Sku);
            if (skuExists)
                return Conflict(new { message = $"Un produit avec le SKU {produit.Sku} existe déjà." });

            try
            {
                // Calculer la marge brute si non fournie
                if (!produit.MargeBrute.HasValue && produit.PrixVente > 0 && produit.CoutAchat > 0)
                {
                    var margeCalculee = (produit.PrixVente - produit.CoutAchat) / produit.PrixVente;
                    
                    // S'assurer que la marge est entre 0 et 1
                    if (margeCalculee < 0) margeCalculee = 0;
                    if (margeCalculee > 1) margeCalculee = 1;
                    
                    produit.MargeBrute = margeCalculee;
                }
                
                if (!produit.DateEntreeStock.HasValue)
                    produit.DateEntreeStock = DateTime.Now.Date;
                
                _context.Produits.Add(produit);
                await _context.SaveChangesAsync();
                
                Log.Information("Produit créé - SKU: {Sku}, Nom: {NomProduit}", produit.Sku, produit.NomProduit);
                return CreatedAtAction(nameof(GetProduit), new { sku = produit.Sku }, produit);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la création du produit");
                return StatusCode(500, new { message = "Une erreur est survenue lors de la création du produit." });
            }
        }

        [HttpPut("{sku}")]
        public async Task<IActionResult> UpdateProduit(string sku, [FromBody] Produit produit)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (sku != produit.Sku)
                return BadRequest(new { message = "Le SKU dans l'URL ne correspond pas au SKU du produit." });

            var existingProduit = await _context.Produits.FindAsync(sku);
            if (existingProduit == null)
                return NotFound(new { message = $"Produit avec le SKU {sku} non trouvé." });

            try
            {
                if (!produit.MargeBrute.HasValue && produit.PrixVente > 0 && produit.CoutAchat > 0)
                {
                    var margeCalculee = (produit.PrixVente - produit.CoutAchat) / produit.PrixVente;
                    
                    // S'assurer que la marge est entre 0 et 1
                    if (margeCalculee < 0) margeCalculee = 0;
                    if (margeCalculee > 1) margeCalculee = 1;
                    
                    produit.MargeBrute = margeCalculee;
                }
                
                _context.Entry(existingProduit).CurrentValues.SetValues(produit);
                await _context.SaveChangesAsync();
                
                return Ok(produit);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la mise à jour du produit");
                return StatusCode(500, new { message = "Une erreur est survenue lors de la mise à jour du produit." });
            }
        }

        [HttpDelete("{sku}")]
        public async Task<IActionResult> DeleteProduit(string sku)
        {
            var produit = await _context.Produits.FindAsync(sku);
            if (produit == null)
                return NotFound(new { message = $"Produit avec le SKU {sku} non trouvé." });

            try
            {
                _context.Produits.Remove(produit);
                await _context.SaveChangesAsync();
                
                return Ok(new { message = $"Produit {sku} supprimé avec succès." });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la suppression du produit");
                return StatusCode(500, new { message = "Une erreur est survenue lors de la suppression du produit." });
            }
        }

        [HttpPatch("{sku}/stock")]
        public async Task<IActionResult> UpdateStock(string sku, [FromBody] int nouvelleQuantite)
        {
            var produit = await _context.Produits.FindAsync(sku);
            if (produit == null)
                return NotFound(new { message = $"Produit avec le SKU {sku} non trouvé." });

            if (nouvelleQuantite < 0)
                return BadRequest(new { message = "La quantité en stock ne peut pas être négative." });

            try
            {
                produit.QuantiteStock = nouvelleQuantite;
                await _context.SaveChangesAsync();
                
                return Ok(new
                {
                    sku = produit.Sku,
                    nomProduit = produit.NomProduit,
                    nouvelleQuantite = nouvelleQuantite
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la mise à jour du stock");
                return StatusCode(500, new { message = "Une erreur est survenue lors de la mise à jour du stock." });
            }
        }

        #endregion

        #region Excel Import

        [HttpPost("import-excel")]
        public async Task<IActionResult> ImportExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Aucun fichier fourni." });

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension != ".xlsx" && extension != ".xls")
                return BadRequest(new { message = "Le fichier doit être un fichier Excel (.xlsx ou .xls)." });

            if (file.Length > 10 * 1024 * 1024)
                return BadRequest(new { message = "Le fichier est trop volumineux. Taille maximale : 10 MB." });

            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

            var produitsImports = new List<Produit>();
            var erreurs = new List<string>();
            var lignesTraitees = 0;
            var lignesSucces = 0;

            try
            {
                Log.Information("Début de l'import du fichier Excel : {FileName}", file.FileName);

                using var stream = new MemoryStream();
                await file.CopyToAsync(stream);
                stream.Position = 0;

                using var package = new ExcelPackage(stream);
                var worksheet = package.Workbook.Worksheets[0];

                if (worksheet.Dimension == null)
                    return BadRequest(new { message = "Le fichier Excel est vide." });

                var rowCount = worksheet.Dimension.Rows;
                var colCount = worksheet.Dimension.Columns;

                Log.Information("Fichier Excel - Lignes: {RowCount}, Colonnes: {ColCount}", rowCount, colCount);

                // Lire les en-têtes de la première ligne pour identifier les colonnes
                var columnMap = ReadHeaders(worksheet, colCount);

                // Dictionnaire pour stocker les fournisseurs créés/récupérés pendant l'import
                var fournisseursCache = new Dictionary<string, Fournisseur>();

                // Parcourir chaque ligne de données (à partir de la ligne 2)
                for (int row = 2; row <= rowCount; row++)
                {
                    lignesTraitees++;
                    try
                    {
                        // Lire toutes les valeurs de la ligne comme texte
                        var rowValues = ReadRowAsText(worksheet, row, colCount);
                        
                        // Parser la ligne en objet Produit (passer aussi worksheet et row pour le SKU)
                        var produit = ParseRowFromText(worksheet, row, rowValues, columnMap, out string? errorMessage);

                        if (produit == null)
                        {
                            erreurs.Add($"Ligne {row}: {errorMessage}");
                            continue;
                        }

                        var existeDeja = await _context.Produits.AnyAsync(p => p.Sku == produit.Sku);
                        if (existeDeja)
                        {
                            erreurs.Add($"Ligne {row}: Le produit avec SKU {produit.Sku} existe déjà.");
                            continue;
                        }

                        // Créer ou récupérer le fournisseur si les informations sont présentes
                        if (!string.IsNullOrWhiteSpace(produit.FournisseurNom) || !string.IsNullOrWhiteSpace(produit.FournisseurCode))
                        {
                            var fournisseur = await GetOrCreateFournisseurAsync(
                                produit.FournisseurNom, 
                                produit.FournisseurCode, 
                                fournisseursCache);
                            
                            if (fournisseur != null)
                            {
                                produit.FournisseurId = fournisseur.Id;
                            }
                        }

                        produitsImports.Add(produit);
                        lignesSucces++;
                    }
                    catch (Exception ex)
                    {
                        var sku = worksheet.Cells[row, 1].Value?.ToString() ?? "N/A";
                        erreurs.Add($"Ligne {row} (SKU: {sku}): {ex.Message}");
                        Log.Error(ex, "Erreur lors du traitement de la ligne {Row}", row);
                    }
                }

                if (produitsImports.Count > 0)
                {
                    // Sauvegarder d'abord les fournisseurs créés
                    if (fournisseursCache.Count > 0)
                    {
                        await _context.SaveChangesAsync();
                        Log.Information("Fournisseurs créés/mis à jour : {Count}", fournisseursCache.Count);
                    }

                    // Ensuite sauvegarder les produits
                    await _context.Produits.AddRangeAsync(produitsImports);
                    await _context.SaveChangesAsync();
                    Log.Information("Import terminé - {Success} produits importés", produitsImports.Count);
                }

                return Ok(new
                {
                    success = true,
                    message = $"Import terminé : {lignesSucces} produits importés, {erreurs.Count} échecs sur {lignesTraitees} lignes",
                    totalLignes = lignesTraitees,
                    produitsImportes = lignesSucces,
                    produitsEchec = erreurs.Count,
                    erreurs = erreurs.Take(50).ToList()
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de l'import du fichier Excel");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Une erreur est survenue lors de l'import du fichier Excel.",
                    error = ex.Message
                });
            }
        }

        #endregion

        #region Helper Methods

        // Structure pour mapper les colonnes
        private class ColumnMap
        {
            public int? Sku { get; set; }
            public int? Categorie { get; set; }
            public int? NomProduit { get; set; }
            public int? CoutAchat { get; set; }
            public int? PrixVente { get; set; }
            public int? MargeBrute { get; set; }
            public int? QuantiteStock { get; set; }
            public int? SeuilReappro { get; set; }
            public int? StockSecurite { get; set; }
            public int? DelaiLivraison { get; set; }
            public int? FournisseurNom { get; set; }
            public int? FournisseurCode { get; set; }
            public int? RemiseFournisseur { get; set; }
            public int? PoidsKg { get; set; }
            public int? DateEntreeStock { get; set; }
            public int? EmplacementEntrepot { get; set; }
            public int? Statut { get; set; }
        }

        // Lire les en-têtes et créer un mapping des colonnes
        private ColumnMap ReadHeaders(ExcelWorksheet worksheet, int colCount)
        {
            var map = new ColumnMap();
            
            for (int col = 1; col <= colCount; col++)
            {
                var headerValue = worksheet.Cells[1, col].Value?.ToString()?.Trim()?.ToLowerInvariant() ?? "";
                
                // Mapping simple par mots-clés
                // SKU : priorité absolue à "sku" exact (première colonne)
                if (headerValue == "sku")
                {
                    map.Sku = col; // Priorité absolue
                }
                else if (headerValue.Contains("sku") && !map.Sku.HasValue)
                {
                    map.Sku = col; // Contient "sku" mais pas exact
                }
                // Ne pas utiliser "code" car il peut y avoir "code fournisseur"
                // Utiliser seulement "référence" si pas de SKU trouvé
                else if ((headerValue == "référence" || headerValue == "reference") && !map.Sku.HasValue)
                {
                    map.Sku = col;
                }
                else if (headerValue.Contains("catégorie") || headerValue.Contains("categorie"))
                    map.Categorie = col;
                else if ((headerValue.Contains("nom") && headerValue.Contains("produit")) || headerValue == "nom" || headerValue == "produit")
                    map.NomProduit = col;
                else if ((headerValue.Contains("coût") || headerValue.Contains("cout")) && headerValue.Contains("achat"))
                    map.CoutAchat = col;
                else if (headerValue.Contains("prix") && headerValue.Contains("vente"))
                    map.PrixVente = col;
                else if (headerValue.Contains("marge") && headerValue.Contains("brute"))
                    map.MargeBrute = col;
                else if (headerValue.Contains("quantité") && headerValue.Contains("stock") || headerValue == "stock")
                    map.QuantiteStock = col;
                else if (headerValue.Contains("seuil") && headerValue.Contains("réappro"))
                    map.SeuilReappro = col;
                else if (headerValue.Contains("stock") && (headerValue.Contains("sécurité") || headerValue.Contains("securite")))
                    map.StockSecurite = col;
                else if (headerValue.Contains("délai") && headerValue.Contains("livraison"))
                    map.DelaiLivraison = col;
                // Fournisseur code : PRIORITÉ - doit contenir "code" ET "fournisseur"
                // Exemple: "code fournisseur" ou "fournisseur code"
                else if (headerValue.Contains("code") && headerValue.Contains("fournisseur"))
                {
                    map.FournisseurCode = col;
                }
                // Fournisseur nom : doit contenir "fournisseur" mais PAS "code" et PAS "remise"
                // Exemple: "fournisseur" ou "fournisseur nom"
                else if (headerValue.Contains("fournisseur") && !headerValue.Contains("code") && !headerValue.Contains("remise"))
                {
                    // Si on trouve juste "fournisseur" ou "fournisseur nom", c'est le nom
                    if (!map.FournisseurNom.HasValue)
                        map.FournisseurNom = col;
                }
                else if (headerValue.Contains("remise") && headerValue.Contains("fournisseur"))
                    map.RemiseFournisseur = col;
                else if (headerValue.Contains("poids"))
                    map.PoidsKg = col;
                else if (headerValue.Contains("date") && headerValue.Contains("entrée"))
                    map.DateEntreeStock = col;
                else if (headerValue.Contains("emplacement") || headerValue.Contains("entrepôt"))
                    map.EmplacementEntrepot = col;
                else if (headerValue.Contains("statut") || headerValue.Contains("status"))
                    map.Statut = col;
            }
            
            // Log pour vérifier le mapping des fournisseurs
            Log.Information("Mapping des colonnes fournisseur - FournisseurNom: {NomCol}, FournisseurCode: {CodeCol}", 
                map.FournisseurNom?.ToString() ?? "NON TROUVÉ", 
                map.FournisseurCode?.ToString() ?? "NON TROUVÉ");
            
            return map;
        }

        // Lire une ligne complète comme tableau de texte
        private string[] ReadRowAsText(ExcelWorksheet worksheet, int row, int colCount)
        {
            var values = new string[colCount];
            for (int col = 1; col <= colCount; col++)
            {
                var cellValue = worksheet.Cells[row, col].Value;
                values[col - 1] = cellValue?.ToString()?.Trim() ?? "";
            }
            return values;
        }

        // Parser une ligne de texte en objet Produit
        private Produit? ParseRowFromText(ExcelWorksheet worksheet, int row, string[] rowValues, ColumnMap map, out string? errorMessage)
        {
            errorMessage = null;
            var produit = new Produit();

            // SKU (obligatoire) - Récupérer directement depuis la cellule Excel pour préserver la valeur exacte
            if (map.Sku.HasValue)
            {
                var skuCell = worksheet.Cells[row, map.Sku.Value];
                // Récupérer la valeur exacte telle qu'elle est dans Excel
                var skuValue = skuCell.Value;
                produit.Sku = skuValue?.ToString()?.Trim() ?? "";
                
                // Log pour debug (première ligne seulement)
                if (row == 2)
                {
                    var headerName = worksheet.Cells[1, map.Sku.Value].Value?.ToString() ?? "N/A";
                    Log.Information("SKU détecté - Colonne: {Col} ('{Header}'), Valeur brute: '{RawValue}', Valeur finale: '{FinalValue}'", 
                        map.Sku.Value, headerName, skuValue, produit.Sku);
                }
            }
            else
            {
                // Si pas de colonne SKU trouvée, essayer la première colonne par défaut
                var firstCell = worksheet.Cells[row, 1].Value;
                produit.Sku = firstCell?.ToString()?.Trim() ?? "";
                
                if (row == 2)
                {
                    var firstHeader = worksheet.Cells[1, 1].Value?.ToString() ?? "N/A";
                    Log.Warning("Colonne SKU non trouvée, utilisation de la première colonne ('{Header}'). Valeur: '{Sku}'", firstHeader, produit.Sku);
                }
            }
            
            if (string.IsNullOrWhiteSpace(produit.Sku))
            {
                errorMessage = "SKU manquant";
                return null;
            }

            // Catégorie (obligatoire)
            if (map.Categorie.HasValue && map.Categorie.Value <= rowValues.Length)
            {
                produit.Categorie = rowValues[map.Categorie.Value - 1];
            }
            if (string.IsNullOrEmpty(produit.Categorie))
            {
                errorMessage = $"Catégorie manquante pour SKU {produit.Sku}";
                return null;
            }

            // Nom du produit (obligatoire)
            if (map.NomProduit.HasValue && map.NomProduit.Value <= rowValues.Length)
            {
                produit.NomProduit = rowValues[map.NomProduit.Value - 1];
            }
            if (string.IsNullOrEmpty(produit.NomProduit))
            {
                errorMessage = $"Nom du produit manquant pour SKU {produit.Sku}";
                return null;
            }

            // Coût d'achat (obligatoire)
            if (map.CoutAchat.HasValue && map.CoutAchat.Value <= rowValues.Length)
            {
                var coutString = rowValues[map.CoutAchat.Value - 1].Replace("$", "").Replace(" ", "").Trim();
                if (decimal.TryParse(coutString, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal cout))
                {
                    produit.CoutAchat = cout;
                }
            }
            if (produit.CoutAchat == 0)
            {
                errorMessage = $"Coût d'achat manquant ou invalide pour SKU {produit.Sku}";
                return null;
            }

            // Prix de vente (obligatoire)
            if (map.PrixVente.HasValue && map.PrixVente.Value <= rowValues.Length)
            {
                var prixString = rowValues[map.PrixVente.Value - 1].Replace("$", "").Replace(" ", "").Trim();
                if (decimal.TryParse(prixString, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal prix))
                {
                    produit.PrixVente = prix;
                }
            }
            if (produit.PrixVente == 0)
            {
                errorMessage = $"Prix de vente manquant ou invalide pour SKU {produit.Sku}";
                return null;
            }

            // Champs optionnels
            if (map.MargeBrute.HasValue && map.MargeBrute.Value <= rowValues.Length)
            {
                var margeString = rowValues[map.MargeBrute.Value - 1].Replace("%", "").Trim();
                if (decimal.TryParse(margeString, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal marge))
                {
                    // Si la marge est en pourcentage (> 1), la convertir en décimal (0-1)
                    if (marge > 1)
                        marge = marge / 100;
                    
                    // S'assurer que la marge est entre 0 et 1
                    if (marge < 0) marge = 0;
                    if (marge > 1) marge = 1;
                    
                    produit.MargeBrute = marge;
                }
            }

            if (map.QuantiteStock.HasValue && map.QuantiteStock.Value <= rowValues.Length)
            {
                if (int.TryParse(rowValues[map.QuantiteStock.Value - 1], out int qte))
                    produit.QuantiteStock = qte;
            }

            if (map.SeuilReappro.HasValue && map.SeuilReappro.Value <= rowValues.Length)
            {
                if (int.TryParse(rowValues[map.SeuilReappro.Value - 1], out int seuil))
                    produit.SeuilReappro = seuil;
            }

            if (map.StockSecurite.HasValue && map.StockSecurite.Value <= rowValues.Length)
            {
                if (int.TryParse(rowValues[map.StockSecurite.Value - 1], out int stockSec))
                    produit.StockSecurite = stockSec;
            }

            if (map.DelaiLivraison.HasValue && map.DelaiLivraison.Value <= rowValues.Length)
            {
                if (int.TryParse(rowValues[map.DelaiLivraison.Value - 1], out int delai))
                    produit.DelaiLivraisonJours = delai;
            }

            // Fournisseur nom - Récupérer directement depuis Excel pour préserver la valeur exacte
            if (map.FournisseurNom.HasValue)
            {
                var fournisseurNomCell = worksheet.Cells[row, map.FournisseurNom.Value];
                var fournisseurNomValue = fournisseurNomCell.Value?.ToString()?.Trim();
                produit.FournisseurNom = fournisseurNomValue;
                
                if (row == 2)
                {
                    var headerName = worksheet.Cells[1, map.FournisseurNom.Value].Value?.ToString() ?? "N/A";
                    Log.Information("FournisseurNom détecté - Colonne: {Col} ('{Header}'), Valeur brute: '{RawValue}', Valeur finale: '{FinalValue}'", 
                        map.FournisseurNom.Value, headerName, fournisseurNomCell.Value, produit.FournisseurNom);
                }
            }

            // Fournisseur code - Récupérer directement depuis Excel pour préserver la valeur exacte
            if (map.FournisseurCode.HasValue)
            {
                var fournisseurCodeCell = worksheet.Cells[row, map.FournisseurCode.Value];
                var fournisseurCodeValue = fournisseurCodeCell.Value?.ToString()?.Trim();
                produit.FournisseurCode = fournisseurCodeValue;
                
                if (row == 2)
                {
                    var headerName = worksheet.Cells[1, map.FournisseurCode.Value].Value?.ToString() ?? "N/A";
                    Log.Information("FournisseurCode détecté - Colonne: {Col} ('{Header}'), Valeur brute: '{RawValue}', Valeur finale: '{FinalValue}'", 
                        map.FournisseurCode.Value, headerName, fournisseurCodeCell.Value, produit.FournisseurCode);
                }
            }

            if (map.RemiseFournisseur.HasValue && map.RemiseFournisseur.Value <= rowValues.Length)
            {
                var remiseString = rowValues[map.RemiseFournisseur.Value - 1].Replace("%", "").Trim();
                if (decimal.TryParse(remiseString, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal remise))
                    produit.RemiseFournisseurPct = remise;
            }

            if (map.PoidsKg.HasValue && map.PoidsKg.Value <= rowValues.Length)
            {
                var poidsString = rowValues[map.PoidsKg.Value - 1].Replace("kg", "").Trim();
                if (decimal.TryParse(poidsString, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal poids))
                    produit.PoidsKg = poids;
            }

            if (map.DateEntreeStock.HasValue && map.DateEntreeStock.Value <= rowValues.Length)
            {
                if (DateTime.TryParse(rowValues[map.DateEntreeStock.Value - 1], out DateTime date))
                    produit.DateEntreeStock = date.Date;
            }

            if (map.EmplacementEntrepot.HasValue && map.EmplacementEntrepot.Value <= rowValues.Length)
            {
                produit.EmplacementEntrepot = rowValues[map.EmplacementEntrepot.Value - 1];
            }

            if (map.Statut.HasValue && map.Statut.Value <= rowValues.Length)
            {
                produit.Statut = rowValues[map.Statut.Value - 1];
            }
            else
            {
                produit.Statut = "Actif";
            }

            // Calculer la marge brute si non fournie
            if (!produit.MargeBrute.HasValue && produit.PrixVente > 0 && produit.CoutAchat > 0)
            {
                var margeCalculee = (produit.PrixVente - produit.CoutAchat) / produit.PrixVente;
                
                // S'assurer que la marge est entre 0 et 1
                if (margeCalculee < 0) margeCalculee = 0;
                if (margeCalculee > 1) margeCalculee = 1;
                
                produit.MargeBrute = margeCalculee;
            }

            return produit;
        }

        // Créer ou récupérer un fournisseur à partir du nom et du code
        private async Task<Fournisseur?> GetOrCreateFournisseurAsync(
            string? fournisseurNom, 
            string? fournisseurCode, 
            Dictionary<string, Fournisseur> cache)
        {
            // Générer une clé unique pour le cache
            var cacheKey = $"{fournisseurCode ?? ""}|{fournisseurNom ?? ""}";
            
            // Vérifier si le fournisseur est déjà dans le cache
            if (cache.ContainsKey(cacheKey))
            {
                return cache[cacheKey];
            }

            Fournisseur? fournisseur = null;

            // Chercher d'abord par code si disponible
            if (!string.IsNullOrWhiteSpace(fournisseurCode))
            {
                fournisseur = await _context.Fournisseurs
                    .FirstOrDefaultAsync(f => f.Code == fournisseurCode);
            }

            // Si pas trouvé par code, chercher par nom
            if (fournisseur == null && !string.IsNullOrWhiteSpace(fournisseurNom))
            {
                fournisseur = await _context.Fournisseurs
                    .FirstOrDefaultAsync(f => f.Nom == fournisseurNom);
            }

            // Si le fournisseur n'existe pas, le créer
            if (fournisseur == null)
            {
                var code = fournisseurCode;
                if (string.IsNullOrWhiteSpace(code))
                {
                    // Générer un code unique basé sur le nom
                    var nomBase = fournisseurNom?.ToUpper().Replace(" ", "-").Substring(0, Math.Min(10, fournisseurNom?.Length ?? 0)) ?? "FOURN";
                    code = $"FOURN-{nomBase}-{DateTime.Now.Ticks % 10000}";
                }

                var nom = fournisseurNom ?? "Fournisseur inconnu";

                fournisseur = new Fournisseur
                {
                    Code = code,
                    Nom = nom,
                    Statut = "Actif",
                    DateCreation = DateTime.Now
                };

                _context.Fournisseurs.Add(fournisseur);
                await _context.SaveChangesAsync(); // Sauvegarder immédiatement pour obtenir l'Id
                
                Log.Information("Fournisseur créé : {Code} - {Nom}", code, nom);
            }

            // Ajouter au cache
            cache[cacheKey] = fournisseur;
            return fournisseur;
        }

        #endregion
    }
}
