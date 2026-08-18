import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface FollowUp {
    id: string;
    title: string;
    description: string;
    due_date: string;
}

export function CustomerFollowUps({ customerId, onFollowUpCompleted }: { customerId: string, onFollowUpCompleted?: () => void }) {
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [loading, setLoading] = useState(true);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [completionNote, setCompletionNote] = useState('');
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUserId(data.session?.user.id || null);
        });
        fetchFollowUps();
    }, [customerId]);

    async function fetchFollowUps() {
        setLoading(true);
        const { data, error } = await supabase
            .from('follow_ups')
            .select('id, title, description, due_date')
            .eq('customer_id', customerId)
            .eq('status', 'PENDING')
            .order('due_date', { ascending: true });
        
        if (!error && data) {
            setFollowUps(data);
        } else if (error) {
            console.error('Error fetching follow-ups:', error);
        }
        setLoading(false);
    }

    const handleComplete = async (followUp: FollowUp) => {
        if (!userId) return;
        
        const { error: updateError } = await supabase
            .from('follow_ups')
            .update({ 
                status: 'COMPLETED', 
                completed_at: new Date().toISOString(),
                completion_note: completionNote || 'Completed without notes'
            })
            .eq('id', followUp.id);

        if (updateError) {
            console.error('Error completing follow-up:', updateError);
            alert('Failed to complete follow-up');
            return;
        }

        // Create an activity for closing the follow-up
        const { error: activityError } = await supabase
            .from('activities')
            .insert({
                customer_id: customerId,
                user_id: userId,
                activity_type: 'NOTE',
                subject: `Closed Follow-up: ${followUp.title}`,
                notes: completionNote || 'Completed without notes'
            });

        if (activityError) {
            console.error('Error creating activity from follow-up:', activityError);
        }

        setCompletingId(null);
        setCompletionNote('');
        
        if (onFollowUpCompleted) {
            onFollowUpCompleted();
        } else {
            window.location.reload();
        }
    };

    if (loading) return <div>Loading follow-ups...</div>;
    
    if (followUps.length === 0) return null; // Don't show if no pending follow-ups

    return (
        <div className="card" style={{ marginTop: '1.5rem', borderLeft: '4px solid #ef4444' }}>
            <h2 className="heading" style={{ color: '#ef4444' }}>Action Required: Open Follow-ups</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {followUps.map(followUp => {
                    const isOverdue = new Date(followUp.due_date) < new Date();
                    return (
                        <div key={followUp.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <strong style={{ fontSize: '1.1rem' }}>{followUp.title}</strong>
                                <span style={{ color: isOverdue ? '#ef4444' : 'inherit', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                                    Due: {new Date(followUp.due_date).toLocaleDateString('en-US')}
                                </span>
                            </div>
                            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>
                                {followUp.description}
                            </p>
                            
                            {completingId === followUp.id ? (
                                <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Completion Notes (Required)</label>
                                    <textarea 
                                        placeholder="What was the outcome?" 
                                        value={completionNote}
                                        onChange={(e) => setCompletionNote(e.target.value)}
                                        style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}
                                    />
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button 
                                            className="btn btn-primary" 
                                            onClick={() => handleComplete(followUp)}
                                            disabled={!completionNote.trim()}
                                        >
                                            Mark as Complete
                                        </button>
                                        <button 
                                            className="btn btn-secondary" 
                                            onClick={() => {
                                                setCompletingId(null);
                                                setCompletionNote('');
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ borderColor: '#22c55e', color: '#22c55e' }}
                                    onClick={() => setCompletingId(followUp.id)}
                                >
                                    Complete Follow-up
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
