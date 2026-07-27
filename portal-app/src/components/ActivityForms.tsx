
export function ActivityForms() {
    return (
        <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2 className="heading">Log Activity</h2>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button className="btn btn-primary">Log Visit</button>
                <button className="btn" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>Log Call</button>
            </div>
            <textarea placeholder="Enter notes..." style={{ width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}></textarea>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Save Activity</button>
        </div>
    );
}
