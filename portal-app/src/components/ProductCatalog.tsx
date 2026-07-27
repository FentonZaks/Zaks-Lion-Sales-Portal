
export function ProductCatalog() {
    return (
        <div className="card">
            <h2 className="heading">Product Catalog</h2>
            <input type="text" placeholder="Search SKU or Name..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <strong>SKU-1001: Premium Dark Chocolate (Master Case)</strong>
                    <div style={{ color: 'var(--text-secondary)' }}>Base Price: $45.00</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Est. Inventory: 120</div>
                    <button className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>Add to Order</button>
                </div>
            </div>
        </div>
    );
}
