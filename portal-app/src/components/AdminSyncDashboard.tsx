
import './../index.css';

export function AdminSyncDashboard() {
    return (
        <div className="card" style={{ marginTop: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
            <h2 className="heading">Admin Control Center</h2>
            
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>NetSuite Synchronization Status</h3>
                <div style={{ padding: '1rem', background: '#ecfdf5', borderRadius: '8px', color: '#065f46', border: '1px solid #a7f3d0' }}>
                    <strong>System Healthy</strong>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Last successful sync: 12 minutes ago</div>
                </div>
            </div>

            <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Email Whitelist Configuration</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input type="text" placeholder="user@gmail.com" style={{ flexGrow: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Authorize</button>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    * Users not explicitly added here will be blocked by the database trigger upon signup attempt.
                </div>
            </div>
        </div>
    );
}
