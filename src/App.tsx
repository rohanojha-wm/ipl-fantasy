import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Matches } from './pages/Matches';
import { Graph } from './pages/Graph';
import { Ledger } from './pages/Ledger';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminMatches } from './pages/admin/AdminMatches';
import { AdminMatchStandings } from './pages/admin/AdminMatchStandings';
import { AdminParticipants } from './pages/admin/AdminParticipants';
import { AdminConfig } from './pages/admin/AdminConfig';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="matches" element={<Matches />} />
          <Route path="graph" element={<Graph />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin/matches" element={<AdminMatches />} />
          <Route path="admin/matches/:id" element={<AdminMatchStandings />} />
          <Route path="admin/participants" element={<AdminParticipants />} />
          <Route path="admin/config" element={<AdminConfig />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
