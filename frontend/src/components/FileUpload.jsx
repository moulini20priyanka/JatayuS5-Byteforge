import React, { useState, useRef } from 'react';

export default function FileUpload({ onUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploaded(false);
    } else if (file) {
      alert('Please select a PDF file.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploaded(false);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploaded(true);
      if (onUpload) onUpload(selectedFile.name);
    }, 1500);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setUploaded(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {!selectedFile ? (
        <div
          className={`file-upload-zone ${dragOver ? 'drag-over' : ''}`}
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
          />
          <div className="file-upload-icon">📄</div>
          <div className="file-upload-text">
            <strong>Click to upload</strong> or drag and drop<br />
            <span style={{ fontSize: 12 }}>PDF files only — max 10MB</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="file-selected">
            <span style={{ fontSize: 18 }}>📋</span>
            <div style={{ flex: 1 }}>
              <div className="file-name">{selectedFile.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              onClick={handleClear}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 16 }}
            >
              ×
            </button>
          </div>

          {!uploaded ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleUpload}
              disabled={uploading}
              style={{ alignSelf: 'flex-start' }}
            >
              {uploading ? (
                <>
                  <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Extracting questions...
                </>
              ) : (
                <>📤 Upload & Extract Questions</>
              )}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-success-light)', border: '1px solid #86efac', borderRadius: 6, fontSize: 13 }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>Questions extracted successfully</span>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
