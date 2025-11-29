import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Statements from './pages/Statements';
import Evidence from './pages/Evidence';
import Timeline from './pages/Timeline';
import Reports from './pages/Reports';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/statements" element={<Statements />} />
        <Route path="/evidence" element={<Evidence />} />
        <Route path="/timeline/:caseId" element={<Timeline />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Router>
  );
}

export default App;
