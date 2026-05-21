'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';
import { IconPlus, IconTrash, IconRefreshCw, IconFileText, IconBook } from '@/components/Icons';
import './rag-library.css';

interface LibraryFile {
    id: string;
    filename: string;
    category?: string;
    size?: number;
    uploadedAt?: string;
    metadata?: Record<string, any>;
}

export default function RAGLibraryPage() {
    const { selectedBrand: brand } = useBrand();
    const [files, setFiles] = useState<LibraryFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Upload form state
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);


    const loadFiles = useCallback(async () => {
        // Guard: Check if brand is loaded
        if (!brand) {
            console.warn('⚠️ Brand not loaded yet, skipping RAG library load');
            return;
        }

        if (!brand.id) {
            setError('Invalid brand ID');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            console.log('📚 Loading RAG library | Brand:', brand.id, 'Limit:', itemsPerPage, 'Offset:', offset);
            const data = await api.ragListLibrary(brand.id, itemsPerPage, offset);
            console.log('✓ RAG library loaded:', data);
            setFiles(Array.isArray(data) ? data : (data?.files || []));
        } catch (err: any) {
            console.error('✗ Failed to load RAG library:', err);
            setError(err.message || 'Failed to load library files');
        } finally {
            setLoading(false);
        }
    }, [brand, currentPage]);

    useEffect(() => { loadFiles(); }, [loadFiles]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !brand) {
            setError('Brand not loaded or no file selected');
            return;
        }

        // Validate file type and extension
        const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown'];
        const allowedExtensions = ['.pdf', '.txt', '.docx', '.md', '.markdown'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            setError('Only PDF, TXT, DOCX, and Markdown files are supported');
            return;
        }

        // Set file and show form for category selection
        setSelectedFile(file);
        setShowUploadForm(true);
    };

    const handleConfirmUpload = async () => {
        if (!selectedFile || !brand) {
            setError('Brand not loaded or no file selected');
            return;
        }

        setUploading(true);
        setError('');
        try {
            await api.ragUploadFile(
                brand.id, 
                selectedFile, 
                selectedCategory || undefined
            );
            console.log('✓ File uploaded successfully');
            setSuccess('✓ File uploaded successfully!');
            setCurrentPage(1); // Reset to first page to show newly uploaded file
            setSelectedCategory('');
            setShowUploadForm(false);
            setSelectedFile(null);
            // Reload files immediately
            setTimeout(() => loadFiles(), 100);
            // Auto-hide success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error('✗ Upload failed:', err);
            setError(err.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, filename: string) => {
        if (!confirm(`Delete "${filename}"? This action cannot be undone.`)) return;
        if (!brand) return;

        try {
            await api.ragDeleteFile(brand.id, id);
            setFiles(prev => prev.filter(f => f.id !== id));
        } catch (err: any) {
            alert(err.message || 'Delete failed');
        }
    };

    const filteredFiles = files.filter(file => {
        const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || file.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });



    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'Unknown';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <AppShell>
            {!brand ? (
                <div className="empty-state" style={{ marginTop: 60 }}>
                    <IconFileText size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <h3>Brand Required</h3>
                    <p>Please select a brand from the sidebar to view your content library</p>
                </div>
            ) : (
            <>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <IconBook size={28} />
                        Content Library (RAG)
                    </h1>
                    <p className="page-subtitle">Manage documents for AI-powered content generation</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <label className="btn btn-primary" style={{ cursor: 'pointer', marginBottom: 0 }}>
                        {uploading ? (
                            <>
                                <IconRefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <IconPlus size={16} /> Upload Document
                            </>
                        )}
                        <input 
                            type="file" 
                            onChange={handleFileUpload}
                            disabled={uploading}
                            accept=".pdf,.txt,.docx,.md"
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>
            </div>

            {error && <div className="error-msg" style={{ marginBottom: 24 }}>{error}</div>}
            {success && <div className="success-msg" style={{ marginBottom: 24 }}>{success}</div>}

            {/* Upload Form Modal */}
            {showUploadForm && selectedFile && (
                <div className="modal-overlay" onClick={() => !uploading && setShowUploadForm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <IconBook size={20} />
                                Upload Document
                            </h2>
                            <button 
                                className="modal-close"
                                onClick={() => !uploading && setShowUploadForm(false)}
                                disabled={uploading}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="upload-form-group">
                                <div className="file-info">
                                    <div className="file-info-name">📄 {selectedFile.name}</div>
                                    <div className="file-info-size">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                                </div>
                            </div>

                            <div className="upload-form-group">
                                <label className="upload-form-label">📁 Category (Optional)</label>
                                <select 
                                    className="upload-form-select"
                                    value={selectedCategory}
                                    onChange={e => setSelectedCategory(e.target.value)}
                                    disabled={uploading}
                                >
                                    <option style={{color:"black"}} value="">— No Category —</option>
                                    <option style={{color:"black"}} value="BRAND_GUIDELINES">Brand Guidelines</option>
                                    <option style={{color:"black"}} value="POST_TEMPLATES">Post Templates</option>
                                    <option style={{color:"black"}} value="CUSTOMER_FEEDBACK">Customer Feedback</option>
                                    <option style={{color:"black"}} value="FAQ">FAQ</option>
                                    <option style={{color:"black"}} value="COMPETITOR_ANALYSIS">Competitor Analysis</option>
                                    <option style={{color:"black"}} value="MEDIA_ASSETS">Media Assets</option>
                                    <option style={{color:"black"}} value="OTHER">Other</option>
                                </select>
                            </div>

                        </div>

                        <div className="modal-footer">
                            <button 
                                className="btn-modal-cancel"
                                onClick={() => setShowUploadForm(false)}
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn-modal-save"
                                onClick={handleConfirmUpload}
                                disabled={uploading}
                            >
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="rag-library-filters">
                <input 
                    type="text"
                    placeholder="🔍 Search documents..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="search-input"
                />
            </div>

            {/* Files List */}
            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading files...</p>
                </div>
            ) : filteredFiles.length === 0 ? (
                <div className="empty-state">
                    <IconFileText size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <h3>No documents found</h3>
                    <p>
                        {files.length === 0 
                            ? 'Upload your first document to get started with RAG-powered content generation'
                            : 'No documents match your search criteria'
                        }
                    </p>
                </div>
            ) : (
                <div className="rag-library-list">
                    <div className="rag-list-header">
                        <div className="col-name">Document Name</div>
                        <div className="col-category">Category</div>
                        <div className="col-size">Size</div>
                        <div className="col-date">Upload Date</div>
                        <div className="col-actions">Actions</div>
                    </div>
                    {filteredFiles.map(file => (
                        <div key={file.id} className="rag-list-item">
                            <div className="col-name">
                                <IconFileText size={16} style={{ marginRight: 8 }} />
                                {file.filename}
                            </div>
                            <div className="col-category">
                                {file.category ? (
                                    <span className="category-badge">{file.category}</span>
                                ) : (
                                    <span style={{ color: 'var(--text-secondary)' }}>—</span>
                                )}
                            </div>
                            <div className="col-size">{formatFileSize(file.size)}</div>
                            <div className="col-date">{formatDate(file.uploadedAt)}</div>
                            <div className="col-actions">
                                <button 
                                    className="btn-icon-small"
                                    title="Delete"
                                    onClick={() => handleDelete(file.id, file.filename)}
                                >
                                    <IconTrash size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {filteredFiles.length > 0 && (
                <div className="pagination">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="btn-pagination"
                    >
                        ← Previous
                    </button>
                    <span className="pagination-info">Page {currentPage}</span>
                    <button 
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={filteredFiles.length < itemsPerPage}
                        className="btn-pagination"
                    >
                        Next →
                    </button>
                </div>
            )}
            </>
            )}
        </AppShell>
    );
}
