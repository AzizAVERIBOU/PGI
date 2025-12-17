using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackendPGI.Models
{
    public class FicheDePaie
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int EmployeId { get; set; }

        [Required(ErrorMessage = "Le numéro de fiche de paie est obligatoire")]
        [StringLength(50, ErrorMessage = "Le numéro de fiche de paie ne peut pas dépasser 50 caractères")]
        public string NumeroFiche { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le salaire brut doit être positif")]
        public decimal SalaireBrut { get; set; }

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Les heures supplémentaires doivent être positives")]
        public decimal HeuresSupplementaires { get; set; } = 0;

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le montant des heures supplémentaires doit être positif")]
        public decimal MontantHeuresSupplementaires { get; set; } = 0;

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Les primes doivent être positives")]
        public decimal Primes { get; set; } = 0;

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Les déductions doivent être positives")]
        public decimal Deductions { get; set; } = 0;

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le salaire net doit être positif")]
        public decimal SalaireNet { get; set; }

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Les cotisations sociales doivent être positives")]
        public decimal CotisationsSociales { get; set; } = 0;

        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "L'impôt sur le revenu doit être positif")]
        public decimal ImpotRevenu { get; set; } = 0;

        [Required]
        [Column(TypeName = "DATE")]
        public DateTime PeriodeDebut { get; set; }

        [Required]
        [Column(TypeName = "DATE")]
        public DateTime PeriodeFin { get; set; }

        public DateTime DateEmission { get; set; } = DateTime.Now;

        [StringLength(500, ErrorMessage = "Les notes ne peuvent pas dépasser 500 caractères")]
        public string? Notes { get; set; }

        // Navigation properties
        [ForeignKey("EmployeId")]
        public Employe Employe { get; set; } = null!;
    }
}

