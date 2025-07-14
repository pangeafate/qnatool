import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Node, Edge } from 'reactflow';
import { PathIdGenerator } from '../utils/pathIdGenerator';

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedNodeIds: string[]; // Add multi-selection support
  clipboard: { nodes: Node[]; edges: Edge[] }; // Add clipboard support
  focusNodeId: string | null; // Add this to track which node to focus on
  
  // Global fold/unfold state
  pathDisplaysFolded: boolean;
  combinationSectionsFolded: boolean;
  
  // Undo/Redo state
  history: Array<{ nodes: Node[]; edges: Edge[] }>;
  historyIndex: number;
  
  // Actions
  addNode: (node: Node) => void;
  updateNode: (nodeId: string, data: any) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: Edge) => void;
  deleteEdge: (edgeId: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSelectedEdgeId: (edgeId: string | null) => void;
  setSelectedNodeIds: (nodeIds: string[]) => void;
  addToSelection: (nodeId: string) => void;
  removeFromSelection: (nodeId: string) => void;
  clearSelection: () => void;
  copySelectedNodes: () => void;
  pasteNodes: (position?: { x: number; y: number }) => void;
  cleanupDuplicateEdges: () => void;
  recalculateFlowIds: (rootNodeId: string, newTopic: string) => void;
  propagateTopicOnConnection: (sourceNodeId: string, targetNodeId: string) => void;
  propagatePathIdOnConnection: (sourceNodeId: string, targetNodeId: string, sourceHandle?: string) => void;
  
  // Focus functionality
  focusOnNode: (nodeId: string) => void;
  clearFocusNode: () => void;
  
  // Fold/unfold actions
  togglePathDisplays: () => void;
  toggleCombinationSections: () => void;
  toggleAllMeta: () => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToHistory: () => void;
  
  // Path propagation
  propagatePathToAll: () => void;
  
  // Complex operations
  createLinkedQuestion: (parentNodeId: string, position: { x: number; y: number }) => void;
  importFromExcel: (data: { nodes: Node[]; edges: Edge[] }) => void;
  additiveImport: (nodes: Node[], edges: Edge[]) => void;
  exportToFormat: (format: 'excel' | 'json') => any;
  
  // Topic management
  validateTopicUniqueness: (topic: string, excludeNodeId?: string) => boolean;
  generateUniqueTopicName: (baseName?: string, excludeNodeId?: string) => string;
  clearFlow: () => void;
}

export const useFlowStore = create<FlowState>()(
  immer((set, get) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    selectedNodeIds: [], // Initialize multi-selection state
    clipboard: { nodes: [], edges: [] }, // Initialize clipboard
    focusNodeId: null, // Initialize focusNodeId
    
    // Initialize global fold/unfold state
    pathDisplaysFolded: false,
    combinationSectionsFolded: false,
    
    // Initialize history
    history: [{ nodes: [], edges: [] }],
    historyIndex: 0,
    
    addNode: (node) => {
      // Save current state to history before making changes
      get().saveToHistory();
      
      set((state) => {
        state.nodes.push(node as any);
      });
    },
    
    updateNode: (nodeId, data) => set((state) => {
      const nodeIndex = state.nodes.findIndex(n => n.id === nodeId);
      if (nodeIndex !== -1) {
        state.nodes[nodeIndex].data = { ...state.nodes[nodeIndex].data, ...data };
      }
    }),
    
    updateNodePosition: (nodeId, position) => set((state) => {
      const nodeIndex = state.nodes.findIndex(n => n.id === nodeId);
      if (nodeIndex !== -1) {
        state.nodes[nodeIndex].position = position;
      }
    }),
    
    deleteNode: (nodeId) => {
      // Save current state to history before making changes
      get().saveToHistory();
      
      set((state) => {
        // Remove the node
        state.nodes = state.nodes.filter(n => n.id !== nodeId);
        
        // Remove all edges connected to this node (both as source and target)
        const edgesToRemove = state.edges.filter(e => e.source === nodeId || e.target === nodeId);
        state.edges = state.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
        
        // Clear selection if the deleted node was selected
        if (state.selectedNodeId === nodeId) {
          state.selectedNodeId = null;
        }
        
        // Log cleanup for debugging
        if (edgesToRemove.length > 0) {
          console.log(`Cleaned up ${edgesToRemove.length} edges for deleted node ${nodeId}`);
        }
      });
    },
    
    addEdge: (edge) => {
      // Save current state to history before making changes
      get().saveToHistory();
      
      set((state) => {
        // Check for duplicate edges
        const isDuplicate = state.edges.some(existingEdge => 
          existingEdge.source === edge.source && 
          existingEdge.target === edge.target &&
          existingEdge.sourceHandle === edge.sourceHandle &&
          existingEdge.targetHandle === edge.targetHandle
        );
        
        if (!isDuplicate) {
          state.edges.push(edge);
          
          // If the target is an outcome node, update its path ID based on the source
          const targetNode = state.nodes.find(n => n.id === edge.target);
          const sourceNode = state.nodes.find(n => n.id === edge.source);
          
          if (targetNode && targetNode.type === 'outcome' && sourceNode) {
            const targetIndex = state.nodes.findIndex(n => n.id === edge.target);
            if (targetIndex !== -1) {
              // Generate proper sequential path ID for outcome node
              const pathGenerator = PathIdGenerator.getInstance();
              const sourcePathId = sourceNode.data?.pathId || 'PATH';
              const outcomeNumber = pathGenerator.getOutcomeNumberForNode(edge.target, sourcePathId, state.nodes);
              const newPathId = `${sourcePathId}-E${outcomeNumber}`;
              
              state.nodes[targetIndex].data = {
                ...state.nodes[targetIndex].data,
                pathId: newPathId
              };
              
              console.log(`Updated outcome node path ID to: ${newPathId}`);
            }
          }
        }
      });
    },
    
    deleteEdge: (edgeId) => {
      // Save current state to history before making changes
      get().saveToHistory();
      
      set((state) => {
        state.edges = state.edges.filter(e => e.id !== edgeId);
      });
    },
    
    setNodes: (nodes) => set((state) => {
      state.nodes = nodes as any;
    }),
    
    setEdges: (edges) => set((state) => {
      state.edges = edges;
    }),
    
    setSelectedNodeId: (nodeId) => set((state) => {
      state.selectedNodeId = nodeId;
      state.selectedEdgeId = null; // Clear edge selection when node is selected
    }),
    
    setSelectedEdgeId: (edgeId: string | null) => set((state) => {
      state.selectedEdgeId = edgeId;
      state.selectedNodeId = null; // Clear node selection when edge is selected
    }),

    setSelectedNodeIds: (nodeIds) => set((state) => {
      state.selectedNodeIds = nodeIds;
    }),

    addToSelection: (nodeId) => set((state) => {
      if (!state.selectedNodeIds.includes(nodeId)) {
        state.selectedNodeIds.push(nodeId);
      }
    }),

    removeFromSelection: (nodeId) => set((state) => {
      state.selectedNodeIds = state.selectedNodeIds.filter(id => id !== nodeId);
    }),

    clearSelection: () => set((state) => {
      state.selectedNodeId = null;
      state.selectedEdgeId = null;
      state.selectedNodeIds = [];
    }),

    copySelectedNodes: () => set((state) => {
      const selectedNodes = state.nodes.filter(node => state.selectedNodeIds.includes(node.id));
      const selectedEdges = state.edges.filter(edge => 
        state.selectedNodeIds.includes(edge.source) && state.selectedNodeIds.includes(edge.target)
      );
      
      state.clipboard.nodes = selectedNodes;
      state.clipboard.edges = selectedEdges;
      
      console.log(`Copied ${selectedNodes.length} nodes and ${selectedEdges.length} edges to clipboard.`);
    }),

    pasteNodes: (position) => set((state) => {
      if (state.clipboard.nodes.length === 0) {
        console.log('Clipboard is empty, nothing to paste.');
        return;
      }

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      const offsetX = position?.x || 0;
      const offsetY = position?.y || 0;
      
      // Create a mapping from old node IDs to new node IDs
      const nodeIdMap = new Map<string, string>();

      // Create new nodes with updated IDs
      state.clipboard.nodes.forEach(node => {
        const newNodeId = `pasted-${node.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        nodeIdMap.set(node.id, newNodeId);
        
        const newNode: Node = {
          ...node,
          id: newNodeId,
          position: { 
            x: node.position.x + offsetX, 
            y: node.position.y + offsetY 
          },
          data: {
            ...node.data,
            pathId: node.data.pathId ? `${node.data.pathId}-copy` : undefined,
            topic: node.data.topic ? `${node.data.topic}-copy` : node.data.topic,
            // Remove root status from pasted nodes to avoid conflicts
            isRoot: false
          }
        };
        newNodes.push(newNode);
      });

      // Create new edges with updated source and target IDs
      state.clipboard.edges.forEach(edge => {
        const newSourceId = nodeIdMap.get(edge.source);
        const newTargetId = nodeIdMap.get(edge.target);
        
        // Only create edge if both source and target nodes were pasted
        if (newSourceId && newTargetId) {
          const newEdgeId = `pasted-${edge.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const newEdge: Edge = {
            ...edge,
            id: newEdgeId,
            source: newSourceId,
            target: newTargetId,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            animated: true,
          };
          newEdges.push(newEdge);
        }
      });

      // Add new nodes and edges to the current state
      state.nodes.push(...newNodes);
      state.edges.push(...newEdges);

      // Update selection to the newly pasted nodes
      state.selectedNodeIds = newNodes.map(node => node.id);
      state.selectedNodeId = null;
      state.selectedEdgeId = null;

      console.log(`Pasted ${newNodes.length} nodes and ${newEdges.length} edges.`);
    }),
    
    // Focus functionality
    focusOnNode: (nodeId) => {
      set({ focusNodeId: nodeId });
    },
    
    clearFocusNode: () => {
      set({ focusNodeId: null });
    },
    
    // Fold/unfold actions
    togglePathDisplays: () => {
      set((state) => ({
        pathDisplaysFolded: !state.pathDisplaysFolded
      }));
    },
    
    toggleCombinationSections: () => {
      set((state) => ({
        combinationSectionsFolded: !state.combinationSectionsFolded
      }));
    },
    
    toggleAllMeta: () => {
      set((state) => {
        const newFoldedState = !state.pathDisplaysFolded || !state.combinationSectionsFolded;
        return {
          pathDisplaysFolded: newFoldedState,
          combinationSectionsFolded: newFoldedState
        };
      });
    },
    
    // Undo/Redo helper methods
    canUndo: () => {
      const state = get();
      return state.historyIndex > 0;
    },
    
    canRedo: () => {
      const state = get();
      return state.historyIndex < state.history.length - 1;
    },
    
    cleanupDuplicateEdges: () => set((state) => {
      const uniqueEdges: Edge[] = [];
      const seenEdges = new Set<string>();
      
      state.edges.forEach(edge => {
        const key = `${edge.source}-${edge.target}-${edge.sourceHandle || ''}-${edge.targetHandle || ''}`;
        if (!seenEdges.has(key)) {
          seenEdges.add(key);
          uniqueEdges.push(edge);
        }
      });
      
      const duplicatesRemoved = state.edges.length - uniqueEdges.length;
      state.edges = uniqueEdges;
      
      if (duplicatesRemoved > 0) {
        console.log(`Removed ${duplicatesRemoved} duplicate edges`);
      }
    }),

    recalculateFlowIds: (rootNodeId, newTopic) => set((state) => {
      const pathGenerator = PathIdGenerator.getInstance();
      
      // Find the root node that was changed
      const rootNode = state.nodes.find(n => n.id === rootNodeId);
      if (!rootNode || !rootNode.data?.isRoot) {
        console.log(`Root node ${rootNodeId} not found or is not a root node`);
        return;
      }
      
      // Update the root node's topic FIRST before path recalculation
      const rootNodeIndex = state.nodes.findIndex(n => n.id === rootNodeId);
      if (rootNodeIndex !== -1) {
        state.nodes[rootNodeIndex] = {
          ...state.nodes[rootNodeIndex],
          data: {
            ...state.nodes[rootNodeIndex].data,
            topic: newTopic
          }
        } as any;
      }
      
      // Find all nodes connected to this specific root using breadth-first search
      const connectedNodes = new Set<string>();
      const queue = [rootNodeId];
      connectedNodes.add(rootNodeId);
      
      while (queue.length > 0) {
        const currentNodeId = queue.shift()!;
        
        // Find all edges from this node
        const outgoingEdges = state.edges.filter(edge => edge.source === currentNodeId);
        outgoingEdges.forEach(edge => {
          if (!connectedNodes.has(edge.target)) {
            connectedNodes.add(edge.target);
            queue.push(edge.target);
          }
        });
      }
      
      // Get only the nodes and edges for this root's subgraph (using updated nodes)
      const subgraphNodes = state.nodes.filter(node => connectedNodes.has(node.id));
      const subgraphEdges = state.edges.filter(edge => 
        connectedNodes.has(edge.source) && connectedNodes.has(edge.target)
      );
      
      console.log(`Recalculating ${subgraphNodes.length} nodes for root "${rootNodeId}" with topic "${newTopic}"`);
      
      // Recalculate path IDs only for this subgraph
      const result = pathGenerator.recalculatePathIds(subgraphNodes, subgraphEdges, newTopic);
      
      // Update only the affected nodes in the state
      result.nodes.forEach(updatedNode => {
        const nodeIndex = state.nodes.findIndex(n => n.id === updatedNode.id);
        if (nodeIndex !== -1) {
          state.nodes[nodeIndex] = updatedNode as any;
        }
      });
      
      console.log(`Recalculated path IDs for topic: ${newTopic} (${result.nodes.length} nodes updated)`);
    }),

    propagateTopicOnConnection: (sourceNodeId, targetNodeId) => set((state) => {
      const sourceNode = state.nodes.find(n => n.id === sourceNodeId);
      const targetNode = state.nodes.find(n => n.id === targetNodeId);
      
      if (!sourceNode || !targetNode) return;
      
      // NEVER change the topic of a root node - root nodes maintain their dedicated topics
      if (targetNode.data?.isRoot) {
        console.log(`Target node ${targetNodeId} is a root node - preserving its dedicated topic "${targetNode.data.topic}"`);
        return;
      }
      
      // Find the root topic by traversing up from the source node
      const findRootTopic = (nodeId: string, visited = new Set<string>()): string | null => {
        if (visited.has(nodeId)) return null; // Prevent infinite loops
        visited.add(nodeId);
        
        const node = state.nodes.find(n => n.id === nodeId);
        if (!node) return null;
        
        // If this node has a topic and is a root node, return it
        if (node.data?.topic && node.data?.isRoot) {
          return node.data.topic;
        }
        
        // If this node has a topic but is not root, it might have inherited it
        if (node.data?.topic) {
          return node.data.topic;
        }
        
        // Otherwise, find parent and recurse
        const parentEdge = state.edges.find(e => e.target === nodeId);
        if (parentEdge) {
          return findRootTopic(parentEdge.source, visited);
        }
        
        return null;
      };
      
      const sourceTopic = findRootTopic(sourceNodeId);
      const targetTopic = findRootTopic(targetNodeId);
      
      // If target node already has a topic from a different root, allow cross-topic connection
      if (targetTopic && sourceTopic && targetTopic !== sourceTopic) {
        console.log(`Cross-topic connection: ${sourceTopic} -> ${targetTopic} (preserving target topic)`);
        // Don't change the target topic - allow cross-topic connections
        return;
      }
      
      // If target has no topic or same topic, propagate source topic
      if (sourceTopic && (!targetNode.data?.topic || targetNode.data.topic !== sourceTopic)) {
        const targetIndex = state.nodes.findIndex(n => n.id === targetNodeId);
        if (targetIndex !== -1) {
          state.nodes[targetIndex].data = {
            ...state.nodes[targetIndex].data,
            topic: sourceTopic
          };
          console.log(`Propagated topic "${sourceTopic}" to node ${targetNodeId}`);
        }
      }
    }),

    propagatePathIdOnConnection: (sourceNodeId, targetNodeId, sourceHandle) => set((state) => {
      const sourceNode = state.nodes.find(n => n.id === sourceNodeId);
      const targetNode = state.nodes.find(n => n.id === targetNodeId);
      
      if (!sourceNode || !targetNode) return;
      
      const pathGenerator = PathIdGenerator.getInstance();
      
      // For Multiple answer types connecting via variant handles, generate the variant path directly
      let sourcePathIds: string[] = [];
      
      if (sourceNode.data?.answerType === 'multiple' && sourceHandle?.startsWith('variant-')) {
        // For Multiple answer types, generate the variant path from the base path
        const basePath = sourceNode.data?.pathId;
        if (basePath && !basePath.startsWith('disconnected from root-')) {
          const variantIndex = parseInt(sourceHandle.replace('variant-', ''));
          const variantPath = `V${variantIndex + 1}`;
          const sourceVariantPath = `${basePath}-${variantPath}`;
          sourcePathIds = [sourceVariantPath];
          
          console.log(`Generated variant path for Multiple answer: ${sourceVariantPath} from base ${basePath}`);
        } else {
          console.log(`Source node ${sourceNodeId} has invalid base path for Multiple variant connection`);
          return;
        }
      } else if (sourceNode.data?.answerType === 'combinations' && sourceHandle?.startsWith('combination-')) {
        // For Combinations answer types, generate the combination path from the base path
        const basePath = sourceNode.data?.pathId;
        if (basePath && !basePath.startsWith('disconnected from root-')) {
          const combinationId = sourceHandle.replace('combination-', '');
          
          // Find the combination data to get the variant indices
          const combinations = sourceNode.data?.combinations || [];
          const combination = combinations.find((c: any) => c.id === combinationId);
          
          if (combination && combination.variantIndices) {
            const variantPath = combination.variantIndices.map((idx: number) => `V${idx}`).join('+');
            const sourceCombinationPath = `${basePath}-${variantPath}`;
            sourcePathIds = [sourceCombinationPath];
            
            console.log(`Generated combination path for Combinations answer: ${sourceCombinationPath} from base ${basePath}`);
          } else {
            console.log(`Could not find combination data for ${combinationId}`);
            return;
          }
        } else {
          console.log(`Source node ${sourceNodeId} has invalid base path for Combinations connection`);
          return;
        }
      } else {
        // For other answer types or non-variant connections, use existing logic
        sourcePathIds = sourceNode.data?.pathIds || [sourceNode.data?.pathId].filter(Boolean);
      }
      
      if (sourcePathIds.length === 0) {
        console.log(`Source node ${sourceNodeId} has no valid path IDs for propagation`);
        return;
      }
      
      // Process each source path ID to generate corresponding target path IDs
      const newPathIds: string[] = [];
      
      sourcePathIds.forEach((sourcePathId: string) => {
        let newPathId: string;
        
        // Since we've already constructed the proper source path with variants/combinations,
        // we just need to append the appropriate target segment
        if (targetNode.type === 'question') {
          const questionNumber = pathGenerator.getQuestionNumberForNode(targetNodeId, sourcePathId, state.nodes);
          newPathId = `${sourcePathId}-Q${questionNumber}`;
        } else if (targetNode.type === 'answer') {
          const answerNumber = pathGenerator.getAnswerNumberForNode(targetNodeId, sourcePathId, state.nodes);
          newPathId = `${sourcePathId}-A${answerNumber}`;
        } else if (targetNode.type === 'outcome') {
          const outcomeNumber = pathGenerator.getOutcomeNumberForNode(targetNodeId, sourcePathId, state.nodes);
          newPathId = `${sourcePathId}-E${outcomeNumber}`;
        } else {
          // Generic fallback
          newPathId = `${sourcePathId}-NODE`;
        }
        
        newPathIds.push(newPathId);
      });
      
      // Update target node with multiple path ID support - ACCUMULATE path IDs from multiple sources
      const targetIndex = state.nodes.findIndex(n => n.id === targetNodeId);
      if (targetIndex !== -1) {
        const currentPathIds = state.nodes[targetIndex].data?.pathIds || [state.nodes[targetIndex].data?.pathId].filter(Boolean);
        
        // Merge new path IDs with existing ones, avoiding duplicates
        const allPathIds = [...currentPathIds];
        newPathIds.forEach(newPathId => {
          if (!allPathIds.includes(newPathId)) {
            allPathIds.push(newPathId);
          }
        });
        
        // Update the target node with accumulated path IDs
        state.nodes[targetIndex].data = {
          ...state.nodes[targetIndex].data,
          pathId: allPathIds[0] || state.nodes[targetIndex].data?.pathId, // Keep first path as primary for backward compatibility
          pathIds: allPathIds // Store all accumulated path IDs
        };
        
        console.log(`Updated ${targetNode.type} node ${targetNodeId} with ${newPathIds.length} new path IDs via handle "${sourceHandle}". Total paths: ${allPathIds.length}`);
        console.log(`All path IDs for node ${targetNodeId}:`, allPathIds);
        
        // If this is a cross-topic connection, log it
        const sourceTopic = sourceNode.data?.topic;
        const targetTopic = targetNode.data?.topic;
        if (sourceTopic && targetTopic && sourceTopic !== targetTopic) {
          console.log(`Cross-topic connection detected: ${sourceTopic} -> ${targetTopic} for node ${targetNodeId}`);
        }
      }
    }),
    
    createLinkedQuestion: (parentNodeId, position) => set((state) => {
      const parentNode = state.nodes.find(n => n.id === parentNodeId);
      if (!parentNode) return;
      
      const pathGenerator = PathIdGenerator.getInstance();
      
      // Generate proper path ID for the new question
      const questionNumber = pathGenerator.getNextQuestionNumber(parentNode.data?.pathId || null);
      const topic = parentNode.data?.topic || 'NEW-TOPIC';
      
      // Create proper NodePathData for parent
      const parentPathData = parentNode.data?.pathId ? {
        nodeId: parentNode.id,
        pathId: parentNode.data.pathId,
        parentPathId: null, // Will be determined by path structure
        level: parentNode.data?.questionLevel || 1,
        topic: topic
      } : null;
      
      const questionPathId = pathGenerator.generateQuestionPathId(
        parentPathData,
        questionNumber,
        topic
      );
      
      // Create new question node
      const questionId = `q-${Date.now()}`;
      const questionNode: Node = {
        id: questionId,
        type: 'question',
        position,
        data: {
          pathId: questionPathId,
          topic: topic,
          questionText: 'New Question',
          questionLevel: ((parentNode.data as any)?.questionLevel || 1) + 1,
          elementId: 'NEW',
          subElementId: 'NEW',
        }
      };
      
      // Generate proper path ID for the answer node
      const answerNumber = pathGenerator.getNextAnswerNumber(questionPathId);
      
      // Create proper NodePathData for question
      const questionPathData = {
        nodeId: questionId,
        pathId: questionPathId,
        parentPathId: parentNode.data?.pathId || null,
        level: ((parentNode.data as any)?.questionLevel || 1) + 1,
        topic: topic
      };
      
      const answerPathId = pathGenerator.generateAnswerPathId(
        questionPathData,
        answerNumber
      );
      
      // Create corresponding answer node
      const answerId = `a-${Date.now()}`;
      const answerNode: Node = {
        id: answerId,
        type: 'answer',
        position: { x: position.x, y: position.y + 120 },
        data: {
          pathId: answerPathId,
          answerType: 'single',
          variants: [
            {
              id: 'var1',
              text: 'Yes',
              score: 1,
            },
            {
              id: 'var2',
              text: 'No',
              score: 0,
            }
          ]
        }
      };
      
      // Create edge between question and answer
      const edge: Edge = {
        id: pathGenerator.generateEdgeId(questionId, answerId),
        source: questionId,
        target: answerId,
        animated: true,
      };
      
      state.nodes.push(questionNode as any, answerNode as any);
      state.edges.push(edge);
    }),
    
    importFromExcel: (data) => set((state) => {
      state.nodes = data.nodes as any;
      state.edges = data.edges;
    }),
    
    additiveImport: (nodes, edges) => set((state) => {
      // Simply add the nodes and edges to existing ones
      // The conflict resolution and positioning is handled by ImportUtils before calling this
      state.nodes.push(...nodes as any);
      state.edges.push(...edges);
    }),
    
    exportToFormat: (format) => {
      const { nodes, edges } = get();
      if (format === 'json') {
        return { nodes, edges };
      }
      // Excel export implementation will be added later
      return null;
    },
    
    // Topic management
    validateTopicUniqueness: (topic, excludeNodeId) => {
      const nodesWithTopic = get().nodes.filter(node => 
        node.data?.topic === topic && node.id !== excludeNodeId
      );
      return nodesWithTopic.length === 0;
    },

    generateUniqueTopicName: (baseName, excludeNodeId) => {
      let topic = baseName || 'New Topic';
      let counter = 1;
      while (!get().validateTopicUniqueness(topic, excludeNodeId)) {
        topic = `${baseName} ${counter++}`;
      }
      return topic;
    },

    clearFlow: () => set((state) => {
      state.nodes = [];
      state.edges = [];
      state.selectedNodeId = null;
      state.focusNodeId = null; // Clear focus on flow clear
      state.history = [{ nodes: [], edges: [] }];
      state.historyIndex = 0;
      PathIdGenerator.getInstance().reset();
    }),

    // Undo/Redo implementation
    saveToHistory: () => set((state) => {
      const currentState = { 
        nodes: JSON.parse(JSON.stringify(state.nodes)), 
        edges: JSON.parse(JSON.stringify(state.edges)) 
      };
      
      // Remove any history after current index (for when we're not at the end)
      state.history = state.history.slice(0, state.historyIndex + 1);
      
      // Add current state to history
      state.history.push(currentState);
      
      // Move to the new state
      state.historyIndex = state.history.length - 1;
      
      // Limit history to 50 states to prevent memory issues
      if (state.history.length > 50) {
        state.history.shift();
        state.historyIndex = state.history.length - 1;
      }
    }),

    undo: () => set((state) => {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        const prevState = state.history[state.historyIndex];
        state.nodes = JSON.parse(JSON.stringify(prevState.nodes)) as any;
        state.edges = JSON.parse(JSON.stringify(prevState.edges));
        console.log('Undo: Restored state from history index', state.historyIndex);
      }
    }),

    redo: () => set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const nextState = state.history[state.historyIndex];
        state.nodes = JSON.parse(JSON.stringify(nextState.nodes)) as any;
        state.edges = JSON.parse(JSON.stringify(nextState.edges));
        console.log('Redo: Restored state from history index', state.historyIndex);
      }
    }),

    propagatePathToAll: () => {
      // Save current state to history before making changes
      get().saveToHistory();
      
      set((state) => {
        // Find all root nodes (nodes with topics)
        const rootNodes = state.nodes.filter(node => 
          node.data?.isRoot && node.data?.topic
        );
        
        if (rootNodes.length === 0) {
          console.log('No root nodes with topics found');
          return;
        }
        
        console.log(`Found ${rootNodes.length} root nodes with topics`);
        
        // Reset the path generator to ensure clean state
        const pathGenerator = PathIdGenerator.getInstance();
        pathGenerator.reset();
        
        // If there's only one root node, use its topic
        if (rootNodes.length === 1) {
          const rootTopic = rootNodes[0].data.topic;
          console.log(`Recalculating path IDs for single topic "${rootTopic}"`);
          
          const result = pathGenerator.recalculatePathIds(state.nodes, state.edges, rootTopic);
          state.nodes = result.nodes as any;
          
          console.log(`Recalculated path IDs for topic "${rootTopic}"`);
        } else {
          // Multiple root nodes - process ALL nodes together to handle cross-root connections properly
          console.log('Multiple root nodes detected - processing all nodes together to preserve individual topics and handle cross-connections');
          
          // Process ALL nodes and edges together so pathIdGenerator can handle multiple root paths to same nodes
          const result = pathGenerator.recalculatePathIds(state.nodes, state.edges, 'MULTI-ROOT');
          
          // Update all nodes with the results from pathIdGenerator
          state.nodes = result.nodes as any;
          
          console.log(`Processed ${rootNodes.length} roots with cross-connection support`);
          
          // Disconnected nodes are already handled by the pathIdGenerator when processing all nodes together
          
          console.log(`Processed ${rootNodes.length} roots with individual topic preservation`);
        }
        
        console.log('Path ID propagation completed - all nodes now have updated path IDs');
      });
    },
  }))
);