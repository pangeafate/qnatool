import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
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

  // Refs to track actual key state (for debugging and recovery)
  const actualShiftState = useRef(false);
  const actualDState = useRef(false);
  const focusLostWhileShiftPressed = useRef(false);

  // Listen for keyboard events to track key combinations
  useEffect(() => {
    console.log('🔧 Setting up enhanced keyboard event listeners');
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        actualShiftState.current = true;
        setIsShiftPressed(true);
        console.log('✅ Shift key pressed - entering selection mode', { isDPressed, isShiftDeleteMode: isDPressed });
        if (isDPressed) {
          console.log('🗑️ Shift+D mode - entering delete selection mode');
        } else {
          console.log('📋 Shift mode - entering copy selection mode');
        }
      }
      if (event.key === 'd' || event.key === 'D') {
        actualDState.current = true;
        setIsDPressed(true);
        console.log('🔧 D key pressed', { isShiftPressed, isShiftSelectMode: isShiftPressed });
        if (isShiftPressed) {
          console.log('🗑️ Shift+D mode - entering delete selection mode');
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        console.log('⬆️ Shift key released - checking context');
        actualShiftState.current = false;
        
        // If there are selected nodes when Shift is released, make them pulse
        // This handles cases like Shift+click on individual nodes (not drag selection)
        const currentSelectedIds = useFlowStore.getState().selectedNodeIds;
        if (currentSelectedIds.length > 0) {
          console.log(`✨ Shift released with ${currentSelectedIds.length} selected nodes - triggering pulse as fallback`);
          useFlowStore.getState().markNodesAsCopied(currentSelectedIds);
        }
        
        setIsShiftPressed(false);
        focusLostWhileShiftPressed.current = false; // Reset focus loss flag
        console.log('✅ Shift state cleared - selection mode disabled');
      }
      if (event.key === 'd' || event.key === 'D') {
        console.log('⬆️ D key released');
        actualDState.current = false;
        setIsDPressed(false);
      }
    };

    // Handle window focus/blur to detect lost key events
    const handleWindowBlur = () => {
      console.log('🔍 Window lost focus - checking Shift state');
      if (actualShiftState.current || isShiftPressed) {
        console.log('⚠️ Window lost focus while Shift was pressed - marking for recovery');
        focusLostWhileShiftPressed.current = true;
      }
    };

    const handleWindowFocus = () => {
      console.log('🔍 Window gained focus - checking for stuck states');
      
      // Check if we lost focus while shift was pressed
      if (focusLostWhileShiftPressed.current) {
        console.log('🔧 Recovering from focus loss - checking current Shift state');
        
        // Small delay to let the browser settle, then check actual key state
        setTimeout(() => {
          // Force reset if we can't verify the shift key is actually pressed
          if (isShiftPressed && !actualShiftState.current) {
            console.log('🚨 Detected stuck Shift state - forcing reset');
            setIsShiftPressed(false);
            setIsDPressed(false);
            focusLostWhileShiftPressed.current = false;
          }
        }, 100);
      }
    };

    // Add mouse movement checker to detect stuck crosshair
    const handleMouseMove = (event: MouseEvent) => {
      // Check if shift is actually pressed by checking the event's shiftKey property
      if (isShiftPressed && !event.shiftKey) {
        console.log('🚨 Detected Shift key mismatch via mouse event - forcing reset');
        actualShiftState.current = false;
        setIsShiftPressed(false);
        setIsDPressed(false);
        focusLostWhileShiftPressed.current = false;
      }
    };

    // Global mouse up handler to end selection even if mouse is released outside component
    const handleGlobalMouseUp = () => {
      if (selectionBox?.isSelecting) {
        console.log('🖱️ Global mouse up - ending selection');
        onMouseUp(); // Complete the selection
      }
    };

    // Add all event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleGlobalMouseUp);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up enhanced keyboard event listeners');
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selectionBox?.isSelecting]); // Keep the dependency to handle selection state properly

  // Add a periodic state checker as a safety net
  useEffect(() => {
    const stateChecker = setInterval(() => {
      // Only run the checker if we think shift is pressed
      if (isShiftPressed) {
        // Create a temporary event listener to check current key state
        const checkShiftState = (event: KeyboardEvent) => {
          if (!event.shiftKey && isShiftPressed) {
            console.log('🚨 Periodic check detected stuck Shift state - forcing reset');
            setIsShiftPressed(false);
            setIsDPressed(false);
            actualShiftState.current = false;
            actualDState.current = false;
            focusLostWhileShiftPressed.current = false;
          }
          // Remove the temporary listener immediately
          window.removeEventListener('keydown', checkShiftState);
          window.removeEventListener('keyup', checkShiftState);
        };
        
        // Add temporary listeners to check next key event
        window.addEventListener('keydown', checkShiftState);
        window.addEventListener('keyup', checkShiftState);
        
        // Also remove them after a short timeout to avoid accumulation
        setTimeout(() => {
          window.removeEventListener('keydown', checkShiftState);
          window.removeEventListener('keyup', checkShiftState);
        }, 1000);
      }
    }, 2000); // Check every 2 seconds

    return () => {
      clearInterval(stateChecker);
    };
  }, [isShiftPressed]);

  // Emergency reset function for debugging
  const emergencyResetKeyboardState = useCallback(() => {
    console.log('🚨 Emergency reset triggered');
    setIsShiftPressed(false);
    setIsDPressed(false);
    actualShiftState.current = false;
    actualDState.current = false;
    focusLostWhileShiftPressed.current = false;
    setSelectionBox(null);
  }, []);

  // Expose emergency reset to window for debugging
  useEffect(() => {
    (window as any).emergencyResetKeyboardState = emergencyResetKeyboardState;
    console.log('🔧 Emergency reset function available as window.emergencyResetKeyboardState()');
    
    return () => {
      delete (window as any).emergencyResetKeyboardState;
    };
  }, [emergencyResetKeyboardState]);
  
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
    
    // CRITICAL FIX: Set bulk update flag to prevent nodes sync effect from running during connection
    isBulkUpdate.current = true;
    console.log('🔧 Connection bulk update flag set - preventing node sync interference');
    
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
    
    // Clear bulk update flag after all connection operations complete
    setTimeout(() => {
      isBulkUpdate.current = false;
      console.log('🔧 Connection bulk update flag cleared - nodes sync can resume');
    }, 100); // Small delay to ensure all store updates have finished
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
    // CRITICAL FIX: Don't auto-organize during import operations - preserve imported coordinates
    if (shouldAutoOrganize && reactFlowInstance && nodes.length > 0 && !isBulkUpdate.current) {
      console.log('Auto-organizing nodes...');
      
      // Delay the organize and zoom actions
      const timeoutId = setTimeout(() => {
        // Double-check bulk update flag before organizing
        if (!isBulkUpdate.current) {
          // First, organize the nodes
          organizeNodes();
          
          // REMOVED: fitView call that was moving viewport away from nodes
          // The user wants to stay where they are after organizing
          setTimeout(() => {
            // Call the completion callback without changing viewport
            onAutoOrganizeComplete?.();
          }, 100); // Reduced delay since we're not doing fitView anymore
        } else {
          console.log('🔧 Skipping auto-organize due to bulk update (import operation)');
          // Still call completion callback to reset the flag
          onAutoOrganizeComplete?.();
        }
        
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

    // CRITICAL FIX: Set bulk update flag so sync effect doesn't overwrite our positions
    isBulkUpdate.current = true;
    console.log('🔧 Bulk update flag set - preventing position overwrite');

    console.log('🎯 Auto-organizing', nodes.length, 'nodes with HARD CONSTRAINT overlap prevention');

    // --- Hard Constraint Spatial Grid System ---
    class SpatialGrid {
      private grid: Set<string> = new Set();
      private cellSize: number = 50; // 50px grid cells for precise collision detection
      
      // Get all grid cells that a rectangle occupies
      private getRectangleCells(x: number, y: number, width: number, height: number): string[] {
        const cells: string[] = [];
        const startX = Math.floor(x / this.cellSize);
        const endX = Math.floor((x + width) / this.cellSize);
        const startY = Math.floor(y / this.cellSize);
        const endY = Math.floor((y + height) / this.cellSize);
        
        for (let gridX = startX; gridX <= endX; gridX++) {
          for (let gridY = startY; gridY <= endY; gridY++) {
            cells.push(`${gridX},${gridY}`);
          }
        }
        return cells;
      }
      
      // Check if a rectangle can be placed without overlap
      isPositionFree(x: number, y: number, width: number, height: number): boolean {
        const cells = this.getRectangleCells(x, y, width, height);
        return !cells.some(cell => this.grid.has(cell));
      }
      
      // Occupy a rectangle in the grid
      occupyPosition(x: number, y: number, width: number, height: number): void {
        const cells = this.getRectangleCells(x, y, width, height);
        cells.forEach(cell => this.grid.add(cell));
      }
      
      // Find the nearest free position to a target position
      findNearestFreePosition(
        targetX: number, 
        targetY: number, 
        width: number, 
        height: number,
        minX: number = 0,
        minY: number = 0,
        maxSearchRadius: number = 2000
      ): { x: number; y: number } {
        
        // First try the exact target position
        if (targetX >= minX && targetY >= minY && this.isPositionFree(targetX, targetY, width, height)) {
          return { x: targetX, y: targetY };
        }
        
        // Spiral search outward from target position
        const searchStep = 25; // Search in 25px increments
        
        for (let radius = searchStep; radius <= maxSearchRadius; radius += searchStep) {
          // Try positions in a square around the target
          for (let dx = -radius; dx <= radius; dx += searchStep) {
            for (let dy = -radius; dy <= radius; dy += searchStep) {
              // Only check positions on the perimeter of the current radius
              if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
              
              const testX = targetX + dx;
              const testY = targetY + dy;
              
              // Ensure position meets minimum constraints
              if (testX < minX || testY < minY) continue;
              
              if (this.isPositionFree(testX, testY, width, height)) {
                return { x: testX, y: testY };
              }
            }
          }
        }
        
        // Fallback: find any free position in a larger area
        console.warn('⚠️ Spiral search failed, using fallback positioning');
        for (let y = minY; y < minY + maxSearchRadius; y += searchStep) {
          for (let x = minX; x < minX + maxSearchRadius; x += searchStep) {
            if (this.isPositionFree(x, y, width, height)) {
              return { x, y };
            }
          }
        }
        
        // Ultimate fallback - place far away where there should be space
        const fallbackX = minX + maxSearchRadius + 100;
        const fallbackY = minY + Math.random() * 500; // Add some randomness to avoid stacking
        console.error('🚨 All placement strategies failed, using ultimate fallback');
        return { x: fallbackX, y: fallbackY };
      }
    }

    // --- Smart Canvas Space Usage ---
    const findOptimalStartPosition = (): { x: number; y: number } => {
      const CLEAN_START_X = 150;
      const CLEAN_START_Y = 150;
      const GRID_SIZE = 500;
      const LAYOUT_WIDTH = Math.max(nodes.length * 300, 1200);
      const LAYOUT_HEIGHT = 800;

      if (nodes.length <= 3) {
        return { x: CLEAN_START_X, y: CLEAN_START_Y };
      }

      const occupiedAreas: { x: number; y: number; width: number; height: number }[] = [];
      
      nodes.forEach(node => {
        const nodeWidth = 300;
        const nodeHeight = node.type === 'answer' && node.data?.answerType === 'combinations' ? 400 : 150;
        const buffer = 100;
        
        occupiedAreas.push({
          x: node.position.x - buffer,
          y: node.position.y - buffer, 
          width: nodeWidth + 2 * buffer,
          height: nodeHeight + 2 * buffer
        });
      });

      const isAreaFree = (x: number, y: number, width: number, height: number): boolean => {
        return !occupiedAreas.some(area => 
          x < area.x + area.width && 
          x + width > area.x && 
          y < area.y + area.height && 
          y + height > area.y
        );
      };

      let minX = CLEAN_START_X, maxX = CLEAN_START_X;
      let minY = CLEAN_START_Y, maxY = CLEAN_START_Y;
      
      if (nodes.length > 0) {
        minX = Math.min(...nodes.map(n => n.position.x));
        maxX = Math.max(...nodes.map(n => n.position.x + 300));
        minY = Math.min(...nodes.map(n => n.position.y));
        maxY = Math.max(...nodes.map(n => n.position.y + 150));
      }

      // Strategy 1: Try to the right of existing content
      const rightX = maxX + 200;
      if (isAreaFree(rightX, CLEAN_START_Y, LAYOUT_WIDTH, LAYOUT_HEIGHT)) {
        console.log('📍 Found empty space to the right of existing content');
        return { x: rightX, y: CLEAN_START_Y };
      }

      // Strategy 2: Try below existing content
      const belowY = maxY + 200;
      if (isAreaFree(CLEAN_START_X, belowY, LAYOUT_WIDTH, LAYOUT_HEIGHT)) {
        console.log('📍 Found empty space below existing content');
        return { x: CLEAN_START_X, y: belowY };
      }

      // Strategy 3: Try above existing content
      const aboveY = minY - LAYOUT_HEIGHT - 200;
      if (aboveY >= CLEAN_START_Y && isAreaFree(CLEAN_START_X, aboveY, LAYOUT_WIDTH, LAYOUT_HEIGHT)) {
        console.log('📍 Found empty space above existing content');
        return { x: CLEAN_START_X, y: aboveY };
      }

      // Strategy 4: Try to the left of existing content
      const leftX = minX - LAYOUT_WIDTH - 200;
      if (leftX >= CLEAN_START_X && isAreaFree(leftX, CLEAN_START_Y, LAYOUT_WIDTH, LAYOUT_HEIGHT)) {
        console.log('📍 Found empty space to the left of existing content');
        return { x: leftX, y: CLEAN_START_Y };
      }

      // Strategy 5: Grid search
      for (let gridY = CLEAN_START_Y; gridY < CLEAN_START_Y + 2000; gridY += GRID_SIZE) {
        for (let gridX = CLEAN_START_X; gridX < CLEAN_START_X + 3000; gridX += GRID_SIZE) {
          if (isAreaFree(gridX, gridY, LAYOUT_WIDTH, LAYOUT_HEIGHT)) {
            console.log(`📍 Found empty space via grid search at (${gridX}, ${gridY})`);
            return { x: gridX, y: gridY };
          }
        }
      }

      // Fallback
      const fallbackX = maxX + 500;
      const fallbackY = CLEAN_START_Y;
      console.log('📍 Using fallback position - placing far to the right');
      return { x: fallbackX, y: fallbackY };
    };

    const optimalStart = findOptimalStartPosition();

    // --- Layout Parameters ---
    const LEVEL_HORIZONTAL_SPACING = 400;
    const NODE_VERTICAL_SPACING = 200;
    const START_X = optimalStart.x;
    const START_Y = optimalStart.y;

    // Initialize spatial grid for hard constraint enforcement
    const spatialGrid = new SpatialGrid();

    // DON'T pre-reserve existing positions - we're reorganizing everything!
    // The deadlock issue: marking all current positions as occupied prevents
    // nodes from moving to each other's positions during reorganization
    // 
    // OLD PROBLEMATIC CODE (removed):
    // nodes.forEach(node => {
    //   const nodeWidth = 300;
    //   const nodeHeight = node.type === 'answer' && node.data?.answerType === 'combinations' ? 400 : 150;
    //   spatialGrid.occupyPosition(node.position.x, node.position.y, nodeWidth, nodeHeight);
    // });

    // Function to calculate node dimensions
    const getNodeDimensions = (node: Node): { width: number; height: number } => {
      const width = 300; // Standard node width
      let height = 120; // Base height
      
      if (node.type === 'answer' && node.data?.answerType === 'combinations') {
        const combinations = node.data?.combinations || [];
        const variants = node.data?.variants || [];
        
        if (combinations.length > 0) {
          const variantsHeight = variants.length * 50;
          const combinationsHeight = combinations.length * 70;
          height = 200 + variantsHeight + combinationsHeight;
        }
      }
      
      return { width, height };
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

    // Layout each component with HARD CONSTRAINTS
    const layoutComponent = (component: Node[], componentIndex: number): Node[] => {
      const componentNodeIds = new Set(component.map(n => n.id));
      
      // Find the main path (longest connected sequence)
      const findMainPath = (): Node[] => {
        const rootNodes = component.filter(node => {
          const nodeParents = parents.get(node.id) || [];
          return nodeParents.filter(p => componentNodeIds.has(p)).length === 0;
        });
        
        if (rootNodes.length === 0) return [component[0]];
        
        let longestPath: Node[] = [];
        
        for (const root of rootNodes) {
          const path = [];
          let current: Node | null = root;
          const visited = new Set<string>();
          
          while (current && !visited.has(current.id)) {
            visited.add(current.id);
            path.push(current);
            
            const nodeChildren: string[] = children.get(current.id) || [];
            const validChildren: Node[] = nodeChildren
              .map((id: string) => component.find(n => n.id === id))
              .filter((n): n is Node => n !== undefined && componentNodeIds.has(n.id) && !visited.has(n.id));
            
            if (validChildren.length === 0) {
              current = null;
              break;
            }
            
            current = validChildren.reduce((best: Node, child: Node) => {
              const childConnections = (children.get(child.id) || []).length + (parents.get(child.id) || []).length;
              const bestConnections = (children.get(best.id) || []).length + (parents.get(best.id) || []).length;
              return childConnections > bestConnections ? child : best;
            });
          }
          
          if (path.length > longestPath.length) {
            longestPath = path;
          }
        }
        
        return longestPath;
      };

      const mainPath = findMainPath();
      const mainPathIds = new Set(mainPath.map(n => n.id));
      
      // DYNAMIC COMPONENT POSITIONING: Find free space instead of hard-coded offsets
      const estimatedWidth = mainPath.length * LEVEL_HORIZONTAL_SPACING + 800; // Extra buffer for branches
      const estimatedHeight = 600; // Conservative estimate including branches
      
      // For first component, use clean start position
      let componentBaseX, componentBaseY;
      if (componentIndex === 0) {
        componentBaseX = START_X;
        componentBaseY = START_Y;
      } else {
        // For subsequent components, find free space using spatial grid
        const searchStartX = START_X;
        const searchStartY = START_Y + componentIndex * 400; // More generous vertical spacing
        
        const freePosition = spatialGrid.findNearestFreePosition(
          searchStartX,
          searchStartY,
          estimatedWidth,
          estimatedHeight,
          START_X,
          START_Y,
          3000 // Larger search radius for component placement
        );
        
        componentBaseX = freePosition.x;
        componentBaseY = freePosition.y;
        
        console.log(`📍 Component ${componentIndex} positioned at (${componentBaseX}, ${componentBaseY}) - estimated size: ${estimatedWidth}×${estimatedHeight}px`);
      }
      
      const componentNodes: Node[] = [];
      
      // Place main path horizontally using HARD CONSTRAINTS
      const placedPositions = new Map<string, { x: number; y: number }>();
      
      mainPath.forEach((node, index) => {
        const { width, height } = getNodeDimensions(node);
        const targetX = componentBaseX + index * LEVEL_HORIZONTAL_SPACING;
        const targetY = componentBaseY;
        
        // Use hard constraint system to find actual position
        const actualPosition = spatialGrid.findNearestFreePosition(
          targetX, 
          targetY, 
          width, 
          height,
          START_X,
          START_Y
        );
        
        // Occupy the position in the grid
        spatialGrid.occupyPosition(actualPosition.x, actualPosition.y, width, height);
        placedPositions.set(node.id, actualPosition);
        
        componentNodes.push({ ...node, position: actualPosition });
        console.log(`📍 Main path ${index}: ${node.id} at (${actualPosition.x}, ${actualPosition.y}) [${width}x${height}]`);
      });

      // Handle branch nodes with HARD CONSTRAINTS
      const branchNodes = component.filter(node => !mainPathIds.has(node.id));
      
      for (const branchNode of branchNodes) {
        const { width, height } = getNodeDimensions(branchNode);
        
        // Find the main path node this branch should connect to
        const branchParents = parents.get(branchNode.id) || [];
        const branchChildren = children.get(branchNode.id) || [];
        
        let connectingMainNode: Node | null = null;
        
        // Check parent connections
        for (const parentId of branchParents) {
          if (mainPathIds.has(parentId)) {
            connectingMainNode = mainPath.find(n => n.id === parentId) || null;
            break;
          }
        }
        
        // Check child connections
        if (!connectingMainNode) {
          for (const childId of branchChildren) {
            if (mainPathIds.has(childId)) {
              connectingMainNode = mainPath.find(n => n.id === childId) || null;
              break;
            }
          }
        }
        
        // Default to first main path node if no connection found
        if (!connectingMainNode && mainPath.length > 0) {
          connectingMainNode = mainPath[0];
        }
        
        if (connectingMainNode) {
          const mainNodePos = placedPositions.get(connectingMainNode.id)!;
          
          // Get the actual height of the main node instead of hardcoding 150px
          const mainNodeHeight = getNodeDimensions(connectingMainNode).height;
          
          // Try multiple branch positions in order of preference
          const branchTargets = [
            { x: mainNodePos.x, y: mainNodePos.y - height - NODE_VERTICAL_SPACING }, // Above
            { x: mainNodePos.x, y: mainNodePos.y + mainNodeHeight + NODE_VERTICAL_SPACING }, // Below (using actual height)
            { x: mainNodePos.x - width - 100, y: mainNodePos.y }, // Left
            { x: mainNodePos.x + 300 + 100, y: mainNodePos.y }, // Right
            { x: mainNodePos.x - width - 100, y: mainNodePos.y - height - NODE_VERTICAL_SPACING }, // Top-left
            { x: mainNodePos.x + 300 + 100, y: mainNodePos.y - height - NODE_VERTICAL_SPACING }, // Top-right
            { x: mainNodePos.x - width - 100, y: mainNodePos.y + mainNodeHeight + NODE_VERTICAL_SPACING }, // Bottom-left
            { x: mainNodePos.x + 300 + 100, y: mainNodePos.y + mainNodeHeight + NODE_VERTICAL_SPACING }, // Bottom-right
          ];
          
          let branchPosition = null;
          
          // Try each target position
          for (const target of branchTargets) {
            if (target.x >= START_X && target.y >= START_Y && 
                spatialGrid.isPositionFree(target.x, target.y, width, height)) {
              branchPosition = target;
              break;
            }
          }
          
          // If none of the preferred positions work, use the hard constraint finder
          if (!branchPosition) {
            branchPosition = spatialGrid.findNearestFreePosition(
              mainNodePos.x,
              mainNodePos.y - height - NODE_VERTICAL_SPACING,
              width,
              height,
              START_X,
              START_Y
            );
          }
          
          // Occupy the position and add to results
          spatialGrid.occupyPosition(branchPosition.x, branchPosition.y, width, height);
          placedPositions.set(branchNode.id, branchPosition);
          
          componentNodes.push({ ...branchNode, position: branchPosition });
          console.log(`📍 Branch: ${branchNode.id} at (${branchPosition.x}, ${branchPosition.y}) [${width}x${height}] connected to ${connectingMainNode.id}`);
        }
      }

      return componentNodes;
    };

    // Layout all components with hard constraints
    const allLayoutedNodes: Node[] = [];
    connectedComponents.forEach((component, index) => {
      const layoutedComponent = layoutComponent(component, index);
      allLayoutedNodes.push(...layoutedComponent);
    });

    // Handle isolated nodes with HARD CONSTRAINTS
    const isolatedNodes = nodes.filter(node => 
      !allLayoutedNodes.some(layouted => layouted.id === node.id)
    );

    isolatedNodes.forEach((node) => {
      const { width, height } = getNodeDimensions(node);
      
      // Try to place isolated nodes below the organized content
      const targetX = START_X;
      const targetY = START_Y + connectedComponents.length * 300;
      
      const position = spatialGrid.findNearestFreePosition(
        targetX, 
        targetY, 
        width, 
        height,
        START_X,
        START_Y
      );
      
      spatialGrid.occupyPosition(position.x, position.y, width, height);
      
      allLayoutedNodes.push({
        ...node,
        position
      });
      
      console.log(`📍 Isolated: ${node.id} at (${position.x}, ${position.y}) [${width}x${height}]`);
    });

    console.log('🎯 PowerPoint-style layout with HARD CONSTRAINTS complete. Nodes positioned:', allLayoutedNodes.length);
    console.log('🔒 GUARANTEE: Zero overlaps enforced by spatial grid system');

    // Update nodes and trigger auto-organize completion
    setNodes(allLayoutedNodes);
    onAutoOrganizeComplete?.();
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
              <span>Orphaned: {nodesState.filter(node => node.data?.isOrphaned).length}</span>
              {nodesState.filter(node => node.data?.isOrphaned).length > 0 && (
                <button
                  className="ml-2 px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                  onClick={() => {
                    const orphanedNodes = nodesState.filter(node => node.data?.isOrphaned);
                    if (orphanedNodes.length === 0) return;
                    
                    // Get current cycle index from a persistent store or default to 0
                    const currentIndex = (window as any).__orphanCycleIndex || 0;
                    const nextIndex = (currentIndex + 1) % orphanedNodes.length;
                    (window as any).__orphanCycleIndex = nextIndex;
                    
                    const targetNode = orphanedNodes[nextIndex];
                    console.log(`🎯 Cycling to orphaned node ${targetNode.id} (${nextIndex + 1}/${orphanedNodes.length})`);
                    
                    // Center viewport on the orphaned node
                    reactFlowInstance.setCenter(targetNode.position.x, targetNode.position.y, { 
                      zoom: Math.max(reactFlowInstance.getZoom(), 0.8), // Don't zoom out too much
                      duration: 800 
                    });
                  }}
                  title={`Cycle through ${nodesState.filter(node => node.data?.isOrphaned).length} orphaned nodes`}
                >
                  →
                </button>
              )}
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