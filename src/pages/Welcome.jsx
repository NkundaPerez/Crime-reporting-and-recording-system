// src/pages/Welcome.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import styles from './Welcome.module.css';

const Welcome = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const endpoint = isSignup ? '/auth/signup' : '/auth/login';
    const payload = isSignup
      ? { name, email, password } // ← role omitted → defaults to 'officer' on backend
      : { email, password };

    try {
      const res = await API.post(endpoint, payload);

      if (isSignup) {
        setSuccess('Sign up successful! Please log in.');
        setName('');
        setEmail('');
        setPassword('');
        setIsSignup(false);
      } else {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Crime Management System</h1>
        <p className={styles.subtitle}>Uganda Police Force – Secure. Transparent. Accountable.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* NAME (Signup only) */}
          {isSignup && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={styles.input}
            />
          )}

          {/* EMAIL */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />

          {/* PASSWORD */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />

          {/* SUBMIT */}
          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        {/* SUCCESS */}
        {success && <p className={styles.success}>{success}</p>}

        {/* ERROR */}
        {error && <p className={styles.error}>{error}</p>}

        {/* TOGGLE */}
        <p className={styles.toggle} onClick={() => setIsSignup(!isSignup)}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <span className={styles.link}>
            {isSignup ? 'Log In' : 'Sign Up'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Welcome;