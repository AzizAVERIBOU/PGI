import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Inscription from './pages/Inscription';
import Vitrine from './pages/Vitrine';
import Panier from './pages/Panier';
import Paiement from './pages/Paiement';
import Confirmation from './pages/Confirmation';
import DetailsProduit from './pages/DetailsProduit';
import CompteClient from './pages/CompteClient';
import CompteEmploye from './pages/CompteEmploye';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import Finances from './pages/Finances';
import CRM from './pages/CRM';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null); // 'client' ou 'employe'

  const handleLogin = (type = 'employe') => {
    setIsAuthenticated(true);
    setUserType(type);
    localStorage.setItem('userType', type);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    localStorage.removeItem('userType');
    localStorage.removeItem('clientConnecte');
    localStorage.removeItem('employeConnecte');
    // Note: On ne vide pas le panier lors de la déconnexion
    // car l'utilisateur pourrait vouloir se reconnecter plus tard
    // Le panier sera automatiquement chargé avec la bonne clé lors de la reconnexion
  };

  const handleRegister = (userData) => {
    // Traitement de l'inscription (peut être connecté au backend)
    console.log('Nouvel utilisateur inscrit:', userData);
    // Après inscription, on peut rediriger vers la connexion ou connecter directement
    // Pour l'instant, on redirige vers la connexion
    alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
  };

  // Afficher les pages publiques (vitrine, panier, connexion, inscription)
  // La vitrine est accessible même connecté
  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<Vitrine isAuthenticated={isAuthenticated} />} />
          <Route path="/panier" element={<Panier />} />
          <Route path="/paiement" element={<Paiement />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/produit/:sku" element={<DetailsProduit isAuthenticated={isAuthenticated} />} />
          <Route path="/connexion" element={<Login onLogin={handleLogin} />} />
          <Route path="/inscription" element={<Inscription onRegister={handleRegister} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    );
  }

  // Si connecté, afficher l'application selon le type d'utilisateur
  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Routes communes */}
          <Route path="/vitrine" element={<Vitrine isAuthenticated={isAuthenticated} />} />
          <Route path="/panier" element={<Panier />} />
          <Route path="/paiement" element={<Paiement />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/produit/:sku" element={<DetailsProduit isAuthenticated={isAuthenticated} />} />
          
          {/* Routes selon le type d'utilisateur */}
          {userType === 'client' ? (
            <>
              <Route path="/" element={<Vitrine isAuthenticated={isAuthenticated} />} />
              <Route path="/compte" element={<CompteClient onLogout={handleLogout} />} />
              <Route path="*" element={<Navigate to="/vitrine" replace />} />
            </>
          ) : (
            <>
          <Route path="/" element={<Dashboard onLogout={handleLogout} />} />
              <Route path="/compte" element={<CompteEmploye onLogout={handleLogout} />} />
          <Route path="/stocks" element={<Stock onLogout={handleLogout} />} />
          <Route path="/finances" element={<Finances onLogout={handleLogout} />} />
          <Route path="/clients" element={<CRM onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
