import { CleanerResult, ShareObject } from './types';

export function handleDragEvents(event: React.DragEvent<HTMLDivElement>): void {
  event.preventDefault();
  event.stopPropagation();
}

export async function removeMetaData(file: File): Promise<CleanerResult> {
  return new Promise(resolve => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = function imageOnLoad() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);

      // Convert canvas to a Blob without metadata
      canvas.toBlob(function saveFile(blob) {
        if (blob === null) return;

        const downloadLink = URL.createObjectURL(blob);
        const imageName = file.name;
        const imageFile = new File([blob], imageName, { type: file.type });

        resolve({ src: img.src, downloadLink, file: imageFile });
        // Revoke object URL to free memory
        URL.revokeObjectURL(img.src);
      }, file.type);
    };
  });
}

export async function handleFiles(
  files: FileList = new DataTransfer().files
): Promise<CleanerResult[]> {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const result = await removeMetaData(files[i]);
    results.push(result);
  }
  return results;
}

export async function shareImage(file: File): Promise<void> {
  const check = canIShareImage(file);
  if (check) {
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      console.error('Sharing failed:', error);
    }
  } else {
    console.error('Web Share API is not supported in your browser.');
  }
}

export function canIShareImage(file: File): boolean {
  return (
    'canShare' in window.navigator &&
    window.navigator.canShare({
      files: [file],
      title: file.name
    })
  );
}
