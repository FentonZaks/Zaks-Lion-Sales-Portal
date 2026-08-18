
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface Product {
  sku: string;
  name: string;
  primary_category: string | null;
  allowed_provinces: string[] | null;
  allowed_countries: string[] | null;
  is_hidden: boolean;
  is_active: boolean;
  is_kit_only: boolean;
  inner_carton_qty: number | null;
  master_case_qty: number | null;
  is_archived: boolean;
}

interface EditState {
  provinces: string;
  countries: string;
  is_hidden: boolean;
  is_kit_only: boolean;
  inner_carton_qty: string;
  master_case_qty: string;
  is_archived: boolean;
}

// Extract ProductRow and wrap in React.memo for high performance rendering
const ProductRow = React.memo(({ 
  product, 
  edit, 
  isModified, 
  onChange, 
  onSave, 
  saving 
}: { 
  product: Product, 
  edit: EditState, 
  isModified: boolean, 
  onChange: (sku: string, field: keyof EditState, value: any) => void, 
  onSave: (sku: string) => void, 
  saving: boolean 
}) => {
  return (
    <tr style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s', backgroundColor: edit.is_archived ? '#f8fafc' : (edit.is_hidden ? 'rgba(239, 68, 68, 0.05)' : 'transparent') }}>
      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>{product.sku}</td>
      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: edit.is_hidden || edit.is_archived ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: edit.is_hidden ? 'line-through' : 'none' }}>
            {product.name}
          </span>
          {!product.is_active && (
            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '4px', fontWeight: 500 }}>
              INACTIVE
            </span>
          )}
        </div>
      </td>
      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{product.primary_category || 'N/A'}</td>
      <td style={{ padding: '0.75rem 1rem' }}>
        <input
          type="text"
          value={edit.provinces}
          onChange={(e) => onChange(product.sku, 'provinces', e.target.value)}
          placeholder="e.g. BC, AB"
          style={{ width: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
        />
      </td>
      <td style={{ padding: '0.75rem 1rem' }}>
        <input
          type="text"
          value={edit.countries}
          onChange={(e) => onChange(product.sku, 'countries', e.target.value)}
          placeholder="e.g. CA, US"
          style={{ width: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
        />
      </td>
      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={edit.is_kit_only}
            onChange={(e) => onChange(product.sku, 'is_kit_only', e.target.checked)}
            style={{ width: '1.25rem', height: '1.25rem', accentColor: '#3b82f6', cursor: 'pointer' }}
          />
        </label>
      </td>
      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={edit.is_hidden}
            onChange={(e) => onChange(product.sku, 'is_hidden', e.target.checked)}
            style={{ width: '1.25rem', height: '1.25rem', accentColor: '#ef4444', cursor: 'pointer' }}
          />
        </label>
      </td>
      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={edit.is_archived}
            onChange={(e) => onChange(product.sku, 'is_archived', e.target.checked)}
            style={{ width: '1.25rem', height: '1.25rem', accentColor: '#64748b', cursor: 'pointer' }}
          />
        </label>
      </td>
      <td style={{ padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="number"
            min="0"
            value={edit.inner_carton_qty}
            onChange={(e) => onChange(product.sku, 'inner_carton_qty', e.target.value)}
            placeholder="In"
            style={{ width: '60px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>/</span>
          <input
            type="number"
            min="0"
            value={edit.master_case_qty}
            onChange={(e) => onChange(product.sku, 'master_case_qty', e.target.value)}
            placeholder="Mstr"
            style={{ width: '60px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
          />
        </div>
      </td>
      <td style={{ padding: '0.75rem 1rem' }}>
        <button
          onClick={() => onSave(product.sku)}
          disabled={!isModified || saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 500,
            border: 'none',
            cursor: isModified ? 'pointer' : 'not-allowed',
            backgroundColor: isModified ? 'var(--primary-color)' : '#e5e7eb',
            color: isModified ? 'white' : '#9ca3af',
            transition: 'all 0.2s'
          }}
        >
          Save
        </button>
      </td>
    </tr>
  );
});

export const ProductRestrictionsManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [edits, setEdits] = useState<Record<string, EditState>>({});
  
  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [viewArchived, setViewArchived] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); // Reset to first page when search changes
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetchProducts();
  }, [debouncedQuery, page, viewArchived]);

  const fetchProducts = async () => {
    setLoading(true);
    
    let query = supabase
      .from('products')
      .select('sku, name, primary_category, allowed_provinces, allowed_countries, is_hidden, is_active, is_kit_only, inner_carton_qty, master_case_qty, is_archived', { count: 'exact' })
      .eq('is_archived', viewArchived);

    if (debouncedQuery) {
      query = query.or(`sku.ilike.%${debouncedQuery}%,name.ilike.%${debouncedQuery}%`);
    }

    // Sort order
    query = query.order('is_hidden', { ascending: true }).order('sku', { ascending: true });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      setMessage({ type: 'error', text: 'Failed to load products.' });
    } else if (data) {
      setProducts(data);
      if (count !== null) setTotalCount(count);
      
      const initialEdits: Record<string, EditState> = {};
      data.forEach(p => {
        initialEdits[p.sku] = {
          provinces: p.allowed_provinces ? p.allowed_provinces.join(', ') : '',
          countries: p.allowed_countries ? p.allowed_countries.join(', ') : '',
          is_hidden: p.is_hidden,
          is_kit_only: p.is_kit_only || false,
          inner_carton_qty: p.inner_carton_qty ? p.inner_carton_qty.toString() : '',
          master_case_qty: p.master_case_qty ? p.master_case_qty.toString() : '',
          is_archived: p.is_archived || false
        };
      });
      setEdits(initialEdits);
    }
    setLoading(false);
  };

  const handleEditChange = useCallback((sku: string, field: keyof EditState, value: any) => {
    setEdits(prev => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        [field]: value
      }
    }));
  }, []);

  const getProductUpdatePayload = (sku: string) => {
    const edit = edits[sku];
    return {
      sku: sku,
      allowed_provinces: edit.provinces.trim() ? edit.provinces.split(',').map(s => s.trim().toUpperCase()) : [],
      allowed_countries: edit.countries.trim() ? edit.countries.split(',').map(s => s.trim().toUpperCase()) : [],
      is_hidden: edit.is_hidden,
      is_kit_only: edit.is_kit_only,
      inner_carton_qty: edit.inner_carton_qty ? parseInt(edit.inner_carton_qty) : null,
      master_case_qty: edit.master_case_qty ? parseInt(edit.master_case_qty) : null,
      is_archived: edit.is_archived
    };
  };

  const isProductModified = useCallback((product: Product) => {
    const edit = edits[product.sku];
    if (!edit) return false;
    return edit.provinces !== (product.allowed_provinces ? product.allowed_provinces.join(', ') : '') ||
           edit.countries !== (product.allowed_countries ? product.allowed_countries.join(', ') : '') ||
           edit.is_hidden !== product.is_hidden ||
           edit.is_kit_only !== product.is_kit_only ||
           edit.is_archived !== product.is_archived ||
           edit.inner_carton_qty !== (product.inner_carton_qty ? product.inner_carton_qty.toString() : '') ||
           edit.master_case_qty !== (product.master_case_qty ? product.master_case_qty.toString() : '');
  }, [edits]);

  const saveProduct = useCallback(async (sku: string) => {
    setSaving(true);
    setMessage(null);
    
    const payload = getProductUpdatePayload(sku);

    // We can reuse the bulk_update_products RPC for a single item for consistency
    const { error } = await supabase.rpc('bulk_update_products', { payload: [payload] });

    if (error) {
      console.error('Error updating product:', error);
      setMessage({ type: 'error', text: `Failed to save settings for ${sku}.` });
    } else {
      setMessage({ type: 'success', text: `Successfully updated settings for ${sku}.` });
      // Fetch again to sync state correctly (especially if it changed archive status)
      fetchProducts();
    }
    setSaving(false);
  }, [edits, fetchProducts]);

  const saveAllModified = async () => {
    setSaving(true);
    setMessage(null);
    
    const modifications = products.filter(isProductModified).map(p => getProductUpdatePayload(p.sku));
    
    if (modifications.length === 0) {
      setMessage({ type: 'success', text: 'No changes to save.' });
      setSaving(false);
      return;
    }

    const { error } = await supabase.rpc('bulk_update_products', { payload: modifications });

    if (error) {
      console.error('Error bulk updating products:', error);
      setMessage({ type: 'error', text: `Failed to save products. Did you run the database migration?` });
    } else {
      setMessage({ type: 'success', text: `Successfully saved ${modifications.length} products in bulk.` });
      // Refetch to sync state
      fetchProducts();
    }
    setSaving(false);
  };

  const hasAnyModifications = useMemo(() => {
    return products.some(isProductModified);
  }, [products, isProductModified]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="card" style={{ marginTop: '2rem', borderTop: '4px solid #ef4444' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="heading">Product Restrictions Manager</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: '600px' }}>
            Define geographical sales restrictions. Enter comma-separated 2-letter codes. Leave blank for global availability. Set case quantities and kit-only restrictions.
          </p>
        </div>
        <button
          onClick={saveAllModified}
          disabled={!hasAnyModifications || saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 500,
            border: 'none',
            cursor: hasAnyModifications ? 'pointer' : 'not-allowed',
            backgroundColor: hasAnyModifications ? 'var(--primary-color)' : '#e5e7eb',
            color: hasAnyModifications ? 'white' : '#9ca3af',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          Save All Changes
        </button>
      </div>

      {message && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#065f46' : '#991b1b'
        }}>
          <p style={{ margin: 0, fontWeight: 500 }}>{message.text}</p>
        </div>
      )}

      {/* Toolbar: Search and Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          <input 
            type="text"
            placeholder="Search by SKU or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', minWidth: '300px', fontSize: '0.875rem' }}
          />
          
          <select 
            value={viewArchived ? 'archived' : 'active'}
            onChange={(e) => {
              setViewArchived(e.target.value === 'archived');
              setPage(1);
            }}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: 'white' }}
          >
            <option value="active">Active Catalog</option>
            <option value="archived">Archived Products</option>
          </select>
        </div>
        
        {/* Pagination Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Showing {Math.min((page - 1) * pageSize + 1, totalCount)} to {Math.min(page * pageSize, totalCount)} of {totalCount}
          </span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: page === 1 ? '#f3f4f6' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              Prev
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0 || loading}
              style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: page === totalPages ? '#f3f4f6' : 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading products...</div>
      ) : products.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No products found matching your criteria.
        </div>
      ) : (
        <div className="table-responsive">
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>SKU</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Product Name & Status</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Category</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Allowed Provinces</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Allowed Countries</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', textAlign: 'center' }}>Kit Only</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', textAlign: 'center' }}>Hidden</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', textAlign: 'center' }}>Archive</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Case Qty (In / Mstr)</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <ProductRow 
                  key={product.sku}
                  product={product}
                  edit={edits[product.sku] || { provinces: '', countries: '', is_hidden: false, is_kit_only: false, inner_carton_qty: '', master_case_qty: '', is_archived: false }}
                  isModified={isProductModified(product)}
                  onChange={handleEditChange}
                  onSave={saveProduct}
                  saving={saving}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
