import { NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar({ onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-header">
        <h1 className="navbar-logo">🔰 PGI Nordik Adventures</h1>
      </div>
      <div className="navbar-menu">
        <NavLink 
          to="/" 
          className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
          end
        >
          Accueil
        </NavLink>
        <NavLink 
          to="/stocks" 
          className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        >
          Stocks
        </NavLink>
        <NavLink 
          to="/finances" 
          className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        >
          Finances
        </NavLink>
        <NavLink 
          to="/clients" 
          className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        >
          Clients
        </NavLink>
        <button className="nav-link logout-btn" onClick={onLogout}>
          Déconnexion
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
