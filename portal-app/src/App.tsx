import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Auth } from './components/Auth';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { NewCustomer } from './pages/NewCustomer';
import { CustomerGallery } from './pages/CustomerGallery';
import { OrderBuilder } from './components/OrderBuilder';
import { ManagerDashboard } from './components/ManagerDashboard';
import { AdminSyncDashboard } from './components/AdminSyncDashboard';
import './index.css';

function Navigation() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    async function checkAdminStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('App.tsx checkAdminStatus user:', user?.id);
      if (user) {
        const { data: roles, error } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id);
        console.log('App.tsx checkAdminStatus roles:', roles, 'error:', error);
        const hasStrictAdminRole = roles?.some(r => (r.roles as any)?.name === 'ADMIN');
        console.log('App.tsx hasStrictAdminRole:', hasStrictAdminRole);
        setIsAdmin(!!hasStrictAdminRole);
      }
    }
    checkAdminStatus();
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <div className="mobile-header">
        <h2 style={{ color: 'var(--primary-color)', fontSize: '1.25rem', fontWeight: 700 }}>Zaks / Lion Portal</h2>
        <button onClick={() => setIsOpen(!isOpen)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
        <h2 className="hide-on-mobile" style={{ padding: '1rem 1.5rem', color: 'var(--primary-color)', fontSize: '1.25rem', fontWeight: 700 }}>Zaks / Lion Portal</h2>
        <ul style={{ listStyle: 'none', padding: '1rem 0', margin: 0, flex: 1 }}>
          <li><Link onClick={closeMenu} to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Sales Dashboard</Link></li>
          <li><Link onClick={closeMenu} to="/customers" className={`nav-link ${isActive('/customers') ? 'active' : ''}`}>Customers</Link></li>
          {isAdmin && <li><Link onClick={closeMenu} to="/customers/new" className={`nav-link ${isActive('/customers/new') ? 'active' : ''}`}>New Customer</Link></li>}
          
          {(isAdmin || true) && <hr style={{ margin: '1rem 1.5rem', border: 'none', borderTop: '1px solid var(--border-color)' }} />}
          
          {/* We can check if they have MANAGER role separately if we wanted, but for now we'll just show it or we can wrap Admin strictly */}
          <li><Link onClick={closeMenu} to="/manager" className={`nav-link ${isActive('/manager') ? 'active' : ''}`}>Manager Overview</Link></li>
          
          {isAdmin && (
            <li><Link onClick={closeMenu} to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>Admin / IT Sync</Link></li>
          )}
        </ul>
        <div style={{ padding: '1.5rem' }}>
          <button 
            onClick={() => {
              closeMenu();
              supabase.auth.signOut();
            }}
            style={{ width: '100%', padding: '0.75rem', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </nav>
    </>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth />;
  }

  return (
    <Router>
      <div className="layout">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/new" element={<NewCustomer />} />
            <Route path="/customers/:id" element={<Customers />} />
            <Route path="/customers/:id/order" element={<OrderBuilder />} />
            <Route path="/customers/:id/gallery" element={<CustomerGallery />} />
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/admin" element={<AdminSyncDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
