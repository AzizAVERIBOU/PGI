using System.ComponentModel.DataAnnotations;

namespace BackendPGI.Models.DTOs
{
    public class LoginClientDto
    {
        [Required(ErrorMessage = "L'email est obligatoire")]
        [EmailAddress(ErrorMessage = "L'email n'est pas valide")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le mot de passe est obligatoire")]
        public string MotDePasse { get; set; } = string.Empty;
    }
}

