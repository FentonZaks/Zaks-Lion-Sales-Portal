import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function ActivityForms({ customerId }: { customerId: string }) {
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [activityType, setActivityType] = useState<'VISIT' | 'CALL'>('VISIT');
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUserId(data.session?.user.id || null);
        });
    }, []);

    const handleSave = async () => {
        if (!notes.trim() || !userId || !customerId) return;
        setLoading(true);

        const { error } = await supabase.from('activities').insert({
            customer_id: customerId,
            user_id: userId,
            activity_type: activityType,
            notes: notes,
            subject: activityType === 'VISIT' ? 'Site Visit' : 'Phone Call'
        });

        if (!error) {
            setNotes('');
            // Normally we would trigger a refresh of the timeline here, e.g., via a callback or context
            // But for this simplified demo, a page refresh or component unmount/mount works.
            window.location.reload(); 
        } else {
            console.error(error);
            alert('Failed to save activity');
        }
        setLoading(false);
    };

    return (
        <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2 className="heading">Log Activity</h2>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button 
                  className={`btn ${activityType === 'VISIT' ? 'btn-primary' : ''}`} 
                  style={activityType !== 'VISIT' ? { background: 'var(--bg-color)', border: '1px solid var(--border-color)' } : {}}
                  onClick={() => setActivityType('VISIT')}
                >
                  Log Visit
                </button>
                <button 
                  className={`btn ${activityType === 'CALL' ? 'btn-primary' : ''}`} 
                  style={activityType !== 'CALL' ? { background: 'var(--bg-color)', border: '1px solid var(--border-color)' } : {}}
                  onClick={() => setActivityType('CALL')}
                >
                  Log Call
                </button>
            </div>
            <textarea 
                placeholder="Enter notes..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
            />
            <button 
                className="btn btn-primary" 
                style={{ marginTop: '1rem' }}
                onClick={handleSave}
                disabled={loading || !notes.trim()}
            >
                {loading ? 'Saving...' : 'Save Activity'}
            </button>
        </div>
    );
}
