// src/pages/Cases.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import API from '../services/api';
import styles from './Cases.module.css';
import { reverseGeocode, forwardGeocode } from '../utils/geocode';

const Cases = () => {
  const [cases, setCases] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [locationNames, setLocationNames] = useState({});

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const isOfficer = user.role === 'officer'; // ← NEW

  // ───── Debounce Search ─────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, current: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // ───── Fetch Cases ─────
  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        search: debouncedSearch,
        page: pagination.current,
        limit: 10,
        status: filterStatus,
        sortBy,
        sortOrder,
      };
      const res = await API.get('/cases', { params });
      setCases(res.data.cases);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pagination.current, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // ───── Reverse Geocode All Cases ─────
  useEffect(() => {
    const fetchLocationNames = async () => {
      const names = {};
      for (const c of cases) {
        if (c.location?.coordinates) {
          const [lng, lat] = c.location.coordinates;
          const name = await reverseGeocode(lat, lng);
          names[c._id] = name;
        }
      }
      setLocationNames(names);
    };
    if (cases.length > 0) fetchLocationNames();
  }, [cases]);

  // ───── Fetch Officers (Admin Only) ─────
  useEffect(() => {
    if (isAdmin) {
      API.get('/cases/officers')
        .then((res) => setOfficers(res.data))
        .catch(() => {});
    }
  }, [isAdmin]);

  // ───── Update Status (Admin Only) ─────
  const updateStatus = async (caseId, newStatus) => {
    if (!isAdmin) return;
    try {
      const res = await API.patch(`/cases/${caseId}/status`, { status: newStatus });
      setCases((prev) => prev.map((c) => (c._id === caseId ? res.data : c)));
      if (selectedCase?._id === caseId) setSelectedCase(res.data);
    } catch (err) {
      alert(err.response?.data?.msg || 'Update failed');
    }
  };

  // ───── Assign Officer (Admin Only) ─────
  const assignOfficer = async (caseId, officerId) => {
    if (!isAdmin) return;
    try {
      const res = await API.patch(`/cases/${caseId}/assign`, { officerId });
      setCases((prev) => prev.map((c) => (c._id === caseId ? res.data : c)));
      if (selectedCase?._id === caseId) setSelectedCase(res.data);
    } catch (err) {
      alert(err.response?.data?.msg || 'Assignment failed');
    }
  };

  // ───── Create New Case (Officers + Admins) ─────
  const createCase = async (formData) => {
    try {
      const res = await API.post('/cases', formData);
      setCases((prev) => [res.data, ...prev]);
      setShowCreateModal(false);
      alert('Case created successfully!');
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to create case');
    }
  };

  // ───── Pagination ─────
  const goToPage = (page) => setPagination((prev) => ({ ...prev, current: page }));

  // ───── RENDER ─────
  if (loading && cases.length === 0) {
    return (
      <div className={styles.appWrapper}>
        <Navbar />
        <div className={styles.pageContent}>
          <div className={styles.loading}>Loading cases...</div>
        </div>
        <Footer />
      </div>
    );
  }

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

  return (
    <div className={styles.appWrapper}>
      <Navbar />
      <div className={styles.pageContent}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h2>Cases Management</h2>
            {/* OFFICERS + ADMINS CAN CREATE */}
            {(isAdmin || isOfficer) && (
              <button onClick={() => setShowCreateModal(true)} className={styles.addBtn}>
                + Add New Case
              </button>
            )}
          </div>

          {/* FILTERS & SORT */}
          <div className={styles.filters}>
            <input
              type="text"
              placeholder="Search cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All Status</option>
              <option value="open">Pending</option>
              <option value="pending">Under Investigation</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.sortSelect}
            >
              <option value="createdAt">Date Reported</option>
              <option value="_id">Case ID</option>
              <option value="assignedTo">Officer Assigned</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className={styles.sortBtn}
            >
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>

          <div className={styles.resultsInfo}>
            Showing {cases.length} of {pagination.total} cases
          </div>

          {/* MAIN TABLE */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Date Reported</th>
                  <th>Complainant</th>
                  <th>Crime Type</th>
                  <th>Location</th>
                  <th>Assigned Officer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={styles.noData}>
                      No cases found.
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => (
                    <tr key={c._id} className={styles.row}>
                      <td>{c._id.slice(-6).toUpperCase()}</td>
                      <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td>{c.reportedBy?.name || c.reportedByName || 'Citizen'}</td>
                      <td>{c.type}</td>
                      <td>
                        {c.location?.coordinates
                          ? locationNames[c._id] || 'Loading location...'
                          : 'Not provided'}
                      </td>
                      <td>{c.assignedTo?.name || 'Unassigned'}</td>
                      <td>
                        {isAdmin ? (
                          <select
                            value={c.status}
                            onChange={(e) => updateStatus(c._id, e.target.value)}
                            className={`${styles.statusSelect} ${styles[c.status]}`}
                          >
                            <option value="open">Pending</option>
                            <option value="pending">Under Investigation</option>
                            <option value="closed">Closed</option>
                          </select>
                        ) : (
                          <span className={`${styles.statusBadge} ${styles[c.status]}`}>
                            {c.status === 'open' ? 'Pending' : c.status === 'pending' ? 'Under Investigation' : 'Closed'}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setSelectedCase(c);
                            setShowDetailModal(true);
                          }}
                          className={styles.viewBtn}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => goToPage(pagination.current - 1)}
                disabled={!pagination.hasPrev}
                className={styles.pageBtn}
              >
                Prev
              </button>
              <span className={styles.pageInfo}>
                Page {pagination.current} of {pagination.pages}
              </span>
              <button
                onClick={() => goToPage(pagination.current + 1)}
                disabled={!pagination.hasNext}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {showCreateModal && (
        <CreateCaseModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={createCase}
          officers={officers}
          isOfficerOnly={!isAdmin} // ← hide officer dropdown for officers
        />
      )}
      {showDetailModal && selectedCase && (
        <CaseDetailModal
          caseData={selectedCase}
          locationName={locationNames[selectedCase._id] || 'Loading...'}
          onClose={() => setShowDetailModal(false)}
          onStatusUpdate={updateStatus}
          onAssign={assignOfficer}
          officers={officers}
          isAdmin={isAdmin}
        />
      )}
      <Footer />
    </div>
  );
};

/* ─────────────────────────────────────
   CREATE CASE MODAL – OFFICERS + ADMINS
   ───────────────────────────────────── */
const CreateCaseModal = ({ onClose, onSubmit, officers, isOfficerOnly }) => {
  const [form, setForm] = useState({
    title: '',
    type: '',
    description: '',
    reportedByName: '',
    assignedTo: '',
  });
  const [address, setAddress] = useState('');
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState(null);

  const geocodeAddress = async () => {
    if (!address.trim()) return;
    const result = await forwardGeocode(address);
    if (result) {
      setCoords(result);
      setLocationName(address);
    } else {
      alert('Location not found. Try: "Nakasero Market, Kampala"');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      location: coords ? { lat: coords.lat, lng: coords.lng } : undefined,
    };
    onSubmit(payload);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Add New Case</h3>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Case Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className={styles.input}
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            required
            className={styles.input}
          >
            <option value="">Select Crime Type *</option>
            <option>Theft</option>
            <option>Assault</option>
            <option>Fraud</option>
            <option>Robbery</option>
            <option>Burglary</option>
            <option>Other</option>
          </select>
          <input
            placeholder="Complainant Name"
            value={form.reportedByName}
            onChange={(e) => setForm({ ...form, reportedByName: e.target.value })}
            className={styles.input}
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={styles.textarea}
            rows={4}
          />
          <input
            placeholder="Location (e.g., Nakasero Market, Kampala)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={geocodeAddress}
            className={styles.input}
          />
          {locationName && <p className={styles.locationPreview}>Location: {locationName}</p>}

          {/* HIDE OFFICER ASSIGN FOR OFFICERS */}
          {!isOfficerOnly && (
            <select
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              className={styles.input}
            >
              <option value="">Assign Officer (Optional)</option>
              {officers.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={!coords}>Create Case</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────
   CASE DETAIL MODAL – ADMIN ONLY
   ───────────────────────────────────── */
const CaseDetailModal = ({
  caseData,
  locationName,
  onClose,
  onStatusUpdate,
  onAssign,
  officers,
  isAdmin,
}) => {
  const [selectedOfficer, setSelectedOfficer] = useState(caseData.assignedTo?._id || '');

  const handleAssign = () => {
    if (!selectedOfficer) return;
    onAssign(caseData._id, selectedOfficer);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
        <h3>Case Details: {caseData._id.slice(-6).toUpperCase()}</h3>

        <div className={styles.detailSection}>
          <h4>Case Information</h4>
          <p><strong>Date Reported:</strong> {new Date(caseData.createdAt).toLocaleString()}</p>
          <p><strong>Location:</strong> {caseData.location?.coordinates ? locationName : 'Not provided'}</p>
          <p><strong>Type:</strong> {caseData.type}</p>
          <p><strong>Description:</strong> {caseData.description || 'N/A'}</p>
        </div>

        <div className={styles.detailSection}>
          <h4>Assigned Personnel</h4>
          <p><strong>Officer:</strong> {caseData.assignedTo?.name || 'Unassigned'}</p>
          {caseData.assignedTo && <p><strong>Contact:</strong> {caseData.assignedTo.email}</p>}

          {isAdmin && (
            <div className={styles.assignSection}>
              <select
                value={selectedOfficer}
                onChange={(e) => setSelectedOfficer(e.target.value)}
                className={styles.input}
              >
                <option value="">Select Officer</option>
                {officers.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button onClick={handleAssign} disabled={!selectedOfficer} className={styles.assignBtn}>
                Assign
              </button>
            </div>
          )}
        </div>

        <div className={styles.detailSection}>
          <h4>Case Status</h4>
          {isAdmin ? (
            <select
              value={caseData.status}
              onChange={(e) => onStatusUpdate(caseData._id, e.target.value)}
              className={`${styles.statusSelect} ${styles[caseData.status]}`}
            >
              <option value="open">Pending</option>
              <option value="pending">Under Investigation</option>
              <option value="closed">Closed</option>
            </select>
          ) : (
            <span className={`${styles.statusBadge} ${styles[caseData.status]}`}>
              {caseData.status === 'open' ? 'Pending' : caseData.status === 'pending' ? 'Under Investigation' : 'Closed'}
            </span>
          )}
        </div>

        <div className={styles.detailSection}>
          <h4>Related</h4>
          <Link to={`/statements?case=${caseData._id}`} className={styles.link}>View Statements</Link>{' '}
          | <Link to={`/evidence?case=${caseData._id}`} className={styles.link}>View Evidence</Link>{' '}
          | <Link to={`/timeline/${caseData._id}`} className={styles.link}>View Timeline</Link>
        </div>

        <button onClick={onClose} className={styles.closeBtn}>Close</button>
      </div>
    </div>
  );
};

export default Cases;