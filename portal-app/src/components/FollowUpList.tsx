import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

interface FollowUp {
    id: string;
    title: string;
    description: string;
    due_date: string;
    customer: {
        id: string;
        name: string;
    };
}

export function FollowUpList() {
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFollowUps();
    }, []);

    async function fetchFollowUps() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user is Admin/Manager to see all, otherwise see own
        const { data: roles } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', user.id);
        
        const hasAdminRole = roles?.some(r => r.roles?.name === 'ADMIN' || r.roles?.name === 'MANAGER');
        
        let query = supabase
            .from('follow_ups')
            .select(`
                id,
                title,
                description,
                due_date,
                customers (id, name)
            `)
            .eq('status', 'PENDING')
            .order('due_date', { ascending: true });

        if (!hasAdminRole) {
            query = query.eq('assigned_to', user.id);
        }

        const { data, error } = await query;
        
        if (!error && data) {
            // Map the nested join syntax
            const mapped = data.map((item: any) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                due_date: item.due_date,
                customer: item.customers
            }));
            setFollowUps(mapped);
        }
        setLoading(false);
    }

    if (loading) return <div className="card"><h2 className="heading">Follow-ups Due</h2><div>Loading...</div></div>;

    return (
        <div className="card">
            <h2 className="heading">Follow-ups Due</h2>
            {followUps.length === 0 ? (
                <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>You have no open follow-ups.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {followUps.map(item => {
                        const isOverdue = new Date(item.due_date) < new Date(new Date().setHours(0,0,0,0));
                        return (
                            <Link to={`/customers/${item.customer?.id}`} key={item.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ 
                                    padding: '1rem', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: '8px', 
                                    borderLeft: `4px solid ${isOverdue ? '#ef4444' : '#f59e0b'}`,
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong>{item.title}</strong>
                                        <div style={{ fontSize: '0.875rem', color: isOverdue ? '#ef4444' : '#f59e0b', fontWeight: '500' }}>
                                            {isOverdue ? 'Overdue' : 'Upcoming'}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        {item.customer?.name}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                        Due: {new Date(item.due_date).toLocaleDateString('en-US')}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
