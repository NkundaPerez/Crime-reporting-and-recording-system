// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // ADD "Reports" HERE
  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Cases', path: '/cases' },
    { label: 'Statements', path: '/statements' },
    { label: 'Evidence', path: '/evidence' },
    { label: 'Reports', path: '/reports' }, // NEW
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Logo */}
        <Link to="/dashboard" className={styles.logo}>
          CrimeGuard
        </Link>

        {/* Desktop Nav */}
        <ul className={styles.navList}>
          {navItems.map(item => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`${styles.navLink} ${isActive(item.path) ? styles.active : ''}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* User Info */}
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.name || 'Officer'}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className={styles.mobileToggle}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className={styles.mobileMenu}>
          <ul>
            {navItems.map(item => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`${styles.mobileLink} ${isActive(item.path) ? styles.active : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button onClick={handleLogout} className={styles.mobileLogout}>
                Logout
              </button>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;