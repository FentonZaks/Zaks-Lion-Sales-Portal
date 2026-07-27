
import './../index.css';

export function RepPerformanceWidget() {
    return (
        <div style={{ padding: '1.5rem', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>My Monthly Progress</h3>
            
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <span>Sales Target</span>
                    <strong>75%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '75%', height: '100%', background: 'var(--accent-color)' }}></div>
                </div>
            </div>

            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <span>Visit Quota</span>
                    <strong>12 / 20</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '60%', height: '100%', background: '#10b981' }}></div>
                </div>
            </div>
        </div>
    );
}
