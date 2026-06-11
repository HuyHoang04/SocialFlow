'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import { useToast } from '@/components/Toast';
import { IconPlus, IconTrash, IconRefreshCw, IconFileText, IconEdit } from '@/components/Icons';
import '../rag-library/rag-library.css';

interface LibraryFile {
    id: string;
    filename: string;
    category?: string;
    size?: number;
    uploadedAt?: string;
}

export default function LibraryContent() {
    const { selectedBrand: brand } = useBrand();
    const { toast } = useToast();
    const [files, setFiles] = useState<LibraryFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    const [success, setSuccess] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [showUploadForm, setShowUploadForm] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Edit state
    const [editingFile, setEditingFile] = useState<LibraryFile | null>(null);
    const [editContent, setEditContent] = useState('');
    const [loadingContent, setLoadingContent] = useState(false);
    const [savingContent, setSavingContent] = useState(false);

    const loadFiles = useCallback(async () => {
        if (!brand) return;
        setLoading(true);
        
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const data = await api.ragListLibrary(brand.id, itemsPerPage, offset);
            setFiles(Array.isArray(data) ? data : (data?.files || []));
        } catch (err: any) {
            toast('Operation failed', 'error', err.message || 'Failed to load library files')
        } finally {
            setLoading(false);
        }
    }, [brand?.id, currentPage]);

    useEffect(() => { loadFiles(); }, [loadFiles]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !brand) return;
        setSelectedFile(file);
        setShowUploadForm(true);
    };

    const handleConfirmUpload = async () => {
        if (!selectedFile || !brand) return;
        setUploading(true);
        
        try {
            await api.ragUploadFile(brand.id, selectedFile, selectedCategory || undefined);
            setSuccess('✓ File uploaded successfully!');
            setCurrentPage(1);
            setShowUploadForm(false);
            setSelectedFile(null);
            setTimeout(() => loadFiles(), 100);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            toast('Operation failed', 'error', err.message || 'Failed to upload file')
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, filename: string) => {
        if (!confirm(`Delete "${filename}"?`)) return;
        if (!brand) return;
        try {
            await api.ragDeleteFile(brand.id, id);
            setFiles(prev => prev.filter(f => f.id !== id));
        } catch (err: any) {
            toast(err.message || 'Delete failed', 'error');
        }
    };

    const handleEditClick = async (file: LibraryFile) => {
        if (!brand) return;
        setEditingFile(file);
        setEditContent('');
        setLoadingContent(true);
        
        try {
            const res = await api.ragGetFileContent(brand.id, file.id);
            setEditContent(res?.content || '');
        } catch (err: any) {
            toast('Operation failed', 'error', err.message || 'Failed to load file content')
        } finally {
            setLoadingContent(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!brand || !editingFile) return;
        setSavingContent(true);
        
        try {
            await api.ragUpdateFileContent({
                brand_id: brand.id,
                library_id: editingFile.id,
                content: editContent
            });
            setSuccess('✓ Document updated successfully!');
            setEditingFile(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            toast('Operation failed', 'error', err.message || 'Failed to save document')
        } finally {
            setSavingContent(false);
        }
    };

    const filteredFiles = files.filter(file => 
        file.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!brand) return null;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <input 
                    type="text"
                    placeholder="🔍 Search documents..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ 
                        padding: '12px 16px', borderRadius: 'var(--radius)', 
                        background: 'var(--bg-glass)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', width: 300
                    }}
                />
                <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
                    {uploading ? 'Uploading...' : '+ Upload Document'}
                    <input type="file" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
                </label>
            </div>

            
            {success && <div className="success-msg" style={{ marginBottom: 24 }}>{success}</div>}

            {showUploadForm && selectedFile && (
                <div className="modal-overlay" onClick={() => !uploading && setShowUploadForm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Upload Document</h2>
                            <button className="modal-close" onClick={() => setShowUploadForm(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontWeight: 600 }}>📄 {selectedFile.name}</div>
                                <div style={{ fontSize: 12, opacity: 0.6 }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
                            </div>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Category</label>
                            <select 
                                className="form-input"
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                            >
                                <option value="">— No Category —</option>
                                <option value="BRAND_GUIDELINES">Brand Guidelines</option>
                                <option value="POST_TEMPLATES">Post Templates</option>
                                <option value="FAQ">FAQ</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowUploadForm(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleConfirmUpload} disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Confirm Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : filteredFiles.length === 0 ? (
                <div className="empty-state">
                    <IconFileText size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                    <h3>No documents found</h3>
                </div>
            ) : (
                <div className="rag-library-list">
                    <div className="rag-list-header">
                        <div className="col-name">Name</div>
                        <div className="col-category">Category</div>
                        <div className="col-date">Date</div>
                        <div className="col-actions">Actions</div>
                    </div>
                    {filteredFiles.map(file => (
                        <div key={file.id} className="rag-list-item">
                            <div className="col-name">{file.filename}</div>
                            <div className="col-category">{file.category || '—'}</div>
                            <div className="col-date">{file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : '—'}</div>
                            <div className="col-actions">
                                <button className="btn-icon-small" onClick={() => handleEditClick(file)} title="Edit Document">
                                    <IconEdit size={16} />
                                </button>
                                <button className="btn-icon-small" onClick={() => handleDelete(file.id, file.filename)} title="Delete">
                                    <IconTrash size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingFile && (
                <div className="modal-overlay" onClick={() => !savingContent && setEditingFile(null)}>
                    <div className="modal-content" style={{ maxWidth: 800, width: '90%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Document: {editingFile.filename}</h2>
                            <button className="modal-close" onClick={() => setEditingFile(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {loadingContent ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                                    <div className="spinner" />
                                </div>
                            ) : (
                                <>
                                    <div className="alert alert-warning" style={{ marginBottom: 16, fontSize: '0.9rem', color: '#856404', backgroundColor: '#fff3cd', borderColor: '#ffeeba', padding: '12px 16px', borderRadius: '4px' }}>
                                        <strong>Note:</strong> Saving changes will regenerate AI embeddings for this document. This may take a moment.
                                    </div>
                                    <textarea
                                        className="form-input"
                                        style={{ height: '400px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', resize: 'vertical' }}
                                        value={editContent}
                                        onChange={e => setEditContent(e.target.value)}
                                        placeholder="Document content..."
                                    />
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingFile(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={savingContent || loadingContent}>
                                {savingContent ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
