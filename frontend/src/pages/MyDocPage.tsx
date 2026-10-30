import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FolderLock,
  UploadCloud,
  Search,
  Filter,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  Play,
  Download,
  Trash2,
  Edit2,
  Eye,
  X,
  Loader2,
  RefreshCw,
  Plus,
  ShieldCheck,
  Clock,
  HardDrive,
  Copy,
  LogIn,
  UserPlus,
} from 'lucide-react';
import {
  fetchUserDocuments,
  uploadUserDocument,
  deleteUserDocument,
  renameUserDocument,
  verifyStoredDocument,
  checkMyDocDuplicate,
  getUserDocDownloadUrl,
  getUserDocPreviewUrl,
  fetchDocumentTypes,
} from '../services/api';
import { UserDocumentItem, DocumentTypeItem, DuplicateCheckResponse } from '../types';
import { useAuth } from '../context/AuthContext';

export const MyDocPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<UserDocumentItem[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [totalSize, setTotalSize] = useState(0);

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Duplicate Check Prompt Modal
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    file: File;
    info: DuplicateCheckResponse;
  } | null>(null);

  // Verify Modal
  const [verifyModalDoc, setVerifyModalDoc] = useState<UserDocumentItem | null>(null);
  const [selectedDocType, setSelectedDocType] = useState('aadhaar');
  const [verifying, setVerifying] = useState(false);

  // Rename Modal
  const [renameModalDoc, setRenameModalDoc] = useState<UserDocumentItem | null>(null);
  const [newFilename, setNewFilename] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [savingRename, setSavingRename] = useState(false);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<UserDocumentItem | null>(null);

  // Delete Confirm Modal
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const res = await fetchUserDocuments({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: search.trim() || undefined,
      });
      const list = res.documents || res.items || [];
      const safeList = Array.isArray(list) ? list : [];
      setDocuments(safeList);

      const calculatedSize =
        typeof res.total_size_bytes === 'number'
          ? res.total_size_bytes
          : safeList.reduce((acc, d) => acc + (d.file_size || 0), 0);
      setTotalSize(calculatedSize);
    } catch (err: any) {
      console.warn('MyDoc fetch notification:', err?.message);
      setDocuments([]);
      setTotalSize(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentTypes()
      .then((types) => setDocTypes(types || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadDocs();
  }, [categoryFilter, isAuthenticated]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocs();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    if (!isAuthenticated) {
      setUploadError('Please sign in or create an account to save documents in your private My_Doc vault.');
      return;
    }

    // Validate size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File exceeds maximum limit of 15MB.');
      return;
    }

    // Check duplicate first
    try {
      const dupCheck = await checkMyDocDuplicate(file);
      if (dupCheck?.is_duplicate) {
        setDuplicatePrompt({ file, info: dupCheck });
        return;
      }
    } catch {
      // Proceed on error
    }

    await executeUpload(file);
  };

  const executeUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(40);
    setDuplicatePrompt(null);
    try {
      let cat = 'other';
      const lower = file.name.toLowerCase();
      if (lower.includes('aadhaar') || lower.includes('aadhar')) cat = 'aadhaar';
      else if (lower.includes('pan')) cat = 'pan';
      else if (lower.includes('passport')) cat = 'passport';
      else if (lower.includes('dl') || lower.includes('driving')) cat = 'driving_licence';
      else if (lower.includes('voter')) cat = 'voter_id';
      else if (lower.includes('bank') || lower.includes('statement')) cat = 'bank_statement';
      else if (lower.includes('cert') || lower.includes('degree')) cat = 'educational_certificate';

      setUploadProgress(75);
      await uploadUserDocument(file, cat);
      setUploadProgress(100);
      setUploadSuccess(`Successfully stored "${file.name}" in My_Doc.`);
      loadDocs();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Direct Verification Handler
  const handleVerifyStoredDoc = async () => {
    if (!verifyModalDoc) return;
    setVerifying(true);
    try {
      const result = await verifyStoredDocument(verifyModalDoc.id, selectedDocType);
      navigate(`/results/${result.reference_id}`);
    } catch (err: any) {
      alert(err.message || 'Verification failed');
      setVerifying(false);
    }
  };

  // Rename Handler
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameModalDoc || !newFilename.trim()) return;
    setSavingRename(true);
    try {
      await renameUserDocument(renameModalDoc.id, newFilename.trim(), newCategory);
      setRenameModalDoc(null);
      loadDocs();
    } catch (err: any) {
      alert(err.message || 'Failed to rename document');
    } finally {
      setSavingRename(false);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deleteDocId) return;
    setDeleting(true);
    try {
      await deleteUserDocument(deleteDocId);
      setDeleteDocId(null);
      loadDocs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const safeIndex = Math.min(i, sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(1)) + ' ' + sizes[safeIndex];
  };

  const getCategoryBadgeClass = (category?: string) => {
    const cat = category || 'other';
    switch (cat) {
      case 'aadhaar':
      case 'pan':
      case 'passport':
      case 'driving_licence':
      case 'voter_id':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'bank_statement':
      case 'income_certificate':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'educational_certificate':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 shadow-xs">
              <FolderLock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                My_Doc Storage Vault
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Store, organize, and directly run compliance audits on your documents without re-uploading
              </p>
            </div>
          </div>
        </div>

        {/* Storage stats */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <p className="text-[11px] text-slate-500 font-medium">Vault Usage</p>
              <p className="text-xs font-bold text-slate-800">
                {documents.length} files • {formatBytes(totalSize)}
              </p>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Document</span>
          </button>
        </div>
      </div>

      {/* Guest Notice if not logged in */}
      {!isAuthenticated && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-700 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">Sign in to unlock your private vault</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Each user gets an isolated, encrypted storage area for documents and audit reports.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      )}

      {/* Upload Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 scale-[1.005]'
            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center">
          <div className="p-3 rounded-full bg-blue-50 text-blue-600 mb-3">
            <UploadCloud className="w-8 h-8" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Click to upload or drag and drop your document
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports PDF, JPG, PNG, WEBP up to 15MB. Automatic SHA-256 integrity hashing applied.
          </p>
        </div>
      </div>

      {/* Upload Progress / Notifications */}
      {uploading && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-900">Uploading and hashing document...</p>
            <div className="w-full bg-blue-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${uploadProgress || 50}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{uploadSuccess}</span>
          </div>
          <button onClick={() => setUploadSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploadError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name or notes..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'aadhaar', label: 'Aadhaar' },
            { id: 'pan', label: 'PAN' },
            { id: 'passport', label: 'Passport' },
            { id: 'driving_licence', label: 'Driving' },
            { id: 'bank_statement', label: 'Financial' },
            { id: 'other', label: 'Other' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={loadDocs}
            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 shrink-0 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FolderLock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">
            {isAuthenticated ? 'No documents stored in My_Doc' : 'Vault Ready for Storage'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {isAuthenticated
              ? 'Upload your identity documents, tax forms, or educational certificates to verify anytime with one click.'
              : 'Sign in to store documents permanently in your private encrypted vault.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Upload Document
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Sign In to Vault
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const fileName = doc.original_filename || doc.filename || 'Document';
            const isPdf =
              doc.mime_type === 'application/pdf' ||
              fileName.toLowerCase().endsWith('.pdf');
            const categoryLabel = (doc.category || 'other').replace('_', ' ');
            const verifiedRef = doc.latest_verification_id || doc.last_verification_ref_id;
            const verifiedStatus = doc.latest_verification_status || doc.last_verification_status;

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isPdf ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                        {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate" title={fileName}>
                          {fileName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatBytes(doc.file_size)} • {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recent'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0 ${getCategoryBadgeClass(
                        doc.category
                      )}`}
                    >
                      {categoryLabel}
                    </span>
                  </div>

                  {/* Verification Status Tag */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Status:
                    </span>
                    {verifiedRef ? (
                      <button
                        onClick={() => navigate(`/results/${verifiedRef}`)}
                        className="font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        {verifiedStatus || 'Verified'}
                      </button>
                    ) : (
                      <span className="text-slate-400 italic">Not yet verified</span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  {/* Primary Verify Button */}
                  <button
                    onClick={() => {
                      setVerifyModalDoc(doc);
                      const cat = doc.category || 'other';
                      setSelectedDocType(cat !== 'other' && cat !== 'general' ? cat : 'aadhaar');
                    }}
                    className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Verify Now</span>
                  </button>

                  {/* Preview */}
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                    title="Preview Document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Download */}
                  <a
                    href={getUserDocDownloadUrl(doc.id)}
                    download={fileName}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                    title="Download to PC"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  {/* Rename */}
                  <button
                    onClick={() => {
                      setRenameModalDoc(doc);
                      setNewFilename(fileName);
                      setNewCategory(doc.category || 'other');
                    }}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                    title="Rename / Categorize"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteDocId(doc.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Duplicate Alert Modal */}
      {duplicatePrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-xl bg-amber-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Duplicate Document Detected</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              VeriDoc AI calculated a SHA-256 cryptographic match. An identical file already exists in your vault:
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p><strong className="text-slate-700">Existing File:</strong> {duplicatePrompt.info.existing_filename || 'Stored Document'}</p>
              {duplicatePrompt.info.existing_status && (
                <p><strong className="text-slate-700">Audit Status:</strong> {duplicatePrompt.info.existing_status}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              {duplicatePrompt.info.existing_reference_id && (
                <button
                  type="button"
                  onClick={() => {
                    const refId = duplicatePrompt.info.existing_reference_id;
                    setDuplicatePrompt(null);
                    if (refId) navigate(`/results/${refId}`);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800"
                >
                  View Existing Audit
                </button>
              )}
              <button
                type="button"
                onClick={() => setDuplicatePrompt(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeUpload(duplicatePrompt.file)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                Upload Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Stored Document Modal */}
      {verifyModalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Run Verification Audit</h3>
              </div>
              <button onClick={() => setVerifyModalDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select the expected document standard to execute the full 8-stage verification pipeline on{' '}
              <strong>"{verifyModalDoc.original_filename || verifyModalDoc.filename}"</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Verification Standard
              </label>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {docTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-900 space-y-1">
              <p className="font-semibold">Pipeline will execute:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-blue-800">
                <li>Pre-flight file & MIME integrity validation</li>
                <li>Tampering, blur & resolution diagnostics</li>
                <li>OCR text extraction & regex pattern recognition</li>
                <li>Mathematical checksums (Verhoeff for Aadhaar, MRZ for Passport)</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setVerifyModalDoc(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={handleVerifyStoredDoc}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-1.5 disabled:opacity-60"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Verification</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Document Modal */}
      {renameModalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleRenameSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Edit Document Details</h3>
              <button type="button" onClick={() => setRenameModalDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Filename
              </label>
              <input
                type="text"
                required
                value={newFilename}
                onChange={(e) => setNewFilename(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="aadhaar">Aadhaar Card</option>
                <option value="pan">PAN Card</option>
                <option value="passport">Passport</option>
                <option value="driving_licence">Driving Licence</option>
                <option value="voter_id">Voter ID</option>
                <option value="bank_statement">Bank Statement</option>
                <option value="educational_certificate">Educational Certificate</option>
                <option value="income_certificate">Income Certificate</option>
                <option value="other">Other Document</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRenameModalDoc(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingRename}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-60"
              >
                {savingRename ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDocId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Document</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this document from your vault? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDocId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {previewDoc.original_filename || previewDoc.filename}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {formatBytes(previewDoc.file_size)} • {previewDoc.mime_type}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getUserDocDownloadUrl(previewDoc.id)}
                  download={previewDoc.original_filename || previewDoc.filename}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-4 flex items-center justify-center overflow-auto">
              {previewDoc.mime_type.startsWith('image/') ? (
                <img
                  src={getUserDocPreviewUrl(previewDoc.id)}
                  alt={previewDoc.original_filename || previewDoc.filename}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                />
              ) : previewDoc.mime_type === 'application/pdf' ? (
                <iframe
                  src={getUserDocPreviewUrl(previewDoc.id)}
                  className="w-full h-full rounded-lg border border-slate-200 bg-white"
                  title="PDF Preview"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-xl shadow-xs">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Preview not supported for this file format</p>
                  <a
                    href={getUserDocDownloadUrl(previewDoc.id)}
                    className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Download to view
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
