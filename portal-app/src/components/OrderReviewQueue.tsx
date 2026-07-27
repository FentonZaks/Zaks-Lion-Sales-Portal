
export function OrderReviewQueue() {
    return (
        <div className="card">
            <h2 className="heading">Pending Review Queue</h2>
            <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Order REQ-1004 (Acme Corp)</strong>
                    <span>Rep: John Smith</span>
                </div>
                <div style={{ marginTop: '0.5rem', color: '#b45309', fontWeight: 'bold' }}>Includes Price Overrides</div>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary">Approve</button>
                    <button className="btn">Reject</button>
                </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }}>Generate Batch CSV for NetSuite</button>
        </div>
    );
}
