import { UploadEncoding } from "src/types/upload";

interface ChunkRequest {
    body: BodyInit;
    headers: Record<string, string>;
}

const readBlobAsBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string; // "data:...;base64,XXXX"
            resolve(result.split(",")[1]); // base64
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const prepareChunkRequest = async ( 
    uploadEncoding: UploadEncoding,
    uploadFieldName: string,
    file: File,
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number,
    id: string
): Promise<ChunkRequest> => {
    let body: any;
    let headers: Record<string, string> = {};
    if (uploadEncoding === "multipart") {
        const formData = new FormData();
        formData.append(uploadFieldName, chunk, file.name);
        formData.append("fileName", file.name);
        formData.append("chunkIndex", String(chunkIndex));
        formData.append("totalChunks", String(totalChunks));
        formData.append("uploadId", id);
        body = formData;
    } else if (uploadEncoding === "raw") {
        headers["Content-Type"] = "application/octet-stream";
        headers["X-File-Name"] = file.name;
        headers["X-Chunk-Index"] = String(chunkIndex);
        headers["X-Total-Chunks"] = String(totalChunks);
        headers["X-Upload-Id"] = id;
        body = chunk;
    } else if (uploadEncoding === "base64") {
        headers["Content-Type"] = "application/json";
        const base64Data = await readBlobAsBase64(chunk);
        body = JSON.stringify({
            fileName: file.name,
            chunkIndex,
            totalChunks,
            uploadId: id,
            data: base64Data,
        });
    } else throw new Error(`Unsupported encoding: ${uploadEncoding}`);
    return { body, headers };
}

const shouldFileChunk = (uploadChunk: boolean, chunkSize: number, chunkThresholdMB: number, fileSize: number): boolean => {
    let shouldChunk = false; 
    if(uploadChunk && chunkSize && chunkSize > 0 && (!chunkThresholdMB || fileSize > chunkThresholdMB * 1024 * 1024))
        shouldChunk = true;
    return shouldChunk;
}

export {
    prepareChunkRequest,
    shouldFileChunk
}