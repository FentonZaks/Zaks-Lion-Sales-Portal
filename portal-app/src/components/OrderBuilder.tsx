import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShoppingCart, Package, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Info } from 'lucide-react';

interface Product {
    id: string;
    sku: string;
    name: string;
    description: string;
    base_price: number;
    price_store: number | null;
    price_canco: number | null;
    price_distributor: number | null;
    primary_category: string | null;
    secondary_category: string | null;
    estimated_inventory: number;
    inventory_by_location: Record<string, number>;
    allowed_provinces: string[] | null;
    allowed_countries: string[] | null;
    is_kit_only: boolean;
    inner_carton_qty: number | null;
    master_case_qty: number | null;
    kit_components: { sku: string; quantity: number }[] | null;
}

interface CartItem {
    product: Product;
    quantity: number;
    applicablePrice: number;
    overridePrice?: number;
    comment?: string;
    showOverride: boolean;
    fulfillment_location: string;
    is_split_shipment: boolean;
}

export function OrderBuilder() {
    const { id: customerId } = useParams();
    const navigate = useNavigate();
    
    const [customer, setCustomer] = useState<any>(null);
    const [customerLocation, setCustomerLocation] = useState<any>(null);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<string[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [step, setStep] = useState<'build' | 'review'>('build');
    
    // Header level fields
    const [internalMemo, setInternalMemo] = useState('');
    const [poNumber, setPoNumber] = useState('');

    // Accordion state
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id || null));
        if (customerId) {
            fetchCustomerData();
        }
    }, [customerId]);

    useEffect(() => {
        if (customerLocation && allProducts.length > 0) {
            applyGeographicFilters();
        }
    }, [customerLocation, allProducts]);

    async function fetchCustomerData() {
        setLoading(true);
        // 1. Fetch Customer
        const { data: custData } = await supabase.from('customers').select('id, name, net_suite_id, price_level').eq('id', customerId).single();
        setCustomer(custData);

        // 2. Fetch Customer Default Shipping Location
        const { data: locData } = await supabase
            .from('customer_locations')
            .select('province, country')
            .eq('customer_id', customerId)
            .eq('is_default_shipping', true)
            .maybeSingle();
        
        // If no default shipping exists, default to empty object to avoid crashes
        setCustomerLocation(locData || { province: '', country: '' });

        // 3. Fetch all active and non-hidden products
        const { data: prodData } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .eq('is_hidden', false);
        
        if (prodData) {
            setAllProducts(prodData);
            
            // Extract unique warehouses dynamically
            const uniqueWarehouses = new Set<string>();
            prodData.forEach(p => {
                if (p.inventory_by_location) {
                    Object.keys(p.inventory_by_location).forEach(w => uniqueWarehouses.add(w));
                }
            });
            const whArray = Array.from(uniqueWarehouses).sort();
            setWarehouses(whArray);
            if (whArray.length > 0) setSelectedWarehouse(whArray[0]);
        }
        setLoading(false);
    }

    function applyGeographicFilters() {
        const province = customerLocation.province ? customerLocation.province.trim().toUpperCase() : '';
        const country = customerLocation.country ? customerLocation.country.trim().toUpperCase() : '';

        const allowed = allProducts.filter(p => {
            // Province check
            if (p.allowed_provinces && p.allowed_provinces.length > 0) {
                if (!province || !p.allowed_provinces.includes(province)) return false;
            }
            // Country check
            if (p.allowed_countries && p.allowed_countries.length > 0) {
                if (!country || !p.allowed_countries.includes(country)) return false;
            }
            return true;
        });

        setFilteredProducts(allowed);
    }

    const toggleCategory = (category: string) => {
        const next = new Set(expandedCategories);
        if (next.has(category)) {
            next.delete(category);
        } else {
            next.add(category);
        }
        setExpandedCategories(next);
    };

    const getKitBreakdownText = (product: Product) => {
        if (!product.kit_components || product.kit_components.length === 0) return '';
        return 'Kit Components:\n' + product.kit_components.map(c => {
            const compProduct = allProducts.find(p => p.sku === c.sku);
            const name = compProduct ? compProduct.name : 'Unknown';
            const inv = compProduct ? (compProduct.inventory_by_location?.[selectedWarehouse] || 0) : 0;
            return `- ${c.quantity}x ${c.sku} (${name}) | ${inv} avail in ${selectedWarehouse || 'network'}`;
        }).join('\n');
    };

    const getInventoryForSelectedWarehouse = (product: Product) => {
        if (!selectedWarehouse) return 0;
        
        if (product.kit_components && product.kit_components.length > 0) {
            let maxKits = Infinity;
            for (const comp of product.kit_components) {
                const compProduct = allProducts.find(p => p.sku === comp.sku);
                if (!compProduct) return 0;
                const compInv = compProduct.inventory_by_location?.[selectedWarehouse] || 0;
                const kitsFromThisComp = Math.floor(compInv / comp.quantity);
                if (kitsFromThisComp < maxKits) maxKits = kitsFromThisComp;
            }
            return maxKits === Infinity ? 0 : maxKits;
        }

        return product.inventory_by_location?.[selectedWarehouse] || 0;
    };

    const getTotalInventory = (product: Product) => {
        if (product.kit_components && product.kit_components.length > 0) {
            let maxKits = Infinity;
            for (const comp of product.kit_components) {
                const compProduct = allProducts.find(p => p.sku === comp.sku);
                if (!compProduct) return 0;
                const compInv = compProduct.estimated_inventory || 0;
                const kitsFromThisComp = Math.floor(compInv / comp.quantity);
                if (kitsFromThisComp < maxKits) maxKits = kitsFromThisComp;
            }
            return maxKits === Infinity ? 0 : maxKits;
        }
        return product.estimated_inventory || 0;
    };

    const getApplicablePrice = (product: Product) => {
        const level = customer?.price_level;
        let price = product.base_price;
        if (level === 'Store' && product.price_store != null) price = product.price_store;
        else if (level === 'Canco Price' && product.price_canco != null) price = product.price_canco;
        else if (level === 'Distributor' && product.price_distributor != null) price = product.price_distributor;
        
        // If the item has no direct price but is a Kit, estimate price by summing components
        if ((price === 0 || price == null) && product.kit_components && product.kit_components.length > 0) {
            let kitPrice = 0;
            for (const comp of product.kit_components) {
                const compProduct = allProducts.find(p => p.sku === comp.sku);
                if (compProduct) {
                    // Recursive call to get component price
                    kitPrice += getApplicablePrice(compProduct) * comp.quantity;
                }
            }
            return kitPrice;
        }

        return price;
    };

    const addToCart = (product: Product) => {
        const localQty = getInventoryForSelectedWarehouse(product);
        const totalQty = getTotalInventory(product);
        const isSplit = localQty === 0 && totalQty > 0;
        
        // Find best fallback warehouse if split
        let fallbackLocation = selectedWarehouse;
        if (isSplit && product.inventory_by_location) {
            const fallback = Object.entries(product.inventory_by_location).find(([_, qty]) => qty > 0);
            if (fallback) fallbackLocation = fallback[0];
        }

        const existing = cart.find(item => item.product.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { 
                product, 
                quantity: 1, 
                applicablePrice: getApplicablePrice(product),
                showOverride: false,
                fulfillment_location: fallbackLocation,
                is_split_shipment: isSplit
            }]);
        }
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            setCart(cart.filter(item => item.product.id !== productId));
            return;
        }
        setCart(cart.map(item => item.product.id === productId ? { ...item, quantity } : item));
    };

    const toggleOverride = (productId: string) => {
        setCart(cart.map(item => {
            if (item.product.id === productId) {
                if (item.showOverride) {
                    return { ...item, showOverride: false, overridePrice: undefined, comment: undefined };
                } else {
                    return { ...item, showOverride: true, overridePrice: item.applicablePrice, comment: '' };
                }
            }
            return item;
        }));
    };

    const updateOverride = (productId: string, price: number, comment: string) => {
        setCart(cart.map(item => item.product.id === productId ? { ...item, overridePrice: price, comment } : item));
    };

    const subtotal = cart.reduce((sum, item) => sum + (item.overridePrice ?? item.applicablePrice) * item.quantity, 0);

    const generateCSV = () => {
        // Kit Option A: Just send the parent SKU. Leave pricing blank so NetSuite calculates it.
        const headers = ["Customer ID", "SKU", "Quantity", "Rate", "Comment", "Location", "Internal Memo", "PO Number"];
        const rows = cart.map(item => {
            // If they didn't override, we send empty string for Rate so NetSuite calculates it.
            const rate = item.showOverride ? item.overridePrice : "";
            const comment = item.showOverride ? item.comment : "";
            return [
                customer?.net_suite_id || '',
                item.product.sku,
                item.quantity,
                rate,
                comment,
                item.fulfillment_location,
                internalMemo,
                poNumber
            ];
        });
        
        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(val => '"' + (val || '').toString().replace(/"/g, '""') + '"').join(","))
        ].join("\n");
        
        return "data:text/csv;base64," + btoa(csvContent);
    };

    const generatePDFBase64 = (): Promise<string> => {
        return new Promise((resolve) => {
            import('jspdf').then(({ jsPDF }) => {
                const doc = new jsPDF();
                
                doc.setFontSize(18);
                doc.text("Draft Order Summary", 20, 20);
                
                doc.setFontSize(12);
                doc.text(`Customer: ${customer?.name}`, 20, 30);
                doc.text(`NetSuite ID: ${customer?.net_suite_id}`, 20, 38);
                if (customerLocation?.province) {
                    doc.text(`Shipping To: ${customerLocation.province}, ${customerLocation.country}`, 20, 46);
                }
                
                let y = 60;
                doc.setFont("helvetica", "bold");
                doc.text("SKU / Description", 20, y);
                doc.text("Qty", 80, y);
                doc.text("Est. Price", 110, y);
                doc.text("Total", 150, y);
                doc.setFont("helvetica", "normal");
                y += 10;
                
                cart.forEach(item => {
                    const price = item.overridePrice ?? item.applicablePrice;
                    const lineTotal = price * item.quantity;
                    
                    // Main Line
                    doc.setFont("helvetica", "bold");
                    doc.text(item.product.sku, 20, y);
                    doc.setFont("helvetica", "normal");
                    doc.text(item.quantity.toString(), 80, y);
                    doc.text(`${price.toFixed(2)}`, 110, y);
                    doc.text(`${lineTotal.toFixed(2)}`, 150, y);
                    y += 6;
                    
                    // Description
                    doc.setFontSize(10);
                    doc.setTextColor(100, 100, 100);
                    const desc = item.product.name.length > 55 ? item.product.name.substring(0, 52) + '...' : item.product.name;
                    doc.text(desc, 20, y);
                    doc.setTextColor(0, 0, 0);
                    y += 6;
                    
                    // Kit Components
                    if (item.product.kit_components && item.product.kit_components.length > 0) {
                        doc.setFontSize(9);
                        doc.setTextColor(120, 120, 120);
                        item.product.kit_components.forEach(c => {
                            const cp = allProducts.find(p => p.sku === c.sku);
                            const compName = cp ? cp.name : 'Unknown';
                            const compText = `L ${c.quantity * item.quantity}x ${c.sku} (${compName})`;
                            const safeCompText = compText.length > 70 ? compText.substring(0, 67) + '...' : compText;
                            doc.text(safeCompText, 25, y);
                            y += 5;
                            
                            if (y > 270) {
                                doc.addPage();
                                y = 20;
                            }
                        });
                        doc.setTextColor(0, 0, 0);
                        y += 2;
                    }
                    
                    if (item.showOverride && item.comment) {
                        doc.setFont("helvetica", "italic");
                        doc.setFontSize(10);
                        doc.setTextColor(217, 119, 6);
                        doc.text(`Override: ${item.comment}`, 20, y);
                        doc.setTextColor(0, 0, 0);
                        doc.setFont("helvetica", "normal");
                        y += 6;
                    }
                    
                    doc.setFontSize(12);
                    y += 4;
                    
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                });
                
                y += 10;
                doc.setFont("helvetica", "bold");
                doc.text(`Estimated Subtotal: ${subtotal.toFixed(2)}`, 110, y);
                
                const base64String = doc.output('datauristring');
                resolve(base64String);
            });
        });
    };

    const handleSubmit = async () => {
        if (!userId || !customerId || cart.length === 0) return;

        const invalidItem = cart.find(item => item.showOverride && (!item.comment || item.comment.trim() === ''));
        if (invalidItem) {
            alert('A comment is strictly required for all price overrides.');
            return;
        }

        setLoading(true);
        try {
            // 1. Generate Files
            const pdfBase64 = await generatePDFBase64();
            const csvBase64 = generateCSV();

            // 2. Email it via our API
            const emailRes = await fetch('/api/send-draft-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName: customer?.name,
                    pdfBase64,
                    csvBase64,
                    recipientEmail: 'bryan@zaksfoods.ca'
                })
            });

            if (!emailRes.ok) {
                console.warn("Email failed to send, but proceeding to save draft...");
            }

            // 3. Save to Supabase (unchanged)
            const { data: order, error: orderError } = await supabase.from('orders').insert({
                customer_id: customerId,
                user_id: userId,
                status: 'DRAFT',
                subtotal: subtotal,
                po_number: poNumber || null,
                internal_memo: internalMemo || null
            }).select().single();

            if (orderError) throw orderError;

            const lines = cart.map(item => ({
                order_id: order.id,
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.overridePrice ?? item.applicablePrice,
                is_price_overridden: item.showOverride,
                override_comment: item.showOverride ? item.comment : null
            }));

            const { error: lineError } = await supabase.from('order_lines').insert(lines);
            if (lineError) throw lineError;

            alert('Draft Order successfully submitted and emailed!');
            navigate(`/customers/${customerId}`);
            
        } catch (error) {
            console.error('Submission failed', error);
            alert('Failed to submit the draft order.');
        }
        setLoading(false);
    };

    // Apply Search Filter
    const searchedProducts = filteredProducts.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return p.sku.toLowerCase().includes(q) || (p.name && p.name.toLowerCase().includes(q));
    });

    // Group products by primary category
    const groupedProducts = searchedProducts.reduce((acc, p) => {
        const cat = p.primary_category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
    }, {} as Record<string, Product[]>);

    if (loading && allProducts.length === 0) return <div className="card">Loading...</div>;


    if (step === 'review') {
        return (
            <div className="app-container" style={{ maxWidth: '800px' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, color: 'var(--primary-color)', letterSpacing: '-0.025em' }}>
                    Review Draft Order
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
                    {customer?.name} ({customer?.net_suite_id})
                </p>

                <div className="card" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div>
                            <strong style={{ display: 'block', color: 'var(--text-secondary)' }}>Shipping Location</strong>
                            <div>{customerLocation?.province}, {customerLocation?.country}</div>
                        </div>
                        <div>
                            <strong style={{ display: 'block', color: 'var(--text-secondary)' }}>Total Items</strong>
                            <div>{cart.reduce((sum, i) => sum + i.quantity, 0)} Items</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>PO #</label>
                            <input 
                                type="text"
                                value={poNumber}
                                onChange={(e) => setPoNumber(e.target.value)}
                                placeholder="Enter PO Number (Optional)"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Internal Memo</label>
                            <input 
                                type="text"
                                value={internalMemo}
                                onChange={(e) => setInternalMemo(e.target.value)}
                                placeholder="Enter Internal Memo (Optional)"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {cart.map(item => (
                            <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px dashed var(--border-color)' }}>
                                <div>
                                    <strong style={{ display: 'block' }}>{item.product.sku}</strong>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.product.name}</span>
                                    {item.showOverride && (
                                        <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '0.25rem' }}>
                                            Price Overridden: {item.comment}
                                        </div>
                                    )}
                                    {item.product.kit_components && item.product.kit_components.length > 0 && (
                                        <div style={{ marginTop: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {item.product.kit_components.map(c => {
                                                const cp = allProducts.find(p => p.sku === c.sku);
                                                return <div key={c.sku}>↳ {c.quantity * item.quantity}x {c.sku} ({cp?.name || 'Unknown'})</div>
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong style={{ display: 'block' }}>${((item.overridePrice ?? item.applicablePrice) * item.quantity).toFixed(2)}</strong>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.quantity} @ ${(item.overridePrice ?? item.applicablePrice).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', paddingTop: '1rem' }}>
                        <span>Estimated Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button 
                        onClick={() => setStep('build')} 
                        disabled={loading}
                        style={{ flex: 1, padding: '1rem', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Back to Edit
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={loading}
                        style={{ flex: 2, padding: '1rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {loading ? 'Submitting...' : <><CheckCircle2 size={20} /> Submit Order to Head Office</>}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container" style={{ maxWidth: '1400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, color: 'var(--primary-color)', letterSpacing: '-0.025em' }}>
                        Draft Order
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
                        {customer?.name} <span style={{ opacity: 0.6 }}>({customer?.net_suite_id})</span>
                        {customerLocation?.province && ` • Shipping to ${customerLocation.province}, ${customerLocation.country}`}
                    </p>
                </div>
                
                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Preferred Shipping Warehouse
                    </label>
                    <select 
                        value={selectedWarehouse}
                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                        style={{ width: '250px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem', cursor: 'pointer', backgroundColor: '#f8fafc' }}
                    >
                        {warehouses.map(w => (
                            <option key={w} value={w}>{w}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '2rem', alignItems: 'start' }}>
                {/* Product Catalog */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div style={{ marginBottom: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Search by SKU or Description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '1.1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                        />
                    </div>
                    
                    {Object.keys(groupedProducts).sort().map(category => {
                        const isExpanded = searchQuery ? true : expandedCategories.has(category);
                        const items = groupedProducts[category];
                        
                        return (
                            <div key={category} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <button 
                                    onClick={() => toggleCategory(category)}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', backgroundColor: isExpanded ? '#f8fafc' : 'white', border: 'none', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none', transition: 'background-color 0.2s' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        {isExpanded ? <ChevronDown size={24} color="var(--primary-color)" /> : <ChevronRight size={24} color="var(--text-secondary)" />}
                                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{category}</h2>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', backgroundColor: '#e2e8f0', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 600 }}>
                                        {items.length} Items
                                    </div>
                                </button>
                                
                                {isExpanded && (
                                    <div style={{ padding: '0' }}>
                                        {items.map((prod, index) => {
                                            const localQty = getInventoryForSelectedWarehouse(prod);
                                            const totalQty = prod.estimated_inventory;
                                            const inCart = cart.find(c => c.product.id === prod.id);
                                            const isSplit = localQty === 0 && totalQty > 0;
                                            
                                            return (
                                                <div key={prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: index < items.length - 1 ? '1px solid var(--border-color)' : 'none', transition: 'background-color 0.2s', backgroundColor: inCart ? '#f0fdf4' : 'transparent' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                                            <strong style={{ fontSize: '1.1rem' }}>{prod.sku}</strong>
                                                            {prod.is_kit_only && (
                                                                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.05em' }}>
                                                                    KIT ONLY
                                                                </span>
                                                            )}
                                                            {prod.kit_components && prod.kit_components.length > 0 && (
                                                                <span title={getKitBreakdownText(prod)} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                                                                    <Info size={14} color="#64748b" />
                                                                </span>
                                                            )}
                                                            {isSplit && (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', padding: '0.1rem 0.5rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.05em' }}>
                                                                    <AlertTriangle size={12} /> ALTERNATE WAREHOUSE
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{prod.name}</div>
                                                        
                                                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                            <span><strong>Price:</strong> ${getApplicablePrice(prod).toFixed(2)}</span>
                                                            {prod.inner_carton_qty && <span><strong>Inner:</strong> {prod.inner_carton_qty}</span>}
                                                            {prod.master_case_qty && <span><strong>Master:</strong> {prod.master_case_qty}</span>}
                                                        </div>
                                                    </div>
                                                    
                                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', minWidth: '150px' }}>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: localQty > 0 ? '#16a34a' : (totalQty > 0 ? '#d97706' : '#ef4444') }}>
                                                            {localQty > 0 ? `${localQty} in ${selectedWarehouse}` : (totalQty > 0 ? `${totalQty} Total Network` : 'Out of Stock')}
                                                        </div>
                                                        
                                                        {inCart ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', border: '1px solid #16a34a', borderRadius: '8px', padding: '0.25rem' }}>
                                                                <button onClick={() => updateQuantity(prod.id, inCart.quantity - 1)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#f0fdf4', color: '#16a34a', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                                                <span style={{ width: '30px', textAlign: 'center', fontWeight: 'bold' }}>{inCart.quantity}</span>
                                                                <button onClick={() => updateQuantity(prod.id, inCart.quantity + 1)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#f0fdf4', color: '#16a34a', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => addToCart(prod)}
                                                                style={{ padding: '0.5rem 1.5rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                            >
                                                                Add to Order
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {Object.keys(groupedProducts).length === 0 && !loading && (
                        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <Package size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>No Products Available</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>There are no active products available for this region.</p>
                        </div>
                    )}
                </div>

                {/* Cart Summary */}
                <div style={{ position: 'sticky', top: '2rem' }}>
                    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <ShoppingCart size={24} color="var(--primary-color)" />
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Order Summary</h2>
                        </div>
                        
                        <div style={{ padding: '1.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
                            {cart.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                                    Your draft order is empty.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {cart.map(item => (
                                        <div key={item.product.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1, paddingRight: '1rem' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: '1.2' }}>{item.product.sku}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{item.product.name}</div>
                                                    
                                                    {item.is_split_shipment && (
                                                        <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <Package size={10} /> Ships from: {item.fulfillment_location}
                                                        </div>
                                                    )}
                                                    {item.product.kit_components && item.product.kit_components.length > 0 && (
                                                        <div style={{ marginTop: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            {item.product.kit_components.map(c => {
                                                                const cp = allProducts.find(p => p.sku === c.sku);
                                                                return <div key={c.sku} title={cp?.name || 'Unknown'}>↳ {c.quantity * item.quantity}x {c.sku}</div>
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 700 }}>${((item.overridePrice ?? item.applicablePrice) * item.quantity).toFixed(2)}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.quantity} @ ${(item.overridePrice ?? item.applicablePrice).toFixed(2)}</div>
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                                <button onClick={() => toggleOverride(item.product.id)} style={{ background: 'none', border: 'none', color: item.showOverride ? '#ef4444' : 'var(--primary-color)', cursor: 'pointer', fontSize: '0.75rem', padding: 0, fontWeight: 500 }}>
                                                    {item.showOverride ? 'Cancel Override' : 'Override Price'}
                                                </button>
                                            </div>

                                            {item.showOverride && (
                                                <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', borderLeft: '3px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <input 
                                                        type="number" 
                                                        value={item.overridePrice || ''} 
                                                        onChange={(e) => updateOverride(item.product.id, parseFloat(e.target.value) || 0, item.comment || '')} 
                                                        placeholder="New Price"
                                                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #d97706', fontSize: '0.875rem' }} 
                                                    />
                                                    <input 
                                                        type="text"
                                                        placeholder="Reason required..." 
                                                        value={item.comment || ''} 
                                                        onChange={(e) => updateOverride(item.product.id, item.overridePrice || 0, e.target.value)} 
                                                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #d97706', fontSize: '0.875rem' }} 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.25rem', marginBottom: '1.5rem' }}>
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            
                            <button 
                                onClick={() => {
                                    const invalidItem = cart.find(item => item.showOverride && (!item.comment || item.comment.trim() === ''));
                                    if (invalidItem) {
                                        alert('A comment is strictly required for all price overrides.');
                                        return;
                                    }
                                    setStep('review');
                                }} 
                                disabled={cart.length === 0}
                                style={{ width: '100%', padding: '1rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1.1rem', cursor: cart.length > 0 ? 'pointer' : 'not-allowed', opacity: cart.length > 0 ? 1 : 0.5, transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <CheckCircle2 size={20} /> Review Order
                            </button>
                            
                            <button 
                                onClick={() => navigate(`/customers/${customerId}`)} 
                                style={{ width: '100%', padding: '1rem', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
