import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../utils/api';
import { FiPlus, FiEdit, FiTrash2, FiX, FiImage } from 'react-icons/fi';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imageUrls, setImageUrls] = useState(['']); // Array of image URLs
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Tops',
    size: 'M',
    condition: 'Good',
    stockQuantity: 1,
    dimensions: { shoulder: '', chest: '', length: '' }
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/sellers/products?limit=50');
      
      if (response && response.data && response.data.data) {
        setProducts(response.data.data || []);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      let errorMessage = 'Failed to load products. ';
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage += 'The request took too long. Please check your connection and try again.';
      } else if (error.response) {
        errorMessage += error.response.data?.message || error.response.statusText || 'Server error';
      } else if (error.request) {
        errorMessage += 'No response from server. Please check if the backend is running.';
      } else if (error.isConnectionError) {
        errorMessage = error.message;
      } else {
        errorMessage += error.message || 'Unknown error';
      }
      
      setError(errorMessage);
      setProducts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    if (e.target.name.startsWith('dimensions.')) {
      const field = e.target.name.split('.')[1];
      setFormData({
        ...formData,
        dimensions: {
          ...formData.dimensions,
          [field]: parseFloat(e.target.value) || ''
        }
      });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleImageUrlChange = (index, value) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
  };

  const addImageUrlField = () => {
    if (imageUrls.length < 5) {
      setImageUrls([...imageUrls, '']);
    } else {
      alert('Maximum 5 images allowed');
    }
  };

  const removeImageUrl = (index) => {
    if (imageUrls.length > 1) {
      const newUrls = imageUrls.filter((_, i) => i !== index);
      setImageUrls(newUrls);
    }
  };

  const validateImageUrl = (url) => {
    if (!url.trim()) return true; // Empty URL is allowed (will be filtered out)
    try {
      new URL(url);
      // Accept Pinterest URLs, direct image URLs, or any HTTP/HTTPS URL
      return url.includes('pinterest.com/pin/') || 
             url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) || 
             url.startsWith('http');
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (submitting) return; // Prevent double submission
    
    // Validate required fields
    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Product description is required');
      return;
    }
    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      setError('Valid price is required');
      return;
    }

    setSubmitting(true);

    try {
      // Filter out empty URLs and validate
      const validImageUrls = imageUrls
        .map(url => url.trim())
        .filter(url => url !== '');

      if (validImageUrls.length === 0) {
        setSubmitting(false);
        setError('Please add at least one image URL');
        return;
      }

      // Validate all URLs
      for (let i = 0; i < validImageUrls.length; i++) {
        if (!validateImageUrl(validImageUrls[i])) {
          setSubmitting(false);
          setError(`Invalid image URL ${i + 1}: "${validImageUrls[i]}". Please enter a valid HTTP/HTTPS image URL.`);
          return;
        }
      }

      // Clean up the data before submitting
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price), // Ensure price is a number
        category: formData.category,
        size: formData.size,
        condition: formData.condition,
        stockQuantity: parseInt(formData.stockQuantity) || 1,
        images: validImageUrls,
        dimensions: {
          shoulder: formData.dimensions.shoulder ? parseFloat(formData.dimensions.shoulder) : undefined,
          chest: formData.dimensions.chest ? parseFloat(formData.dimensions.chest) : undefined,
          length: formData.dimensions.length ? parseFloat(formData.dimensions.length) : undefined
        }
      };

      // Remove undefined dimension values
      Object.keys(submitData.dimensions).forEach(key => {
        if (submitData.dimensions[key] === undefined || submitData.dimensions[key] === '' || isNaN(submitData.dimensions[key])) {
          delete submitData.dimensions[key];
        }
      });

      // If no dimensions, set to empty object
      if (Object.keys(submitData.dimensions).length === 0) {
        submitData.dimensions = {};
      }

      console.log('Submitting product data:', { ...submitData, images: submitData.images.length + ' images' });
      
      if (editingProduct) {
        const response = await api.put(`/products/${editingProduct._id}`, submitData);
        console.log('Product updated successfully:', response.data);
      } else {
        const response = await api.post('/products', submitData);
        console.log('Product created successfully:', response.data);
      }
      
      // Refresh products and reset form
      await fetchProducts();
      resetForm();
      setShowForm(false);
      setError('');
    } catch (error) {
      console.error('Error saving product:', error);
      console.error('Error response:', error.response);
      
      let errorMessage = 'Something went wrong! Please try again.';
      
      if (error.response) {
        // Server responded with error
        if (error.response.data) {
          if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.errors && Array.isArray(error.response.data.errors) && error.response.data.errors.length > 0) {
            errorMessage = error.response.data.errors[0].msg || error.response.data.errors[0].message || errorMessage;
          } else if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      size: product.size,
      condition: product.condition,
      stockQuantity: product.stockQuantity,
      dimensions: product.dimensions || { shoulder: '', chest: '', length: '' }
    });
    // Set image URLs from product
    const productImages = product.images || [];
    setImageUrls(productImages.length > 0 ? productImages : ['']);
    setError('');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (error) {
      alert('Error deleting product');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'Tops',
      size: 'M',
      condition: 'Good',
      stockQuantity: 1,
      dimensions: { shoulder: '', chest: '', length: '' }
    });
    setImageUrls(['']);
    setEditingProduct(null);
    setShowForm(false);
    setError('');
  };

  // Image Preview Component for form
  const ImagePreview = ({ url, index }) => {
    const [imageUrl, setImageUrl] = useState(url);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const isPinterestUrl = url && url.includes('pinterest.com/pin/');
    
    useEffect(() => {
      // Reset states when URL changes
      setError(false);
      setImageUrl(url);
      
      // Use URL directly (no proxy); for Pinterest pin URLs the image may not load until a direct image URL is used
      setLoading(false);
    }, [url]);
    
    if (error) {
      return (
        <div className="mt-2 w-24 h-24 bg-gray-200 rounded-md border border-gray-300 flex items-center justify-center">
          <p className="text-xs text-gray-500 text-center px-1">Failed to load</p>
        </div>
      );
    }
    
    return (
      <div className="mt-2">
        {loading ? (
          <div className="w-24 h-24 bg-gray-200 rounded-md border border-gray-300 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#fab242' }}></div>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={`Preview ${index + 1}`}
            className="w-24 h-24 object-cover rounded-md border border-gray-300"
            onError={(e) => {
              if (isPinterestUrl) {
                setError(true);
              }
              e.target.style.display = 'none';
            }}
          />
        )}
      </div>
    );
  };

  // Product Card Component
  const ProductCard = ({ product, onEdit, onDelete }) => {
    // Get the first valid image URL
    const imageUrl = product.images && Array.isArray(product.images) && product.images.length > 0 
      ? product.images.find(img => img && img.trim() !== '') || product.images[0]
      : null;

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition relative">
        <div className="relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.description ? `${product.name} - ${product.description}` : product.name || 'Product'}
              className="w-full h-80 object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="320"%3E%3Crect fill="%23e5e7eb" width="400" height="320"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage failed to load%3C/text%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="w-full h-80 bg-gray-200 flex items-center justify-center">
              <FiImage className="h-12 w-12 text-gray-400" />
            </div>
          )}
          {/* Availability Badge - Top Right Corner */}
          {product.stockQuantity === 0 && (
            <span className="absolute top-2 right-2 px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">
              Out of Stock
            </span>
          )}
          {product.stockQuantity > 0 && product.stockQuantity < 5 && (
            <span className="absolute top-2 right-2 px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded-full">
              Only {product.stockQuantity} left
            </span>
          )}
          {product.isSold && (
            <span className="absolute top-2 left-2 px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded-full">
              Sold
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
          <p className="text-gray-600 text-sm mb-2">{product.category} • {product.size}</p>
          <p className="font-bold text-xl mb-3" style={{ color: '#fab242' }}>Rs.{product.price}</p>
          <div className="flex items-center justify-between">
            <span className={`px-2 py-1 rounded text-xs ${
              product.isSold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {product.isSold ? 'Sold' : 'Active'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(product)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded transition"
                style={{ color: '#fab242' }}
              >
                <FiEdit className="h-5 w-5" />
              </button>
              <button
                onClick={() => onDelete(product._id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition"
              >
                <FiTrash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: '#fab242' }}></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Products</h2>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="text-white px-4 py-2 rounded-md flex items-center space-x-2 transition"
          style={{ backgroundColor: '#fab242' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
        >
          <FiPlus />
          <span>{showForm ? 'Cancel' : 'Add Product'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-400 text-red-700 rounded-md">
          <p className="font-semibold">Error loading products</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchProducts}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="Tops">Tops</option>
                <option value="Bottoms">Bottoms</option>
                <option value="Dresses">Dresses</option>
                <option value="Outerwear">Outerwear</option>
                <option value="Accessories">Accessories</option>
                <option value="Shoes">Shoes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
              <select
                name="size"
                value={formData.size}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
                <option value="One Size">One Size</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>

          {/* Image URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Image URLs (Max 5 images)
            </label>
            <div className="space-y-3">
              {imageUrls.map((url, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleImageUrlChange(index, e.target.value)}
                      placeholder={`Image URL ${index + 1} (e.g., https://example.com/image.jpg)`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    {url && validateImageUrl(url) && (
                      <ImagePreview url={url} index={index} />
                    )}
                    {url && !validateImageUrl(url) && (
                      <p className="text-sm text-red-500 mt-1">Invalid image URL</p>
                    )}
                  </div>
                  {imageUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImageUrl(index)}
                      className="mt-2 p-2 text-red-600 hover:text-red-700"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              {imageUrls.length < 5 && (
                <button
                  type="button"
                  onClick={addImageUrlField}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <FiPlus className="h-4 w-4" />
                  <span>Add Another Image URL</span>
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Enter image URLs from the internet (e.g., from Imgur, Cloudinary, Pinterest, or any image hosting service).
              <span className="text-green-600 font-semibold"> Pinterest pin URLs are now supported!</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
              <input
                type="number"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shoulder (cm)</label>
              <input
                type="number"
                name="dimensions.shoulder"
                value={formData.dimensions.shoulder}
                onChange={handleChange}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chest (cm)</label>
              <input
                type="number"
                name="dimensions.chest"
                value={formData.dimensions.chest}
                onChange={handleChange}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Length (cm)</label>
              <input
                type="number"
                name="dimensions.length"
                value={formData.dimensions.length}
                onChange={handleChange}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="text-white px-6 py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#fab242' }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#d19c49')}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#fab242')}
          >
            {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard 
            key={product._id} 
            product={product} 
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default Products;

