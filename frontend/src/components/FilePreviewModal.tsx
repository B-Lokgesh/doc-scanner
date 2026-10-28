import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import { getDocumentPreviewUrl, getReportDownloadUrl } from '../services/api';

interface FilePreviewModalProps {
  referenceId: string;
  filename: string;
  mimeType: string;
  isOpen: boolean;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  referenceId,
  filename,
  mimeType,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const previewUrl = getDocumentPreviewUrl(referenceId);
  const isPdf = mimeType.includes('pdf');
  const isImage = mimeType.includes('image');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">{filename}</h3>
            <p className="text-xs text-slate-500">Ref: {referenceId} • {mimeType}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Raw</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[400px]">
          {isImage ? (
            <img
              src={previewUrl}
              alt={filename}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm bg-white"
            />
          ) : isPdf ? (
            <iframe
              src={`${previewUrl}#toolbar=0`}
              title={filename}
              className="w-full h-[70vh] rounded-lg border border-slate-300 bg-white"
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600 mb-3">Preview is not available for this binary format.</p>
              <a
                href={previewUrl}
                download={filename}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs px-3.5 py-2 rounded-lg font-medium"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
