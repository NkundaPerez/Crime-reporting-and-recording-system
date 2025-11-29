// src/pages/Statements.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import API from '../services/api';
import styles from './Statements.module.css';

// CDN imports – no node_modules needed
import { format } from 'https://cdn.skypack.dev/date-fns';
import jsPDF from 'https://cdn.skypack.dev/jspdf';
import 'https://cdn.skypack.dev/jspdf-autotable';

const Statements = () => {
  const [searchParams] = useSearchParams();
  const urlCaseId = searchParams.get('case');

  const [statements, setStatements] = useState([]);
  const [cases, setCases] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0, hasNext: false, hasPrev: false });
  const [filters, setFilters] = useState({ caseId: urlCaseId || '', type: '', status: '', search: '' });
  const [newForm, setNewForm] = useState({
    caseId: urlCaseId || '',
    personName: '',
    type: 'witness',
    officer: '',
    narrative: '',
    files: []
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedStmt, setSelectedStmt] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  // ───── Fetch Cases (dropdown) ─────
  useEffect(() => {
    API.get('/cases?limit=100')
      .then(res => setCases(res.data.cases))
      .catch(() => {});
  }, []);

  // ───── Fetch Statements ─────
  const fetchStatements = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.current, limit: 10, ...filters };
      const res = await API.get('/statements', { params });
      setStatements(res.data.statements);
      setPagination(res.data.pagination);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, filters]);

  useEffect(() => { fetchStatements(); }, [fetchStatements]);

  // ───── Add Statement ─────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newForm.caseId || !newForm.personName || !newForm.narrative.trim()) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.append('caseId', newForm.caseId);
    formData.append('personName', newForm.personName);
    formData.append('type', newForm.type);
    formData.append('officer', newForm.officer);
    formData.append('narrative', newForm.narrative);
    newForm.files.forEach(f => formData.append('files', f));

    try {
      const res = await API.post('/statements', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatements(prev => [res.data, ...prev]);
      setShowAddModal(false);
      setNewForm({ caseId: urlCaseId || '', personName: '', type: 'witness', officer: '', narrative: '', files: [] });
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ───── Edit Narrative ─────
  const startEdit = (stmt) => {
    setEditingId(stmt._id);
    setEditContent(stmt.narrative);
  };

  const saveEdit = async () => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      const res = await API.patch(`/statements/${editingId}`, { narrative: editContent });
      setStatements(prev => prev.map(s => s._id === editingId ? res.data : s));
      setEditingId(null);
    } catch (err) {
      alert(err.response?.data?.msg || 'Update failed');
    } finally {
      setSavingEdit(false);
    }
  };

  // ───── Update Status (Admin Only) ─────
  const updateStatus = async (stmtId, newStatus) => {
    if (!isAdmin) return;
    setUpdatingStatus(stmtId);
    try {
      const res = await API.patch(`/statements/${stmtId}`, { status: newStatus });
      setStatements(prev => prev.map(s => s._id === stmtId ? res.data : s));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to update status');
    } finally {
       setUpdatingStatus(null);
    }
  };

  const deleteStatement = async (id) => {
    if (!window.confirm('Delete this statement?')) return;
    try {
      await API.delete(`/statements/${id}`);
      setStatements(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      alert(err.response?.data?.msg || 'Delete failed');
    }
  };

  // ───── Export PDF ─────
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Statements Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 25);

    const tableData = statements.map(s => [
      s._id.slice(-6),
      s.caseId?._id?.slice(-6) || '—',
      s.personName,
      s.type,
      s.officer || '—',
      format(new Date(s.createdAt), 'PP'),
      s.status || 'Pending'
    ]);

    doc.autoTable({
      head: [['ID', 'Case', 'Person', 'Type', 'Officer', 'Date', 'Status']],
      body: tableData,
      startY: 35,
      theme: 'grid'
    });

    doc.save('statements.pdf');
  };

  // ───── Export CSV ─────
  const exportCSV = () => {
    const headers = ['ID', 'Case ID', 'Person', 'Type', 'Officer', 'Date', 'Status'];
    const rows = statements.map(s => [
      s._id.slice(-6),
      s.caseId?._id?.slice(-6) || '',
      s.personName,
      s.type,
      s.officer || '',
      format(new Date(s.createdAt), 'yyyy-MM-dd'),
      s.status || 'Pending'
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statements.csv';
    a.click();
  };

  const canEdit = (stmt) => isAdmin || stmt.author?._id === user.id;

  return (
    <div className={styles.appWrapper}>
      <Navbar />
      <div className={styles.pageContent}>
        <div className={styles.container}>

          {/* Header */}
          <div className={styles.header}>
            <h2>Statements Management</h2>
            <div className={styles.actions}>
              <button onClick={() => setShowAddModal(true)} className={styles.addBtn}>
                Add New Statement
              </button>
              <button onClick={exportPDF} className={styles.exportBtn}>PDF</button>
              <button onClick={exportCSV} className={styles.exportBtn}>CSV</button>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <input
              placeholder="Search..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              className={styles.searchInput}
            />
            <select
              value={filters.caseId}
              onChange={e => setFilters({ ...filters, caseId: e.target.value })}
              className={styles.filterSelect}
            >
              <option value="">All Cases</option>
              {cases.map(c => (
                <option key={c._id} value={c._id}>{c._id.slice(-6)} – {c.title}</option>
              ))}
            </select>
            <select
              value={filters.type}
              onChange={e => setFilters({ ...filters, type: e.target.value })}
              className={styles.filterSelect}
            >
              <option value="">All Types</option>
              <option>witness</option>
              <option>officer</option>
              <option>complainant</option>
              <option>suspect</option>
            </select>
            <select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className={styles.filterSelect}
            >
              <option value="">All Status</option>
              <option>pending</option>
              <option>reviewed</option>
              <option>verified</option>
            </select>
          </div>

          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Statement ID</th>
                  <th>Case ID</th>
                  <th>Person Name</th>
                  <th>Type</th>
                  <th>Officer</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className={styles.loading}>Loading...</td></tr>
                ) : statements.length === 0 ? (
                  <tr><td colSpan="8" className={styles.noData}>No statements found.</td></tr>
                ) : (
                  statements.map(s => (
                    <tr key={s._id}>
                      <td>{s._id.slice(-6).toUpperCase()}</td>
                      <td>{s.caseId?._id?.slice(-6).toUpperCase() || '—'}</td>
                      <td>{s.personName}</td>
                      <td><span className={styles.typeBadge}>{s.type}</span></td>
                      <td>{s.officer || '—'}</td>
                      <td>
                        {isAdmin ? (
                          <select
                            value={s.status || 'pending'}
                            onChange={e => updateStatus(s._id, e.target.value)}
                            disabled={updatingStatus === s._id}
                            className={styles.statusSelect}
                          >
                            <option value="pending">Pending</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="verified">Verified</option>
                          </select>
                        ) : (
                          <span className={`${styles.statusBadge} ${styles[s.status || 'pending']}`}>
                            {s.status || 'Pending'}
                          </span>
                        )}
                      </td>
                      <td>{format(new Date(s.createdAt), 'PP')}</td>
                      <td className={styles.actionsCell}>
                        <button onClick={() => { setSelectedStmt(s); setShowViewModal(true); }} className={styles.viewBtn}>View</button>
                        {canEdit(s) && (
                          <>
                            <button onClick={() => startEdit(s)} className={styles.editBtn}>Edit</button>
                            <button onClick={() => deleteStatement(s._id)} className={styles.deleteBtn}>Delete</button>
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
              <button onClick={() => setPagination(p => ({ ...p, current: p.current - 1 }))} disabled={!pagination.hasPrev} className={styles.pageBtn}>Prev</button>
              <span className={styles.pageInfo}>Page {pagination.current} of {pagination.pages}</span>
              <button onClick={() => setPagination(p => ({ ...p, current: p.current + 1 }))} disabled={!pagination.hasNext} className={styles.pageBtn}>Next</button>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddStatementModal
          cases={cases}
          form={newForm}
          setForm={setNewForm}
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)}
          submitting={submitting}
        />
      )}

      {/* View Modal */}
      {showViewModal && selectedStmt && (
        <ViewStatementModal
          stmt={selectedStmt}
          onClose={() => setShowViewModal(false)}
        />
      )}

      <Footer />
    </div>
  );
};

/* ───── ADD MODAL ───── */
const AddStatementModal = ({ cases, form, setForm, onSubmit, onClose, submitting }) => {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3>Add New Statement</h3>
        <form onSubmit={onSubmit}>
          <select
            value={form.caseId}
            onChange={e => setForm({ ...form, caseId: e.target.value })}
            required
            className={styles.input}
          >
            <option value="">Select Case *</option>
            {cases.map(c => (
              <option key={c._id} value={c._id}>{c._id.slice(-6)} – {c.title}</option>
            ))}
          </select>

          <input
            placeholder="Person Name *"
            value={form.personName}
            onChange={e => setForm({ ...form, personName: e.target.value })}
            required
            className={styles.input}
          />

          <select
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            className={styles.input}
          >
            <option value="witness">Witness</option>
            <option value="officer">Officer</option>
            <option value="complainant">Complainant</option>
            <option value="suspect">Suspect</option>
          </select>

          <input
            placeholder="Officer Recording"
            value={form.officer}
            onChange={e => setForm({ ...form, officer: e.target.value })}
            className={styles.input}
          />

          <textarea
            placeholder="Full Narrative *"
            value={form.narrative}
            onChange={e => setForm({ ...form, narrative: e.target.value })}
            required
            className={styles.textarea}
            rows="6"
          />

          <input
            type="file"
            multiple
            onChange={e => setForm({ ...form, files: Array.from(e.target.files) })}
            className={styles.fileInput}
          />

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Statement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ───── VIEW MODAL ───── */
const ViewStatementModal = ({ stmt, onClose }) => {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalWide} onClick={e => e.stopPropagation()}>
        <h3>Statement: {stmt._id.slice(-6).toUpperCase()}</h3>
        <div className={styles.detailGrid}>
          <div><strong>Case:</strong> {stmt.caseId?._id?.slice(-6).toUpperCase() || '—'} – {stmt.caseId?.title}</div>
          <div><strong>Date:</strong> {format(new Date(stmt.createdAt), 'PPP p')}</div>
          <div><strong>Person:</strong> {stmt.personName}</div>
          <div><strong>Type:</strong> <span className={styles.typeBadge}>{stmt.type}</span></div>
          <div><strong>Officer:</strong> {stmt.officer || '—'}</div>
          <div><strong>Status:</strong> <span className={`${styles.statusBadge} ${styles[stmt.status || 'pending']}`}>{stmt.status || 'Pending'}</span></div>
        </div>
        <div className={styles.narrative}>
          <h4>Narrative</h4>
          <p>{stmt.narrative}</p>
        </div>
        {stmt.files?.length > 0 && (
          <div>
            <h4>Attachments</h4>
            <ul className={styles.fileList}>
              {stmt.files.map((f, i) => (
                <li key={i}><a href={f.url} target="_blank" rel="noopener noreferrer">{f.name}</a></li>
              ))}
            </ul>
          </div>
        )}
        <button onClick={onClose} className={styles.closeBtn}>Close</button>
      </div>
    </div>
  );
};

export default Statements;