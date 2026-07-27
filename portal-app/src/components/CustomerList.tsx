
import React from 'react';
import './../index.css';

export function CustomerList() {
    return (
        <div className="card">
            <h2 className="heading">Assigned Customers</h2>
            <input type="text" placeholder="Search customers..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <strong>Acme Corp (Store #102)</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Balance: $1,250.00</div>
                </div>
            </div>
        </div>
    );
}
