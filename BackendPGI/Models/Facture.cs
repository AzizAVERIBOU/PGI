using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackendPGI.Models
{
    public class Facture
    {
        [Key]
        public int Id { get; set; }

        [Required(ErrorMessage = "Le numéro de facture est obligatoire")]
        [StringLength(50, ErrorMessage = "Le numéro de facture ne peut pas dépasser 50 caractères")]
        public string NumeroFacture { get; set; } = string.Empty;

        [Required]
        public int CommandeId { get; set; }

        public int? LivreurId { get; set; } // Livreur qui a livré la commande

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le montant total doit être positif")]
        public decimal MontantTotal { get; set; }

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le montant des taxes doit être positif")]
        public decimal MontantTaxes { get; set; } = 0;

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le montant du transport doit être positif")]
        public decimal MontantTransport { get; set; } = 0;

        [StringLength(50, ErrorMessage = "Le statut ne peut pas dépasser 50 caractères")]
        public string Statut { get; set; } = "Non payée"; // Non payée, Payée, Partiellement payée, Annulée

        [StringLength(50, ErrorMessage = "Le mode de paiement ne peut pas dépasser 50 caractères")]
        public string? ModePaiement { get; set; } // Carte, Espèces, Chèque, Virement, etc.

        public DateTime DateFacture { get; set; } = DateTime.Now;

        public DateTime? DatePaiement { get; set; }

        public DateTime? DateLivraison { get; set; }

        [StringLength(500, ErrorMessage = "Les notes ne peuvent pas dépasser 500 caractères")]
        public string? Notes { get; set; }

        // Navigation properties
        [ForeignKey("CommandeId")]
        public Commande Commande { get; set; } = null!;

        [ForeignKey("LivreurId")]
        public Livreur? Livreur { get; set; }
    }
}

