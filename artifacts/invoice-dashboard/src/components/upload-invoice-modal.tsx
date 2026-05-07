import React, { useRef, useState, useCallback } from "react";
import { Upload, Camera, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListInvoicesQueryKey,
  getGetInvoiceSummaryQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type Mode = "upload" | "camera";

interface UploadInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const API_BASE = BASE_URL.replace(/\/$/, "") + "/api";

export function UploadInvoiceModal({ isOpen, onClose }: UploadInvoiceModalProps) {
  const [mode, setMode] = useState<Mode>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetInvoiceSummaryQueryKey() });
  }, [queryClient]);

  const resetState = () => {
    setSelectedFile(null);
    setPreview(null);
    setIsUploading(false);
    setDragOver(false);
    setCameraError(null);
    stopCamera();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // ── File selection ──────────────────────────────────────────────────────────
  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  const MAX_MB = 20;

  const validateAndSetFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "סוג קובץ שגוי", description: "מותרים: PDF, JPG, PNG", variant: "destructive" });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast({ title: "קובץ גדול מדי", description: `מקסימום ${MAX_MB}MB`, variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  };

  // ── Camera ──────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError("לא ניתן לגשת למצלמה. אנא אפשר הרשאות מצלמה בדפדפן.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        setSelectedFile(file);
        setPreview(canvas.toDataURL("image/jpeg"));
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    const source = mode === "camera" ? "camera" : "upload";

    try {
      const resp = await fetch(`${API_BASE}/invoices/upload?source=${source}`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "שגיאה לא ידועה" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      await resp.json();
      invalidate();
      toast({
        title: "חשבונית הועלתה",
        description: "החשבונית עובדה ונוספה למערכת.",
      });
      handleClose();
    } catch (err) {
      toast({
        title: "העלאה נכשלה",
        description: err instanceof Error ? err.message : "אירעה שגיאה לא ידועה.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 pb-[68px] sm:pb-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">
            {mode === "upload" ? "העלאת חשבונית" : "צילום חשבונית"}
          </h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 px-6 pt-4">
          <button
            onClick={() => { setMode("upload"); resetState(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === "upload"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <Upload className="w-4 h-4" /> העלאת קובץ
          </button>
          <button
            onClick={() => { setMode("camera"); resetState(); startCamera(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === "camera"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <Camera className="w-4 h-4" /> צילום מצלמה
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* ── Upload mode ── */}
          {mode === "upload" && !selectedFile && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 transition-all ${
                dragOver
                  ? "border-primary bg-primary/10"
                  : "border-white/10 hover:border-white/25 hover:bg-white/5"
              }`}
            >
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">גרור קובץ לכאן או לחץ לבחירה</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — עד 20MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          )}

          {/* ── Camera mode ── */}
          {mode === "camera" && !selectedFile && (
            <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/10">
              {cameraError ? (
                <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
                  <Camera className="w-10 h-10 text-muted-foreground opacity-40" />
                  <p className="text-sm text-rose-400">{cameraError}</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="w-full aspect-video object-cover"
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {cameraActive && (
                    <div className="p-4 flex justify-center">
                      <Button
                        onClick={capturePhoto}
                        className="rounded-full h-14 w-14 p-0 bg-white text-black hover:bg-white/90 shadow-lg"
                      >
                        <Camera className="w-6 h-6" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Preview of selected file ── */}
          {selectedFile && (
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/20">
              {preview ? (
                <img src={preview} alt="תצוגה מקדימה" className="w-full max-h-64 object-contain" />
              ) : (
                <div className="flex items-center gap-3 p-4">
                  {selectedFile.type === "application/pdf" ? (
                    <FileText className="w-8 h-8 text-primary shrink-0" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-primary shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
              <div className="p-3 border-t border-white/5 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{selectedFile.name}</span>
                <button
                  onClick={() => { setSelectedFile(null); setPreview(null); if (mode === "camera") startCamera(); }}
                  className="text-xs text-muted-foreground hover:text-white transition-colors"
                >
                  שנה
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 border border-white/10 text-muted-foreground hover:text-white rounded-xl"
            onClick={handleClose}
            disabled={isUploading}
          >
            ביטול
          </Button>
          <Button
            className="flex-1 rounded-xl"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                מעלה...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                העלה חשבונית
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
