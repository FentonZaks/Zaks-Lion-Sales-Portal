import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function FollowUpForm({ customerId, onFollowUpCreated }: { customerId: string, onFollowUpCreated?: () => void }) {
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [salesReps, setSalesReps] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        checkUserAndRoles();
    }, []);

    async function checkUserAndRoles() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        setAssignedTo(user.id); // Default to self

        const { data: roles } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', user.id);
        
        const hasAdminRole = roles?.some(r => r.roles?.name === 'ADMIN' || r.roles?.name === 'MANAGER');
        setIsAdmin(!!hasAdminRole);

        if (hasAdminRole) {
            // Fetch all sales reps
            const { data: profiles } = await supabase
                .from('user_profiles')
                .select('id, first_name, last_name, email')
                .eq('is_active', true);
            
            if (profiles) {
                setSalesReps(profiles.map(p => ({
                    id: p.id,
                    name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || p.id
                })));
            }
        }
    }

    const handleSave = async () => {
        if (!title.trim() || !notes.trim() || !dueDate || !userId || !customerId) return;
        setLoading(true);

        const { error } = await supabase.from('follow_ups').insert({
            customer_id: customerId,
            assigned_to: assignedTo,
            title: title,
            description: notes,
            due_date: new Date(dueDate).toISOString(),
            status: 'PENDING'
        });

        if (!error) {
            setTitle('');
            setNotes('');
            setDueDate('');
            if (onFollowUpCreated) {
                onFollowUpCreated();
            } else {
                window.location.reload(); 
            }
        } else {
            console.error(error);
            alert('Failed to schedule follow-up');
        }
        setLoading(false);
    };

    return (
        <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2 className="heading">Schedule Follow-up</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {isAdmin && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Assign To</label>
                        <select 
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        >
                            {salesReps.map(rep => (
                                <option key={rep.id} value={rep.id}>{rep.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Title <span style={{color: 'red'}}>*</span></label>
                    <input 
                        type="text" 
                        placeholder="e.g. Call to discuss Q3 pricing" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Due Date <span style={{color: 'red'}}>*</span></label>
                    <input 
                        type="date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Notes <span style={{color: 'red'}}>*</span></label>
                    <textarea 
                        placeholder="Enter follow-up details..." 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{ width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    />
                </div>

                <button 
                    className="btn btn-primary" 
                    onClick={handleSave}
                    disabled={loading || !title.trim() || !notes.trim() || !dueDate}
                >
                    {loading ? 'Scheduling...' : 'Schedule Follow-up'}
                </button>
            </div>
        </div>
    );
}
