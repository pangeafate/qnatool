import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
  isMultiSelected?: boolean;
}

export default function QuestionNode({ id, data, selected }: NodeProps<QuestionNodeData>) {
  const { setSelectedNodeId, updateNode, recalculateFlowIds, propagateTopicOnConnection, propagatePathIdOnConnection, focusOnNode, edges, pathDisplaysFolded, nodes } = useFlowStore();
  const [localPathFolded, setLocalPathFolded] = useState<boolean | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);

  // Use local state if set, otherwise use global state
  const isPathFolded = localPathFolded !== null ? localPathFolded : pathDisplaysFolded;

  // Validate topic uniqueness
  const validateTopicUniqueness = (newTopic: string): boolean => {
    if (!newTopic.trim()) return false;
    
    // Check if any other root question has this topic
    const otherRootNodes = nodes.filter(node => 
      node.data?.isRoot && 
      node.id !== id && 
      node.data.topic === newTopic.trim()
    );
    
    return otherRootNodes.length === 0;
  };

  // Generate alternative topic suggestions
  const generateTopicSuggestions = (baseTopic: string): string[] => {
    const suggestions: string[] = [];
    const existingTopics = nodes
      .filter(node => node.data?.isRoot && node.id !== id)
      .map(node => node.data.topic)
      .filter(topic => topic);

    // Generate numbered alternatives
    for (let i = 1; i <= 5; i++) {
      const suggestion = `${baseTopic}-${i}`;
      if (!existingTopics.includes(suggestion)) {
        suggestions.push(suggestion);
      }
    }

    // Generate some creative alternatives
    const prefixes = ['NEW', 'ALT', 'BRANCH', 'FLOW', 'PATH'];
    prefixes.forEach(prefix => {
      const suggestion = `${prefix}-${baseTopic}`;
      if (!existingTopics.includes(suggestion) && suggestions.length < 8) {
        suggestions.push(suggestion);
      }
    });

    return suggestions.slice(0, 5); // Return max 5 suggestions
  };

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
    
    // Clear previous error
    setTopicError(null);
    
    // Always update the display value immediately for smooth UX
    updateNode(id, { topic: newTopic });
    
    // If this is a root node, validate uniqueness
    if (data.isRoot && newTopic.trim()) {
      if (!validateTopicUniqueness(newTopic)) {
        setTopicError(`Topic "${newTopic}" already exists. Please choose a different name.`);
        return; // Don't recalculate path IDs for duplicate topics
      }
    }
    
    // If this is a root node and topic is valid, recalculate all path IDs
    if (data.isRoot && newTopic.trim()) {
      recalculateFlowIds(id, newTopic);
    }
  };

  const handleTopicBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newTopic = e.target.value.trim();
    
    // If topic is empty, generate a unique one
    if (!newTopic && data.isRoot) {
      const existingTopics = nodes
        .filter(node => node.data?.isRoot && node.id !== id)
        .map(node => node.data.topic)
        .filter(topic => topic);
      
      let counter = 1;
      let uniqueTopic = `TOPIC-${counter}`;
      
      while (existingTopics.includes(uniqueTopic)) {
        counter++;
        uniqueTopic = `TOPIC-${counter}`;
      }
      
      updateNode(id, { topic: uniqueTopic });
      recalculateFlowIds(id, uniqueTopic);
      setTopicError(null);
    }
  };

  const applySuggestedTopic = (suggestedTopic: string) => {
    updateNode(id, { topic: suggestedTopic });
    setTopicError(null);
    
    if (data.isRoot) {
      recalculateFlowIds(id, suggestedTopic);
    }
  };

  // Only stop propagation, don't prevent default!
  const stopPropagation = (e: React.MouseEvent | React.FocusEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const createLinkedAnswerNode = () => {
    // If this is a root node with a topic error, prevent connection
    if (data.isRoot && topicError) {
      console.log('Cannot create connection: Topic validation failed. Please fix the topic first.');
      return;
    }
    
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
        ${data.isMultiSelected ? 'ring-2 ring-purple-400 border-purple-300 bg-purple-50' : ''}
        transition-all duration-200 hover:shadow-xl cursor-pointer
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Input Handle (top) - Gray entry dot - Only for non-root questions */}
      {!data.isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-gray-400 border-2 border-white"
          style={{ background: '#9ca3af' }}
        />
      )}
      
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

        {/* Path ID(s) - foldable display */}
        <div className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded">
          {data.pathIds && data.pathIds.length > 0 ? (
            data.pathIds.length > 1 ? (
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
                  {isPathFolded ? 'Path: ...' : data.pathIds[0]}
                </div>
                {isPathFolded ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </div>
            )
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

        {/* Topic field - show for all root questions */}
        {data.isRoot && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Topic</label>
            <div onClick={stopPropagation} onMouseDown={stopPropagation}>
              <input
                type="text"
                value={data.topic || ''}
                onChange={handleTopicChange}
                onBlur={handleTopicBlur}
                className={`w-full p-2 border rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:border-transparent ${
                  topicError 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-200 focus:ring-blue-500'
                }`}
                placeholder="Enter topic..."
                onFocus={stopPropagation}
                onKeyDown={stopPropagation}
              />
              
              {/* Error message and suggestions */}
              {topicError && (
                <div className="mt-1 space-y-2">
                  <p className="text-xs text-red-600">{topicError}</p>
                  
                  {/* Topic suggestions */}
                  {data.topic && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Suggestions:</p>
                      <div className="flex flex-wrap gap-1">
                        {generateTopicSuggestions(data.topic).map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => applySuggestedTopic(suggestion)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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