// use-file-upload.ts - registry file upload hook
import * as React from "react";

export interface UseFileUploadOptions {
  accept?: string;
  maxSize?: string;
  multiple?: boolean;
  onFilesAdded?: (files: Array<{ file: File; id: string }>) => void;
  onError?: (errors: string[]) => void;
}

function parseMaxSize(str?: string): number {
  if (!str) return Infinity;
  const m = str.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  if (!m) return Infinity;
  const v = parseFloat(m[1]);
  const u = m[2].toUpperCase();
  return v * ({ B: 1, KB: 1e3, MB: 1e6, GB: 1e9 }[u] ?? 1);
}

export function useFileUpload({ accept = "*", maxSize, multiple = false, onFilesAdded, onError }: UseFileUploadOptions = {}) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const maxBytes = parseMaxSize(maxSize);

  const processFiles = React.useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const errors: string[] = [];
    const accepted: Array<{ file: File; id: string }> = [];
    for (const file of (multiple ? files : [files[0]].filter(Boolean))) {
      if (file.size > maxBytes) {
        errors.push(`"${file.name}" exceeds the maximum file size.`);
        continue;
      }
      accepted.push({ file, id: `${Date.now()}-${Math.random()}` });
    }
    if (errors.length > 0) onError?.(errors);
    if (accepted.length > 0) onFilesAdded?.(accepted);
  }, [maxBytes, multiple, onFilesAdded, onError]);

  const openFileDialog = React.useCallback(() => {
    if (inputRef.current) inputRef.current.click();
  }, []);

  const clearFiles = React.useCallback(() => {
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const getInputProps = React.useCallback((extra?: React.InputHTMLAttributes<HTMLInputElement>) => ({
    ref: (el: HTMLInputElement | null) => { inputRef.current = el; },
    type: "file" as const,
    accept,
    multiple,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) processFiles(e.target.files);
    },
    ...extra,
  }), [accept, multiple, processFiles]);

  return { isDragging, openFileDialog, clearFiles, handleDragEnter, handleDragLeave, handleDragOver, handleDrop, getInputProps };
}
