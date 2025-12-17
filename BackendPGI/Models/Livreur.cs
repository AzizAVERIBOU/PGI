using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackendPGI.Models
{
    public class Livreur
    {
        [Key]
        public int Id { get; set; }

        [Required(ErrorMessage = "Le numéro de livreur est obligatoire")]
        [StringLength(20, ErrorMessage = "Le numéro de livreur ne peut pas dépasser 20 caractères")]
        public string NumeroLivreur { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le nom est obligatoire")]
        [StringLength(100, ErrorMessage = "Le nom ne peut pas dépasser 100 caractères")]
        public string Nom { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le prénom est obligatoire")]
        [StringLength(100, ErrorMessage = "Le prénom ne peut pas dépasser 100 caractères")]
        public string Prenom { get; set; } = string.Empty;

        [StringLength(20, ErrorMessage = "Le téléphone ne peut pas dépasser 20 caractères")]
        public string? Telephone { get; set; }

        [StringLength(255, ErrorMessage = "L'email ne peut pas dépasser 255 caractères")]
        [EmailAddress(ErrorMessage = "L'email n'est pas valide")]
        public string? Email { get; set; }

        [StringLength(50, ErrorMessage = "Le type de véhicule ne peut pas dépasser 50 caractères")]
        public string? TypeVehicule { get; set; }

        [StringLength(20, ErrorMessage = "L'immatriculation ne peut pas dépasser 20 caractères")]
        public string? Immatriculation { get; set; }

        [StringLength(20, ErrorMessage = "Le statut ne peut pas dépasser 20 caractères")]
        public string Statut { get; set; } = "Disponible";

        public DateTime DateEmbauche { get; set; } = DateTime.Now;

        public bool EstActif { get; set; } = true;

        // Navigation properties
        public ICollection<Facture> Factures { get; set; } = new List<Facture>();
    }
}

