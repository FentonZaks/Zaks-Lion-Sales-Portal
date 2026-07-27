
import React, { useState } from 'react';

export function OrderBuilder() {
    const [overrideMode, setOverrideMode] = useState(false);
    const [comment, setComment] = useState('');
    const [price, setPrice] = useState(45.00);

    const handleSubmit = () => {
        if (overrideMode && !comment) {
            alert('A comment is strictly required for price overrides.');
            return;
        }
        alert('Order submitted successfully!');
    };

    return (
        <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2 className="heading">Draft Order</h2>
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span>SKU-1001: Premium Dark Chocolate (Qty: 2)</span>
                    <span>
                        ${price.toFixed(2)} 
                        <button onClick={() => setOverrideMode(!overrideMode)} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}>Edit Price</button>
                    </span>
                </div>
                
                {overrideMode && (
                    <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', marginTop: '1rem' }}>
                        <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Price Override Required</div>
                        <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} style={{ marginBottom: '0.5rem', padding: '0.5rem', width: '100%' }} />
                        <textarea placeholder="Mandatory override reason..." value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
                    </div>
                )}
            </div>
            
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '2px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Subtotal (Freight Excluded)</span>
                    <span>${(price * 2).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'right' }}>* Plus all applicable taxes *</div>
            </div>
            
            <button className="btn btn-primary" onClick={handleSubmit} style={{ width: '100%', marginTop: '1.5rem' }}>Submit Order Request</button>
        </div>
    );
}
