import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Maximize2, Trash2, X } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';

interface CustomerImage {
    id: string;
    file_name: string;
    storage_path: string;
    created_at: string;
    url?: string;
}

export function CustomerGallery() {
    const { id } = useParams();
    const [images, setImages] = useState<CustomerImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState<string>('Customer');
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            // Get customer name
            const { data: customerData } = await supabase
                .from('customers')
                .select('company_name')
                .eq('internal_id', id)
                .single();
            
            if (customerData) {
                setCustomerName(customerData.company_name);
            }

            // Get images metadata
            const { data: imageData, error: imageError } = await supabase
                .from('customer_images')
                .select('*')
                .eq('customer_id', id)
                .order('created_at', { ascending: false });

            if (imageError) throw imageError;

            // Generate signed URLs for private images
            const imagesWithUrls = await Promise.all(
                (imageData || []).map(async (img) => {
                    const { data: signedUrlData } = await supabase
                        .storage
                        .from('customer-images')
                        .createSignedUrl(img.storage_path, 60 * 60); // 1 hour expiry
                    
                    return {
                        ...img,
                        url: signedUrlData?.signedUrl
                    };
                })
            );

            setImages(imagesWithUrls);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleDelete = async (imageId: string, storagePath: string) => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        try {
            // Delete from storage
            await supabase.storage.from('customer-images').remove([storagePath]);
            // Delete from db
            await supabase.from('customer_images').delete().eq('id', imageId);
            // Refresh
            loadData();
        } catch (err: any) {
            alert('Failed to delete: ' + err.message);
        }
    };

    if (!id) return null;

    return (
        <div className="app-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Link to={`/customers/${id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                    <ArrowLeft size={24} />
                </Link>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: 'var(--primary-color)' }}>
                    Image Gallery
                </h1>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Store setup and location images for <strong>{customerName}</strong>
            </p>

            <ImageUpload customerId={id} onUploadSuccess={loadData} />

            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading images...</div>
            ) : error ? (
                <div style={{ padding: '2rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '8px', marginTop: '2rem' }}>
                    Error loading images: {error}
                </div>
            ) : images.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', marginTop: '2rem', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>No images yet</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Upload the first image for this location using the buttons above.</p>
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                    gap: '1.5rem', 
                    marginTop: '2rem' 
                }}>
                    {images.map(img => (
                        <div key={img.id} style={{ 
                            position: 'relative', 
                            borderRadius: '8px', 
                            overflow: 'hidden', 
                            border: '1px solid var(--border-color)',
                            backgroundColor: '#fff',
                            aspectRatio: '1'
                        }} className="image-card">
                            {img.url ? (
                                <img 
                                    src={img.url} 
                                    alt={img.file_name} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' }}>
                                    Broken Image
                                </div>
                            )}
                            
                            {/* Overlay Controls */}
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: 'rgba(0,0,0,0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '1rem',
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                cursor: 'pointer'
                            }} 
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                            onClick={() => img.url && setFullScreenImage(img.url)}>
                                <button className="btn btn-primary" style={{ padding: '0.5rem' }}>
                                    <Maximize2 size={20} />
                                </button>
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.5rem', backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#f87171' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(img.id, img.storage_path);
                                    }}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Full Screen Modal */}
            {fullScreenImage && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }} onClick={() => setFullScreenImage(null)}>
                    <button style={{
                        position: 'absolute',
                        top: '20px', right: '20px',
                        background: 'none', border: 'none', color: 'white', cursor: 'pointer'
                    }} onClick={() => setFullScreenImage(null)}>
                        <X size={32} />
                    </button>
                    <img 
                        src={fullScreenImage} 
                        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }} 
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
