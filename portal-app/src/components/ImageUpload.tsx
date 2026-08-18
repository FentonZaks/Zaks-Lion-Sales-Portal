import { useState, useRef } from 'react';
import { Upload, Camera, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageUploadProps {
    customerId: string;
    onUploadSuccess: () => void;
}

export function ImageUpload({ customerId, onUploadSuccess }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setError(null);
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                return;
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${customerId}/${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('customer-images')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // 2. Get current user
            const { data: { user } } = await supabase.auth.getUser();

            // 3. Insert metadata into customer_images table
            const { error: dbError } = await supabase
                .from('customer_images')
                .insert([
                    {
                        customer_id: customerId,
                        storage_path: filePath,
                        file_name: file.name,
                        uploaded_by: user?.id,
                    }
                ]);

            if (dbError) {
                throw dbError;
            }

            // 4. Trigger reload
            onUploadSuccess();
        } catch (error: any) {
            setError(error.message);
        } finally {
            setUploading(false);
            if (event.target) {
                event.target.value = ''; // Reset input
            }
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            padding: '2rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '2px dashed var(--border-color)',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {error && (
                <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', width: '100%', textAlign: 'center' }}>
                    {error}
                </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {/* Desktop Upload Button */}
                <div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                    />
                    <button
                        className="btn btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {uploading ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
                        Upload Image
                    </button>
                </div>

                {/* Mobile Camera Button */}
                <div>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                        ref={cameraInputRef}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={uploading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {uploading ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}
                        Take Photo
                    </button>
                </div>
            </div>
            
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', margin: 0 }}>
                Supports JPG, PNG. You can also use your mobile device to snap a photo directly.
            </p>
        </div>
    );
}
