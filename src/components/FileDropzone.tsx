import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios, { AxiosProgressEvent } from 'axios';
import '../assets/custom.css'
import { Labels } from 'src/types/label';
import { FileWithId } from 'src/types/file';
import { UploadMetrics, UploadStatus } from 'src/types/upload';
import { generateId, isValidFile } from '../utils/fileUtil';
import { calculateUploadMetrics } from '../utils/uploadUtil';

export type FileDropzoneProps = {
	// MAIN PROPS
	onFilesDropped: (files: File[]) => void; // Drop file
	onError?: (message: string) => void; // Error callback
	accept?: string[]; // MIME types (['image/png', 'application/pdf', ...])
	multiple?: boolean; // Default TRUE
	maxFiles?: number; // Default Infinity
	maxSizeMb?: number; // Default Infinity

	// UPLOAD PROPS
	uploadUrl?: string; // Backend endpoint to upload files on server/db
	uploadOneByOne?: boolean; // Default FALSE
	uploadFieldName?: string; // Name send to backend: Default "file"
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

	const getLabel = (key: string) => labels[key] || key;

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
		let validFiles = newFiles.filter(newFile => isValidFile(newFile, accept, maxSizeMb));
		if (validFiles?.length === 0) return;
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

			const formData = new FormData();
			formData.append(uploadFieldName, file);

			const config = {
				headers: { 'Content-Type': 'multipart/form-data' },
				onUploadProgress: (event: AxiosProgressEvent) => {
					console.log("AXIOS PROGRESS...", event)
					const loaded = event.loaded ?? 0;
					const total = event.total ?? 0;
					const start = uploadStartAtRef.current[id] ?? performance.now();
					const uploadMetrics = calculateUploadMetrics(loaded, total, start, event);
					setMetrics(id, uploadMetrics);
					onUploadProgress?.(file, uploadMetrics.progress);
				},
			};
			const response = await axios.post(uploadUrl!, formData, config);
			setUploadProgressMap((prev) => {
				const copy = { ...prev };
				delete copy[id];
				return copy;
			});
			setUploadStatuses((prev) => ({ ...prev, [id]: 'success' }));
			onUploadComplete?.(file, response);
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

			const formData = new FormData();
			filesBatch.forEach((file) =>
				formData.append(uploadFieldName, file)
			);

			const config = {
				headers: { 'Content-Type': 'multipart/form-data' },
				onUploadProgress: (event: AxiosProgressEvent) => {
					console.log("AXIOS PROGRESS...", event)
					const loaded = event.loaded ?? 0;
					const total = event.total ?? 0;
					const anyId = filesWithId.find(({ file }) => filesBatch.includes(file))?.id;
					const start = anyId ? uploadStartAtRef.current[anyId] : performance.now();
					const uploadMetrics = calculateUploadMetrics(loaded, total, start, event);
					// aggiorna le metriche **per tutti** i file del batch
					setUploadProgressMap((prev) => {
						const copy = { ...prev };
						filesWithId.forEach(({ id, file }) => {
							const progress = uploadMetrics.progress;
							const rateKbps = uploadMetrics.rateKbps;
							const remainingSeconds = uploadMetrics.remainingSeconds;
							if (filesBatch.includes(file)) {
								copy[id] = {
									...(copy[id] || { progress: 0 }),
									progress,
									rateKbps,
									remainingSeconds
                                };
							}
						});
						return copy;
					});
					onUploadProgress?.(null as any, uploadMetrics.progress);
				},
			};
			const response = await axios.post(uploadUrl!, formData, config);
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
			className={Array.isArray(className) ? className.join(' ') : className}
			style={{
				border: '2px dashed #aaa',
				borderRadius: 8,
				padding: 20,
				textAlign: 'center',
				backgroundColor: isDragging ? '#f0f0f0' : undefined,
				cursor: 'pointer',
				...style,
			}}
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
			{children || <p>{label || getLabel('drop_or_click')}</p>}

			{showPreview && filesWithId.length > 0 && (
				<div
					style={{
						marginTop: 16,
						display: 'flex',
						gap: 10,
						flexWrap: 'wrap',
						justifyContent: 'center',
					}}
				>
					{filesWithId.map(({ id, file }) => {
						const isImage = file.type.startsWith('image/');
						const url = isImage ? URL.createObjectURL(file) : undefined;
						const metrics = uploadProgressMap[id];
						const progress = metrics?.progress ?? 0;
						const rateKbps = metrics?.rateKbps;
						const remainingSeconds = metrics?.remainingSeconds;
						const status = uploadStatuses[id] || 'idle';
						const isUploading = status === 'uploading';
						return (
							<div
								key={id}
								style={{
									position: 'relative',
									border: '1px solid #ccc',
									borderRadius: 4,
									padding: 8,
									width: 120,
									height: 120,
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									justifyContent: 'center',
									overflow: 'hidden',
									userSelect: 'none',
								}}
							>
								{isImage ? (
									<img
										src={url}
										alt={file.name}
										style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain' }}
										onLoad={() => URL.revokeObjectURL(url!)}
									/>
								) : (
									<p style={{ fontSize: 12, wordBreak: 'break-word', textAlign: 'center' }}>
										{file.name}
									</p>
								)}

								{/* Overlay caricamento con % + velocità + ETA */}
								{isUploading && (
									<div
										style={{
											position: 'absolute',
											top: 0,
											left: 0,
											width: '100%',
											height: '100%',
											backgroundColor: 'rgba(255,255,255,0.75)',
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'center',
											justifyContent: 'center',
											fontWeight: 'bold',
											fontSize: 13,
											color: '#333',
											padding: 6,
											textAlign: 'center',
											gap: 4,
										}}
									>
										<div
											style={{
												border: '3px solid #ccc',
												borderTop: '3px solid #333',
												borderRadius: '50%',
												width: 22,
												height: 22,
												animation: 'spin 1s linear infinite',
												marginBottom: 4,
											}}
										/>
										<div>{progress}%</div>
										{typeof rateKbps === 'number' && <div>{rateKbps} KB/s</div>}
										{typeof remainingSeconds === 'number' && <div>~{remainingSeconds}s</div>}
									</div>
								)}

								{status === 'success' && (
									<div style={{ marginTop: 6, color: 'green', fontWeight: 'bold', fontSize: 12 }}>
										{getLabel('upload_success')}
									</div>
								)}

								<button
									onClick={(e) => {
										e.stopPropagation();
										removeFile(id);
									}}
									style={{
										position: 'absolute',
										top: 2,
										right: 2,
										background: 'red',
										color: 'white',
										border: 'none',
										borderRadius: '50%',
										width: 20,
										height: 20,
										cursor: 'pointer',
									}}
									title={getLabel('remove_file')}
								>
									X
								</button>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
