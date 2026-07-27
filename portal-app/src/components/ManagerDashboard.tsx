
import './../index.css';

export function ManagerDashboard() {
    return (
        <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2 className="heading">National Sales Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>$124,500</div>
                    <div style={{ color: 'var(--text-secondary)' }}>MTD Sales Value</div>
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>142</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Visits Logged</div>
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>28</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Active Overrides</div>
                </div>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Top Performers</h3>
            <div style={{ borderLeft: '4px solid var(--accent-color)', paddingLeft: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>John Smith (West)</strong>
                    <span>$45,200</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Sarah Jenkins (East)</strong>
                    <span>$38,950</span>
                </div>
            </div>
        </div>
    );
}
