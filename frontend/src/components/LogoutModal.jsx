import { FiX } from 'react-icons/fi';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">Confirm Logout</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Are you sure you want to log out?
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition"
            >
              Confirm Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;

