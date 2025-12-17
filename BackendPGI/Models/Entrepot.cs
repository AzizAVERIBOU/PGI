using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackendPGI.Models
{
    public class Entrepot
    {
        [Key]
        public int Id { get; set; }

        [Required(ErrorMessage = "Le code entrepôt est obligatoire")]
        [StringLength(20, ErrorMessage = "Le code entrepôt ne peut pas dépasser 20 caractères")]
        public string Code { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le nom de l'entrepôt est obligatoire")]
        [StringLength(100, ErrorMessage = "Le nom de l'entrepôt ne peut pas dépasser 100 caractères")]
        public string Nom { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "L'adresse ne peut pas dépasser 500 caractères")]
        public string? Adresse { get; set; }

        [StringLength(100, ErrorMessage = "La ville ne peut pas dépasser 100 caractères")]
        public string? Ville { get; set; }

        [StringLength(20, ErrorMessage = "Le code postal ne peut pas dépasser 20 caractères")]
        public string? CodePostal { get; set; }

        [StringLength(50, ErrorMessage = "Le pays ne peut pas dépasser 50 caractères")]
        public string? Pays { get; set; }

        [StringLength(20, ErrorMessage = "Le téléphone ne peut pas dépasser 20 caractères")]
        public string? Telephone { get; set; }

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "La capacité doit être positive")]
        public decimal? Capacite { get; set; }

        [StringLength(20, ErrorMessage = "Le statut ne peut pas dépasser 20 caractères")]
        public string Statut { get; set; } = "Actif";

        public DateTime DateCreation { get; set; } = DateTime.Now;

        // Navigation properties
        public ICollection<Produit> Produits { get; set; } = new List<Produit>();
    }
}

