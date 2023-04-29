/* eslint-disable no-var */
import { useId, useRef, useState } from 'react';
import {
  canIShareImage,
  handleDragEvents,
  handleFiles,
  shareImage
} from './utils/functions';
import { CleanerResult } from './utils/types';

function App(): JSX.Element {
  const fileId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [cleanerResults, setCleanerResults] = useState<CleanerResult[]>([]);

  async function handleDrop(
    event: React.DragEvent<HTMLDivElement>
  ): Promise<void> {
    handleDragEvents(event);
    const results = await handleFiles(event.dataTransfer.files);
    setCleanerResults(results);
  }

  async function handleFilePickerChange(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    if (event.target.files != null) {
      const results = await handleFiles(event.target.files);
      setCleanerResults(results);
    }
  }

  function handleFormClick(): void {
    fileInput.current?.click();
  }

  return (
    <div className="prose mx-auto sm:rounded-lg sm:shadow-2xl bg-white sm:border-2 sm:border-slate-300 w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-4xl">
      <ol className="list-inside list-decimal p-0">
        <li className="border-b-2 border-slate-300 p-1 sm:p-2 md:px-4 w-full text-base text-slate-500">
          Pick an image:
        </li>
        <form className="py-2 sm:py-3 md:py-4 px-4 sm:px-5 md:px-6">
          <div
            onDragEnter={handleDragEvents}
            onDragOver={handleDragEvents}
            onDragLeave={handleDragEvents}
            onDrop={handleDrop}
            onClick={handleFormClick}
            className="border-2 border-dashed border-slate-300 rounded-lg px-2 sm:px-4 md:px-6 py-3 sm:py-5 md:py-7 w-full text-center cursor-pointer hover:border-slate-400 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent hover:shadow-xl hover:bg-slate-100 active:bg-slate-200 active:shadow-none active:border-transparent select-none"
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
            <ul className="sm:mt-1 text-xs text-slate-500 p-0 text-left list-inside list-disc">
              <li className="p-0">No need to hit submit.</li>
              <li className="p-0">
                Instantly get your metadata-free images, right in your browser.
              </li>
              <li className="p-0">
                We value your privacy — your images are never stored on our
                servers.
              </li>
            </ul>
          </div>
          <label htmlFor={fileId} className="sr-only">
            Or browse
          </label>
          <input
            className="sr-only"
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
        <li className="border-b-2 border-slate-300 p-1 sm:p-2 md:px-4 w-full text-base text-slate-500">
          Tap the image name to download:
        </li>
        {cleanerResults.length === 0 && (
          <p className="p-4 sm:p-6 md:p-8 text-center text-base font-medium text-slate-900">
            No images to show.
          </p>
        )}

        <ul className="w-full list-disc list-inside">
          {cleanerResults.map(function drawResults(result) {
            return (
              <li
                key={result.file.name}
                className="flex items-center gap-x-2.5"
              >
                {canIShareImage(result.file) && (
                  <button
                    className="mr-2 relative cursor-pointer"
                    onClick={() => shareImage(result.file)}
                    title="Share image"
                  >
                    <img
                      src={result.downloadLink}
                      alt={result.file.name}
                      className="h-8 sm:h-10 md:h-12 lg:h-16 w-8 sm:w-10 md:w-12 lg:w-16 object-cover object-center rounded m-0"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="h-full w-full text-slate-100 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-1 sm:p-2 md:p-3 lg:p-4
                    
                    bg-slate-600 bg-opacity-40 hover:bg-opacity-95 shadow hover:shadow-lg duration-300 ease-in-out rounded"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.5 6a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 1 0-1h2A1.5 1.5 0 0 1 14 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-8A1.5 1.5 0 0 1 3.5 5h2a.5.5 0 0 1 0 1h-2z"
                      />
                      <path
                        fillRule="evenodd"
                        d="M7.646.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 1.707V10.5a.5.5 0 0 1-1 0V1.707L5.354 3.854a.5.5 0 1 1-.708-.708l3-3z"
                      />
                    </svg>
                  </button>
                )}
                <a
                  href={result.downloadLink}
                  download={result.file.name}
                  className="text-blue-700 hover:text-blue-400 flex items-center gap-x-2.5 cursor-pointer"
                  title={`Download "${result.file.name}" | ${Math.ceil(
                    result.file.size / 1000
                  )}Kb.`}
                >
                  {result.file.name}
                </a>
              </li>
            );
          })}
        </ul>
      </ol>
    </div>
  );
}

export default App;
