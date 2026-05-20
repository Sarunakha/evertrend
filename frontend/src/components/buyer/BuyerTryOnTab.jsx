import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Upload, ZoomIn, ZoomOut, MoveUp, MoveDown, MoveLeft, MoveRight, Sparkles } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { resolveAssetUrl } from '../../utils/env.js';

const MAX_MB = 5;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const OUTFIT_OPACITY_MIN = 0.85;
const OUTFIT_OPACITY_MAX = 0.9;
const OUTFIT_OPACITY_DEFAULT = 0.88;

const PREVIEW_BG = '#f3f4f6';

const BuyerTryOnTab = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const photoObjectUrlRef = useRef(null);
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [photoUrl, setPhotoUrl] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [clothOpacity, setClothOpacity] = useState(OUTFIT_OPACITY_DEFAULT);

  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const [fit, setFit] = useState({ loading: false, error: '', percentage: null });

  useEffect(() => {
    const load = async () => {
      setLoadingProducts(true);
      try {
        const res = await api.get('/products?limit=50');
        const list = res.data?.data || [];
        setProducts(list);
      } catch (e) {
        console.error('VTO products error:', e);
      } finally {
        setLoadingProducts(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!products.length) return;
    const id = searchParams.get('productId') || location.state?.productId;
    if (id && products.some((p) => p._id === id)) {
      setSelectedProductId(id);
      return;
    }
    setSelectedProductId((prev) =>
      prev && products.some((p) => p._id === prev) ? prev : products[0]._id || ''
    );
  }, [products, searchParams, location.state]);

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const productOverlay = resolveAssetUrl(
    selectedProduct?.vtoImage || selectedProduct?.images?.[0] || ''
  );

  const pickPhoto = (file) => {
    if (!file) return;
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_MB) {
      alert(`Max upload size is ${MAX_MB}MB.`);
      return;
    }
    if (photoObjectUrlRef.current) {
      URL.revokeObjectURL(photoObjectUrlRef.current);
      photoObjectUrlRef.current = null;
    }
    const url = URL.createObjectURL(file);
    photoObjectUrlRef.current = url;
    setPhotoUrl(url);
    // Outfit transform is only tied to product changes — do not reset scale/pos here.
  };

  useEffect(() => {
    return () => {
      if (photoObjectUrlRef.current) {
        URL.revokeObjectURL(photoObjectUrlRef.current);
      }
    };
  }, []);

  const moveBy = (dx, dy) => setPos((p) => ({ x: p.x + dx, y: p.y + dy }));

  useEffect(() => {
    if (!selectedProductId) return;
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, [selectedProductId]);

  const runAiFit = async () => {
    setFit((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      if (!selectedProduct?._id) {
        setFit((prev) => ({ ...prev, loading: false, error: 'Select a product first.' }));
        return;
      }
      const measurements = user?.sizeProfile;
      if (!measurements?.shoulder || !measurements?.chest || !measurements?.length) {
        setFit((prev) => ({
          ...prev,
          loading: false,
          error: 'Set your size profile first (shoulder, chest, length).'
        }));
        return;
      }
      const res = await api.post('/try-on', { productId: selectedProduct._id, measurements });
      const pct = res.data?.data?.fitPercentage;
      setFit((prev) => ({
        ...prev,
        loading: false,
        error: '',
        percentage: typeof pct === 'number' ? pct : null
      }));
    } catch (e) {
      setFit((prev) => ({
        ...prev,
        loading: false,
        error: e.response?.data?.message || 'Try-on failed. Please try again.'
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-amber-50">
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Virtual Try‑On</h2>
            <p className="text-sm text-gray-600">Upload a photo and preview the thrift item overlay.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition"
                style={{ backgroundColor: '#fab242' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d19c49')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fab242')}
              >
                <Upload className="h-4 w-4" />
                Upload photo (max 5MB)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />

              <button
                type="button"
                onClick={() => setScale((s) => clamp(Number((s + 0.1).toFixed(2)), 0.2, 3))}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                title="Scale up"
              >
                <ZoomIn className="h-5 w-5 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={() => setScale((s) => clamp(Number((s - 0.1).toFixed(2)), 0.2, 3))}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                title="Scale down"
              >
                <ZoomOut className="h-5 w-5 text-gray-700" />
              </button>

              {fit.percentage != null && (
                <span className="ml-auto px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Fit: {fit.percentage}%
                </span>
              )}
            </div>

            <div
              className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-gray-200 isolate"
              style={{ backgroundColor: PREVIEW_BG }}
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Your photo"
                  className="absolute inset-0 z-0 box-border w-full h-full object-contain object-center pointer-events-none select-none"
                  style={{ opacity: 1 }}
                  draggable={false}
                />
              ) : (
                <div
                  className="absolute inset-0 z-0 flex items-center justify-center text-gray-500 text-sm"
                  style={{ backgroundColor: PREVIEW_BG }}
                >
                  Upload a full-body photo to preview.
                </div>
              )}

              {productOverlay ? (
                <img
                  src={productOverlay}
                  alt="Garment overlay"
                  className="absolute left-1/2 top-1/2 z-[1] max-w-none pointer-events-none select-none"
                  style={{
                    opacity: clothOpacity,
                    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
                    transformOrigin: 'center center'
                  }}
                  draggable={false}
                />
              ) : (
                <div className="absolute right-4 bottom-4 z-[2] text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  This product has no overlay image.
                </div>
              )}
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Outfit opacity ({Math.round(clothOpacity * 100)}%)
              </label>
              <input
                type="range"
                min={OUTFIT_OPACITY_MIN}
                max={OUTFIT_OPACITY_MAX}
                step={0.01}
                value={clothOpacity}
                onChange={(e) => setClothOpacity(Number(e.target.value))}
                className="w-full max-w-xs accent-amber-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select item</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                disabled={loadingProducts}
              >
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Overlay uses `vtoImage` if available, otherwise the first product image.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Move overlay</h3>
              <div className="grid grid-cols-3 gap-2 justify-items-center">
                <span />
                <button
                  type="button"
                  onClick={() => moveBy(0, -10)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-white"
                  title="Up"
                >
                  <MoveUp className="h-5 w-5 text-gray-700" />
                </button>
                <span />
                <button
                  type="button"
                  onClick={() => moveBy(-10, 0)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-white"
                  title="Left"
                >
                  <MoveLeft className="h-5 w-5 text-gray-700" />
                </button>
                <span className="text-xs text-gray-500">10px</span>
                <button
                  type="button"
                  onClick={() => moveBy(10, 0)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-white"
                  title="Right"
                >
                  <MoveRight className="h-5 w-5 text-gray-700" />
                </button>
                <span />
                <button
                  type="button"
                  onClick={() => moveBy(0, 10)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-white"
                  title="Down"
                >
                  <MoveDown className="h-5 w-5 text-gray-700" />
                </button>
                <span />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">AI fit match</h3>
              <p className="text-xs text-gray-600 mb-3">
                Uses your size profile (shoulder/chest/length) vs product dimensions.
              </p>
              <button
                type="button"
                onClick={runAiFit}
                disabled={fit.loading}
                className="w-full px-4 py-2.5 rounded-lg text-white font-semibold transition disabled:opacity-60"
                style={{ backgroundColor: '#fab242' }}
              >
                {fit.loading ? 'Calculating…' : 'Calculate fit percentage'}
              </button>
              {fit.error && (
                <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {fit.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerTryOnTab;
