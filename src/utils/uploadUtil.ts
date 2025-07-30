import { AxiosProgressEvent } from "axios";

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

export {
    calculateUploadMetrics
}
