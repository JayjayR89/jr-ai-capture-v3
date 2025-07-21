
import React, { useState, useRef } from 'react';
import { X, Download, Trash2, FileText, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { TTSControls } from './TTSControls';
import { exportAsZip, exportAsCSV, exportAsDocx } from '@/lib/exportUtils';

// Using Puter.com API loaded from CDN
declare const puter: any;

interface CapturedImage {
  dataUrl: string;
  timestamp: Date;
  description?: string;
  tags?: string[];
  notes?: string;
}

interface ImageGalleryProps {
  images: CapturedImage[];
  onExportImage?: (image: CapturedImage, description: string) => void;
  onDeleteImages?: (images: CapturedImage[]) => void;
  onExportMultiple?: (captures: { image: CapturedImage, description: string }[]) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, onExportImage, onDeleteImages, onExportMultiple }) => {
  const [selectedImage, setSelectedImage] = useState<CapturedImage | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('zip');
  const [exporting, setExporting] = useState(false);
  const [exportFilename, setExportFilename] = useState('captures');
  const [csvDelimiter, setCsvDelimiter] = useState(',');
  const [docxStyle, setDocxStyle] = useState('default');
  const [exportPreview, setExportPreview] = useState(null);
  const [exportHistory, setExportHistory] = useState(() => JSON.parse(localStorage.getItem('exportHistory') || '[]'));
  const [selectAll, setSelectAll] = useState(false);

  const formatDescription = (description: string) => {
    // Enhanced markdown-like formatting for better readability
    return description
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-3">$1</h1>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/__(.*?)__/g, '<strong class="font-semibold">$1</strong>')
      // Italic text
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
      // Code blocks
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      // Line breaks and paragraphs
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br>')
      // Wrap in paragraph tags
      .replace(/^(.*)$/gm, '<p class="mb-2">$1</p>')
      // Clean up empty paragraphs
      .replace(/<p class="mb-2"><\/p>/g, '')
      // Wrap lists properly
      .replace(/(<li class="ml-4 list-[^"]+">.*?<\/li>)/gs, '<ul class="mb-2">$1</ul>')
      // Enhanced punctuation spacing
      .replace(/\. /g, '. ')
      .replace(/: /g, ': ')
      .replace(/\? /g, '? ')
      .replace(/! /g, '! ');
  };



  const toggleImageSelection = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedImages);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedImages(newSelected);
    
    // Auto-enable selection mode when selecting images
    if (newSelected.size > 0 && !isSelectionMode) {
      setIsSelectionMode(true);
    }
    
    // Auto-disable selection mode when no images selected
    if (newSelected.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedImages.size === 0 || !onDeleteImages) return;
    
    const imagesToDelete = Array.from(selectedImages).map(index => images[index]);
    onDeleteImages(imagesToDelete);
    setSelectedImages(new Set());
    setIsSelectionMode(false);
  };

  const handleExportSelected = () => {
    if (selectedImages.size === 0 || !onExportMultiple) return;
    
    const captures = Array.from(selectedImages)
      .map(index => images[index])
      .filter(image => image.description) // Only export images with descriptions
      .map(image => ({ image, description: image.description! }));
    
    if (captures.length === 0) {
      // Show toast or alert that no images with descriptions are selected
      return;
    }
    
    onExportMultiple(captures);
    setSelectedImages(new Set());
    setIsSelectionMode(false);
  };

  const selectAll = () => {
    const allIndices = images.map((_, index) => index);
    setSelectedImages(new Set(allIndices));
    setIsSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
    setIsSelectionMode(false);
  };

  const copyDescription = async (description: string) => {
    try {
      await navigator.clipboard.writeText(description);
      // You could add a toast notification here if available
    } catch (error) {
      console.error('Failed to copy text:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = description;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Multi-select logic
  const handleSelect = (idx: number) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };
  const handleSelectAll = () => {
    if (selectAll) setSelectedImages(new Set());
    else setSelectedImages(new Set(images.map((_, i) => i)));
    setSelectAll(!selectAll);
  };

  // Export handler
  const handleExport = async (format, previewOnly = false) => {
    setExporting(true);
    const toExport = Array.from(selectedImages).length > 0 ? Array.from(selectedImages).map(i => images[i]) : images;
    // Add dummy metadata if missing
    toExport.forEach(img => {
      if (!img.timestamp) img.timestamp = new Date();
      if (!img.tags) img.tags = [];
      if (!img.notes) img.notes = '';
    });
    if (previewOnly) {
      setExportPreview(toExport.slice(0, 3));
      setExporting(false);
      return;
    }
    let filename = exportFilename || 'captures';
    if (format === 'zip') await exportAsZip(toExport, filename);
    else if (format === 'csv') exportAsCSV(toExport, filename, csvDelimiter);
    else if (format === 'docx') await exportAsDocx(toExport, filename, docxStyle);
    setExporting(false);
    setExportModalOpen(false);
    // Save export history
    const newHistory = [{ date: new Date().toLocaleString(), format, filename, count: toExport.length }, ...exportHistory].slice(0, 10);
    setExportHistory(newHistory);
    localStorage.setItem('exportHistory', JSON.stringify(newHistory));
  };

  // Cloud export stubs
  const handleCloudExport = (provider) => {
    alert(`Cloud export to ${provider} coming soon!`);
  };

  if (images.length === 0) return null;

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Captured Images ({images.length})
            {selectedImages.size > 0 && ` • ${selectedImages.size} selected`}
          </h3>
          <div className="flex gap-2">
            {!isSelectionMode ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSelectionMode(true)}
                className="h-7 px-2 text-xs"
                title="Enable selection mode"
              >
                Select
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="h-7 px-2 text-xs"
                  title="Select all images"
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="h-7 px-2 text-xs"
                  title="Clear selection"
                >
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Selection Action Buttons */}
        {selectedImages.size > 0 && (
          <div className="flex gap-2 mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              className="h-8 px-3 text-xs"
              title={`Delete ${selectedImages.size} selected image${selectedImages.size > 1 ? 's' : ''}`}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete Selected ({selectedImages.size})
            </Button>
            {Array.from(selectedImages).some(index => images[index].description) && (
              <Button
                variant="default"
                size="sm"
                onClick={handleExportSelected}
                className="h-8 px-3 text-xs"
                title="Export selected images with descriptions as PDF"
              >
                <FileText className="h-3 w-3 mr-1" />
                Export All ({Array.from(selectedImages).filter(index => images[index].description).length})
              </Button>
            )}
          </div>
        )}
        
        <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-hide">
          {images.map((image, index) => (
            <div 
              key={image.timestamp.getTime()} 
              className={`flex gap-3 p-3 rounded-lg border transition-all ${
                selectedImages.has(index) 
                  ? 'bg-primary/20 border-primary/50' 
                  : 'bg-muted/20 border-border'
              }`}
            >
              <div className="relative">
                <input type="checkbox" checked={selectedImages.has(index)} onChange={() => handleSelect(index)} className="absolute top-2 left-2 z-10" aria-label={`Select image ${index + 1}`} />
                <img
                  src={image.dataUrl}
                  alt={`Capture ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImage(image)}
                />
                {/* Selection checkbox */}
                {isSelectionMode && (
                  <div 
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-white bg-background cursor-pointer flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                    onClick={(e) => toggleImageSelection(index, e)}
                  >
                    {selectedImages.has(index) ? (
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-muted-foreground"></div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">
                    Capture {images.length - index}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {image.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {image.description ? (
                  <div className="space-y-2">
                    <div 
                      className="text-xs text-muted-foreground line-clamp-3"
                      dangerouslySetInnerHTML={{ 
                        __html: formatDescription(image.description).substring(0, 150) + '...' 
                      }}
                    />
                    <div className="space-y-2">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <TTSControls
                            text={image.description!}
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            showScrubBar={true}
                          />
                        </div>
                        {onExportImage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onExportImage(image, image.description!)}
                            className="h-6 px-2 text-xs"
                            title="Export image and description as PDF"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-yellow-600">⏳ Processing...</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Full-size image popup - Fixed scrolling and added copy button */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
          {selectedImage && (
            <>
              <DialogClose asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
              
              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
                <img
                  src={selectedImage.dataUrl}
                  alt="Full size capture"
                  className="w-full h-auto max-h-[50vh] object-contain rounded-lg mb-4"
                />
                
                {selectedImage.description && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">AI Description</h3>
                      <TTSControls
                        text={selectedImage.description!}
                        variant="outline"
                        size="sm"
                        showScrubBar={false}
                        className="w-auto"
                      />
                    </div>
                    <div 
                      className="text-sm leading-relaxed prose prose-invert max-w-none overflow-wrap-anywhere"
                      dangerouslySetInnerHTML={{ 
                        __html: formatDescription(selectedImage.description) 
                      }}
                    />
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-4">
                  Captured: {selectedImage.timestamp.toLocaleString()}
                </p>
              </div>
              
              {/* Sticky bottom section with copy button */}
              {selectedImage.description && (
                <div className="border-t bg-background p-4">
                  <Button
                    variant="outline"
                    onClick={() => copyDescription(selectedImage.description!)}
                    className="w-full flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Description Text
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-xs relative" role="dialog" aria-modal="true" aria-label="Export modal">
            <button className="absolute top-2 right-2 text-lg" onClick={() => setExportModalOpen(false)} aria-label="Close">✕</button>
            <h3 className="text-lg font-bold mb-4">Export Captures</h3>
            <label className="block mb-1 font-semibold" htmlFor="export-filename">Filename</label>
            <input id="export-filename" value={exportFilename} onChange={e => setExportFilename(e.target.value)} className="border rounded p-2 w-full mb-2" aria-label="Export filename" />
            <label className="block mb-1 font-semibold" htmlFor="export-format">Format</label>
            <select id="export-format" value={exportFormat} onChange={e => setExportFormat(e.target.value)} className="border rounded p-2 w-full mb-2" aria-label="Export format">
              <option value='zip'>ZIP (images + descriptions + metadata)</option>
              <option value='csv'>CSV (descriptions + metadata)</option>
              <option value='docx'>DOCX (Word)</option>
            </select>
            {exportFormat === 'csv' && (
              <div className="mb-2">
                <label className="block mb-1 font-semibold" htmlFor="csv-delim">CSV Delimiter</label>
                <select id="csv-delim" value={csvDelimiter} onChange={e => setCsvDelimiter(e.target.value)} className="border rounded p-2 w-full" aria-label="CSV delimiter">
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                </select>
              </div>
            )}
            {exportFormat === 'docx' && (
              <div className="mb-2">
                <label className="block mb-1 font-semibold" htmlFor="docx-style">DOCX Style</label>
                <select id="docx-style" value={docxStyle} onChange={e => setDocxStyle(e.target.value)} className="border rounded p-2 w-full" aria-label="DOCX style">
                  <option value="default">Default</option>
                  <option value="compact">Compact</option>
                </select>
              </div>
            )}
            <div className="flex gap-2 mb-2">
              <button onClick={() => handleCloudExport('Google Drive')} className="bg-gray-200 px-2 py-1 rounded" aria-label="Export to Google Drive">Google Drive</button>
              <button onClick={() => handleCloudExport('Dropbox')} className="bg-gray-200 px-2 py-1 rounded" aria-label="Export to Dropbox">Dropbox</button>
            </div>
            <button onClick={() => handleExport(exportFormat, true)} className="bg-gray-200 px-2 py-1 rounded mb-2" aria-label="Preview export">Preview</button>
            <button onClick={() => handleExport(exportFormat)} className="bg-blue-600 text-white px-3 py-1 rounded w-full" aria-label="Export now" disabled={exporting}>{exporting ? 'Exporting...' : 'Export'}</button>
            {exporting && <div className="mt-2 text-center" role="status" aria-live="polite">Exporting, please wait...</div>}
            {exportPreview && (
              <div className="mt-2 border-t pt-2">
                <h4 className="font-semibold mb-1">Preview</h4>
                {exportPreview.map((img, i) => (
                  <div key={i} className="mb-2">
                    <img src={img.dataUrl} alt="Preview" className="w-16 h-16 object-cover inline-block mr-2" />
                    <span className="text-xs">{img.description?.slice(0, 40)}...</span>
                    <div className="text-xs text-gray-500">{img.timestamp?.toLocaleString()} | Tags: {img.tags?.join(', ')} | Notes: {img.notes}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 border-t pt-2">
              <h4 className="font-semibold mb-1">Export History</h4>
              <ul className="text-xs max-h-20 overflow-y-auto">
                {exportHistory.length === 0 && <li>No exports yet.</li>}
                {exportHistory.map((h, i) => (
                  <li key={i}>{h.date} - {h.format.toUpperCase()} - {h.filename} ({h.count})</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
