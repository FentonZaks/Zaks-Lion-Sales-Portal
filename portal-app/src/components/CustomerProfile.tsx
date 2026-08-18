import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import './../index.css';

import { CategoryDistribution } from './CategoryDistribution';

export function CustomerProfile({ customerId }: { customerId: string }) {
    const [customer, setCustomer] = useState<any>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!customerId) return;
        
        async function fetchCustomerData() {
            setLoading(true);
            const { data: custData } = await supabase.from('customers').select('*').eq('id', customerId).single();
            const { data: locData } = await supabase.from('customer_locations').select('*').eq('customer_id', customerId);
            const { data: contactData } = await supabase.from('customer_contacts').select('*').eq('customer_id', customerId);
            
            setCustomer(custData);
            setLocations(locData || []);
            setContacts(contactData || []);
            setLoading(false);
        }

        fetchCustomerData();
    }, [customerId]);

    if (loading) {
        return <div className="card">Loading customer profile...</div>;
    }

    if (!customer) {
        return <div className="card">Customer not found.</div>;
    }

    const billingAddress = locations.find(l => !l.is_default_shipping);
    const shippingAddress = locations.find(l => l.is_default_shipping);

    return (
        <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="heading" style={{ margin: 0 }}>
                    {customer.name} <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 'normal' }}>({customer.net_suite_id})</span>
                </h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link to={`/customers/${customerId}/gallery`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                        View Gallery
                    </Link>
                    <Link to={`/customers/${customerId}/order`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                        New Draft Order
                    </Link>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                
                {/* Organization & Logistics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Organization</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div><strong>Subsidiary:</strong> {customer.subsidiary || 'N/A'}</div>
                            <div><strong>Banner:</strong> {customer.banner || 'N/A'}</div>
                            <div><strong>Currency:</strong> {customer.currency || 'N/A'}</div>
                            <div><strong>Channel:</strong> {customer.channel || 'N/A'}</div>
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Logistics & Territory</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div><strong>Sales Rep:</strong> {customer.salesrep || 'N/A'}</div>
                            <div><strong>Route:</strong> {customer.route || 'N/A'}</div>
                            <div><strong>Route Day:</strong> {customer.route_day || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                {/* Financials & History */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Financials</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div><strong>Terms:</strong> {customer.terms || 'N/A'}</div>
                            <div><strong>Price Level:</strong> {customer.price_level || 'N/A'}</div>
                            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                                <strong>MTD Revenue:</strong> <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{customer.mtd_revenue ? `$${customer.mtd_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}</span>
                            </div>
                            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                                <strong>Last Month Revenue:</strong> <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{customer.last_month_revenue ? `$${customer.last_month_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}</span>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <strong>YTD Revenue:</strong> <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{customer.ytd_revenue ? `$${customer.ytd_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}</span>
                            </div>
                            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                                <strong>Open Balance:</strong> <span style={{ color: customer.balance > 0 ? 'inherit' : 'green' }}>${(customer.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Sales History</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div><strong>Date Created:</strong> {customer.date_created ? new Date(customer.date_created).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}</div>
                            <div><strong>Last Sale:</strong> {customer.date_of_last_sale ? new Date(customer.date_of_last_sale).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}</div>
                            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                                <strong>Last Invoice:</strong> {customer.last_invoice_number || 'N/A'}
                            </div>
                            <div><strong>Inv Date:</strong> {customer.last_invoice_date ? new Date(customer.last_invoice_date).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}</div>
                            <div><strong>Inv Amount:</strong> {customer.last_invoice_amount ? `$${customer.last_invoice_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</div>
                            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                                <strong>Last CRM Activity:</strong> {customer.last_activity_date ? new Date(customer.last_activity_date).toLocaleDateString('en-US') : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Category Distribution */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <CategoryDistribution categoryLastInvoiceDates={customer.category_last_invoice_dates} />
                </div>

                {/* Locations */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Locations</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                            <strong>Billing Address</strong>
                            {billingAddress ? (
                                <div style={{ marginTop: '0.5rem' }}>
                                    {billingAddress.address_line_1} <br />
                                    {billingAddress.city}, {billingAddress.province} {billingAddress.postal_code}
                                </div>
                            ) : <div>No billing address found.</div>}
                        </div>
                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                            <strong>Shipping Address</strong>
                            {shippingAddress ? (
                                <div style={{ marginTop: '0.5rem' }}>
                                    {shippingAddress.address_line_1} <br />
                                    {shippingAddress.city}, {shippingAddress.province} {shippingAddress.postal_code}
                                </div>
                            ) : <div>No shipping address found.</div>}
                        </div>
                    </div>
                </div>

                {/* Contacts */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Primary Contact</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {contacts.length === 0 ? <div>No contacts found.</div> : contacts.map(contact => (
                            <div key={contact.id} style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                                <strong>{contact.first_name} {contact.last_name}</strong>
                                {contact.title && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{contact.title}</div>}
                                <div style={{ marginTop: '0.5rem' }}>📧 {contact.email || 'N/A'}</div>
                                <div>📞 {contact.phone || 'N/A'}</div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
