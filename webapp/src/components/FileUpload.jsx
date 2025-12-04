import { useState } from 'react';
import { storageAPI } from '../services/api';
import axios from 'axios';

const FileUpload = ({ purpose, workshopId, assignmentId, currentKey, onUploadSuccess, label }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Step 1: Get presigned URL
      const uploadRequest = {
        fileName: file.name,
        fileType: file.type,
        purpose,
        expiresIn: 3600,
      };

      if (workshopId) uploadRequest.workshopId = workshopId;
      if (assignmentId) uploadRequest.assignmentId = assignmentId;

      const response = await storageAPI.generateUploadUrl(uploadRequest);
      const { uploadUrl, s3Key } = response.data;

      // Step 2: Upload file to S3
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
      });

      // Step 3: Notify parent component
      onUploadSuccess(s3Key);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById(`file-${purpose}-${workshopId || assignmentId}`);
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!currentKey) return;

    try {
      const response = await storageAPI.generateDownloadUrl({ s3Key: currentKey });
      const { downloadUrl } = response.data;
      
      // Open in new tab
      window.open(downloadUrl, '_blank');
    } catch (err) {
      setError(err.response?.data?.message || 'Download failed');
    }
  };

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text">{label}</span>
      </label>
      
      {currentKey && (
        <div className="flex items-center gap-2 mb-3 p-3 bg-base-200/50 rounded-lg border border-base-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm text-base-content/70 break-all flex-1 font-mono">{currentKey}</span>
          <button
            type="button"
            className="btn btn-xs btn-ghost gap-1"
            onClick={handleDownload}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="file"
          id={`file-${purpose}-${workshopId || assignmentId}`}
          className="file-input file-input-bordered flex-1"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button
          type="button"
          className={`btn btn-primary ${uploading ? 'loading' : ''}`}
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
};

export default FileUpload;

