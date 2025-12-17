using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackendPGI.Models
{
    public class Panier
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int CommandeId { get; set; }

        [Required]
        [StringLength(50)]
        public string ProduitSku { get; set; } = string.Empty;

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "La quantité doit être au moins 1")]
        public int Quantite { get; set; }

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le prix unitaire doit être positif")]
        public decimal PrixUnitaire { get; set; } // Prix au moment de la commande

        [Column(TypeName = "DECIMAL(5,2)")]
        [Range(0, 100, ErrorMessage = "La remise doit être entre 0 et 100%")]
        public decimal Remise { get; set; } = 0;

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le sous-total doit être positif")]
        public decimal SousTotal { get; set; } // Quantite * PrixUnitaire * (1 - Remise/100)

        // Navigation properties
        [ForeignKey("CommandeId")]
        public Commande Commande { get; set; } = null!;

        [ForeignKey("ProduitSku")]
        public Produit Produit { get; set; } = null!;
    }
}

