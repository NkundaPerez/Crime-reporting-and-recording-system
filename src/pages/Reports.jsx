// src/pages/Reports.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import API from '../services/api';
import styles from './Reports.module.css';
import { format } from 'https://cdn.skypack.dev/date-fns';

const Reports = () => {
  const [searchParams] = useSearchParams();
  const urlCaseId = searchParams.get('case');

  const [reports, setReports] = useState([]);
  const [cases, setCases] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ caseId: urlCaseId || '' });
  const [newForm, setNewForm] = useState({ caseId: urlCaseId || '', title: '', description: '', files: [] });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', status: 'draft' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  /* --------------------------------------------------- */
  /*  Load cases for dropdown                             */
  /* --------------------------------------------------- */
  useEffect(() => {
    API.get('/cases?limit=200')
      .then(res => setCases(res.data.cases))
      .catch(() => {});
  }, []);

  /* --------------------------------------------------- */
  /*  Fetch reports – SEND `case` NOT `caseId`            */
  /* --------------------------------------------------- */
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: 10,
        case: filters.caseId || undefined,
      };
      const res = await API.get('/reports', { params });
      setReports(res.data.reports);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('fetchReports error', err);
      alert(err.response?.data?.msg || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, filters.caseId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Reset page when filter changes
  useEffect(() => {
    setPagination(p => ({ ...p, current: 1 }));
  }, [filters.caseId]);

  /* --------------------------------------------------- */
  /*  ADD REPORT                                          */
  /* --------------------------------------------------- */
  const handleAdd = async e => {
    e.preventDefault();
    if (!newForm.caseId || !newForm.title.trim()) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.append('caseId', newForm.caseId);
    formData.append('title', newForm.title);
    formData.append('description', newForm.description);
    newForm.files.forEach(f => formData.append('files', f));

    try {
      // REMOVED manual header – let Axios set boundary!
      const res = await API.post('/reports', formData);
      setReports(prev => [res.data, ...prev]);
      setShowAddModal(false);
      setNewForm({ caseId: urlCaseId || '', title: '', description: '', files: [] });
    } catch (err) {
      console.error('upload error', err);
      alert(err.response?.data?.msg || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* --------------------------------------------------- */
  /*  EDIT REPORT                                         */
  /* --------------------------------------------------- */
  const startEdit = r => {
    setEditingId(r._id);
    setEditForm({
      title: r.title,
      description: r.description || '',
      status: r.status,
    });
  };

  const saveEdit = async () => {
    if (!editForm.title.trim()) return;
    try {
      const res = await API.patch(`/reports/${editingId}`, editForm);
      setReports(prev =>
        prev.map(r => (r._id === editingId ? res.data : r))
      );
      setEditingId(null);
    } catch (err) {
      console.error('edit error', err);
      alert(err.response?.data?.msg || 'Update failed');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', description: '', status: 'draft' });
  };

  /* --------------------------------------------------- */
  /*  RENDER                                              */
  /* --------------------------------------------------- */
  return (
    <div className={styles.appWrapper}>
      <Navbar />

      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <h2>Case Reports</h2>
            <button onClick={() => setShowAddModal(true)} className={styles.addBtn}>
              Add Report
            </button>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <select
              value={filters.caseId}
              onChange={e => setFilters({ caseId: e.target.value })}
              className={styles.filterSelect}
            >
              <option value="">All My Cases</option>
              {cases.map(c => (
                <option key={c._id} value={c._id}>
                  {c._id.slice(-6)} – {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Case</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className={styles.loading}>Loading...</td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.noData}>No reports found.</td>
                  </tr>
                ) : (
                  reports.map(r => (
                    <tr key={r._id}>
                      <td>{r._id.slice(-6).toUpperCase()}</td>
                      <td>{r.caseId?._id?.slice(-6) || '—'}</td>
                      <td>
                        {editingId === r._id ? (
                          <input
                            value={editForm.title}
                            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            className={styles.input}
                            style={{ width: '100%' }}
                          />
                        ) : (
                          r.title
                        )}
                      </td>
                      <td>
                        {editingId === r._id ? (
                          <select
                            value={editForm.status}
                            onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                            className={styles.statusSelect}
                          >
                            <option value="draft">Draft</option>
                            <option value="submitted">Submitted</option>
                            <option value="approved">Approved</option>
                          </select>
                        ) : (
                          <span className={`${styles.statusBadge} ${styles[r.status]}`}>
                            {r.status}
                          </span>
                        )}
                      </td>
                      <td>{format(new Date(r.createdAt), 'PP')}</td>
                      <td className={styles.actionsCell}>
                        <button
                          onClick={() => {
                            setSelectedReport(r);
                            setShowViewModal(true);
                          }}
                          className={styles.viewBtn}
                        >
                          View
                        </button>

                        {(isAdmin || r.author._id === user.id) && editingId !== r._id && (
                          <button onClick={() => startEdit(r)} className={styles.editBtn}>
                            Edit
                          </button>
                        )}

                        {editingId === r._id && (
                          <>
                            <button onClick={saveEdit} className={styles.addBtn} style={{ marginLeft: '0.5rem' }}>
                              Save
                            </button>
                            <button onClick={cancelEdit} className={styles.deleteBtn} style={{ marginLeft: '0.25rem' }}>
                              Cancel
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setPagination(p => ({ ...p, current: p.current - 1 }))}
                disabled={pagination.current === 1}
                className={styles.pageBtn}
              >
                Prev
              </button>
              <span className={styles.pageInfo}>
                Page {pagination.current} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, current: p.current + 1 }))}
                disabled={pagination.current === pagination.pages}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      {showAddModal && (
        <AddReportModal
          cases={cases}
          form={newForm}
          setForm={setNewForm}
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)}
          submitting={submitting}
        />
      )}

      {showViewModal && selectedReport && (
        <ViewReportModal report={selectedReport} onClose={() => setShowViewModal(false)} />
      )}

      <Footer className={styles.footer} />
    </div>
  );
};

/* ----------------------- ADD MODAL ----------------------- */
const AddReportModal = ({ cases, form, setForm, onSubmit, onClose, submitting }) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div className={styles.modal} onClick={e => e.stopPropagation()}>
      <h3>Add Report</h3>
      <form onSubmit={onSubmit}>
        <select
          value={form.caseId}
          onChange={e => setForm({ ...form, caseId: e.target.value })}
          required
          className={styles.input}
        >
          <option value="">Select Case *</option>
          {cases.map(c => (
            <option key={c._id} value={c._id}>
              {c._id.slice(-6)} – {c.title}
            </option>
          ))}
        </select>

        <input
          placeholder="Report Title *"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
          className={styles.input}
        />

        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          className={styles.textarea}
          rows={4}
        />

        <input
          type="file"
          multiple
          onChange={e => setForm({ ...form, files: Array.from(e.target.files || []) })}
          className={styles.fileInput}
        />

        <div className={styles.modalActions}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

/* ----------------------- VIEW MODAL ----------------------- */
const ViewReportModal = ({ report, onClose }) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div className={styles.modalWide} onClick={e => e.stopPropagation()}>
      <h3>{report.title}</h3>

      <p><strong>Case:</strong> {report.caseId?.title || '—'}</p>
      <p>
        <strong>Status:</strong>{' '}
        <span className={`${styles.statusBadge} ${styles[report.status]}`}>
          {report.status}
        </span>
      </p>
      {report.description && <p><strong>Description:</strong> {report.description}</p>}

      {report.files?.length > 0 && (
        <div>
          <h4>Attached Files</h4>
          <ul className={styles.fileList}>
            {report.files.map((f, i) => (
              <li key={i} style={{ marginBottom: '1rem' }}>
                <a href={f.url} target="_blank" rel="noopener noreferrer">
                  {f.name}
                </a>

                {f.type === 'image' && (
                  <img
                    src={f.url}
                    alt={f.name}
                    className={styles.previewImg}
                    style={{ display: 'block', marginTop: '0.5rem', maxWidth: '300px' }}
                  />
                )}

                {f.type === 'pdf' && (
                  <embed
                    src={f.url}
                    width="100%"
                    height="500px"
                    style={{ marginTop: '0.5rem', border: '1px solid #ddd' }}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onClose} className={styles.closeBtn}>
        Close
      </button>
    </div>
  </div>
);

export default Reports;