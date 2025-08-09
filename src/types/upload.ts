export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export type UploadMetrics = {
	progress: number;           // 0-100%
	rateKbps?: number;          // KB/s
	remainingSeconds?: number;  // secondi rimanenti
};

export type UploadEncoding = 'multipart' | 'base64' | 'raw';