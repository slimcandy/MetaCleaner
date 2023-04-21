/* eslint-disable no-var */
import React, { useId, useRef } from "react";

function handleDragEvents(event: React.DragEvent<HTMLDivElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function removeMetaData(file: File) {
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

function App(): JSX.Element {
  const fileId = useId();
  const dropArea = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList) {
    for (let i = 0; i < files.length; i++) {
      removeMetaData(files[i]);
    }
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      handleFiles(event.target.files);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    handleDragEvents(event);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <>
      <h1>Send File</h1>
      <form>
        <div
          ref={dropArea}
          onDragEnter={handleDragEvents}
          onDragOver={handleDragEvents}
          onDragLeave={handleDragEvents}
          onDrop={handleDrop}
        >
          <p>Drag and drop your picture here</p>
        </div>

        <label htmlFor={fileId}>or Browse</label>
        <input
          id={fileId}
          type="file"
          accept="image/*"
          ref={fileInput}
          onChange={handleFileInputChange}
          placeholder="or Browse"
          multiple
          hidden
        />
        <button type="submit">Send</button>
      </form>
    </>
  );
}

export default App;
