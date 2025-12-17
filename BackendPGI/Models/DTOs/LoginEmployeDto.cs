using System.ComponentModel.DataAnnotations;

namespace BackendPGI.Models.DTOs
{
    public class LoginEmployeDto
    {
        [Required(ErrorMessage = "Le numéro d'employé est obligatoire")]
        public string NumeroEmploye { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le mot de passe est obligatoire")]
        public string MotDePasse { get; set; } = string.Empty;
    }
}

