using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Serilog;
using BackendPGI.Data;
using BackendPGI.Models;

namespace BackendPGI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ControllerFournisseur : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ControllerFournisseur(ApplicationDbContext context)
        {
            _context = context;
        }

        #region CRUD Operations

        [HttpGet]
        public async Task<IActionResult> GetFournisseurs([FromQuery] string? statut = null)
        {
            Log.Information("Récupération de la liste des fournisseurs - Statut: {Statut}", statut ?? "Tous");
            
            var query = _context.Fournisseurs.AsQueryable();
            
            if (!string.IsNullOrEmpty(statut))
                query = query.Where(f => f.Statut == statut);
            
            var fournisseurs = await query
                .OrderBy(f => f.Nom)
                .Select(f => new
                {
                    f.Id,
                    f.Code,
                    f.Nom,
                    f.Email,
                    f.Telephone,
                    f.Adresse,
                    f.Ville,
                    f.CodePostal,
                    f.Pays,
                    f.RemiseDefaut,
                    f.Statut,
                    f.DateCreation,
                    nombreProduits = f.Produits.Count
                })
                .ToListAsync();
            
            Log.Information("Nombre de fournisseurs retournés : {Count}", fournisseurs.Count);
            return Ok(fournisseurs);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetFournisseur(int id)
        {
            Log.Information("Récupération du fournisseur avec l'ID : {FournisseurId}", id);
            
            var fournisseur = await _context.Fournisseurs
                .Include(f => f.Produits)
                .FirstOrDefaultAsync(f => f.Id == id);
            
            if (fournisseur == null)
            {
                Log.Warning("Fournisseur avec l'ID {FournisseurId} non trouvé", id);
                return NotFound(new { message = $"Fournisseur avec l'ID {id} non trouvé" });
            }
            
            var fournisseurResponse = new
            {
                fournisseur.Id,
                fournisseur.Code,
                fournisseur.Nom,
                fournisseur.Email,
                fournisseur.Telephone,
                fournisseur.Adresse,
                fournisseur.Ville,
                fournisseur.CodePostal,
                fournisseur.Pays,
                fournisseur.RemiseDefaut,
                fournisseur.Statut,
                fournisseur.DateCreation,
                produits = fournisseur.Produits.Select(p => new
                {
                    p.Sku,
                    p.NomProduit,
                    p.Categorie,
                    p.PrixVente,
                    p.QuantiteStock,
                    p.Statut
                }).ToList(),
                nombreProduits = fournisseur.Produits.Count
            };
            
            return Ok(fournisseurResponse);
        }

        [HttpGet("code/{code}")]
        public async Task<IActionResult> GetFournisseurByCode(string code)
        {
            Log.Information("Récupération du fournisseur avec le code : {Code}", code);
            
            var fournisseur = await _context.Fournisseurs
                .FirstOrDefaultAsync(f => f.Code == code);
            
            if (fournisseur == null)
            {
                Log.Warning("Fournisseur avec le code {Code} non trouvé", code);
                return NotFound(new { message = $"Fournisseur avec le code {code} non trouvé" });
            }
            
            return Ok(fournisseur);
        }

        [HttpPost]
        public async Task<IActionResult> CreateFournisseur([FromBody] Fournisseur fournisseur)
        {
            Log.Information("Création d'un nouveau fournisseur : {Nom} ({Code})", fournisseur.Nom, fournisseur.Code);
            
            // Validation du modèle
            if (!ModelState.IsValid)
            {
                Log.Warning("Tentative de création d'un fournisseur avec des données invalides");
                return BadRequest(ModelState);
            }
            
            // Vérifier si le code existe déjà
            var codeExists = await _context.Fournisseurs
                .AnyAsync(f => f.Code == fournisseur.Code);
            
            if (codeExists)
            {
                Log.Warning("Tentative de création d'un fournisseur avec un code existant : {Code}", fournisseur.Code);
                return Conflict(new { message = "Un fournisseur avec ce code existe déjà." });
            }
            
            // Vérifier si l'email existe déjà (seulement si un email est fourni)
            if (!string.IsNullOrEmpty(fournisseur.Email))
            {
                var emailExists = await _context.Fournisseurs
                    .AnyAsync(f => f.Email == fournisseur.Email);
                
                if (emailExists)
                {
                    Log.Warning("Tentative de création d'un fournisseur avec un email existant : {Email}", fournisseur.Email);
                    return Conflict(new { message = "Un fournisseur avec cet email existe déjà." });
                }
            }
            
            try
            {
                fournisseur.DateCreation = DateTime.Now;
                if (string.IsNullOrEmpty(fournisseur.Statut))
                {
                    fournisseur.Statut = "Actif";
                }
                
                _context.Fournisseurs.Add(fournisseur);
                await _context.SaveChangesAsync();
                
                Log.Information("Fournisseur créé avec succès - ID: {Id}, Code: {Code}", fournisseur.Id, fournisseur.Code);
                
                return CreatedAtAction(nameof(GetFournisseur), new { id = fournisseur.Id }, fournisseur);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la création du fournisseur");
                return StatusCode(500, new { message = "Une erreur est survenue lors de la création du fournisseur." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateFournisseur(int id, [FromBody] Fournisseur fournisseurDto)
        {
            Log.Information("Mise à jour du fournisseur ID : {FournisseurId}", id);
            
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            
            var fournisseur = await _context.Fournisseurs.FindAsync(id);
            
            if (fournisseur == null)
                return NotFound(new { message = $"Fournisseur avec l'ID {id} non trouvé" });
            
            // Vérifier si le code est utilisé par un autre fournisseur
            if (fournisseurDto.Code != fournisseur.Code)
            {
                var codeExists = await _context.Fournisseurs
                    .AnyAsync(f => f.Code == fournisseurDto.Code && f.Id != id);
                if (codeExists)
                    return Conflict(new { message = "Un fournisseur avec ce code existe déjà." });
            }
            
            // Vérifier si l'email est utilisé par un autre fournisseur
            if (!string.IsNullOrEmpty(fournisseurDto.Email) && fournisseurDto.Email != fournisseur.Email)
            {
                var emailExists = await _context.Fournisseurs
                    .AnyAsync(f => f.Email == fournisseurDto.Email && f.Id != id);
                if (emailExists)
                    return Conflict(new { message = "Un fournisseur avec cet email existe déjà." });
            }
            
            try
            {
                // Mettre à jour les propriétés
                fournisseur.Code = fournisseurDto.Code;
                fournisseur.Nom = fournisseurDto.Nom;
                fournisseur.Email = fournisseurDto.Email;
                fournisseur.Telephone = fournisseurDto.Telephone;
                fournisseur.Adresse = fournisseurDto.Adresse;
                fournisseur.Ville = fournisseurDto.Ville;
                fournisseur.CodePostal = fournisseurDto.CodePostal;
                fournisseur.Pays = fournisseurDto.Pays;
                fournisseur.RemiseDefaut = fournisseurDto.RemiseDefaut;
                fournisseur.Statut = fournisseurDto.Statut;
                
                await _context.SaveChangesAsync();
                
                Log.Information("Fournisseur {Id} mis à jour avec succès", id);
                return Ok(new { message = "Fournisseur mis à jour avec succès", id = fournisseur.Id });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la mise à jour du fournisseur");
                return StatusCode(500, new { message = "Une erreur est survenue lors de la mise à jour du fournisseur." });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFournisseur(int id)
        {
            Log.Information("Suppression du fournisseur ID : {FournisseurId}", id);
            
            var fournisseur = await _context.Fournisseurs
                .Include(f => f.Produits)
                .FirstOrDefaultAsync(f => f.Id == id);
            
            if (fournisseur == null)
                return NotFound(new { message = $"Fournisseur avec l'ID {id} non trouvé" });
            
            // Vérifier si le fournisseur a des produits associés
            if (fournisseur.Produits.Any())
            {
                var nombreProduits = fournisseur.Produits.Count;
                Log.Warning("Impossible de supprimer le fournisseur {Id} : {NombreProduits} produits associés", id, nombreProduits);
                return BadRequest(new { 
                    message = $"Impossible de supprimer le fournisseur. {nombreProduits} produit(s) associé(s).",
                    nombreProduits = nombreProduits
                });
            }
            
            try
            {
                _context.Fournisseurs.Remove(fournisseur);
                await _context.SaveChangesAsync();
                
                Log.Information("Fournisseur {Id} supprimé avec succès", id);
                return Ok(new { message = $"Fournisseur {id} supprimé avec succès." });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Erreur lors de la suppression du fournisseur");
                return StatusCode(500, new { message = "Une erreur est survenue lors de la suppression du fournisseur." });
            }
        }

        [HttpPatch("{id}/statut")]
        public async Task<IActionResult> UpdateStatut(int id, [FromBody] string nouveauStatut)
        {
            Log.Information("Mise à jour du statut du fournisseur {Id} : {NouveauStatut}", id, nouveauStatut);
            
            var fournisseur = await _context.Fournisseurs.FindAsync(id);
            if (fournisseur == null)
                return NotFound(new { message = $"Fournisseur avec l'ID {id} non trouvé" });
            
            fournisseur.Statut = nouveauStatut;
            await _context.SaveChangesAsync();
            
            Log.Information("Statut du fournisseur {Id} mis à jour : {Statut}", id, nouveauStatut);
            return Ok(new { message = "Statut du fournisseur mis à jour", id = fournisseur.Id, statut = fournisseur.Statut });
        }

        #endregion
    }
}

