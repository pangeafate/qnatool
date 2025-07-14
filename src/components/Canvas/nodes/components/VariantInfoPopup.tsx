import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface VariantInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (variantText: string, info: string) => void;
  currentInfo: string;
  variantText: string;
}

export const VariantInfoPopup: React.FC<VariantInfoPopupProps> = ({
  isOpen,
  onClose,
  onSave,
  currentInfo,
  variantText
}) => {
  const [info, setInfo] = useState(currentInfo);
  const [editableVariantText, setEditableVariantText] = useState(variantText);

  useEffect(() => {
    setInfo(currentInfo);
    setEditableVariantText(variantText);
  }, [currentInfo, variantText, isOpen]);

  const handleSave = () => {
    onSave(editableVariantText, info);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Variant Text Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Answer Variant:
            </label>
            <textarea
              value={editableVariantText}
              onChange={(e) => setEditableVariantText(e.target.value)}
              className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Enter answer variant text..."
              style={{ 
                wordWrap: 'break-word',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word'
              }}
            />
          </div>

          {/* Additional Info Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Additional Information:
            </label>
            <textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Enter additional information that will be stored with this answer variant..."
              autoFocus
            />
          </div>

          {/* Helper Text */}
          <p className="text-xs text-gray-500">
            This information will be saved with the answer variant but won't be displayed as part of the answer text.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}; 