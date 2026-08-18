import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import './../index.css';

declare type Order = {
    id: string;
    subtotal: number;
    user_id: string;
    customer_id: string;
    status: string;
    created_at: string;
};

declare type Customer = {
    id: string;
    salesrep: string | null;
    mtd_revenue: number | null;
    last_month_revenue: number | null;
};

declare type Activity = {
    id: string;
    user_id: string;
    customer_id: string;
    activity_type: string;
    activity_date: string;
};

declare type User = {
    id: string;
    first_name: string | null;
    last_name: string | null;
};

interface RepGroup {
    repName: string;
    portalMtd: number;
    netSuiteMtd: number;
    visitors: Visitor[];
}

interface Visitor {
    id: string;
    name: string;
    visits: number;
    calls: number;
    completedFollowUps: number;
    portalMtd: number;
}

export function ManagerDashboard() {
    const [loading, setLoading] = useState(true);
    const [repGroups, setRepGroups] = useState<RepGroup[]>([]);
    const [debugInfo, setDebugInfo] = useState<{totalActivities: number, unassignedActivities: number, unassignedDetails: string[]}>({ totalActivities: 0, unassignedActivities: 0, unassignedDetails: [] });

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

    const previousMonthDate = new Date();
    previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
    const isPreviousMonth = previousMonthDate.getFullYear() === year && previousMonthDate.getMonth() === month;

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // ---------- 1️⃣ Date helpers ----------
                const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
                const isoStart = startOfMonth.toISOString();
                
                const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
                const isoEnd = endOfMonth.toISOString();

                // ---------- 2️⃣ Pull core tables ----------
                const fetchAllCustomers = async () => {
                    let allCustomers: any[] = [];
                    let from = 0;
                    const step = 1000;
                    while (true) {
                        const { data } = await supabase.from('customers').select('id, salesrep, mtd_revenue, last_month_revenue').range(from, from + step - 1);
                        if (!data || data.length === 0) break;
                        allCustomers = allCustomers.concat(data);
                        if (data.length < step) break;
                        from += step;
                    }
                    return allCustomers;
                };

                const [
                    { data: orders },
                    customers,
                    { data: activities },
                    { data: users }
                ] = await Promise.all([
                    supabase.from('orders').select('id, subtotal, user_id, customer_id, status, created_at').gte('created_at', isoStart).lte('created_at', isoEnd),
                    fetchAllCustomers(),
                    supabase.from('activities').select('id, user_id, customer_id, activity_type, activity_date').gte('activity_date', isoStart).lte('activity_date', isoEnd),
                    supabase.from('user_profiles').select('id, first_name, last_name')
                ]);

                // ---------- 3️⃣ Build lookup maps ----------
                const customerMap: Record<string, Customer> = {};
                (customers || []).forEach(c => (customerMap[c.id] = c as Customer));

                const userMap: Record<string, string> = {};
                (users || []).forEach(u => {
                    const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
                    userMap[u.id] = full || 'Unknown';
                });
                const totalActivities = activities ? activities.length : 0;
                const unassignedDetails: string[] = [];
                
                // Keep track of which activities are unassigned
                const unassignedActivitiesList = (activities || []).filter((a: Activity) => {
                    const cust = customerMap[a.customer_id];
                    return !cust || !cust.salesrep;
                });

                // Fetch missing customers explicitly to get their NetSuite IDs
                for (const a of unassignedActivitiesList) {
                    const cust = customerMap[a.customer_id];
                    if (!cust) {
                        // Customer missing from map - could be > 1000 limit or deleted
                        const { data: missingCust } = await supabase.from('customers').select('net_suite_id, name').eq('id', a.customer_id).single();
                        if (missingCust) {
                            unassignedDetails.push(`Type: ${a.activity_type}, Name: ${missingCust.name}, NetSuite ID: ${missingCust.net_suite_id}, Reason: Not in initial 1000 customers load`);
                        } else {
                            unassignedDetails.push(`Type: ${a.activity_type}, Supabase ID: ${a.customer_id}, Reason: Customer completely deleted from Supabase`);
                        }
                    } else if (!cust.salesrep) {
                        // Customer found but no salesrep
                        const { data: noRepCust } = await supabase.from('customers').select('net_suite_id, name').eq('id', a.customer_id).single();
                        unassignedDetails.push(`Type: ${a.activity_type}, Name: ${noRepCust?.name || 'Unknown'}, NetSuite ID: ${noRepCust?.net_suite_id || 'Unknown'}, Reason: No Rep Assigned`);
                    }
                }

                const unassignedActivities = unassignedActivitiesList.length;
                setDebugInfo({ totalActivities, unassignedActivities, unassignedDetails });

                // ---------- 4️⃣ Calculate per‑rep Portal MTD (sum of orders for customers belonging to that rep) ----------
                const repPortalTotals: Record<string, number> = {};
                const repNetSuiteTotals: Record<string, number> = {};

                (orders || []).forEach((o: Order) => {
                    const cust = customerMap[o.customer_id];
                    if (!cust || !cust.salesrep) return;
                    // only include orders created this month (already filtered by created_at)
                    // we consider any status except DRAFT as revenue – adjust if needed
                    if (['DRAFT'].includes(o.status)) return;
                    repPortalTotals[cust.salesrep] = (repPortalTotals[cust.salesrep] || 0) + (o.subtotal || 0);
                });

                // NetSuite MTD is stored directly on the customer record (sum across all customers for a rep)
                (customers || []).forEach(c => {
                    if (c.salesrep) {
                        if (!repNetSuiteTotals[c.salesrep]) repNetSuiteTotals[c.salesrep] = 0;
                        const monthDiff = (now.getFullYear() - year) * 12 + (now.getMonth() - month);
                        if (monthDiff === 0) {
                            // Current month: use MTD revenue
                            repNetSuiteTotals[c.salesrep] += (c.mtd_revenue || 0);
                        } else if (monthDiff === 1) {
                            // Previous month: use last month revenue, fallback to MTD if missing
                            repNetSuiteTotals[c.salesrep] += (c.last_month_revenue ?? c.mtd_revenue ?? 0);
                        } else {
                            // Other months: use last month revenue if available, otherwise MTD
                            repNetSuiteTotals[c.salesrep] += (c.last_month_revenue ?? c.mtd_revenue ?? 0);
                        }
                    }
                });
                
                // ---------- 5️⃣ Visitor (user) stats ----------
                const visitorMap: Record<string, Visitor> = {};
                // First, compute portal MTD per user (all orders they created this month)
                const userPortalTotals: Record<string, number> = {};
                (orders || []).forEach((o: Order) => {
                    if (['DRAFT'].includes(o.status)) return;
                    userPortalTotals[o.user_id] = (userPortalTotals[o.user_id] || 0) + (o.subtotal || 0);
                });

                // Then process visits to associate a user with a sales rep based on the customer they visited
                (activities || []).forEach((a: Activity) => {
                    const cust = customerMap[a.customer_id];
                    const repName = (cust && cust.salesrep) ? cust.salesrep : 'Unassigned';
                    
                    const userId = a.user_id;
                    const visitorKey = `${repName}|${userId}`; // unique per rep+user
                    if (!visitorMap[visitorKey]) {
                        visitorMap[visitorKey] = {
                            id: userId,
                            name: userMap[userId] || 'Unknown',
                            visits: 0,
                            calls: 0,
                            completedFollowUps: 0,
                            portalMtd: userPortalTotals[userId] || 0
                        };
                    }
                    if (a.activity_type === 'VISIT') {
                        visitorMap[visitorKey].visits += 1;
                    } else if (a.activity_type === 'CALL') {
                        visitorMap[visitorKey].calls += 1;
                    } else if (a.activity_type === 'NOTE') {
                        visitorMap[visitorKey].completedFollowUps += 1;
                    }
                });

                // ---------- 6️⃣ Assemble hierarchy ----------
                const repGroupsTmp: Record<string, RepGroup> = {};
                // Initialise groups from portal totals (ensures reps with only NetSuite data appear)
                const allRepNames = new Set<string>([
                    ...Object.keys(repPortalTotals),
                    ...Object.keys(repNetSuiteTotals)
                ]);
                allRepNames.forEach(rep => {
                    repGroupsTmp[rep] = {
                        repName: rep,
                        portalMtd: repPortalTotals[rep] || 0,
                        netSuiteMtd: repNetSuiteTotals[rep] || 0,
                        visitors: []
                    };
                });

                // Populate visitors
                Object.entries(visitorMap).forEach(([key, visitor]) => {
                    const [repName] = key.split('|');
                    if (!repGroupsTmp[repName]) {
                        repGroupsTmp[repName] = {
                            repName: repName,
                            portalMtd: repPortalTotals[repName] || 0,
                            netSuiteMtd: repNetSuiteTotals[repName] || 0,
                            visitors: []
                        };
                    }
                    repGroupsTmp[repName].visitors.push(visitor);
                });

                // Sort reps alphabetically; visitors sorted by visits descending
                const sortedGroups = Object.values(repGroupsTmp).sort((a, b) => a.repName.localeCompare(b.repName));
                sortedGroups.forEach(g => g.visitors.sort((a, b) => b.visits - a.visits));

                setRepGroups(sortedGroups);
            } catch (err) {
                console.error('Error loading manager dashboard:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [selectedMonth]);

    const formatCurrency = (val: number) =>
        `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (loading) {
        return (
            <div className="card" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '4rem' }}>
                <Loader2 size={48} className="spin" style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading real‑time metrics…</p>
            </div>
        );
    }

    // Global summary calculations
    const globalPortalMtd = repGroups.reduce((sum, g) => sum + g.portalMtd, 0);
    const globalNetSuiteMtd = repGroups.reduce((sum, g) => sum + g.netSuiteMtd, 0);
    const globalVisits = repGroups.reduce((sum, g) => sum + g.visitors.reduce((v, u) => v + u.visits, 0), 0);
    const globalCalls = repGroups.reduce((sum, g) => sum + g.visitors.reduce((v, u) => v + u.calls, 0), 0);
    const globalFollowUps = repGroups.reduce((sum, g) => sum + g.visitors.reduce((v, u) => v + u.completedFollowUps, 0), 0);

    return (
        <div className="card" style={{ marginTop: '1.5rem' }}>
            <div style={{ background: '#332200', color: '#ffb703', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                Debug: Total Activities Logged: {debugInfo.totalActivities} | Unassigned Activities: {debugInfo.unassignedActivities}
                {debugInfo.unassignedDetails.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                        <strong>Unassigned Details:</strong>
                        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                            {debugInfo.unassignedDetails.map((detail, idx) => (
                                <li key={idx}>{detail}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="heading" style={{ margin: 0 }}>National Sales Overview</h2>
                <div>
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                {/* Portal MTD */}
                <div style={{ padding: '1.5rem 1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{formatCurrency(globalPortalMtd)}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Portal MTD Sales</div>
                </div>
                {/* NetSuite MTD */}
                <div style={{ padding: '1.5rem 1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', opacity: isCurrentMonth || isPreviousMonth ? 1 : 0.5 }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{formatCurrency(globalNetSuiteMtd)}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>NetSuite {isCurrentMonth ? 'MTD Sales' : (isPreviousMonth ? 'Last Month Sales' : 'Sales (N/A)')}</div>
                </div>
                {/* Visits Logged */}
                <div style={{ padding: '1.5rem 1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{globalVisits}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Store Visits</div>
                </div>
                {/* Calls Logged */}
                <div style={{ padding: '1.5rem 1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{globalCalls}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Phone Calls</div>
                </div>
                {/* Completed Follow Ups */}
                <div style={{ padding: '1.5rem 1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{globalFollowUps}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Follow-ups Completed</div>
                </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Sales Representative Performance</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {repGroups.map(rep => (
                    <div key={rep.repName} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                        {/* Rep Header */}
                        <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', alignItems: 'center', background: 'var(--bg-color)' }}>
    <div style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{rep.repName}</div>

                            <div style={{ textAlign: 'right', fontWeight: '500' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Portal MTD</div>
                                {formatCurrency(rep.portalMtd)}
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: '500', opacity: isCurrentMonth || isPreviousMonth ? 1 : 0.5 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>NetSuite MTD</div>
                                {formatCurrency(rep.netSuiteMtd)}
                            </div>
                        </div>
                        {/* Visitor sub‑header */}
                        {rep.visitors.length > 0 && (
                            <div style={{ padding: '0.5rem 1rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', background: 'var(--bg-color)', opacity: 0.7, marginLeft: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                <div>User</div>
                                <div style={{ textAlign: 'right' }}>Portal Sales</div>
                                <div style={{ textAlign: 'right' }}>Visits</div>
                                <div style={{ textAlign: 'right' }}>Calls</div>
                                <div style={{ textAlign: 'right' }}>Follow-ups</div>
                            </div>
                        )}
                        {/* Visitor rows */}
                        {rep.visitors.map(v => (
                            <div key={v.id} style={{ padding: '0.75rem 1rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', background: 'var(--bg-color)', opacity: 0.85, marginLeft: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{v.name}</div>
                                <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>{formatCurrency(v.portalMtd)}</div>
                                <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>{v.visits}</div>
                                <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>{v.calls}</div>
                                <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>{v.completedFollowUps}</div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
