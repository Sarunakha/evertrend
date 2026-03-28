import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, MoveUp, MoveDown, MoveLeft, MoveRight } from 'lucide-react';
import api from '../utils/api';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const fitFromDiffPercent = (userValue, productValue) => {
  if (typeof userValue !== 'number' || typeof productValue !== 'number' || userValue <= 0) return null;
  const diff = Math.abs(productValue - userValue);
  const score = 100 - (diff / userValue) * 100;
  return clamp(Math.round(score), 0, 100);
};

const VirtualTryOnModal = ({ product, selectedSize, onClose }) => {
  const fileInputRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [loadingMeas, setLoadingMeas] = useState(true);
  const [measError, setMeasError] = useState('');
  const [measurements, setMeasurements] = useState(null);

  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const productImg = product?.images?.[0] || '';

  useEffect(() => {
    let revokeUrl = null;
    return () => {
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, []);

  useEffect(() => {
    const fetchMeasurements = async () => {
      setLoadingMeas(true);
      setMeasError('');
      try {
        const res = await api.get('/users/measurements');
        if (res.data?.success) setMeasurements(res.data.data);
        else setMeasError(res.data?.message || 'Failed to load measurements.');
      } catch (e) {
        setMeasError(e.response?.data?.message || 'Failed to load measurements.');
      } finally {
        setLoadingMeas(false);
      }
    };
    fetchMeasurements();
  }, []);

  const normalizedSize = useMemo(() => {
    if (!selectedSize) return null;
    const up = String(selectedSize).toUpperCase();
    return ['S', 'M', 'L', 'XL'].includes(up) ? up : null;
  }, [selectedSize]);

  const sizeChartEntry = useMemo(() => {
    return normalizedSize ? product?.sizeChart?.[normalizedSize] : null;
  }, [product?.sizeChart, normalizedSize]);

  const missingSizeMeasurementsMessage = useMemo(() => {
    if (!normalizedSize) return 'Select a size to calculate fit.';
    if (!product?.sizeChart) return 'Product size chart not available.';
    if (!sizeChartEntry) return `Measurements for size ${normalizedSize} are missing.`;
    const hasChest = typeof sizeChartEntry.chest === 'number';
    const hasWaist = typeof sizeChartEntry.waist === 'number';
    if (!hasChest || !hasWaist) {
      return `Measurements for size ${normalizedSize} are incomplete (chest/waist required).`;
    }
    return null;
  }, [normalizedSize, product?.sizeChart, sizeChartEntry]);

  const fitScore = useMemo(() => {
    if (!measurements || !sizeChartEntry) return null;
    const chestScore = fitFromDiffPercent(measurements.chest, sizeChartEntry.chest);
    const waistScore = fitFromDiffPercent(measurements.waist, sizeChartEntry.waist);
    const scores = [chestScore, waistScore].filter((s) => typeof s === 'number');
    if (!scores.length) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [measurements, sizeChartEntry]);

  const handlePickPhoto = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
  };

  const moveBy = (dx, dy) => setPos((p) => ({ x: p.x + dx, y: p.y + dy }));

  const badge =
    fitScore == null
      ? { text: 'Fit Score: —', cls: 'bg-white/10 text-white border-white/15' }
      : fitScore >= 85
        ? { text: `Fit Score: ${fitScore}%`, cls: 'bg-emerald-500/15 text-emerald-100 border-emerald-400/25' }
        : fitScore >= 70
          ? { text: `Fit Score: ${fitScore}%`, cls: 'bg-amber-500/15 text-amber-100 border-amber-400/25' }
          : { text: `Fit Score: ${fitScore}%`, cls: 'bg-rose-500/15 text-rose-100 border-rose-400/25' };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-slate-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xs px-3 py-1.5 rounded-full border ${badge.cls}`}>
              {badge.text}
            </span>
            <div className="text-white">
              <p className="text-sm font-semibold leading-tight">Fitting Room</p>
              <p className="text-xs text-slate-300">
                {selectedSize ? `Selected size: ${selectedSize}` : 'Select a size to get a fit recommendation.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
          {/* Left: photo + overlay */}
          <div className="p-5">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100 text-sm"
              >
                Upload your photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePickPhoto(e.target.files?.[0])}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScale((s) => clamp(Number((s + 0.1).toFixed(2)), 0.2, 3))}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100"
                  title="Scale up"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setScale((s) => clamp(Number((s - 0.1).toFixed(2)), 0.2, 3))}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100"
                  title="Scale down"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 to-black">
              {/* Background */}
              {photoUrl ? (
                <img src={photoUrl} alt="User upload" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm">
                  Upload a full-body photo to start.
                </div>
              )}

              {/* Overlay product image */}
              {productImg && (
                <img
                  src={productImg}
                  alt="Product overlay"
                  className="absolute left-1/2 top-1/2 select-none pointer-events-none opacity-90 drop-shadow-[0_20px_40px_rgba(0,0,0,0.55)]"
                  style={{
                    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`
                  }}
                />
              )}

              {/* Fit label */}
              {fitScore != null && selectedSize && (
                <div className="absolute left-4 top-4 bg-black/40 border border-white/10 text-white text-xs px-3 py-2 rounded-xl">
                  Based on your profile, this <span className="font-semibold">{selectedSize}</span> is a{' '}
                  <span className="font-semibold">{fitScore}%</span> match for you.
                </div>
              )}
            </div>
          </div>

          {/* Right: controls + fit */}
          <div className="border-t lg:border-t-0 lg:border-l border-white/10 p-5 bg-black/30">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Move overlay</h3>
                <div className="grid grid-cols-3 gap-2 justify-items-center">
                  <span />
                  <button
                    type="button"
                    onClick={() => moveBy(0, -10)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100"
                    title="Move up"
                  >
                    <MoveUp className="h-5 w-5" />
                  </button>
                  <span />

                  <button
                    type="button"
                    onClick={() => moveBy(-10, 0)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100"
                    title="Move left"
                  >
                    <MoveLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScale(1);
                      setPos({ x: 0, y: 0 });
                    }}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100 text-xs font-medium"
                    title="Reset"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBy(10, 0)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100"
                    title="Move right"
                  >
                    <MoveRight className="h-5 w-5" />
                  </button>

                  <span />
                  <button
                    type="button"
                    onClick={() => moveBy(0, 10)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100"
                    title="Move down"
                  >
                    <MoveDown className="h-5 w-5" />
                  </button>
                  <span />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Fit recommendation</h3>
                {loadingMeas ? (
                  <div className="text-xs text-slate-300">Loading your measurements…</div>
                ) : measError ? (
                  <div className="text-xs text-rose-200 bg-rose-500/10 border border-rose-400/20 rounded-xl p-3">
                    {measError}
                  </div>
                ) : !measurements ? (
                  <div className="text-xs text-slate-300">
                    No measurements found in your profile.
                  </div>
                ) : missingSizeMeasurementsMessage ? (
                  <div className="text-xs text-slate-300">
                    {missingSizeMeasurementsMessage}
                  </div>
                ) : fitScore == null ? (
                  <div className="text-xs text-slate-300">
                    Missing chest/waist values in your profile or the product size chart.
                  </div>
                ) : (
                  <div className="text-xs text-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Your Chest / Waist</span>
                      <span className="text-slate-100 font-medium">
                        {measurements.chest} / {measurements.waist}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Product {normalizedSize} Chest / Waist</span>
                      <span className="text-slate-100 font-medium">
                        {sizeChartEntry.chest} / {sizeChartEntry.waist}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <span className="font-semibold">Fit Score: {fitScore}%</span>
                    </div>
                    <p className="text-slate-300">
                      Based on your profile, this <span className="font-semibold">{normalizedSize}</span> is a{' '}
                      <span className="font-semibold">{fitScore}%</span> match for you.
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Fit score formula: \(100 - (|product - user| / user \\times 100)\) averaged across chest & waist.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualTryOnModal;

