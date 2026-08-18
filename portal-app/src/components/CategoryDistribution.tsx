import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface CategoryDistributionProps {
  categoryLastInvoiceDates: Record<string, string> | null;
}

const TARGET_CATEGORIES = ['Candy', 'Die Cast Car', 'Gen Merch', 'Meat', 'Pet', 'Tech'];

export function CategoryDistribution({ categoryLastInvoiceDates }: CategoryDistributionProps) {
  const [masterCategories, setMasterCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMasterCategories() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('primary_category, secondary_category')
          .in('primary_category', TARGET_CATEGORIES)
          .eq('is_active', true);

        if (error) throw error;

        if (data) {
          const uniqueCats = new Set<string>();
          data.forEach(p => {
            if (p.primary_category) {
              const full = p.secondary_category ? `${p.primary_category} : ${p.secondary_category}` : p.primary_category;
              uniqueCats.add(full);
            }
          });
          setMasterCategories(Array.from(uniqueCats));
        }
      } catch (err) {
        console.error('Error fetching master categories:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMasterCategories();
  }, []);

  // Helper to determine color based on date difference
  const getStatusColor = (category: string) => {
    if (!categoryLastInvoiceDates || !categoryLastInvoiceDates[category]) {
      return '#ef4444'; // Red
    }

    const lastInvoiceDate = new Date(categoryLastInvoiceDates[category]);
    const now = new Date();
    
    let monthsDiff = (now.getFullYear() - lastInvoiceDate.getFullYear()) * 12;
    monthsDiff -= lastInvoiceDate.getMonth();
    monthsDiff += now.getMonth();

    if (now.getDate() < lastInvoiceDate.getDate()) {
        monthsDiff--;
    }

    if (monthsDiff <= 3) {
      return '#22c55e'; // Green
    } else if (monthsDiff <= 6) {
      return '#eab308'; // Yellow
    } else if (monthsDiff <= 12) {
      return '#f97316'; // Orange
    } else {
      return '#ef4444'; // Red
    }
  };

  // Group subcategories by primary category
  const groupedData: Record<string, string[]> = {};
  TARGET_CATEGORIES.forEach(cat => {
    groupedData[cat] = [];
  });
  
  // 1. Populate with master categories first
  masterCategories.forEach(fullCategory => {
    const parts = fullCategory.split(' : ');
    const primary = parts[0];
    if (groupedData[primary] !== undefined) {
      if (!groupedData[primary].includes(fullCategory)) {
        groupedData[primary].push(fullCategory);
      }
    }
  });

  // 2. Ensure we also include anything from the invoice dates (just in case they bought an inactive or archived category)
  if (categoryLastInvoiceDates) {
    Object.keys(categoryLastInvoiceDates).forEach(fullCategory => {
        const parts = fullCategory.split(' : ');
        const primary = parts[0];
        if (groupedData[primary] !== undefined) {
            if (!groupedData[primary].includes(fullCategory)) {
                groupedData[primary].push(fullCategory);
            }
        }
    });
  }

  // Sort subcategories alphabetically within each primary category
  Object.keys(groupedData).forEach(primary => {
    groupedData[primary].sort();
  });

  if (loading) {
    return <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Loading Category Distribution...</div>;
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        Category Distribution
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {TARGET_CATEGORIES.map((primaryCat) => (
          <div key={primaryCat} style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--text-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                {primaryCat}
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {groupedData[primaryCat].length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No History</span>
                        <div 
                            title="No Invoice History"
                            style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '4px',
                                backgroundColor: '#ef4444', // Red
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }} 
                        />
                    </div>
                ) : (
                    groupedData[primaryCat].map(fullCat => {
                        // Extract just the subcategory name for display
                        const parts = fullCat.split(' : ');
                        const subCatName = parts.length > 1 ? parts.slice(1).join(' : ') : 'General';
                        
                        return (
                            <div key={fullCat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-color)' }} title={fullCat}>
                                    {subCatName}
                                </span>
                                <div 
                                    title={`Last Invoiced: ${new Date(categoryLastInvoiceDates![fullCat]).toLocaleDateString()}`}
                                    style={{
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '4px',
                                        backgroundColor: getStatusColor(fullCat),
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                    }} 
                                />
                            </div>
                        );
                    })
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
