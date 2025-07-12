import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useFlowStore } from '../../../stores/flowStore';

interface OutcomeNodeData {
  pathId: string;
  pathIds?: string[]; // New: support multiple path IDs
  recommendation: string;
  topic?: string;
  isOrphaned?: boolean;
  isParent?: boolean;
  isChild?: boolean;
  isSelected?: boolean;
}

export default function OutcomeNode({ id, data, selected }: NodeProps<OutcomeNodeData>) {
  const { setSelectedNodeId, updateNode, pathDisplaysFolded } = useFlowStore();
  const [localPathFolded, setLocalPathFolded] = useState<boolean | null>(null);

  // Use local state if set, otherwise use global state
  const isPathFolded = localPathFolded !== null ? localPathFolded : pathDisplaysFolded;

  const handleClick = () => {
    setSelectedNodeId(id);
  };

  const handleRecommendationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNode(id, { recommendation: e.target.value });
  };

  // Only stop propagation, don't prevent default!
  const stopPropagation = (e: React.MouseEvent | React.FocusEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`
        bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg border-2 p-4 min-w-[280px] max-w-[350px]
        ${selected ? 'border-green-500 shadow-xl ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300'}
        ${data.isOrphaned ? 'ring-2 ring-orange-400 border-orange-300' : ''}
        ${data.isParent || data.isChild || data.isSelected ? 'ring-2 ring-green-400 border-green-300' : ''}
        transition-all duration-200 hover:shadow-xl cursor-pointer
      `}
      onClick={handleClick}
    >
      {/* Input Handle (top) - Gray entry dot */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
        style={{ background: '#9ca3af' }}
      />
      
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs font-semibold text-green-600">Outcome</span>
          </div>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            Final
          </span>
        </div>

        {/* Path ID(s) - foldable display */}
        <div className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded">
          {data.pathIds && data.pathIds.length > 1 ? (
            <div className="space-y-1">
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalPathFolded(!isPathFolded);
                }}
              >
                <div className="font-semibold text-gray-600">Paths ({data.pathIds.length}):</div>
                {isPathFolded ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </div>
              {!isPathFolded && (
                <div className="space-y-1">
                  {data.pathIds.map((pathId, index) => (
                    <div key={index} className="text-xs pl-2">
                      {pathId}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
              onClick={(e) => {
                e.stopPropagation();
                setLocalPathFolded(!isPathFolded);
              }}
            >
              <div className="truncate">
                {isPathFolded ? 'Path: ...' : data.pathId}
              </div>
              {isPathFolded ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </div>
          )}
        </div>

        {/* Recommendation Text */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Recommendation</label>
          <div onClick={stopPropagation} onMouseDown={stopPropagation}>
            <textarea
              value={data.recommendation || ''}
              onChange={handleRecommendationChange}
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors"
              rows={4}
              placeholder="Enter recommendation text..."
              onFocus={stopPropagation}
              onKeyDown={stopPropagation}
            />
          </div>
        </div>

        {/* Final indicator */}
        <div className="text-xs rounded px-2 py-1 text-center font-medium bg-green-50 text-green-600 border border-green-200">
          🎯 Final Outcome
        </div>
      </div>
    </div>
  );
} 