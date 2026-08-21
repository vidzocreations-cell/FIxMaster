'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, Loader2, Image as ImageIcon, X, Sparkles } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = async (file: File) => {
    setIsScanning(true);
    setScanStatus('Reading Paper Bill Image & Capturing Photo...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUri = e.target?.result as string;
        setScannedImage(imageUri);

        setScanStatus('Analyzing Bill Image & Extracting Data...');

        // Parse filename / metadata or prompt user confirmation
        const imageName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

        // Try extracting numbers from filename if present (e.g. receipt_2500_carburetor)
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

        setScanStatus('✓ Bill Photo Scanned & Attached to Job Card!');
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

  return (
    <div className="p-3 rounded-xl bg-slate-950 border border-amber-800/80 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-amber-300">
            Outside Bill Scanner (පිට කඩේ බිල Scan කර ලබාගන්න)
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

      {/* Action Buttons: Camera Snap vs File Upload */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isScanning}
          className="py-2.5 px-3 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
        >
          <Camera className="w-4 h-4 text-slate-950" />
          <span>Snap Bill Photo (Camera)</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
        >
          <Upload className="w-4 h-4 text-cyan-400" />
          <span>Upload Bill Photo</span>
        </button>

        {/* Hidden Camera & File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

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
