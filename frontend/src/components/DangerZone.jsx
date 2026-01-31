import { FiAlertTriangle, FiX } from 'react-icons/fi';

const DangerZone = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'This action cannot be undone. Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger' // 'danger', 'warning'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className={`p-6 rounded-t-xl ${
          type === 'danger' ? 'bg-red-50' : 'bg-yellow-50'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                <FiAlertTriangle className={`h-6 w-6 ${
                  type === 'danger' ? 'text-red-600' : 'text-yellow-600'
                }`} />
              </div>
              <h3 className={`text-xl font-bold ${
                type === 'danger' ? 'text-red-900' : 'text-yellow-900'
              }`}>
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className={`text-gray-400 hover:${
                type === 'danger' ? 'text-red-600' : 'text-yellow-600'
              } transition`}
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-6">{message}</p>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                type === 'danger'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DangerZone;

