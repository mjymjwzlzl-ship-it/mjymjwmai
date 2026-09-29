'use client'

import React, { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface DragDropUploadProps {
  onFilesChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // MB
  className?: string;
  preview?: boolean;
  currentFiles?: File[];
  showSortButtons?: boolean; // 정렬 버튼 표시 여부
  showOriginalNames?: boolean; // 원본 파일명 표시 여부
}

export default function DragDropUpload({
  onFilesChange,
  accept = "image/*",
  multiple = false,
  maxFiles = 10,
  maxSize = 5,
  className = "",
  preview = true,
  currentFiles = [],
  showSortButtons = false,
  showOriginalNames = false
}: DragDropUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>(currentFiles);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const validateFile = (file: File): string | null => {
    // 파일 타입 검증
    if (accept && !file.type.match(accept.replace('*', '.*'))) {
      return `지원하지 않는 파일 형식입니다. (${accept})`;
    }

    // 파일 크기 검증
    if (file.size > maxSize * 1024 * 1024) {
      return `파일 크기가 ${maxSize}MB를 초과합니다.`;
    }

    return null;
  };

  const processFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    let finalFiles = validFiles;

    if (!multiple) {
      finalFiles = validFiles.slice(0, 1);
    } else if (files.length + validFiles.length > maxFiles) {
      finalFiles = validFiles.slice(0, maxFiles - files.length);
      if (finalFiles.length < validFiles.length) {
        alert(`최대 ${maxFiles}개까지만 업로드할 수 있습니다.`);
      }
    }

    let updatedFiles = multiple ? [...files, ...finalFiles] : finalFiles;
    
    // 다중 파일이고 정렬 버튼이 표시되는 경우 자동으로 정렬
    if (multiple && showSortButtons && updatedFiles.length > 1) {
      updatedFiles = updatedFiles.sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
    }
    
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [files, multiple, maxFiles, onFilesChange]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  // 파일 정렬 함수
  const sortFiles = (order: 'asc' | 'desc') => {
    const sortedFiles = [...files].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      return order === 'asc' ? comparison : -comparison;
    });
    setFiles(sortedFiles);
    onFilesChange(sortedFiles);
  };

  // 파일 위치 이동
  const moveFile = (fromIndex: number, toIndex: number) => {
    const newFiles = [...files];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setFiles(newFiles);
    onFilesChange(newFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-full ${className}`}>
      {/* 드래그 앤 드롭 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
          isDragOver
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragOver ? '파일을 여기에 놓으세요' : '파일을 드래그하여 업로드'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              또는{' '}
              <label className="text-purple-600 hover:text-purple-700 cursor-pointer font-medium">
                파일 선택
                <input
                  type="file"
                  className="hidden"
                  accept={accept}
                  multiple={multiple}
                  onChange={handleFileInputChange}
                />
              </label>
            </p>
          </div>

          <div className="text-xs text-gray-400">
            <p>지원 형식: {accept}</p>
            <p>최대 크기: {maxSize}MB {multiple && `| 최대 ${maxFiles}개`}</p>
          </div>
        </div>
      </div>

      {/* 파일 미리보기 */}
      {preview && files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">
              업로드된 파일 ({files.length}개)
            </h4>
            {showSortButtons && multiple && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">정렬:</span>
                <button
                  type="button"
                  onClick={() => sortFiles('asc')}
                  className="px-2 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-700"
                >
                  오름차순 (A→Z)
                </button>
                <button
                  type="button"
                  onClick={() => sortFiles('desc')}
                  className="px-2 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-700"
                >
                  내림차순 (Z→A)
                </button>
              </div>
            )}
          </div>
          
          {multiple ? (
            showOriginalNames ? (
              // 리스트 형태 (편집 페이지 스타일)
              <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                      <span className="text-xs font-semibold text-purple-600">{index + 1}</span>
                    </div>
                    
                    <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`이미지 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => moveFile(index, index - 1)}
                          className="w-6 h-6 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-xs flex items-center justify-center"
                          title="위로 이동"
                        >
                          ↑
                        </button>
                      )}
                      {index < files.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveFile(index, index + 1)}
                          className="w-6 h-6 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-xs flex items-center justify-center"
                          title="아래로 이동"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded text-xs flex items-center justify-center"
                        title="삭제"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // 그리드 형태 (기존 스타일)
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    {/* 순서 번호 */}
                    <div className="absolute top-1 left-1 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : (
            // 단일 파일 미리보기 (썸네일용)
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-20 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                {files[0].type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(files[0])}
                    alt={files[0].name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900" title={files[0].name}>
                  {showOriginalNames ? files[0].name : (files[0].name.length > 30 ? files[0].name.substring(0, 30) + '...' : files[0].name)}
                </p>
                <p className="text-sm text-gray-500">{formatFileSize(files[0].size)}</p>
              </div>
              <button
                onClick={() => removeFile(0)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}