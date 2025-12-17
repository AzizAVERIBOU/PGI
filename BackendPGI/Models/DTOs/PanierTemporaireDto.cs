using System.ComponentModel.DataAnnotations;

namespace BackendPGI.Models.DTOs
{
    /// <summary>
    /// DTO pour ajouter ou mettre à jour un article dans le panier temporaire
    /// </summary>
    public class AddPanierTemporaireDto : IValidatableObject
    {
        [Required(ErrorMessage = "Le SKU du produit est obligatoire")]
        [StringLength(50, ErrorMessage = "Le SKU ne peut pas dépasser 50 caractères")]
        public string ProduitSku { get; set; } = string.Empty;

        [Required(ErrorMessage = "La quantité est obligatoire")]
        [Range(1, int.MaxValue, ErrorMessage = "La quantité doit être au moins 1")]
        public int Quantite { get; set; }

        [Range(0, 100, ErrorMessage = "La remise doit être entre 0 et 100%")]
        public decimal Remise { get; set; } = 0;

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (Quantite <= 0)
            {
                yield return new ValidationResult(
                    "La quantité doit être supérieure à 0",
                    new[] { nameof(Quantite) });
            }
        }
    }

    /// <summary>
    /// DTO pour la réponse du panier temporaire
    /// </summary>
    public class PanierTemporaireResponseDto
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        public string ProduitSku { get; set; } = string.Empty;
        public string NomProduit { get; set; } = string.Empty;
        public int Quantite { get; set; }
        public decimal PrixUnitaire { get; set; }
        public decimal Remise { get; set; }
        public decimal SousTotal { get; set; } // Quantite * PrixUnitaire * (1 - Remise/100)
        public DateTime DateAjout { get; set; }
    }

    /// <summary>
    /// DTO pour la réponse complète du panier d'un client
    /// </summary>
    public class PanierClientResponseDto
    {
        public int ClientId { get; set; }
        public string ClientNom { get; set; } = string.Empty;
        public List<PanierTemporaireResponseDto> Articles { get; set; } = new();
        public decimal MontantTotal { get; set; }
        public int NombreArticles { get; set; }
    }
}

