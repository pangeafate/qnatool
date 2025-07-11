import React, { useCallback } from 'react';
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

export function FlowCanvas() {
  const { nodes, edges, addEdge: storeAddEdge, updateNodePosition, deleteEdge: storeDeleteEdge, propagateTopicOnConnection, selectedNodeId } = useFlowStore();
  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);
  
  // Add a ref to track if we're doing a bulk position update (like organize)
  const isBulkUpdate = React.useRef(false);
  const bulkUpdateTimeout = React.useRef<number | null>(null);
  
  useKeyboardShortcuts();

  // Clean up duplicate edges on mount
  React.useEffect(() => {
    const { cleanupDuplicateEdges } = useFlowStore.getState();
    cleanupDuplicateEdges();
  }, []);

  // Sync nodes while preserving positions (unless it's a bulk update)
  React.useEffect(() => {
    setNodes((currentNodes) => {
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
  }, [nodes, edges, setNodes, selectedNodeId]);

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
    
    setEdges(styledEdges);
  }, [edges, setEdges, selectedNodeId]);

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
  }, [storeAddEdge, edges, propagateTopicOnConnection, nodes]);

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
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        preventScrolling={false}
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
          pannable
          zoomable
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