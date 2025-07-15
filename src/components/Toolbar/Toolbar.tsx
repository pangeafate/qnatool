import { useState, useEffect, useRef } from 'react';
import { Node } from 'reactflow';
import { Download, Upload, Database, Trash2, Layout, HelpCircle, MessageSquare, Target, Share2, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { PathIdGenerator } from '../../utils/pathIdGenerator';
import { ExportService } from '../../services/exportService';
import { useFlowStore } from '../../stores/flowStore';
import { ImportUtils, ImportResult } from '../../utils/importUtils';
import { ImportFeedbackModal } from '../ImportFeedbackModal/ImportFeedbackModal';

interface ToolbarProps {
  onAddNode?: (node: Node) => void;
  onLoadDemo?: () => void;
  onClearAll?: () => void;
  onSetNodes?: (nodes: Node[]) => void;
  nodes?: Node[];
}

export function Toolbar({ onAddNode, onLoadDemo, onClearAll, onSetNodes, nodes = [] }: ToolbarProps) {
  const { setEdges, edges, nodes: storeNodes, setNodes, propagatePathToAll, toggleAllMeta, pathDisplaysFolded, combinationSectionsFolded } = useFlowStore();
  
  // State for dropdown
  const [questionDropdownOpen, setQuestionDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as HTMLElement)) {
        setQuestionDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Use store nodes if prop nodes are empty/not provided
  const actualNodes = nodes.length > 0 ? nodes : storeNodes;
  
  // State for import feedback modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [preImportState, setPreImportState] = useState<{ nodes: Node[], edges: any[] } | null>(null);

  const getNextPosition = () => {
    // Try to get the ReactFlow instance from the global reference
    const reactFlowInstance = (window as any).reactFlowInstance;
    
    let centerX = 400; // Default fallback
    let centerY = 300; // Default fallback
    
    if (reactFlowInstance) {
      try {
        // Get the viewport center by converting screen center to flow position
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate screen center position
        const screenCenter = {
          x: viewportWidth / 2,
          y: viewportHeight / 2
        };
        
        // Convert screen position to flow position
        const flowCenter = reactFlowInstance.screenToFlowPosition(screenCenter);
        centerX = flowCenter.x;
        centerY = flowCenter.y;
      } catch (error) {
        console.warn('Failed to get viewport center, using fallback position:', error);
        // Fall back to default values
      }
    }
    
    // If no nodes exist, place at center
    if (actualNodes.length === 0) {
      return { x: centerX, y: centerY };
    }
    
    // For subsequent nodes, use a small spiral pattern around center to avoid overlaps
    const existingPositions = actualNodes.map(node => node.position);
    const offset = 100; // Distance between nodes
    
    // Try positions in a spiral pattern around center
    for (let radius = 0; radius < 500; radius += offset) {
      for (let angle = 0; angle < 360; angle += 45) {
        const radians = (angle * Math.PI) / 180;
        const x = centerX + radius * Math.cos(radians);
        const y = centerY + radius * Math.sin(radians);
        
        // Check if this position is too close to existing nodes
        const tooClose = existingPositions.some(pos => {
          const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
          return distance < offset;
        });
        
        if (!tooClose) {
          return { x, y };
        }
      }
    }
    
    // If we can't find a good position, just place it at center with some random offset
    return { 
      x: centerX + Math.random() * 100 - 50, 
      y: centerY + Math.random() * 100 - 50 
    };
  };

  // Smart topic generation that avoids duplicates
  const generateUniqueTopicName = (baseName?: string): string => {
    // Get the most up-to-date nodes from the store
    const { nodes: currentNodes } = useFlowStore.getState();
    const existingTopics = currentNodes
      .filter(node => node.data?.isRoot)
      .map(node => node.data.topic)
      .filter(topic => topic); // Filter out undefined/null topics

    // If no base name provided, use TOPIC-X format
    if (!baseName) {
      let counter = 1;
      let candidateTopic = `TOPIC-${counter}`;
      
      while (existingTopics.includes(candidateTopic)) {
        counter++;
        candidateTopic = `TOPIC-${counter}`;
      }
      
      return candidateTopic;
    }

    // If base name provided, ensure it's unique
    let candidateTopic = baseName;
    let counter = 1;
    
    while (existingTopics.includes(candidateTopic)) {
      counter++;
      candidateTopic = `${baseName}-${counter}`;
    }
    
    return candidateTopic;
  };

  // const addQuestionNode = () => {
  //   const pathGenerator = PathIdGenerator.getInstance();
  //   const position = getNextPosition();
  //   
  //   // Generate unique topic for each root question
  //   const topic = generateUniqueTopicName();
  //   
  //   // Generate proper path ID for root question
  //   const questionNumber = pathGenerator.getNextQuestionNumber(null, topic);
  //   const pathId = pathGenerator.generateQuestionPathId(null, questionNumber, topic);
  //   
  //   const questionNode: Node = {
  //     id: `q-${Date.now()}`,
  //     type: 'question',
  //     position,
  //     data: {
  //       pathId,
  //       topic,
  //       isRoot: true,
  //       questionText: 'New Root Question',
  //       questionLevel: 1,
  //       elementId: 'NEW',
  //       subElementId: 'NEW',
  //     }
  //   };
  //   
  //   // Register the node in the path generator
  //   pathGenerator.registerNode(questionNode.id, pathId);
  //   
  //   onAddNode?.(questionNode);
  // };

  const addRootQuestionNode = () => {
    const pathGenerator = PathIdGenerator.getInstance();
    const position = getNextPosition();
    
    // Generate unique topic for each root question
    const topic = generateUniqueTopicName();
    
    // Generate proper path ID for root question
    const questionNumber = pathGenerator.getNextQuestionNumber(null, topic);
    const pathId = pathGenerator.generateQuestionPathId(null, questionNumber, topic);
    
    const questionNode: Node = {
      id: `q-${Date.now()}`,
      type: 'question',
      position,
      data: {
        pathId,
        topic,
        isRoot: true,
        questionText: 'New Root Question',
        questionLevel: 1,
        elementId: 'NEW',
        subElementId: 'NEW',
      }
    };
    
    // Register the node in the path generator
    pathGenerator.registerNode(questionNode.id, pathId);
    
    onAddNode?.(questionNode);
    setQuestionDropdownOpen(false);
  };

  const addRegularQuestionNode = () => {
    const pathGenerator = PathIdGenerator.getInstance();
    const position = getNextPosition();
    
    // For regular questions, create a standalone question without root properties
    const pathId = `STANDALONE-Q${Date.now()}`;
    
    const questionNode: Node = {
      id: `q-${Date.now()}`,
      type: 'question',
      position,
      data: {
        pathId,
        topic: 'STANDALONE',
        isRoot: false,
        questionText: 'New Regular Question',
        questionLevel: 1,
        elementId: 'NEW',
        subElementId: 'NEW',
      }
    };
    
    // Register the node in the path generator
    pathGenerator.registerNode(questionNode.id, pathId);
    
    onAddNode?.(questionNode);
    setQuestionDropdownOpen(false);
  };

  const addAnswerNode = () => {
    const pathGenerator = PathIdGenerator.getInstance();
    const position = getNextPosition();
    
    // Generate proper sequential path ID for standalone answer node
    const answerNumber = pathGenerator.getNextAnswerNumber('STANDALONE');
    const pathId = `STANDALONE-A${answerNumber}`;
    
    const answerNode: Node = {
      id: `a-${Date.now()}`,
      type: 'answer',
      position,
      data: {
        pathId,
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
    
    onAddNode?.(answerNode);
  };

  const addOutcomeNode = () => {
    const pathGenerator = PathIdGenerator.getInstance();
    const position = getNextPosition();
    
    // Generate proper sequential path ID for standalone outcome node
    const outcomeNumber = pathGenerator.getNextOutcomeNumber('STANDALONE');
    const pathId = `STANDALONE-E${outcomeNumber}`;
    
    const outcomeNode: Node = {
      id: `o-${Date.now()}`,
      type: 'outcome',
      position,
      data: {
        pathId,
        recommendation: 'Enter your recommendation here...',
        topic: 'General'
      }
    };
    
    onAddNode?.(outcomeNode);
  };

  const exportFlow = () => {
    const state = useFlowStore.getState();
    const exportService = new ExportService();
    
    // Export using the new hierarchical format
    const exportData = exportService.exportToJson(actualNodes, state.edges);
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-${exportData.metadata.topic}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFlow = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const jsonData = JSON.parse(e.target?.result as string);
            
            let importedNodes: Node[] = [];
            let importedEdges: any[] = [];
            
            // Check if it's the new format
            if (jsonData.metadata && jsonData.nodes && jsonData.navigation) {
              // New hierarchical format
              const exportService = new ExportService();
              const result = exportService.importFromJson(jsonData);
              importedNodes = result.nodes;
              importedEdges = result.edges;
            } else if (jsonData.nodes && jsonData.edges) {
              // Legacy format
              importedNodes = jsonData.nodes;
              importedEdges = jsonData.edges;
            } else {
              console.error('Invalid file format');
              return;
            }
            
            // Store current state for potential revert
            setPreImportState({
              nodes: [...actualNodes],
              edges: [...edges]
            });
            
            // Perform additive import with conflict resolution
            const result = ImportUtils.performAdditiveImport(
              actualNodes,
              edges,
              importedNodes,
              importedEdges
            );
            
            // Set bulk update flag before updating nodes
            if ((window as any).flowCanvasSetBulkUpdate) {
              (window as any).flowCanvasSetBulkUpdate();
            }
            
            // Apply the import result
            onSetNodes?.(result.nodes);
            setEdges(result.edges);
            
            // Show feedback modal
            setImportResult(result);
            setShowImportModal(true);
            
          } catch (error) {
            console.error('Error importing flow:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const loadDemo = () => {
    onLoadDemo?.();
  };

  const clearAll = () => {
    onClearAll?.();
  };

  const propagatePaths = () => {
    propagatePathToAll();
  };

  const organizeNodes = () => {
    console.log('🎯 Smart Organize: Starting advanced layout algorithm...');
    console.log('actualNodes:', actualNodes);
    console.log('actualNodes.length:', actualNodes.length);
    
    if (actualNodes.length < 2) {
      console.log('Not enough nodes to organize');
      return;
    }

    console.log('🎯 Organizing', actualNodes.length, 'nodes with smart layout');

    // --- Advanced Smart Layout Algorithm ---
    
    // 1. Enhanced layout parameters with dynamic vertical spacing for combinations
    const horizontalSpacing = 650; // Increased by 30% from 500 for better balance
    const startY = 200;
    const baseLayerVerticalSpacing = 455; // Base minimum spacing between hierarchy levels
    const siblingHorizontalSpacing = 156; // Increased by 30% from 120 - extra spacing for direct connections
    const minNodeSpacing = 150; // Minimum spacing between any two nodes
    
    // Function to calculate dynamic spacing based on node content
    const calculateNodeHeight = (node: Node) => {
      let baseHeight = 100; // Default node height
      
      console.log(`📏 Checking node ${node.id}:`, {
        type: node.type,
        answerType: node.data?.answerType,
        combinationsCount: node.data?.combinations?.length || 0,
        variantsCount: node.data?.variants?.length || 0,
        combinationSectionsFolded
      });
      
      if (node.type === 'answer' && node.data?.answerType === 'combinations') {
        const combinations = node.data?.combinations || [];
        const variants = node.data?.variants || [];
        
        // Always calculate for combination nodes regardless of fold state during organize
        // (we want proper spacing even if they're currently folded but could be expanded)
        if (combinations.length > 0) {
          // More accurate height estimates based on actual UI:
          // Each variant takes ~50px when expanded (including padding)
          const variantsHeight = variants.length * 50;
          // Header section for combinations: ~100px
          const combinationsHeaderHeight = 100;
          // Each combination row with status takes ~70px (including borders, padding)
          const combinationsHeight = combinations.length * 70;
          // Base node padding and structure: ~150px
          const baseStructureHeight = 150;
          
          baseHeight = baseStructureHeight + variantsHeight + combinationsHeaderHeight + combinationsHeight;
          
          console.log(`📏 Height calculation for ${node.id}:`, {
            variants: variants.length,
            combinations: combinations.length,
            variantsHeight,
            combinationsHeaderHeight,
            combinationsHeight,
            totalHeight: baseHeight
          });
        }
      }
      
      return baseHeight;
    };
    
    // 2. Build comprehensive graph analysis
    const children = new Map<string, string[]>(); // parent -> [children]
    const parents = new Map<string, string[]>(); // child -> [parents]
    const incomingEdges = new Map<string, number>();
    const outgoingEdges = new Map<string, number>();
    const directConnections = new Map<string, Set<string>>(); // bidirectional connections
    
    // Initialize maps
    actualNodes.forEach(node => {
      children.set(node.id, []);
      parents.set(node.id, []);
      incomingEdges.set(node.id, 0);
      outgoingEdges.set(node.id, 0);
      directConnections.set(node.id, new Set());
    });
    
    // Build relationship maps from edges
    edges.forEach(edge => {
      // Children relationship
      const parentChildren = children.get(edge.source) || [];
      parentChildren.push(edge.target);
      children.set(edge.source, parentChildren);
      
      // Parents relationship
      const childParents = parents.get(edge.target) || [];
      childParents.push(edge.source);
      parents.set(edge.target, childParents);
      
      // Edge counts
      const incoming = incomingEdges.get(edge.target) || 0;
      incomingEdges.set(edge.target, incoming + 1);
      
      const outgoing = outgoingEdges.get(edge.source) || 0;
      outgoingEdges.set(edge.source, outgoing + 1);
      
      // Direct connections (bidirectional)
      directConnections.get(edge.source)?.add(edge.target);
      directConnections.get(edge.target)?.add(edge.source);
    });
    
    console.log('🎯 Graph analysis:', { children, parents, directConnections });
    
    // 3. Find connected components for grouping
    const connectedComponents: Node[][] = [];
    const visited = new Set<string>();
    
    const findComponent = (startNode: Node): Node[] => {
      const component: Node[] = [];
      const stack = [startNode];
      const componentVisited = new Set<string>();
      
      while (stack.length > 0) {
        const node = stack.pop()!;
        if (componentVisited.has(node.id)) continue;
        
        componentVisited.add(node.id);
        visited.add(node.id);
        component.push(node);
        
        // Add all connected nodes
        const connections = directConnections.get(node.id) || new Set();
        connections.forEach(connectedId => {
          const connectedNode = actualNodes.find(n => n.id === connectedId);
          if (connectedNode && !componentVisited.has(connectedId)) {
            stack.push(connectedNode);
          }
        });
      }
      
      return component;
    };
    
    // Group nodes into connected components
    actualNodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component = findComponent(node);
        if (component.length > 0) {
          connectedComponents.push(component);
        }
      }
    });
    
    console.log('🎯 Connected components:', connectedComponents.map(comp => comp.map(n => n.id)));
    
    // 4. Layout each connected component using hierarchy-aware positioning
    const layoutComponent = (component: Node[], componentIndex: number) => {
      // Find root nodes within this component
      const componentNodeIds = new Set(component.map(n => n.id));
      const componentRoots = component.filter(node => {
        const nodeParents = parents.get(node.id) || [];
        return nodeParents.filter(p => componentNodeIds.has(p)).length === 0;
      });
      
      if (componentRoots.length === 0 && component.length > 0) {
        componentRoots.push(component[0]);
      }
      
      // Assign hierarchy levels within component
      const nodeLevel = new Map<string, number>();
      const nodesAtLevel = new Map<number, Node[]>();
      const componentVisited = new Set<string>();
      let maxLevel = 0;
      
      // BFS for hierarchy levels
      const queue: { node: Node; level: number }[] = [];
      componentRoots.forEach(node => {
        queue.push({ node, level: 0 });
        nodeLevel.set(node.id, 0);
      });
      
      while (queue.length > 0) {
        const { node, level } = queue.shift()!;
        
        if (componentVisited.has(node.id)) continue;
        componentVisited.add(node.id);
        
        maxLevel = Math.max(maxLevel, level);
        
        const levelNodes = nodesAtLevel.get(level) || [];
        levelNodes.push(node);
        nodesAtLevel.set(level, levelNodes);
        
        // Process children within component
        const nodeChildren = children.get(node.id) || [];
        nodeChildren.forEach(childId => {
          if (componentNodeIds.has(childId)) {
            const childNode = component.find(n => n.id === childId);
            if (childNode && !componentVisited.has(childId)) {
              queue.push({ node: childNode, level: level + 1 });
              nodeLevel.set(childId, level + 1);
            }
          }
        });
      }
      
      // Position nodes within component using smart clustering with maximum spacing
      const componentWidth = Math.max(1200, (Math.max(...Array.from(nodesAtLevel.values()).map(level => level.length)) - 1) * horizontalSpacing);
      // Use fixed separation between components instead of multiplying by component width
      const componentBaseX = componentIndex * 800; // Fixed 800px separation between branch starting points
      
      const componentNodes: Node[] = [];
      // Track INDIVIDUAL node positions to prevent any overlaps
      const nodePositions = new Map<string, { x: number; y: number; bottom: number }>();
      
      for (let level = 0; level <= maxLevel; level++) {
        const levelNodes = nodesAtLevel.get(level) || [];
        
        // Sort nodes in level by their connections to minimize edge crossings
        levelNodes.sort((a, b) => {
          const aConnections = directConnections.get(a.id)?.size || 0;
          const bConnections = directConnections.get(b.id)?.size || 0;
          return bConnections - aConnections; // More connected nodes towards center
        });
        
        // Position nodes in this level
        levelNodes.forEach((node, index) => {
          const levelWidth = (levelNodes.length - 1) * horizontalSpacing;
          const levelStartX = componentBaseX + (componentWidth - levelWidth) / 2;
          
          // Add micro-adjustments for connected nodes
          let microAdjustmentX = 0;
          const nodeConnections = directConnections.get(node.id) || new Set();
          if (nodeConnections.size > 0) {
            // Slight adjustment towards most connected sibling
            microAdjustmentX = (index - levelNodes.length / 2) * siblingHorizontalSpacing * 0.1;
          }
          
          const nodeX = levelStartX + index * horizontalSpacing + microAdjustmentX;
          
          // Calculate Y position ensuring no overlaps with ANY previously positioned nodes
          let nodeY = startY + level * baseLayerVerticalSpacing;
          
          // Check for conflicts with ALL previously positioned nodes
          let hasConflict = true;
          while (hasConflict) {
            hasConflict = false;
            
            for (const [, existingPos] of nodePositions.entries()) {
              // Check if this position would cause overlap
              const horizontalOverlap = Math.abs(nodeX - existingPos.x) < (horizontalSpacing * 0.8); // Allow some horizontal tolerance
              const verticalOverlap = nodeY < existingPos.bottom + minNodeSpacing;
              
              if (horizontalOverlap && verticalOverlap) {
                // Move this node below the conflicting node
                nodeY = existingPos.bottom + minNodeSpacing;
                hasConflict = true;
                break;
              }
            }
          }
          
          const nodeHeight = calculateNodeHeight(node);
          const nodeBottom = nodeY + nodeHeight;
          
          // Store this node's position info
          nodePositions.set(node.id, { x: nodeX, y: nodeY, bottom: nodeBottom });
          
          console.log(`📍 Positioned ${node.id} at (${nodeX}, ${nodeY}) with height ${nodeHeight}, bottom: ${nodeBottom}`);
          
          const position = {
            x: nodeX,
            y: nodeY
          };
          
          componentNodes.push({
            ...node,
            position
          });
        });
      }
      
      return componentNodes;
    };
    
    // 5. Layout all components
    const allLayoutNodes: Node[] = [];
    connectedComponents.forEach((component, index) => {
      const layoutNodes = layoutComponent(component, index);
      allLayoutNodes.push(...layoutNodes);
    });
    
    // 6. Add unconnected nodes
    const unconnectedNodes = actualNodes.filter(node => 
      !allLayoutNodes.some(ln => ln.id === node.id)
    );
    
    unconnectedNodes.forEach((node, index) => {
      allLayoutNodes.push({
        ...node,
        position: {
          x: 100 + index * 300,
          y: startY
        }
      });
    });
    
    console.log('🎯 Final layout complete. Total nodes positioned:', allLayoutNodes.length);
    
    // 7. Apply the new positions
    if (onSetNodes && allLayoutNodes.length > 0) {
      onSetNodes(allLayoutNodes);
    } else {
      setNodes(allLayoutNodes);
    }
  };

  const handleImportAccept = () => {
    // Import is already applied, just close the modal
    setShowImportModal(false);
    setImportResult(null);
    setPreImportState(null);
  };

  const handleImportRevert = () => {
    if (preImportState) {
      // Revert to pre-import state
      onSetNodes?.(preImportState.nodes);
      setEdges(preImportState.edges);
      
      // Set bulk update flag
      if ((window as any).flowCanvasSetBulkUpdate) {
        (window as any).flowCanvasSetBulkUpdate();
      }
    }
    
    setShowImportModal(false);
    setImportResult(null);
    setPreImportState(null);
  };

  const handleImportClose = () => {
    // Same as accept - import is already applied
    handleImportAccept();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-white border-b border-gray-200">
      {/* Group 1: Organize and Fold/Unfold - cyan color */}
      <div className="flex items-center gap-1">
        <button
          onClick={organizeNodes}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium w-[140px] h-10"
          title="Organize nodes in a hierarchical layout"
        >
          <Layout size={16} />
          <span>Organize</span>
        </button>
        <button
          onClick={toggleAllMeta}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium w-[140px] h-10"
          title="Toggle visibility of path displays and combination sections"
        >
          {pathDisplaysFolded || combinationSectionsFolded ? <Eye size={16} /> : <EyeOff size={16} />}
          <span>{pathDisplaysFolded || combinationSectionsFolded ? 'Unfold Meta' : 'Fold Meta'}</span>
        </button>
      </div>
      
      {/* Group 2: Add nodes - greenish colors */}
      <div className="flex items-center gap-1">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setQuestionDropdownOpen(!questionDropdownOpen)}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm font-medium w-[140px] h-10"
          >
            <HelpCircle size={16} />
            <span>Add Question</span>
            <ChevronDown size={14} />
          </button>
          
          {questionDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-[140px] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <button
                onClick={addRootQuestionNode}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
              >
                ROOT
              </button>
              <button
                onClick={addRegularQuestionNode}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
              >
                REGULAR
              </button>
            </div>
          )}
        </div>
        <button
          onClick={addAnswerNode}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm font-medium w-[140px] h-10"
        >
          <MessageSquare size={16} />
          <span>Add Answer</span>
        </button>
        <button
          onClick={addOutcomeNode}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm font-medium w-[140px] h-10"
        >
          <Target size={16} />
          <span>Add Outcome</span>
        </button>
      </div>

      {/* Group 3: File Operations - blueish colors */}
      <div className="flex items-center gap-1">
        <button
          onClick={exportFlow}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-sky-400 text-white rounded-lg hover:bg-sky-500 transition-colors text-sm font-medium w-[140px] h-10"
        >
          <Download size={16} />
          <span>Export JSON</span>
        </button>
        <button
          onClick={importFlow}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-sky-400 text-white rounded-lg hover:bg-sky-500 transition-colors text-sm font-medium w-[140px] h-10"
        >
          <Upload size={16} />
          <span>Import JSON</span>
        </button>
        <button
          onClick={propagatePaths}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-sky-400 text-white rounded-lg hover:bg-sky-500 transition-colors text-sm font-medium w-[140px] h-10"
          title="Propagate path IDs from root nodes to all connected nodes"
        >
          <Share2 size={16} />
          <span>Propagate Path</span>
        </button>
      </div>
      
      {/* Group 4: Demo and Clear - keep original colors */}
      <div className="flex items-center gap-1">
        <button
          onClick={loadDemo}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium w-[140px] h-10"
        >
          <Database size={16} />
          <span>Load Demo</span>
        </button>
        <button
          onClick={clearAll}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium w-[140px] h-10"
        >
          <Trash2 size={16} />
          <span>Clear All</span>
        </button>
      </div>
      
      {/* Import Feedback Modal */}
      <ImportFeedbackModal
        isOpen={showImportModal}
        importResult={importResult}
        onAccept={handleImportAccept}
        onRevert={handleImportRevert}
        onClose={handleImportClose}
      />
    </div>
  );
}