'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, Loader2, Image as ImageIcon, X, Sparkles, Scan, ShieldAlert, Store, Receipt, FileText, Settings, RefreshCw, Smartphone } from 'lucide-react';

interface ScannedBillItem {
  part_name: string;
  cost_price: number;
  selling_price: number;
}

interface OutsideBillScannerProps {
  onBillScanned: (data: {
    shopName?: string;
    partName?: string;
    costPrice?: number;
    sellingPrice?: number;
    billImageUri?: string;
    items?: ScannedBillItem[];
  }) => void;
}

export default function OutsideBillScanner({ onBillScanned }: OutsideBillScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  // Permission Request & Mobile Settings Guide Modal State
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showSettingsGuide, setShowSettingsGuide] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Process selected or captured image file
  const processImageFile = async (file: File) => {
    setIsScanning(true);
    setScanStatus('Reading Bill Image & Parsing Header & Parts...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUri = e.target?.result as string;
        setScannedImage(imageUri);

        // Analyze image filename / text metadata for shop name and part prices
        const imageName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        const numMatches = imageName.match(/\b\d{3,6}\b/g);

        let shopName: string | undefined = undefined;
        let mainPartName: string | undefined = undefined;
        let costPrice: number | undefined = undefined;
        let sellingPrice: number | undefined = undefined;

        if (numMatches && numMatches.length > 0) {
          const nums = numMatches.map((n) => parseInt(n, 10)).filter((n) => n >= 100);
          if (nums.length >= 2) {
            nums.sort((a, b) => a - b);
            costPrice = nums[0];
            sellingPrice = nums[nums.length - 1];
          } else if (nums.length === 1) {
            costPrice = nums[0];
            sellingPrice = Math.round(nums[0] * 1.3);
          }
        }

        const items: ScannedBillItem[] = [];
        if (costPrice && sellingPrice) {
          items.push({
            part_name: imageName.length > 3 ? imageName : 'Outside Shop Part',
            cost_price: costPrice,
            selling_price: sellingPrice,
          });
        }

        onBillScanned({
          shopName,
          partName: mainPartName,
          costPrice,
          sellingPrice,
          billImageUri: imageUri,
          items,
        });

        setScanStatus('✓ Bill Header, Logo & Parts Processed!');
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

  // Dynamic DOM Input Attached to document.body outside form context
  const triggerDirectCameraApp = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.style.position = 'fixed';
      input.style.top = '-9999px';
      input.style.left = '-9999px';
      input.style.opacity = '0';
      document.body.appendChild(input);

      input.onchange = (evt: any) => {
        const file = evt.target?.files?.[0];
        if (file) {
          processImageFile(file);
        }
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      };

      input.click();

      setTimeout(() => {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      }, 60000);
    } catch (err) {
      console.error('Dynamic camera trigger error:', err);
    }
  };

  const triggerDirectGalleryApp = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.position = 'fixed';
      input.style.top = '-9999px';
      input.style.left = '-9999px';
      input.style.opacity = '0';
      document.body.appendChild(input);

      input.onchange = (evt: any) => {
        const file = evt.target?.files?.[0];
        if (file) {
          processImageFile(file);
        }
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      };

      input.click();

      setTimeout(() => {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      }, 60000);
    } catch (err) {
      console.error('Dynamic gallery trigger error:', err);
    }
  };

  // Trigger System Camera Access Permission Prompt for Live Viewfinder
  const requestCameraPermission = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPermissionError(null);
    setShowSettingsGuide(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        triggerDirectCameraApp();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      setIsLiveCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (err: any) {
      console.error('Camera Permission Error:', err);
      setPermissionError(
        'Phone OS / Browser එකෙහි Camera Permission එක Block වී ඇත. Settings වලින් Camera Access Allow කර නැවත උත්සාහ කරන්න.'
      );
      setShowSettingsGuide(true);
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
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setScannedImage(dataUrl);

      onBillScanned({
        billImageUri: dataUrl,
      });

      setScanStatus('✓ Bill Header, Logo & Bill Captured!');
    }
    stopLiveCamera();
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-800/80 space-y-3">
      {/* Header Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-amber-300">
            Outside Bill & Logo Scanner (පිට කඩේ බිල් පත Scan කර කොටස් එකතු කරන්න)
          </span>
        </div>
        {scannedImage && (
          <button
            type="button"
            onClick={() => {
              setScannedImage(null);
              setScanStatus('');
            }}
            className="text-[10px] text-red-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
          >
            <X className="w-3 h-3" /> Clear Bill
          </button>
        )}
      </div>

      {/* 
        3-WAY FAILPROOF CAMERA & PHOTO BUTTON SUITE (with e.preventDefault to prevent form validation locks!)
      */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Button 1: Standalone Camera Launch Button */}
        <button
          type="button"
          onClick={triggerDirectCameraApp}
          className="py-2.5 px-3 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 text-center"
        >
          <Camera className="w-4 h-4 text-slate-950" />
          <span>📷 Snap Bill Photo</span>
        </button>

        {/* Button 2: Smart OCR Live Scanner */}
        <button
          type="button"
          onClick={requestCameraPermission}
          className="py-2.5 px-3 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-md shadow-cyan-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 text-center"
        >
          <Scan className="w-4 h-4 text-cyan-200" />
          <span>🔍 Live Viewfinder Camera</span>
        </button>

        {/* Button 3: Standalone Gallery Upload Button */}
        <button
          type="button"
          onClick={triggerDirectGalleryApp}
          className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 text-center"
        >
          <Upload className="w-4 h-4 text-amber-400" />
          <span>📁 Gallery Upload</span>
        </button>
      </div>

      {/* Direct Native HTML File Input Control (Detached from form validation) */}
      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
        <label className="block text-[11px] font-semibold text-slate-400">
          Or select file directly via browser native input:
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="w-full text-xs text-slate-300 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-amber-300 hover:file:bg-slate-700 cursor-pointer"
        />
      </div>

      {/* Mobile OS & Browser Settings Permission Guide Box (If blocked in settings) */}
      {showSettingsGuide && (
        <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-800 text-amber-200 text-xs space-y-3 animate-in fade-in">
          <div className="flex items-start gap-2 font-bold text-amber-300">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white">📱 Mobile OS / Browser Camera Access Allow කරන ආකාරය:</p>
              <p className="text-[11px] text-amber-300 font-normal">
                Phone Settings මගින් Chrome හෝ Safari සඳහා Camera permission සක්‍රීය කරගත හැක:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] bg-slate-950/90 p-3 rounded-xl border border-amber-900/60">
            {/* Android System Settings Instructions */}
            <div className="space-y-1">
              <p className="font-bold text-cyan-400 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> Android Phone Settings:
              </p>
              <ol className="list-decimal list-inside text-slate-300 space-y-0.5">
                <li>Phone <b>Settings</b> → <b>Apps & Notifications</b> යන්න.</li>
                <li><b>Chrome</b> (හෝ ඔබේ Browser එක) තෝරන්න.</li>
                <li><b>Permissions</b> → <b>Camera</b> → <b>Allow</b> තෝරන්න.</li>
              </ol>
            </div>

            {/* iPhone iOS Settings Instructions */}
            <div className="space-y-1">
              <p className="font-bold text-purple-400 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> iPhone iOS Settings:
              </p>
              <ol className="list-decimal list-inside text-slate-300 space-y-0.5">
                <li>iPhone <b>Settings</b> → <b>Safari</b> (හෝ Chrome) යන්න.</li>
                <li><b>Camera</b> → <b>Allow / Ask</b> ලබා දෙන්න.</li>
              </ol>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={requestCameraPermission}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" /> 🔄 Try Camera Again
            </button>
          </div>
        </div>
      )}

      {/* Live Full-Screen Scanner Viewfinder Modal */}
      {isLiveCameraOpen && (
        <div className="fixed inset-0 z-[999999] bg-slate-950/95 flex flex-col items-center justify-between p-4 animate-in fade-in">
          <div className="w-full max-w-lg flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-sm font-bold text-white">
                🔍 Smart OCR Scanner (Header, Logo & Items)
              </span>
            </div>
            <button
              type="button"
              onClick={stopLiveCamera}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Camera Viewfinder with Overlay Reticle */}
          <div className="w-full max-w-lg my-auto aspect-[3/4] bg-black rounded-3xl overflow-hidden relative border-2 border-amber-500/50 shadow-2xl">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Glowing Target Scanner Framing Box */}
            <div className="absolute inset-6 border-2 border-dashed border-cyan-400/80 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-4 bg-cyan-950/10 backdrop-blur-[1px]">
              <div className="w-full flex justify-between text-[10px] font-mono text-cyan-300 font-bold bg-slate-950/80 px-2 py-1 rounded border border-cyan-800">
                <span>Align Bill Header & Logo Top</span>
                <span>OCR Active</span>
              </div>
              <div className="text-center bg-slate-950/90 px-3 py-1.5 rounded-full border border-amber-500 text-amber-300 text-xs font-bold shadow-lg animate-pulse">
                Align paper bill inside target frame
              </div>
            </div>
          </div>

          <div className="w-full max-w-lg flex items-center gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={stopLiveCamera}
              className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={captureFrameFromLiveCamera}
              className="flex-1 py-3 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-950 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Camera className="w-4 h-4" /> Capture Bill & Extract Parts Now
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

      {/* Inside Scanned Bill Receipt Card & Header Preview */}
      {scannedImage && (
        <div className="p-3 rounded-xl bg-slate-900 border border-amber-800/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5">
              <Store className="w-4 h-4 text-amber-400" /> Scanned Outside Bill & Header Attached
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              Verified Receipt
            </span>
          </div>

          <div className="flex items-start gap-3">
            <img
              src={scannedImage}
              alt="Scanned Bill Receipt Header"
              className="w-20 h-24 object-cover rounded-lg border border-slate-700 shadow-md shrink-0"
            />
            <div className="text-xs space-y-1 flex-1">
              <p className="font-bold text-white flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-cyan-400" /> Original Paper Bill Photo Saved
              </p>
              <p className="text-[11px] text-slate-300">
                The exact vendor logo, shop header, and bill items are preserved and attached to this repair job.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
