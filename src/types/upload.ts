export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export type UploadMetrics = {
	progress: number;
	rateKbps?: number;
	remainingSeconds?: number;
};

export type UploadEncoding = 'multipart' | 'base64' | 'raw';

export type UploadMethod = 'POST' | 'PUT' | 'PATCH';