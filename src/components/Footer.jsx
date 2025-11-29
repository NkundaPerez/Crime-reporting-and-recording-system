import React from 'react';
import styles from './Footer.module.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.left}>
          <p>&copy; {currentYear} <strong>CrimeGuard</strong> – Uganda Police Force</p>
          <p className={styles.tagline}>Secure. Transparent. Accountable.</p>
        </div>

        <div className={styles.center}>
          <p>
            <strong>Current Time (EAT):</strong>{' '}
            {new Date().toLocaleString('en-UG', {
              timeZone: 'Africa/Kampala',
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </p>
        </div>

        <div className={styles.right}>
          <a href="/privacy" className={styles.link}>Privacy Policy</a>
          <span className={styles.separator}>|</span>
          <a href="/terms" className={styles.link}>Terms of Use</a>
          <span className={styles.separator}>|</span>
          <a href="/contact" className={styles.link}>Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;