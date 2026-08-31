import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function NewCustomer() {
    const navigate = useNavigate();
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        legal_name: '',
        shipping_address: '',
        shipping_city: '',
        shipping_postal_code: '',
        shipping_country: '',
        banner: '',
        channel: '',
        price_level: '',
        sales_rep: '',
        primary_first_name: '',
        primary_last_name: '',
        primary_email: '',
        primary_phone: '',
        ap_name: '',
        ap_email: '',
        ap_phone: ''
    });

    // Dropdown options fetched from existing customers
    const [options, setOptions] = useState({
        banners: [] as string[],
        channels: [] as string[],
        priceLevels: [] as string[],
        salesReps: [] as string[]
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchOptions() {
            setLoading(true);
            
            // We fetch the distinct values from the customers table
            // Because PostgREST doesn't support SELECT DISTINCT directly without an RPC, 
            // we will just fetch them and unique them in JS.
            const { data, error } = await supabase
                .from('customers')
                .select('banner, channel, price_level, salesrep');
                
            if (error) {
                console.error("Error fetching options:", error);
            } else if (data) {
                const uniqueBanners = Array.from(new Set(data.map(d => d.banner).filter(Boolean))).sort();
                const uniqueChannels = Array.from(new Set(data.map(d => d.channel).filter(Boolean))).sort();
                const uniquePriceLevels = Array.from(new Set(data.map(d => d.price_level).filter(Boolean))).sort();
                const uniqueSalesReps = Array.from(new Set(data.map(d => d.salesrep).filter(Boolean))).sort();

                setOptions({
                    banners: uniqueBanners,
                    channels: uniqueChannels,
                    priceLevels: uniquePriceLevels,
                    salesReps: uniqueSalesReps
                });
            }
            setLoading(false);
        }

        fetchOptions();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const { error: insertError } = await supabase
            .from('pending_customers')
            .insert(formData);

        if (insertError) {
            setError(insertError.message);
            setSubmitting(false);
        } else {
            // Redirect back to customers list
            navigate('/customers');
        }
    };

    if (loading) {
        return <div className="card">Loading form...</div>;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="heading" style={{ margin: 0 }}>Create New Customer</h1>
                <button type="button" onClick={() => navigate('/customers')} className="btn btn-secondary">Cancel</button>
            </div>

            {error && (
                <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* General Info */}
                <section>
                    <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>General Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Company Name (NetSuite) *</label>
                            <input required name="name" value={formData.name} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Legal Company Name</label>
                            <input name="legal_name" value={formData.legal_name} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                        </div>
                    </div>
                </section>

                {/* Logistics & Accounting */}
                <section>
                    <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Logistics & Accounting</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Shipping Address</label>
                            <input name="shipping_address" value={formData.shipping_address} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>City</label>
                            <input name="shipping_city" value={formData.shipping_city} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Postal Code</label>
                            <input name="shipping_postal_code" value={formData.shipping_postal_code} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Country</label>
                            <input name="shipping_country" value={formData.shipping_country} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                        </div>
                    </div>
                </section>

                {/* Categorization */}
                <section>
                    <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Categorization</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Banner</label>
                            <select name="banner" value={formData.banner} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                                <option value="">Select a Banner...</option>
                                {options.banners.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Channel</label>
                            <select name="channel" value={formData.channel} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                                <option value="">Select a Channel...</option>
                                {options.channels.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Price Level</label>
                            <select name="price_level" value={formData.price_level} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                                <option value="">Select a Price Level...</option>
                                {options.priceLevels.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Sales Rep</label>
                            <select name="sales_rep" value={formData.sales_rep} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                                <option value="">Select a Sales Rep...</option>
                                {options.salesReps.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                </section>

                {/* Contacts */}
                <section>
                    <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Contacts</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        
                        {/* Primary Contact */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Primary Contact</h4>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>First Name</label>
                                <input name="primary_first_name" value={formData.primary_first_name} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Last Name</label>
                                <input name="primary_last_name" value={formData.primary_last_name} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
                                <input type="email" name="primary_email" value={formData.primary_email} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Phone</label>
                                <input name="primary_phone" value={formData.primary_phone} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                            </div>
                        </div>

                        {/* AP Contact */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '2rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Accounts Payable</h4>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Name</label>
                                <input name="ap_name" value={formData.ap_name} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
                                <input type="email" name="ap_email" value={formData.ap_email} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Phone</label>
                                <input name="ap_phone" value={formData.ap_phone} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                            </div>
                        </div>
                    </div>
                </section>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
                        {submitting ? 'Submitting...' : 'Create Customer Request'}
                    </button>
                </div>
            </form>
        </div>
    );
}
