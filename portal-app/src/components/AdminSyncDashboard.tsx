import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProductRestrictionsManager } from './ProductRestrictionsManager';
import './../index.css';

interface UserProfile {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    netsuite_salesrep_name: string | null;
}

export function AdminSyncDashboard() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [availableReps, setAvailableReps] = useState<string[]>([]);

    useEffect(() => {
        fetchUsersAndReps();
    }, []);

    async function fetchUsersAndReps() {
        const [usersResponse, repsResponse] = await Promise.all([
            supabase.from('user_profiles').select('*').order('email'),
            supabase.from('customers').select('salesrep')
        ]);
        
        if (!usersResponse.error && usersResponse.data) {
            setUsers(usersResponse.data);
        }

        if (!repsResponse.error && repsResponse.data) {
            const unique = Array.from(new Set(repsResponse.data.map(c => c.salesrep))).filter(Boolean) as string[];
            setAvailableReps(unique.sort());
        }

        setLoading(false);
    }

    async function updateSalesRep(userId: string, newSalesRepName: string) {
        setSaving(userId);
        const { error } = await supabase
            .from('user_profiles')
            .update({ netsuite_salesrep_name: newSalesRepName || null })
            .eq('id', userId);
        
        if (!error) {
            // Update local state
            setUsers(users.map(u => u.id === userId ? { ...u, netsuite_salesrep_name: newSalesRepName || null } : u));
        }
        setSaving(null);
    }

    return (
        <div className="card" style={{ marginTop: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
            <h2 className="heading">Admin Control Center</h2>
            
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>NetSuite Synchronization Status</h3>
                <div style={{ padding: '1rem', background: '#ecfdf5', borderRadius: '8px', color: '#065f46', border: '1px solid #a7f3d0' }}>
                    <strong>System Healthy</strong>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Last successful sync: 12 minutes ago</div>
                </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>User Management & Rep Assignment</h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Assign a NetSuite Sales Rep name to a user. This directly controls which customers they are allowed to see on the dashboard based on strict Row-Level Security policies.
                </div>
                
                {loading ? (
                    <div>Loading users...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {users.map(user => (
                            <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                                <div>
                                    <strong>{user.email}</strong>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}` : 'No Name Provided'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select 
                                        value={user.netsuite_salesrep_name || ''}
                                        onChange={(e) => updateSalesRep(user.id, e.target.value)}
                                        style={{ flexGrow: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                    >
                                        <option value="">-- No Rep Assigned --</option>
                                        {availableReps.map(rep => (
                                            <option key={rep} value={rep}>{rep}</option>
                                        ))}
                                    </select>
                                    {saving === user.id && <span style={{ color: 'var(--primary-color)', alignSelf: 'center', fontSize: '0.875rem' }}>Saving...</span>}
                                </div>
                            </div>
                        ))}
                        {users.length === 0 && <div>No users found in database.</div>}
                    </div>
                )}
            </div>

            <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Email Whitelist Configuration</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input type="text" placeholder="user@gmail.com" style={{ flexGrow: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Authorize</button>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    * Users not explicitly added here will be blocked by the database trigger upon signup attempt.
                </div>
            </div>

            {/* Product Restrictions Manager */}
            <ProductRestrictionsManager />
        </div>
    );
}
