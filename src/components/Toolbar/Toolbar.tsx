import React, { useState } from 'react';
import { Node } from 'reactflow';
import { Download, Upload, Database, Trash2, Layout, HelpCircle, MessageSquare, Target, Share2, Eye, EyeOff } from 'lucide-react';
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
  const { setEdges, edges, nodes: storeNodes, setNodes, additiveImport, propagatePathToAll, toggleAllMeta, pathDisplaysFolded, combinationSectionsFolded } = useFlowStore();
  
  // Use store nodes if prop nodes are empty/not provided
  const actualNodes = nodes.length > 0 ? nodes : storeNodes;
  
  // State for import feedback modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [preImportState, setPreImportState] = useState<{ nodes: Node[], edges: any[] } | null>(null);

  const getNextPosition = () => {
    const existingPositions = actualNodes.map(node => node.position);
    
    let x = 200;
    let y = 200;
    
    // Simple grid-based positioning to avoid overlaps
    const gridSize = 350;
    const maxCols = 4;
    
    for (let i = 0; i < actualNodes.length + 1; i++) {
      const col = i % maxCols;
      const row = Math.floor(i / maxCols);
      
      x = 200 + col * gridSize;
      y = 200 + row * gridSize;
      
      // Check if this position is far enough from existing nodes
      const tooClose = existingPositions.some(pos => 
        Math.abs(pos.x - x) < 250 && Math.abs(pos.y - y) < 200
      );
      
      if (!tooClose) {
        break;
      }
    }
    
    return { x, y };
  };

  const addQuestionNode = () => {
    const pathGenerator = PathIdGenerator.getInstance();
    const position = getNextPosition();
    
    // Generate unique topic for each root question
    const existingRootNodes = actualNodes.filter(node => node.data?.isRoot);
    const topicNumber = existingRootNodes.length + 1;
    const topic = `TOPIC-${topicNumber}`;
    
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
        questionText: 'New Question',
        questionLevel: 1,
        elementId: 'NEW',
        subElementId: 'NEW',
      }
    };
    
    // Register the node in the path generator
    pathGenerator.registerNode(questionNode.id, pathId);
    
    onAddNode?.(questionNode);
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
    console.log('Organize button clicked!');
    console.log('actualNodes:', actualNodes);
    console.log('actualNodes.length:', actualNodes.length);
    
    if (actualNodes.length < 2) {
      console.log('Not enough nodes to organize');
      return;
    }

    console.log('Organizing', actualNodes.length, 'nodes');

    // --- Compact Hierarchical Layout with Row Wrapping ---
    
    // 1. Layout parameters
    const horizontalSpacing = 400; // Keep same spacing
    const verticalSpacing = 420;   // Increased from 350 to create more vertical gap
    const startX = 150;
    const startY = 150;
    const maxNodesPerRow = 4; // Maximum nodes per row before wrapping
    
    // 2. Build adjacency maps for parent-child relationships
    const children = new Map<string, string[]>(); // parent -> [children]
    const parents = new Map<string, string>(); // child -> parent
    const incomingEdges = new Map<string, number>();
    
    // Initialize maps
    actualNodes.forEach(node => {
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
    
    console.log('Parent-child relationships:', { children, parents });
    
    // 3. Find root nodes (nodes with no incoming edges)
    const rootNodes = actualNodes.filter(node => (incomingEdges.get(node.id) || 0) === 0);
    
    // If no root nodes, use the first node as root
    if (rootNodes.length === 0 && actualNodes.length > 0) {
      rootNodes.push(actualNodes[0]);
    }
    
    console.log('Root nodes:', rootNodes.map(n => n.id));
    
    // 4. Assign levels using BFS (breadth-first search)
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
        const childNode = actualNodes.find(n => n.id === childId);
        if (childNode && !visited.has(childId)) {
          queue.push({ node: childNode, level: level + 1 });
          nodeLevel.set(childId, level + 1);
        }
      });
    }
    
    console.log('Nodes by level:', nodesAtLevel);
    
    // 5. Create a flat ordered list maintaining hierarchy
    const orderedNodes: Node[] = [];
    for (let level = 0; level <= maxLevel; level++) {
      const levelNodes = nodesAtLevel.get(level) || [];
      orderedNodes.push(...levelNodes);
    }
    
    // Add unconnected nodes at the end
    const unconnectedNodes = actualNodes.filter(n => !visited.has(n.id));
    orderedNodes.push(...unconnectedNodes);
    
    console.log('Ordered nodes:', orderedNodes.map(n => n.id));
    
    // 6. Position nodes in a compact grid with wrapping
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
      
      console.log(`Node ${node.id} (index ${index}): row ${row}, col ${col} -> position ${newPosition.x},${newPosition.y}`);
      
      return {
        ...node,
        position: newPosition
      };
    });
    
    console.log('Updated nodes:', updatedNodes);
    
    // 7. Set bulk update flag BEFORE updating nodes
    if ((window as any).flowCanvasSetBulkUpdate) {
      (window as any).flowCanvasSetBulkUpdate();
      console.log('Bulk update flag set');
    } else {
      console.log('flowCanvasSetBulkUpdate not found on window');
    }
    
    // Small delay to ensure bulk update flag is processed
    setTimeout(() => {
      console.log('About to call setNodes...');
      setNodes(updatedNodes);
      console.log('setNodes called');
      
      // Also try the callback as backup
      if (onSetNodes) {
        console.log('Also calling onSetNodes callback...');
        onSetNodes(updatedNodes);
      }
      
      console.log('Organization complete!');
    }, 50); // Small delay to ensure flag is set
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
        <button
          onClick={addQuestionNode}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm font-medium w-[140px] h-10"
        >
          <HelpCircle size={16} />
          <span>Add Question</span>
        </button>
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