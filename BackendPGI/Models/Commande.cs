using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackendPGI.Models
{
    public class Commande
    {
        [Key]
        public int Id { get; set; }

        [Required(ErrorMessage = "Le numéro de commande est obligatoire")]
        [StringLength(50, ErrorMessage = "Le numéro de commande ne peut pas dépasser 50 caractères")]
        public string NumeroCommande { get; set; } = string.Empty;

        [Required]
        public int ClientId { get; set; }

        public int? EmployeId { get; set; } // Employé qui a pris la commande (optionnel)

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le montant total doit être positif")]
        public decimal MontantTotal { get; set; }

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le montant des taxes doit être positif")]
        public decimal MontantTaxes { get; set; } = 0;

        [StringLength(50, ErrorMessage = "Le statut ne peut pas dépasser 50 caractères")]
        public string Statut { get; set; } = "En attente"; // En attente, Confirmée, En préparation, Expédiée, Livrée, Annulée

        [StringLength(500, ErrorMessage = "Les notes ne peuvent pas dépasser 500 caractères")]
        public string? Notes { get; set; }

        public DateTime DateCommande { get; set; } = DateTime.Now;

        public DateTime? DateLivraisonPrevue { get; set; }

        public DateTime? DateLivraisonReelle { get; set; }

        // Navigation properties
        [ForeignKey("ClientId")]
        public Client Client { get; set; } = null!;

        [ForeignKey("EmployeId")]
        public Employe? Employe { get; set; }

        public Facture? Facture { get; set; }

        public ICollection<Panier> Paniers { get; set; } = new List<Panier>();
    }
}

