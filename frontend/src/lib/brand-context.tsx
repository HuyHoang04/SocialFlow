'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface Brand {
    id: string;
    name: string;
    description?: string;
    logoUrl?: string;
    website?: string;
    contactEmail?: string;
    phone?: string;
    industry?: string;
    country?: string;
    brandSlogan?: string;
    primaryColor?: string;
    secondaryColor?: string;
    aiVoiceGuidelines?: string;
    aiContentGuardrails?: string;
    connectionCount: number;
}

interface BrandContextType {
    brands: Brand[];
    selectedBrand: Brand | null;
    selectBrand: (brand: Brand) => void;
    setSelectedBrand: (brand: Brand | null) => void;
    clearBrand: () => void;
    reloadBrands: () => Promise<void>;
    loading: boolean;
}

const BrandContext = createContext<BrandContextType | null>(null);

const BRAND_KEY = 'sf_selected_brand';

export function BrandProvider({ children }: { children: ReactNode }) {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
    const [loading, setLoading] = useState(true);

    // Restore from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(BRAND_KEY);
        if (saved) {
            try {
                setSelectedBrand(JSON.parse(saved));
            } catch { /* ignore */ }
        }
    }, []);

    // Load brands from API on mount
    useEffect(() => {
        const loadBrands = async () => {
            try {
                const token = localStorage.getItem('sf_token');
                if (!token) {
                    setLoading(false);
                    return;
                }
                const res = await fetch('/api/brands', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setBrands(data);
                }
            } catch { /* ignore */ }
            setLoading(false);
        };

        loadBrands();
    }, []);

    const selectBrand = useCallback((brand: Brand) => {
        setSelectedBrand(brand);
        localStorage.setItem(BRAND_KEY, JSON.stringify(brand));
    }, []);

    const clearBrand = useCallback(() => {
        setSelectedBrand(null);
        localStorage.removeItem(BRAND_KEY);
    }, []);

    const reloadBrands = useCallback(async () => {
        try {
            const token = localStorage.getItem('sf_token');
            if (!token) return;
            const res = await fetch('/api/brands', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setBrands(data);
                // If selected brand was deleted, clear it
                if (selectedBrand && !data.find((b: Brand) => b.id === selectedBrand.id)) {
                    clearBrand();
                }
            }
        } catch { /* ignore */ }
    }, [selectedBrand, clearBrand]);

    return (
        <BrandContext.Provider value={{ brands, selectedBrand, selectBrand, setSelectedBrand, clearBrand, reloadBrands, loading }}>
            {children}
        </BrandContext.Provider>
    );
}

export function useBrand() {
    const ctx = useContext(BrandContext);
    if (!ctx) throw new Error('useBrand must be used within BrandProvider');
    return ctx;
}
