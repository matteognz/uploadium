import React from "react";
import { FileDropzone } from "uploadium";

const App: React.FC = () => {
  const handleFilesDropped = (files: File[]) => {
    console.log("File aggiunti/droppati:", files);
  };

  const handleUploadProgress = (file: File | null, progress: number) => {
    console.log(`Upload progresso ${file ? file.name : "batch"}: ${progress}%`);
  };

  const handleUploadComplete = (file: File | null, response: any) => {
    console.log(`Upload completato per ${file ? file.name : "batch"}`, response);
  };

  const handleUploadError = (file: File | null, error: any) => {
    console.error(`Upload fallito per ${file ? file.name : "batch"}`, error);
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <h1>Test FileDropzone - Uploadium</h1>

      <FileDropzone
        accept={["image/png", "image/jpeg", "application/pdf"]}
        multiple={true}
        maxFiles={10}
        maxSizeMb={10}
        showPreview={true}
        lang="en"
        label="Trascina o seleziona fino a 3 file (png, jpeg, pdf, max 10MB)"
        className="my-dropzone"
        style={{ borderColor: "dodgerblue", padding: 30 }}
        onFilesDropped={handleFilesDropped}
        uploadUrl="https://httpbin.org/post" // endpoint demo per test upload
        uploadOneByOne={true}
        uploadFieldName="upload"
        onUploadProgress={handleUploadProgress}
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
      >
        {/* Contenuto custom (sovrascrive label se presente) */}
        <div style={{ color: "darkblue", fontWeight: "bold" }}>
          Clicca o trascina file qui per test upload!
        </div>
      </FileDropzone>
    </div>
  );
};

export default App;