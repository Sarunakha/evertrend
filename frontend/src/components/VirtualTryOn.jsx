import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import { FiX } from 'react-icons/fi';
import { Download, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import api from '../utils/api';
import { resolveAssetUrl } from '../utils/env.js';

const useHtmlImage = (src) => {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = src;
  }, [src]);

  return image;
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const VirtualTryOn = ({ product, onClose }) => {
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const clothingRef = useRef(null);

  const [userPhotoUrl, setUserPhotoUrl] = useState('');
  const [fitLoading, setFitLoading] = useState(false);
  const [fitError, setFitError] = useState('');
  const [fitData, setFitData] = useState(null);

  // Visual control: clothing overlay opacity (0..1)
  const [clothOpacity, setClothOpacity] = useState(0.88);

  const [selected, setSelected] = useState(true);

  const [clothingState, setClothingState] = useState({
    x: 140,
    y: 120,
    scaleX: 0.65,
    scaleY: 0.65,
    rotation: 0
  });

  const productVtoImage = resolveAssetUrl(product?.vtoImage || product?.images?.[0] || '');
  const productName = product?.name || 'Product';

  const bgImage = useHtmlImage(userPhotoUrl);
  const clothingImage = useHtmlImage(productVtoImage);

  const fitScore = fitData?.fitPercentage ?? null;
  const recommendedSize = fitData?.recommendedSize ?? null;
  const summaryLines = fitData?.summary || [];

  useEffect(() => {
    if (selected && transformerRef.current && clothingRef.current) {
      transformerRef.current.nodes([clothingRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selected, clothingImage]);

  const stageSize = useMemo(() => ({ width: 720, height: 520 }), []);

  const handleUpload = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUserPhotoUrl(url);
  };

  const handleReset = () => {
    setClothingState({
      x: 140,
      y: 120,
      scaleX: 0.65,
      scaleY: 0.65,
      rotation: 0
    });
    setClothOpacity(0.88);
  };

  const handleDownload = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const uri = stage.toDataURL({ pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = uri;
    a.download = `evertrend-vto-${productName.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleCalculateFit = async () => {
    setFitError('');
    setFitData(null);
    setFitLoading(true);
    try {
      const res = await api.post('/vto/calculate-fit', { productId: product?._id });
      if (res.data?.success) setFitData(res.data.data);
      else setFitError(res.data?.message || 'Failed to calculate fit.');
    } catch (e) {
      setFitError(e.response?.data?.message || 'Failed to calculate fit.');
    } finally {
      setFitLoading(false);
    }
  };

  const fitBadge =
    fitScore == null
      ? { text: 'Fit Score —', ring: 'ring-white/10', glow: 'shadow-none' }
      : fitScore >= 90
        ? { text: `${fitScore}% • Perfect`, ring: 'ring-emerald-400/40', glow: 'shadow-[0_0_30px_rgba(16,185,129,0.25)]' }
        : fitScore >= 75
          ? { text: `${fitScore}% • Great`, ring: 'ring-sky-400/40', glow: 'shadow-[0_0_30px_rgba(56,189,248,0.22)]' }
          : fitScore >= 60
            ? { text: `${fitScore}% • Good`, ring: 'ring-amber-400/40', glow: 'shadow-[0_0_30px_rgba(251,191,36,0.20)]' }
            : { text: `${fitScore}% • Tight/Loose`, ring: 'ring-rose-400/40', glow: 'shadow-[0_0_30px_rgba(244,63,94,0.18)]' };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 md:p-8">
      <div className="mx-auto max-w-6xl h-full rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-black shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-white font-semibold leading-tight">Virtual Fitting Room</h2>
              <p className="text-xs text-slate-300/80">Align the garment • Get a fit score • Download the result</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-slate-200 transition"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="h-[calc(100%-64px)] grid grid-cols-1 lg:grid-cols-[1fr_360px]">
          {/* Canvas Panel */}
          <div className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm text-slate-200 font-medium">{productName}</p>
                <p className="text-xs text-slate-400">
                  VTO Image: {productVtoImage ? 'Available' : 'Missing (ask seller/admin to add transparent PNG)'}
                </p>
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 ring-1 ${fitBadge.ring} ${fitBadge.glow}`}>
                <Wand2 className="w-4 h-4 text-slate-200" />
                <span className="text-xs text-slate-200">{fitBadge.text}</span>
                {recommendedSize && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-slate-200 border border-white/10">
                    Size {recommendedSize}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-white/10 bg-[radial-gradient(circle_at_top,rgba(250,178,66,0.12),transparent_50%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.10),transparent_55%)]">
              <div className="p-3 flex items-center gap-3 border-b border-white/10 bg-black/20">
                <label className="text-xs text-slate-200 cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10">
                  <span className="font-medium">Upload photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0])}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-200 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>

                <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-200 whitespace-nowrap">Cloth Opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={clothOpacity}
                    onChange={(e) => setClothOpacity(Number(e.target.value))}
                    className="w-28 accent-amber-300"
                    aria-label="Cloth opacity"
                  />
                  <span className="text-[11px] tabular-nums text-slate-300 w-10 text-right">
                    {Math.round(clothOpacity * 100)}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="ml-auto text-xs text-slate-200 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/15 transition border border-amber-300/20"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  Download
                </button>
              </div>

              <div className="p-3">
                {/* Mobile opacity slider */}
                <div className="md:hidden mb-3 flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs text-slate-200 whitespace-nowrap">Cloth Opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={clothOpacity}
                    onChange={(e) => setClothOpacity(Number(e.target.value))}
                    className="flex-1 accent-amber-300"
                    aria-label="Cloth opacity"
                  />
                  <span className="text-[11px] tabular-nums text-slate-300 w-10 text-right">
                    {Math.round(clothOpacity * 100)}%
                  </span>
                </div>

                <div className="w-full overflow-auto">
                  <div className="min-w-[720px]">
                    <Stage
                      ref={stageRef}
                      width={stageSize.width}
                      height={stageSize.height}
                      onMouseDown={(e) => {
                        const clickedEmpty = e.target === e.target.getStage();
                        if (clickedEmpty) setSelected(false);
                      }}
                      onTouchStart={(e) => {
                        const clickedEmpty = e.target === e.target.getStage();
                        if (clickedEmpty) setSelected(false);
                      }}
                      className="rounded-xl bg-black/30"
                    >
                      <Layer>
                        {/* Background photo */}
                        {bgImage ? (
                          <KonvaImage
                            image={bgImage}
                            x={0}
                            y={0}
                            width={stageSize.width}
                            height={stageSize.height}
                            opacity={1}
                          />
                        ) : (
                          // Simple placeholder
                          <KonvaImage image={null} />
                        )}

                        {/* Clothing overlay */}
                        {clothingImage && (
                          <KonvaImage
                            ref={clothingRef}
                            image={clothingImage}
                            x={clothingState.x}
                            y={clothingState.y}
                            scaleX={clothingState.scaleX}
                            scaleY={clothingState.scaleY}
                            rotation={clothingState.rotation}
                            opacity={clothOpacity}
                            draggable
                            onClick={() => setSelected(true)}
                            onTap={() => setSelected(true)}
                            onDragEnd={(e) => {
                              setClothingState((s) => ({ ...s, x: e.target.x(), y: e.target.y() }));
                            }}
                            onTransformEnd={(e) => {
                              const node = e.target;
                              const nextScaleX = clamp(node.scaleX(), 0.1, 4);
                              const nextScaleY = clamp(node.scaleY(), 0.1, 4);
                              setClothingState((s) => ({
                                ...s,
                                x: node.x(),
                                y: node.y(),
                                rotation: node.rotation(),
                                scaleX: nextScaleX,
                                scaleY: nextScaleY
                              }));
                            }}
                          />
                        )}

                        {selected && clothingImage && (
                          <Transformer
                            ref={transformerRef}
                            rotateEnabled
                            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                            boundBoxFunc={(oldBox, newBox) => {
                              if (newBox.width < 40 || newBox.height < 40) return oldBox;
                              return newBox;
                            }}
                          />
                        )}
                      </Layer>
                    </Stage>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Tip: Click the garment to show handles. Drag to move. Use corners to scale. Rotate via the handle.
                </p>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="border-t lg:border-t-0 lg:border-l border-white/10 p-5 md:p-6 bg-black/20">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Fit Recommendation</h3>
                <p className="text-xs text-slate-300 mb-3">
                  Based on your saved body measurements vs this product’s size chart.
                </p>
                <button
                  type="button"
                  onClick={handleCalculateFit}
                  disabled={fitLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-950 bg-amber-300 hover:bg-amber-200 transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {fitLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Calculate Fit
                    </>
                  )}
                </button>

                {fitError && (
                  <div className="mt-3 text-xs text-rose-200 bg-rose-500/10 border border-rose-400/20 rounded-xl p-3">
                    {fitError}
                  </div>
                )}

                {summaryLines.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {summaryLines.slice(0, 3).map((line, idx) => (
                      <div key={idx} className="text-xs text-slate-200 bg-white/5 border border-white/10 rounded-xl p-3">
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Requirements</h3>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li>- Product must have `vtoImage` (transparent PNG URL) for overlay.</li>
                  <li>- Product must have `sizeChart` (S/M/L/XL) for fit score.</li>
                  <li>- Your profile must have `bodyMeasurements` (height, chest, waist, hips, shoulderWidth).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualTryOn;
