using System.ComponentModel.DataAnnotations;

namespace BackendPGI.Models
{
    public class Employe
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Le numéro d'employé est obligatoire")]
        [StringLength(20, ErrorMessage = "Le numéro d'employé ne peut pas dépasser 20 caractères")]
        public string NumeroEmploye { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le nom est obligatoire")]
        [StringLength(100, ErrorMessage = "Le nom ne peut pas dépasser 100 caractères")]
        public string Nom { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le prénom est obligatoire")]
        [StringLength(100, ErrorMessage = "Le prénom ne peut pas dépasser 100 caractères")]
        public string Prenom { get; set; } = string.Empty;

        [StringLength(255, ErrorMessage = "L'email ne peut pas dépasser 255 caractères")]
        public string? Email { get; set; }

        [StringLength(20, ErrorMessage = "Le téléphone ne peut pas dépasser 20 caractères")]
        public string? Telephone { get; set; }

        [StringLength(100, ErrorMessage = "Le poste ne peut pas dépasser 100 caractères")]
        public string? Poste { get; set; }

        [Required(ErrorMessage = "Le département est obligatoire")]
        public Departement Departement { get; set; }

        [Required(ErrorMessage = "Le rôle est obligatoire")]
        public Role Role { get; set; } = Role.Employe;

        [Required(ErrorMessage = "Le mot de passe est obligatoire")]
        [StringLength(255, MinimumLength = 6, ErrorMessage = "Le mot de passe doit contenir entre 6 et 255 caractères")]
        public string MotDePasse { get; set; } = string.Empty;

        public DateTime DateEmbauche { get; set; } = DateTime.Now;
        
        public bool EstActif { get; set; } = true;

        // Relation auto-référentielle pour le supérieur hiérarchique
        public int? SuperieurId { get; set; }
        public Employe? Superieur { get; set; }
        
        // Liste des employés sous la responsabilité de cet employé
        public ICollection<Employe> Subordonnes { get; set; } = new List<Employe>();
    }
}

