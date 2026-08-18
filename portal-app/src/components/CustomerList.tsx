import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

import './../index.css';

interface Customer {
  id: string;
  net_suite_id: string;
  name: string;
  balance: number;
  mtd_revenue?: number;
  ytd_revenue?: number;
  last_invoice_date?: string;
  banner?: string;
  last_activity_date?: string;
  follow_ups?: { id: string, status: string }[];
}

export function CustomerList() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedRep, setSelectedRep] = useState<string>('');
    const [availableReps, setAvailableReps] = useState<string[]>([]);
    
    // Sorting and Filtering
    const [sortColumn, setSortColumn] = useState<string>('ytd_revenue');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [bannerFilter, setBannerFilter] = useState<string>('');
    const [availableBanners, setAvailableBanners] = useState<string[]>([]);

    const [limit, setLimit] = useState(25);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        checkAdminStatus();
        fetchBanners();
    }, []);

    useEffect(() => {
      // Reset limit when search or filters change
      setLimit(25);
    }, [search, selectedRep, bannerFilter, sortColumn, sortDirection]);

    useEffect(() => {
      const delayDebounceFn = setTimeout(() => {
        fetchCustomers(search, selectedRep, bannerFilter, sortColumn, sortDirection, limit);
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    }, [search, selectedRep, bannerFilter, sortColumn, sortDirection, limit]);

    async function fetchBanners() {
        const { data: banners } = await supabase
            .from('customers')
            .select('banner')
            .not('banner', 'is', null);
        
        if (banners) {
            const uniqueBanners = Array.from(new Set(banners.map(b => b.banner as string)));
            setAvailableBanners(uniqueBanners.sort());
        }
    }

    async function checkAdminStatus() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user is Admin/Manager
        const { data: roles } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', user.id);
        
        const hasAdminRole = roles?.some(r => (r.roles as any)?.name === 'ADMIN' || (r.roles as any)?.name === 'MANAGER');
        setIsAdmin(!!hasAdminRole);

        if (hasAdminRole) {
            // Fetch unique reps from customers for the dropdown
            const { data: reps } = await supabase
                .from('customers')
                .select('salesrep')
                .not('salesrep', 'is', null);
            
            if (reps) {
                const uniqueReps = Array.from(new Set(reps.map(r => r.salesrep as string)));
                setAvailableReps(uniqueReps.sort());
            }
        }
    }

    async function fetchCustomers(searchTerm: string, repFilter: string, banner: string, sortCol: string, sortDir: 'asc'|'desc', currentLimit: number) {
      if (currentLimit === 25) setLoading(true); // Only show main loading state on fresh search
      
      let query = supabase
        .from('customers')
        .select('*, follow_ups(id, status)', { count: 'exact' })
        .order(sortCol, { ascending: sortDir === 'asc', nullsFirst: false })
        .limit(currentLimit);
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,net_suite_id.ilike.%${searchTerm}%`);
      }

      if (repFilter) {
        query = query.eq('salesrep', repFilter);
      }

      if (banner) {
        query = query.eq('banner', banner);
      }
      
      const { data, count, error } = await query;
      
      if (error) {
          console.error("Supabase Error:", error);
          setErrorMsg(error.message);
      } else {
          setErrorMsg(null);
      }
      
      if (!error && data) {
        setCustomers(data);
        setHasMore(count ? count > currentLimit : false);
      }
      setLoading(false);
    }

    return (
        <div className="card">
            <h2 className="heading">Assigned Customers</h2>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  placeholder="Search by name or ID..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ flexGrow: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} 
                />
                
                <select 
                    value={bannerFilter} 
                    onChange={(e) => setBannerFilter(e.target.value)}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', minWidth: '200px' }}
                >
                    <option value="">All Banners</option>
                    {availableBanners.map(banner => (
                        <option key={banner} value={banner}>{banner}</option>
                    ))}
                </select>
                
                {isAdmin && (
                    <select 
                        value={selectedRep} 
                        onChange={(e) => setSelectedRep(e.target.value)}
                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', minWidth: '200px' }}
                    >
                        <option value="">All Sales Reps</option>
                        {availableReps.map(rep => (
                            <option key={rep} value={rep}>{rep}</option>
                        ))}
                    </select>
                )}
            </div>
            
            {errorMsg && (
                <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem' }}>
                    <strong>Search Error: </strong> {errorMsg}
                </div>
            )}
            
            {loading ? (
              <div>Searching...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                  {customers.length === 0 ? (
                    <div>No customers found.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                                <th style={{ padding: '1rem' }}>Customer</th>
                                <th style={{ padding: '1rem' }}>Banner</th>
                                
                                <th style={{ padding: '1rem' }}>Open Follow-ups</th>
                                
                                <th 
                                    style={{ padding: '1rem', cursor: 'pointer' }}
                                    onClick={() => {
                                        setSortColumn('mtd_revenue');
                                        setSortDirection(sortColumn === 'mtd_revenue' && sortDirection === 'desc' ? 'asc' : 'desc');
                                    }}
                                >
                                    MTD Rev {sortColumn === 'mtd_revenue' && (sortDirection === 'desc' ? '▼' : '▲')}
                                </th>
                                
                                <th 
                                    style={{ padding: '1rem', cursor: 'pointer' }}
                                    onClick={() => {
                                        setSortColumn('ytd_revenue');
                                        setSortDirection(sortColumn === 'ytd_revenue' && sortDirection === 'desc' ? 'asc' : 'desc');
                                    }}
                                >
                                    YTD Rev {sortColumn === 'ytd_revenue' && (sortDirection === 'desc' ? '▼' : '▲')}
                                </th>
                                
                                <th 
                                    style={{ padding: '1rem', cursor: 'pointer' }}
                                    onClick={() => {
                                        setSortColumn('balance');
                                        setSortDirection(sortColumn === 'balance' && sortDirection === 'desc' ? 'asc' : 'desc');
                                    }}
                                >
                                    Balance {sortColumn === 'balance' && (sortDirection === 'desc' ? '▼' : '▲')}
                                </th>
                                
                                <th 
                                    style={{ padding: '1rem', cursor: 'pointer' }}
                                    onClick={() => {
                                        setSortColumn('last_invoice_date');
                                        setSortDirection(sortColumn === 'last_invoice_date' && sortDirection === 'desc' ? 'asc' : 'desc');
                                    }}
                                >
                                    Last Invoice {sortColumn === 'last_invoice_date' && (sortDirection === 'desc' ? '▼' : '▲')}
                                </th>
                                
                                <th 
                                    style={{ padding: '1rem', cursor: 'pointer' }}
                                    onClick={() => {
                                        setSortColumn('last_activity_date');
                                        setSortDirection(sortColumn === 'last_activity_date' && sortDirection === 'desc' ? 'asc' : 'desc');
                                    }}
                                >
                                    Last Activity {sortColumn === 'last_activity_date' && (sortDirection === 'desc' ? '▼' : '▲')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(customer => {
                                const openFollowUpsCount = customer.follow_ups?.filter(f => f.status === 'PENDING').length || 0;
                                return (
                                <tr 
                                    key={customer.id}
                                    style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s', cursor: 'pointer' }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    onClick={() => window.location.href = `/customers/${customer.id}`}
                                >
                                    <td style={{ padding: '1rem' }}>
                                        <strong>{customer.name}</strong>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ID: {customer.net_suite_id}</div>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{customer.banner || '-'}</td>
                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: openFollowUpsCount > 0 ? '#ef4444' : 'inherit' }}>
                                        {openFollowUpsCount > 0 ? `${openFollowUpsCount} Pending` : '-'}
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>{customer.mtd_revenue ? `$${customer.mtd_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>{customer.ytd_revenue ? `$${customer.ytd_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                                    <td style={{ padding: '1rem', color: customer.balance > 0 ? 'inherit' : 'green' }}>
                                        ${(customer.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                        {customer.last_invoice_date ? new Date(customer.last_invoice_date).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '-'}
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                        {customer.last_activity_date ? new Date(customer.last_activity_date).toLocaleDateString('en-US') : '-'}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                  )}
                  
                  {hasMore && (
                      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                          <button 
                              className="btn btn-secondary" 
                              onClick={() => setLimit(prev => prev + 25)}
                              style={{ padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
                          >
                              Show More
                          </button>
                      </div>
                  )}
              </div>
            )}
        </div>
    );
}
