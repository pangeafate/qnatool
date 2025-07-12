import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Node, Edge } from 'reactflow';
import { PathIdGenerator } from '../utils/pathIdGenerator';

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  
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
  cleanupDuplicateEdges: () => void;
  recalculateFlowIds: (rootNodeId: string, newTopic: string) => void;
  propagateTopicOnConnection: (sourceNodeId: string, targetNodeId: string) => void;
  propagatePathIdOnConnection: (sourceNodeId: string, targetNodeId: string, sourceHandle?: string) => void;
  
  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  
  // Path propagation
  propagatePathToAll: () => void;
  
  // Complex operations
  createLinkedQuestion: (parentNodeId: string, position: { x: number; y: number }) => void;
  importFromExcel: (data: { nodes: Node[]; edges: Edge[] }) => void;
  exportToFormat: (format: 'excel' | 'json') => any;
  clearFlow: () => void;
}

export const useFlowStore = create<FlowState>()(
  immer((set, get) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    
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
              const outcomeNumber = pathGenerator.getOutcomeNumberForNode(edge.target, sourcePathId);
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
    }),
    
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

    recalculateFlowIds: (_rootNodeId, newTopic) => set((state) => {
      const pathGenerator = PathIdGenerator.getInstance();
      const result = pathGenerator.recalculatePathIds(state.nodes, state.edges, newTopic);
      state.nodes = result.nodes as any;
      console.log(`Recalculated path IDs for topic: ${newTopic}`);
    }),

    propagateTopicOnConnection: (sourceNodeId, targetNodeId) => set((state) => {
      const sourceNode = state.nodes.find(n => n.id === sourceNodeId);
      const targetNode = state.nodes.find(n => n.id === targetNodeId);
      
      if (!sourceNode || !targetNode) return;
      
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
      
      const rootTopic = findRootTopic(sourceNodeId);
      
      if (rootTopic && (!targetNode.data?.topic || targetNode.data.topic !== rootTopic)) {
        // Update target node with the root topic
        const targetIndex = state.nodes.findIndex(n => n.id === targetNodeId);
        if (targetIndex !== -1) {
          state.nodes[targetIndex].data = {
            ...state.nodes[targetIndex].data,
            topic: rootTopic
          };
          console.log(`Propagated topic "${rootTopic}" to node ${targetNodeId}`);
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
        if (basePath && !basePath.startsWith('ORPHAN-')) {
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
        if (basePath && !basePath.startsWith('ORPHAN-')) {
          const combinationId = sourceHandle.replace('combination-', '');
          const variants = sourceNode.data?.variants || [];
          
          // Generate combinations to find the specific one
          const combinations = [];
          const n = variants.length;
          
          for (let i = 1; i < Math.pow(2, n); i++) {
            const variantIndices = [];
            for (let j = 0; j < n; j++) {
              if (i & (1 << j)) {
                variantIndices.push(j);
              }
            }
            
            const combination = {
              id: `combo-${i}`,
              variantIndices
            };
            
            combinations.push(combination);
          }
          
          // Find the matching combination
          const matchingCombination = combinations.find(c => c.id === combinationId);
          if (matchingCombination) {
            const variantPath = `V${matchingCombination.variantIndices.join('+V')}`;
            const sourceCombinationPath = `${basePath}-${variantPath}`;
            sourcePathIds = [sourceCombinationPath];
            
            console.log(`Generated combination path for Combinations answer: ${sourceCombinationPath} from base ${basePath}`);
          } else {
            console.log(`Could not find matching combination for ${combinationId}`);
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
      sourcePathIds.forEach((sourcePathId: string) => {
      
      let newPathId: string;
      
      // Since we've already constructed the proper source path with variants/combinations,
      // we just need to append the appropriate target segment
      if (targetNode.type === 'question') {
        const questionNumber = pathGenerator.getQuestionNumberForNode(targetNodeId, sourcePathId);
        newPathId = `${sourcePathId}-Q${questionNumber}`;
      } else if (targetNode.type === 'answer') {
        const answerNumber = pathGenerator.getAnswerNumberForNode(targetNodeId, sourcePathId);
        newPathId = `${sourcePathId}-A${answerNumber}`;
      } else if (targetNode.type === 'outcome') {
        const outcomeNumber = pathGenerator.getOutcomeNumberForNode(targetNodeId, sourcePathId);
        newPathId = `${sourcePathId}-E${outcomeNumber}`;
      } else {
        // Generic fallback
        newPathId = `${sourcePathId}-NODE`;
      }
      
      // Update target node with multiple path ID support
      const targetIndex = state.nodes.findIndex(n => n.id === targetNodeId);
      if (targetIndex !== -1) {
        const currentPathIds = state.nodes[targetIndex].data?.pathIds || [state.nodes[targetIndex].data?.pathId].filter(Boolean);
        
        // Add new path ID if it doesn't already exist
        if (!currentPathIds.includes(newPathId)) {
          const updatedPathIds = [...currentPathIds, newPathId];
          
          state.nodes[targetIndex].data = {
            ...state.nodes[targetIndex].data,
            pathId: newPathId, // Keep primary path ID for backward compatibility
            pathIds: updatedPathIds // Store all path IDs
          };
          
          console.log(`Added path ID "${newPathId}" to ${targetNode.type} node ${targetNodeId} via handle "${sourceHandle}". Total paths: ${updatedPathIds.length}`);
        } else {
          console.log(`Path ID "${newPathId}" already exists for node ${targetNodeId}`);
        }
      }
      }); // Close the forEach loop
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
    
    exportToFormat: (format) => {
      const { nodes, edges } = get();
      if (format === 'json') {
        return { nodes, edges };
      }
      // Excel export implementation will be added later
      return null;
    },
    
    clearFlow: () => set((state) => {
      state.nodes = [];
      state.edges = [];
      state.selectedNodeId = null;
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
          // Multiple root nodes - process each topic separately
          console.log('Multiple root nodes detected - processing each topic separately');
          
          // Group nodes by topic
          const nodesByTopic = new Map<string, Node[]>();
          const edgesByTopic = new Map<string, Edge[]>();
          
          rootNodes.forEach(rootNode => {
            const topic = rootNode.data.topic;
            if (!nodesByTopic.has(topic)) {
              nodesByTopic.set(topic, []);
              edgesByTopic.set(topic, []);
            }
            
            // Find all nodes connected to this root (breadth-first search)
            const connectedNodes = new Set<string>();
            const queue = [rootNode.id];
            connectedNodes.add(rootNode.id);
            
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
            
            // Add connected nodes to this topic
            const topicNodes = state.nodes.filter(node => connectedNodes.has(node.id));
            const topicEdges = state.edges.filter(edge => 
              connectedNodes.has(edge.source) && connectedNodes.has(edge.target)
            );
            
            nodesByTopic.set(topic, topicNodes);
            edgesByTopic.set(topic, topicEdges);
          });
          
          // Process each topic separately
          let allUpdatedNodes: Node[] = [];
          
          nodesByTopic.forEach((topicNodes, topic) => {
            const topicEdges = edgesByTopic.get(topic) || [];
            console.log(`Processing topic "${topic}" with ${topicNodes.length} nodes and ${topicEdges.length} edges`);
            
            const result = pathGenerator.recalculatePathIds(topicNodes, topicEdges, topic);
            allUpdatedNodes = allUpdatedNodes.concat(result.nodes);
          });
          
          // Update state with all updated nodes
          state.nodes = allUpdatedNodes as any;
        }
        
        console.log('Path ID propagation completed');
      });
    },
  }))
);