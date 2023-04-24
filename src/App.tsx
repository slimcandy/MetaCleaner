/* eslint-disable no-var */
import React, { useId, useRef } from "react";
import "./App.css";
import {
  handleDragEvents,
  handleDrop,
  handleFilePickerChange,
} from "./functions";

function App(): JSX.Element {
  const fileId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  function handleFormClick() {
    fileInput.current?.click();
  }

  return (
    <div className="prose-sm md:prose-base lg:prose-lg xl:prose-xl 2xl:prose-2xl mx-auto sm:rounded-lg sm:shadow-2xl bg-white sm:border-2 sm:border-slate-300 w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-4xl">
      <h1 className="border-b-2 border-slate-300 px-2 sm:px-4 md:px-6 py-3 sm:py-5 md:py-7 w-full">
        Instantly Remove Metadata
      </h1>
      <form className="py-2 sm:py-3 md:py-4 px-4 sm:px-5 md:px-6">
        <div
          onDragEnter={handleDragEvents}
          onDragOver={handleDragEvents}
          onDragLeave={handleDragEvents}
          onDrop={handleDrop}
          onClick={handleFormClick}
          className="border-2 border-dashed border-slate-300 rounded-lg px-2 sm:px-4 md:px-6 py-3 sm:py-5 md:py-7 w-full text-center cursor-pointer hover:border-slate-400 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent hover:shadow-xl hover:bg-slate-100 active:bg-slate-200 active:shadow-none active:border-transparent"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="mx-auto h-8 sm:h-10 md:h-12 w-8 sm:w-10 md:w-12 text-slate-500"
            viewBox="0 0 16 16"
          >
            <path d="M4.502 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
            <path d="M14.002 13a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2V5A2 2 0 0 1 2 3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-1.998 2zM14 2H4a1 1 0 0 0-1 1h9.002a2 2 0 0 1 2 2v7A1 1 0 0 0 15 11V3a1 1 0 0 0-1-1zM2.002 4a1 1 0 0 0-1 1v8l2.646-2.354a.5.5 0 0 1 .63-.062l2.66 1.773 3.71-3.71a.5.5 0 0 1 .577-.094l1.777 1.947V5a1 1 0 0 0-1-1h-10z" />
          </svg>
          <h3 className="sm:mt-1 md:mt-2 text-base font-medium text-slate-900">
            Drag and drop your image here
          </h3>
          <ol className="sm:mt-1 text-xs text-slate-500 p-0">
            <li className="p-0">No submit needed</li>
            <li className="p-0">
              Website immediately returns metadata-free images
            </li>
            <li className="p-0">Uploaded images are never stored</li>
            <li className="p-0">
              All metadata is removed directly in your browser
            </li>
          </ol>
        </div>
        <label
          htmlFor={fileId}
          className="mt-2 sm:mt-4 md:mt-6 block text-base font-medium text-slate-900"
        >
          Or browse
        </label>
        <input
          className="block w-full text-sm text-slate-500 
          sm:my-2 sm:py-2 sm:px-4
          sm:rounded sm:border-2 sm:border-slate-300
          sm:file:mr-4 file:py-2 file:px-4
          file:rounded file:border-2 file:border-slate-300 
          file:font-semibold
          file:slate-900 file:bg-white file:hover:border-slate-400 file:transition-all file:duration-300 file:ease-in-out
          file:focus:outline-none file:focus:ring-2 file:focus:ring-slate-400 file:focus:border-transparent
          file:hover:shadow-xl file:hover:bg-slate-100 file:hover:cursor-pointer
          file:active:bg-slate-200 file:active:shadow-none file:active:border-transparent
        "
          id={fileId}
          type="file"
          accept="image/*"
          ref={fileInput}
          onChange={handleFilePickerChange}
          placeholder="Select Image"
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
