import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({
    identifiant: '', // Email ou numéro d'employé
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Déterminer si c'est un email ou un numéro d'employé
      const contientArobase = credentials.identifiant.includes('@');
      
      let userType = 'client';
      let apiEndpoint = '';
      let loginData = {};
      
      if (!contientArobase) {
        // PAS d'@ → C'est un NUMÉRO D'EMPLOYÉ (ex: ADMIN002, EMP001, EMP-ST-1234, etc.)
        userType = 'employe';
        apiEndpoint = 'http://localhost:5000/api/ControllerEmploye/login';
        loginData = { 
          numeroEmploye: credentials.identifiant, 
          motDePasse: credentials.password 
        };
      } else {
        // Contient @ → C'est un EMAIL
        const isEmailEmploye = credentials.identifiant.includes('@nordikadventures.ca');
        
        if (isEmailEmploye) {
          // Email employé
          userType = 'employe';
          apiEndpoint = 'http://localhost:5000/api/ControllerEmploye/login';
          loginData = { 
            email: credentials.identifiant, 
            motDePasse: credentials.password 
          };
        } else {
          // Email client
          userType = 'client';
          apiEndpoint = 'http://localhost:5000/api/ControllerClient/login';
          loginData = { 
            email: credentials.identifiant, 
            motDePasse: credentials.password 
          };
        }
      }

      console.log('=== TENTATIVE DE CONNEXION ===');
      console.log('Type utilisateur:', userType);
      console.log('Endpoint:', apiEndpoint);
      console.log('Identifiant saisi:', credentials.identifiant);
      console.log('Données envoyées:', loginData);
      console.log('JSON envoyé:', JSON.stringify(loginData));

      // Appel API pour authentification
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      console.log('=== RÉPONSE API ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('=== RÉPONSE API COMPLÈTE ===');
        console.log('Objet complet:', result);
        console.log('JSON stringifié:', JSON.stringify(result, null, 2));
        
        // Extraire les données utilisateur selon le format de la réponse
        let userData;
        
        if (userType === 'employe') {
          // Pour employé : { success: true, employe: {...} }
          userData = result.employe || result;
          
          console.log('=== DONNÉES EMPLOYÉ EXTRAITES ===');
          console.log('userData complet:', userData);
          console.log('userData stringifié:', JSON.stringify(userData, null, 2));
          
          // Vérifier spécifiquement les champs du supérieur
          console.log('=== VÉRIFICATION SUPÉRIEUR ===');
          console.log('superieurId:', userData.superieurId);
          console.log('superieurNom:', userData.superieurNom);
          console.log('superieurNumero:', userData.superieurNumero);
          console.log('superieur (objet):', userData.superieur);
          console.log('Superieur (avec majuscule):', userData.Superieur);
          
          // Vérifier les employés gérés
          console.log('=== VÉRIFICATION EMPLOYÉS GÉRÉS ===');
          console.log('employes:', userData.employes);
          console.log('employesSubordonnes:', userData.employesSubordonnes);
          console.log('subordonnes:', userData.subordonnes);
          
          // Vérifier si le compte est actif (spécifique aux employés)
          if (userData.estActif === false) {
            throw new Error('Votre compte a été désactivé. Veuillez contacter un administrateur.');
          }
          
          console.log('=== SAUVEGARDE DANS LOCALSTORAGE ===');
          console.log('Données à sauvegarder:', userData);
          
          localStorage.setItem('employeConnecte', JSON.stringify(userData));
        } else {
          // Pour client : { success: true, client: {...} }
          userData = result.client || result;
          
          console.log('Client connecté:', {
            id: userData.id,
            nom: userData.nom,
            email: userData.email
          });
          
          localStorage.setItem('clientConnecte', JSON.stringify(userData));
        }
        
        // Connexion réussie
        onLogin(userType);
      } else {
        // Gérer les erreurs HTTP
        const errorData = await response.json().catch(() => ({}));
        
        console.log('=== ERREUR API ===');
        console.log('Status:', response.status);
        console.log('Données erreur complètes:', errorData);
        console.log('Type erreur:', errorData.type);
        console.log('Title:', errorData.title);
        console.log('Errors:', errorData.errors);
        
        // Message d'erreur détaillé
        let errorMessage = errorData.message || errorData.title;
        
        // Si c'est une erreur de validation (400), afficher les détails
        if (response.status === 400 && errorData.errors) {
          console.log('Erreurs de validation détaillées:', errorData.errors);
          const validationErrors = Object.entries(errorData.errors)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join(' | ');
          errorMessage = `Erreur de validation: ${validationErrors}`;
        } else if (!errorMessage) {
          errorMessage = response.status === 401 ? 'Identifiants incorrects' : 
                        `Erreur ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      
      // Afficher l'erreur à l'utilisateur
      if (error.message.includes('fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
        setError('Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur http://localhost:5000');
      } else if (error.message.includes('405')) {
        setError(
          'Erreur 405 : La route de connexion n\'est pas configurée correctement côté backend. ' +
          'Vérifiez que la méthode [HttpPost("login")] existe dans le controller. ' +
          'Consultez DEBUG_API_405.md pour plus de détails.'
        );
    } else {
        setError(error.message || 'Identifiants incorrects. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-back-home">
        <Link to="/" className="back-home-link">
          ← Retour à l'accueil
        </Link>
      </div>
      <div className="login-container">
        <div className="login-header">
          <h1>🔰 PGI Nordik Adventures</h1>
          <p>Système de gestion intégré</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="identifiant">Email ou Numéro d'employé</label>
            <input
              type="text"
              id="identifiant"
              value={credentials.identifiant}
              onChange={(e) => setCredentials({ ...credentials, identifiant: e.target.value })}
              placeholder="client@example.com ou ADMIN002"
              required
            />
            <small className="form-hint">
              <strong>Clients</strong> : votre email (ex: client@example.com)<br/>
              <strong>Employés</strong> : votre numéro d'employé (ex: ADMIN002, EMP001) ou email
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="login-footer">
          <div className="demo-accounts">
            <p><strong>Comptes de démonstration :</strong></p>
            <div className="demo-account-item">
              <p className="demo-type">👨‍💼 Employé (Admin) :</p>
              <p><strong>Numéro :</strong> ADMIN002 (ou admin@nordikadventures.ca)</p>
          <p><strong>Mot de passe :</strong> admin123</p>
            </div>
            <div className="demo-account-item">
              <p className="demo-type">👤 Client :</p>
              <p><strong>Email :</strong> client@example.com</p>
              <p><strong>Mot de passe :</strong> client123</p>
            </div>
          </div>
          <div className="login-footer-separator"></div>
          <p>Vous êtes un client et n'avez pas de compte ?</p>
          <Link to="/inscription" className="link-to-register">
            Créer un compte client
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;

