import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Transaction {
    id: string;
    tranid: string;
    trandate: string;
    total: number;
    status_display: string;
}

interface TransactionsData {
    sales_orders: Transaction[];
    invoices: Transaction[];
}

export function CustomerTransactions({ netSuiteId }: { netSuiteId: string }) {
    const [data, setData] = useState<TransactionsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!netSuiteId) {
            setLoading(false);
            return;
        }

        async function fetchTransactions() {
            setLoading(true);
            setError(null);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (!token) throw new Error('Not authenticated');

                const res = await fetch(`/api/netsuite-transactions?action=get_transactions&customerId=${netSuiteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!res.ok) {
                    throw new Error('Failed to load transactions.');
                }
                const result = await res.json();
                if (result.error) throw new Error(result.error);
                
                setData(result);
            } catch (err: any) {
                console.error("Transactions Fetch Error:", err);
                setError("Could not load transactions from NetSuite.");
            } finally {
                setLoading(false);
            }
        }

        fetchTransactions();
    }, [netSuiteId]);

    const handleViewPdf = async (transactionId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('Not authenticated');

            const res = await fetch(`/api/netsuite-transactions?action=get_pdf&transactionId=${transactionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) {
                const errData = await res.json();
                console.error("PDF Error:", errData);
                alert("Could not load PDF: " + (errData.error || res.statusText));
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err: any) {
            console.error("View PDF Error:", err);
            alert("An error occurred while opening the PDF.");
        }
    };

    const formatCurrency = (val: number) => {
        return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', { timeZone: 'UTC' });
    };

    if (loading) {
        return <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Loading live transactions from NetSuite...</div>;
    }

    if (error) {
        return <div style={{ padding: '1rem', color: '#ff4b4b' }}>{error}</div>;
    }

    if (!data) return null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Open Sales Orders */}
            <div className="card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--primary-color)' }}>
                    Open Sales Orders
                </h3>
                {data.sales_orders.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No open sales orders.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {data.sales_orders.map(so => (
                            <div key={so.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                <div>
                                    <div style={{ fontWeight: '600' }}>#{so.tranid}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(so.trandate)} • {so.status_display}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(so.total)}</div>
                                    <button 
                                        onClick={() => handleViewPdf(so.id)}
                                        style={{ background: 'var(--accent-color)', color: '#fff', padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        View PDF
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Invoices */}
            <div className="card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--primary-color)' }}>
                    Recent Invoices
                </h3>
                {data.invoices.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No recent invoices.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {data.invoices.map(inv => (
                            <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                <div>
                                    <div style={{ fontWeight: '600' }}>#{inv.tranid}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(inv.trandate)} • {inv.status_display}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ fontWeight: 'bold' }}>{formatCurrency(inv.total)}</div>
                                    <button 
                                        onClick={() => handleViewPdf(inv.id)}
                                        style={{ background: 'var(--accent-color)', color: '#fff', padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        View PDF
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
