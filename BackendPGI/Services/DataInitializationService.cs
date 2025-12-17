using Microsoft.EntityFrameworkCore;
using BackendPGI.Data;
using BackendPGI.Models;
using OfficeOpenXml;
using System.Globalization;
using Serilog;

namespace BackendPGI.Services
{
    public class DataInitializationService
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private const string ExcelFileName = "NordikAdventures - Liste des produits PGI(1).xlsx";

        public DataInitializationService(ApplicationDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        public async Task InitializeDataAsync()
        {
            try
            {
                // Vérifier si des produits existent déjà
                var produitCount = await _context.Produits.CountAsync();
                
                if (produitCount > 0)
                {
                    Log.Information("La base de données contient déjà {Count} produits. Aucun chargement automatique nécessaire.", produitCount);
                    return;
                }

                Log.Information("Aucun produit trouvé dans la base de données. Début du chargement automatique depuis le fichier Excel...");

                // Chercher le fichier Excel
                var excelPath = Path.Combine(_environment.ContentRootPath, ExcelFileName);
                
                if (!File.Exists(excelPath))
                {
                    Log.Warning("Le fichier Excel '{FileName}' n'a pas été trouvé dans le répertoire racine. Chemin recherché: {Path}", ExcelFileName, excelPath);
                    return;
                }

                Log.Information("Fichier Excel trouvé: {Path}", excelPath);

                // Charger les données
                await ImportExcelFileAsync(excelPath);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de l'initialisation automatique des données");
            }
        }

        private async Task ImportExcelFileAsync(string filePath)
        {
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

            var produitsImports = new List<Produit>();
            var erreurs = new List<string>();
            var lignesTraitees = 0;
            var lignesSucces = 0;

            try
            {
                using var package = new ExcelPackage(new FileInfo(filePath));
                var worksheet = package.Workbook.Worksheets[0];

                if (worksheet.Dimension == null)
                {
                    Log.Warning("Le fichier Excel est vide.");
                    return;
                }

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
                        
                        // Parser la ligne en objet Produit
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
                    Log.Information("Chargement automatique terminé - {Success} produits importés, {Errors} erreurs", 
                        produitsImports.Count, erreurs.Count);
                }
                else
                {
                    Log.Warning("Aucun produit n'a pu être importé. Erreurs: {ErrorCount}", erreurs.Count);
                    if (erreurs.Count > 0)
                    {
                        Log.Warning("Premières erreurs: {Errors}", string.Join("; ", erreurs.Take(5)));
                    }
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de l'import du fichier Excel");
            }
        }

        #region Helper Methods (copiés de ControllerProduit)

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

        private ColumnMap ReadHeaders(ExcelWorksheet worksheet, int colCount)
        {
            var map = new ColumnMap();
            
            for (int col = 1; col <= colCount; col++)
            {
                var headerValue = worksheet.Cells[1, col].Value?.ToString()?.Trim()?.ToLowerInvariant() ?? "";
                
                if (headerValue == "sku")
                    map.Sku = col;
                else if (headerValue.Contains("sku") && !map.Sku.HasValue)
                    map.Sku = col;
                else if ((headerValue == "référence" || headerValue == "reference") && !map.Sku.HasValue)
                    map.Sku = col;
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
                else if (headerValue.Contains("code") && headerValue.Contains("fournisseur"))
                    map.FournisseurCode = col;
                else if (headerValue.Contains("fournisseur") && !headerValue.Contains("code") && !headerValue.Contains("remise"))
                {
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
            
            return map;
        }

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

        private Produit? ParseRowFromText(ExcelWorksheet worksheet, int row, string[] rowValues, ColumnMap map, out string? errorMessage)
        {
            errorMessage = null;
            var produit = new Produit();

            // SKU (obligatoire)
            if (map.Sku.HasValue)
            {
                var skuCell = worksheet.Cells[row, map.Sku.Value];
                var skuValue = skuCell.Value;
                produit.Sku = skuValue?.ToString()?.Trim() ?? "";
            }
            else
            {
                var firstCell = worksheet.Cells[row, 1].Value;
                produit.Sku = firstCell?.ToString()?.Trim() ?? "";
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
                    if (marge > 1)
                        marge = marge / 100;
                    
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

            // Fournisseur nom
            if (map.FournisseurNom.HasValue)
            {
                var fournisseurNomCell = worksheet.Cells[row, map.FournisseurNom.Value];
                var fournisseurNomValue = fournisseurNomCell.Value?.ToString()?.Trim();
                produit.FournisseurNom = fournisseurNomValue;
            }

            // Fournisseur code
            if (map.FournisseurCode.HasValue)
            {
                var fournisseurCodeCell = worksheet.Cells[row, map.FournisseurCode.Value];
                var fournisseurCodeValue = fournisseurCodeCell.Value?.ToString()?.Trim();
                produit.FournisseurCode = fournisseurCodeValue;
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
                
                if (margeCalculee < 0) margeCalculee = 0;
                if (margeCalculee > 1) margeCalculee = 1;
                
                produit.MargeBrute = margeCalculee;
            }

            return produit;
        }

        private async Task<Fournisseur?> GetOrCreateFournisseurAsync(
            string? fournisseurNom, 
            string? fournisseurCode, 
            Dictionary<string, Fournisseur> cache)
        {
            var cacheKey = $"{fournisseurCode ?? ""}|{fournisseurNom ?? ""}";
            
            if (cache.ContainsKey(cacheKey))
            {
                return cache[cacheKey];
            }

            Fournisseur? fournisseur = null;

            if (!string.IsNullOrWhiteSpace(fournisseurCode))
            {
                fournisseur = await _context.Fournisseurs
                    .FirstOrDefaultAsync(f => f.Code == fournisseurCode);
            }

            if (fournisseur == null && !string.IsNullOrWhiteSpace(fournisseurNom))
            {
                fournisseur = await _context.Fournisseurs
                    .FirstOrDefaultAsync(f => f.Nom == fournisseurNom);
            }

            if (fournisseur == null)
            {
                var code = fournisseurCode;
                if (string.IsNullOrWhiteSpace(code))
                {
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
                await _context.SaveChangesAsync();
                
                Log.Information("Fournisseur créé : {Code} - {Nom}", code, nom);
            }

            cache[cacheKey] = fournisseur;
            return fournisseur;
        }

        #endregion
    }
}

