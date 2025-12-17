using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BackendPGI.Models
{
    public class Produit
    {
        [Key]
        [Required(ErrorMessage = "Le SKU est obligatoire")]
        [StringLength(50, ErrorMessage = "Le SKU ne peut pas dépasser 50 caractères")]
        public string Sku { get; set; } = string.Empty;

        [Required(ErrorMessage = "La catégorie est obligatoire")]
        [StringLength(100, ErrorMessage = "La catégorie ne peut pas dépasser 100 caractères")]
        public string Categorie { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le nom du produit est obligatoire")]
        [StringLength(255, ErrorMessage = "Le nom du produit ne peut pas dépasser 255 caractères")]
        [Column("nom_produit")]
        public string NomProduit { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le coût d'achat est obligatoire")]
        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le coût d'achat doit être positif")]
        public decimal CoutAchat { get; set; }

        [Required(ErrorMessage = "Le prix de vente est obligatoire")]
        [Column(TypeName = "DECIMAL(10,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le prix de vente doit être positif")]
        public decimal PrixVente { get; set; }

        [Column(TypeName = "DECIMAL(10,4)")]
        [Range(0, 100, ErrorMessage = "La marge brute doit être entre 0 et 100%")]
        public decimal? MargeBrute { get; set; }

        [Column(TypeName = "INT")]
        [Range(0, int.MaxValue, ErrorMessage = "La quantité en stock ne peut pas être négative")]
        public int QuantiteStock { get; set; } = 0;

        [Column(TypeName = "INT")]
        [Range(0, int.MaxValue, ErrorMessage = "Le seuil de réapprovisionnement ne peut pas être négatif")]
        public int SeuilReappro { get; set; } = 0;

        [Column(TypeName = "INT")]
        [Range(0, int.MaxValue, ErrorMessage = "Le stock de sécurité ne peut pas être négatif")]
        public int StockSecurite { get; set; } = 0;

        [Column(TypeName = "INT")]
        [Range(0, int.MaxValue, ErrorMessage = "Le délai de livraison ne peut pas être négatif")]
        public int? DelaiLivraisonJours { get; set; }

        [StringLength(100, ErrorMessage = "Le nom du fournisseur ne peut pas dépasser 100 caractères")]
        public string? FournisseurNom { get; set; } // À garder pour compatibilité, sera remplacé par la relation

        [StringLength(50, ErrorMessage = "Le code fournisseur ne peut pas dépasser 50 caractères")]
        public string? FournisseurCode { get; set; } // À garder pour compatibilité, sera remplacé par la relation

        // Relations vers les nouvelles tables
        public int? FournisseurId { get; set; }
        public Fournisseur? Fournisseur { get; set; }

        public int? EntrepotId { get; set; }
        public Entrepot? Entrepot { get; set; }

        [Column(TypeName = "DECIMAL(5,2)")]
        [Range(0, 100, ErrorMessage = "La remise fournisseur doit être entre 0 et 100%")]
        public decimal? RemiseFournisseurPct { get; set; }

        [Column(TypeName = "DECIMAL(8,3)")]
        [Range(0, double.MaxValue, ErrorMessage = "Le poids doit être positif")]
        public decimal? PoidsKg { get; set; }

        [Column(TypeName = "DATE")]
        public DateTime? DateEntreeStock { get; set; }

        [StringLength(20, ErrorMessage = "L'emplacement entrepôt ne peut pas dépasser 20 caractères")]
        public string? EmplacementEntrepot { get; set; }

        [StringLength(20, ErrorMessage = "Le statut ne peut pas dépasser 20 caractères")]
        public string Statut { get; set; } = "Actif";
    }
}

