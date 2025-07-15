import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useFlowStore } from '../../../stores/flowStore';
import { AnswerVariant } from '../../../types/flow.types';
import { InfoIcon, VariantInfoPopup } from './components';

interface VariantCombination {
  id: string;
  variantIndices: number[];
  pathId: string;
  label: string;
}

interface AnswerNodeData {
  answerType: 'single' | 'multiple' | 'combinations';
  variants: AnswerVariant[];
  combinations?: VariantCombination[];
  defaultNextPath?: string;
  topic?: string;
  isOrphaned?: boolean;
  pathId?: string;
  pathIds?: string[]; // New: support multiple path IDs
  answerLevel?: number;
  isParent?: boolean;
  isChild?: boolean;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  orphanedVariants?: string[];
}

export default function AnswerNode({ id, data, selected }: NodeProps<AnswerNodeData>) {
  const { setSelectedNodeId, updateNode, nodes, edges, addNode, addEdge, propagateTopicOnConnection, focusOnNode, pathDisplaysFolded, combinationSectionsFolded } = useFlowStore();
  const [answerType, setAnswerType] = useState(data.answerType || 'single');
  const [localPathFolded, setLocalPathFolded] = useState<boolean | null>(null);
  const [localCombinationsFolded, setLocalCombinationsFolded] = useState<boolean | null>(null);

  // Use local state if set, otherwise use global state
  const isPathFolded = localPathFolded !== null ? localPathFolded : pathDisplaysFolded;
  const isCombinationsFolded = localCombinationsFolded !== null ? localCombinationsFolded : combinationSectionsFolded;

  // Info popup state
  const [infoPopup, setInfoPopup] = useState<{
    isOpen: boolean;
    variantId: string | null;
  }>({ isOpen: false, variantId: null });

  // Auto-resize functionality for textareas
  const autoResize = (textarea: HTMLTextAreaElement) => {
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight to show all content
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  // Auto-resize all variant textareas when variants change
  useEffect(() => {
    const resizeAllTextareas = () => {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const textareas = document.querySelectorAll(`[data-node-id="${id}"] textarea`);
        textareas.forEach((textarea) => {
          if (textarea instanceof HTMLTextAreaElement) {
            autoResize(textarea);
          }
        });
      }, 10);
    };

    resizeAllTextareas();
  }, [data.variants, id]); // Re-run when variants change

  // Sync answerType with data changes
  useEffect(() => {
    setAnswerType(data.answerType || 'single');
  }, [data.answerType]);

  const handleClick = () => {
    setSelectedNodeId(id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Only handle double-clicks on non-interactive areas for single mode
    if (answerType !== 'single') return;
    
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('input') || target.closest('textarea') || target.closest('button')) {
      return;
    }

    // Find the next connected node via default handle for single mode
    const outgoingEdge = edges.find(edge => edge.source === id && edge.sourceHandle === 'default');
    if (outgoingEdge) {
      focusOnNode(outgoingEdge.target);
    }
  };

  const handleVariantDoubleClick = (variantIndex: number, e: React.MouseEvent) => {
    // Only for multiple mode
    if (answerType !== 'multiple') return;

    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('input') || target.closest('textarea') || target.closest('button')) {
      return;
    }

    // Find the next connected node via variant handle
    const variantHandle = `variant-${variantIndex}`;
    const outgoingEdge = edges.find(edge => edge.source === id && edge.sourceHandle === variantHandle);
    if (outgoingEdge) {
      focusOnNode(outgoingEdge.target);
    }
  };

  const handleCombinationDoubleClick = (combinationId: string, e: React.MouseEvent) => {
    // Only for combinations mode
    if (answerType !== 'combinations') return;

    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('input') || target.closest('textarea') || target.closest('button')) {
      return;
    }

    // Find the next connected node via combination handle
    const combinationHandle = `combination-${combinationId}`;
    const outgoingEdge = edges.find(edge => edge.source === id && edge.sourceHandle === combinationHandle);
    if (outgoingEdge) {
      focusOnNode(outgoingEdge.target);
    }
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
    const updatedVariants = [...currentVariants, newVariant];
    
    // If this is a combinations answer, regenerate combinations
    if (answerType === 'combinations') {
      const newCombinations = generateAllCombinations(updatedVariants);
      updateNode(id, {
        variants: updatedVariants,
        combinations: newCombinations
      });
      console.log(`🔄 Regenerated ${newCombinations.length} combinations after adding variant`);
    } else {
      updateNode(id, {
        variants: updatedVariants
      });
    }
  };

  const updateVariant = (variantId: string, updates: Partial<AnswerVariant>) => {
    const currentVariants = data.variants || [];
    const updatedVariants = currentVariants.map(v => 
      v.id === variantId ? { ...v, ...updates } : v
    );
    
    // If this is a combinations answer and variant text changed, regenerate combinations
    if (answerType === 'combinations' && updates.text !== undefined) {
      const newCombinations = generateAllCombinations(updatedVariants);
      updateNode(id, { 
        variants: updatedVariants,
        combinations: newCombinations
      });
      console.log(`🔄 Regenerated ${newCombinations.length} combinations after updating variant text`);
    } else {
      updateNode(id, { variants: updatedVariants });
    }
  };

  // Info popup handlers
  const openInfoPopup = (variantId: string) => {
    setInfoPopup({ isOpen: true, variantId });
  };

  const closeInfoPopup = () => {
    setInfoPopup({ isOpen: false, variantId: null });
  };

  const saveVariantInfo = (variantText: string, info: string) => {
    if (infoPopup.variantId) {
      updateVariant(infoPopup.variantId, { 
        text: variantText,
        additionalInfo: info 
      });
    }
    closeInfoPopup();
  };

  const removeVariant = (variantId: string) => {
    const currentVariants = data.variants || [];
    if (currentVariants.length > 1) {
      const updatedVariants = currentVariants.filter(v => v.id !== variantId);
      
      // If this is a combinations answer, regenerate combinations
      if (answerType === 'combinations') {
        const newCombinations = updatedVariants.length >= 2 ? generateAllCombinations(updatedVariants) : [];
        updateNode(id, { 
          variants: updatedVariants,
          combinations: newCombinations
        });
        console.log(`🔄 Regenerated ${newCombinations.length} combinations after removing variant`);
      } else {
        updateNode(id, { variants: updatedVariants });
      }
    }
  };

  const generateAllCombinations = (variants: AnswerVariant[]): VariantCombination[] => {
    const combinations: VariantCombination[] = [];
    const n = variants.length;
    
    // Generate all possible combinations (2^n - 1, excluding empty set)
    for (let i = 1; i < Math.pow(2, n); i++) {
      const variantIndices: number[] = [];
      const variantTexts: string[] = [];
      for (let j = 0; j < n; j++) {
        if (i & (1 << j)) {
          variantIndices.push(j + 1); // Use 1-based indexing for consistency
          variantTexts.push(variants[j].text || `Answer ${j + 1}`); // Use actual variant text
        }
      }
      
      const combination: VariantCombination = {
        id: `combo-${i}`,
        variantIndices,
        pathId: `combination-${variantIndices.join('-')}`,
        label: variantTexts.join(' + ') // Use actual variant text instead of "Variants X + Y"
      };
      
      console.log(`🔧 Generated combination:`, {
        id: combination.id,
        variantIndices: combination.variantIndices,
        pathId: combination.pathId,
        label: combination.label
      });
      
      combinations.push(combination);
    }
    
    return combinations;
  };

  const getCurrentCombinations = (): VariantCombination[] => {
    if (answerType !== 'combinations') return [];
    
    const currentVariants = data.variants || [];
    if (currentVariants.length < 2) return [];
    
    // Generate fresh combinations based on current variants
    const freshCombinations = generateAllCombinations(currentVariants);
    const storedCombinations = data.combinations || [];
    
    // Check if stored combinations are out of sync with current variants
    // This happens when variants are added/removed but combinations weren't regenerated
    const expectedCombinationCount = Math.pow(2, currentVariants.length) - 1;
    const isOutOfSync = storedCombinations.length !== expectedCombinationCount;
    
    if (isOutOfSync || storedCombinations.length === 0) {
      console.log(`🔧 Combinations out of sync (stored: ${storedCombinations.length}, expected: ${expectedCombinationCount}). Regenerating...`);
      updateNode(id, { combinations: freshCombinations });
      return freshCombinations;
    }
    
    return storedCombinations;
  };

  const getConnectedCombinations = (): VariantCombination[] => {
    const combinations = getCurrentCombinations();
    return combinations.filter(combination => {
      const combinationHandle = `combination-${combination.id}`;
      return edges.some(edge => edge.source === id && edge.sourceHandle === combinationHandle);
    });
  };

  const getOrphanedCombinations = (): VariantCombination[] => {
    const combinations = getCurrentCombinations();
    return combinations.filter(combination => {
      const combinationHandle = `combination-${combination.id}`;
      return !edges.some(edge => edge.source === id && edge.sourceHandle === combinationHandle);
    });
  };

  // Remove unused functions - they're not needed in the current implementation
  // const getConnectedVariants = (): string[] => { ... };
  // const getOrphanedVariants = (): string[] => { ... };
  // const isAnswerNodeOrphaned = (): boolean => { ... };

  const createLinkedQuestionForCombination = (combinationId: string) => {
    console.log('Creating linked question for combination:', combinationId);
    
    // Check if this combination already has a connection
    const existingConnection = edges.find(edge => 
      edge.source === id && edge.sourceHandle === `combination-${combinationId}`
    );
    
    if (existingConnection) {
      console.log('This combination already has a connection. Only one connection per combination is allowed.');
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
    
    // Create a new question node positioned to the right for combination handles
    const newQuestionId = `question-${Date.now()}`;
    const newQuestionNode = {
      id: newQuestionId,
      type: 'question',
      position: {
        x: currentNode.position.x + 200, // To the right for combination handles
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
      sourceHandle: `combination-${combinationId}`, // Use specific combination handle
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

  const handleAnswerTypeChange = (newType: 'single' | 'multiple' | 'combinations') => {
    setAnswerType(newType);
    
    // If switching to combinations mode, generate combinations
    const updateData: any = { answerType: newType };
    if (newType === 'combinations') {
      const currentVariants = data.variants || [];
      if (currentVariants.length >= 2) {
        const newCombinations = generateAllCombinations(currentVariants);
        updateData.combinations = newCombinations;
        console.log(`🔄 Generated ${newCombinations.length} combinations when switching to combinations mode`);
      }
    } else {
      // Clear combinations when switching away from combinations mode
      updateData.combinations = [];
    }
    
    updateNode(id, updateData);
    
    // Clean up ALL outgoing edges and pathIDs when switching modes
    const { edges, deleteEdge, nodes, updateNode: updateNodeInStore } = useFlowStore.getState();
    
    // Find all outgoing edges from this answer node
    const outgoingEdges = edges.filter(edge => edge.source === id);
    
    console.log(`Switching to ${newType} mode: removing ${outgoingEdges.length} outgoing edges and cleaning up pathIDs`);
    
    // Clean up pathIDs from target nodes BEFORE removing edges
    outgoingEdges.forEach(edge => {
      const targetNode = nodes.find(n => n.id === edge.target);
      if (targetNode) {
        const currentPathIds = targetNode.data?.pathIds || [targetNode.data?.pathId].filter(Boolean);
        
        // Remove only pathIDs that were coming from this answer node
        // PathIDs from this node will contain this node's pathId as a prefix
        const sourcePathId = data.pathId;
        if (sourcePathId) {
                     const filteredPathIds = currentPathIds.filter((pathId: string) => 
             !pathId.startsWith(sourcePathId)
           );
          
          // Update target node with cleaned pathIDs
          updateNodeInStore(edge.target, {
            pathId: filteredPathIds.length > 0 ? filteredPathIds[0] : undefined,
            pathIds: filteredPathIds.length > 0 ? filteredPathIds : []
          });
          
          console.log(`Cleaned pathIDs for target node ${edge.target}: removed paths starting with ${sourcePathId}`);
        }
      }
    });
    
    // Remove all outgoing edges
    outgoingEdges.forEach(edge => deleteEdge(edge.id));
  };

  // Only stop propagation, don't prevent default!
  const stopPropagation = (e: React.MouseEvent | React.FocusEvent | React.KeyboardEvent | React.WheelEvent) => {
    e.stopPropagation();
  };

  const currentVariants = data.variants || [];

  return (
    <div
      data-node-id={id}
      className={`
        bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-lg border-2 p-4 w-[350px]
        ${selected ? 'border-purple-500 shadow-xl ring-2 ring-purple-200' : 'border-gray-200 hover:border-gray-300'}
        ${data.isOrphaned ? 'ring-2 ring-orange-400 border-orange-300' : ''}
        ${data.isParent || data.isChild || data.isSelected ? 'ring-2 ring-green-400 border-green-300' : ''}
        ${data.isMultiSelected ? 'ring-2 ring-purple-400 border-purple-300 bg-purple-100' : ''}
        transition-all duration-200 hover:shadow-xl cursor-pointer relative
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
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
                onChange={(e) => handleAnswerTypeChange(e.target.value as 'single' | 'multiple' | 'combinations')}
                className="mr-1"
              />
              Single
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="multiple"
                checked={answerType === 'multiple'}
                onChange={(e) => handleAnswerTypeChange(e.target.value as 'single' | 'multiple' | 'combinations')}
                className="mr-1"
              />
              Multiple
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="combinations"
                checked={answerType === 'combinations'}
                onChange={(e) => handleAnswerTypeChange(e.target.value as 'single' | 'multiple' | 'combinations')}
                className="mr-1"
              />
              Combinations
            </label>
          </div>
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
                {isPathFolded ? 'Path: ...' : (data.pathId || 'No path')}
              </div>
              {isPathFolded ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </div>
          )}
        </div>
        
        {/* Connection mode indicator */}
        <div className={`text-xs rounded px-2 py-1 text-center font-medium ${
          answerType === 'single' 
            ? 'bg-blue-50 text-blue-600' 
            : answerType === 'multiple'
              ? 'bg-green-50 text-green-600'
              : 'bg-yellow-50 text-yellow-600'
        }`}>
          {answerType === 'single' 
            ? '↓ Single path (bottom)' 
            : answerType === 'multiple'
              ? '→ Multiple paths (variants)'
              : '→ Combinations (variants)'}
        </div>
        
        {/* Answer Variants */}
        <div className="space-y-2">
          {currentVariants.map((variant, index) => {
            const variantHandle = `variant-${index}`;
            const isOrphanedVariant = data.orphanedVariants?.includes(variantHandle);
            
            return (
              <div key={variant.id} className="relative">
                <div 
                  className={`bg-white rounded-lg p-3 shadow-sm border ${
                    answerType === 'multiple' ? 'border-green-200 hover:border-green-300' : 'border-gray-100'
                  } ${isOrphanedVariant ? 'ring-1 ring-orange-400 border-orange-300' : ''} transition-colors`}
                  onClick={stopPropagation}
                  onMouseDown={stopPropagation}
                  onDoubleClick={(e) => handleVariantDoubleClick(index, e)}
                >
                  {/* Top row: Info icon + Text input + Score + Remove */}
                  <div className="flex items-start space-x-2">
                    <InfoIcon
                      onClick={() => openInfoPopup(variant.id)}
                      hasInfo={!!variant.additionalInfo}
                      className="mt-1 flex-shrink-0"
                    />
                    <textarea
                      value={variant.text}
                      onChange={(e) => {
                        updateVariant(variant.id, { text: e.target.value });
                        autoResize(e.target);
                      }}
                      onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                      className="flex-1 text-sm bg-transparent focus:outline-none resize-none min-h-[24px] leading-relaxed overflow-hidden"
                      placeholder="Answer text..."
                      rows={1}
                      style={{ 
                        wordWrap: 'break-word',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                        overflow: 'hidden', // Prevent scrollbars
                        boxSizing: 'border-box' // Include padding in height calculation
                      }}
                      onFocus={stopPropagation}
                      onKeyDown={stopPropagation}
                      ref={(textarea) => {
                        // Auto-resize on mount/update
                        if (textarea) {
                          setTimeout(() => autoResize(textarea), 0);
                        }
                      }}
                    />
                    <input
                      type="number"
                      value={variant.score}
                      onChange={(e) => updateVariant(variant.id, { score: Number(e.target.value) })}
                      className="w-12 text-xs text-center bg-gray-50 rounded px-1 py-1 focus:outline-none focus:bg-white border border-gray-200 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] flex-shrink-0"
                      placeholder="0"
                      title="Score"
                      min="-999"
                      max="999"
                      onFocus={stopPropagation}
                      onKeyDown={stopPropagation}
                      onWheel={(e) => {
                        e.currentTarget.blur();
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
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  
                  {/* Optional: Preview of additional info if present */}
                  {variant.additionalInfo && (
                    <div className="mt-2 text-xs text-gray-500 italic truncate bg-blue-50 px-2 py-1 rounded">
                      Info: {variant.additionalInfo}
                    </div>
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
                      background: isOrphanedVariant ? '#fb923c' : '#22c55e',
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
        
        {/* Combinations Builder - Only show when answerType is 'combinations' */}
        {answerType === 'combinations' && currentVariants.length > 1 && (
          <div className="space-y-3 border-t pt-3">
            <div className="bg-yellow-50 rounded-lg p-3 space-y-2">
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-yellow-100 px-2 py-1 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalCombinationsFolded(!isCombinationsFolded);
                }}
              >
                <div className="text-xs text-yellow-700">
                  All combinations are active. Connect them to questions:
                </div>
                {isCombinationsFolded ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </div>
              
                            {!isCombinationsFolded && (
                <div className="space-y-2">
                  {getCurrentCombinations().map((combination) => {
                const isOrphanedCombination = getOrphanedCombinations().some(c => c.id === combination.id);
                const isConnectedCombination = getConnectedCombinations().some(c => c.id === combination.id);
                
                return (
                  <div key={combination.id} className="relative">
                    <div 
                      className={`flex items-center space-x-2 bg-white rounded-lg p-2 shadow-sm border transition-colors ${
                        isConnectedCombination ? 'border-green-300 bg-green-50' : 
                        isOrphanedCombination ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                      }`}
                                              onClick={stopPropagation}
                        onMouseDown={stopPropagation}
                        onDoubleClick={(e) => handleCombinationDoubleClick(combination.id, e)}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {combination.label}
                        </div>
                      </div>
                      
                      {/* Connection Status */}
                      <div className="flex items-center space-x-1">
                        {isConnectedCombination && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Connected
                          </span>
                        )}
                        {isOrphanedCombination && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            Orphaned
                          </span>
                        )}
                      </div>
                      
                      {/* Show variant indices */}
                      <div className="flex space-x-1">
                        {combination.variantIndices.map((idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                          >
                            {idx}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Combination handle */}
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={`combination-${combination.id}`}
                      style={{ 
                        top: '50%',
                        right: '-5px',
                        transform: 'translateY(-50%)',
                        background: isOrphanedCombination ? '#fb923c' : '#f59e0b', // Orange for orphaned, amber for connected
                        width: '10px',
                        height: '10px',
                        zIndex: 10,
                        cursor: 'pointer'
                      }}
                      className="border-2 border-white hover:scale-125 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        createLinkedQuestionForCombination(combination.id);
                      }}
                    />
                  </div>
                );
              })}
                </div>
              )}
            </div>
          </div>
        )}
        
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
      
      {/* Variant Info Popup */}
      {infoPopup.isOpen && infoPopup.variantId && (
        <VariantInfoPopup
          isOpen={infoPopup.isOpen}
          onClose={closeInfoPopup}
          onSave={saveVariantInfo}
          currentInfo={currentVariants.find(v => v.id === infoPopup.variantId)?.additionalInfo || ''}
          variantText={currentVariants.find(v => v.id === infoPopup.variantId)?.text || ''}
        />
      )}
    </div>
  );
}