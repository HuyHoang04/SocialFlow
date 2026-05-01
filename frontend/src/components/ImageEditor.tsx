'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { IconX, IconEdit, IconTrash, IconImage, IconUpload, IconFilm, IconSearch } from '@/components/Icons';

interface ImageEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { imageBase64: string; filename: string }) => void;
    imageUrl: string;
    filename: string;
}

type EditorTab = 'filter' | 'adjust' | 'text' | 'shape' | 'crop';

const ImageEditor: React.FC<ImageEditorProps> = ({ isOpen, onClose, onSave, imageUrl, filename }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvas = useRef<fabric.Canvas | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<EditorTab>('filter');
    const [zoom, setZoom] = useState(1);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isCropping, setIsCropping] = useState(false);
    const [exportName, setExportName] = useState(filename.split('.')[0]);
    const cropRectRef = useRef<fabric.Rect | null>(null);
    
    // Adjustment states
    const [brightness, setBrightness] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [blur, setBlur] = useState(0);

    // 1. Initialize Canvas
    useEffect(() => {
        if (!isOpen) return;

        const initCanvas = async () => {
            if (!canvasRef.current || !containerRef.current) return;

            const container = containerRef.current;
            const canvas = new fabric.Canvas(canvasRef.current, {
                width: container.clientWidth,
                height: container.clientHeight,
                backgroundColor: '#18181b',
                preserveObjectStacking: true,
            });
            fabricCanvas.current = canvas;

            try {
                const img = await fabric.FabricImage.fromURL(imageUrl, {
                    crossOrigin: 'anonymous'
                });
                
                // Center and scale image
                const scale = Math.min(
                    (canvas.width! - 100) / img.width!,
                    (canvas.height! - 100) / img.height!
                );
                
                img.set({
                    scaleX: scale,
                    scaleY: scale,
                    left: canvas.width! / 2,
                    top: canvas.height! / 2,
                    originX: 'center',
                    originY: 'center',
                    cornerColor: 'white',
                    cornerStrokeColor: '#6c5ce7',
                    transparentCorners: false,
                    cornerSize: 10,
                    padding: 10,
                });

                canvas.add(img);
                canvas.setActiveObject(img);
                saveToHistory();
                setLoading(false);
            } catch (err) {
                console.error('Fabric Init Error:', err);
                setLoading(false);
            }

            // Event Listeners
            canvas.on('object:modified', saveToHistory);
            canvas.on('selection:created', () => forceUpdate());
            canvas.on('selection:cleared', () => forceUpdate());
        };

        const timer = setTimeout(initCanvas, 100);
        return () => {
            clearTimeout(timer);
            fabricCanvas.current?.dispose();
            fabricCanvas.current = null;
        };
    }, [isOpen, imageUrl]);

    const [, updateState] = useState({});
    const forceUpdate = useCallback(() => updateState({}), []);

    const saveToHistory = () => {
        if (!fabricCanvas.current) return;
        const json = JSON.stringify(fabricCanvas.current.toJSON());
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            return [...newHistory, json];
        });
        setHistoryIndex(prev => prev + 1);
    };

    const undo = () => {
        if (historyIndex > 0 && fabricCanvas.current) {
            const newIndex = historyIndex - 1;
            fabricCanvas.current.loadFromJSON(JSON.parse(history[newIndex]), () => {
                fabricCanvas.current?.renderAll();
                setHistoryIndex(newIndex);
            });
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1 && fabricCanvas.current) {
            const newIndex = historyIndex + 1;
            fabricCanvas.current.loadFromJSON(JSON.parse(history[newIndex]), () => {
                fabricCanvas.current?.renderAll();
                setHistoryIndex(newIndex);
            });
        }
    };

    // 2. Tools
    const addText = () => {
        if (!fabricCanvas.current) return;
        const text = new fabric.IText('Double Tap to Edit', {
            left: fabricCanvas.current.width! / 2,
            top: fabricCanvas.current.height! / 2,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 40,
            fill: '#ffffff',
            fontWeight: 'bold',
        });
        fabricCanvas.current.add(text);
        fabricCanvas.current.setActiveObject(text);
        saveToHistory();
    };

    const addShape = (type: 'rect' | 'circle' | 'triangle') => {
        if (!fabricCanvas.current) return;
        let shape;
        const common = {
            left: fabricCanvas.current.width! / 2,
            top: fabricCanvas.current.height! / 2,
            fill: 'rgba(108, 92, 231, 0.5)',
            stroke: '#6c5ce7',
            strokeWidth: 2,
            width: 100,
            height: 100,
            originX: 'center' as const,
            originY: 'center' as const,
        };

        if (type === 'rect') shape = new fabric.Rect(common);
        else if (type === 'circle') shape = new fabric.Circle({ ...common, radius: 50 });
        else shape = new fabric.Triangle(common);

        fabricCanvas.current.add(shape);
        fabricCanvas.current.setActiveObject(shape);
        saveToHistory();
    };

    const applyFilter = (filterType: string) => {
        if (!fabricCanvas.current) return;
        const active = fabricCanvas.current.getActiveObject();
        if (active && active instanceof fabric.FabricImage) {
            let filter: fabric.filters.BaseFilter<string, any, any> | undefined;
            switch(filterType) {
                case 'grayscale': filter = new fabric.filters.Grayscale(); break;
                case 'sepia': filter = new fabric.filters.Sepia(); break;
                case 'invert': filter = new fabric.filters.Invert(); break;
                case 'vintage': filter = new fabric.filters.Vintage(); break;
                case 'kodachrome': filter = new fabric.filters.Kodachrome(); break;
                case 'none': active.filters = []; break;
                default: return;
            }
            if (filterType !== 'none' && filter) active.filters.push(filter as any);
            active.applyFilters();
            fabricCanvas.current.renderAll();
            saveToHistory();
        }
    };

    const handleAdjust = (type: 'brightness' | 'contrast' | 'saturation' | 'blur', val: number) => {
        if (!fabricCanvas.current) return;
        const active = fabricCanvas.current.getActiveObject();
        if (active && active instanceof fabric.FabricImage) {
            // Remove existing adjustment filter of same type if any
            active.filters = active.filters.filter(f => f.type.toLowerCase() !== type);
            
            let filter: fabric.filters.BaseFilter<string, any, any> | undefined;
            if (type === 'brightness') filter = new fabric.filters.Brightness({ brightness: val });
            else if (type === 'contrast') filter = new fabric.filters.Contrast({ contrast: val });
            else if (type === 'saturation') filter = new fabric.filters.Saturation({ saturation: val });
            
            if (filter) active.filters.push(filter);
            active.applyFilters();
            fabricCanvas.current.renderAll();
        }
    };

    const startCrop = () => {
        if (!fabricCanvas.current) return;
        setIsCropping(true);
        
        const canvas = fabricCanvas.current;
        const width = canvas.width! * 0.6;
        const height = canvas.height! * 0.6;
        
        const rect = new fabric.Rect({
            left: canvas.width! / 2,
            top: canvas.height! / 2,
            originX: 'center',
            originY: 'center',
            width,
            height,
            fill: 'rgba(0,0,0,0.3)',
            stroke: '#6c5ce7',
            strokeWidth: 2,
            dashArray: [5, 5],
            cornerColor: '#6c5ce7',
            cornerSize: 12,
            transparentCorners: false,
            hasRotatingPoint: false,
        });
        
        canvas.add(rect);
        canvas.setActiveObject(rect);
        cropRectRef.current = rect;
        canvas.renderAll();
    };

    const applyCrop = () => {
        if (!fabricCanvas.current || !cropRectRef.current) return;
        const canvas = fabricCanvas.current;
        const rect = cropRectRef.current;
        
        // Hide crop rect to not include it in the crop
        rect.set({ visible: false });
        canvas.discardActiveObject();
        canvas.renderAll();

        // Use getBoundingRect for accurate coordinates regardless of origin/scale
        const bound = rect.getBoundingRect();
        
        const croppedData = canvas.toDataURL({
            left: bound.left,
            top: bound.top,
            width: bound.width,
            height: bound.height,
            format: 'png',
            multiplier: 2 
        });

        // Adjust canvas dimensions to match crop aspect ratio
        const cropWidth = bound.width;
        const cropHeight = bound.height;
        
        canvas.setDimensions({
            width: cropWidth,
            height: cropHeight
        });

        // Clear canvas and load cropped image
        canvas.clear();
        canvas.backgroundColor = '#18181b';
        
        fabric.FabricImage.fromURL(croppedData, { crossOrigin: 'anonymous' }).then(img => {
            img.set({
                left: 0,
                top: 0,
                originX: 'left',
                originY: 'top',
                width: cropWidth,
                height: cropHeight,
                scaleX: 1,
                scaleY: 1,
                selectable: true
            });

            canvas.add(img);
            canvas.setActiveObject(img);
            setIsCropping(false);
            cropRectRef.current = null;
            
            // Adjust zoom to fit the new canvas size in the container
            const container = containerRef.current;
            if (container) {
                const zoomX = (container.clientWidth - 100) / cropWidth;
                const zoomY = (container.clientHeight - 100) / cropHeight;
                setZoom(Math.min(zoomX, zoomY, 1));
            }
            
            saveToHistory();
            canvas.renderAll();
        });
    };

    const setAspectRatio = (ratio: number | null) => {
        if (!cropRectRef.current || !fabricCanvas.current) return;
        const rect = cropRectRef.current;
        if (ratio) {
            rect.set({
                height: rect.width! / ratio,
                lockAspectRatio: true
            });
        } else {
            rect.set({ lockAspectRatio: false });
        }
        fabricCanvas.current.renderAll();
    };

    const handleSave = () => {
        if (!fabricCanvas.current) return;
        setLoading(true);
        // Clear selection to not include handles in final image
        fabricCanvas.current.discardActiveObject();
        fabricCanvas.current.renderAll();
        
        const dataURL = fabricCanvas.current.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 2 // High resolution export
        });
        onSave({ 
            imageBase64: dataURL, 
            filename: exportName.endsWith('.png') ? exportName : `${exportName}.png` 
        });
    };

    if (!isOpen) return null;

    return (
        <div className="studio-overlay">
            <div className="studio-container">
                {/* Header */}
                <header className="studio-header">
                    <div className="header-left">
                        <div className="app-logo">
                            <div className="logo-icon">✨</div>
                            <span className="logo-text">SocialFlow Studio</span>
                        </div>
                        <div className="divider" />
                        <input 
                            className="filename-input" 
                            value={exportName} 
                            onChange={(e) => setExportName(e.target.value)}
                            placeholder="File name"
                        />
                        <span className="file-ext">.png</span>
                    </div>
                    
                    <div className="header-center">
                        <button className="icon-btn" onClick={undo} disabled={historyIndex <= 0} title="Undo">↩️</button>
                        <button className="icon-btn" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">↪️</button>
                        <div className="divider" />
                        <button className="icon-btn" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>➖</button>
                        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                        <button className="icon-btn" onClick={() => setZoom(z => Math.min(3, z + 0.1))}>➕</button>
                    </div>

                    <div className="header-right">
                        <button className="btn-close" onClick={onClose}><IconX size={20} /></button>
                        <button className="btn-save" onClick={handleSave}>
                            {loading ? 'Processing...' : 'Export Image'}
                        </button>
                    </div>
                </header>

                <main className="studio-body">
                    {/* Left Sidebar - Tab Switcher */}
                    <aside className="studio-sidebar">
                        <TabItem active={activeTab === 'filter'} onClick={() => setActiveTab('filter')} icon="🎭" label="Filters" />
                        <TabItem active={activeTab === 'adjust'} onClick={() => setActiveTab('adjust')} icon="🎚️" label="Adjust" />
                        <TabItem active={activeTab === 'text'} onClick={() => setActiveTab('text')} icon="📝" label="Text" />
                        <TabItem active={activeTab === 'shape'} onClick={() => setActiveTab('shape')} icon="📐" label="Shapes" />
                        <TabItem active={activeTab === 'crop'} onClick={() => setActiveTab('crop')} icon="✂️" label="Crop" />
                        <div className="sidebar-bottom">
                            <button className="tool-btn danger" onClick={() => {
                                const active = fabricCanvas.current?.getActiveObject();
                                if (active) {
                                    fabricCanvas.current?.remove(active);
                                    saveToHistory();
                                }
                            }} title="Delete Selected">
                                <IconTrash size={20} />
                            </button>
                        </div>
                    </aside>

                    {/* Left Sub-Sidebar - Tool Options */}
                    <aside className="studio-controls">
                        <div className="controls-header">
                            <h3>{activeTab.toUpperCase()}</h3>
                        </div>
                        <div className="controls-content">
                            {activeTab === 'filter' && (
                                <div className="grid-list">
                                    <FilterCard label="None" onClick={() => applyFilter('none')} />
                                    <FilterCard label="Grayscale" onClick={() => applyFilter('grayscale')} />
                                    <FilterCard label="Sepia" onClick={() => applyFilter('sepia')} />
                                    <FilterCard label="Vintage" onClick={() => applyFilter('vintage')} />
                                    <FilterCard label="Kodachrome" onClick={() => applyFilter('kodachrome')} />
                                    <FilterCard label="Invert" onClick={() => applyFilter('invert')} />
                                </div>
                            )}
                            {activeTab === 'adjust' && (
                                <div className="slider-list">
                                    <AdjustSlider label="Brightness" value={brightness} min={-1} max={1} step={0.01} onChange={(v: number) => { setBrightness(v); handleAdjust('brightness', v); }} />
                                    <AdjustSlider label="Contrast" value={contrast} min={-1} max={1} step={0.01} onChange={(v: number) => { setContrast(v); handleAdjust('contrast', v); }} />
                                    <AdjustSlider label="Saturation" value={saturation} min={-1} max={1} step={0.01} onChange={(v: number) => { setSaturation(v); handleAdjust('saturation', v); }} />
                                </div>
                            )}
                            {activeTab === 'text' && (
                                <div className="button-list">
                                    <button className="action-btn-large" onClick={addText}>+ Add Textbox</button>
                                    <p className="hint">Double click text on canvas to edit content</p>
                                </div>
                            )}
                            {activeTab === 'shape' && (
                                <div className="grid-list">
                                    <ShapeItem label="Square" onClick={() => addShape('rect')} icon="⬜" />
                                    <ShapeItem label="Circle" onClick={() => addShape('circle')} icon="⭕" />
                                    <ShapeItem label="Triangle" onClick={() => addShape('triangle')} icon="🔺" />
                                </div>
                            )}
                            {activeTab === 'crop' && (
                                <div className="button-list">
                                    {!isCropping ? (
                                        <button className="action-btn-large" onClick={startCrop}>Enter Crop Mode</button>
                                    ) : (
                                        <>
                                            <div className="aspect-ratios">
                                                <button onClick={() => setAspectRatio(null)}>Free</button>
                                                <button onClick={() => setAspectRatio(1)}>1:1</button>
                                                <button onClick={() => setAspectRatio(4/5)}>4:5</button>
                                                <button onClick={() => setAspectRatio(16/9)}>16:9</button>
                                            </div>
                                            <div className="custom-ratio">
                                                <input 
                                                    type="number" 
                                                    placeholder="W" 
                                                    onChange={(e) => {
                                                        const w = parseFloat(e.target.value);
                                                        const h = parseFloat((document.getElementById('ratio-h') as HTMLInputElement)?.value || '1');
                                                        if (w && h) setAspectRatio(w/h);
                                                    }}
                                                    id="ratio-w"
                                                />
                                                <span>:</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="H" 
                                                    onChange={(e) => {
                                                        const h = parseFloat(e.target.value);
                                                        const w = parseFloat((document.getElementById('ratio-w') as HTMLInputElement)?.value || '1');
                                                        if (w && h) setAspectRatio(w/h);
                                                    }}
                                                    id="ratio-h"
                                                />
                                            </div>
                                            <button className="btn-save" style={{ width: '100%', marginTop: 12 }} onClick={applyCrop}>Apply Crop</button>
                                            <button className="action-btn-large" style={{ marginTop: 8 }} onClick={() => {
                                                if (cropRectRef.current) fabricCanvas.current?.remove(cropRectRef.current);
                                                setIsCropping(false);
                                                cropRectRef.current = null;
                                            }}>Cancel Crop</button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Main Canvas Area */}
                    <section className="studio-canvas-area" ref={containerRef}>
                        <div className="canvas-shadow-box" style={{ transform: `scale(${zoom})` }}>
                            <canvas ref={canvasRef} />
                        </div>
                        {loading && (
                            <div className="loading-overlay">
                                <div className="spinner-large" />
                                <span>Loading Studio...</span>
                            </div>
                        )}
                    </section>
                </main>
            </div>

            <style jsx>{`
                .studio-overlay {
                    position: fixed;
                    inset: 0;
                    background: #09090b;
                    z-index: 9999;
                    display: flex;
                    color: white;
                    font-family: 'Inter', -apple-system, sans-serif;
                }
                .studio-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .studio-header {
                    height: 64px;
                    background: #18181b;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 24px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    z-index: 100;
                }
                .header-left, .header-right { display: flex; align-items: center; gap: 16px; width: 300px; }
                .header-center { display: flex; align-items: center; gap: 8px; }
                .app-logo { display: flex; align-items: center; gap: 10px; }
                .logo-icon { font-size: 24px; }
                .logo-text { font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .file-name { font-size: 13px; color: #71717a; padding-left: 16px; border-left: 1px solid #3f3f46; }
                
                .icon-btn { background: transparent; border: none; color: #a1a1aa; cursor: pointer; padding: 6px; border-radius: 6px; font-size: 16px; transition: all 0.2s; }
                .icon-btn:hover:not(:disabled) { background: #27272a; color: white; }
                .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
                .divider { width: 1px; height: 24px; background: #3f3f46; margin: 0 8px; }
                .zoom-level { font-size: 12px; font-weight: 600; min-width: 45px; text-align: center; color: #a1a1aa; }

                .btn-save { background: #6c5ce7; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3); }
                .btn-save:hover { background: #5b4bc4; transform: translateY(-1px); }
                .btn-close { background: #27272a; color: #a1a1aa; border: none; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .btn-close:hover { background: #ef4444; color: white; }

                .studio-body { flex: 1; display: flex; overflow: hidden; background: #09090b; }
                
                /* Sidebar Tab Switcher */
                .studio-sidebar { width: 80px; background: #111113; border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; align-items: center; padding-top: 20px; }
                .sidebar-bottom { margin-top: auto; padding-bottom: 24px; }
                
                /* Controls Sidebar */
                .studio-controls { width: 280px; background: #18181b; border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; }
                .controls-header { padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.03); }
                .controls-header h3 { font-size: 12px; font-weight: 800; letter-spacing: 1px; color: #71717a; }
                .controls-content { padding: 20px; flex: 1; overflow-y: auto; }
                
                .grid-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .slider-list { display: flex; flex-direction: column; gap: 24px; }
                .button-list { display: flex; flex-direction: column; gap: 16px; }
                .action-btn-large { background: #27272a; color: white; border: 1px solid #3f3f46; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.2s; }
                .action-btn-large:hover { border-color: #6c5ce7; background: #2d2d30; }
                .hint { font-size: 11px; color: #71717a; text-align: center; margin-top: 8px; line-height: 1.5; }

                /* Canvas Area */
                .studio-canvas-area { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; background: #09090b; background-image: radial-gradient(#18181b 1px, transparent 0); background-size: 24px 24px; overflow: hidden; }
                .canvas-shadow-box { box-shadow: 0 40px 100px rgba(0,0,0,0.8); border: 1px solid #27272a; border-radius: 4px; overflow: hidden; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
                
                .loading-overlay { position: absolute; inset: 0; background: #09090b; z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
                .spinner-large { width: 48px; height: 48px; border: 4px solid rgba(255,255,255,0.05); border-top: 4px solid #6c5ce7; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .aspect-ratios { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
                .aspect-ratios button { background: #27272a; border: 1px solid #3f3f46; color: #a1a1aa; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.2s; }
                .aspect-ratios button:hover { border-color: #6c5ce7; color: white; }
                .custom-ratio { display: flex; align-items: center; gap: 8px; background: #111; padding: 12px; border-radius: 10px; border: 1px solid #3f3f46; }
                .custom-ratio input { width: 100%; background: #27272a; border: 1px solid #3f3f46; color: white; padding: 6px; border-radius: 4px; font-size: 12px; text-align: center; }
                .custom-ratio input:focus { border-color: #6c5ce7; outline: none; }
                .custom-ratio span { color: #71717a; font-weight: bold; }
                .filename-input { background: #27272a; border: 1px solid #3f3f46; color: white; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 500; outline: none; width: 180px; }
                .filename-input:focus { border-color: #6c5ce7; background: #18181b; }
                .file-ext { color: #71717a; font-size: 13px; font-weight: 500; margin-left: 4px; }
            `}</style>
        </div>
    );
};

// --- Sub-Components ---

const TabItem = ({ active, onClick, icon, label }: any) => (
    <button className={`tab-item ${active ? 'active' : ''}`} onClick={onClick}>
        <span className="tab-icon">{icon}</span>
        <span className="tab-label">{label}</span>
        <style jsx>{`
            .tab-item { width: 64px; height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: transparent; border: none; cursor: pointer; color: #71717a; border-radius: 12px; margin-bottom: 8px; transition: 0.2s; }
            .tab-item:hover { color: white; background: #18181b; }
            .tab-item.active { color: #6c5ce7; background: #18181b; box-shadow: inset 0 0 0 1px rgba(108,92,231,0.2); }
            .tab-icon { font-size: 20px; margin-bottom: 4px; }
            .tab-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        `}</style>
    </button>
);

const FilterCard = ({ label, onClick }: any) => (
    <button className="filter-card" onClick={onClick}>
        <div className="filter-preview" />
        <span className="filter-label">{label}</span>
        <style jsx>{`
            .filter-card { background: #27272a; border: 1px solid #3f3f46; border-radius: 10px; overflow: hidden; cursor: pointer; transition: 0.2s; padding: 0; }
            .filter-card:hover { border-color: #6c5ce7; transform: translateY(-2px); }
            .filter-preview { height: 60px; background: linear-gradient(135deg, #3f3f46 0%, #18181b 100%); }
            .filter-label { display: block; padding: 8px; font-size: 11px; font-weight: 600; text-align: center; color: #a1a1aa; }
        `}</style>
    </button>
);

const AdjustSlider = ({ label, value, min, max, step, onChange }: any) => (
    <div className="slider-group">
        <div className="slider-header">
            <span className="slider-label">{label}</span>
            <span className="slider-value">{Math.round(value * 100)}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
        <style jsx>{`
            .slider-group { display: flex; flex-direction: column; gap: 8px; }
            .slider-header { display: flex; justify-content: space-between; align-items: center; }
            .slider-label { font-size: 12px; font-weight: 600; color: #a1a1aa; }
            .slider-value { font-size: 11px; color: #71717a; background: #27272a; padding: 2px 6px; border-radius: 4px; }
            input[type=range] { -webkit-appearance: none; width: 100%; background: #27272a; height: 4px; border-radius: 2px; }
            input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #6c5ce7; cursor: pointer; border: 3px solid #18181b; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
        `}</style>
    </div>
);

const ShapeItem = ({ label, onClick, icon }: any) => (
    <button className="shape-item" onClick={onClick}>
        <span className="shape-icon">{icon}</span>
        <span className="shape-label">{label}</span>
        <style jsx>{`
            .shape-item { background: #27272a; border: 1px solid #3f3f46; border-radius: 12px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; gap: 8px; }
            .shape-item:hover { border-color: #6c5ce7; background: #2d2d30; }
            .shape-icon { font-size: 24px; }
            .shape-label { font-size: 11px; font-weight: 600; color: #a1a1aa; }
        `}</style>
    </button>
);

export default ImageEditor;
