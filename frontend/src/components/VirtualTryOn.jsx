import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FiX, FiCheckCircle, FiAlertCircle, FiMaximize2 } from 'react-icons/fi';

const VirtualTryOn = ({ product, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [error, setError] = useState(null);
  const [measurements, setMeasurements] = useState({
    shoulder: '',
    chest: '',
    length: ''
  });
  const [usingProfile, setUsingProfile] = useState(true);

  useEffect(() => {
    // Load user's size profile if available
    if (user && user.sizeProfile) {
      setMeasurements({
        shoulder: user.sizeProfile.shoulder || '',
        chest: user.sizeProfile.chest || '',
        length: user.sizeProfile.length || ''
      });
      setUsingProfile(true);
    } else {
      setUsingProfile(false);
    }
  }, [user]);

  const handleMeasurementChange = (field, value) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: value ? parseFloat(value) : ''
    }));
    setUsingProfile(false);
  };

  const handleGetRecommendation = async () => {
    if (!product || !product._id) {
      setError('Product information is missing');
      return;
    }

    // Validate measurements
    if (!measurements.shoulder || !measurements.chest || !measurements.length) {
      setError('Please enter all measurements (shoulder, chest, and length)');
      return;
    }

    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const response = await api.post(`/fit-recommendation/${product._id}`, {
        measurements: {
          shoulder: parseFloat(measurements.shoulder),
          chest: parseFloat(measurements.chest),
          length: parseFloat(measurements.length)
        }
      });

      if (response.data.success) {
        setRecommendation(response.data.data.recommendation);
      } else {
        setError(response.data.message || 'Failed to get fit recommendation');
      }
    } catch (error) {
      console.error('Fit recommendation error:', error);
      setError(error.response?.data?.message || 'Failed to get fit recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFitColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 45) return 'text-orange-600';
    return 'text-red-600';
  };

  const getFitBgColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-100';
    if (percentage >= 75) return 'bg-green-50';
    if (percentage >= 60) return 'bg-yellow-50';
    if (percentage >= 45) return 'bg-orange-50';
    return 'bg-red-50';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiMaximize2 className="text-primary-600" />
            Virtual Try-On
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition p-2 hover:bg-gray-100 rounded-full"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Product Info */}
          {product && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{product.name}</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Product Shoulder:</span>
                  <span className="ml-2 font-medium">
                    {product.dimensions?.shoulder ? `${product.dimensions.shoulder} cm` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Product Chest:</span>
                  <span className="ml-2 font-medium">
                    {product.dimensions?.chest ? `${product.dimensions.chest} cm` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Product Length:</span>
                  <span className="ml-2 font-medium">
                    {product.dimensions?.length ? `${product.dimensions.length} cm` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Measurements Form */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Measurements</h3>
            {usingProfile && user?.sizeProfile && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
                <FiCheckCircle className="text-blue-600" />
                <span className="text-sm text-blue-800">
                  Using measurements from your profile
                </span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shoulder Width (cm)
                </label>
                <input
                  type="number"
                  value={measurements.shoulder}
                  onChange={(e) => handleMeasurementChange('shoulder', e.target.value)}
                  step="0.1"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter shoulder width"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chest Width (cm)
                </label>
                <input
                  type="number"
                  value={measurements.chest}
                  onChange={(e) => handleMeasurementChange('chest', e.target.value)}
                  step="0.1"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter chest width"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Length (cm)
                </label>
                <input
                  type="number"
                  value={measurements.length}
                  onChange={(e) => handleMeasurementChange('length', e.target.value)}
                  step="0.1"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter length"
                />
              </div>
            </div>

            {!user?.sizeProfile && (
              <p className="text-sm text-gray-500 mt-2">
                💡 Tip: Save these measurements in your profile for faster recommendations next time!
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <FiAlertCircle className="text-red-600 flex-shrink-0" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {/* Get Recommendation Button */}
          <button
            onClick={handleGetRecommendation}
            disabled={loading || !measurements.shoulder || !measurements.chest || !measurements.length}
            className="w-full px-6 py-3 text-white rounded-md font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            style={{ backgroundColor: '#fab242' }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#d19c49')}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#fab242')}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Analyzing Fit...
              </span>
            ) : (
              'Get Fit Recommendation'
            )}
          </button>

          {/* Recommendation Results */}
          {recommendation && (
            <div className={`p-6 rounded-lg border-2 ${getFitBgColor(recommendation.fitPercentage)}`}>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4"
                  style={{ backgroundColor: '#fab242', opacity: 0.1 }}>
                  <span className={`text-4xl font-bold ${getFitColor(recommendation.fitPercentage)}`}>
                    {recommendation.fitPercentage}%
                  </span>
                </div>
                <h3 className={`text-2xl font-bold ${getFitColor(recommendation.fitPercentage)} mb-2`}>
                  {recommendation.message}
                </h3>
                <p className="text-gray-600">
                  Overall Fit Score: {recommendation.fitPercentage}%
                </p>
              </div>

              {/* Breakdown by Dimension */}
              {recommendation.breakdown && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Fit Breakdown by Dimension:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {recommendation.breakdown.shoulder !== undefined && (
                      <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="text-sm text-gray-600 mb-1">Shoulder</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {recommendation.breakdown.shoulder}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Fit Score
                        </div>
                      </div>
                    )}
                    {recommendation.breakdown.chest !== undefined && (
                      <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="text-sm text-gray-600 mb-1">Chest</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {recommendation.breakdown.chest}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Fit Score
                        </div>
                      </div>
                    )}
                    {recommendation.breakdown.length !== undefined && (
                      <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="text-sm text-gray-600 mb-1">Length</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {recommendation.breakdown.length}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Fit Score
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VirtualTryOn;

