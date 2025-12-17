import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Inscription.css';

function Inscription({ onRegister }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }

    if (!formData.prenom.trim()) {
      newErrors.prenom = 'Le prénom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'adresse courriel est requise';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'L\'adresse courriel n\'est pas valide';
    }

    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Le téléphone est requis';
    } else if (!/^[\d\s\-\(\)]+$/.test(formData.telephone)) {
      newErrors.telephone = 'Le format du téléphone n\'est pas valide';
    }

    if (!formData.adresse.trim()) {
      newErrors.adresse = 'L\'adresse est requise';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Veuillez confirmer le mot de passe';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    if (validateForm()) {
      setIsLoading(true);
      
      try {
        // Préparer les données pour l'API
        // Combiner nom et prénom en un seul champ "nom"
        const nomComplet = `${formData.prenom} ${formData.nom}`.trim();
        
        const clientData = {
          id: 0,
          nom: nomComplet,
          email: formData.email,
          telephone: formData.telephone,
          adresse: formData.adresse,
          motDePasse: formData.password,
          dateCreation: new Date().toISOString()
        };

        // Appel API au backend
        const response = await fetch('http://localhost:5000/api/ControllerClient', {
          method: 'POST',
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(clientData)
        });

        if (!response.ok) {
          // Gérer les erreurs du serveur
          const errorData = await response.json().catch(() => ({ message: 'Erreur lors de l\'inscription' }));
          throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Sauvegarder le type d'utilisateur comme client
        localStorage.setItem('userType', 'client');
        
        // Succès
        if (onRegister) {
          onRegister(result);
        }
        
        alert('Inscription réussie ! Vous pouvez maintenant vous connecter en tant que client.');
        // Redirection vers la page de connexion
        navigate('/connexion');
        
      } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        setApiError(error.message || 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  return (
    <div className="inscription-page">
      <div className="inscription-back-home">
        <Link to="/" className="back-home-link">
          ← Retour à l'accueil
        </Link>
      </div>
      <div className="inscription-container">
        <div className="inscription-header">
          <h1>🔰 PGI Nordik Adventures</h1>
          <p>Créer un compte client</p>
        </div>

        <form className="inscription-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nom">Nom *</label>
              <input
                type="text"
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Dupont"
                required
              />
              {errors.nom && <span className="error-message">{errors.nom}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="prenom">Prénom *</label>
              <input
                type="text"
                id="prenom"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                placeholder="Marie"
                required
              />
              {errors.prenom && <span className="error-message">{errors.prenom}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Adresse courriel *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="marie.dupont@nordikadventures.ca"
              required
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="telephone">Téléphone *</label>
            <input
              type="tel"
              id="telephone"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              placeholder="418-555-1234"
              required
            />
            {errors.telephone && <span className="error-message">{errors.telephone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="adresse">Adresse *</label>
            <input
              type="text"
              id="adresse"
              name="adresse"
              value={formData.adresse}
              onChange={handleChange}
              placeholder="123 Rue Principale, Québec, QC"
              required
            />
            {errors.adresse && <span className="error-message">{errors.adresse}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmer le mot de passe *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          {apiError && (
            <div className="api-error-message">
              {apiError}
            </div>
          )}

          <button 
            type="submit" 
            className="inscription-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Inscription en cours...' : 'Créer mon compte'}
          </button>
        </form>

        <div className="inscription-footer">
          <div className="inscription-note">
            <p><strong>Note :</strong> Cette inscription est réservée aux clients.</p>
            <p>Les employés doivent contacter l'administration.</p>
          </div>
          <div className="inscription-footer-separator"></div>
          <p>Vous avez déjà un compte ?</p>
          <Link to="/connexion" className="link-to-login">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Inscription;

