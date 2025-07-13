import React from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { ImportResult } from '../../utils/importUtils';

interface ImportFeedbackModalProps {
  isOpen: boolean;
  importResult: ImportResult | null;
  onAccept: () => void;
  onRevert: () => void;
  onClose: () => void;
}

export function ImportFeedbackModal({ 
  isOpen, 
  importResult, 
  onAccept, 
  onRevert, 
  onClose 
}: ImportFeedbackModalProps) {
  if (!isOpen || !importResult) return null;

  const { statistics, conflicts } = importResult;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <h2 className="text-xl font-semibold text-gray-900">Import Successful</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Imported Statistics */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-3 flex items-center">
                <Info className="w-5 h-5 mr-2" />
                Imported Content
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-700">Nodes:</span>
                  <span className="font-medium text-blue-900">{statistics.imported.nodes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Connections:</span>
                  <span className="font-medium text-blue-900">{statistics.imported.edges}</span>
                </div>
                <div className="mt-3">
                  <span className="text-blue-700">Topics:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {statistics.imported.topics.map(topic => (
                      <span 
                        key={topic} 
                        className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Statistics */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-green-900 mb-3 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Total Canvas
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-700">Nodes:</span>
                  <span className="font-medium text-green-900">{statistics.total.nodes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Connections:</span>
                  <span className="font-medium text-green-900">{statistics.total.edges}</span>
                </div>
                <div className="mt-3">
                  <span className="text-green-700">Topics:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {statistics.total.topics.map(topic => (
                      <span 
                        key={topic} 
                        className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conflicts Section */}
          {conflicts.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-yellow-900 mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Conflicts Resolved ({conflicts.length})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="bg-yellow-100 rounded p-3 text-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-yellow-900">
                          {conflict.type === 'node' ? 'Node' : 'Edge'} ID Conflict
                        </div>
                        <div className="text-yellow-700 mt-1">
                          {conflict.reason}
                        </div>
                        <div className="text-yellow-600 mt-1">
                          <span className="font-mono">{conflict.originalId}</span>
                          <span className="mx-2">→</span>
                          <span className="font-mono">{conflict.newId}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
            <p className="text-sm text-gray-600">
              Successfully imported {statistics.imported.nodes} nodes and {statistics.imported.edges} connections
              {conflicts.length > 0 && ` with ${conflicts.length} conflicts resolved`}.
              The imported content has been positioned to avoid overlap with existing nodes and is ready for use.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onRevert}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Revert Import
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Accept Import
          </button>
        </div>
      </div>
    </div>
  );
} 