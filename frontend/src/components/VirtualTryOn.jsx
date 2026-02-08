import { useState } from 'react';
import { FiX } from 'react-icons/fi';

const VirtualTryOn = ({ product, onClose }) => {
  const [loading, setLoading] = useState(false);
  const dimensions = product?.dimensions || {};
  const imageUrl = product?.images?.[0] || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Virtual Try-On</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {imageUrl && (
            <div className="aspect-square max-h-80 mx-auto bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt={product?.name || 'Product'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23e5e7eb" width="400" height="400"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo image%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
          )}

          <div>
            <h3 className="font-medium text-gray-900">{product?.name}</h3>
            {(dimensions.shoulder != null || dimensions.chest != null || dimensions.length != null) && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Product dimensions (cm)</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {dimensions.shoulder != null && <li>Shoulder: {dimensions.shoulder} cm</li>}
                  {dimensions.chest != null && <li>Chest: {dimensions.chest} cm</li>}
                  {dimensions.length != null && <li>Length: {dimensions.length} cm</li>}
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  Compare these with your measurements to check fit.
                </p>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-amber-500" />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-white rounded-md font-medium transition"
            style={{ backgroundColor: '#fab242' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VirtualTryOn;
