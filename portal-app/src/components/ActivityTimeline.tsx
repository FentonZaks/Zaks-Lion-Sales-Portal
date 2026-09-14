import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function ActivityTimeline({ customerId }: { customerId: string }) {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!customerId) return;
        
        async function fetchActivities() {
            const { data } = await supabase
                .from('activities')
                .select('*, user_profiles(first_name, last_name)')
                .eq('customer_id', customerId)
                .order('activity_date', { ascending: false });
                
            setActivities(data || []);
            setLoading(false);
        }

        fetchActivities();
    }, [customerId]);

    async function handleViewPdf(path: string) {
        const { data, error } = await supabase.storage.from('draft-orders').createSignedUrl(path, 3600);
        if (error) {
            alert('Could not load PDF');
            console.error(error);
        } else if (data) {
            window.open(data.signedUrl, '_blank');
        }
    }

    return (
        <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2 className="heading">Activity Timeline</h2>
            
            {loading ? (
                <div>Loading timeline...</div>
            ) : activities.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>No activities logged yet.</div>
            ) : (
                <div style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: '1.5rem', marginLeft: '0.5rem' }}>
                    {activities.map(activity => (
                        <div key={activity.id} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-1.85rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-color)' }}></div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                {new Date(activity.activity_date).toLocaleString()}
                                {activity.user_profiles && ` • By ${activity.user_profiles.first_name || ''} ${activity.user_profiles.last_name || ''}`}
                            </div>
                            <strong>{activity.subject || activity.activity_type}</strong>
                            {activity.notes && (
                                <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                                    {activity.notes}
                                </p>
                            )}
                            {activity.attachment_url && (
                                <button 
                                    onClick={() => handleViewPdf(activity.attachment_url)}
                                    style={{
                                        marginTop: '0.5rem',
                                        padding: '4px 12px',
                                        background: 'var(--accent-color)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    📄 View Draft PDF
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
