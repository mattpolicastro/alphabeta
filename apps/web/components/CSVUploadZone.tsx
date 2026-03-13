'use client';

/**
 * Drag-and-drop CSV upload zone with column detection preview.
 * See requirements.md Sections 5.3, 8.4.
 */

interface CSVUploadZoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export function CSVUploadZone({ onFileSelected, isLoading }: CSVUploadZoneProps) {
  // TODO: implement drag-and-drop zone with visual feedback
  // TODO: also support file picker as fallback
  // TODO: labeled expected columns in the drop zone
  // TODO: progress indicator during PapaParse streaming (isLoading)
  // TODO: file size validation (reject > 50MB with error message)

  void onFileSelected;
  void isLoading;

  return (
    <div
      className="border border-2 border-dashed rounded p-5 text-center"
      // TODO: onDragOver, onDragLeave, onDrop handlers
      // TODO: onClick to trigger file input
    >
      {/* TODO: hidden file input */}
      {/* TODO: drag-and-drop visual state */}
      {/* TODO: loading indicator */}
      <p className="text-muted">
        Drag and drop a CSV file here, or click to browse
      </p>
      <p className="text-muted small">
        Expected columns: experiment_id, variation_id, units, plus metric columns
      </p>
    </div>
  );
}
