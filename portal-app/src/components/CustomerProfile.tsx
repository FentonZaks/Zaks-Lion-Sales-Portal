
import React from 'react';
import './../index.css';

export function CustomerProfile() {
    return (
        <div className="card">
            <h2 className="heading">Customer Profile</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <strong>Terms:</strong> Net 30
                </div>
                <div>
                    <strong>Open Balance:</strong> $1,250.00
                </div>
                <div>
                    <strong>Primary Contact:</strong> Jane Doe
                </div>
                <div>
                    <strong>Phone:</strong> (555) 123-4567
                </div>
            </div>
        </div>
    );
}
