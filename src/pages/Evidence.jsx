// src/pages/Evidence.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import styles from './Evidence.module.css';
import API from '../services/api';

const Evidence = () => {
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('case');         // optional
  const statementId = searchParams.get('statement'); // optional

  const [evidence, setEvidence] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // ───── Debounce search ─────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, current: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // ───── Fetch evidence (global or filtered) ─────
  const fetchEvidence = useCallback(async () => {
    try {
      const params = {
        search: debouncedSearch,
        page: pagination.current,
        limit: 12,
        ...(caseId && { case: caseId }),
        ...(statementId && { statement: statementId }),
      };

      const res = await API.get('/evidence', { params });
      setEvidence(res.data.evidence);
      setPagination(res.data.pagination);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to load evidence');
    }
  }, [caseId, statementId, debouncedSearch, pagination.current]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  // ───── Upload handler (global or linked to case/statement) ─────
  const handleUpload = async () => {
    const file = fileInputRef.current?.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (caseId) formData.append('caseId', caseId);
    if (statementId) formData.append('statementId', statementId);
    if (description) formData.append('description', description);

    try {
      const res = await API.post('/evidence/upload', formData);
      setEvidence((prev) => [res.data, ...prev]);
      setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
      fileInputRef.current.value = '';
      setDescription('');
    } catch (err) {
      alert(err.response?.data?.msg || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ───── Delete evidence ─────
  const deleteEvidence = async (id) => {
    if (!window.confirm('Delete this evidence?')) return;

    try {
      await API.delete(`/evidence/${id}`);
      setEvidence((prev) => prev.filter((e) => e._id !== id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
    } catch (err) {
      alert(err.response?.data?.msg || 'Delete failed');
    }
  };

  // ───── File URL ─────
  const getFileUrl = (filename) =>
    `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/${filename}`;

  // ───── RENDER ─────
  return (
    <div className={styles.appWrapper}>
      <Navbar />
      <div className={styles.pageContent}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h2>
              {caseId ? (
                <>
                  Evidence for Case{' '}
                  <Link to={`/cases?case=${caseId}`} className={styles.caseLink}>
                    {caseId.slice(-6).toUpperCase()}
                  </Link>
                </>
              ) : (
                'All Evidence'
              )}
            </h2>
          </div>

          {/* ── Upload Card ── */}
          <div className={styles.uploadCard}>
            <h3>Upload New Evidence</h3>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              className={styles.fileInput}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.descInput}
            />
            <button
              onClick={handleUpload}
              disabled={uploading || !fileInputRef.current?.files[0]}
              className={styles.uploadBtn}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>

          {/* ── Search Bar ── */}
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search by name, description, or case ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            {debouncedSearch && (
              <button
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                }}
                className={styles.clearBtn}
              >
                x
              </button>
            )}
          </div>

          {/* ── Results Info ── */}
          <div className={styles.resultsInfo}>
            Showing {evidence.length} of {pagination.total} items
          </div>

          {/* ── Evidence Grid ── */}
          <div className={styles.grid}>
            {evidence.length === 0 ? (
              <p className={styles.noData}>
                {debouncedSearch
                  ? 'No evidence matches your search.'
                  : 'No evidence uploaded yet.'}
              </p>
            ) : (
              evidence.map((e) => (
                <div key={e._id} className={styles.mediaCard}>
                  {e.mimetype.startsWith('image/') ? (
                    <img
                      src={getFileUrl(e.filename)}
                      alt={e.originalName}
                      className={styles.media}
                    />
                  ) : e.mimetype.startsWith('video/') ? (
                    <video controls className={styles.media}>
                      <source src={getFileUrl(e.filename)} type={e.mimetype} />
                    </video>
                  ) : e.mimetype.startsWith('audio/') ? (
                    <audio controls className={styles.media}>
                      <source src={getFileUrl(e.filename)} type={e.mimetype} />
                    </audio>
                  ) : (
                    <div className={styles.unknown}>
                      <a
                        href={getFileUrl(e.filename)}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.fileLink}
                      >
                        {e.originalName}
                      </a>
                    </div>
                  )}

                  <div className={styles.info}>
                    <strong>{e.originalName}</strong>
                    <small>
                      {(e.size / 1024).toFixed(1)} KB •{' '}
                      {new Date(e.createdAt).toLocaleDateString()}
                    </small>
                    {e.description && <p className={styles.desc}>{e.description}</p>}
                    <small>
                      By: {e.uploadedBy?.name || 'Unknown'}
                      {e.case && (
                        <>
                          {' '}
                          | Case:{' '}
                          <Link
                            to={`/cases?case=${e.case._id}`}
                            className={styles.caseLink}
                          >
                            {e.case._id.slice(-6).toUpperCase()}
                          </Link>
                        </>
                      )}
                    </small>
                  </div>

                  {(user.role === 'admin' || e.uploadedBy?._id === user.id) && (
                    <button
                      onClick={() => deleteEvidence(e._id)}
                      className={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* ── Pagination ── */}
          {pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, current: p.current - 1 }))
                }
                disabled={!pagination.hasPrev}
                className={styles.pageBtn}
              >
                Prev
              </button>
              <span>
                Page {pagination.current} of {pagination.pages}
              </span>
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, current: p.current + 1 }))
                }
                disabled={!pagination.hasNext}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Evidence;