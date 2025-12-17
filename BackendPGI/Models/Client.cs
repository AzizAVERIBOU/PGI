using System.ComponentModel.DataAnnotations;

namespace BackendPGI.Models
{
    public class Client
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Le nom est obligatoire")]
        [StringLength(100, ErrorMessage = "Le nom ne peut pas dépasser 100 caractères")]
        public string Nom { get; set; } = string.Empty;

        [Required(ErrorMessage = "L'email est obligatoire")]
        [EmailAddress(ErrorMessage = "L'email n'est pas valide")]
        [StringLength(255, ErrorMessage = "L'email ne peut pas dépasser 255 caractères")]
        [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", 
            ErrorMessage = "L'email doit être au format conventionnel (exemple@domaine.com)")]
        public string Email { get; set; } = string.Empty;

        [StringLength(20, ErrorMessage = "Le téléphone ne peut pas dépasser 20 caractères")]
        public string? Telephone { get; set; }

        [StringLength(500, ErrorMessage = "L'adresse ne peut pas dépasser 500 caractères")]
        public string? Adresse { get; set; }

        [Required(ErrorMessage = "Le mot de passe est obligatoire")]
        [StringLength(255, MinimumLength = 6, ErrorMessage = "Le mot de passe doit contenir entre 6 et 255 caractères")]
        public string MotDePasse { get; set; } = string.Empty;

        public DateTime DateCreation { get; set; } = DateTime.Now;
    }
}

