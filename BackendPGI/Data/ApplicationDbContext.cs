using Microsoft.EntityFrameworkCore;
using BackendPGI.Models;

namespace BackendPGI.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Client> Clients { get; set; }
        public DbSet<Employe> Employes { get; set; }
        public DbSet<Produit> Produits { get; set; }
        public DbSet<Fournisseur> Fournisseurs { get; set; }
        public DbSet<Livreur> Livreurs { get; set; }
        public DbSet<Entrepot> Entrepots { get; set; }
        public DbSet<Commande> Commandes { get; set; }
        public DbSet<Panier> Paniers { get; set; }
        public DbSet<PanierTemporaire> PaniersTemporaires { get; set; }
        public DbSet<Facture> Factures { get; set; }
        public DbSet<FicheDePaie> FichesDePaie { get; set; }
        public DbSet<Notification> Notifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuration du modèle Client
            modelBuilder.Entity<Client>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Nom).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Telephone).HasMaxLength(20);
                entity.Property(e => e.Adresse).HasMaxLength(500);
                entity.Property(e => e.MotDePasse).IsRequired().HasMaxLength(255);
                entity.Property(e => e.DateCreation).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // Configuration du modèle Employe
            modelBuilder.Entity<Employe>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.NumeroEmploye).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Nom).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Prenom).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Email).HasMaxLength(255);
                entity.Property(e => e.Telephone).HasMaxLength(20);
                entity.Property(e => e.Poste).HasMaxLength(100);
                entity.Property(e => e.Departement)
                    .IsRequired()
                    .HasConversion<int>(); // Stocké comme INT dans la base de données
                entity.Property(e => e.Role)
                    .IsRequired()
                    .HasConversion<int>()
                    .HasDefaultValue(Role.Employe); // Par défaut, un employé
                entity.Property(e => e.MotDePasse).IsRequired().HasMaxLength(255);
                entity.Property(e => e.DateEmbauche).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.EstActif).HasDefaultValue(true);
                
                // Index unique sur le numéro d'employé
                entity.HasIndex(e => e.NumeroEmploye).IsUnique();
                // Index sur l'email
                entity.HasIndex(e => e.Email);
                
                // Relation auto-référentielle pour le supérieur hiérarchique
                entity.HasOne(e => e.Superieur)
                    .WithMany(e => e.Subordonnes)
                    .HasForeignKey(e => e.SuperieurId)
                    .OnDelete(DeleteBehavior.SetNull); // Si le supérieur est supprimé, mettre NULL
            });

            // Configuration du modèle Produit
            modelBuilder.Entity<Produit>(entity =>
            {
                entity.HasKey(e => e.Sku);
                entity.ToTable("produits"); // Nom de la table en minuscules
                
                entity.Property(e => e.Sku)
                    .IsRequired()
                    .HasMaxLength(50)
                    .HasColumnName("sku");
                
                entity.Property(e => e.Categorie)
                    .IsRequired()
                    .HasMaxLength(100)
                    .HasColumnName("categorie");
                
                entity.Property(e => e.NomProduit)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("nom_produit");
                
                entity.Property(e => e.CoutAchat)
                    .IsRequired()
                    .HasColumnType("DECIMAL(10,2)")
                    .HasColumnName("cout_achat");
                
                entity.Property(e => e.PrixVente)
                    .IsRequired()
                    .HasColumnType("DECIMAL(10,2)")
                    .HasColumnName("prix_vente");
                
                entity.Property(e => e.MargeBrute)
                    .HasColumnType("DECIMAL(10,4)")
                    .HasColumnName("marge_brute");
                
                entity.Property(e => e.QuantiteStock)
                    .HasDefaultValue(0)
                    .HasColumnName("quantite_stock");
                
                entity.Property(e => e.SeuilReappro)
                    .HasDefaultValue(0)
                    .HasColumnName("seuil_reappro");
                
                entity.Property(e => e.StockSecurite)
                    .HasDefaultValue(0)
                    .HasColumnName("stock_securite");
                
                entity.Property(e => e.DelaiLivraisonJours)
                    .HasColumnName("delai_livraison_jours");
                
                entity.Property(e => e.FournisseurNom)
                    .HasMaxLength(100)
                    .HasColumnName("fournisseur_nom");
                
                entity.Property(e => e.FournisseurCode)
                    .HasMaxLength(50)
                    .HasColumnName("fournisseur_code");
                
                entity.Property(e => e.RemiseFournisseurPct)
                    .HasColumnType("DECIMAL(5,2)")
                    .HasColumnName("remise_fournisseur_pct");
                
                entity.Property(e => e.PoidsKg)
                    .HasColumnType("DECIMAL(8,3)")
                    .HasColumnName("poids_kg");
                
                entity.Property(e => e.DateEntreeStock)
                    .HasColumnType("DATE")
                    .HasColumnName("date_entree_stock");
                
                entity.Property(e => e.EmplacementEntrepot)
                    .HasMaxLength(20)
                    .HasColumnName("emplacement_entrepot");
                
                entity.Property(e => e.Statut)
                    .HasMaxLength(20)
                    .HasDefaultValue("Actif")
                    .HasColumnName("statut");
                
                // Index sur la catégorie pour améliorer les performances
                entity.HasIndex(e => e.Categorie);
                entity.HasIndex(e => e.Statut);
                
                // Relations vers Fournisseur et Entrepot
                entity.HasOne(p => p.Fournisseur)
                    .WithMany(f => f.Produits)
                    .HasForeignKey(p => p.FournisseurId)
                    .OnDelete(DeleteBehavior.SetNull);
                
                entity.HasOne(p => p.Entrepot)
                    .WithMany(e => e.Produits)
                    .HasForeignKey(p => p.EntrepotId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Configuration du modèle Fournisseur
            modelBuilder.Entity<Fournisseur>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Nom).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Email).HasMaxLength(255);
                entity.Property(e => e.Telephone).HasMaxLength(20);
                entity.Property(e => e.Adresse).HasMaxLength(500);
                entity.Property(e => e.Ville).HasMaxLength(100);
                entity.Property(e => e.CodePostal).HasMaxLength(20);
                entity.Property(e => e.Pays).HasMaxLength(50);
                entity.Property(e => e.RemiseDefaut).HasColumnType("DECIMAL(5,2)");
                entity.Property(e => e.Statut).HasMaxLength(20).HasDefaultValue("Actif");
                entity.Property(e => e.DateCreation).HasDefaultValueSql("CURRENT_TIMESTAMP");
                
                entity.HasIndex(e => e.Code).IsUnique();
            });

            // Configuration du modèle Livreur
            modelBuilder.Entity<Livreur>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.NumeroLivreur).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Nom).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Prenom).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Telephone).HasMaxLength(20);
                entity.Property(e => e.Email).HasMaxLength(255);
                entity.Property(e => e.TypeVehicule).HasMaxLength(50);
                entity.Property(e => e.Immatriculation).HasMaxLength(20);
                entity.Property(e => e.Statut).HasMaxLength(20).HasDefaultValue("Disponible");
                entity.Property(e => e.DateEmbauche).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.EstActif).HasDefaultValue(true);
                
                entity.HasIndex(e => e.NumeroLivreur).IsUnique();
            });

            // Configuration du modèle Entrepot
            modelBuilder.Entity<Entrepot>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Nom).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Adresse).HasMaxLength(500);
                entity.Property(e => e.Ville).HasMaxLength(100);
                entity.Property(e => e.CodePostal).HasMaxLength(20);
                entity.Property(e => e.Pays).HasMaxLength(50);
                entity.Property(e => e.Telephone).HasMaxLength(20);
                entity.Property(e => e.Capacite).HasColumnType("DECIMAL(10,2)");
                entity.Property(e => e.Statut).HasMaxLength(20).HasDefaultValue("Actif");
                entity.Property(e => e.DateCreation).HasDefaultValueSql("CURRENT_TIMESTAMP");
                
                entity.HasIndex(e => e.Code).IsUnique();
            });

            // Configuration du modèle Commande
            modelBuilder.Entity<Commande>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.NumeroCommande).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ClientId).IsRequired();
                entity.Property(e => e.MontantTotal).IsRequired().HasColumnType("DECIMAL(10,2)");
                entity.Property(e => e.MontantTaxes).HasColumnType("DECIMAL(10,2)").HasDefaultValue(0);
                entity.Property(e => e.Statut).HasMaxLength(50).HasDefaultValue("En attente");
                entity.Property(e => e.Notes).HasMaxLength(500);
                entity.Property(e => e.DateCommande).HasDefaultValueSql("CURRENT_TIMESTAMP");
                
                entity.HasIndex(e => e.NumeroCommande).IsUnique();
                entity.HasIndex(e => e.ClientId);
                entity.HasIndex(e => e.EmployeId);
                
                // Relations
                entity.HasOne(c => c.Client)
                    .WithMany()
                    .HasForeignKey(c => c.ClientId)
                    .OnDelete(DeleteBehavior.Restrict);
                
                entity.HasOne(c => c.Employe)
                    .WithMany()
                    .HasForeignKey(c => c.EmployeId)
                    .OnDelete(DeleteBehavior.SetNull);
                
                entity.HasOne(c => c.Facture)
                    .WithOne(f => f.Commande)
                    .HasForeignKey<Facture>(f => f.CommandeId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configuration du modèle Panier
            modelBuilder.Entity<Panier>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CommandeId).IsRequired();
                entity.Property(e => e.ProduitSku).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Quantite).IsRequired();
                entity.Property(e => e.PrixUnitaire).IsRequired().HasColumnType("DECIMAL(10,2)");
                entity.Property(e => e.Remise).HasColumnType("DECIMAL(5,2)").HasDefaultValue(0);
                entity.Property(e => e.SousTotal).IsRequired().HasColumnType("DECIMAL(10,2)");
                
                entity.HasIndex(e => e.CommandeId);
                entity.HasIndex(e => e.ProduitSku);
                
                // Relations
                entity.HasOne(p => p.Commande)
                    .WithMany(c => c.Paniers)
                    .HasForeignKey(p => p.CommandeId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(p => p.Produit)
                    .WithMany()
                    .HasForeignKey(p => p.ProduitSku)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configuration du modèle PanierTemporaire
            modelBuilder.Entity<PanierTemporaire>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ClientId).IsRequired();
                entity.Property(e => e.ProduitSku).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Quantite).IsRequired();
                entity.Property(e => e.PrixUnitaire).IsRequired().HasColumnType("DECIMAL(10,2)");
                entity.Property(e => e.Remise).HasColumnType("DECIMAL(5,2)").HasDefaultValue(0);
                entity.Property(e => e.DateAjout).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");
                
                entity.HasIndex(e => e.ClientId);
                entity.HasIndex(e => e.ProduitSku);
                // Index composite pour éviter les doublons (un client ne peut avoir qu'un seul panier temporaire par produit)
                entity.HasIndex(e => new { e.ClientId, e.ProduitSku }).IsUnique();
                
                // Relations
                entity.HasOne(pt => pt.Client)
                    .WithMany()
                    .HasForeignKey(pt => pt.ClientId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(pt => pt.Produit)
                    .WithMany()
                    .HasForeignKey(pt => pt.ProduitSku)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configuration du modèle Notification
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.DepartementId).IsRequired();
                entity.Property(e => e.Type).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Titre).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Message).HasMaxLength(2000);
                entity.Property(e => e.Priorite).HasMaxLength(50);
                entity.Property(e => e.LienAction).HasMaxLength(100);
                entity.Property(e => e.ReferenceId).HasMaxLength(100);
                entity.Property(e => e.EstLue).HasDefaultValue(false);
                entity.Property(e => e.DateCreation).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");
                
                entity.HasIndex(e => e.DepartementId);
                entity.HasIndex(e => e.Type);
                entity.HasIndex(e => e.EstLue);
                entity.HasIndex(e => e.DateCreation);
                entity.HasIndex(e => new { e.DepartementId, e.EstLue, e.DateCreation });
            });

            // Configuration du modèle Facture
            modelBuilder.Entity<Facture>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.NumeroFacture).IsRequired().HasMaxLength(50);
                entity.Property(e => e.CommandeId).IsRequired();
                entity.Property(e => e.MontantTotal).IsRequired().HasColumnType("DECIMAL(10,2)");
                entity.Property(e => e.MontantTaxes).HasColumnType("DECIMAL(10,2)").HasDefaultValue(0);
                entity.Property(e => e.MontantTransport).HasColumnType("DECIMAL(10,2)").HasDefaultValue(0);
                entity.Property(e => e.Statut).HasMaxLength(50).HasDefaultValue("Non payée");
                entity.Property(e => e.ModePaiement).HasMaxLength(50);
                entity.Property(e => e.DateFacture).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.Notes).HasMaxLength(500);
                
                entity.HasIndex(e => e.NumeroFacture).IsUnique();
                entity.HasIndex(e => e.CommandeId).IsUnique(); // Une commande = une facture
                entity.HasIndex(e => e.LivreurId);
                
                // Relations
                entity.HasOne(f => f.Commande)
                    .WithOne(c => c.Facture)
                    .HasForeignKey<Facture>(f => f.CommandeId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasOne(f => f.Livreur)
                    .WithMany(l => l.Factures)
                    .HasForeignKey(f => f.LivreurId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Configuration du modèle FicheDePaie
            modelBuilder.Entity<FicheDePaie>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EmployeId).IsRequired();
                entity.Property(e => e.NumeroFiche).IsRequired().HasMaxLength(50);
                entity.Property(e => e.SalaireBrut).IsRequired().HasColumnType("DECIMAL(10,2)");
                entity.Property(e => e.HeuresSupplementaires).HasColumnType("DECIMAL(10,2)").HasDefaultValue(0);
                entity.Property(e => e.MontantHeuresSupplementaires).HasColumnType("DECIMAL(10,2)").HasDefaultValue(0);
                entity.Property(e => e.Primes).HasColumnType("DECIMAL(10,2)").HasDefaultValue(0);
                entity.Property(e => e.Deductions).HasColumnType("DECIMAL(10,2)").HasDefaultValue(0);
                entity.Property(e => e.SalaireNet).IsRequired().HasColumnType("DECIMAL(10,2)");
                entity.Property(e => e.CotisationsSociales).HasColumnType("DECIMAL(10,2)").HasDefaultValue(0);
                entity.Property(e => e.ImpotRevenu).HasColumnType("DECIMAL(10,2)").HasDefaultValue(0);
                entity.Property(e => e.PeriodeDebut).IsRequired().HasColumnType("DATE");
                entity.Property(e => e.PeriodeFin).IsRequired().HasColumnType("DATE");
                entity.Property(e => e.DateEmission).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.Notes).HasMaxLength(500);
                
                entity.HasIndex(e => e.NumeroFiche).IsUnique();
                entity.HasIndex(e => e.EmployeId);
                
                // Relation
                entity.HasOne(f => f.Employe)
                    .WithMany()
                    .HasForeignKey(f => f.EmployeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}

