import { useState, useEffect, useRef } from 'react';
import { Node } from 'reactflow';
import { Download, Upload, Database, Trash2, Layout, HelpCircle, MessageSquare, Target, Eye, EyeOff, ChevronDown } from 'lucide-react';
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
  const { setEdges, edges, nodes: storeNodes, setNodes, toggleAllMeta, pathDisplaysFolded, combinationSectionsFolded } = useFlowStore();
  
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



  const organizeNodes = () => {
    console.log('🎯 PowerPoint-Style Organize: Starting smart placement...');
    
    if (actualNodes.length < 2) {
      console.log('Not enough nodes to organize');
      return;
    }

    // CRITICAL FIX: Tell FlowCanvas this is a bulk update so it doesn't overwrite our positions
    if ((window as any).flowCanvasSetBulkUpdate) {
      (window as any).flowCanvasSetBulkUpdate();
      console.log('🔧 Bulk update flag set - preventing position overwrite');
    }

    console.log('🎯 Organizing', actualNodes.length, 'nodes with HARD CONSTRAINT overlap prevention');

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
      const LAYOUT_WIDTH = Math.max(actualNodes.length * 300, 1200);
      const LAYOUT_HEIGHT = 800;

      if (actualNodes.length <= 3) {
        return { x: CLEAN_START_X, y: CLEAN_START_Y };
      }

      const occupiedAreas: { x: number; y: number; width: number; height: number }[] = [];
      
      actualNodes.forEach(node => {
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
      
      if (actualNodes.length > 0) {
        minX = Math.min(...actualNodes.map(n => n.position.x));
        maxX = Math.max(...actualNodes.map(n => n.position.x + 300));
        minY = Math.min(...actualNodes.map(n => n.position.y));
        maxY = Math.max(...actualNodes.map(n => n.position.y + 150));
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
    
    actualNodes.forEach(node => {
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
          const connectedNode = actualNodes.find(n => n.id === connectedId);
          if (connectedNode && !componentVisited.has(connectedId)) {
            stack.push(connectedNode);
          }
        });
      }
      
      return component;
    };

    actualNodes.forEach(node => {
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
    const isolatedNodes = actualNodes.filter(node => 
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

    // Apply the new positions
    if (onSetNodes && allLayoutedNodes.length > 0) {
      onSetNodes(allLayoutedNodes);
    } else {
      setNodes(allLayoutedNodes);
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