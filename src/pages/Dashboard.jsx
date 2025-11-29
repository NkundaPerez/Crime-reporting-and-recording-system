// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import API from '../services/api';
import styles from './Dashboard.module.css';

// ───── Leaflet icon fix ─────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await API.get('/dashboard');
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // ───── STATES ─────
  if (loading) {
    return (
      <div className={styles.appWrapper}>
        <Navbar />
        <div className={styles.pageContent}>
          <div className={styles.loading}>Loading dashboard...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.appWrapper}>
        <Navbar />
        <div className={styles.pageContent}>
          <div className={styles.error}>{error || 'Invalid data'}</div>
        </div>
        <Footer />
      </div>
    );
  }

  // ───── CHART DATA ─────
  const statusChart = {
    labels: ['Pending', 'Under Investigation', 'Closed'],
    datasets: [
      {
        label: 'Cases',
        data: [data.cases.open || 0, data.cases.pending || 0, data.cases.closed || 0],
        backgroundColor: ['#ffc107', '#007bff', '#28a745'],
      },
    ],
  };

  const rateChart = {
    labels: data.crimeRateByPeriod.labels || [],
    datasets: [
      {
        label: 'Reported Cases',
        data: data.crimeRateByPeriod.data || [],
        borderColor: '#dc3545',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const typeChart = {
    labels: data.crimeTypeDistribution.labels || [],
    datasets: [
      {
        data: data.crimeTypeDistribution.data || [],
        backgroundColor: [
          '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0',
          '#9966ff', '#ff9f40', '#c9cbcf', '#ff5733',
        ],
      },
    ],
  };

  const topCrimes = (data.crimeTypeDistribution.labels || [])
    .map((label, i) => ({ label, count: data.crimeTypeDistribution.data[i] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const hotspotAreas = (data.heatMapData || [])
    .slice(0, 5)
    .map((coord, i) => ({
      id: i,
      lat: coord[1],
      lng: coord[0],
    }));

  const totalOfficers = data.officers?.total || 0;
  const availableOfficers = totalOfficers - (data.officers?.assigned || 0);

  return (
    <div className={styles.appWrapper}>
      <Navbar />
      <div className={styles.pageContent}>
        <div className={styles.dashboard}>

          {/* ── HEADER ── */}
          <header className={styles.header}>
            <h1>Crime Reporting Dashboard</h1>
            <p className={styles.subtitle}>Real-time insights from reported cases</p>
          </header>

          {/* ── GRID LAYOUT ── */}
          <section className={styles.grid}>

            {/* ROW 1: Case Status + Crime Rate */}
            <div className={styles.card}>
              <h3>Case Status</h3>
              <div className={styles.chartWrapper}>
                <Bar
                  data={statusChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>

            <div className={styles.card}>
              <h3>Crime Rate (Last 12 Months)</h3>
              <div className={styles.chartWrapper}>
                <Line
                  data={rateChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                  }}
                />
              </div>
            </div>

            {/* ROW 2: Officer Overview + Crime Type Distribution */}
            <div className={styles.card}>
              <h3>Officer Overview</h3>
              <div className={styles.officerOverview}>
                <div className={styles.officerItem}>
                  <div className={styles.officerNumber}>{totalOfficers}</div>
                  <div className={styles.officerLabel}>Total</div>
                </div>
                <div className={styles.officerDivider} />
                <div className={styles.officerItem}>
                  <div className={styles.officerNumber}>{availableOfficers}</div>
                  <div className={styles.officerLabel}>Available</div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h3>Crime Type Distribution</h3>
              <div className={styles.chartWrapper}>
                <Pie
                  data={typeChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } },
                  }}
                />
              </div>
            </div>

            {/* ROW 3: Heat Map + Insights (Split) */}
            <div className={styles.splitCard}>
              {/* Left: Map */}
              <div className={styles.mapSection}>
                <h3>Crime Hotspots</h3>
                <div className={styles.mapWrapper}>
                  <MapContainer
                    center={[0.3136, 32.5785]}
                    zoom={6}
                    className={styles.map}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    {Array.isArray(data.heatMapData) &&
                      data.heatMapData.map((coord, i) => (
                        <Marker key={i} position={[coord[1], coord[0]]}>
                          <Popup>
                            <strong>Crime reported</strong><br />
                            Lat: {coord[1].toFixed(4)}, Lng: {coord[0].toFixed(4)}
                          </Popup>
                        </Marker>
                      ))}
                  </MapContainer>
                </div>
              </div>

              {/* Right: Insights */}
              <div className={styles.insightsSection}>
                <div className={styles.insightBox}>
                  <h4>Most Reported Crimes</h4>
                  <ul className={styles.crimeList}>
                    {topCrimes.length > 0 ? (
                      topCrimes.map((crime, i) => (
                        <li key={i}>
                          <span className={styles.crimeName}>{crime.label}</span>
                          <span className={styles.crimeCount}>{crime.count}</span>
                        </li>
                      ))
                    ) : (
                      <li>No data</li>
                    )}
                  </ul>
                </div>

                <div className={styles.insightBox}>
                  <h4>High-Risk Areas</h4>
                  <ul className={styles.areaList}>
                    {hotspotAreas.length > 0 ? (
                      hotspotAreas.map((area) => (
                        <li key={area.id}>
                          <span>
                            {area.lat.toFixed(3)}, {area.lng.toFixed(3)}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li>No hotspots</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;