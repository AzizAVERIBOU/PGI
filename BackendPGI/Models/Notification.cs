using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackendPGI.Models
{
    /// <summary>
    /// Notification/Alerte pour informer les employés des changements dans le système
    /// </summary>
    public class Notification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int DepartementId { get; set; } // 1=ServiceClientele, 2=Stocks, 3=Finances

        [Required]
        [StringLength(100)]
        public string Type { get; set; } = string.Empty; // "NouvelleCommande", "StockFaible", "StockCritique", "NouvelleFacture", "CommandeAnnulee", etc.

        [Required]
        [StringLength(500)]
        public string Titre { get; set; } = string.Empty;

        [StringLength(2000)]
        public string? Message { get; set; }

        [StringLength(50)]
        public string? Priorite { get; set; } // "Info", "Warning", "Critical"

        [StringLength(100)]
        public string? LienAction { get; set; } // URL ou route pour accéder à l'élément concerné

        [StringLength(100)]
        public string? ReferenceId { get; set; } // ID de la commande, produit, facture, etc.

        public bool EstLue { get; set; } = false;

        public DateTime DateCreation { get; set; } = DateTime.Now;

        public DateTime? DateLecture { get; set; }

        // Données supplémentaires en JSON (optionnel)
        [Column(TypeName = "TEXT")]
        public string? DonneesSupplementaires { get; set; }
    }
}

