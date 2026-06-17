'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';
import {
    PlatformIcon, IconGlobe, IconLink, IconEdit, IconUpload,
    IconTrash, IconCheck, IconX, IconEye, IconPlus
} from '@/components/Icons';

interface ProfileBlock {
    id: string;
    type: 'link' | 'header' | 'text' | 'image' | 'video';
    title?: string;
    url?: string;
    description?: string;
    imageUrl?: string;
    platform?: string;
    iconUrl?: string;
}

interface LinktreeSettings {
    brandId?: string;
    brandName?: string;
    logoUrl?: string;
    website?: string;
    primaryColor?: string;
    slug?: string;
    bio?: string;
    displayName?: string;
    websiteLabel?: string;
    bgStyle?: string;
    bgImageUrl?: string;
    buttonStyle?: string;
    published?: boolean;
    publicUrl?: string;
    customLinks?: string;
}

// ── Background presets ──────────────────────────────────────────────────────────
const BG_PRESETS = [
    { key: 'gradient-purple', label: 'Violet', css: 'linear-gradient(135deg,#667eea,#764ba2)' },
    { key: 'gradient-ocean', label: 'Ocean', css: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)' },
    { key: 'gradient-sunset', label: 'Sunset', css: 'linear-gradient(135deg,#f093fb,#f5576c,#fda085)' },
    { key: 'gradient-forest', label: 'Forest', css: 'linear-gradient(135deg,#134e5e,#71b280)' },
    { key: 'gradient-night', label: 'Night', css: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' },
    { key: 'gradient-peach', label: 'Peach', css: 'linear-gradient(135deg,#ffecd2,#fcb69f)' },
    { key: 'gradient-aurora', label: 'Aurora', css: 'linear-gradient(135deg,#a8edea,#fed6e3)' },
];

const BUTTON_STYLES = [
    { key: 'rounded', label: 'Rounded', radius: '14px' },
    { key: 'pill', label: 'Pill', radius: '9999px' },
    { key: 'square', label: 'Square', radius: '8px' },
];

const PLATFORM_OPTIONS = [
    { key: 'none', label: 'No Icon' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'twitter', label: 'X / Twitter' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'telegram', label: 'Telegram' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'custom', label: 'Custom Image' },
];

const getUrlForPlatform = (platform: string, platformPageId: string, pageName: string) => {
    const plat = platform.toLowerCase();
    if (plat === 'facebook') return `https://facebook.com/${platformPageId}`;
    if (plat === 'instagram') return `https://instagram.com/${pageName || platformPageId}`;
    if (plat === 'linkedin') return `https://linkedin.com/company/${platformPageId}`;
    if (plat === 'bluesky') return `https://bsky.app/profile/${platformPageId}`;
    if (plat === 'threads') return `https://threads.net/@${pageName || platformPageId}`;
    if (plat === 'twitter' || plat === 'x') return `https://x.com/${pageName || platformPageId}`;
    return `https://${plat}.com/${platformPageId}`;
};

const getPlatformColor = (platform: string) => {
    const plat = platform.toLowerCase();
    if (plat === 'facebook') return '#1877f2';
    if (plat === 'instagram') return '#e1306c';
    if (plat === 'linkedin') return '#0a66c2';
    if (plat === 'bluesky') return '#0085ff';
    if (plat === 'threads') return '#000000';
    if (plat === 'twitter' || plat === 'x') return '#1da1f2';
    if (plat === 'youtube') return '#ff0000';
    if (plat === 'tiktok') return '#00f2fe';
    return 'var(--accent)';
};

const detectPlatformFromUrl = (url: string): string => {
    const lowercaseUrl = url.toLowerCase();
    if (lowercaseUrl.includes('facebook.com') || lowercaseUrl.includes('fb.me')) return 'facebook';
    if (lowercaseUrl.includes('instagram.com') || lowercaseUrl.includes('instagr.am')) return 'instagram';
    if (lowercaseUrl.includes('twitter.com') || lowercaseUrl.includes('x.com')) return 'twitter';
    if (lowercaseUrl.includes('linkedin.com')) return 'linkedin';
    if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) return 'youtube';
    if (lowercaseUrl.includes('tiktok.com')) return 'tiktok';
    if (lowercaseUrl.includes('telegram.org') || lowercaseUrl.includes('t.me')) return 'telegram';
    if (lowercaseUrl.includes('whatsapp.com') || lowercaseUrl.includes('wa.me')) return 'whatsapp';
    if (lowercaseUrl.includes('bsky.app')) return 'bluesky';
    if (lowercaseUrl.includes('threads.net')) return 'threads';
    return 'none';
};

export default function PublicPageEditor() {
    return (
        <AppShell>
            <PublicPageEditorContent />
        </AppShell>
    );
}

function PublicPageEditorContent() {
    const { selectedBrand } = useBrand();
    const [settings, setSettings] = useState<LinktreeSettings | null>(null);
    const [customLinks, setCustomLinks] = useState<ProfileBlock[]>([]);

    // Form state for a new custom link / block
    const [blockType, setBlockType] = useState<'link' | 'header' | 'text' | 'image' | 'video'>('link');
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newIconType, setNewIconType] = useState('none');
    const [newIconUrl, setNewIconUrl] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const [uploadingImageBlock, setUploadingImageBlock] = useState(false);
    const [isDraggingBanner, setIsDraggingBanner] = useState(false);


    // Interactive Preview & Live Editing States
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editUrl, setEditUrl] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editIconType, setEditIconType] = useState('none');
    const [editIconUrl, setEditIconUrl] = useState('');
    const [editImageUrl, setEditImageUrl] = useState('');

    // WYSIWYG Direct Mockup Editing States
    const [editingName, setEditingName] = useState(false);
    const [editingBio, setEditingBio] = useState(false);
    const [editingWebsite, setEditingWebsite] = useState(false);
    const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [connectedPages, setConnectedPages] = useState<any[]>([]);
    const [isMobileFrame, setIsMobileFrame] = useState(false);

    const [tempName, setTempName] = useState('');
    const [tempBio, setTempBio] = useState('');
    const [tempWebsiteLabel, setTempWebsiteLabel] = useState('');
    const [tempWebsiteUrl, setTempWebsiteUrl] = useState('');

    const handleStartEditBlock = (block: ProfileBlock) => {
        setEditingBlockId(block.id);
        setEditTitle(block.title || '');
        setEditUrl(block.url || '');
        setEditDescription(block.description || '');
        setEditIconType(block.platform || (block.iconUrl ? 'custom' : 'none'));
        setEditIconUrl(block.iconUrl || '');
        setEditImageUrl(block.imageUrl || '');
    };

    const handleSaveBlockEdit = (id: string) => {
        setCustomLinks(prev => prev.map(block => {
            if (block.id !== id) return block;

            let formattedUrl = editUrl.trim();
            if (formattedUrl && block.type !== 'header' && block.type !== 'text') {
                if (!/^https?:\/\//i.test(formattedUrl)) {
                    formattedUrl = 'https://' + formattedUrl;
                }
            }

            return {
                ...block,
                title: editTitle.trim() || undefined,
                url: (block.type === 'link' || block.type === 'image' || block.type === 'video') ? formattedUrl : undefined,
                description: block.type === 'text' ? editDescription.trim() : undefined,
                platform: block.type === 'link' ? (editIconType !== 'custom' ? editIconType : undefined) : undefined,
                iconUrl: block.type === 'link' ? (editIconType === 'custom' ? editIconUrl : undefined) : undefined,
                imageUrl: block.type === 'image' ? editImageUrl : undefined,
            };
        }));
        setEditingBlockId(null);
        setMessage({ type: 'success', text: '✓ Block updated! Click "Save All Changes" to save permanently.' });
    };

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingBg, setUploadingBg] = useState(false);
    const [copied, setCopied] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const bgFileRef = useRef<HTMLInputElement>(null);
    const iconFileRef = useRef<HTMLInputElement>(null);
    const bannerFileRef = useRef<HTMLInputElement>(null);
    const logoFileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        if (!selectedBrand) return;
        setLoading(true);
        try {
            const data = await api.getLinktreeSettings(selectedBrand.id);
            setSettings(data);
            if (data.customLinks) {
                try {
                    setCustomLinks(JSON.parse(data.customLinks));
                } catch {
                    setCustomLinks([]);
                }
            } else {
                setCustomLinks([]);
            }

            try {
                const pages = await api.getAllPagesForBrand(selectedBrand.id);
                setConnectedPages(pages || []);
            } catch (err) {
                console.error("Failed to load connected pages", err);
                setConnectedPages([]);
            }
        } catch {
            setSettings({
                brandId: selectedBrand.id,
                brandName: selectedBrand.name,
                bgStyle: 'gradient-purple',
                buttonStyle: 'rounded',
                published: false,
            });
            setCustomLinks([]);
            setConnectedPages([]);
        } finally {
            setLoading(false);
        }
    }, [selectedBrand]);

    useEffect(() => { load(); }, [load]);

    const set = (patch: Partial<LinktreeSettings>) =>
        setSettings(prev => prev ? { ...prev, ...patch } : prev);

    // Save settings and custom links
    const handleSave = async (publishedVal?: boolean) => {
        if (!selectedBrand || !settings) return;
        setSaving(true);
        setMessage(null);

        const isPublished = publishedVal !== undefined ? publishedVal : !!settings.published;

        // Auto-commit any currently editing block
        let finalCustomLinks = customLinks;
        if (editingBlockId) {
            finalCustomLinks = customLinks.map(block => {
                if (block.id !== editingBlockId) return block;
                let formattedUrl = editUrl.trim();
                if (formattedUrl && block.type !== 'header' && block.type !== 'text') {
                    if (!/^https?:\/\//i.test(formattedUrl)) {
                        formattedUrl = 'https://' + formattedUrl;
                    }
                }
                return {
                    ...block,
                    title: editTitle.trim() || undefined,
                    url: (block.type === 'link' || block.type === 'image' || block.type === 'video') ? formattedUrl : undefined,
                    description: block.type === 'text' ? editDescription.trim() : undefined,
                    platform: block.type === 'link' ? (editIconType !== 'custom' ? editIconType : undefined) : undefined,
                    iconUrl: block.type === 'link' ? (editIconType === 'custom' ? editIconUrl : undefined) : undefined,
                    imageUrl: block.type === 'image' ? editImageUrl : undefined,
                };
            });
            setCustomLinks(finalCustomLinks);
            setEditingBlockId(null);
        }

        // Auto-commit other inline edits if active
        let finalSettings = { ...settings };
        if (editingName) {
            finalSettings.displayName = tempName.trim();
            setEditingName(false);
        }
        if (editingBio) {
            finalSettings.bio = tempBio.trim();
            setEditingBio(false);
        }
        if (editingWebsite) {
            finalSettings.websiteLabel = tempWebsiteLabel.trim();
            finalSettings.website = tempWebsiteUrl.trim();
            setEditingWebsite(false);
        }
        setSettings(finalSettings);

        try {
            const payload = {
                slug: finalSettings.slug,
                bio: finalSettings.bio,
                displayName: finalSettings.displayName,
                websiteLabel: finalSettings.websiteLabel,
                website: finalSettings.website,
                bgStyle: finalSettings.bgStyle,
                bgImageUrl: finalSettings.bgImageUrl,
                buttonStyle: finalSettings.buttonStyle,
                published: isPublished,
                customLinks: JSON.stringify(finalCustomLinks),
            };

            const updated = await api.saveLinktreeSettings(selectedBrand.id, payload);
            setSettings(updated);
            setMessage({ type: 'success', text: '✓ Changes saved successfully!' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    // Toggle publish/draft immediately
    const handleTogglePublish = async () => {
        if (!selectedBrand || !settings) return;
        const targetState = !settings.published;
        setSaving(true);
        setMessage(null);

        // Auto-commit any currently editing block
        let finalCustomLinks = customLinks;
        if (editingBlockId) {
            finalCustomLinks = customLinks.map(block => {
                if (block.id !== editingBlockId) return block;
                let formattedUrl = editUrl.trim();
                if (formattedUrl && block.type !== 'header' && block.type !== 'text') {
                    if (!/^https?:\/\//i.test(formattedUrl)) {
                        formattedUrl = 'https://' + formattedUrl;
                    }
                }
                return {
                    ...block,
                    title: editTitle.trim() || undefined,
                    url: (block.type === 'link' || block.type === 'image' || block.type === 'video') ? formattedUrl : undefined,
                    description: block.type === 'text' ? editDescription.trim() : undefined,
                    platform: block.type === 'link' ? (editIconType !== 'custom' ? editIconType : undefined) : undefined,
                    iconUrl: block.type === 'link' ? (editIconType === 'custom' ? editIconUrl : undefined) : undefined,
                    imageUrl: block.type === 'image' ? editImageUrl : undefined,
                };
            });
            setCustomLinks(finalCustomLinks);
            setEditingBlockId(null);
        }

        // Auto-commit other inline edits if active
        let finalSettings = { ...settings };
        if (editingName) {
            finalSettings.displayName = tempName.trim();
            setEditingName(false);
        }
        if (editingBio) {
            finalSettings.bio = tempBio.trim();
            setEditingBio(false);
        }
        if (editingWebsite) {
            finalSettings.websiteLabel = tempWebsiteLabel.trim();
            finalSettings.website = tempWebsiteUrl.trim();
            setEditingWebsite(false);
        }
        setSettings(finalSettings);

        try {
            const payload = {
                slug: finalSettings.slug,
                bio: finalSettings.bio,
                displayName: finalSettings.displayName,
                websiteLabel: finalSettings.websiteLabel,
                website: finalSettings.website,
                bgStyle: finalSettings.bgStyle,
                bgImageUrl: finalSettings.bgImageUrl,
                buttonStyle: finalSettings.buttonStyle,
                published: targetState,
                customLinks: JSON.stringify(finalCustomLinks),
            };
            const updated = await api.saveLinktreeSettings(selectedBrand.id, payload);
            setSettings(updated);
            setMessage({
                type: 'success',
                text: targetState ? '✓ Profile published! Your page is now live!' : '✓ Profile unpublished and set to Draft.'
            });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Failed to change publish state' });
        } finally {
            setSaving(false);
        }
    };

    // Upload custom background image
    const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedBrand) return;
        setUploadingBg(true);
        try {
            const updated = await api.uploadLinktreeBg(selectedBrand.id, file);
            setSettings(updated);
            setMessage({ type: 'success', text: '✓ Background image uploaded!' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Background upload failed' });
        } finally {
            setUploadingBg(false);
            if (bgFileRef.current) bgFileRef.current.value = '';
        }
    };

    // Clear custom background image
    const handleDeleteBg = async () => {
        if (!selectedBrand) return;
        try {
            const updated = await api.deleteLinktreeBg(selectedBrand.id);
            setSettings(updated);
            setMessage({ type: 'success', text: '✓ Background removed.' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Failed to remove background' });
        }
    };

    // Upload custom icon for custom links
    const handleUploadIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedBrand) return;
        setUploadingIcon(true);
        try {
            const token = localStorage.getItem('sf_token');
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${apiBase}/brands/${selectedBrand.id}/linktree/icon`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) throw new Error('Icon upload failed');
            const data = await res.json();
            setNewIconUrl(data.url);
            setEditIconUrl(data.url);
            setMessage({ type: 'success', text: '✓ Link icon uploaded!' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Icon upload failed' });
        } finally {
            setUploadingIcon(false);
            if (iconFileRef.current) iconFileRef.current.value = '';
        }
    };

    const uploadBannerFile = async (file: File) => {
        if (!selectedBrand) return;
        setUploadingImageBlock(true);
        try {
            const token = localStorage.getItem('sf_token');
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${apiBase}/brands/${selectedBrand.id}/linktree/icon`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) throw new Error('Banner upload failed');
            const data = await res.json();
            setNewImageUrl(data.url);
            setEditImageUrl(data.url);
            setMessage({ type: 'success', text: '✓ Banner image uploaded!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Banner upload failed' });
        } finally {
            setUploadingImageBlock(false);
            if (bannerFileRef.current) bannerFileRef.current.value = '';
        }
    };

    // Upload custom image for banner blocks
    const handleUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadBannerFile(file);
    };

    // Drag & Drop handlers for banner images
    const handleDragOverBanner = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingBanner(true);
    };

    const handleDragLeaveBanner = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingBanner(false);
    };

    const handleDropBanner = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingBanner(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please drop an image file' });
            return;
        }

        await uploadBannerFile(file);
    };

    // Add new custom link / block
    const handleAddBlock = () => {
        if (blockType === 'link') {
            if (!newTitle.trim() || !newUrl.trim()) {
                setMessage({ type: 'error', text: 'Please fill in both Button Title and URL' });
                return;
            }
            let formattedUrl = newUrl.trim();
            if (!/^https?:\/\//i.test(formattedUrl)) {
                formattedUrl = 'https://' + formattedUrl;
            }
            const newBlock: ProfileBlock = {
                id: crypto.randomUUID(),
                type: 'link',
                title: newTitle.trim(),
                url: formattedUrl,
                platform: newIconType !== 'custom' ? newIconType : undefined,
                iconUrl: newIconType === 'custom' ? newIconUrl : undefined,
            };
            setCustomLinks(prev => [...prev, newBlock]);
        } else if (blockType === 'header') {
            if (!newTitle.trim()) {
                setMessage({ type: 'error', text: 'Please fill in the Section Title' });
                return;
            }
            const newBlock: ProfileBlock = {
                id: crypto.randomUUID(),
                type: 'header',
                title: newTitle.trim(),
            };
            setCustomLinks(prev => [...prev, newBlock]);
        } else if (blockType === 'text') {
            if (!newDescription.trim()) {
                setMessage({ type: 'error', text: 'Please fill in the Paragraph Content' });
                return;
            }
            const newBlock: ProfileBlock = {
                id: crypto.randomUUID(),
                type: 'text',
                description: newDescription.trim(),
            };
            setCustomLinks(prev => [...prev, newBlock]);
        } else if (blockType === 'image') {
            if (!newImageUrl) {
                setMessage({ type: 'error', text: 'Please upload a Banner Image first' });
                return;
            }
            let formattedUrl = newUrl.trim();
            if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
                formattedUrl = 'https://' + formattedUrl;
            }
            const newBlock: ProfileBlock = {
                id: crypto.randomUUID(),
                type: 'image',
                title: newTitle.trim() || undefined,
                imageUrl: newImageUrl,
                url: formattedUrl || undefined,
            };
            setCustomLinks(prev => [...prev, newBlock]);
        } else if (blockType === 'video') {
            if (!newUrl.trim()) {
                setMessage({ type: 'error', text: 'Please enter a YouTube Video URL' });
                return;
            }
            let videoUrl = newUrl.trim();
            if (!/^https?:\/\//i.test(videoUrl)) {
                videoUrl = 'https://' + videoUrl;
            }
            const newBlock: ProfileBlock = {
                id: crypto.randomUUID(),
                type: 'video',
                url: videoUrl,
            };
            setCustomLinks(prev => [...prev, newBlock]);
        }

        // Reset forms
        setNewTitle('');
        setNewUrl('');
        setNewDescription('');
        setNewIconType('none');
        setNewIconUrl('');
        setNewImageUrl('');
        setMessage({ type: 'success', text: `✓ Added new ${blockType} block! Click "Save All Changes" to publish.` });
    };

    // Delete a block
    const handleDeleteBlock = (id: string) => {
        setCustomLinks(prev => prev.filter(l => l.id !== id));
        setMessage({ type: 'success', text: '✓ Block removed. Click "Save All Changes" to publish.' });
    };

    // Reorder block
    const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= customLinks.length) return;

        const updated = [...customLinks];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;

        setCustomLinks(updated);
        setMessage({ type: 'success', text: '✓ Block reordered! Click "Save All Changes" to save.' });
    };

    // ── WYSIWYG Direct Mockup Editing Helpers ─────────────────────────────────────

    // Upload brand logo / avatar
    const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedBrand) return;
        setUploadingLogo(true);
        setMessage(null);
        try {
            const token = localStorage.getItem('sf_token');
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${apiBase}/brands/${selectedBrand.id}/logo`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData
            });

            if (!res.ok) throw new Error('Logo upload failed');
            const data = await res.json();

            setSettings(prev => prev ? { ...prev, logoUrl: data.logoUrl } : prev);
            setMessage({ type: 'success', text: '✓ Brand logo uploaded successfully! Click "Save All Changes" to save permanently.' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Logo upload failed' });
        } finally {
            setUploadingLogo(false);
            if (logoFileRef.current) logoFileRef.current.value = '';
        }
    };

    // Delete brand logo / avatar
    const handleDeleteLogo = async () => {
        if (!selectedBrand) return;
        setMessage(null);
        try {
            const token = localStorage.getItem('sf_token');
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

            const res = await fetch(`${apiBase}/brands/${selectedBrand.id}/logo`, {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!res.ok) throw new Error('Failed to delete logo');

            setSettings(prev => prev ? { ...prev, logoUrl: '' } : prev);
            setMessage({ type: 'success', text: '✓ Brand logo removed successfully! Click "Save All Changes" to save permanently.' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Failed to remove logo' });
        }
    };

    const handleStartEditName = () => {
        setTempName(settings?.displayName || selectedBrand?.name || '');
        setEditingName(true);
    };

    const handleSaveNameEdit = () => {
        set({ displayName: tempName.trim() });
        setEditingName(false);
        setMessage({ type: 'success', text: '✓ Display Name updated! Click "Save All Changes" to save permanently.' });
    };

    const handleStartEditBio = () => {
        setTempBio(settings?.bio || '');
        setEditingBio(true);
    };

    const handleSaveBioEdit = () => {
        set({ bio: tempBio.trim() });
        setEditingBio(false);
        setMessage({ type: 'success', text: '✓ Bio updated! Click "Save All Changes" to save permanently.' });
    };

    const handleStartEditWebsite = () => {
        setTempWebsiteLabel(settings?.websiteLabel || 'Visit our website');
        setTempWebsiteUrl(settings?.website || '');
        setEditingWebsite(true);
    };

    const handleSaveWebsiteEdit = () => {
        let formattedUrl = tempWebsiteUrl.trim();
        if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
            formattedUrl = 'https://' + formattedUrl;
        }
        set({
            websiteLabel: tempWebsiteLabel.trim() || undefined,
            website: formattedUrl || undefined
        });
        setEditingWebsite(false);
        setMessage({ type: 'success', text: '✓ Website link updated! Click "Save All Changes" to save permanently.' });
    };

    const handleAddBlockDirect = (type: 'link' | 'header' | 'text' | 'image' | 'video') => {
        const newBlockId = crypto.randomUUID();
        let newBlock: ProfileBlock = {
            id: newBlockId,
            type,
        };

        if (type === 'link') {
            newBlock.title = 'New Link Button';
            newBlock.url = 'https://';
        } else if (type === 'header') {
            newBlock.title = 'New Section Title';
        } else if (type === 'text') {
            newBlock.description = 'Write some paragraph text here...';
        } else if (type === 'image') {
            newBlock.title = 'New Image Banner';
            newBlock.imageUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
            newBlock.url = '';
        } else if (type === 'video') {
            newBlock.url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        }

        setCustomLinks(prev => [...prev, newBlock]);

        // Put block straight into editing mode
        setEditingBlockId(newBlockId);
        setEditTitle(newBlock.title || '');
        setEditUrl(newBlock.url || '');
        setEditDescription(newBlock.description || '');
        setEditIconType('none');
        setEditIconUrl('');
        setEditImageUrl(newBlock.imageUrl || '');

        setMessage({ type: 'success', text: `✓ Added new ${type} block inside preview! Click "Save All Changes" to save permanently.` });
    };


    const handleCopyLink = () => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url = `${origin}/p/${settings?.slug || selectedBrand?.id}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    if (!selectedBrand) return <p style={{ color: 'var(--text-muted)', padding: 40 }}>Please select a brand first.</p>;
    if (loading) return <div className="loading-center" style={{ minHeight: '80vh' }}><div className="spinner" /></div>;

    const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${settings?.slug || selectedBrand.id}`;
    const activePreset = BG_PRESETS.find(p => p.key === settings?.bgStyle) || BG_PRESETS[0];

    const isMobile = isMobileFrame;
    const avatarSize = isMobile ? 80 : 96;
    const initialsFontSize = isMobile ? 28 : 36;
    const nameFontSize = isMobile ? 22 : 26;
    const bioFontSize = 14;
    const avatarMarginBottom = isMobile ? 12 : 16;
    const bioMarginBottom = isMobile ? 20 : 32;

    return (
        <div style={{ width: '100%', padding: '0 40px', animation: 'fadeIn 0.5s ease-out' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Public Brand Profile</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 13 }}>
                        Customize a sleek, premium landing page for your social connections & custom links.
                    </p>
                </div>

                {/* Instant Publish / Draft Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700 }}>
                        {settings?.published ? '🟢 PUBLIC & LIVE' : '⚪ DRAFT / HIDDEN'}
                    </span>
                    <button
                        onClick={handleTogglePublish}
                        disabled={saving}
                        style={{
                            padding: '8px 16px',
                            background: settings?.published ? 'rgba(46, 213, 115, 0.15)' : 'var(--bg-secondary)',
                            color: settings?.published ? '#2ed573' : 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 700,
                            transition: 'all 0.2s',
                        }}
                    >
                        {settings?.published ? 'Unpublish' : 'Publish Page'}
                    </button>
                </div>
            </div>

            {/* Header & Quick URL Slug bar & Copy Link */}
            <div style={{
                display: 'flex',
                gap: 16,
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 28,
                padding: '16px 20px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: '320px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Public URL:</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {typeof window !== 'undefined' ? window.location.origin : ''}/p/
                    </span>
                    <input
                        value={settings?.slug || ''}
                        onChange={e => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '-') })}
                        placeholder={selectedBrand.id}
                        style={{
                            padding: '6px 12px', fontSize: 13, fontWeight: 700,
                            border: '1px solid var(--border)', borderRadius: '8px',
                            background: 'rgba(0,0,0,0.25)', color: 'var(--accent)', outline: 'none',
                            width: '240px', transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        title="Customize your Linktree Slug"
                    />
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                        onClick={() => setIsMobileFrame(prev => !prev)}
                        style={{
                            padding: '10px 16px',
                            background: isMobileFrame ? 'rgba(99, 102, 241, 0.25)' : 'rgba(var(--text-rgb), 0.05)',
                            color: isMobileFrame ? 'var(--accent)' : 'var(--text-primary)',
                            border: isMobileFrame ? '1px solid var(--accent)' : '1px solid var(--border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                            if (!isMobileFrame) e.currentTarget.style.background = 'rgba(var(--text-rgb), 0.1)';
                        }}
                        onMouseLeave={e => {
                            if (!isMobileFrame) e.currentTarget.style.background = 'rgba(var(--text-rgb), 0.05)';
                        }}
                    >
                        {isMobileFrame ? '📱 Phone Size: ON' : '🖥️ Phone Size: OFF'}
                    </button>
                    <button
                        onClick={handleCopyLink}
                        style={{
                            padding: '10px 16px', background: copied ? 'rgba(46, 213, 115, 0.2)' : 'var(--bg-secondary)',
                            color: copied ? '#2ed573' : 'var(--text-primary)',
                            border: '1px solid var(--border)', borderRadius: '8px',
                            cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                        }}
                    >
                        {copied ? '✓ Copied!' : 'Copy Link'}
                    </button>
                    <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            padding: '10px 16px', background: 'rgba(var(--text-rgb), 0.05)', color: 'var(--text-primary)',
                            border: '1px solid var(--border)', borderRadius: '8px',
                            cursor: 'pointer', fontSize: 13, fontWeight: 700,
                            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--text-rgb), 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--text-rgb), 0.05)'}
                    >
                        <IconEye size={15} /> Visit
                    </a>

                    {/* Master Save Button integrated directly in header */}
                    <button
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="btn btn-primary"
                        style={{ height: '38px', padding: '0 20px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {saving ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>
            </div>

            {message && (
                <div style={{
                    padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13,
                    background: message.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
                    color: message.type === 'success' ? 'var(--success)' : 'var(--error)',
                    border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--error)'}40`,
                    marginBottom: 24,
                    fontWeight: 500
                }}>
                    {message.text}
                </div>
            )}

            {/* Centered Phone Simulator Container */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                padding: '20px 0 60px',
                animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>

                {/* Premium Larger Smartphone Device Mockup */}
                <div style={{
                    width: isMobileFrame ? '390px' : '100%',
                    height: isMobileFrame ? '800px' : '100vh',
                    borderRadius: isMobileFrame ? '40px' : '24px',
                    overflow: 'hidden',
                    boxShadow: isMobileFrame
                        ? '0 24px 64px rgba(0,0,0,0.6), 0 0 0 12px rgba(var(--text-rgb), 0.05)'
                        : '0 20px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(var(--text-rgb), 0.05)',
                    background: settings?.bgImageUrl ? `url('${settings.bgImageUrl}') center/cover` : activePreset.css,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: isMobileFrame ? '40px 24px 24px' : '24px',
                    gap: 16,
                    position: 'relative',
                    border: '1px solid rgba(var(--text-rgb), 0.1)',
                    boxSizing: 'border-box',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {settings?.bgImageUrl && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(1px)' }} />
                    )}

                    {/* Physical Black Camera Notch (Dynamic Island style) */}
                    {isMobileFrame && (
                        <div style={{
                            position: 'absolute',
                            top: 14,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '110px',
                            height: '24px',
                            background: '#000000',
                            borderRadius: '12px',
                            zIndex: 100,
                            boxShadow: 'inset 0 1px 2px rgba(var(--text-rgb),0.1)'
                        }} />
                    )}

                    {/* Floating paint brush for theme quick setting */}
                    <button
                        type="button"
                        onClick={() => setThemeDrawerOpen(!themeDrawerOpen)}
                        style={{
                            position: 'absolute', top: 12, right: 12, zIndex: 100,
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'rgba(24, 24, 27, 0.85)', backdropFilter: 'blur(8px)',
                            border: themeDrawerOpen ? '2px solid var(--accent)' : '1px solid rgba(var(--text-rgb),0.15)',
                            color: themeDrawerOpen ? 'var(--accent)' : 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            transition: 'all 0.2s', fontSize: 14
                        }}
                        title="Quick Theme Settings"
                    >
                        🎨
                    </button>

                    <div style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        width: '100%',
                        maxWidth: '480px',
                        height: '100%',
                        overflowY: 'auto',
                        paddingRight: '2px'
                    }} className="custom-scrollbar">

                        {/* Avatar Container with Upload overlay */}
                        <div
                            style={{ position: 'relative', width: avatarSize, height: avatarSize, marginBottom: avatarMarginBottom, cursor: 'pointer' }}
                            title="Upload / Change Avatar logo"
                        >
                            <input
                                ref={logoFileRef}
                                type="file"
                                accept="image/*"
                                onChange={handleUploadLogo}
                                style={{ display: 'none' }}
                            />

                            {settings?.logoUrl ? (
                                <img
                                    src={settings.logoUrl}
                                    alt="logo"
                                    style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(var(--text-rgb),0.4)' }}
                                />
                            ) : (
                                <div style={{
                                    width: avatarSize, height: avatarSize, borderRadius: '50%', background: 'rgba(var(--text-rgb),0.2)',
                                    border: '2px solid rgba(var(--text-rgb),0.4)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: initialsFontSize, fontWeight: 800, color: 'var(--text-primary)'
                                }}>
                                    {(settings?.displayName || selectedBrand.name || '?')[0]?.toUpperCase()}
                                </div>
                            )}

                            {/* Hover Overlay */}
                            <div
                                onClick={() => logoFileRef.current?.click()}
                                style={{
                                    position: 'absolute', inset: 0, borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', opacity: uploadingLogo ? 1 : 0,
                                    transition: 'opacity 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                }}
                                onMouseLeave={(e) => {
                                    if (!uploadingLogo) e.currentTarget.style.opacity = '0';
                                }}
                            >
                                <span style={{ fontSize: 16, color: 'var(--text-primary)' }}>📷</span>
                                <span style={{ fontSize: 8, color: 'var(--text-primary)', fontWeight: 'bold', marginTop: 2 }}>
                                    {uploadingLogo ? '...' : 'CHANGE'}
                                </span>
                            </div>

                            {/* Delete logo (trash overlay button) */}
                            {settings?.logoUrl && !uploadingLogo && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("Delete brand logo?")) handleDeleteLogo();
                                    }}
                                    style={{
                                        position: 'absolute', bottom: -2, right: -2, width: 18, height: 18,
                                        borderRadius: '50%', background: '#ef4444', border: '1px solid white',
                                        color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', fontSize: 8, padding: 0, zIndex: 10
                                    }}
                                    title="Remove Logo"
                                >
                                    🗑
                                </button>
                            )}
                        </div>

                        {/* Display Name - WYSIWYG Editable */}
                        {editingName ? (
                            <div style={{ display: 'flex', gap: 4, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                                <input
                                    value={tempName}
                                    onChange={e => setTempName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveNameEdit();
                                        if (e.key === 'Escape') setEditingName(false);
                                    }}
                                    onBlur={handleSaveNameEdit}
                                    autoFocus
                                    placeholder="Display Name"
                                    style={{
                                        width: '95%', padding: '10px 16px', fontSize: nameFontSize, fontWeight: 800,
                                        background: 'rgba(0,0,0,0.65)', border: '2px solid var(--accent)', borderRadius: '10px',
                                        color: 'var(--text-primary)', textAlign: 'center', outline: 'none',
                                        boxShadow: '0 0 16px rgba(99, 102, 241, 0.35)',
                                        transition: 'all 0.2s'
                                    }}
                                />
                            </div>
                        ) : (
                            <div
                                onClick={handleStartEditName}
                                style={{
                                    fontSize: nameFontSize, fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center',
                                    cursor: 'pointer', padding: '2px 8px', borderRadius: '4px', border: '1px dashed transparent',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.border = '1px dashed var(--accent)';
                                    e.currentTarget.style.background = 'rgba(var(--text-rgb),0.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.border = '1px dashed transparent';
                                    e.currentTarget.style.background = 'transparent';
                                }}
                                title="Click to edit Display Name"
                            >
                                {settings?.displayName || selectedBrand.name} <span style={{ fontSize: 12, opacity: 0.5, marginLeft: 2 }}>✎</span>
                            </div>
                        )}

                        {/* Bio - WYSIWYG Editable */}
                        {editingBio ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', alignItems: 'center' }}>
                                <textarea
                                    value={tempBio}
                                    onChange={e => setTempBio(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSaveBioEdit();
                                        }
                                        if (e.key === 'Escape') setEditingBio(false);
                                    }}
                                    onBlur={handleSaveBioEdit}
                                    autoFocus
                                    placeholder="Tell visitors about your brand..."
                                    style={{
                                        width: '100%', minHeight: 100, padding: '12px 16px', fontSize: bioFontSize,
                                        background: 'rgba(0,0,0,0.65)', border: '2px solid var(--accent)', borderRadius: '10px',
                                        color: 'var(--text-primary)', textAlign: 'center', outline: 'none', resize: 'vertical',
                                        lineHeight: 1.5, boxShadow: '0 0 16px rgba(99, 102, 241, 0.35)',
                                        transition: 'all 0.2s'
                                    }}
                                />
                                <div style={{ fontSize: 10, color: 'rgba(var(--text-rgb),0.6)', fontWeight: 600, letterSpacing: '0.2px' }}>Press Enter to save, Shift+Enter for newline</div>
                            </div>
                        ) : (
                            <div
                                onClick={handleStartEditBio}
                                style={{
                                    fontSize: bioFontSize, color: 'rgba(var(--text-rgb),0.85)', textAlign: 'center', lineHeight: 1.6,
                                    maxWidth: '360px', wordBreak: 'break-word', cursor: 'pointer', padding: '4px 8px',
                                    borderRadius: '4px', border: '1px dashed transparent', transition: 'all 0.15s',
                                    marginBottom: bioMarginBottom
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.border = '1px dashed var(--accent)';
                                    e.currentTarget.style.background = 'rgba(var(--text-rgb),0.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.border = '1px dashed transparent';
                                    e.currentTarget.style.background = 'transparent';
                                }}
                                title="Click to edit Bio"
                            >
                                {settings?.bio ? (
                                    <>
                                        {settings.bio.slice(0, 100)}{settings.bio.length > 100 ? '...' : ''}
                                        <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 4 }}>✎</span>
                                    </>
                                ) : (
                                    <span style={{ color: 'rgba(var(--text-rgb),0.45)', fontStyle: 'italic' }}>
                                        + Add brand biography ✎
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Link list */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                            {/* Automatically injected Social Links (Connected Pages) */}
                            {connectedPages.map((page: any) => {
                                const platformKey = page.platform.toLowerCase();
                                const PLATFORM_LABELS: Record<string, string> = {
                                    facebook: 'Facebook', instagram: 'Instagram', twitter: 'X (Twitter)',
                                    linkedin: 'LinkedIn', bluesky: 'Bluesky', threads: 'Threads'
                                };
                                const label = page.pageName || PLATFORM_LABELS[platformKey] || page.accountName || platformKey;
                                
                                let buttonBackground = 'rgba(var(--text-rgb), 0.15)';
                                let buttonTextColor = 'var(--text-primary)';
                                if (platformKey === 'facebook') { buttonBackground = 'rgba(24, 119, 242, 0.6)'; buttonTextColor = 'white'; }
                                else if (platformKey === 'instagram') { buttonBackground = 'linear-gradient(135deg, rgba(225,48,108,0.6) 0%, rgba(253,121,61,0.6) 100%)'; buttonTextColor = 'white'; }
                                else if (platformKey === 'twitter' || platformKey === 'x') { buttonBackground = 'rgba(15, 20, 25, 0.6)'; buttonTextColor = 'white'; }
                                else if (platformKey === 'linkedin') { buttonBackground = 'rgba(10, 102, 194, 0.6)'; buttonTextColor = 'white'; }
                                else if (platformKey === 'bluesky') { buttonBackground = 'rgba(0, 133, 255, 0.5)'; buttonTextColor = 'white'; }
                                else if (platformKey === 'threads') { buttonBackground = 'rgba(0, 0, 0, 0.5)'; buttonTextColor = 'white'; }
                                else if (platformKey === 'telegram') { buttonBackground = 'rgba(0, 136, 204, 0.6)'; buttonTextColor = 'white'; }
                                else if (platformKey === 'whatsapp') { buttonBackground = 'rgba(37, 211, 102, 0.6)'; buttonTextColor = 'white'; }
                                else if (platformKey === 'youtube') { buttonBackground = 'rgba(255, 0, 0, 0.6)'; buttonTextColor = 'white'; }
                                else if (platformKey === 'tiktok') { buttonBackground = 'rgba(0, 0, 0, 0.6)'; buttonTextColor = 'white'; }

                                return (
                                    <div key={page.id} style={{
                                        width: '100%',
                                        padding: '16px 20px',
                                        borderRadius: BUTTON_STYLES.find(b => b.key === settings?.buttonStyle)?.radius || '14px',
                                        background: buttonBackground,
                                        backdropFilter: 'blur(12px)',
                                        WebkitBackdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(var(--text-rgb),0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                        color: buttonTextColor,
                                        fontSize: 15,
                                        fontWeight: 600,
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                        letterSpacing: '0.1px',
                                        opacity: 0.95,
                                        cursor: 'default'
                                    }}>
                                        <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <PlatformIcon platform={platformKey} size={20} color="white" />
                                        </div>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                                    </div>
                                );
                            })}

                            {customLinks.map((block, idx) => {
                                const isHovered = hoveredBlockId === block.id;
                                const isEditing = editingBlockId === block.id;

                                // ─ RENDERING FORM IN INLINE EDIT MODE ─────────────────────────
                                if (isEditing) {
                                    return (
                                        <div key={block.id} style={{
                                            width: '100%', padding: '26px 22px', borderRadius: '20px',
                                            background: 'rgba(12, 12, 22, 0.99)', border: '2px solid var(--accent)',
                                            display: 'flex', flexDirection: 'column', gap: 16,
                                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
                                            animation: 'fadeIn 0.2s ease-out'
                                        }}>
                                            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 2 }}>
                                                ✏️ EDITING {block.type.toUpperCase()} BLOCK
                                            </div>

                                            {/* Title input (for header, link, image) */}
                                            {(block.type === 'header' || block.type === 'link' || block.type === 'image') && (
                                                <input
                                                    value={editTitle}
                                                    onChange={e => setEditTitle(e.target.value)}
                                                    placeholder={block.type === 'header' ? 'Header Title' : 'Title / Label'}
                                                    style={{
                                                        width: '100%', padding: '14px 16px', fontSize: 15,
                                                        background: 'rgba(0,0,0,0.4)', border: '1.5px solid rgba(var(--text-rgb),0.2)', borderRadius: '12px',
                                                        color: 'var(--text-primary)', outline: 'none', transition: 'all 0.15s ease'
                                                    }}
                                                    onFocus={e => {
                                                        e.currentTarget.style.borderColor = 'var(--accent)';
                                                        e.currentTarget.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.3)';
                                                    }}
                                                    onBlur={e => {
                                                        e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.2)';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }}
                                                    autoFocus
                                                />
                                            )}

                                            {/* URL input (for link, image, video) */}
                                            {(block.type === 'link' || block.type === 'image' || block.type === 'video') && (
                                                <input
                                                    value={editUrl}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setEditUrl(val);
                                                        if (block.type === 'link') {
                                                            const platform = detectPlatformFromUrl(val);
                                                            if (platform !== 'none') {
                                                                 setEditIconType(platform);
                                                            }
                                                        }
                                                    }}
                                                    placeholder={block.type === 'video' ? 'YouTube Video URL' : 'Redirect Link (URL)'}
                                                    style={{
                                                        width: '100%', padding: '14px 16px', fontSize: 15,
                                                        background: 'rgba(0,0,0,0.4)', border: '1.5px solid rgba(var(--text-rgb),0.2)', borderRadius: '12px',
                                                        color: 'var(--text-primary)', outline: 'none', transition: 'all 0.15s ease'
                                                    }}
                                                    onFocus={e => {
                                                        e.currentTarget.style.borderColor = 'var(--accent)';
                                                        e.currentTarget.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.3)';
                                                    }}
                                                    onBlur={e => {
                                                        e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.2)';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }}
                                                />
                                            )}

                                            {/* Platform/Icon selector & Custom Icon Uploader inside inline link editor */}
                                            {block.type === 'link' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.06em' }}>SELECT PLATFORM ICON:</span>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                                                        {PLATFORM_OPTIONS.map(opt => {
                                                            const isSelected = editIconType === opt.key;
                                                            return (
                                                                <button
                                                                    key={opt.key}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditIconType(opt.key);
                                                                        if (opt.key !== 'custom') {
                                                                            setEditIconUrl('');
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        padding: '14px 8px',
                                                                        borderRadius: '12px',
                                                                        border: isSelected ? '2px solid var(--accent)' : '1px solid rgba(var(--text-rgb),0.15)',
                                                                        background: isSelected ? 'rgba(99, 102, 241, 0.22)' : 'rgba(var(--text-rgb),0.04)',
                                                                        color: 'var(--text-primary)',
                                                                        cursor: 'pointer',
                                                                        textAlign: 'center',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: 8,
                                                                        transition: 'all 0.15s ease'
                                                                    }}
                                                                    onMouseEnter={e => {
                                                                        if (!isSelected) {
                                                                            e.currentTarget.style.background = 'rgba(var(--text-rgb),0.08)';
                                                                            e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.25)';
                                                                        }
                                                                    }}
                                                                    onMouseLeave={e => {
                                                                        if (!isSelected) {
                                                                            e.currentTarget.style.background = 'rgba(var(--text-rgb),0.04)';
                                                                            e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.15)';
                                                                        }
                                                                    }}
                                                                >
                                                                    {opt.key !== 'none' && opt.key !== 'custom' ? (
                                                                        <PlatformIcon platform={opt.key} size={20} color="white" />
                                                                    ) : opt.key === 'custom' ? (
                                                                        <span style={{ fontSize: '20px' }}>🖼️</span>
                                                                    ) : (
                                                                        <span style={{ fontSize: '20px' }}>🚫</span>
                                                                    )}
                                                                    <span style={{ fontSize: '12px', opacity: 0.95, fontWeight: 700 }}>{opt.label.split(' ')[0]}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* If Custom Icon chosen, render hidden input and upload button */}
                                                    {editIconType === 'custom' && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                                                            <input
                                                                ref={iconFileRef}
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={handleUploadIcon}
                                                                style={{ display: 'none' }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => iconFileRef.current?.click()}
                                                                disabled={uploadingIcon}
                                                                style={{
                                                                    flex: 1, padding: '14px 18px', fontSize: 14, background: 'rgba(var(--text-rgb),0.06)', border: '1.5px dashed rgba(var(--text-rgb),0.25)',
                                                                    color: 'var(--text-primary)', borderRadius: 12, cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s ease'
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--text-rgb),0.12)'}
                                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--text-rgb),0.06)'}
                                                            >
                                                                {uploadingIcon ? '⏳ Uploading...' : '☁ Upload Custom Icon'}
                                                            </button>
                                                            {editIconUrl && (
                                                                <img src={editIconUrl} alt="" style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(var(--text-rgb),0.25)' }} />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Quick Bind Connected Pages inside inline link editor */}
                                            {block.type === 'link' && connectedPages.length > 0 && (
                                                (() => {
                                                    const relevantPages = (editIconType && editIconType !== 'none' && editIconType !== 'custom')
                                                        ? connectedPages.filter((p: any) => p.platform.toLowerCase() === editIconType.toLowerCase())
                                                        : connectedPages;

                                                    if (relevantPages.length === 0) return null;

                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.06em' }}>⚡ QUICK BIND ACCOUNT:</span>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                                {relevantPages.map((page: any) => {
                                                                    const color = getPlatformColor(page.platform);
                                                                    return (
                                                                        <button
                                                                            key={page.id}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const url = getUrlForPlatform(page.platform, page.platformPageId, page.pageName);
                                                                                setEditUrl(url);
                                                                                setEditTitle(page.pageName || `Visit our ${page.platform}`);
                                                                                setEditIconType(page.platform.toLowerCase());
                                                                            }}
                                                                            style={{
                                                                                padding: '10px 16px',
                                                                                background: `${color}20`,
                                                                                border: `1.5px solid ${color}`,
                                                                                color: 'var(--text-primary)',
                                                                                borderRadius: '28px',
                                                                                fontSize: '13px',
                                                                                fontWeight: 700,
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: 8,
                                                                                transition: 'all 0.15s'
                                                                            }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = `${color}40`; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = `${color}20`; }}
                                                                        >
                                                                            <PlatformIcon platform={page.platform} size={14} color="white" />
                                                                            {page.pageName || page.platform}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })()
                                            )}

                                            {/* Description (for text) */}
                                            {block.type === 'text' && (
                                                <textarea
                                                    value={editDescription}
                                                    onChange={e => setEditDescription(e.target.value)}
                                                    placeholder="Write some body paragraph text…"
                                                    style={{
                                                        width: '100%', padding: '14px 16px', fontSize: 15,
                                                        background: 'rgba(0,0,0,0.4)', border: '1.5px solid rgba(var(--text-rgb),0.2)', borderRadius: '12px',
                                                        color: 'var(--text-primary)', outline: 'none', resize: 'vertical', minHeight: 110, transition: 'all 0.15s ease'
                                                    }}
                                                    onFocus={e => {
                                                        e.currentTarget.style.borderColor = 'var(--accent)';
                                                        e.currentTarget.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.3)';
                                                    }}
                                                    onBlur={e => {
                                                        e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.2)';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }}
                                                    autoFocus
                                                />
                                            )}

                                            {/* Image banner upload button (for image) */}
                                            {block.type === 'image' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    <input
                                                        ref={bannerFileRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleUploadBanner}
                                                        style={{ display: 'none' }}
                                                    />
                                                    <div
                                                        onDragOver={handleDragOverBanner}
                                                        onDragLeave={handleDragLeaveBanner}
                                                        onDrop={handleDropBanner}
                                                        onClick={() => bannerFileRef.current?.click()}
                                                        style={{
                                                            flex: 1,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 10,
                                                            padding: '30px 20px',
                                                            fontSize: 14,
                                                            background: uploadingImageBlock 
                                                                ? 'rgba(var(--text-rgb),0.03)' 
                                                                : isDraggingBanner 
                                                                    ? 'rgba(99, 102, 241, 0.15)' 
                                                                    : 'rgba(var(--text-rgb),0.06)',
                                                            border: uploadingImageBlock
                                                                ? '2px dashed rgba(var(--text-rgb),0.1)'
                                                                : isDraggingBanner
                                                                    ? '2.5px dashed var(--accent)'
                                                                    : '1.5px dashed rgba(var(--text-rgb),0.25)',
                                                            color: 'var(--text-primary)',
                                                            borderRadius: 16,
                                                            cursor: uploadingImageBlock ? 'not-allowed' : 'pointer',
                                                            fontWeight: 700,
                                                            transition: 'all 0.2s ease',
                                                            boxShadow: isDraggingBanner ? '0 0 20px rgba(99, 102, 241, 0.45)' : 'none',
                                                        }}
                                                        onMouseEnter={e => {
                                                            if (!uploadingImageBlock && !isDraggingBanner) {
                                                                e.currentTarget.style.background = 'rgba(var(--text-rgb),0.12)';
                                                                e.currentTarget.style.borderColor = 'var(--accent)';
                                                            }
                                                        }}
                                                        onMouseLeave={e => {
                                                            if (!uploadingImageBlock && !isDraggingBanner) {
                                                                e.currentTarget.style.background = 'rgba(var(--text-rgb),0.06)';
                                                                e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.25)';
                                                            }
                                                        }}
                                                    >
                                                        {uploadingImageBlock ? (
                                                            <>
                                                                <span style={{ fontSize: 24 }}>⏳</span>
                                                                <span>Uploading Banner...</span>
                                                            </>
                                                        ) : isDraggingBanner ? (
                                                            <>
                                                                <span style={{ fontSize: 32, animation: 'bounce 0.8s infinite' }}>📥</span>
                                                                <span style={{ color: 'var(--accent)' }}>Drop your image here!</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span style={{ fontSize: 24 }}>☁️</span>
                                                                <span>Click or Drag & Drop to Upload Banner Image</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {editImageUrl && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(var(--text-rgb),0.02)', padding: 10, borderRadius: 10, border: '1px solid rgba(var(--text-rgb),0.08)' }}>
                                                            <img src={editImageUrl} alt="Current Banner" style={{ width: 80, height: 48, objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(var(--text-rgb),0.2)' }} />
                                                            <span style={{ fontSize: 12, color: 'rgba(var(--text-rgb),0.5)', fontWeight: 600 }}>Current Banner Preview</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingBlockId(null)}
                                                    style={{
                                                        padding: '14px 22px', fontSize: 14, background: 'rgba(var(--text-rgb),0.08)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 12, fontWeight: 700, transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--text-rgb),0.15)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--text-rgb),0.08)'}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveBlockEdit(block.id)}
                                                    style={{
                                                        padding: '14px 22px', fontSize: 14, background: 'var(--accent)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 12, fontWeight: 800, transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
                                                    onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                                                >
                                                    Save Changes
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                // ─ STANDARD RENDERING WITH INTERACTIVE ACTIONS ─────────────────
                                let innerBlockElement = null;

                                if (block.type === 'header') {
                                    innerBlockElement = (
                                        <div style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '1.5px',
                                            color: 'rgba(var(--text-rgb), 0.65)',
                                            marginTop: 20,
                                            marginBottom: 8,
                                            paddingBottom: 6,
                                            borderBottom: '1px solid rgba(var(--text-rgb), 0.12)',
                                        }}>
                                            {block.title}
                                        </div>
                                    );
                                } else if (block.type === 'text') {
                                    innerBlockElement = (
                                        <div style={{
                                            width: '100%',
                                            padding: '16px 20px',
                                            background: 'rgba(var(--text-rgb), 0.08)',
                                            backdropFilter: 'blur(12px)',
                                            WebkitBackdropFilter: 'blur(12px)',
                                            border: '1px solid rgba(var(--text-rgb), 0.12)',
                                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                                            borderRadius: 12,
                                            color: 'rgba(var(--text-rgb), 0.95)',
                                            fontSize: '14.5px',
                                            lineHeight: 1.6,
                                            textAlign: 'justify',
                                            wordBreak: 'break-word',
                                        }}>
                                            {block.description}
                                        </div>
                                    );
                                } else if (block.type === 'image') {
                                    innerBlockElement = (
                                        <div style={{
                                            width: '100%',
                                            borderRadius: 14,
                                            overflow: 'hidden',
                                            border: '1px solid rgba(var(--text-rgb), 0.18)',
                                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                                            position: 'relative',
                                            background: 'rgba(var(--text-rgb), 0.05)',
                                        }}>
                                            <img
                                                src={block.imageUrl}
                                                alt={block.title || ''}
                                                style={{ width: '100%', height: 'auto', display: 'block' }}
                                            />
                                            {block.title && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%)',
                                                    padding: '16px 20px',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '15px',
                                                    fontWeight: 600,
                                                    textShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
                                                }}>
                                                    {block.title}
                                                </div>
                                            )}
                                        </div>
                                    );
                                } else if (block.type === 'video') {
                                    const getYouTubeId = (url?: string) => {
                                        if (!url) return null;
                                        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                                        const match = url.match(regExp);
                                        return (match && match[2].length === 11) ? match[2] : null;
                                    };
                                    const ytId = getYouTubeId(block.url);
                                    innerBlockElement = (
                                        <div style={{
                                            position: 'relative',
                                            width: '100%',
                                            paddingBottom: '56.25%', // 16:9 Aspect Ratio
                                            height: 0,
                                            borderRadius: 14,
                                            overflow: 'hidden',
                                            border: '1px solid rgba(var(--text-rgb), 0.18)',
                                            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.22)',
                                            background: '#000',
                                        }}>
                                            {ytId ? (
                                                <div style={{ position: 'absolute', inset: 0 }}>
                                                    <img
                                                        src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                                                        alt=""
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                                                    />
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '50%',
                                                        left: '50%',
                                                        transform: 'translate(-50%, -50%)',
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: '50%',
                                                        background: 'rgba(var(--text-rgb),0.9)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                                                    }}>
                                                        <span style={{ color: '#000', fontSize: 16, marginLeft: 4 }}>▶</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(var(--text-rgb),0.4)', fontSize: 13 }}>
                                                    YouTube Video
                                                </div>
                                            )}
                                        </div>
                                    );
                                } else {
                                    const platformKey = block.platform || 'custom';
                                    const hasCustomIcon = !!block.iconUrl;

                                    // Determine platform-tinted color background if any
                                    let buttonBackground = 'rgba(var(--text-rgb), 0.15)';
                                    let buttonTextColor = 'var(--text-primary)';
                                    if (platformKey === 'facebook') { buttonBackground = 'rgba(24, 119, 242, 0.6)'; buttonTextColor = 'white'; }
                                    else if (platformKey === 'instagram') { buttonBackground = 'linear-gradient(135deg, rgba(225,48,108,0.6) 0%, rgba(253,121,61,0.6) 100%)'; buttonTextColor = 'white'; }
                                    else if (platformKey === 'twitter' || platformKey === 'x') { buttonBackground = 'rgba(15, 20, 25, 0.6)'; buttonTextColor = 'white'; }
                                    else if (platformKey === 'linkedin') { buttonBackground = 'rgba(10, 102, 194, 0.6)'; buttonTextColor = 'white'; }
                                    else if (platformKey === 'bluesky') { buttonBackground = 'rgba(0, 133, 255, 0.5)'; buttonTextColor = 'white'; }
                                    else if (platformKey === 'threads') { buttonBackground = 'rgba(0, 0, 0, 0.5)'; buttonTextColor = 'white'; }
                                    else if (platformKey === 'telegram') { buttonBackground = 'rgba(0, 136, 204, 0.6)'; buttonTextColor = 'white'; }
                                    else if (platformKey === 'whatsapp') { buttonBackground = 'rgba(37, 211, 102, 0.6)'; buttonTextColor = 'white'; }
                                    else if (platformKey === 'youtube') { buttonBackground = 'rgba(255, 0, 0, 0.6)'; buttonTextColor = 'white'; }
                                    else if (platformKey === 'tiktok') { buttonBackground = 'rgba(0, 0, 0, 0.6)'; buttonTextColor = 'white'; }

                                    innerBlockElement = (
                                        <div style={{
                                            width: '100%',
                                            padding: '16px 20px',
                                            borderRadius: BUTTON_STYLES.find(b => b.key === settings?.buttonStyle)?.radius || '14px',
                                            background: buttonBackground,
                                            backdropFilter: 'blur(12px)',
                                            WebkitBackdropFilter: 'blur(12px)',
                                            border: '1px solid rgba(var(--text-rgb),0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 14,
                                            color: buttonTextColor,
                                            fontSize: 15,
                                            fontWeight: 600,
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                            letterSpacing: '0.1px',
                                        }}>
                                            {platformKey !== 'none' && (
                                                <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {hasCustomIcon ? (
                                                        <img src={block.iconUrl} alt="" style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 4 }} />
                                                    ) : (
                                                        <PlatformIcon platform={platformKey} size={20} color="white" />
                                                    )}
                                                </div>
                                            )}
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block.title}</span>
                                        </div>
                                    );
                                }


                                return (
                                    <div
                                        key={block.id}
                                        onMouseEnter={() => setHoveredBlockId(block.id)}
                                        onMouseLeave={() => setHoveredBlockId(null)}
                                        onClick={() => handleStartEditBlock(block)}
                                        style={{
                                            width: '100%',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            border: isHovered ? '2px solid var(--accent)' : '2px solid transparent',
                                            borderRadius: '14px',
                                            padding: '2px',
                                            boxSizing: 'border-box',
                                            transition: 'all 0.15s ease',
                                            boxShadow: isHovered ? '0 0 12px rgba(99, 102, 241, 0.5)' : 'none',
                                        }}
                                    >
                                        {innerBlockElement}

                                        {/* Floated Action Toolbar on Hover */}
                                        {isHovered && (
                                            <div
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    position: 'absolute',
                                                    top: -12,
                                                    right: 6,
                                                    background: '#18181b',
                                                    border: '1px solid #3f3f46',
                                                    borderRadius: '6px',
                                                    padding: '2px 4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                                    zIndex: 20
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleStartEditBlock(block)}
                                                    style={{
                                                        background: 'none', border: 'none', color: '#6366f1',
                                                        fontSize: 9, cursor: 'pointer', padding: '2px 4px', fontWeight: 'bold'
                                                    }}
                                                    title="Edit Block Content"
                                                >
                                                    ✎
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveBlock(idx, 'up')}
                                                    disabled={idx === 0}
                                                    style={{
                                                        background: 'none', border: 'none', color: 'var(--text-primary)',
                                                        fontSize: 9, cursor: 'pointer', padding: '2px 4px',
                                                        opacity: idx === 0 ? 0.3 : 1
                                                    }}
                                                    title="Move Up"
                                                >
                                                    ▲
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveBlock(idx, 'down')}
                                                    disabled={idx === customLinks.length - 1}
                                                    style={{
                                                        background: 'none', border: 'none', color: 'var(--text-primary)',
                                                        fontSize: 9, cursor: 'pointer', padding: '2px 4px',
                                                        opacity: idx === customLinks.length - 1 ? 0.3 : 1
                                                    }}
                                                    title="Move Down"
                                                >
                                                    ▼
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteBlock(block.id)}
                                                    style={{
                                                        background: 'none', border: 'none', color: '#ef4444',
                                                        fontSize: 9, cursor: 'pointer', padding: '2px 4px', fontWeight: 'bold'
                                                    }}
                                                    title="Delete Block"
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Direct + Add Block Trigger inside Mockup */}
                            {quickAddOpen ? (
                                <div style={{
                                    width: '100%', padding: '24px 20px', borderRadius: '16px',
                                    background: 'rgba(12, 12, 22, 0.98)', border: '2px dashed var(--accent)',
                                    display: 'flex', flexDirection: 'column', gap: 16,
                                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
                                    animation: 'fadeIn 0.2s ease-out'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent)', letterSpacing: '0.08em' }}>
                                            ➕ SELECT BLOCK TYPE
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setQuickAddOpen(false)}
                                            style={{
                                                background: 'rgba(var(--text-rgb),0.05)',
                                                border: '1px solid rgba(var(--text-rgb),0.1)',
                                                color: '#ef4444',
                                                fontSize: 12,
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--text-rgb),0.05)'}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                                        {([
                                            { key: 'link', label: '🔗 Link' },
                                            { key: 'header', label: 'Divider' },
                                            { key: 'text', label: 'Para' },
                                            { key: 'image', label: 'Banner' },
                                            { key: 'video', label: 'Video' }
                                        ] as const).map(opt => (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                onClick={() => {
                                                    handleAddBlockDirect(opt.key);
                                                    setQuickAddOpen(false);
                                                }}
                                                style={{
                                                    padding: '12px 6px', borderRadius: '10px',
                                                    border: '1px solid rgba(var(--text-rgb),0.12)',
                                                    background: 'rgba(var(--text-rgb),0.03)',
                                                    color: 'var(--text-primary)', fontSize: 12, fontWeight: 700,
                                                    cursor: 'pointer', transition: 'all 0.15s ease',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.18)';
                                                    e.currentTarget.style.borderColor = 'var(--accent)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(var(--text-rgb),0.03)';
                                                    e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.12)';
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Quick Add Connected Pages Grid */}
                                    {connectedPages.length > 0 && (
                                        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid rgba(var(--text-rgb),0.1)', paddingTop: 8 }}>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                                                ⚡ QUICK ADD CONNECTED PAGES
                                            </span>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                                {connectedPages.map((page: any) => {
                                                    const color = getPlatformColor(page.platform);
                                                    return (
                                                        <button
                                                            key={page.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const newBlockId = crypto.randomUUID();
                                                                const url = getUrlForPlatform(page.platform, page.platformPageId, page.pageName);
                                                                const newBlock: ProfileBlock = {
                                                                    id: newBlockId,
                                                                    type: 'link',
                                                                    title: page.pageName || `Visit our ${page.platform}`,
                                                                    url: url,
                                                                    platform: page.platform.toLowerCase(),
                                                                };
                                                                setCustomLinks(prev => [...prev, newBlock]);
                                                                setQuickAddOpen(false);
                                                                setMessage({ type: 'success', text: `✓ Added connected page ${page.platform}! Click "Save All Changes" to save permanently.` });
                                                            }}
                                                            style={{
                                                                padding: '10px 12px',
                                                                borderRadius: '8px',
                                                                border: `1px solid ${color}40`,
                                                                background: `${color}15`,
                                                                color: 'var(--text-primary)',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                justifyContent: 'flex-start'
                                                            }}
                                                            onMouseEnter={e => {
                                                                e.currentTarget.style.background = `${color}30`;
                                                                e.currentTarget.style.borderColor = color;
                                                            }}
                                                            onMouseLeave={e => {
                                                                e.currentTarget.style.background = `${color}15`;
                                                                e.currentTarget.style.borderColor = `${color}40`;
                                                            }}
                                                        >
                                                            <PlatformIcon platform={page.platform} size={13} color="white" />
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                                                                {page.pageName || page.platform}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    onClick={() => setQuickAddOpen(true)}
                                    style={{
                                        width: '100%', padding: '8px 12px',
                                        borderRadius: BUTTON_STYLES.find(b => b.key === settings?.buttonStyle)?.radius || '14px',
                                        border: '1px dashed rgba(var(--text-rgb),0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        color: 'rgba(var(--text-rgb),0.65)', fontSize: 10, fontWeight: 700,
                                        cursor: 'pointer', transition: 'all 0.15s ease',
                                        background: 'rgba(var(--text-rgb),0.02)',
                                        marginTop: 6
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                                        e.currentTarget.style.borderColor = 'var(--accent)';
                                        e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(var(--text-rgb),0.02)';
                                        e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.3)';
                                        e.currentTarget.style.color = 'rgba(var(--text-rgb),0.65)';
                                    }}
                                    title="Add block direct inside phone mockup"
                                >
                                    ➕ Add Page Layout Block
                                </div>
                            )}

                            {/* Default Website Link Block - WYSIWYG Editable */}
                            {editingWebsite ? (
                                <div style={{
                                    width: '100%', padding: '24px 20px', borderRadius: '16px',
                                    background: 'rgba(12, 12, 22, 0.98)', border: '2px solid var(--accent)',
                                    display: 'flex', flexDirection: 'column', gap: 14,
                                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
                                    animation: 'fadeIn 0.2s ease-out',
                                    marginTop: 8
                                }}>
                                    <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent)', letterSpacing: '0.08em' }}>
                                        ✏️ EDIT WEBSITE BUTTON
                                    </div>
                                    <input
                                        value={tempWebsiteLabel}
                                        onChange={e => setTempWebsiteLabel(e.target.value)}
                                        placeholder="Button Label (e.g. Visit our website)"
                                        style={{
                                            width: '100%', padding: '12px 14px', fontSize: 14,
                                            background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(var(--text-rgb),0.2)', borderRadius: '10px',
                                            color: 'var(--text-primary)', outline: 'none', transition: 'all 0.15s ease'
                                        }}
                                        onFocus={e => {
                                            e.currentTarget.style.borderColor = 'var(--accent)';
                                            e.currentTarget.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.25)';
                                        }}
                                        onBlur={e => {
                                            e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.2)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    />
                                    <input
                                        value={tempWebsiteUrl}
                                        onChange={e => setTempWebsiteUrl(e.target.value)}
                                        placeholder="Website Link (e.g. socialflow.io)"
                                        style={{
                                            width: '100%', padding: '12px 14px', fontSize: 14,
                                            background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(var(--text-rgb),0.2)', borderRadius: '10px',
                                            color: 'var(--text-primary)', outline: 'none', transition: 'all 0.15s ease'
                                        }}
                                        onFocus={e => {
                                            e.currentTarget.style.borderColor = 'var(--accent)';
                                            e.currentTarget.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.25)';
                                        }}
                                        onBlur={e => {
                                            e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.2)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                        <button
                                            type="button"
                                            onClick={() => setEditingWebsite(false)}
                                            style={{
                                                padding: '10px 16px', fontSize: 12, background: 'rgba(var(--text-rgb),0.08)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 8, fontWeight: 700, transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--text-rgb),0.15)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--text-rgb),0.08)'}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveWebsiteEdit}
                                            style={{
                                                padding: '10px 16px', fontSize: 12, background: 'var(--accent)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 8, fontWeight: 800, transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
                                            onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                settings?.website ? (
                                    <div
                                        onClick={handleStartEditWebsite}
                                        style={{
                                            width: '100%',
                                            padding: '16px 20px',
                                            borderRadius: BUTTON_STYLES.find(b => b.key === settings?.buttonStyle)?.radius || '14px',
                                            background: 'rgba(var(--text-rgb),0.2)',
                                            backdropFilter: 'blur(12px)',
                                            WebkitBackdropFilter: 'blur(12px)',
                                            border: '1px solid rgba(var(--text-rgb),0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 14,
                                            color: 'var(--text-primary)',
                                            fontSize: 15,
                                            fontWeight: 600,
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            transition: 'all 0.18s ease',
                                            marginTop: 4
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.02)';
                                            e.currentTarget.style.border = '1px dashed var(--accent)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.border = '1px solid rgba(var(--text-rgb),0.2)';
                                        }}
                                        title="Click to edit website button"
                                    >
                                        <IconGlobe size={20} color="white" />
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', marginRight: 20 }}>
                                            {settings.websiteLabel || 'Visit our website'}
                                        </span>
                                        <span style={{ fontSize: 11, opacity: 0.5, position: 'absolute', right: 20 }}>✎</span>
                                    </div>
                                ) : (
                                    <div
                                        onClick={handleStartEditWebsite}
                                        style={{
                                            width: '100%',
                                            padding: '16px 20px',
                                            borderRadius: BUTTON_STYLES.find(b => b.key === settings?.buttonStyle)?.radius || '14px',
                                            border: '1.5px dashed rgba(var(--text-rgb),0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            color: 'rgba(var(--text-rgb),0.5)',
                                            fontSize: 14,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            marginTop: 4
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(var(--text-rgb),0.05)';
                                            e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'rgba(var(--text-rgb),0.5)';
                                        }}
                                        title="Click to add website link button"
                                    >
                                        🌐 + Add Website Button ✎
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Frosted Glass Theme Drawer inside the Mockup */}
                    {themeDrawerOpen && (
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            background: 'rgba(10, 10, 18, 0.96)', backdropFilter: 'blur(16px)',
                            borderTop: '2px solid var(--accent)', borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
                            padding: '24px 20px', zIndex: 90, display: 'flex', flexDirection: 'column', gap: 22,
                            boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
                            animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            height: '65vh',
                            overflowY: 'auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(var(--text-rgb),0.1)', paddingBottom: 10 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 16 }}>🎨</span> Theme Styling
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setThemeDrawerOpen(false)}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        color: '#f87171',
                                        fontSize: 11,
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#ef4444';
                                        e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                        e.currentTarget.style.color = '#f87171';
                                    }}
                                >
                                    Close ✕
                                </button>
                            </div>

                            {/* Presets Grid */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>BACKGROUND PRESETS</span>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                                    {BG_PRESETS.map(preset => {
                                        const isSelected = settings?.bgStyle === preset.key && !settings?.bgImageUrl;
                                        return (
                                            <button
                                                key={preset.key}
                                                type="button"
                                                onClick={() => set({ bgStyle: preset.key, bgImageUrl: undefined })}
                                                title={preset.label}
                                                style={{
                                                    height: 42,
                                                    borderRadius: 8,
                                                    cursor: 'pointer',
                                                    background: preset.css,
                                                    border: isSelected
                                                        ? '2px solid white'
                                                        : '1px solid rgba(var(--text-rgb),0.2)',
                                                    boxShadow: isSelected
                                                        ? '0 0 12px var(--accent), 0 4px 10px rgba(0,0,0,0.3)'
                                                        : '0 2px 4px rgba(0,0,0,0.1)',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1.08)';
                                                    e.currentTarget.style.zIndex = '2';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.zIndex = '1';
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Custom Background Uploader */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>CUSTOM BACKGROUND IMAGE</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {settings?.bgImageUrl ? (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            background: 'rgba(var(--text-rgb),0.03)',
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(var(--text-rgb),0.06)'
                                        }}>
                                            <img
                                                src={settings.bgImageUrl}
                                                alt="Custom Background"
                                                style={{
                                                    width: 52,
                                                    height: 42,
                                                    objectFit: 'cover',
                                                    borderRadius: 6,
                                                    border: '1px solid rgba(var(--text-rgb),0.15)'
                                                }}
                                            />
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Custom Image</span>
                                                <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 600 }}>Active</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleDeleteBg}
                                                style={{
                                                    padding: '10px 16px',
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    color: '#f87171',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: 8,
                                                    cursor: 'pointer',
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    transition: 'all 0.15s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#ef4444';
                                                    e.currentTarget.style.color = 'white';
                                                    e.currentTarget.style.borderColor = '#ef4444';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                                    e.currentTarget.style.color = '#f87171';
                                                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                                }}
                                            >
                                                Remove 🗑
                                            </button>
                                        </div>
                                    ) : (
                                        <label style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            height: 48,
                                            background: 'rgba(var(--text-rgb),0.03)',
                                            color: 'var(--text-primary)',
                                            border: '2px dashed rgba(var(--text-rgb),0.15)',
                                            borderRadius: 10,
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(var(--text-rgb),0.06)';
                                            e.currentTarget.style.borderColor = 'var(--accent)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(var(--text-rgb),0.03)';
                                            e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.15)';
                                        }}
                                        >
                                            {uploadingBg ? '⏳ Uploading...' : '☁  Upload Background Image'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleUploadBg}
                                                disabled={uploadingBg}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Button Corners Style */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>BUTTON CORNER STYLE</span>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                    {BUTTON_STYLES.map(btn => {
                                        const isSelected = settings?.buttonStyle === btn.key;
                                        const previewRadius = btn.key === 'pill' ? '20px' : btn.key === 'rounded' ? '8px' : '2px';
                                        return (
                                            <button
                                                key={btn.key}
                                                type="button"
                                                onClick={() => set({ buttonStyle: btn.key })}
                                                style={{
                                                    height: 48,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 4,
                                                    borderRadius: 8,
                                                    border: isSelected ? '2px solid var(--accent)' : '1px solid rgba(var(--text-rgb),0.12)',
                                                    background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(var(--text-rgb),0.03)',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.background = 'rgba(var(--text-rgb),0.07)';
                                                        e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.25)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.background = 'rgba(var(--text-rgb),0.03)';
                                                        e.currentTarget.style.borderColor = 'rgba(var(--text-rgb),0.12)';
                                                    }
                                                }}
                                            >
                                                <div style={{
                                                    width: 28,
                                                    height: 10,
                                                    border: isSelected ? '1px solid white' : '1px solid rgba(var(--text-rgb),0.4)',
                                                    borderRadius: previewRadius,
                                                    background: isSelected ? 'var(--accent)' : 'transparent',
                                                }} />
                                                <span style={{ fontSize: 10, fontWeight: 800 }}>{btn.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{ marginTop: 'auto', paddingTop: 20, fontSize: 9, color: 'rgba(var(--text-rgb),0.3)', textAlign: 'center' }}>
                        Made with SocialFlow
                    </div>
                </div>
            </div>

        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 8,
    fontSize: 12, fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
};
