using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace BackendPGI.Models.DTOs
{
    public class CreateCommandeDto
    {
        // Ignorer les champs supplémentaires envoyés par le frontend (id, dateCommande, etc.)
        [JsonIgnore]
        public int Id { get; set; }

        [Required(ErrorMessage = "Le numéro de commande est obligatoire")]
        [StringLength(50, ErrorMessage = "Le numéro de commande ne peut pas dépasser 50 caractères")]
        public string NumeroCommande { get; set; } = string.Empty;

        [Required(ErrorMessage = "L'ID du client est obligatoire")]
        public int ClientId { get; set; }

        public int? EmployeId { get; set; }

        [Required(ErrorMessage = "Le montant total est obligatoire")]
        [Range(0, double.MaxValue, ErrorMessage = "Le montant total doit être positif")]
        public decimal MontantTotal { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Le montant des taxes doit être positif")]
        public decimal MontantTaxes { get; set; } = 0;

        [StringLength(50, ErrorMessage = "Le statut ne peut pas dépasser 50 caractères")]
        public string Statut { get; set; } = "En attente";

        [StringLength(500, ErrorMessage = "Les notes ne peuvent pas dépasser 500 caractères")]
        public string? Notes { get; set; }

        public DateTime? DateLivraisonPrevue { get; set; }

        // Ignorer les champs supplémentaires
        [JsonIgnore]
        public DateTime? DateCommande { get; set; }

        [JsonIgnore]
        public DateTime? DateLivraisonReelle { get; set; }

        // Paniers peut être null temporairement pour le debug, mais sera vérifié manuellement
        public List<CreatePanierDto>? Paniers { get; set; }
    }

    public class CreatePanierDto : IValidatableObject
    {
        // Accepter soit produitSku soit nomProduit (pour compatibilité avec le frontend)
        [StringLength(50, ErrorMessage = "Le SKU ne peut pas dépasser 50 caractères")]
        public string? ProduitSku { get; set; }

        [StringLength(255, ErrorMessage = "Le nom du produit ne peut pas dépasser 255 caractères")]
        public string? NomProduit { get; set; }

        [Required(ErrorMessage = "La quantité est obligatoire")]
        [Range(1, int.MaxValue, ErrorMessage = "La quantité doit être au moins 1")]
        public int Quantite { get; set; }

        [Required(ErrorMessage = "Le prix unitaire est obligatoire")]
        [Range(0, double.MaxValue, ErrorMessage = "Le prix unitaire doit être positif")]
        public decimal PrixUnitaire { get; set; }

        [Range(0, 100, ErrorMessage = "La remise doit être entre 0 et 100%")]
        public decimal Remise { get; set; } = 0;

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            // Au moins un des deux (ProduitSku ou NomProduit) doit être fourni
            if (string.IsNullOrWhiteSpace(ProduitSku) && string.IsNullOrWhiteSpace(NomProduit))
            {
                yield return new ValidationResult(
                    "Soit le SKU du produit (produitSku) soit le nom du produit (nomProduit) doit être fourni.",
                    new[] { nameof(ProduitSku), nameof(NomProduit) });
            }
        }
    }
}

