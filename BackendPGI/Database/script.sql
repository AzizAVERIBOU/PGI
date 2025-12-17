-- ============================================================================
-- Script complet de création de la base de données BackendPGI
-- À exécuter dans MySQL Workbench
-- Ce script crée toutes les tables et leurs relations
-- ============================================================================

-- Supprimer la base de données si elle existe (optionnel - décommenter si nécessaire)
-- DROP DATABASE IF EXISTS BackendPGI;

-- Créer la base de données
CREATE DATABASE IF NOT EXISTS BackendPGI CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Utiliser la base de données
USE BackendPGI;

-- ============================================================================
-- TABLE 1: Clients
-- ============================================================================
CREATE TABLE IF NOT EXISTS Clients (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Nom VARCHAR(100) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Telephone VARCHAR(20) NULL,
    Adresse VARCHAR(500) NULL,
    MotDePasse VARCHAR(255) NOT NULL,
    DateCreation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (Email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 2: Employes
-- ============================================================================
CREATE TABLE IF NOT EXISTS Employes (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    NumeroEmploye VARCHAR(20) NOT NULL UNIQUE,
    Nom VARCHAR(100) NOT NULL,
    Prenom VARCHAR(100) NOT NULL,
    Email VARCHAR(255) NULL,
    Telephone VARCHAR(20) NULL,
    Poste VARCHAR(100) NULL,
    Departement INT NOT NULL COMMENT '1=ServiceClientele, 2=Stocks, 3=Finances',
    Role INT NOT NULL DEFAULT 1 COMMENT '1=Employe, 2=Admin',
    MotDePasse VARCHAR(255) NOT NULL,
    DateEmbauche DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    EstActif BOOLEAN NOT NULL DEFAULT TRUE,
    SuperieurId INT NULL,
    INDEX idx_numero_employe (NumeroEmploye),
    INDEX idx_email (Email),
    INDEX idx_departement (Departement),
    INDEX idx_superieur (SuperieurId),
    FOREIGN KEY (SuperieurId) REFERENCES Employes(Id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 3: Fournisseurs
-- ============================================================================
CREATE TABLE IF NOT EXISTS Fournisseurs (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Code VARCHAR(50) NOT NULL UNIQUE,
    Nom VARCHAR(100) NOT NULL,
    Email VARCHAR(255) NULL,
    Telephone VARCHAR(20) NULL,
    Adresse VARCHAR(500) NULL,
    Ville VARCHAR(100) NULL,
    CodePostal VARCHAR(20) NULL,
    Pays VARCHAR(50) NULL,
    RemiseDefaut DECIMAL(5, 2) NULL,
    Statut VARCHAR(20) DEFAULT 'Actif',
    DateCreation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (Code),
    INDEX idx_statut (Statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 4: Livreurs
-- ============================================================================
CREATE TABLE IF NOT EXISTS Livreurs (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    NumeroLivreur VARCHAR(20) NOT NULL UNIQUE,
    Nom VARCHAR(100) NOT NULL,
    Prenom VARCHAR(100) NOT NULL,
    Telephone VARCHAR(20) NULL,
    Email VARCHAR(255) NULL,
    TypeVehicule VARCHAR(50) NULL,
    Immatriculation VARCHAR(20) NULL,
    Statut VARCHAR(20) DEFAULT 'Disponible',
    DateEmbauche DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    EstActif BOOLEAN NOT NULL DEFAULT TRUE,
    INDEX idx_numero_livreur (NumeroLivreur),
    INDEX idx_statut (Statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 5: Entrepots
-- ============================================================================
CREATE TABLE IF NOT EXISTS Entrepots (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Code VARCHAR(20) NOT NULL UNIQUE,
    Nom VARCHAR(100) NOT NULL,
    Adresse VARCHAR(500) NULL,
    Ville VARCHAR(100) NULL,
    CodePostal VARCHAR(20) NULL,
    Pays VARCHAR(50) NULL,
    Telephone VARCHAR(20) NULL,
    Capacite DECIMAL(10, 2) NULL,
    Statut VARCHAR(20) DEFAULT 'Actif',
    DateCreation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (Code),
    INDEX idx_statut (Statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 6: Produits (dépend de Fournisseurs et Entrepots)
-- ============================================================================
CREATE TABLE IF NOT EXISTS produits (
    sku VARCHAR(50) PRIMARY KEY,
    categorie VARCHAR(100) NOT NULL,
    nom_produit VARCHAR(255) NOT NULL,
    cout_achat DECIMAL(10, 2) NOT NULL,
    prix_vente DECIMAL(10, 2) NOT NULL,
    marge_brute DECIMAL(10, 4) NULL COMMENT 'Exemple stocké: 0.5150 pour 51.5%',
    quantite_stock INT DEFAULT 0,
    seuil_reappro INT DEFAULT 0,
    stock_securite INT DEFAULT 0,
    delai_livraison_jours INT NULL,
    fournisseur_nom VARCHAR(100) NULL COMMENT 'Colonne de compatibilité - utilisée pour migration',
    fournisseur_code VARCHAR(50) NULL COMMENT 'Colonne de compatibilité - utilisée pour migration',
    remise_fournisseur_pct DECIMAL(5, 2) NULL COMMENT 'Exemple stocké: 5.00',
    poids_kg DECIMAL(8, 3) NULL,
    date_entree_stock DATE NULL,
    emplacement_entrepot VARCHAR(20) NULL,
    statut VARCHAR(20) DEFAULT 'Actif',
    -- Relations vers Fournisseurs et Entrepots
    FournisseurId INT NULL,
    EntrepotId INT NULL,
    INDEX idx_categorie (categorie),
    INDEX idx_statut (statut),
    INDEX idx_fournisseur_id (FournisseurId),
    INDEX idx_entrepot_id (EntrepotId),
    FOREIGN KEY (FournisseurId) REFERENCES Fournisseurs(Id) ON DELETE SET NULL,
    FOREIGN KEY (EntrepotId) REFERENCES Entrepots(Id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 7: Commandes (dépend de Clients et Employes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS Commandes (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    NumeroCommande VARCHAR(50) NOT NULL UNIQUE,
    ClientId INT NOT NULL,
    EmployeId INT NULL,
    MontantTotal DECIMAL(10, 2) NOT NULL,
    MontantTaxes DECIMAL(10, 2) DEFAULT 0,
    Statut VARCHAR(50) DEFAULT 'En attente',
    Notes VARCHAR(500) NULL,
    DateCommande DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    DateLivraisonPrevue DATETIME NULL,
    DateLivraisonReelle DATETIME NULL,
    INDEX idx_numero_commande (NumeroCommande),
    INDEX idx_client_id (ClientId),
    INDEX idx_employe_id (EmployeId),
    INDEX idx_statut (Statut),
    FOREIGN KEY (ClientId) REFERENCES Clients(Id) ON DELETE RESTRICT,
    FOREIGN KEY (EmployeId) REFERENCES Employes(Id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 8: Paniers (dépend de Commandes et Produits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS Paniers (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    CommandeId INT NOT NULL,
    ProduitSku VARCHAR(50) NOT NULL,
    Quantite INT NOT NULL,
    PrixUnitaire DECIMAL(10, 2) NOT NULL,
    Remise DECIMAL(5, 2) DEFAULT 0,
    SousTotal DECIMAL(10, 2) NOT NULL,
    INDEX idx_commande_id (CommandeId),
    INDEX idx_produit_sku (ProduitSku),
    FOREIGN KEY (CommandeId) REFERENCES Commandes(Id) ON DELETE CASCADE,
    FOREIGN KEY (ProduitSku) REFERENCES produits(sku) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 9: PaniersTemporaires (dépend de Clients et Produits)
-- Description: Panier temporaire lié à un client (avant la création de la commande)
-- ============================================================================
CREATE TABLE IF NOT EXISTS PaniersTemporaires (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    ClientId INT NOT NULL,
    ProduitSku VARCHAR(50) NOT NULL,
    Quantite INT NOT NULL CHECK (Quantite > 0),
    PrixUnitaire DECIMAL(10, 2) NOT NULL CHECK (PrixUnitaire >= 0),
    Remise DECIMAL(5, 2) DEFAULT 0 CHECK (Remise >= 0 AND Remise <= 100),
    DateAjout DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client_id (ClientId),
    INDEX idx_produit_sku (ProduitSku),
    INDEX idx_date_ajout (DateAjout),
    -- Index unique composite pour éviter les doublons (un client ne peut avoir qu'un seul panier temporaire par produit)
    UNIQUE KEY uk_client_produit (ClientId, ProduitSku),
    FOREIGN KEY (ClientId) REFERENCES Clients(Id) ON DELETE CASCADE,
    FOREIGN KEY (ProduitSku) REFERENCES produits(sku) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 10: Factures (dépend de Commandes et Livreurs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS Factures (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    NumeroFacture VARCHAR(50) NOT NULL UNIQUE,
    CommandeId INT NOT NULL UNIQUE,
    LivreurId INT NULL,
    MontantTotal DECIMAL(10, 2) NOT NULL,
    MontantTaxes DECIMAL(10, 2) DEFAULT 0,
    MontantTransport DECIMAL(10, 2) DEFAULT 0,
    Statut VARCHAR(50) DEFAULT 'Non payée',
    ModePaiement VARCHAR(50) NULL,
    DateFacture DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    DatePaiement DATETIME NULL,
    DateLivraison DATETIME NULL,
    Notes VARCHAR(500) NULL,
    INDEX idx_numero_facture (NumeroFacture),
    INDEX idx_commande_id (CommandeId),
    INDEX idx_livreur_id (LivreurId),
    FOREIGN KEY (CommandeId) REFERENCES Commandes(Id) ON DELETE CASCADE,
    FOREIGN KEY (LivreurId) REFERENCES Livreurs(Id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 11: Notifications (pour les alertes par département)
-- Description: Notifications/alertes pour informer les employés des changements dans le système
-- ============================================================================
CREATE TABLE IF NOT EXISTS Notifications (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    DepartementId INT NOT NULL COMMENT '1=ServiceClientele, 2=Stocks, 3=Finances',
    Type VARCHAR(100) NOT NULL COMMENT 'NouvelleCommande, StockFaible, StockCritique, NouvelleFacture, etc.',
    Titre VARCHAR(500) NOT NULL,
    Message VARCHAR(2000) NULL,
    Priorite VARCHAR(50) NULL COMMENT 'Info, Warning, Critical',
    LienAction VARCHAR(100) NULL,
    ReferenceId VARCHAR(100) NULL COMMENT 'ID de la commande, produit, facture, etc.',
    EstLue BOOLEAN NOT NULL DEFAULT FALSE,
    DateCreation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    DateLecture DATETIME NULL,
    DonneesSupplementaires TEXT NULL COMMENT 'Données JSON supplémentaires',
    INDEX idx_departement_id (DepartementId),
    INDEX idx_type (Type),
    INDEX idx_est_lue (EstLue),
    INDEX idx_date_creation (DateCreation),
    INDEX idx_departement_lue_date (DepartementId, EstLue, DateCreation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 12: FichesDePaie (dépend de Employes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS FichesDePaie (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    EmployeId INT NOT NULL,
    NumeroFiche VARCHAR(50) NOT NULL UNIQUE,
    SalaireBrut DECIMAL(10, 2) NOT NULL,
    HeuresSupplementaires DECIMAL(10, 2) DEFAULT 0,
    MontantHeuresSupplementaires DECIMAL(10, 2) DEFAULT 0,
    Primes DECIMAL(10, 2) DEFAULT 0,
    Deductions DECIMAL(10, 2) DEFAULT 0,
    SalaireNet DECIMAL(10, 2) NOT NULL,
    CotisationsSociales DECIMAL(10, 2) DEFAULT 0,
    ImpotRevenu DECIMAL(10, 2) DEFAULT 0,
    PeriodeDebut DATE NOT NULL,
    PeriodeFin DATE NOT NULL,
    DateEmission DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Notes VARCHAR(500) NULL,
    INDEX idx_numero_fiche (NumeroFiche),
    INDEX idx_employe_id (EmployeId),
    INDEX idx_periode (PeriodeDebut, PeriodeFin),
    FOREIGN KEY (EmployeId) REFERENCES Employes(Id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VÉRIFICATION DE LA STRUCTURE DES TABLES
-- ============================================================================
SELECT '=== STRUCTURE DES TABLES ===' AS '';
DESCRIBE Clients;
DESCRIBE Employes;
DESCRIBE produits;
DESCRIBE Fournisseurs;
DESCRIBE Livreurs;
DESCRIBE Entrepots;
DESCRIBE Commandes;
DESCRIBE Paniers;
DESCRIBE PaniersTemporaires;
DESCRIBE Factures;
DESCRIBE Notifications;
DESCRIBE FichesDePaie;

-- ============================================================================
-- RÉSUMÉ DES RELATIONS
-- ============================================================================
-- Clients (1) -> (N) Commandes
-- Clients (1) -> (N) PaniersTemporaires
-- Employes (1) -> (N) Commandes (optionnel)
-- Employes (1) -> (N) FichesDePaie
-- Employes (1) -> (N) Employes (SuperieurId - auto-référence)
-- Fournisseurs (1) -> (N) Produits
-- Entrepots (1) -> (N) Produits
-- Commandes (1) -> (N) Paniers
-- Commandes (1) -> (1) Factures
-- Produits (1) -> (N) Paniers
-- Produits (1) -> (N) PaniersTemporaires
-- Livreurs (1) -> (N) Factures (optionnel)
-- ============================================================================

-- ============================================================================
-- PROCHAINES ÉTAPES
-- ============================================================================
-- 1. Importer les produits depuis l'Excel via l'API :
--    POST /api/ControllerProduit/import-excel
-- 2. Exécuter migrate_fournisseurs.sql pour créer les fournisseurs 
--    et lier les produits via FournisseurId
-- ============================================================================
