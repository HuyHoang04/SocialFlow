'use client';
import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';

interface ImageCropModalProps {
    imageSrc: string;
    onCropComplete: (croppedBlob: Blob) => void;
    onCancel: () => void;
    aspect?: number;
    title?: string;
}

export default function ImageCropModal({
    imageSrc,
    onCropComplete,
    onCancel,
    aspect = 1,
    title = 'Crop Image'
}: ImageCropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropChange = useCallback((area: Area) => {
        setCroppedAreaPixels(area);
    }, []);

    const handleConfirm = async () => {
        if (!croppedAreaPixels) return;
        const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
        if (blob) onCropComplete(blob);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out'
        }} onClick={onCancel}>
            <div style={{
                background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                width: '90vw', maxWidth: 520, overflow: 'hidden',
                border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
                    <button onClick={onCancel} style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        fontSize: 20, cursor: 'pointer', lineHeight: 1
                    }}>✕</button>
                </div>

                {/* Cropper */}
                <div style={{ position: 'relative', width: '100%', height: 360, background: '#111' }}>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={(_, areaPixels) => onCropChange(areaPixels)}
                        cropShape="round"
                        showGrid={false}
                        style={{
                            containerStyle: { borderRadius: 0 },
                            cropAreaStyle: {
                                border: '3px solid var(--accent)',
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)'
                            }
                        }}
                    />
                </div>

                {/* Zoom slider */}
                <div style={{
                    padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12,
                    borderTop: '1px solid var(--border)'
                }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>🔍 Zoom</span>
                    <input
                        type="range"
                        min={1} max={3} step={0.05}
                        value={zoom}
                        onChange={e => setZoom(Number(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--accent)' }}
                    />
                </div>

                {/* Actions */}
                <div style={{
                    padding: '16px 24px', display: 'flex', gap: 12,
                    justifyContent: 'flex-end', borderTop: '1px solid var(--border)'
                }}>
                    <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleConfirm}>
                        Upload
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Create a cropped image blob from source image and crop area.
 */
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size to crop area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw cropped portion
    ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y,
        pixelCrop.width, pixelCrop.height,
        0, 0,
        pixelCrop.width, pixelCrop.height
    );

    // Convert to blob
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
}

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (err) => reject(err));
        image.crossOrigin = 'anonymous';
        image.src = url;
    });
}
