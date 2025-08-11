import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios, { AxiosProgressEvent } from 'axios';
import { Labels } from 'src/types/label';
import { FileValidationError, FileWithId } from 'src/types/file';
import { UploadEncoding, UploadMetrics, UploadStatus } from 'src/types/upload';
import { generateId, validateFile } from '../utils/fileUtil';
import { calculateUploadMetrics, uploadEncoder } from '../utils/uploadUtil';
import { defaultFileIcon, mimeIconMap, statusIcons } from './IconMap';
import { getLabel } from '../utils/labelUtil';
import { prepareChunkRequest } from '../utils/chunkUtil';

export type FileDropzoneProps = {
	// MAIN PROPS
	onFilesDropped: (files: File[]) => void; // Drop file
	onInvalidFiles?: (errors: FileValidationError[]) => void; // Invalid files
	accept?: string[]; // MIME types (['image/png', 'application/pdf', ...])
	multiple?: boolean; // Default TRUE
	maxFiles?: number; // Default Infinity
	maxSizeMb?: number; // Default Infinity

	// UPLOAD PROPS
	uploadUrl?: string; // Backend endpoint to upload files on server/db
	uploadOneByOne?: boolean; // Default FALSE
	uploadFieldName?: string; // Name send to backend: Default "file"
	uploadEncoding?: UploadEncoding; // Encoding method file upload: Default "multipart"
	uploadChunk?: boolean; // Enable chunk upload: Default FALSE
	chunkSize?: number; // Size of each chunk: Default 512kB
	onUploadProgress?: (file: File | null, percent: number) => void; // Progress uploading to backend
	onUploadComplete?: (file: File | null, response: any) => void; // Callback on upload to backend
	onUploadError?: (file: File | null, error: any) => void; // Fallback error on upload to backend

	// VIEW-STYLE PROPS
	lang?: string; // Language Default IT
	showPreview?: boolean; // Default TRUE
	label?: string; // Fallback label if no children
	className?: string[]; // Customization by classNames
	style?: React.CSSProperties; // Custom by CSS
	children?: React.ReactNode; // Custom content inside dropzone
};

export const FileDropzone: React.FC<FileDropzoneProps> = ({
	onFilesDropped,
	onInvalidFiles,
	accept,
	multiple = true,
	maxFiles = Infinity,
	maxSizeMb = Infinity,
	lang = "it",
	showPreview = true,
	label,
	className,
	style,
	children,
	uploadUrl,
	uploadOneByOne = false,
	uploadFieldName = 'file',
	uploadEncoding = 'multipart',
	uploadChunk = false,
	chunkSize = 512,
	onUploadProgress,
	onUploadComplete,
	onUploadError,
}) => {
	const [labels, setLabels] = useState<Labels>({});
	const [isDragging, setIsDragging] = useState(false);
	// Stato con file + id univoco
	const [filesWithId, setFilesWithId] = useState<FileWithId[]>([]);
	// Stato progresso caricamento per file
	const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, UploadMetrics>>({});
	const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
	
	const inputRef = useRef<HTMLInputElement>(null);
	// Inizio upload per calcolare velocità e secondi rimanenti se axios non fornisce rate/estimated
	const uploadStartAtRef = useRef<Record<string, number>>({});

	useEffect(() => {
    	loadLabels(lang);
  	}, [lang]);

	const loadLabels = async (language: string) => {
		try {
			const module = await import(`../locales/${language}.json`);
			setLabels(module.default);
		} catch {
			console.warn(`Missing translation for "${language}", falling back to "it"`);
			const fallback = await import('../locales/it.json');
			setLabels(fallback.default);
		}
  	};

	const addFiles = (newFiles: File[]) => {
		const validationFiles = newFiles.map(file => ({ file, error: validateFile(file, labels, accept, maxSizeMb) }));
		const validFiles = validationFiles.filter(result => result.error === null).map(result => result.file);
		const invalidFiles = validationFiles.filter(result => result.error !== null).map(result => result.error!) as FileValidationError[];
		if (invalidFiles.length > 0) {
    		onInvalidFiles?.(invalidFiles);
  		}
		if (validFiles.length === 0) return;
		// Genera oggetti {id, file}
		const newFilesWithId = validFiles.map((file) => ({
			id: generateId(),
			file,
		}));
		let updatedFiles: FileWithId[];
		if (multiple) {
			updatedFiles = [...filesWithId, ...newFilesWithId];
			if (updatedFiles.length > maxFiles) {
				updatedFiles = updatedFiles.slice(0, maxFiles);
			}
		} else {
			updatedFiles = newFilesWithId.slice(0, 1);
		}
		setFilesWithId(updatedFiles);
		onFilesDropped(updatedFiles.map(({ file }) => file));
		if (uploadUrl) {
			if (uploadOneByOne) {
				newFilesWithId.forEach(({ id, file }) => uploadFile(id, file));
			} else {
				uploadFilesBatch(updatedFiles.map(({ file }) => file));
			}
		}
	};
	// helper per aggiornare la mappa con progress/rate/remainingSecs
	const setMetrics = (id: string, next: UploadMetrics) => {
		setUploadProgressMap((prev) => ({
			...prev,
			[id]: { ...(prev[id] || { progress: 0 }), ...next },
		}));
	};

	const uploadFile = async (id: string, file: File) => {
		try {
			setUploadStatuses((prev) => ({ ...prev, [id]: 'uploading' }));
			uploadStartAtRef.current[id] = performance.now();
			if (uploadChunk && chunkSize && chunkSize > 0) {
				const chunkSizeByte = chunkSize * 1024;
				const totalChunks = Math.ceil(file.size / chunkSizeByte);
				let uploadedBytes = 0;
				for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
					const start = chunkIndex * chunkSizeByte;
					const end = Math.min(file.size, start + chunkSizeByte);
					const chunk = file.slice(start, end);
					const { body, headers } = await prepareChunkRequest(uploadEncoding, uploadFieldName, file, chunk, chunkIndex, totalChunks, id);
					await axios.post(uploadUrl!, body, {
						headers,
						onUploadProgress: (event: AxiosProgressEvent) => {
							const loaded = event.loaded ?? 0;
							const total = event.total ?? chunk.size;
							const totalLoaded = uploadedBytes + loaded;
							const uploadMetrics = calculateUploadMetrics(totalLoaded, file.size, uploadStartAtRef.current[id], event);
							setMetrics(id, uploadMetrics);
							onUploadProgress?.(file, uploadMetrics.progress);
						},
					});
					uploadedBytes += chunk.size;
				}
				setUploadProgressMap((prev) => {
					const copy = { ...prev };
					delete copy[id];
					return copy;
				});
				setUploadStatuses((prev) => ({ ...prev, [id]: 'success' }));
				onUploadComplete?.(file, { message: "Chunk upload complete" });
			} else {
				const { data, headers } = await uploadEncoder([file], uploadEncoding, uploadFieldName);
				const config = {
					headers,
					onUploadProgress: (event: AxiosProgressEvent) => {
						console.info("AXIOS PROGRESS...", event)
						const loaded = event.loaded ?? 0;
						const total = event.total ?? 0;
						const start = uploadStartAtRef.current[id] ?? performance.now();
						const uploadMetrics = calculateUploadMetrics(loaded, total, start, event);
						setMetrics(id, uploadMetrics);
						onUploadProgress?.(file, uploadMetrics.progress);
					},
				};
				const response = await axios.post(uploadUrl!, data, config);
				setUploadProgressMap((prev) => {
					const copy = { ...prev };
					delete copy[id];
					return copy;
				});
				setUploadStatuses((prev) => ({ ...prev, [id]: 'success' }));
				onUploadComplete?.(file, response);
			}
		} catch (error) {
			setUploadProgressMap((prev) => {
				const copy = { ...prev };
				delete copy[id];
				return copy;
			});
			setUploadStatuses((prev) => ({ ...prev, [id]: 'error' }));
			onUploadError?.(file, error);
		}
	};

	const uploadFilesBatch = async (filesBatch: File[]) => {
		try {
			setUploadStatuses((prev) => {
				const next = { ...prev };
				filesWithId.forEach(({ id, file }) => {
					if (filesBatch.includes(file)) {
						next[id] = 'uploading';
						uploadStartAtRef.current[id] = performance.now();
					}
				});
				return next;
			});
			const { data, headers } = await uploadEncoder(filesBatch, uploadEncoding, uploadFieldName);
			const config = {
				headers,
				onUploadProgress: (event: AxiosProgressEvent) => {
					console.info("AXIOS PROGRESS...", event)
					const loaded = event.loaded ?? 0;
					const total = event.total ?? 0;
					const anyId = filesWithId.find(({ file }) => filesBatch.includes(file))?.id;
					const start = anyId ? uploadStartAtRef.current[anyId] : performance.now();
					const uploadMetrics = calculateUploadMetrics(loaded, total, start, event);
					// aggiorna le metriche **per tutti** i file del batch
					setUploadProgressMap((prev) => {
						const copy = { ...prev };
						filesWithId.forEach(({ id, file }) => {
							if (filesBatch.includes(file)) {
								copy[id] = { ...(copy[id] || { progress: 0 }), ...uploadMetrics };
							}
						});
						return copy;
					});
					onUploadProgress?.(null as any, uploadMetrics.progress);
				},
			};
			const response = await axios.post(uploadUrl!, data, config);
			// Imposta tutti i file caricati a "success"
			setUploadStatuses((prev) => {
				const copy = { ...prev };
				filesWithId.forEach(({ id, file }) => {
					if (filesBatch.includes(file)) copy[id] = 'success';
				});
				return copy;
			});
			// pulisci le metriche
			setUploadProgressMap((prev) => {
				const copy = { ...prev };
				filesWithId.forEach(({ id, file }) => {
					if (filesBatch.includes(file)) delete copy[id];
				});
				return copy;
			});
			onUploadComplete?.(null as any, response);
		} catch (error) {
			// tutti error
			setUploadStatuses((prev) => {
				const copy = { ...prev };
				filesWithId.forEach(({ id, file }) => {
					if (filesBatch.includes(file)) copy[id] = 'error';
				});
				return copy;
			});
			setUploadProgressMap((prev) => {
				const copy = { ...prev };
				filesWithId.forEach(({ id, file }) => {
					if (filesBatch.includes(file)) delete copy[id];
				});
				return copy;
			});
			onUploadError?.(null, error);
		}
	};

	const handleDrop = useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();
			setIsDragging(false);
			const droppedFiles = Array.from(event.dataTransfer.files);
			addFiles(droppedFiles);
		},
		[filesWithId]
	);

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = () => {
		setIsDragging(false);
	};

	const openFileDialog = () => {
		inputRef.current?.click();
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(e.target.files || []);
		addFiles(selectedFiles);
		e.target.value = '';
	};

	const removeFile = (id: string) => {
		const updated = filesWithId.filter((f) => f.id !== id);
		setFilesWithId(updated);
		onFilesDropped(updated.map(({ file }) => file));
		setUploadProgressMap((prev) => {
			const copy = { ...prev };
			delete copy[id];
			return copy;
		});
	};

	return (
		<div
			className={`dropzone ${Array.isArray(className) ? className.join(' ') : className} ${isDragging ? 'bg-light' : ''} border border-secondary rounded p-4 text-center`}
			style={{...style, cursor: 'pointer'}}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onClick={openFileDialog}
		>
			<input
				type="file"
				ref={inputRef}
				style={{ display: 'none' }}
				onChange={handleFileSelect}
				accept={accept?.join(',')}
				multiple={multiple}
			/>
			{ children || 
				<div className="d-flex align-items-center justify-content-center gap-2">
					{statusIcons.upload({ size: 20, className: 'text-primary' })}
					<p className="m-0">{label || getLabel('drop_or_click', labels)}</p>
				</div>
			}
			{ showPreview && filesWithId.length > 0 && (
				<div className="mt-3 d-flex flex-wrap gap-2 justify-content-center">
				{ filesWithId.map(({ id, file }) => {
					const isImage = file.type.startsWith('image/');
					const url = isImage ? URL.createObjectURL(file) : undefined;
					const metrics = uploadProgressMap[id];
					const progress = metrics?.progress ?? 0;
					const rateKbps = metrics?.rateKbps;
					const remainingSeconds = metrics?.remainingSeconds;
					const status = uploadStatuses[id] || 'idle';
					const isUploading = status === 'uploading';
					const IconFile = mimeIconMap[file.type] || defaultFileIcon;
					return (
						<div
							key={id}
							className="position-relative border rounded p-2 text-center d-flex flex-column align-items-center justify-content-center"
							style={{
								width: 120,
								height: 120,
								overflow: 'hidden',
								userSelect: 'none',
							}}
						>
						{ isImage ? (
							<img
								src={url}
								alt={file.name}
								className="img-fluid"
								style={{ maxHeight: '80px', objectFit: 'contain' }}
								onLoad={() => URL.revokeObjectURL(url!)}
							/>
						) : (
							<div>
								<IconFile size={20} className='text-secondary'/>
								<span>{file.name}</span>
							</div>
						)}
						{isUploading && (
							<div
								className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-75 fw-bold text-dark text-center p-2 gap-1"
								style={{ fontSize: 13 }}
							>
								<div
									className="spinner-border spinner-border-sm mb-1"
									role="status"
									style={{ width: 22, height: 22 }}
								/>
								<div>{progress}%</div>
								{typeof rateKbps === 'number' && <div>{rateKbps} KB/s</div>}
								{typeof remainingSeconds === 'number' && <div>~{remainingSeconds}s</div>}
							</div>
						)}
						{status === 'success' && (
							<div className="mt-1 text-success fw-bold d-flex align-items-center gap-1" style={{ fontSize: 12 }}>
								{statusIcons.success({ size: 18 })}
								{getLabel('upload_success', labels)}
							</div>
						)}
						{status === 'error' && (
							<div className="mt-1 text-danger fw-bold d-flex align-items-center gap-1" style={{ fontSize: 12 }}>
								{statusIcons.error({ size: 18 })}
								{getLabel('upload_failed', labels)}
							</div>
						)}
						{ /* Attualmente non implementato l'abort de* fil* che si st* uploadando */}
						{!isUploading && (
							<button
								type="button"
								className="btn btn-danger btn-sm position-absolute top-0 end-0 rounded-circle d-flex align-items-center justify-content-center"
								style={{ padding: 3 }}
								onClick={(e) => {
									e.stopPropagation();
									removeFile(id);
								}}
								title={getLabel('remove_file', labels)}
							>
								{statusIcons.remove({ size: 12 })}
							</button>
						)}
						</div>
					);
				})}
				</div>
			)}
		</div>
	);
};
