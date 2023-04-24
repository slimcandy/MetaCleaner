/* eslint-disable no-var */
import React, { useId, useRef } from "react";
import "./App.css";

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
    <div className="prose mx-auto rounded-lg shadow-2xl bg-white border-2 border-slate-300">
      <h1 className="border-b-2 border-slate-300 px-6 py-7 w-full">
        Remove metadata from images
      </h1>
      <form className="py-4 px-6">
        <div
          ref={dropArea}
          onDragEnter={handleDragEvents}
          onDragOver={handleDragEvents}
          onDragLeave={handleDragEvents}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-300 rounded-lg px-6 py-7 w-full text-center cursor-pointer hover:border-slate-400 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent hover:shadow-xl hover:bg-slate-100 active:bg-slate-200 active:shadow-none active:border-transparent"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="mx-auto h-12 w-12 text-slate-500"
            viewBox="0 0 16 16"
          >
            <path d="M4.502 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
            <path d="M14.002 13a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2V5A2 2 0 0 1 2 3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-1.998 2zM14 2H4a1 1 0 0 0-1 1h9.002a2 2 0 0 1 2 2v7A1 1 0 0 0 15 11V3a1 1 0 0 0-1-1zM2.002 4a1 1 0 0 0-1 1v8l2.646-2.354a.5.5 0 0 1 .63-.062l2.66 1.773 3.71-3.71a.5.5 0 0 1 .577-.094l1.777 1.947V5a1 1 0 0 0-1-1h-10z" />
          </svg>
          <h3 className="mt-2 text-base font-medium text-slate-900">
            Drop your images here
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            We&apos;ll remove all metadata from your images
          </p>
        </div>
        <label
          htmlFor={fileId}
          className="mt-6 block text-base font-medium text-slate-900"
        >
          Or browse
        </label>
        <input
          className="block w-full text-sm text-slate-500 my-2 py-2 px-4
          rounded border-2 border-slate-300 bg-slate-50
          file:mr-4 file:py-2 file:px-4
          file:rounded file:border-2 file:border-slate-300
          file:font-semibold
          file:slate-900 file:hover:border-slate-400 file:transition-all file:duration-300 file:ease-in-out
          file:focus:outline-none file:focus:ring-2 file:focus:ring-slate-400 file:focus:border-transparent
          file:hover:shadow-xl file:hover:bg-slate-100 file:hover:cursor-pointer
          file:active:bg-slate-200 file:active:shadow-none file:active:border-transparent
        "
          id={fileId}
          type="file"
          accept="image/*"
          ref={fileInput}
          onChange={handleFileInputChange}
          placeholder="or Browse"
          multiple
          hidden
        />
        <button type="submit" className="sr-only">
          Send
        </button>
      </form>
    </div>
  );
}

export default App;
