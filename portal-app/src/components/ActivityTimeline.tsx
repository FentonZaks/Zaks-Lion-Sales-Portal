
import React from 'react';

export function ActivityTimeline() {
    return (
        <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2 className="heading">Activity Timeline</h2>
            <div style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: '1.5rem', marginLeft: '0.5rem' }}>
                <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.85rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-color)' }}></div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Today, 10:00 AM</div>
                    <strong>Store Visit</strong>
                    <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Discussed new fall lineup. Merchandising looks good.</p>
                </div>
            </div>
        </div>
    );
}
