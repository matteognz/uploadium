import { AxiosProgressEvent } from "axios";
import { UploadEncoding } from "src/types/upload";

const calculateUploadMetrics = (loaded: number, total: number, start: number, event?: AxiosProgressEvent) => {
	const progress = total ? Math.round((loaded * 100) / total) : 0;
	let rateKbps = event?.rate && typeof event.rate === 'number' ? Math.round(event.rate / 1024) : undefined;
	let remainingSeconds = event?.estimated && typeof event.estimated === 'number' ? Math.max(0, Math.round(event.estimated / 1000)) : undefined;
	if (!rateKbps || !remainingSeconds) {
		const elapsedSec = (performance.now() - start) / 1000;
		if (elapsedSec > 0 && total > 0) {
			rateKbps = Math.max(1, Math.round((loaded / 1024) / elapsedSec));
			const remainingBytes = Math.max(0, total - loaded);
			remainingSeconds = Math.max(0, Math.round((remainingBytes / 1024) / rateKbps));
		}
	}
	return { progress, rateKbps, remainingSeconds };
}

const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
	const reader = new FileReader();
	reader.onload = () => resolve(reader.result as string);
	reader.onerror = reject;
	reader.readAsDataURL(file);
});


const uploadEncoder = async (files: File[], encoding: UploadEncoding, fieldName: string) => {
	if (encoding === 'multipart' || (encoding === 'raw' && files.length !== 1)) {
		const formData = new FormData();
		files.forEach(file => formData.append(fieldName, file));
		return { data: formData, headers: { 'Content-Type': 'multipart/form-data' } };
	}
	if (encoding === 'raw' && files.length === 1) {
		const file = files[0];
		return { data: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } };
	}
	if (encoding === 'base64') {
		const base64Files = await Promise.all(
			files.map(async file => ({
				name: file.name,
				type: file.type,
				size: file.size,
				content: await fileToBase64(file)
			}))
		);
		return { data: { [fieldName]: base64Files }, headers: { 'Content-Type': 'application/json' } };
	}
	throw new Error(`Unsupported encoding: ${encoding}`);
}

export {
    calculateUploadMetrics,
	uploadEncoder
}
