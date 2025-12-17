import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import GestionEmployes from '../components/GestionEmployes';
import './CompteEmploye.css';

function CompteEmploye({ onLogout }) {
  const [employe, setEmploye] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    poste: ''
  });
  const [ongletActif, setOngletActif] = useState('profil');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    chargerDonneesEmploye();
  }, []);

  const chargerDonneesEmploye = async () => {
    setIsLoading(true);
    console.log('=== CHARGEMENT DONNÉES EMPLOYÉ ===');
    
    try {
      // Charger depuis localStorage (données reçues lors de la connexion)
      const employeData = localStorage.getItem('employeConnecte');
      console.log('Données brutes localStorage:', employeData);
      
      if (employeData) {
        const employeObj = JSON.parse(employeData);
        console.log('Données employé parsées:', employeObj);
        console.log('Structure de l\'objet:', {
          id: employeObj.id,
          numeroEmploye: employeObj.numeroEmploye,
          nom: employeObj.nom,
          prenom: employeObj.prenom,
          email: employeObj.email,
          telephone: employeObj.telephone,
          poste: employeObj.poste,
          departement: employeObj.departement,
          departementNom: employeObj.departementNom,
          role: employeObj.role,
          roleNom: employeObj.roleNom,
          superieurId: employeObj.superieurId,
          superieurNom: employeObj.superieurNom,
          superieurNumero: employeObj.superieurNumero,
          superieur: employeObj.superieur,
          subordonnes: employeObj.subordonnes,
          nombreSubordonnes: employeObj.nombreSubordonnes,
          dateEmbauche: employeObj.dateEmbauche,
          estActif: employeObj.estActif
        });
        
        // Adapter le format des données si nécessaire
        // Si le supérieur est un objet, extraire les infos
        if (employeObj.superieur && !employeObj.superieurNom) {
          employeObj.superieurId = employeObj.superieur.id;
          employeObj.superieurNom = `${employeObj.superieur.prenom} ${employeObj.superieur.nom}`;
          employeObj.superieurNumero = employeObj.superieur.numeroEmploye;
          employeObj.superieurPoste = employeObj.superieur.poste;
          console.log('✓ Infos supérieur extraites de l\'objet superieur');
        }
        
        setEmploye(employeObj);
        setFormData({
          nom: employeObj.nom || '',
          prenom: employeObj.prenom || '',
          email: employeObj.email || '',
          telephone: employeObj.telephone || '',
          poste: employeObj.poste || ''
        });
        
        console.log('Employé défini avec succès');
      } else {
        // Rediriger vers la connexion si pas de données
        console.warn('❌ Aucune donnée d\'employé trouvée dans localStorage');
        window.location.href = '/connexion';
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de l\'employé:', error);
      console.error('Détails:', error.message);
    } finally {
      setIsLoading(false);
      console.log('=== FIN CHARGEMENT EMPLOYÉ ===');
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

  // Vérifier si l'employé est admin (seulement si employe existe)
  const isAdmin = employe ? (employe.role === 2 || employe.roleNom === 'Administrateur') : false;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Appel API pour mettre à jour l'employé
      const response = await fetch(`http://localhost:5000/api/ControllerEmploye/${employe.id}`, {
        method: 'PUT',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: employe.id,
          numeroEmploye: employe.numeroEmploye,
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          telephone: formData.telephone,
          poste: formData.poste,
          departement: employe.departement,
          motDePasse: employe.motDePasse || '',
          dateEmbauche: employe.dateEmbauche,
          estActif: employe.estActif
        })
      });

      if (response.ok) {
        const employeMisAJour = {
          ...employe,
          ...formData
        };
        
        setEmploye(employeMisAJour);
        localStorage.setItem('employeConnecte', JSON.stringify(employeMisAJour));
        setIsEditing(false);
        alert('Informations mises à jour avec succès !');
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour. Veuillez réessayer.');
    }
  };

  const annulerModification = () => {
    setFormData({
      nom: employe.nom,
      prenom: employe.prenom,
      email: employe.email,
      telephone: employe.telephone,
      poste: employe.poste
    });
    setIsEditing(false);
  };

  if (isLoading || !employe) {
    return (
      <div className="compte-employe-page">
        <div className="loading-message">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="compte-employe-page">
      {/* Header */}
      <div className="compte-header">
        <div className="compte-header-content">
          <div className="header-left">
            <Link to="/" className="home-button">
              ← Dashboard
            </Link>
          </div>
          <h1 className="compte-logo">🔰 PGI Nordik Adventures</h1>
          <button onClick={onLogout} className="logout-button">
            Déconnexion
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="compte-container">
        <div className="compte-sidebar">
          <div className="user-avatar employe">
            <span>👨‍💼</span>
          </div>
          <h2>{employe.prenom} {employe.nom}</h2>
          <p className="user-numero">#{employe.numeroEmploye}</p>
          <p className="user-email">{employe.email}</p>
          <div className="user-type-badge employe">
            <strong>{employe.roleNom || getRoleNom(employe.role)}</strong>
          </div>
          <div className="user-departement">
            {employe.departementNom || getDepartementNom(employe.departement)}
          </div>
          
          {/* Debug info */}
          <div className="debug-sidebar">
            <small>
              Debug Info:<br/>
              ID: {employe.id}<br/>
              Dept: {employe.departement}<br/>
              Role: {employe.role}<br/>
              SupérieurId: {employe.superieurId || 'NULL'}<br/>
              SupérieurNom: {employe.superieurNom || 'Non chargé'}
            </small>
          </div>
          
          <nav className="compte-nav">
            <button
              className={`nav-item ${ongletActif === 'profil' ? 'active' : ''}`}
              onClick={() => setOngletActif('profil')}
            >
              👤 Mon profil
            </button>
            <button
              className={`nav-item ${ongletActif === 'droits' ? 'active' : ''}`}
              onClick={() => setOngletActif('droits')}
            >
              ⚖️ Droits et permissions
            </button>
            <button
              className={`nav-item ${ongletActif === 'acces' ? 'active' : ''}`}
              onClick={() => setOngletActif('acces')}
            >
              🔑 Accès modules
            </button>
            {isAdmin && (
              <button
                className={`nav-item ${ongletActif === 'gestion' ? 'active' : ''}`}
                onClick={() => setOngletActif('gestion')}
              >
                👥 Gestion équipe
              </button>
            )}
            <button
              className={`nav-item ${ongletActif === 'securite' ? 'active' : ''}`}
              onClick={() => setOngletActif('securite')}
            >
              🔒 Sécurité
            </button>
          </nav>
        </div>

        <div className="compte-content">
          {/* Onglet Profil */}
          {ongletActif === 'profil' && (
            <div className="onglet-content">
              <div className="content-header">
                <h3>Informations de l'employé</h3>
                {!isEditing && (
                  <button onClick={() => setIsEditing(true)} className="btn-edit">
                    ✏️ Modifier
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="profil-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Prénom *</label>
                      <input
                        type="text"
                        name="prenom"
                        value={formData.prenom}
                        onChange={handleChange}
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
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Téléphone *</label>
                    <input
                      type="tel"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Poste *</label>
                    <input
                      type="text"
                      name="poste"
                      value={formData.poste}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-save">
                      Enregistrer
                    </button>
                    <button type="button" onClick={annulerModification} className="btn-cancel">
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profil-info">
                  <div className="info-row">
                    <span className="info-label">Numéro d'employé</span>
                    <span className="info-value">{employe.numeroEmploye}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Prénom</span>
                    <span className="info-value">{employe.prenom}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Nom</span>
                    <span className="info-value">{employe.nom}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Adresse courriel</span>
                    <span className="info-value">{employe.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Téléphone</span>
                    <span className="info-value">{employe.telephone || 'Non renseigné'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Poste</span>
                    <span className="info-value">{employe.poste}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Supérieur hiérarchique</span>
                    <span className="info-value">
                      {employe.superieurNom ? (
                        <span className="superieur-info">
                          👤 {employe.superieurNom}
                          {employe.superieurNumero && (
                            <span className="superieur-numero"> ({employe.superieurNumero})</span>
                          )}
                        </span>
                      ) : employe.superieurId ? (
                        <span className="superieur-info-debug">
                          ID Supérieur: {employe.superieurId} (nom non chargé)
                        </span>
                      ) : employe.role === 2 || employe.roleNom === 'Administrateur' ? (
                        <span className="no-superieur">Direction</span>
                      ) : (
                        <span className="no-superieur">Non assigné</span>
                      )}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Date d'embauche</span>
                    <span className="info-value">
                      {employe.dateEmbauche ? new Date(employe.dateEmbauche).toLocaleDateString('fr-CA') : 'Non disponible'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Statut du compte</span>
                    <span className="info-value">
                      {employe.estActif ? (
                        <span className="badge-actif">✓ Actif</span>
                      ) : (
                        <span className="badge-inactif">✗ Inactif</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Onglet Droits et permissions */}
          {ongletActif === 'droits' && (
            <div className="onglet-content">
              <div className="content-header">
                <h3>⚖️ Droits et permissions</h3>
              </div>

              <div className="droits-info-box">
                <p>
                  Vos droits et permissions sont définis selon votre <strong>rôle</strong> et votre <strong>département</strong>.
                </p>
              </div>

              {/* Résumé des droits */}
              <div className="droits-resume">
                <div className="droit-item">
                  <span className="droit-label">Rôle :</span>
                  <span className="droit-value">
                    {employe.roleNom || getRoleNom(employe.role)}
                  </span>
                </div>
                <div className="droit-item">
                  <span className="droit-label">Département :</span>
                  <span className="droit-value">
                    {employe.departementNom || getDepartementNom(employe.departement)}
                  </span>
                </div>
              </div>

              {/* Permissions par module */}
              <h4 className="section-title">📋 Permissions par module</h4>
              
              <div className="permissions-grid">
                {/* Dashboard */}
                <div className="permission-card">
                  <div className="permission-header">
                    <span className="permission-icon">📊</span>
                    <h5>Dashboard</h5>
                  </div>
                  <div className="permission-status granted">
                    ✓ Accès complet
                  </div>
                  <ul className="permission-list">
                    <li>Consultation des statistiques</li>
                    <li>Vue d'ensemble des modules</li>
                  </ul>
                </div>

                {/* Gestion des stocks */}
                {(employe.departement === 2 || employe.departement === 1 || isAdmin) && (
                  <div className="permission-card">
                    <div className="permission-header">
                      <span className="permission-icon">📦</span>
                      <h5>Gestion des stocks</h5>
                    </div>
                    <div className={`permission-status ${isAdmin ? 'granted' : 'limited'}`}>
                      {isAdmin ? '✓ Accès complet' : '⚡ Accès standard'}
                    </div>
                    <ul className="permission-list">
                      <li>Consultation des produits</li>
                      {(employe.departement === 2 || isAdmin) && (
                        <>
                          <li>Ajout de produits</li>
                          <li>Modification des produits</li>
                          {isAdmin && <li>Suppression de produits</li>}
                        </>
                      )}
                    </ul>
                  </div>
                )}

                {/* Gestion financière */}
                {(employe.departement === 3 || employe.departement === 1 || isAdmin) && (
                  <div className="permission-card">
                    <div className="permission-header">
                      <span className="permission-icon">💵</span>
                      <h5>Gestion financière</h5>
                    </div>
                    <div className={`permission-status ${isAdmin ? 'granted' : 'limited'}`}>
                      {isAdmin ? '✓ Accès complet' : '⚡ Accès standard'}
                    </div>
                    <ul className="permission-list">
                      <li>Consultation des factures</li>
                      {(employe.departement === 3 || isAdmin) && (
                        <>
                          <li>Création de factures</li>
                          <li>Modification des factures</li>
                          {isAdmin && <li>Suppression de factures</li>}
                        </>
                      )}
                    </ul>
                  </div>
                )}

                {/* CRM */}
                {(employe.departement === 1 || isAdmin) && (
                  <div className="permission-card">
                    <div className="permission-header">
                      <span className="permission-icon">👥</span>
                      <h5>CRM</h5>
                    </div>
                    <div className={`permission-status ${isAdmin ? 'granted' : 'limited'}`}>
                      {isAdmin ? '✓ Accès complet' : '⚡ Accès standard'}
                    </div>
                    <ul className="permission-list">
                      <li>Consultation des clients</li>
                      {(employe.departement === 1 || isAdmin) && (
                        <>
                          <li>Ajout de clients</li>
                          <li>Modification des clients</li>
                          {isAdmin && <li>Suppression de clients</li>}
                          <li>Historique des interactions</li>
                        </>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Permissions administratives */}
              {isAdmin && (
                <>
                  <h4 className="section-title">⭐ Permissions administratives</h4>
                  
                  <div className="admin-permissions">
                    <div className="admin-perm-item">
                      <span className="perm-icon">✓</span>
                      <div className="perm-content">
                        <strong>Gestion de l'équipe</strong>
                        <p>Ajouter des employés dans votre département</p>
                      </div>
                    </div>
                    <div className="admin-perm-item">
                      <span className="perm-icon">✓</span>
                      <div className="perm-content">
                        <strong>Modification des données</strong>
                        <p>Modifier et supprimer les données dans tous les modules</p>
                      </div>
                    </div>
                    <div className="admin-perm-item">
                      <span className="perm-icon">✓</span>
                      <div className="perm-content">
                        <strong>Rapports et statistiques</strong>
                        <p>Accès complet aux rapports et analyses</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Restrictions */}
              <div className="restrictions-section">
                <h4 className="section-title">🚫 Restrictions</h4>
                <ul className="restrictions-list">
                  {!isAdmin && (
                    <>
                      <li>Vous ne pouvez pas supprimer de données critiques</li>
                      <li>Accès limité aux modules de votre département</li>
                    </>
                  )}
                  <li>Les modifications sont enregistrées et tracées</li>
                  <li>Certaines actions nécessitent une validation du supérieur</li>
                </ul>
              </div>
            </div>
          )}

          {/* Onglet Accès modules */}
          {ongletActif === 'acces' && (
            <div className="onglet-content">
              <div className="content-header">
                <h3>Accès aux modules</h3>
              </div>

              <div className="acces-info">
                <p>Selon votre département, vous avez accès aux modules suivants :</p>
              </div>

              <div className="modules-acces-list">
                <div className="module-acces-card">
                  <div className="module-icon">📊</div>
                  <h4>Dashboard</h4>
                  <p>Vue d'ensemble du système</p>
                  <Link to="/" className="btn-acces">
                    Accéder
                  </Link>
                </div>

                {(employe.departement === 2 || employe.departement === 1) && (
                  <div className="module-acces-card">
                    <div className="module-icon">📦</div>
                    <h4>Gestion des stocks</h4>
                    <p>Gestion des produits et inventaire</p>
                    <Link to="/stocks" className="btn-acces">
                      Accéder
                    </Link>
                  </div>
                )}

                {(employe.departement === 3 || employe.departement === 1) && (
                  <div className="module-acces-card">
                    <div className="module-icon">💵</div>
                    <h4>Gestion financière</h4>
                    <p>Facturation et comptabilité</p>
                    <Link to="/finances" className="btn-acces">
                      Accéder
                    </Link>
                  </div>
                )}

                {employe.departement === 1 && (
                  <div className="module-acces-card">
                    <div className="module-icon">👥</div>
                    <h4>CRM</h4>
                    <p>Gestion de la relation client</p>
                    <Link to="/clients" className="btn-acces">
                      Accéder
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Onglet Gestion équipe (Admin uniquement) */}
          {ongletActif === 'gestion' && isAdmin && (
            <div className="onglet-content">
              <div className="content-header">
                <h3>Gestion de l'équipe - {getDepartementNom(employe.departement)}</h3>
              </div>

              <div className="gestion-info">
                <p>En tant qu'administrateur, vous pouvez ajouter de nouveaux employés dans votre département.</p>
                <p>Vous serez automatiquement défini comme leur supérieur hiérarchique.</p>
              </div>

              <GestionEmployes 
                employe={employe} 
                departement={employe.departement}
              />
            </div>
          )}

          {/* Onglet Sécurité */}
          {ongletActif === 'securite' && (
            <div className="onglet-content">
              <div className="content-header">
                <h3>Sécurité du compte</h3>
              </div>

              <div className="securite-section">
                <h4>Mot de passe</h4>
                <p>Protégez votre compte avec un mot de passe sécurisé</p>
                <button className="btn-modifier-mdp">
                  Modifier le mot de passe
                </button>
              </div>

              <div className="securite-section">
                <h4>Authentification à deux facteurs</h4>
                <p>Sécurité renforcée pour l'accès aux modules sensibles</p>
                <button className="btn-activer-2fa">
                  Activer l'authentification à deux facteurs
                </button>
              </div>

              <div className="securite-section">
                <h4>Sessions actives</h4>
                <p>Gérez vos sessions actives sur différents appareils</p>
                <button className="btn-voir-sessions">
                  Voir les sessions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompteEmploye;

