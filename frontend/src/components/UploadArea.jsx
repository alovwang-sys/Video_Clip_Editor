import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

function UploadArea({ onUpload, isUploading, uploadProgress }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0 && onUpload) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
    },
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-all duration-200
        ${isDragActive ? 'border-accent bg-accent/10' : 'border-border-dark hover:border-accent/50'}
        ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />

      {isUploading ? (
        <div className="space-y-4">
          <div className="w-12 h-12 mx-auto border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">上传中... {uploadProgress}%</p>
          <div className="w-full bg-card-bg rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-card-bg rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div>
            <p className="text-text-primary font-medium">
              {isDragActive ? '松开以上传视频' : '拖放视频文件到这里'}
            </p>
            <p className="text-text-muted text-sm mt-1">
              或点击选择文件 (支持 MP4, MOV, AVI, MKV, WebM)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadArea;
