
import React from 'react';

export function FollowUpList() {
    return (
        <div className="card">
            <h2 className="heading">Follow-ups Due</h2>
            <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                <strong>Send updated pricing catalog</strong>
                <div style={{ fontSize: '0.875rem', color: '#ef4444' }}>Overdue: 2 days</div>
            </div>
        </div>
    );
}
