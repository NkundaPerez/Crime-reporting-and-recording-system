// src/pages/Timeline.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from './Timeline.module.css';
import API from '../services/api';

const Timeline = () => {
  const { caseId } = useParams();

  const [caseData, setCaseData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ───── Fetch timeline ─────
  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await API.get(`/cases/${caseId}/timeline`);
        setCaseData(res.data.case);
        setTimeline(res.data.timeline);
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to load timeline');
      } finally {
        setLoading(false);
      }
    };

    if (caseId) {
      fetchTimeline();
    }
  }, [caseId]);

  // ───── RENDER ─────

  // Loading state
  if (loading) {
    return (
      <div className={styles.appWrapper}>
        <Navbar />
        <div className={styles.pageContent}>
          <div className={styles.loading}>Loading timeline...</div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.appWrapper}>
        <Navbar />
        <div className={styles.pageContent}>
          <div className={styles.error}>{error}</div>
        </div>
        <Footer />
      </div>
    );
  }

  // No data (should not happen)
  if (!caseData) return null;

  // Main UI
  return (
    <div className={styles.appWrapper}>
      <Navbar />
      <div className={styles.pageContent}>
        <div className={styles.container}>

          {/* Case Summary */}
          <div className={styles.caseInfo}>
            <p><strong>Type:</strong> {caseData.type}</p>
            <p>
              <strong>Status:</strong>{' '}
              <span className={`${styles.status} ${styles[caseData.status]}`}>
                {caseData.status.toUpperCase()}
              </span>
            </p>
            <p><strong>Reported:</strong> {new Date(caseData.createdAt).toLocaleString()}</p>
          </div>

          {/* Timeline Events */}
          <div className={styles.timeline}>
            {timeline.map((event, idx) => (
              <div key={idx} className={styles.event}>
                <div className={styles.connector}>
                  <div className={styles.dot} />
                  {idx < timeline.length - 1 && <div className={styles.line} />}
                </div>
                <div className={styles.content}>
                  <div className={styles.header}>
                    <span className={styles.title}>{event.title}</span>
                    <span className={styles.actor}>by {event.actor}</span>
                  </div>
                  <p className={styles.description}>{event.description}</p>
                  {event.link && (
                    <Link to={event.link} className={styles.link}>
                      View
                    </Link>
                  )}
                  <time className={styles.time}>
                    {new Date(event.timestamp).toLocaleString()}
                  </time>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Timeline;