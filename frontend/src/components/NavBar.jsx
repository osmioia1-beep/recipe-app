import { useState, useContext } from 'react'
import { NavLink } from 'react-router-dom'
import { AuthContext } from '../App'
import './NavBar.css'

export default function NavBar() {
  const { user, signOut } = useContext(AuthContext)
  const [showMenu, setShowMenu] = useState(false)

  return (
    <nav className="navbar">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Home</span>
      </NavLink>
      <NavLink to="/recipes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">📖</span>
        <span className="nav-label">Receitas</span>
      </NavLink>
      <NavLink to="/pantry" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">🥫</span>
        <span className="nav-label">Despensa</span>
      </NavLink>
      <NavLink to="/mealplan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">📅</span>
        <span className="nav-label">Planeamento</span>
      </NavLink>
      {user && (
        <button className="nav-item nav-user-btn" onClick={() => setShowMenu(!showMenu)}>
          <span className="nav-icon">👤</span>
          <span className="nav-label">Conta</span>
        </button>
      )}
      {showMenu && user && (
        <div className="nav-menu">
          <div className="nav-menu-email">{user.email}</div>
          <button onClick={() => { signOut(); setShowMenu(false) }} className="nav-menu-item">
            Terminar sessão
          </button>
        </div>
      )}
    </nav>
  )
}
