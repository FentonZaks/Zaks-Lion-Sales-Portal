import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { ManagerDashboard } from './components/ManagerDashboard';
import { AdminSyncDashboard } from './components/AdminSyncDashboard';
import { OrderBuilder } from './components/OrderBuilder';
import './index.css';

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <aside style={{ width: '250px', backgroundColor: 'var(--bg-color)', padding: '1rem', borderRight: '1px solid var(--border-color)' }}>
          <h2 style={{ color: 'var(--primary-color)', marginBottom: '2rem' }}>Zaks / Lion Portal</h2>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-color)', fontWeight: 'bold' }}>Sales Dashboard</Link>
            <Link to="/customers" style={{ textDecoration: 'none', color: 'var(--text-color)', fontWeight: 'bold' }}>Customers</Link>
            <Link to="/order" style={{ textDecoration: 'none', color: 'var(--text-color)', fontWeight: 'bold' }}>Draft Order</Link>
            <div style={{ margin: '1rem 0', borderTop: '1px solid var(--border-color)' }}></div>
            <Link to="/manager" style={{ textDecoration: 'none', color: 'var(--text-color)' }}>Manager Overview</Link>
            <Link to="/admin" style={{ textDecoration: 'none', color: 'var(--text-color)' }}>Admin / IT Sync</Link>
          </nav>
        </aside>
        
        <main style={{ flexGrow: 1, padding: '2rem', backgroundColor: 'var(--surface-color)' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/order" element={<OrderBuilder />} />
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/admin" element={<AdminSyncDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
