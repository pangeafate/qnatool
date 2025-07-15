import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  ConnectionMode,
  Panel,
  BackgroundVariant,
  useReactFlow,
} from 'reactflow';
import { useFlowStore } from '../../stores/flowStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import QuestionNode from './nodes/QuestionNode';
import AnswerNode from './nodes/AnswerNode';
import OutcomeNode from './nodes/OutcomeNode';
import { PathIdGenerator } from '../../utils/pathIdGenerator';

const nodeTypes = {
  question: QuestionNode,
  answer: AnswerNode,
  outcome: OutcomeNode,
};

const defaultEdgeOptions = {
  animated: true,
  type: 'smoothstep',
  style: {
    stroke: '#9ca3af', // Light grey by default
    strokeWidth: 2,
  },
};

interface FlowCanvasProps {
  shouldAutoOrganize?: boolean;
  onAutoOrganizeComplete?: () => void;
}

export function FlowCanvas({ shouldAutoOrganize = false, onAutoOrganizeComplete }: FlowCanvasProps) {
  const { 
    nodes, 
    edges, 
    addEdge: storeAddEdge, 
    updateNodePosition, 
    deleteEdge: storeDeleteEdge, 
    propagateTopicOnConnection,
    propagatePathIdOnConnection,
    selectedNodeId,
    selectedEdgeId,
    selectedNodeIds,
    setSelectedEdgeId,
    setSelectedNodeIds,
    clearSelection,
    setNodes,
    focusNodeId,
    clearFocusNode,
    copiedNodeIds
  } = useFlowStore();
  // Process nodes for React Flow (styles will be applied in useEffect)
  const processedNodes = useMemo(() => {
    console.log('🎭 Processing nodes for copied state:', { 
      totalNodes: nodes.length, 
      copiedNodeIds: copiedNodeIds,
      copiedCount: copiedNodeIds.length 
    });
    
    return nodes.map(node => {
      const isCopied = copiedNodeIds.includes(node.id);
      if (isCopied) {
        console.log(`✨ Node ${node.id} will get inline animation styles`);
      }
      return {
        ...node
      };
    });
  }, [nodes, copiedNodeIds]);
  
  const [nodesState, setNodesLocal, onNodesChange] = useNodesState(processedNodes);
  const [edgesState, setEdgesStateLocal, onEdgesChange] = useEdgesState(edges);
  const reactFlowInstance = useReactFlow();

  // Find sibling nodes for minimap highlighting
  const { upstreamSiblings, downstreamSiblings } = useMemo(() => {
    if (selectedNodeIds.length === 0) {
      return { upstreamSiblings: new Set<string>(), downstreamSiblings: new Set<string>() };
    }

    const upstream = new Set<string>();
    const downstream = new Set<string>();

    selectedNodeIds.forEach(selectedId => {
      // Find upstream siblings (nodes that connect TO the selected node)
      edgesState.forEach(edge => {
        if (edge.target === selectedId && !selectedNodeIds.includes(edge.source)) {
          upstream.add(edge.source);
        }
      });

      // Find downstream siblings (nodes that the selected node connects TO)
      edgesState.forEach(edge => {
        if (edge.source === selectedId && !selectedNodeIds.includes(edge.target)) {
          downstream.add(edge.target);
        }
      });
    });

    return { upstreamSiblings: upstream, downstreamSiblings: downstream };
  }, [selectedNodeIds, edgesState]);
  
  // Apply copied node animation via direct DOM manipulation
  React.useEffect(() => {
    console.log('🎨 Applying copied animation to DOM elements directly');
    
    // Apply animation to copied nodes
    copiedNodeIds.forEach(nodeId => {
      const nodeElement = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement;
      if (nodeElement) {
        console.log(`✨ Directly applying copied animation to DOM node ${nodeId}`);
        nodeElement.classList.add('copied');
        nodeElement.style.animation = 'copiedNodePulse 2s ease-in-out 1';
        
        // Add animation end listener to clean up automatically
        const handleAnimationEnd = () => {
          console.log(`🎬 Animation ended for node ${nodeId}, cleaning up`);
          nodeElement.classList.remove('copied');
          nodeElement.style.animation = '';
          nodeElement.removeEventListener('animationend', handleAnimationEnd);
        };
        nodeElement.addEventListener('animationend', handleAnimationEnd);
      } else {
        console.log(`❌ Could not find DOM element for copied node ${nodeId}`);
      }
    });
    
    // Remove animation from nodes that are no longer copied
    const allNodes = document.querySelectorAll('.react-flow__node');
    allNodes.forEach(nodeElement => {
      const nodeId = nodeElement.getAttribute('data-id');
      if (nodeId && !copiedNodeIds.includes(nodeId)) {
        const htmlElement = nodeElement as HTMLElement;
                 if (htmlElement.classList.contains('copied')) {
           console.log(`🧹 Removing copied animation from DOM node ${nodeId} (fallback cleanup)`);
           htmlElement.classList.remove('copied');
           htmlElement.style.animation = '';
         }
      }
    });
    
    // Sync processedNodes with React Flow
    setNodesLocal(processedNodes);
  }, [processedNodes, copiedNodeIds, setNodesLocal]);
  
  // Selection box state
  const [selectionBox, setSelectionBox] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    isSelecting: boolean;
  } | null>(null);

  // Track keyboard state for selection modes
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isDPressed, setIsDPressed] = useState(false);
  
  // Derived states
  const isShiftSelectMode = isShiftPressed && !isDPressed;
  const isShiftDeleteMode = isShiftPressed && isDPressed;
  const isAnySelectionMode = isShiftSelectMode || isShiftDeleteMode;

  // Listen for keyboard events to track key combinations
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftPressed(true);
        if (isDPressed) {
          console.log('Shift+D mode - entering delete selection mode');
        } else {
          console.log('Shift key pressed - entering copy selection mode');
        }
      }
      if (event.key === 'd' || event.key === 'D') {
        setIsDPressed(true);
        if (isShiftPressed) {
          console.log('Shift+D mode - entering delete selection mode');
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        console.log('Shift key released - exiting selection mode');
        
        // If there are selected nodes when Shift is released, make them pulse
        // This handles cases like Shift+click on individual nodes (not drag selection)
        const currentSelectedIds = useFlowStore.getState().selectedNodeIds;
        if (currentSelectedIds.length > 0) {
          console.log(`✨ Shift released with ${currentSelectedIds.length} selected nodes - triggering pulse as fallback`);
          useFlowStore.getState().markNodesAsCopied(currentSelectedIds);
        }
        
        setIsShiftPressed(false);
      }
      if (event.key === 'd' || event.key === 'D') {
        console.log('D key released');
        setIsDPressed(false);
      }
    };

    // Global mouse up handler to end selection even if mouse is released outside component
    const handleGlobalMouseUp = () => {
      if (selectionBox?.isSelecting) {
        console.log('Global mouse up - ending selection');
        onMouseUp(); // Complete the selection
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selectionBox?.isSelecting]);
  
  // Add a ref to track if we're doing a bulk position update (like organize)
  const isBulkUpdate = React.useRef(false);
  const bulkUpdateTimeout = React.useRef<number | null>(null);
  
  useKeyboardShortcuts();

  // Handle focus on node requests
  React.useEffect(() => {
    if (focusNodeId && reactFlowInstance) {
      const nodeToFocus = nodesState.find(node => node.id === focusNodeId);
      if (nodeToFocus) {
        // Center the view on the specific node
        reactFlowInstance.fitView({
          nodes: [nodeToFocus],
          padding: 0.3, // 30% padding around the node
          maxZoom: 1.2, // Don't zoom in too much
          minZoom: 0.5, // Don't zoom out too much
          duration: 800, // Smooth animation
        });
        
        // Clear the focus request after handling it
        setTimeout(() => {
          clearFocusNode();
        }, 100);
      }
    }
  }, [focusNodeId, nodesState, reactFlowInstance, clearFocusNode]);

  // Clean up duplicate edges on mount
  React.useEffect(() => {
    const { cleanupDuplicateEdges } = useFlowStore.getState();
    cleanupDuplicateEdges();
  }, []);

  // Sync nodes while preserving positions (unless it's a bulk update)
  React.useEffect(() => {
    setNodesLocal((currentNodes) => {
      // If it's a bulk update (like organize), use store nodes directly
      if (isBulkUpdate.current) {
        console.log('Bulk update detected - using store positions directly');
        // Don't reset the flag immediately - let it persist for a bit
        return nodes;
      }

      // If we have no current nodes, just use nodes from store
      if (currentNodes.length === 0) {
        return nodes;
      }

      // selectedNodeId is now available from the store destructuring above

      // Identify orphaned nodes based on new rules:
      // 1. All nodes must be connected (have parent and child) except:
      //    - Root question nodes (don't need parent)
      //    - Outcome nodes (don't need child)
      const getOrphanedNodes = () => {
        const nodesWithInboundConnections = new Set<string>();
        const nodesWithOutboundConnections = new Set<string>();
        
        edges.forEach(edge => {
          nodesWithInboundConnections.add(edge.target);
          nodesWithOutboundConnections.add(edge.source);
        });
        
        return nodes.filter(node => {
          // Root question nodes: only need outbound connections
          if (node.type === 'question' && node.data?.isRoot) {
            return !nodesWithOutboundConnections.has(node.id);
          }
          
          // Outcome nodes: only need inbound connections
          if (node.type === 'outcome') {
            return !nodesWithInboundConnections.has(node.id);
          }
          
          // All other nodes (non-root questions, answer nodes): need both inbound and outbound
          const hasInbound = nodesWithInboundConnections.has(node.id);
          const hasOutbound = nodesWithOutboundConnections.has(node.id);
          
          return !hasInbound || !hasOutbound;
        }).map(node => node.id);
      };
      
      const orphanedNodeIds = getOrphanedNodes();

      // Identify orphaned variants (answer variants with no outgoing connections)
      const getOrphanedVariants = () => {
        const orphanedVariants = new Map<string, string[]>(); // nodeId -> [orphaned variant handles]
        
        nodes.forEach(node => {
          if (node.type === 'answer' && node.data?.variants) {
            const variants = node.data.variants;
            const answerType = node.data.answerType || 'single';
            const orphanedHandles: string[] = [];
            
            // Only check variant handles if answer type is 'multiple'
            if (answerType === 'multiple') {
              variants.forEach((_variant: any, index: number) => {
                const variantHandle = `variant-${index}`;
                const hasConnection = edges.some(edge => 
                  edge.source === node.id && edge.sourceHandle === variantHandle
                );
                
                if (!hasConnection) {
                  orphanedHandles.push(variantHandle);
                }
              });
            }
            
            // Only check default handle if answer type is 'single'
            if (answerType === 'single') {
              const hasDefaultConnection = edges.some(edge => 
                edge.source === node.id && edge.sourceHandle === 'default'
              );
              
              if (!hasDefaultConnection) {
                orphanedHandles.push('default');
              }
            }
            
            if (orphanedHandles.length > 0) {
              orphanedVariants.set(node.id, orphanedHandles);
            }
          }
        });
        
        return orphanedVariants;
      };
      
      const orphanedVariants = getOrphanedVariants();

      // Identify parent and child nodes of selected node
      const getRelatedNodes = (selectedId: string | null) => {
        if (!selectedId) return { parents: [], children: [] };
        
        const parents = edges
          .filter(edge => edge.target === selectedId)
          .map(edge => edge.source);
          
        const children = edges
          .filter(edge => edge.source === selectedId)
          .map(edge => edge.target);
          
        return { parents, children };
      };
      
      const { parents, children } = getRelatedNodes(selectedNodeId);

      // For all other cases (add, remove, data change), we merge.
      // We create a map of react-flow's current positions.
      const positionMap = new Map<string, { x: number; y: number }>();
      currentNodes.forEach(node => {
        positionMap.set(node.id, node.position);
      });

      // We return the nodes from the store, but we overwrite their
      // positions with the ones from react-flow's state if they exist.
      return nodes.map(storeNode => {
        const existingPosition = positionMap.get(storeNode.id);
        const existingNode = currentNodes.find(n => n.id === storeNode.id);
        return {
          ...storeNode,
          position: existingPosition || storeNode.position,
          selected: existingNode?.selected || selectedNodeIds.includes(storeNode.id), // Preserve React Flow selection
          data: {
            ...storeNode.data,
            isOrphaned: orphanedNodeIds.includes(storeNode.id),
            isParent: parents.includes(storeNode.id),
            isChild: children.includes(storeNode.id),
            isSelected: selectedNodeId === storeNode.id,
            isMultiSelected: selectedNodeIds.includes(storeNode.id),
            orphanedVariants: orphanedVariants.get(storeNode.id) || []
          }
        };
      });
    });
  }, [nodes, edges, setNodesLocal, selectedNodeId, selectedNodeIds]);

  React.useEffect(() => {
    // Apply edge styling based on selected node and selected edge
    const styledEdges = edges.map(edge => {
      let edgeColor = '#9ca3af'; // Default light grey
      let edgeStyle: any = {
        stroke: edgeColor,
        strokeWidth: 2
      };
      
      // If this specific edge is selected, make it red with red halo
      if (selectedEdgeId === edge.id) {
        edgeColor = '#dc2626'; // Red color for selected edge
        edgeStyle = {
          stroke: edgeColor,
          strokeWidth: 3,
          filter: 'drop-shadow(0 0 16px #dc2626cc)', // Red glow/halo effect
          opacity: 1
        };
      }
      // If a node is selected, color edges connected to it blue with glow effect
      else if (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)) {
        edgeColor = '#2563eb'; // Bright blue for connected edges
        edgeStyle = {
          stroke: edgeColor,
          strokeWidth: 2,
          filter: 'drop-shadow(0 0 16px #2563ebcc)', // More pronounced blue glow/halo effect
          opacity: 1
        };
      }
      
      return {
        ...edge,
        style: {
          ...edge.style,
          ...edgeStyle
        }
      };
    });
    
    setEdgesStateLocal(styledEdges);
  }, [edges, setEdgesStateLocal, selectedNodeId, selectedEdgeId]);

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    
    console.log('Creating edge:', params);
    
    // Get source and target nodes
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);
    
    if (!sourceNode || !targetNode) {
      console.log('Source or target node not found');
      return;
    }
    
    // Connection restrictions based on new rules:
    
    // Rule 2: Answer node exit dots must go to Question nodes or Outcome nodes
    if (sourceNode.type === 'answer' && targetNode.type !== 'question' && targetNode.type !== 'outcome') {
      console.log('Answer nodes can only connect to Question nodes or Outcome nodes');
      return;
    }
    
    // Rule 4: Question node exit dots must go to Answer nodes only
    if (sourceNode.type === 'question' && targetNode.type !== 'answer') {
      console.log('Question nodes can only connect to Answer nodes');
      return;
    }
    
    // Topic validation: Check if source is a root question with duplicate topic
    if (sourceNode.type === 'question' && sourceNode.data?.isRoot) {
      const otherRootNodes = nodes.filter(node => 
        node.data?.isRoot && 
        node.id !== sourceNode.id && 
        node.data.topic === sourceNode.data.topic
      );
      
      if (otherRootNodes.length > 0) {
        console.log(`Cannot create connection: Topic "${sourceNode.data.topic}" already exists on another root question. Please choose a different topic.`);
        return;
      }
    }
    
    // Rule 2: Each answer variant can only have one outgoing connection
    if (sourceNode.type === 'answer') {
      const existingConnection = edges.find(edge => 
        edge.source === params.source && 
        edge.sourceHandle === params.sourceHandle
      );
      
      if (existingConnection) {
        console.log('Answer variant already has a connection. Only one connection per variant is allowed.');
        return;
      }
    }
    
    // Rule 4: Question node can only have one outgoing connection
    if (sourceNode.type === 'question') {
      const existingConnection = edges.find(edge => edge.source === params.source);
      
      if (existingConnection) {
        console.log('Question node already has a connection. Only one outgoing connection is allowed.');
        return;
      }
    }
    
    // REMOVED: No longer restrict question nodes from receiving multiple incoming connections
    // This allows multiple answer nodes in single mode to connect to the same question node
    
    // Check for loop creation
    const wouldCreateLoop = (sourceId: string, targetId: string): boolean => {
      // If source and target are the same, it's a self-loop
      if (sourceId === targetId) return true;
      
      // Check if there's already a path from target to source
      const visited = new Set<string>();
      const stack = [targetId];
      
      while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        
        // If we reach the source from the target, it would create a loop
        if (currentId === sourceId) return true;
        
        // Add all nodes that this node connects to
        const outgoingEdges = edges.filter(edge => edge.source === currentId);
        outgoingEdges.forEach(edge => {
          if (!visited.has(edge.target)) {
            stack.push(edge.target);
          }
        });
      }
      
      return false;
    };
    
    // Prevent loop creation
    if (wouldCreateLoop(params.source, params.target)) {
      console.log('Connection would create a loop, preventing connection');
      return;
    }
    
    // Auto-generate edge ID
    const pathGenerator = PathIdGenerator.getInstance();
    const edge: Edge = {
      ...params,
      source: params.source,
      target: params.target,
      id: pathGenerator.generateEdgeId(params.source, params.target, params.sourceHandle || undefined),
      animated: true,
      type: 'smoothstep',
      style: { 
        stroke: '#9ca3af', // Light grey by default
        strokeWidth: 2 
      }
    };
    
    console.log('Generated edge:', edge);
    storeAddEdge(edge);
    
    // Propagate topic from source to target
    propagateTopicOnConnection(params.source, params.target);
    
    // Propagate path ID from source to target with source handle information
    propagatePathIdOnConnection(params.source, params.target, params.sourceHandle || undefined);
  }, [storeAddEdge, edges, propagateTopicOnConnection, propagatePathIdOnConnection, nodes]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    useFlowStore.getState().setSelectedNodeId(node.id);
  }, []);
  
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
  }, [setSelectedEdgeId]);

  const onPaneClick = useCallback(() => {
    useFlowStore.getState().setSelectedNodeId(null);
    setSelectedEdgeId(null);
    clearSelection();
  }, [setSelectedEdgeId, clearSelection]);

  // Selection box mouse handlers
  const onMouseDown = useCallback((event: React.MouseEvent) => {
    // Start selection if in any selection mode and not clicking on interactive elements
    if (isAnySelectionMode) {
      const target = event.target as HTMLElement;
      const isInteractiveElement = target.closest('button, input, textarea, select, .react-flow__handle, .react-flow__controls, .react-flow__minimap');
      
      if (!isInteractiveElement) {
        console.log(`Starting selection box - ${isShiftDeleteMode ? 'Shift+D delete mode' : 'Shift copy mode'}`);
        event.preventDefault(); // Prevent default panning behavior
        event.stopPropagation(); // Stop event bubbling
        
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setSelectionBox({
          start: { x: event.clientX - rect.left, y: event.clientY - rect.top },
          end: { x: event.clientX - rect.left, y: event.clientY - rect.top },
          isSelecting: true,
        });
      }
    }
  }, [isShiftPressed]);

  const onMouseMove = useCallback((event: React.MouseEvent) => {
    if (selectionBox?.isSelecting) {
      event.preventDefault(); // Prevent default behavior during selection
      event.stopPropagation(); // Stop event bubbling
      
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setSelectionBox(prev => prev ? {
        ...prev,
        end: { x: event.clientX - rect.left, y: event.clientY - rect.top },
      } : null);
    }
  }, [selectionBox?.isSelecting]);

  // Handle mouse up - complete selection box
  const onMouseUp = useCallback((event?: React.MouseEvent) => {
    if (selectionBox && reactFlowInstance) {
      // Prevent the mouse up event from bubbling to onPaneClick
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      const { x: startX, y: startY } = selectionBox.start;
      const { x: endX, y: endY } = selectionBox.end;
      
      // Get the proper coordinates for the selection box
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);
      
      // Only select if the selection box is large enough (avoid accidental tiny selections)
      if (Math.abs(maxX - minX) > 5 || Math.abs(maxY - minY) > 5) {
        // Convert screen coordinates to flow coordinates
        const startFlow = reactFlowInstance.screenToFlowPosition({ x: minX, y: minY });
        const endFlow = reactFlowInstance.screenToFlowPosition({ x: maxX, y: maxY });
        
        console.log('Selection box coordinates:', { startFlow, endFlow });
        
        // Find nodes within the selection box
        const selectedNodes = nodesState.filter(node => {
          const nodeX = node.position.x;
          const nodeY = node.position.y;
          const nodeWidth = node.width || 280;
          const nodeHeight = node.height || 150;
          
          // Check if node overlaps with selection box
          const overlaps = (
            nodeX < endFlow.x && 
            nodeX + nodeWidth > startFlow.x && 
            nodeY < endFlow.y && 
            nodeY + nodeHeight > startFlow.y
          );
          
          if (overlaps) {
            console.log(`Node ${node.id} overlaps: pos(${nodeX}, ${nodeY}) size(${nodeWidth}, ${nodeHeight})`);
          }
          
          return overlaps;
        });

        console.log(`Selected ${selectedNodes.length} nodes:`, selectedNodes.map(n => n.id));
        
                  // Update both our store and React Flow's selection
          const selectedNodeIds = selectedNodes.map(node => node.id);
          
          // Update our store first
          useFlowStore.setState(state => {
            state.selectedNodeIds = selectedNodeIds;
            return state;
          });
          
          console.log(`🎯 Updated selection: store=${selectedNodeIds.length} nodes`);
          
          if (selectedNodeIds.length > 0) {
          if (isShiftDeleteMode) {
            // DELETE MODE: Immediately delete selected nodes
            console.log(`🗑️ Deleting ${selectedNodeIds.length} nodes in Shift+D mode`);
            useFlowStore.getState().deleteNodes(selectedNodeIds);
            console.log(`✅ Successfully deleted ${selectedNodeIds.length} nodes`);
          } else {
            // COPY MODE: Copy nodes to clipboard and mark as copied
            const selectedNodesForCopy = selectedNodes;
            const selectedEdgesForCopy = edgesState.filter(edge => 
              selectedNodeIds.includes(edge.source) && selectedNodeIds.includes(edge.target)
            );
            
            // Update clipboard directly
            useFlowStore.setState(state => {
              state.clipboard.nodes = selectedNodesForCopy;
              state.clipboard.edges = selectedEdgesForCopy;
              console.log('📋 CLIPBOARD UPDATED - Nodes:', state.clipboard.nodes.length, 'Edges:', state.clipboard.edges.length);
              return state;
            });
            
            console.log(`🎯 Auto-copied ${selectedNodesForCopy.length} nodes and ${selectedEdgesForCopy.length} edges to clipboard`);
            
            // Immediately trigger pulse animation for selected nodes
            console.log(`✨ Triggering immediate pulse for ${selectedNodeIds.length} selected nodes`);
            useFlowStore.getState().markNodesAsCopied(selectedNodeIds);
            
            // Additional debugging: Check DOM elements after a short delay
            setTimeout(() => {
              selectedNodeIds.forEach(nodeId => {
                const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
                if (nodeElement) {
                  console.log(`🔍 DOM node ${nodeId} classes:`, nodeElement.className);
                  console.log(`🔍 DOM node ${nodeId} inline style:`, (nodeElement as HTMLElement).style.animation);
                  console.log(`🔍 DOM node ${nodeId} inline boxShadow:`, (nodeElement as HTMLElement).style.boxShadow);
                  console.log(`🔍 DOM node ${nodeId} computed animation:`, window.getComputedStyle(nodeElement).animation);
                } else {
                  console.log(`❌ Could not find DOM element for node ${nodeId}`);
                }
              });
            }, 100);
            
            // Check clipboard after a short delay to see if it gets cleared
            setTimeout(() => {
              const clipboardCheck = useFlowStore.getState().clipboard;
              console.log('📋 CLIPBOARD CHECK (100ms later):', clipboardCheck.nodes.length, 'nodes,', clipboardCheck.edges.length, 'edges');
            }, 100);
          }
        }
        
        // Update our store selection
        setSelectedNodeIds(selectedNodeIds);
        
        // Use React Flow's official setNodes API to update selection state
        if (selectedNodeIds.length > 0) {
          reactFlowInstance.setNodes(nodes => 
            nodes.map(node => ({
              ...node,
              selected: selectedNodeIds.includes(node.id)
            }))
          );
        }
      }
    }
    
    // Always clear selection box on mouse up
    setSelectionBox(null);
  }, [selectionBox, reactFlowInstance, nodesState, edgesState, isShiftDeleteMode]);

  // Handle React Flow's selection changes and sync with our store
  const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: any[] }) => {
    const selectedNodeIds = selectedNodes.map(node => node.id);
    console.log('React Flow selection changed:', selectedNodeIds);
    
    // Only update if the selection actually changed (prevent feedback loops)
    const currentSelectedIds = useFlowStore.getState().selectedNodeIds;
    // Create copies of arrays before sorting to avoid mutating read-only arrays
    const sortedNew = [...selectedNodeIds].sort();
    const sortedCurrent = [...currentSelectedIds].sort();
    if (JSON.stringify(sortedNew) !== JSON.stringify(sortedCurrent)) {
      // Update store without triggering additional React Flow updates
      useFlowStore.setState(state => {
        state.selectedNodeIds = selectedNodeIds;
        return state;
      });
    }
  }, []);

  // Handle node changes - update positions in store when dragged
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    
    // Don't sync positions back to store during bulk updates (like organize)
    if (isBulkUpdate.current) {
      console.log('Skipping position sync during bulk update');
      return;
    }
    
    // Update positions in store for position changes
    changes.forEach((change: any) => {
      if (change.type === 'position' && change.position && updateNodePosition) {
        updateNodePosition(change.id, change.position);
      }
    });
  }, [onNodesChange, updateNodePosition]);

  // Handle edge changes - sync deletions back to store
  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
    
    // Sync edge deletions back to store
    changes.forEach((change: any) => {
      if (change.type === 'remove' && change.id) {
        console.log('Edge deleted:', change.id);
        storeDeleteEdge(change.id);
      }
    });
  }, [onEdgesChange, storeDeleteEdge]);

  // Remove the useImperativeHandle since we're using window instead

  // Store the ReactFlow instance globally for the toolbar to access
  React.useEffect(() => {
    if (reactFlowInstance) {
      (window as any).reactFlowInstance = reactFlowInstance;
    }
    
    return () => {
      if ((window as any).reactFlowInstance === reactFlowInstance) {
        delete (window as any).reactFlowInstance;
      }
    };
  }, [reactFlowInstance]);

  // Store the setBulkUpdate function in window for the toolbar to access
  React.useEffect(() => {
    (window as any).flowCanvasSetBulkUpdate = () => {
      console.log('Setting bulk update flag');
      isBulkUpdate.current = true;
      
      // Clear any existing timeout
      if (bulkUpdateTimeout.current) {
        clearTimeout(bulkUpdateTimeout.current);
      }
      
      // Reset the flag after a delay to ensure all updates complete
      bulkUpdateTimeout.current = setTimeout(() => {
        console.log('Resetting bulk update flag');
        isBulkUpdate.current = false;
        bulkUpdateTimeout.current = null;
      }, 500); // 500ms delay should be enough for all updates to complete
    };
    
    return () => {
      if (bulkUpdateTimeout.current) {
        clearTimeout(bulkUpdateTimeout.current);
      }
      delete (window as any).flowCanvasSetBulkUpdate;
    };
  }, []);

  // Auto-organize logic
  useEffect(() => {
    if (shouldAutoOrganize && reactFlowInstance && nodes.length > 0) {
      console.log('Auto-organizing nodes...');
      
      // Delay the organize and zoom actions
      const timeoutId = setTimeout(() => {
        // First, organize the nodes
        organizeNodes();
        
        // Then zoom out to fit all nodes with some delay
        setTimeout(() => {
          reactFlowInstance.fitView({ 
            padding: 0.2,  // 20% padding around the nodes
            maxZoom: 0.8,  // Don't zoom in more than 80%
            minZoom: 0.1,  // Allow zooming out to 10%
            duration: 1000 // Smooth animation over 1 second
          });
          
          // Call the completion callback
          onAutoOrganizeComplete?.();
        }, 500); // Wait 500ms after organize before zooming
        
      }, 1000); // Wait 1 second before starting (reduced from 2000)
      
      return () => clearTimeout(timeoutId);
    }
  }, [shouldAutoOrganize, reactFlowInstance, nodes.length, onAutoOrganizeComplete]);

  // Smart organize function - uses same algorithm as Toolbar
  const organizeNodes = () => {
    console.log('🎯 PowerPoint-Style Auto-Organize: Starting distribution and alignment...');
    
    if (nodes.length < 2) {
      console.log('Not enough nodes to organize');
      return;
    }

    console.log('🎯 Auto-organizing', nodes.length, 'nodes with PowerPoint-style layout');

    // --- PowerPoint-Style Layout Parameters ---
    const LEVEL_HORIZONTAL_SPACING = 400; // Clean horizontal spacing between levels (left-to-right flow)
    const NODE_VERTICAL_SPACING = 200; // Consistent vertical spacing between nodes at same level
    const BRANCH_SEPARATION = 300; // Extra separation between different branches
    const START_X = 150; // Left margin
    const START_Y = 150; // Top margin
    const MIN_COMPONENT_SEPARATION = 500; // Separation between disconnected components

    // Function to calculate node height for proper spacing
    const getNodeHeight = (node: Node): number => {
      let height = 120; // Base height
      
      if (node.type === 'answer' && node.data?.answerType === 'combinations') {
        const combinations = node.data?.combinations || [];
        const variants = node.data?.variants || [];
        
        if (combinations.length > 0) {
          // Calculate expanded height for combination nodes
          const variantsHeight = variants.length * 50;
          const combinationsHeight = combinations.length * 70;
          height = 200 + variantsHeight + combinationsHeight;
        }
      }
      
      return height;
    };

    // Build graph relationships
    const children = new Map<string, string[]>();
    const parents = new Map<string, string[]>();
    
    nodes.forEach(node => {
      children.set(node.id, []);
      parents.set(node.id, []);
    });
    
    edges.forEach(edge => {
      const parentChildren = children.get(edge.source) || [];
      parentChildren.push(edge.target);
      children.set(edge.source, parentChildren);
      
      const childParents = parents.get(edge.target) || [];
      childParents.push(edge.source);
      parents.set(edge.target, childParents);
    });

    // Find connected components
    const connectedComponents: Node[][] = [];
    const visited = new Set<string>();
    
    const getConnectedComponent = (startNode: Node): Node[] => {
      const component: Node[] = [];
      const stack = [startNode];
      const componentVisited = new Set<string>();
      
      while (stack.length > 0) {
        const node = stack.pop()!;
        if (componentVisited.has(node.id)) continue;
        
        componentVisited.add(node.id);
        visited.add(node.id);
        component.push(node);
        
        // Add connected nodes (both children and parents)
        const nodeChildren = children.get(node.id) || [];
        const nodeParents = parents.get(node.id) || [];
        [...nodeChildren, ...nodeParents].forEach(connectedId => {
          const connectedNode = nodes.find(n => n.id === connectedId);
          if (connectedNode && !componentVisited.has(connectedId)) {
            stack.push(connectedNode);
          }
        });
      }
      
      return component;
    };

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component = getConnectedComponent(node);
        if (component.length > 0) {
          connectedComponents.push(component);
        }
      }
    });

    console.log('🎯 Components found:', connectedComponents.length);

    // Layout each component with PowerPoint-style distribution and alignment
    const layoutComponent = (component: Node[], componentIndex: number): Node[] => {
      const componentNodeIds = new Set(component.map(n => n.id));
      
      // Find root nodes (nodes with no parents within this component)
      const rootNodes = component.filter(node => {
        const nodeParents = parents.get(node.id) || [];
        return nodeParents.filter(p => componentNodeIds.has(p)).length === 0;
      });
      
      if (rootNodes.length === 0 && component.length > 0) {
        // If no clear root, pick the first node
        rootNodes.push(component[0]);
      }

      // Assign levels using BFS from roots
      const nodeLevel = new Map<string, number>();
      const nodesAtLevel = new Map<number, Node[]>();
      const processedNodes = new Set<string>();
      let maxLevel = 0;

      const queue: { node: Node; level: number }[] = [];
      rootNodes.forEach(root => {
        queue.push({ node: root, level: 0 });
        nodeLevel.set(root.id, 0);
      });

      while (queue.length > 0) {
        const { node, level } = queue.shift()!;
        
        if (processedNodes.has(node.id)) continue;
        processedNodes.add(node.id);
        
        maxLevel = Math.max(maxLevel, level);
        
        const levelNodes = nodesAtLevel.get(level) || [];
        levelNodes.push(node);
        nodesAtLevel.set(level, levelNodes);
        
        // Add children to next level
        const nodeChildren = children.get(node.id) || [];
        nodeChildren.forEach(childId => {
          if (componentNodeIds.has(childId) && !processedNodes.has(childId)) {
            const childNode = component.find(n => n.id === childId);
            if (childNode) {
              queue.push({ node: childNode, level: level + 1 });
              nodeLevel.set(childId, level + 1);
            }
          }
        });
      }

      // Calculate component bounds and positioning
      const componentBaseX = START_X + componentIndex * MIN_COMPONENT_SEPARATION;
      const componentNodes: Node[] = [];

      // Position nodes level by level with PowerPoint-style distribution
      for (let level = 0; level <= maxLevel; level++) {
        const levelNodes = nodesAtLevel.get(level) || [];
        
        if (levelNodes.length === 0) continue;

        // Calculate level X position (left-to-right flow)
        const levelX = componentBaseX + level * LEVEL_HORIZONTAL_SPACING;

        // Calculate total height needed for this level
        const totalHeightNeeded = levelNodes.reduce((sum, node) => {
          return sum + getNodeHeight(node) + NODE_VERTICAL_SPACING;
        }, -NODE_VERTICAL_SPACING); // Remove last spacing

        // Start Y position to center the level vertically
        let currentY = START_Y + componentIndex * 100; // Slight offset per component

        // Position each node in the level with perfect distribution
        levelNodes.forEach((node, index) => {
          const nodeHeight = getNodeHeight(node);
          
          // Perfect vertical distribution within the level
          if (levelNodes.length === 1) {
            // Single node - center it
            currentY = START_Y + componentIndex * 100 + level * 50;
          } else {
            // Multiple nodes - distribute evenly
            currentY = START_Y + componentIndex * 100 + index * (NODE_VERTICAL_SPACING + nodeHeight);
          }

          const position = {
            x: levelX,
            y: currentY
          };

          componentNodes.push({
            ...node,
            position
          });

          console.log(`📍 Level ${level}, Node ${index}: ${node.id} positioned at (${levelX}, ${currentY})`);
        });
      }

      return componentNodes;
    };

    // Layout all components
    const allLayoutedNodes: Node[] = [];
    connectedComponents.forEach((component, index) => {
      const layoutedComponent = layoutComponent(component, index);
      allLayoutedNodes.push(...layoutedComponent);
    });

    // Handle isolated nodes
    const isolatedNodes = nodes.filter(node => 
      !allLayoutedNodes.some(layouted => layouted.id === node.id)
    );

    isolatedNodes.forEach((node, index) => {
      allLayoutedNodes.push({
        ...node,
        position: {
          x: START_X + index * 300,
          y: START_Y + connectedComponents.length * 200
        }
      });
    });

    console.log('🎯 PowerPoint-style layout complete. Nodes positioned:', allLayoutedNodes.length);

    // Apply the new positions
    setNodes(allLayoutedNodes);
  };

  // Handle minimap click for teleportation
  const onMinimapClick = useCallback((_event: React.MouseEvent, position: { x: number; y: number }) => {
    if (reactFlowInstance) {
      reactFlowInstance.setCenter(position.x, position.y, { zoom: reactFlowInstance.getZoom() });
    }
  }, [reactFlowInstance]);

  return (
    <div className={`w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 ${isAnySelectionMode ? 'cursor-crosshair' : ''}`}>
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={defaultEdgeOptions}
        className={`bg-transparent ${isAnySelectionMode ? 'selection-mode' : ''}`}
        nodesDraggable={!isAnySelectionMode}
        nodesConnectable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        panOnDrag={!isAnySelectionMode}
        panOnScroll={true}
        panOnScrollSpeed={0.5}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        panActivationKeyCode={null}
        multiSelectionKeyCode={null}
        selectionKeyCode={null}
        deleteKeyCode={null}
      >
        <Background 
          variant={BackgroundVariant.Dots}
          gap={16} 
          size={1} 
          color="#e5e7eb"
        />
        <Controls className="bg-white shadow-lg rounded-lg border border-gray-200" />
        <MiniMap 
          className="bg-white shadow-lg rounded-lg border border-gray-200"
          nodeColor={(node: Node) => {
            // Selected nodes - bright colors with high contrast
            if (selectedNodeIds.includes(node.id)) {
              switch (node.type) {
                case 'question': return '#1e40af'; // Dark blue for better contrast
                case 'answer': return '#6b21a8'; // Dark purple for better contrast
                case 'outcome': return '#15803d'; // Dark green for better contrast
                default: return '#374151';
              }
            }
            
            // Upstream siblings (parent nodes) - orange theme for visibility
            if (upstreamSiblings.has(node.id)) {
              switch (node.type) {
                case 'question': return '#ea580c'; // Orange-blue
                case 'answer': return '#dc2626'; // Orange-red
                case 'outcome': return '#f59e0b'; // Orange-yellow
                default: return '#f97316'; // Pure orange
              }
            }
            
            // Downstream siblings (child nodes) - purple theme for visibility
            if (downstreamSiblings.has(node.id)) {
              switch (node.type) {
                case 'question': return '#7c3aed'; // Purple
                case 'answer': return '#9333ea'; // Bright purple
                case 'outcome': return '#a855f7'; // Light purple
                default: return '#8b5cf6'; // Medium purple
              }
            }
            
            // Default colors for non-related nodes (muted)
            if (node.data?.isOrphaned) return '#fb923c'; // Orange for orphaned nodes
            switch (node.type) {
              case 'question': return '#94a3b8'; // Muted blue
              case 'answer': return '#cbd5e1'; // Muted purple
              case 'outcome': return '#d1d5db'; // Muted green
              default: return '#e5e7eb'; // Very muted gray
            }
          }}
          maskColor="rgba(255, 255, 255, 0.9)"
          pannable={true}
          zoomable={true}
          onClick={onMinimapClick}
        />
        
        {/* Flow Stats Panel */}
        <Panel position="top-right" className="bg-white p-3 rounded-lg shadow-lg">
          <div className="text-sm font-semibold text-gray-700 mb-2">Flow Stats</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span>Questions: {nodesState.filter(node => node.type === 'question').length}</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              <span>Answers: {nodesState.filter(node => node.type === 'answer').length}</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Outcomes: {nodesState.filter(node => node.type === 'outcome').length}</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
              <span>Connections: {edgesState.length}</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              <span>Orphaned: {nodesState.filter(node => !edgesState.some(edge => edge.source === node.id || edge.target === node.id)).length}</span>
            </div>
          </div>
        </Panel>
        

        

        
        {/* Selection Box */}
        {selectionBox?.isSelecting && (
          <div
            className="absolute pointer-events-none border-2 border-blue-500 bg-blue-200 bg-opacity-20 z-10"
            style={{
              left: Math.min(selectionBox.start.x, selectionBox.end.x),
              top: Math.min(selectionBox.start.y, selectionBox.end.y),
              width: Math.abs(selectionBox.end.x - selectionBox.start.x),
              height: Math.abs(selectionBox.end.y - selectionBox.start.y),
            }}
          />
        )}
      </ReactFlow>
    </div>
  );
}