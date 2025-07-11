import { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Plus, X } from 'lucide-react';
import { useFlowStore } from '../../../stores/flowStore';
import { AnswerVariant } from '../../../types/flow.types';

interface AnswerNodeData {
  answerType: 'single' | 'multiple';
  variants: AnswerVariant[];
  defaultNextPath?: string;
  topic?: string; // Add topic to the interface
  isOrphaned?: boolean;
  pathId?: string;
  answerLevel?: number;
  isParent?: boolean;
  isChild?: boolean;
  isSelected?: boolean;
  orphanedVariants?: string[];
}

export default function AnswerNode({ id, data, selected }: NodeProps<AnswerNodeData>) {
  const { setSelectedNodeId, updateNode, nodes, addNode, addEdge, propagateTopicOnConnection } = useFlowStore();
  const [answerType, setAnswerType] = useState(data.answerType || 'single');

  // Sync answerType with data changes
  useEffect(() => {
    setAnswerType(data.answerType || 'single');
  }, [data.answerType]);

  const handleClick = () => {
    setSelectedNodeId(id);
  };

  const createLinkedQuestionNode = (sourceHandle?: string) => {
    // Check if this handle already has a connection (enforce connection restrictions)
    const { edges } = useFlowStore.getState();
    const existingConnection = edges.find(edge => 
      edge.source === id && 
      edge.sourceHandle === (sourceHandle || 'default')
    );
    
    if (existingConnection) {
      console.log('This answer variant already has a connection. Only one connection per variant is allowed.');
      return;
    }
    
    // Find the current node to get its position
    const currentNode = nodes.find(n => n.id === id);
    if (!currentNode) return;
    
    // Get topic from current answer node's data, or find it from parent chain
    let topic = data.topic;
    
    // If topic is not in answer data, traverse up to find it
    if (!topic) {
      const findRootTopic = (nodeId: string): string => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return 'Topic';
        
        // If this node has a topic, return it
        if (node.data?.topic) return node.data.topic;
        
        // Otherwise, find parent and recurse
        const parentEdge = useFlowStore.getState().edges.find(e => e.target === nodeId);
        if (parentEdge) {
          return findRootTopic(parentEdge.source);
        }
        
        return 'Topic';
      };
      
      topic = findRootTopic(id);
    }
    
    // Create a new question node positioned based on the source handle
    const newQuestionId = `question-${Date.now()}`;
    const newQuestionNode = {
      id: newQuestionId,
      type: 'question',
      position: {
        x: sourceHandle === 'default' 
          ? currentNode.position.x  // Same X for default (bottom) handle
          : currentNode.position.x + 200, // To the right for variant handles
        y: currentNode.position.y + 200, // Below current node
      },
      data: {
        pathId: 'path-id-will-be-generated',
        topic: topic,
        isRoot: false,
        questionText: '',
        questionLevel: 2, // This should be calculated based on the flow
        elementId: 'E01',
        subElementId: 'SE01',
      },
    };
    
    // Add the node
    addNode(newQuestionNode);
    
    // Create edge from answer to question
    const edge = {
      id: `edge-${id}-${newQuestionId}`,
      source: id,
      target: newQuestionId,
      sourceHandle: sourceHandle || 'default', // Use specific handle or default
      targetHandle: null, // To top of question
      animated: true,
      type: 'smoothstep',
      style: { 
                  stroke: '#9ca3af', // Light grey by default
        strokeWidth: 2 
      }
    };
    
    addEdge(edge);
    
    // Propagate topic from answer to question
    propagateTopicOnConnection(id, newQuestionId);
  };



  const addVariant = () => {
    const newVariant: AnswerVariant = {
      id: `var-${Date.now()}`,
      text: 'New Answer',
      score: 0,
    };
    const currentVariants = data.variants || [];
    updateNode(id, {
      variants: [...currentVariants, newVariant]
    });
  };

  const updateVariant = (variantId: string, updates: Partial<AnswerVariant>) => {
    const currentVariants = data.variants || [];
    const updatedVariants = currentVariants.map(v => 
      v.id === variantId ? { ...v, ...updates } : v
    );
    updateNode(id, { variants: updatedVariants });
  };

  const removeVariant = (variantId: string) => {
    const currentVariants = data.variants || [];
    if (currentVariants.length > 1) {
      const updatedVariants = currentVariants.filter(v => v.id !== variantId);
      updateNode(id, { variants: updatedVariants });
    }
  };

  const handleAnswerTypeChange = (newType: 'single' | 'multiple') => {
    setAnswerType(newType);
    updateNode(id, { answerType: newType });
    
    // Clean up existing edges when switching modes
    const { edges, deleteEdge } = useFlowStore.getState();
    
    if (newType === 'single') {
      // Remove all variant-based edges when switching to single
      const variantEdges = edges.filter(edge => 
        edge.source === id && 
        edge.sourceHandle && 
        edge.sourceHandle.startsWith('variant-')
      );
      
      console.log(`Switching to single mode: removing ${variantEdges.length} variant edges`);
      variantEdges.forEach(edge => deleteEdge(edge.id));
    } else {
      // Remove default edge when switching to multiple
      const defaultEdges = edges.filter(edge => 
        edge.source === id && 
        edge.sourceHandle === 'default'
      );
      
      console.log(`Switching to multiple mode: removing ${defaultEdges.length} default edges`);
      defaultEdges.forEach(edge => deleteEdge(edge.id));
    }
  };

  // Only stop propagation, don't prevent default!
  const stopPropagation = (e: React.MouseEvent | React.FocusEvent | React.KeyboardEvent | React.WheelEvent) => {
    e.stopPropagation();
  };

  const currentVariants = data.variants || [];

  return (
    <div
      className={`
        bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-lg border-2 p-4 w-[350px]
        ${selected ? 'border-purple-500 shadow-xl ring-2 ring-purple-200' : 'border-gray-200 hover:border-gray-300'}
        ${data.isOrphaned ? 'ring-2 ring-orange-400 border-orange-300' : ''}
        ${data.isParent || data.isChild || data.isSelected ? 'ring-2 ring-green-400 border-green-300' : ''}
        transition-all duration-200 hover:shadow-xl cursor-pointer relative
      `}
      onClick={handleClick}
    >
      {/* Input Handle (top) */}
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
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-xs font-semibold text-purple-600">Answer</span>
          </div>
          
          {/* Level display */}
          {data.answerLevel && (
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              Level {data.answerLevel}
            </span>
          )}
          
          {/* Answer Type Toggle */}
          <div className="flex items-center space-x-2 text-xs" onClick={stopPropagation} onMouseDown={stopPropagation}>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="single"
                checked={answerType === 'single'}
                onChange={(e) => handleAnswerTypeChange(e.target.value as 'single' | 'multiple')}
                className="mr-1"
              />
              Single
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="multiple"
                checked={answerType === 'multiple'}
                onChange={(e) => handleAnswerTypeChange(e.target.value as 'single' | 'multiple')}
                className="mr-1"
              />
              Multiple
            </label>
          </div>
        </div>
        
        {/* Path ID (read-only, small font) */}
        {data.pathId && (
          <div className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded">
            {data.pathId}
          </div>
        )}
        
        {/* Connection mode indicator */}
        <div className={`text-xs rounded px-2 py-1 text-center font-medium ${
          answerType === 'single' 
            ? 'bg-blue-50 text-blue-600' 
            : 'bg-green-50 text-green-600'
        }`}>
          {answerType === 'single' 
            ? '↓ Single path (bottom)' 
            : '→ Multiple paths (variants)'}
        </div>
        
        {/* Answer Variants */}
        <div className="space-y-2">
          {currentVariants.map((variant, index) => {
            const variantHandle = `variant-${index}`;
            const isOrphanedVariant = data.orphanedVariants?.includes(variantHandle);
            
            return (
              <div key={variant.id} className="relative">
                <div 
                  className={`flex items-center space-x-2 bg-white rounded-lg p-3 shadow-sm border ${
                    answerType === 'multiple' ? 'border-green-200 hover:border-green-300' : 'border-gray-100'
                  } ${isOrphanedVariant ? 'ring-1 ring-orange-400 border-orange-300' : ''} transition-colors`}
                  onClick={stopPropagation}
                  onMouseDown={stopPropagation}
                >
                  <input
                    type="text"
                    value={variant.text}
                    onChange={(e) => updateVariant(variant.id, { text: e.target.value })}
                    className="flex-1 text-sm bg-transparent focus:outline-none"
                    placeholder="Answer text..."
                    onFocus={stopPropagation}
                    onKeyDown={stopPropagation}
                  />
                  <input
                    type="number"
                    value={variant.score}
                    onChange={(e) => updateVariant(variant.id, { score: Number(e.target.value) })}
                    className="w-12 text-xs text-center bg-gray-50 rounded px-1 py-1 focus:outline-none focus:bg-white border border-gray-200 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder="0"
                    title="Score"
                    min="-999"
                    max="999"
                    onFocus={stopPropagation}
                    onKeyDown={stopPropagation}
                    onWheel={(e) => {
                      e.currentTarget.blur(); // Prevent scroll wheel from changing value
                      e.stopPropagation();
                    }}
                    onClick={stopPropagation}
                    onMouseDown={stopPropagation}
                  />
                  {currentVariants.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeVariant(variant.id);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                
                {/* Individual variant handle - properly aligned */}
                {/* Only show variant handles when answerType is 'multiple' */}
                {answerType === 'multiple' && (
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`variant-${index}`}
                    style={{ 
                      top: '50%',
                      right: '-5px',
                      transform: 'translateY(-50%)',
                      background: isOrphanedVariant ? '#fb923c' : '#22c55e', // Orange for orphaned, green for connected
                      width: '10px',
                      height: '10px',
                      zIndex: 10,
                      cursor: 'pointer'
                    }}
                    className="border-2 border-white hover:scale-125 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      createLinkedQuestionNode(`variant-${index}`);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Add Answer Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            addVariant();
          }}
          className="w-full flex items-center justify-center space-x-2 p-2 border-2 border-dashed border-purple-300 rounded-lg text-sm text-purple-600 hover:border-purple-500 hover:bg-purple-50 transition-colors font-medium"
        >
          <Plus size={14} />
          <span>Add Answer</span>
        </button>
      </div>
      
      {/* Default output handle (bottom) - for "regardless of answer" - only show in single mode */}
      {answerType === 'single' && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          className="w-3 h-3 border-2 border-white cursor-pointer hover:scale-125 transition-transform"
          style={{ 
            background: data.orphanedVariants?.includes('default') ? '#fb923c' : '#22c55e' // Orange for orphaned, green for connected
          }}
          onClick={(e) => {
            e.stopPropagation();
            createLinkedQuestionNode('default');
          }}
        />
      )}
    </div>
  );
}