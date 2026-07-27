
import React from 'react';

export function OrderHistory() {
    return (
        <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2 className="heading">Sales History (Last 2 Years)</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>Date</th>
                        <th style={{ padding: '0.5rem' }}>Order #</th>
                        <th style={{ padding: '0.5rem' }}>Total</th>
                        <th style={{ padding: '0.5rem' }}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.5rem' }}>2025-10-12</td>
                        <td style={{ padding: '0.5rem' }}>SO-9921</td>
                        <td style={{ padding: '0.5rem' }}>$450.00</td>
                        <td style={{ padding: '0.5rem', color: 'green' }}>Fulfilled</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
