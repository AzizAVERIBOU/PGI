# PGI - Système de Gestion Intégré

Ce dépôt contient deux projets distincts pour un système de gestion intégré (PGI) pour Nordik Adventures :

- **BackendPGI** : API REST backend en .NET 8.0 avec Entity Framework Core et MySQL
- **mon-pgi** : Application frontend (interface utilisateur)

## Prérequis

### Pour le Backend
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) (version 8.0 ou supérieure)
- Un IDE compatible .NET (Visual Studio, Visual Studio Code, Rider, etc.)

### Pour le Frontend
- [Node.js](https://nodejs.org/) (version 18 ou supérieure)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

## Installation et Démarrage

### 1. Configuration de la Base de Données MySQL

1. **Installer MySQL Server** si ce n'est pas déjà fait

2. **Créer la base de données** :
   - Ouvrir MySQL Workbench ou un client MySQL
   - Exécuter le script SQL situé dans `BackendPGI/Database/script.sql`
   - Ou créer manuellement la base de données `BackendPGI`

3. **Configurer la chaîne de connexion** :
   - Ouvrir le fichier `BackendPGI/appsettings.json`
   - Modifier la chaîne de connexion selon votre configuration MySQL :
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=localhost;Database=BackendPGI;User=root;Password=VOTRE_MOT_DE_PASSE;Port=3306;"
   }
   ```

### 2. Démarrage du Backend (BackendPGI)

1. **Ouvrir un terminal** et naviguer vers le dossier BackendPGI :
   ```bash
   cd BackendPGI
   ```

2. **Restaurer les dépendances NuGet** :
   ```bash
   dotnet restore
   ```

3. **Lancer l'application** :
   ```bash
   dotnet run
   ```

   Ou avec Visual Studio :
   - Ouvrir `BackendPGI.sln`
   - Appuyer sur F5 ou cliquer sur "Démarrer"

4. **Vérifier que le backend fonctionne** :
   - L'API sera accessible sur `http://localhost:5000`
   - La documentation Swagger sera disponible sur `http://localhost:5000/swagger`
   - Les logs seront écrits dans le dossier `BackendPGI/logs/`

### 3. Démarrage du Frontend (mon-pgi)

1. **Ouvrir un nouveau terminal** et naviguer vers le dossier mon-pgi :
   ```bash
   cd mon-pgi
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```
   ou avec yarn :
   ```bash
   yarn install
   ```

3. **Lancer l'application de développement** :
   ```bash
   npm run dev
   ```
   ou avec yarn :
   ```bash
   yarn dev
   ```

4. **Accéder à l'application** :
   - L'application sera généralement accessible sur `http://localhost:3000` ou `http://localhost:5173` (selon la configuration)

## Structure du Projet

```
mon-pgi/
├── BackendPGI/              # Projet backend .NET
│   ├── Controllers/         # Contrôleurs API REST
│   ├── Models/             # Modèles de données et DTOs
│   ├── Data/               # DbContext et configuration EF Core
│   ├── Services/           # Services métier
│   ├── Database/           # Scripts SQL
│   ├── Properties/         # Configuration de lancement
│   └── appsettings.json    # Configuration de l'application
│
└── mon-pgi/                # Projet frontend
    ├── public/             # Fichiers statiques (images, etc.)
    └── src/                # Code source de l'application
```

## Configuration

### Backend

- **Port par défaut** : `5000`
- **Swagger UI** : Disponible en mode développement sur `/swagger`
- **CORS** : Configuré pour accepter toutes les origines en développement
- **Logs** : Écrits dans `BackendPGI/logs/log-YYYYMMDD.txt`

### Frontend

- **Port** : Vérifier dans la configuration du projet (généralement 3000 ou 5173)
- **API Backend** : L'URL de l'API backend doit être configurée dans les fichiers de configuration du frontend

## Test de l'Application

1. **Vérifier le backend** :
   - Ouvrir `http://localhost:5000/swagger` dans votre navigateur
   - Tester les endpoints disponibles

2. **Vérifier le frontend** :
   - Ouvrir l'URL du frontend dans votre navigateur
   - Vérifier que les appels API fonctionnent correctement

## Notes Importantes

- **Base de données** : Assurez-vous que MySQL est démarré avant de lancer le backend
- **Ports** : Si les ports par défaut sont occupés, modifiez-les dans les fichiers de configuration
- **CORS** : En production, configurez CORS pour n'autoriser que les origines spécifiques
- **Mots de passe** : Ne commitez jamais les mots de passe dans `appsettings.json`. Utilisez `appsettings.Development.json` pour le développement local (ce fichier est généralement ignoré par Git)

## Dépannage

### Le backend ne démarre pas
- Vérifier que MySQL est démarré
- Vérifier la chaîne de connexion dans `appsettings.json`
- Vérifier que la base de données `BackendPGI` existe
- Consulter les logs dans `BackendPGI/logs/`

### Le frontend ne se connecte pas au backend
- Vérifier que le backend est démarré
- Vérifier l'URL de l'API dans la configuration du frontend
- Vérifier les paramètres CORS dans le backend

### Erreurs de migration de base de données
- Exécuter manuellement le script SQL dans `BackendPGI/Database/script.sql`
- Vérifier que toutes les tables sont créées correctement

## Documentation Supplémentaire

- **Analyse des logiques métier** : Voir `BackendPGI/ANALYSE_LOGICS_METIER.md`
- **Rapport système de notifications** : Voir `BackendPGI/RAPPORT_SYSTEME_NOTIFICATIONS_PGI.txt`

## Contribution

Pour contribuer à ce projet :
1. Créer une branche pour votre fonctionnalité
2. Faire vos modifications
3. Créer une pull request

## Licence

[Spécifier la licence du projet]

