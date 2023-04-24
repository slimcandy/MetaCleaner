export function handleDragEvents(event: React.DragEvent<HTMLDivElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function removeMetaData(file: File) {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = function imageOnLoad() {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(img, 0, 0);

    // Convert canvas to a Blob without metadata
    canvas.toBlob(function saveFile(blob) {
      if (blob === null) return;

      // Save the Blob as a file
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = file.name;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(anchor.href);
    }, file.type);
    // Revoke object URL to free memory
    URL.revokeObjectURL(img.src);
  };
}

export function handleFiles(files: FileList = new DataTransfer().files) {
  for (let i = 0; i < files.length; i++) {
    removeMetaData(files[i]);
  }
}

export function handleDrop(event: React.DragEvent<HTMLDivElement>) {
  handleDragEvents(event);
  handleFiles(event.dataTransfer.files);
}

export function handleFilePickerChange(
  event: React.ChangeEvent<HTMLInputElement>
) {
  if (event.target.files) {
    handleFiles(event.target.files);
  }
}
