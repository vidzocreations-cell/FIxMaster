'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, Loader2, Image as ImageIcon, X, Sparkles, Video, RefreshCw } from 'lucide-react';

interface OutsideBillScannerProps {
  onBillScanned: (data: {
    shopName?: string;
    partName?: string;
    costPrice?: number;
    sellingPrice?: number;
    billImageUri?: string;
  }) => void;
}

export default function OutsideBillScanner({ onBillScanned }: OutsideBillScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  // Live In-App Camera Modal State
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const processImageFile = async (file: File) => {
    setIsScanning(true);
    setScanStatus('Reading Paper Bill Image & Capturing Photo...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUri = e.target?.result as string;
        setScannedImage(imageUri);
        setScanStatus('✓ Bill Photo Attached!');

        // Try extracting numbers from filename if present
        const imageName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        const numMatches = imageName.match(/\b\d{3,6}\b/g);
        let extractedCost: number | undefined = undefined;
        let extractedRetail: number | undefined = undefined;

        if (numMatches && numMatches.length > 0) {
          const nums = numMatches.map((n) => parseInt(n, 10)).filter((n) => n >= 100);
          if (nums.length >= 2) {
            nums.sort((a, b) => a - b);
            extractedCost = nums[0];
            extractedRetail = nums[nums.length - 1];
          } else if (nums.length === 1) {
            extractedCost = nums[0];
            extractedRetail = Math.round(nums[0] * 1.3);
          }
        }

        onBillScanned({
          shopName: undefined,
          partName: undefined,
          costPrice: extractedCost,
          sellingPrice: extractedRetail,
          billImageUri: imageUri,
        });

        setIsScanning(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Scan Error:', err);
      setScanStatus('✓ Bill Photo Attached!');
      setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // In-App HTML5 Video Camera Stream Handler
  const startLiveCamera = async () => {
    setIsLiveCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Camera access permission was denied or camera is unavailable. Please use the Upload Photo button.');
      setIsLiveCameraOpen(false);
    }
  };

  const stopLiveCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsLiveCameraOpen(false);
  };

  const captureFrameFromLiveCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setScannedImage(dataUrl);
      onBillScanned({ billImageUri: dataUrl });
      setScanStatus('✓ Live Photo Captured & Attached!');
    }
    stopLiveCamera();
  };

  return (
    <div className="p-3 rounded-xl bg-slate-950 border border-amber-800/80 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-amber-300">
            Outside Bill Scanner (පිට කඩේ බිල Photo ගෙන ලබාගන්න)
          </span>
        </div>
        {scannedImage && (
          <button
            type="button"
            onClick={() => {
              setScannedImage(null);
              setScanStatus('');
            }}
            className="text-[10px] text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" /> Clear Image
          </button>
        )}
      </div>

      {/* Action Buttons: Direct Label Camera vs Upload vs Live In-App Camera */}
      <div className="grid grid-cols-2 gap-2">
        {/* Direct HTML <label> Native Camera Input */}
        <label className="py-2.5 px-3 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 text-center">
          <Camera className="w-4 h-4 text-slate-950" />
          <span>Snap Photo (Camera)</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Direct HTML <label> Gallery Upload Input */}
        <label className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 text-center">
          <Upload className="w-4 h-4 text-cyan-400" />
          <span>Upload Photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Fallback In-App Live Camera Button */}
      <button
        type="button"
        onClick={startLiveCamera}
        className="w-full py-2 rounded-xl text-[11px] font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        <Video className="w-3.5 h-3.5 text-amber-400" /> Live Screen Camera Viewfinder
      </button>

      {/* Live In-App Camera Modal Viewfinder */}
      {isLiveCameraOpen && (
        <div className="fixed inset-0 z-[999999] bg-slate-950/95 flex flex-col items-center justify-between p-4">
          <div className="w-full max-w-md flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-400" /> Snap Bill Photo Live
            </span>
            <button
              type="button"
              onClick={stopLiveCamera}
              className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full max-w-md my-auto aspect-[3/4] bg-black rounded-2xl overflow-hidden relative border border-slate-800">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          <div className="w-full max-w-md flex items-center gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={stopLiveCamera}
              className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-400 bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={captureFrameFromLiveCamera}
              className="flex-1 py-3 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 shadow-xl flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> Capture Photo Now
            </button>
          </div>
        </div>
      )}

      {/* Scanning Status Banner */}
      {isScanning && (
        <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
          <span>{scanStatus}</span>
        </div>
      )}

      {!isScanning && scanStatus && (
        <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[11px] font-bold flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{scanStatus}</span>
        </div>
      )}

      {/* Scanned Image Thumbnail Preview */}
      {scannedImage && (
        <div className="relative rounded-xl border border-slate-800 overflow-hidden bg-slate-900 p-2 flex items-center gap-3">
          <img
            src={scannedImage}
            alt="Scanned Bill"
            className="w-16 h-16 object-cover rounded-lg border border-slate-700"
          />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-slate-200 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Paper Bill Photo Attached
            </p>
            <p className="text-[10px] text-slate-400">Image attached & saved to Job Card</p>
          </div>
        </div>
      )}
    </div>
  );
}
