# PGI Nordik Adventures

Système de gestion intégré (PGI) pour une PME québécoise spécialisée dans la vente en ligne de produits pour les amateurs de plein air.

## Table des matières

- [Description](#description)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Lancement du projet](#lancement-du-projet)
- [Structure du projet](#structure-du-projet)
- [API Backend](#api-backend)
- [Comptes de test](#comptes-de-test)
- [Modules disponibles](#modules-disponibles)
- [Dépannage](#dépannage)
- [Documentation supplémentaire](#documentation-supplémentaire)

---

## Description

**PGI Nordik Adventures** est une application web React permettant de gérer :
- **Vitrine en ligne** : Interface de vente pour les clients
- **Gestion des stocks** : Suivi des produits et inventaire
- **Gestion financière** : Facturation et suivi des paiements
- **CRM** : Gestion de la relation client
- **Dashboard** : Vue d'ensemble des statistiques

---

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** (version 18 ou supérieure)
  - Vérifiez avec : `node --version`
- **npm** (généralement inclus avec Node.js)
  - Vérifiez avec : `npm --version`
- **Git** (pour cloner le dépôt)
- **Backend API** (ASP.NET Core) sur `http://localhost:5000`
  - **Important** : Le backend doit être démarré avant le frontend

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/AzizAVERIBOU/TP3.git
cd TP3
```

### 2. Installer les dépendances

```bash
npm install
```

Cette commande installera toutes les dépendances nécessaires listées dans `package.json` :
- React 18.2.0
- React Router DOM 6.22.0
- Vite 5.2.0
- ESLint (pour le linting)

---

## Configuration

### Port du serveur

Le frontend est configuré pour tourner sur le **port 5001** (défini dans `vite.config.js`).

### API Backend

Le projet est configuré pour communiquer avec une API backend sur :
- **URL** : `http://localhost:5000`
- **Endpoints principaux** :
  - `/api/ControllerClient` - Gestion des clients
  - `/api/ControllerEmploye` - Gestion des employés
  - `/api/ControllerCommande` - Gestion des commandes
  - `/api/ControllerFacture` - Gestion des factures
  - `/api/ControllerProduit` - Gestion des produits
  - `/api/ControllerFournisseur` - Gestion des fournisseurs

**Important** : Assurez-vous que le backend est démarré et accessible sur `http://localhost:5000` avant de lancer le frontend.

---

## Lancement du projet

### 1. Démarrer le backend API

Assurez-vous que votre backend ASP.NET Core est démarré et accessible sur `http://localhost:5000`.

### 2. Démarrer le serveur de développement

```bash
npm run dev
```

### 3. Accéder à l'application

Ouvrez votre navigateur et allez à :
```
http://localhost:5001
```

L'application devrait se charger automatiquement. Si le port 5001 est déjà utilisé, Vite vous proposera un autre port.

### 4. Commandes disponibles

```bash
# Démarrer le serveur de développement
npm run dev

# Construire pour la production
npm run build

# Prévisualiser la build de production
npm run preview

# Lancer le linter
npm run lint
```

---

## Structure du projet

```
mon-pgi/
├── public/
│   └── image/          # Images des produits
├── src/
│   ├── components/     # Composants réutilisables
│   │   ├── Navbar.jsx
│   │   └── GestionEmployes.jsx
│   ├── pages/         # Pages de l'application
│   │   ├── Vitrine.jsx
│   │   ├── Stock.jsx
│   │   ├── Finances.jsx
│   │   ├── CRM.jsx
│   │   ├── Login.jsx
│   │   ├── Panier.jsx
│   │   └── ...
│   ├── utils/         # Utilitaires
│   │   ├── crmUtils.js
│   │   └── panierUtils.js
│   ├── App.jsx        # Composant principal
│   └── main.jsx       # Point d'entrée
├── package.json       # Dépendances et scripts
├── vite.config.js     # Configuration Vite
└── README.md          # Ce fichier
```

---

## API Backend

### Endpoints utilisés

| Module | Endpoint | Méthode | Description |
|--------|----------|---------|-------------|
| **Clients** | `/api/ControllerClient` | GET | Liste des clients |
| | `/api/ControllerClient/login` | POST | Connexion client |
| **Employés** | `/api/ControllerEmploye/login` | POST | Connexion employé |
| **Commandes** | `/api/ControllerCommande` | GET | Liste des commandes |
| | `/api/ControllerCommande` | POST | Créer une commande |
| **Factures** | `/api/ControllerFacture` | GET | Liste des factures |
| **Produits** | `/api/ControllerProduit` | GET | Liste des produits |
| | `/api/ControllerProduit/{id}` | PUT | Mettre à jour un produit |
| **Fournisseurs** | `/api/ControllerFournisseur` | GET | Liste des fournisseurs |

### Format des données

Les réponses de l'API doivent être au format JSON. Le frontend gère automatiquement plusieurs variantes d'endpoints pour assurer la compatibilité.

---

## Comptes de test

### Notes sur la connexion

- Les **clients** se connectent avec leur **email**
- Les **employés** peuvent se connecter avec :
  - Leur **numéro d'employé** (ex: `EMP001`, `EMP-ST-1234`)

---

## Modules disponibles

### Vitrine en ligne
- Parcourir les produits disponibles
- Ajouter des articles au panier
- Passer des commandes
- Consulter l'historique d'achats

### Gestion des stocks
- Gérer l'inventaire des produits
- Suivre les quantités en stock
- Générer des rapports d'inventaire
- Recevoir des alertes de réapprovisionnement

### Gestion financière
- Créer et gérer les factures
- Suivre les paiements
- Consulter les statistiques financières
- Générer des rapports financiers

### CRM (Gestion de la relation client)
- Consulter la liste des clients
- Voir les statistiques par client
- Ajouter des commentaires sur les clients
- Filtrer et rechercher des clients

### Dashboard
- Vue d'ensemble des statistiques
- Accès rapide aux modules

---

## Dépannage

### Le serveur ne démarre pas

**Erreur** : `Port 5001 is already in use`

**Solution** :
1. Fermez l'application utilisant le port 5001
2. Ou modifiez le port dans `vite.config.js`

### L'API ne répond pas

**Erreur** : `Failed to fetch` ou `Network error`

**Solutions** :
1. Vérifiez que le backend est démarré sur `http://localhost:5000`
2. Vérifiez que CORS est configuré correctement sur le backend

### Les données ne s'affichent pas

**Problème** : Les listes sont vides ou affichent "00"

**Solutions** :
1. Vérifiez que le backend contient des données
2. Le système utilise `localStorage` comme fallback si l'API n'est pas disponible

### Erreurs de compilation

**Erreur** : `Cannot find module` ou erreurs de syntaxe

**Solutions** :
1. Supprimez `node_modules` et `package-lock.json`
2. Réinstallez les dépendances : `npm install`
3. Vérifiez que vous utilisez Node.js 18+

### Problèmes de connexion

**Problème** : Impossible de se connecter

**Solutions** :
1. Vérifiez que les comptes existent dans la base de données backend
2. Vérifiez le format de l'identifiant (email ou numéro d'employé)
3. Consultez `GUIDE_CONNEXION.md` pour les formats acceptés

---

## Technologies utilisées

- **React** 18.2.0 - Bibliothèque JavaScript pour les interfaces utilisateur
- **React Router DOM** 6.22.0 - Routage côté client
- **Vite** 5.2.0 - Outil de build et serveur de développement
- **ESLint** - Linter pour maintenir la qualité du code

---

## Auteur

**Aziz AVERIBOU** 
**Mor DIONGUE**
**Yasmina NANEMA**
**Mohamed OUATTARA**

---

## Licence

Ce projet est développé dans le cadre d'un cours universitaire.


