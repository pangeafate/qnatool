import React, { useCallback, useEffect } from 'react';
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
    setNodes,
    focusNodeId,
    clearFocusNode
  } = useFlowStore();
  const [nodesState, setNodesLocal, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdgesLocal, onEdgesChange] = useEdgesState(edges);
  const reactFlowInstance = useReactFlow();
  
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
        return {
          ...storeNode,
          position: existingPosition || storeNode.position,
          data: {
            ...storeNode.data,
            isOrphaned: orphanedNodeIds.includes(storeNode.id),
            isParent: parents.includes(storeNode.id),
            isChild: children.includes(storeNode.id),
            isSelected: selectedNodeId === storeNode.id,
            orphanedVariants: orphanedVariants.get(storeNode.id) || []
          }
        };
      });
    });
  }, [nodes, edges, setNodesLocal, selectedNodeId]);

  React.useEffect(() => {
    // Apply edge styling based on selected node
    const styledEdges = edges.map(edge => {
      let edgeColor = '#9ca3af'; // Default light grey
      let edgeStyle: any = {
        stroke: edgeColor,
        strokeWidth: 2
      };
      
      // If a node is selected, color edges connected to it blue with glow effect
      if (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)) {
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
    
    setEdgesLocal(styledEdges);
  }, [edges, setEdgesLocal, selectedNodeId]);

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

  const onPaneClick = useCallback(() => {
    useFlowStore.getState().setSelectedNodeId(null);
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

  // Organize function (copied from Toolbar)
  const organizeNodes = () => {
    console.log('Organizing nodes...');
    
    if (nodes.length < 2) {
      console.log('Not enough nodes to organize');
      return;
    }

    // Layout parameters
    const horizontalSpacing = 400;
    const verticalSpacing = 420;
    const startX = 150;
    const startY = 150;
    const maxNodesPerRow = 4;
    
    // Build adjacency maps for parent-child relationships
    const children = new Map<string, string[]>();
    const parents = new Map<string, string>();
    const incomingEdges = new Map<string, number>();
    
    // Initialize maps
    nodes.forEach(node => {
      children.set(node.id, []);
      incomingEdges.set(node.id, 0);
    });
    
    // Build parent-child relationships from edges
    edges.forEach(edge => {
      const parentChildren = children.get(edge.source) || [];
      parentChildren.push(edge.target);
      children.set(edge.source, parentChildren);
      
      parents.set(edge.target, edge.source);
      
      const incoming = incomingEdges.get(edge.target) || 0;
      incomingEdges.set(edge.target, incoming + 1);
    });
    
    // Find root nodes (nodes with no incoming edges)
    const rootNodes = nodes.filter(node => (incomingEdges.get(node.id) || 0) === 0);
    
    // If no root nodes, use the first node as root
    if (rootNodes.length === 0 && nodes.length > 0) {
      rootNodes.push(nodes[0]);
    }
    
    // Assign levels using BFS
    const nodeLevel = new Map<string, number>();
    const nodesAtLevel = new Map<number, Node[]>();
    const visited = new Set<string>();
    let maxLevel = 0;
    
    // BFS to assign levels
    const queue: { node: Node; level: number }[] = [];
    rootNodes.forEach(node => {
      queue.push({ node, level: 0 });
      nodeLevel.set(node.id, 0);
    });
    
    while (queue.length > 0) {
      const { node, level } = queue.shift()!;
      
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      
      maxLevel = Math.max(maxLevel, level);
      
      // Add node to its level
      const levelNodes = nodesAtLevel.get(level) || [];
      levelNodes.push(node);
      nodesAtLevel.set(level, levelNodes);
      
      // Process children (go to next level)
      const nodeChildren = children.get(node.id) || [];
      nodeChildren.forEach(childId => {
        const childNode = nodes.find(n => n.id === childId);
        if (childNode && !visited.has(childId)) {
          queue.push({ node: childNode, level: level + 1 });
          nodeLevel.set(childId, level + 1);
        }
      });
    }
    
    // Create a flat ordered list maintaining hierarchy
    const orderedNodes: Node[] = [];
    for (let level = 0; level <= maxLevel; level++) {
      const levelNodes = nodesAtLevel.get(level) || [];
      orderedNodes.push(...levelNodes);
    }
    
    // Add unconnected nodes at the end
    const unconnectedNodes = nodes.filter(n => !visited.has(n.id));
    orderedNodes.push(...unconnectedNodes);
    
    // Position nodes in a compact grid with wrapping
    const updatedNodes = orderedNodes.map((node, index) => {
      const row = Math.floor(index / maxNodesPerRow);
      const col = index % maxNodesPerRow;
      
      // Calculate position with proper centering
      const totalCols = Math.min(orderedNodes.length, maxNodesPerRow);
      const currentRowNodeCount = Math.min(orderedNodes.length - row * maxNodesPerRow, maxNodesPerRow);
      
      // Center each row
      const rowWidth = (currentRowNodeCount - 1) * horizontalSpacing;
      const totalWidth = (totalCols - 1) * horizontalSpacing;
      const rowStartX = startX + (totalWidth - rowWidth) / 2;
      
      const newPosition = {
        x: rowStartX + col * horizontalSpacing,
        y: startY + row * verticalSpacing
      };
      
      return {
        ...node,
        position: newPosition
      };
    });
    
    // Set bulk update flag BEFORE updating nodes
    if ((window as any).flowCanvasSetBulkUpdate) {
      (window as any).flowCanvasSetBulkUpdate();
    }
    
    // Update nodes in store
    setTimeout(() => {
      setNodes(updatedNodes);
      console.log('Organization complete!');
    }, 50);
  };

  // Handle minimap click for teleportation
  const onMinimapClick = useCallback((_event: React.MouseEvent, position: { x: number; y: number }) => {
    if (reactFlowInstance) {
      reactFlowInstance.setCenter(position.x, position.y, { zoom: reactFlowInstance.getZoom() });
    }
  }, [reactFlowInstance]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100">
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={defaultEdgeOptions}
        className="bg-transparent"
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        panOnDrag={true}
        panOnScroll={true}
        panOnScrollSpeed={0.5}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        panActivationKeyCode={null}
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
          nodeColor={(node) => {
            if (node.data?.isOrphaned) return '#fb923c'; // Orange for orphaned nodes
            switch (node.type) {
              case 'question': return '#2563eb';
              case 'answer': return '#8b5cf6';
              case 'outcome': return '#22c55e';
              default: return '#9ca3af';
            }
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
          pannable={true}
          zoomable={true}
          onClick={onMinimapClick}
        />
        
        {/* Custom Panel for Stats */}
        <Panel position="top-right" className="bg-white/95 backdrop-blur shadow-lg rounded-lg p-4 m-4 border border-gray-200">
          <div className="text-sm space-y-1">
            <div className="font-semibold text-gray-700 mb-2">Flow Stats</div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Questions: {nodesState.filter(n => n.type === 'question').length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Answers: {nodesState.filter(n => n.type === 'answer').length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Outcomes: {nodesState.filter(n => n.type === 'outcome').length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Connections: {edgesState.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>Orphaned: {nodesState.filter(n => n.data?.isOrphaned).length}</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}