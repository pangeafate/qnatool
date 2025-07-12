import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useFlowStore } from '../../../stores/flowStore';

interface QuestionNodeData {
  pathId: string;
  pathIds?: string[]; // New: support multiple path IDs
  topic: string;
  isRoot: boolean;
  questionText: string;
  questionLevel: number;
  elementId: string;
  subElementId: string;
  metadata?: Record<string, any>;
  isOrphaned?: boolean;
  isParent?: boolean;
  isChild?: boolean;
  isSelected?: boolean;
}

export default function QuestionNode({ id, data, selected }: NodeProps<QuestionNodeData>) {
  const { setSelectedNodeId, updateNode, recalculateFlowIds, propagateTopicOnConnection, propagatePathIdOnConnection, focusOnNode, edges } = useFlowStore();

  const handleClick = () => {
    setSelectedNodeId(id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Only handle double-clicks on non-interactive areas
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('input') || target.closest('textarea')) {
      return;
    }

    // Find the next connected node
    const outgoingEdge = edges.find(edge => edge.source === id);
    if (outgoingEdge) {
      focusOnNode(outgoingEdge.target);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNode(id, { questionText: e.target.value });
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTopic = e.target.value;
    updateNode(id, { topic: newTopic });
    
    // If this is a root node, recalculate all path IDs
    if (data.isRoot) {
      recalculateFlowIds(id, newTopic);
    }
  };

  // Only stop propagation, don't prevent default!
  const stopPropagation = (e: React.MouseEvent | React.FocusEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const createLinkedAnswerNode = () => {
    const { nodes, addNode, addEdge, edges } = useFlowStore.getState();
    
    // Check if this question already has an outgoing connection (enforce connection restrictions)
    const existingConnection = edges.find(edge => edge.source === id);
    
    if (existingConnection) {
      console.log('This question already has a connection. Only one outgoing connection is allowed.');
      return;
    }
    
    // Find the current node to get its position and topic
    const currentNode = nodes.find(n => n.id === id);
    if (!currentNode) return;
    
    // Create a new answer node positioned to the right and below the current question
    const newAnswerId = `answer-${Date.now()}`;
    const newAnswerNode = {
      id: newAnswerId,
      type: 'answer',
      position: {
        x: currentNode.position.x + 150, // Offset to the right
        y: currentNode.position.y + 150, // And slightly below
      },
      data: {
        pathId: 'path-id-will-be-generated', // Will be set by path ID propagation
        pathIds: [], // Initialize empty pathIds array
        answerType: 'single',
        topic: data.topic, // Pass the topic to answer node
        variants: [
          {
            id: `var-${Date.now()}`,
            text: 'Answer option',
            score: 0,
          }
        ],
      },
    };
    
    // Add the node
    addNode(newAnswerNode);
    
    // Create edge from question to answer
    const edge = {
      id: `edge-${id}-${newAnswerId}`,
      source: id,
      target: newAnswerId,
      sourceHandle: null, // From bottom of question
      targetHandle: null, // To top of answer
      animated: true,
      type: 'smoothstep',
      style: { 
        stroke: '#9ca3af', // Light grey by default
        strokeWidth: 2 
      }
    };
    
    addEdge(edge);
    
    // Propagate topic from question to answer
    propagateTopicOnConnection(id, newAnswerId);
    
    // Propagate path ID from question to answer
    propagatePathIdOnConnection(id, newAnswerId);
  };

  return (
    <div
      className={`
        bg-white rounded-lg shadow-lg border-2 p-4 min-w-[280px] max-w-[350px]
        ${selected ? 'border-blue-500 shadow-xl ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}
        ${data.isOrphaned ? 'ring-2 ring-orange-400 border-orange-300' : ''}
        ${data.isParent || data.isChild || data.isSelected ? 'ring-2 ring-green-400 border-green-300' : ''}
        transition-all duration-200 hover:shadow-xl cursor-pointer
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
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
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-xs font-semibold text-blue-600">
              {data.isRoot ? 'Root Question' : 'Question'}
            </span>
          </div>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            Level {data.questionLevel}
          </span>
        </div>

        {/* Path ID(s) - show primary or multiple paths */}
        <div className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded">
          {data.pathIds && data.pathIds.length > 1 ? (
            <div className="space-y-1">
              <div className="font-semibold text-gray-600">Paths ({data.pathIds.length}):</div>
              {data.pathIds.map((pathId, index) => (
                <div key={index} className="text-xs">
                  {pathId}
                </div>
              ))}
            </div>
          ) : (
            data.pathId
          )}
        </div>

        {/* Topic field - show for all root questions */}
        {data.isRoot && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Topic</label>
            <div onClick={stopPropagation} onMouseDown={stopPropagation}>
              <input
                type="text"
                value={data.topic || ''}
                onChange={handleTopicChange}
                className="w-full p-2 border border-gray-200 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter topic..."
                onFocus={stopPropagation}
                onKeyDown={stopPropagation}
              />
            </div>
          </div>
        )}

        {/* Question Text */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Question</label>
          <div onClick={stopPropagation} onMouseDown={stopPropagation}>
            <textarea
              value={data.questionText}
              onChange={handleTextChange}
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors"
              rows={3}
              placeholder="Enter your question here..."
              onFocus={stopPropagation}
              onKeyDown={stopPropagation}
            />
          </div>
        </div>

        {/* Element Info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="bg-gray-100 px-2 py-1 rounded">
            {data.elementId}
          </span>
          <span className="text-gray-400">|</span>
          <span className="bg-gray-100 px-2 py-1 rounded">
            {data.subElementId}
          </span>
        </div>
      </div>

      {/* Output Handle (bottom) - Green exit dot with click handler */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500 border-2 border-white cursor-pointer hover:bg-green-600 transition-colors"
        style={{ background: '#22c55e' }}
        onClick={(e) => {
          e.stopPropagation();
          createLinkedAnswerNode();
        }}
      />
    </div>
  );
}