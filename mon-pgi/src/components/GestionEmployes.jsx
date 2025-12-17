import { useState, useEffect } from 'react';
import './GestionEmployes.css';

function GestionEmployes({ employe, departement }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [employes, setEmployes] = useState([]);
  const [isLoadingEmployes, setIsLoadingEmployes] = useState(true);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    poste: '',
    motDePasse: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Charger les employés dont je suis le supérieur
  useEffect(() => {
    // Vérifier d'abord si les employés sont déjà dans les données
    if (employe.subordonnes && Array.isArray(employe.subordonnes)) {
      console.log('✓ Employés déjà chargés depuis le login:', employe.subordonnes);
      setEmployes(employe.subordonnes);
      setIsLoadingEmployes(false);
    } else {
      // Sinon, charger depuis l'API
      chargerMesEmployes();
    }
  }, [employe]);

  const chargerMesEmployes = async () => {
    setIsLoadingEmployes(true);
    console.log('=== CHARGEMENT DES EMPLOYÉS ===');
    console.log('ID du supérieur (admin connecté):', employe.id);
    
    try {
      const apiUrl = `http://localhost:5000/api/ControllerEmploye/superieur/${employe.id}`;
      console.log('URL API:', apiUrl);
      
      // Appel API pour récupérer les employés avec SuperieurId = employe.id
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        }
      });

      console.log('Statut réponse:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Données reçues de l\'API:', data);
        console.log('Type de données:', typeof data, Array.isArray(data));
        
        // Extraire les employés selon le format de réponse
        let employesArray = [];
        if (Array.isArray(data)) {
          employesArray = data;
        } else if (data.employes && Array.isArray(data.employes)) {
          employesArray = data.employes;
        } else if (data.success && data.employes) {
          employesArray = data.employes;
        }
        
        console.log('Nombre d\'employés trouvés:', employesArray.length);
        console.log('Employés:', employesArray);
        
        setEmployes(employesArray);
      } else {
        console.warn('Réponse API non OK. Status:', response.status);
        const errorText = await response.text();
        console.log('Erreur API:', errorText);
        setEmployes([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des employés:', error);
      console.error('Détails erreur:', error.message);
      setEmployes([]);
    } finally {
      setIsLoadingEmployes(false);
      console.log('=== FIN CHARGEMENT ===');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const genererNumeroEmploye = () => {
    // Générer un numéro d'employé unique
    const prefix = departement === 1 ? 'SC' : departement === 2 ? 'ST' : 'FI';
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `EMP-${prefix}-${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const nouvelEmploye = {
        id: 0,
        numeroEmploye: genererNumeroEmploye(),
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone || null,
        poste: formData.poste,
        departement: departement,
        role: 1, // Employé par défaut
        motDePasse: formData.motDePasse,
        dateEmbauche: new Date().toISOString(),
        estActif: true,
        superieurId: employe.id // ID du supérieur (l'admin qui l'ajoute)
      };

      console.log('Données employé à envoyer:', nouvelEmploye);

      // Appel API pour créer l'employé
      const response = await fetch('http://localhost:5000/api/ControllerEmploye', {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nouvelEmploye)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Employé ajouté avec succès:', result);
        
        alert(
          `✓ Employé ajouté avec succès !\n\n` +
          `Nom: ${formData.prenom} ${formData.nom}\n` +
          `Numéro: ${nouvelEmploye.numeroEmploye}\n` +
          `Supérieur: ${employe.prenom} ${employe.nom} (${employe.numeroEmploye})`
        );
        
        setShowAddForm(false);
        setFormData({
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          poste: '',
          motDePasse: ''
        });
        
        // Recharger la liste des employés
        chargerMesEmployes();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur API:', errorData);
        
        // Afficher les erreurs de validation si disponibles
        if (errorData.errors) {
          const validationErrors = Object.entries(errorData.errors)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('\n');
          throw new Error(`Erreur de validation:\n${validationErrors}`);
        }
        
        throw new Error(errorData.message || errorData.title || 'Erreur lors de l\'ajout de l\'employé');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError(error.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDepartementNom = (dept) => {
    switch (dept) {
      case 1: return 'Service Clientèle';
      case 2: return 'Stocks';
      case 3: return 'Finances';
      default: return 'Non défini';
    }
  };

  const getRoleNom = (role) => {
    switch (role) {
      case 1: return 'Employé';
      case 2: return 'Administrateur';
      default: return 'Non défini';
    }
  };

  const toggleStatutEmploye = async (employeId, estActif) => {
    if (window.confirm(`Voulez-vous ${estActif ? 'désactiver' : 'activer'} cet employé ?`)) {
      try {
        // Appel API pour changer le statut
        const response = await fetch(
          `http://localhost:5000/api/ControllerEmploye/${employeId}/statut`,
          {
            method: 'PUT',
            headers: {
              'accept': '*/*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estActif: !estActif })
          }
        );

        if (response.ok) {
          alert('Statut modifié avec succès');
          chargerMesEmployes();
        } else {
          alert('Erreur lors de la modification du statut');
        }
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la modification du statut');
      }
    }
  };

  return (
    <div className="gestion-employes">
      <div className="gestion-header">
        <div className="gestion-header-left">
          <h4>Mon équipe ({employes.length} employé{employes.length > 1 ? 's' : ''})</h4>
        </div>
        <button 
          onClick={() => setShowAddForm(true)} 
          className="btn-ajouter-employe"
        >
          ➕ Ajouter un employé
        </button>
      </div>

      {/* Debug info */}
      <div className="debug-info">
        <small>
          Debug: SuperieurId = {employe.id} | Employés chargés: {employes.length} | Loading: {isLoadingEmployes ? 'Oui' : 'Non'}
        </small>
      </div>

      {/* Liste des employés */}
      {isLoadingEmployes ? (
        <div className="loading-employes">
          <p>Chargement de l'équipe...</p>
        </div>
      ) : employes.length > 0 ? (
        <div className="employes-list">
          <table className="employes-table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Nom complet</th>
                <th>Poste</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Date d'embauche</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employes.map(emp => (
                <tr key={emp.id} className={!emp.estActif ? 'employe-inactif' : ''}>
                  <td className="numero-cell">{emp.numeroEmploye}</td>
                  <td className="nom-cell">
                    <strong>{emp.prenom} {emp.nom}</strong>
                  </td>
                  <td>{emp.poste || '—'}</td>
                  <td className="email-cell">{emp.email || '—'}</td>
                  <td className="phone-cell">{emp.telephone || '—'}</td>
                  <td>
                    <span className={`role-badge ${emp.role === 2 ? 'admin' : 'employe'}`}>
                      {getRoleNom(emp.role)}
                    </span>
                  </td>
                  <td className="date-cell">
                    {emp.dateEmbauche ? new Date(emp.dateEmbauche).toLocaleDateString('fr-CA') : '—'}
                  </td>
                  <td>
                    <span className={`statut-badge ${emp.estActif ? 'actif' : 'inactif'}`}>
                      {emp.estActif ? '✓ Actif' : '✗ Inactif'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleStatutEmploye(emp.id, emp.estActif)}
                      className={`btn-toggle-statut ${emp.estActif ? 'desactiver' : 'activer'}`}
                      title={emp.estActif ? 'Désactiver' : 'Activer'}
                    >
                      {emp.estActif ? '⏸️' : '▶️'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-employes">
          <p>Vous n'avez pas encore ajouté d'employés dans votre équipe.</p>
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Ajouter un nouvel employé</h2>
            <p className="modal-subtitle">
              Département : <strong>{getDepartementNom(departement)}</strong>
            </p>
            <p className="modal-info">
              Vous serez automatiquement défini comme supérieur hiérarchique.
            </p>

            <form onSubmit={handleSubmit} className="employe-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Prénom *</label>
                  <input
                    type="text"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    placeholder="Jean"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    placeholder="Tremblay"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Adresse courriel *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="prenom.nom@nordikadventures.ca"
                  required
                />
                <small className="form-hint">
                  Doit être une adresse @nordikadventures.ca
                </small>
              </div>

              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  placeholder="418-555-1234"
                />
              </div>

              <div className="form-group">
                <label>Poste *</label>
                <input
                  type="text"
                  name="poste"
                  value={formData.poste}
                  onChange={handleChange}
                  placeholder="Ex: Assistant gestionnaire"
                  required
                />
              </div>

              <div className="form-group">
                <label>Mot de passe temporaire *</label>
                <input
                  type="password"
                  name="motDePasse"
                  value={formData.motDePasse}
                  onChange={handleChange}
                  placeholder="Minimum 8 caractères"
                  minLength="8"
                  required
                />
                <small className="form-hint">
                  L'employé devra changer ce mot de passe à sa première connexion
                </small>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-save"
                  disabled={isLoading}
                >
                  {isLoading ? 'Ajout en cours...' : 'Ajouter l\'employé'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)} 
                  className="btn-cancel"
                  disabled={isLoading}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="employes-info">
        <h4>Informations</h4>
        <ul>
          <li>Les employés ajoutés auront le rôle "Employé" par défaut</li>
          <li>Ils auront accès uniquement au département : <strong>{getDepartementNom(departement)}</strong></li>
          <li>Vous serez leur supérieur hiérarchique direct</li>
          <li>Ils devront changer leur mot de passe à la première connexion</li>
        </ul>
      </div>
    </div>
  );
}

export default GestionEmployes;

