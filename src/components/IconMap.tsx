import { IconComponent } from "src/types/icon";

const createBootstrapIcon = (iconClass: string): IconComponent => ({ size = 16, className = '' } = {}) => (
  <i className={`bi ${iconClass} ${className}`} style={{ fontSize: size }}></i>
);

// Default per file generici
export const defaultFileIcon: IconComponent = createBootstrapIcon('bi-file-earmark-fill');

// Mappa MIME -> icone per tipo file
export const mimeIconMap: Record<string, IconComponent> = {
  // documenti
  'application/pdf': createBootstrapIcon('bi-file-earmark-pdf-fill'),
  'application/msword': createBootstrapIcon('bi bi-file-earmark-word-fill'),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': createBootstrapIcon('bi bi-file-earmark-word-fill'),
  'text/plain': createBootstrapIcon('bi-file-earmark-text-fill'),

  // archivi
  'application/zip': createBootstrapIcon('bi-file-earmark-zip-fill'),
  'application/x-rar-compressed': createBootstrapIcon('bi-file-zip-fill'),

  // audio/video
  'audio/mpeg': createBootstrapIcon('bi-file-earmark-music-fill'),
  'video/mp4': createBootstrapIcon('bi-file-earmark-play-fill'),
};

// Icone per stati (errore, successo, ecc.)
export const statusIcons = {
  error: createBootstrapIcon('bi-exclamation-circle-fill'),
  success: createBootstrapIcon('bi-check-circle-fill'),
  remove: createBootstrapIcon('bi-x-lg'),
  upload: createBootstrapIcon('bi-cloud-arrow-up'),
};