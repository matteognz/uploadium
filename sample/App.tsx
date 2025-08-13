import React, { useState } from "react";
import { FileDropzone, FileValidationError } from "uploadium";

const App: React.FC = () => {

  const [invalidFiles, setInvalidFiles] = useState<FileValidationError[] | null>(null);

  const handleFilesDropped = (files: File[]) => {
    console.info("File aggiunti/droppati:", files);
  };

  const handleUploadProgress = (file: File | null, progress: number) => {
    console.info(`Upload progresso ${file ? file.name : "batch"}: ${progress}%`);
  };

  const handleUploadComplete = (file: File | null, response: any) => {
    console.info(`Upload completato per ${file ? file.name : "batch"}`, response);
  };

  const handleUploadError = (file: File | null, error: any) => {
    console.error(`Upload fallito per ${file ? file.name : "batch"}`, error);
  };

  const handleInvalidFiles = (errors: FileValidationError[]) => {
    console.warn("INVALID FILES: ", errors);
    setInvalidFiles(errors);
  }

  return (
    <main>
      <div className="row my-3">
        <div className="col-12">
          <h1 className="text-center">Test FileDropzone - Uploadium</h1>
        </div>
      </div>
      <div className="row my-5">
        <div className="col-2"></div>
        <div className="col-8">
          <FileDropzone
            accept={["image/png", "image/jpeg", "application/pdf"]}
            multiple={true}
            maxFiles={10}
            maxSizeMb={100}
            showPreview={true}
            lang="it"
            label="Trascina o seleziona fino a 10 file (png, jpeg, pdf, max 100MB ciascuno)"
            className="my-dropzone p-5"
            onFilesDropped={handleFilesDropped}
            uploadUrl="https://httpbin.org/post" // endpoint demo per test upload
            uploadOneByOne={true}
            uploadFieldName="upload"
            uploadEncoding="base64"
            uploadChunk={true}
            chunkSize={16}
            chunkThresholdMB={16}
            onUploadProgress={handleUploadProgress}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            onInvalidFiles={handleInvalidFiles}
          >
            {/* Contenuto custom (sovrascrive label se presente)
            <div style={{ color: "darkblue", fontWeight: "bold" }}>
              Clicca o trascina file qui per test upload!
            </div>
            */}
          </FileDropzone>
        </div>
        <div className="col-2"></div>
      </div>
      <div className="row">
        <div className="col-12">
        { invalidFiles && invalidFiles.map((invalidFile, i) => <p key={i} className="text-center">{invalidFile.reason}</p>) }
        </div>
      </div>
    </main>
  );
};

export default App;