// app/endodecide/radiographs/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
} from "firebase/storage";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { storage, db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import Navigation from "../../components/navigation";
import ProtectedRoute from "../../components/protectedroute";

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════
interface FileWithType {
  file: File;
  type: "periapical" | "bitewing" | "occlusal" | "panoramic" | "other";
  preview: string;
}

const RADIOGRAPH_TYPES = {
  periapical: "Periapical (PA)",
  bitewing: "Bitewing (BW)",
  occlusal: "Occlusal (OC)",
  panoramic: "Panoramic (PAN)",
  other: "Other",
};

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export default function RadioGraphsUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const caseId = searchParams.get("caseId") ?? null;

  const [files, setFiles] = useState<FileWithType[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Validate case ownership on load
  useEffect(() => {
    const validateCase = async () => {
      if (!user || !caseId) {
        setError("Invalid case ID or user not authenticated");
        setLoading(false);
        return;
      }

      try {
        const caseSnap = await getDoc(doc(db, "cases", caseId));
        if (!caseSnap.exists()) {
          setError("Case not found");
          setLoading(false);
          return;
        }

        const caseData = caseSnap.data();
        if (caseData.userId !== user.uid) {
          setError("You do not own this case");
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error("Validation error:", err);
        setError("Failed to validate case");
        setLoading(false);
      }
    };

    validateCase();
  }, [user, caseId]);

  // File validation
  const validateFile = (file: File): string | null => {
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      return "Only JPEG, PNG, and PDF files are allowed";
    }

    if (file.size > maxSize) {
      return "File size must be less than 10MB";
    }

    return null;
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  // Handle file selection
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  // Process files
  const handleFiles = (fileList: File[]) => {
    setError(null);
    const newFiles: FileWithType[] = [];

    for (const file of fileList) {
      const validation = validateFile(file);
      if (validation) {
        setError(`${file.name}: ${validation}`);
        continue;
      }

      // Create preview URL
      const preview = URL.createObjectURL(file);

      newFiles.push({
        file,
        type: "other",
        preview,
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
  };

  // Update radiograph type for a file
  const updateFileType = (
    index: number,
    type: "periapical" | "bitewing" | "occlusal" | "panoramic" | "other"
  ) => {
    setFiles(prev => {
      const updated = [...prev];
      updated[index].type = type;
      return updated;
    });
  };

  // Remove file
  const removeFile = (index: number) => {
    setFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Upload radiographs
  const handleUpload = async () => {
    if (!user || !caseId || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploadedRadiographs = [];

      for (let i = 0; i < files.length; i++) {
        const { file, type } = files[i];

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${timestamp}-${randomId}.${ext}`;

        // Upload to Firebase Storage
        const storagePath = `radiographs/${user.uid}/${caseId}/${fileName}`;
        const storageRef = ref(storage, storagePath);

        setUploadProgress(prev => ({ ...prev, [i]: 0 }));

        await uploadBytes(storageRef, file);

        setUploadProgress(prev => ({ ...prev, [i]: 100 }));

        // Get download URL
        const url = await getDownloadURL(storageRef);

        // Save metadata to Firestore
        const radiographRef = collection(db, "cases", caseId, "radiographs");
        const docRef = await addDoc(radiographRef, {
          name: file.name,
          type,
          url,
          storagePath,
          fileSize: file.size,
          mimeType: file.type,
          uploadedAt: Timestamp.now(),
          uploadedBy: user.uid,
        });

        uploadedRadiographs.push({
          id: docRef.id,
          name: file.name,
          type,
          url,
        });
      }

      // Update case radiograph count
      await updateDoc(doc(db, "cases", caseId), {
        radiographCount: uploadedRadiographs.length,
        radiographsUpdatedAt: Timestamp.now(),
      });

      // Navigate to MyCases
      router.push("/mycases");
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to upload radiographs"
      );
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navigation />
        <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#10b981]/30 border-t-[#10b981] animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!caseId) {
    return (
      <ProtectedRoute>
        <Navigation />
        <div className="min-h-screen bg-[#0a1428] text-white flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">No case ID provided</p>
            <button
              onClick={() => router.push("/mycases")}
              className="text-[#10b981] hover:underline"
            >
              Back to My Cases
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white pb-20">
        <div className="border-b border-white/8 bg-[#0d1a30]/80 backdrop-blur-sm px-4 sm:px-6 py-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Upload Radiographs</h1>
            <p className="text-gray-400">
              Add radiographs to your case. Skip if you don't have any yet.
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/25 rounded-2xl px-4 py-3.5 mb-6">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="text-red-400 flex-shrink-0 mt-0.5"
              >
                <path
                  d="M8 2L14 13H2L8 2Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 7v3M8 11.5v.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Upload area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all mb-6 ${
              dragActive
                ? "border-[#10b981] bg-[#10b981]/5"
                : "border-white/20 bg-white/2"
            }`}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              className="mx-auto mb-4 opacity-60"
            >
              <path
                d="M24 6v24M12 18l12-12 12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect x="6" y="34" width="36" height="4" rx="1" fill="currentColor" />
            </svg>

            <p className="text-lg font-semibold mb-2">Drag radiographs here</p>
            <p className="text-sm text-gray-500 mb-6">
              or{" "}
              <label className="text-[#10b981] cursor-pointer hover:underline">
                browse files
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-xs text-gray-600">
              JPEG, PNG, PDF (max 10MB per file)
            </p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-3 mb-6">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Radiographs to upload ({files.length})
              </p>

              {files.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 bg-[#0d1a30] border border-white/8 rounded-2xl p-4"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/8">
                    {item.file.type.startsWith("image") ? (
                      <img
                        src={item.preview}
                        alt={item.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">📄</span>
                      </div>
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(item.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  {/* Type selector */}
                  <select
                    value={item.type}
                    onChange={e =>
                      updateFileType(
                        idx,
                        e.target.value as
                          | "periapical"
                          | "bitewing"
                          | "occlusal"
                          | "panoramic"
                          | "other"
                      )
                    }
                    className="bg-[#0a1428] border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981] transition-colors"
                  >
                    {Object.entries(RADIOGRAPH_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>

                  {/* Upload progress */}
                  {uploading && uploadProgress[idx] !== undefined && (
                    <div className="w-20 text-center">
                      {uploadProgress[idx] === 100 ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="mx-auto text-emerald-400"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <div className="text-xs text-gray-500">
                          {uploadProgress[idx]}%
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remove button */}
                  {!uploading && (
                    <button
                      onClick={() => removeFile(idx)}
                      className="flex-shrink-0 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M2 2l12 12M14 2L2 14"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="flex-1 bg-[#10b981] hover:bg-[#0ea76e] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-2xl transition-all"
            >
              {uploading ? "Uploading..." : "Upload Radiographs"}
            </button>

            <button
              onClick={() => router.push("/mycases")}
              disabled={uploading}
              className="flex-1 bg-white/8 hover:bg-white/15 disabled:opacity-50 border border-white/10 font-semibold py-4 rounded-2xl transition-all"
            >
              {files.length === 0 ? "Skip for Now" : "Cancel"}
            </button>
          </div>

          {/* Info */}
          <p className="text-xs text-gray-600 text-center mt-6">
            Radiographs are stored securely and associated with this case.
            You can upload more later.
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}