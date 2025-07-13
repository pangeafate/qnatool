import { Node, Edge } from 'reactflow';
import { PathIdComponents, NodePathData, PathRegistry, PathIdComponentsWithVariants } from '../types/flow.types';

export class PathIdGenerator {
  private static instance: PathIdGenerator;
  private counters: Map<string, number> = new Map();
  private pathRegistry: PathRegistry = {
    nodeToPathsMap: new Map(),
    pathToNodeMap: new Map(),
  };

  static getInstance(): PathIdGenerator {
    if (!PathIdGenerator.instance) {
      PathIdGenerator.instance = new PathIdGenerator();
    }
    return PathIdGenerator.instance;
  }

  /**
   * Generate hierarchical path ID for question nodes
   * Format: [Topic] or [Topic]-Q[Number] or [Topic]-Q[Number]-A[Number]-Q[Number]
   */
  generateQuestionPathId(
    parentNode: NodePathData | null,
    questionNumber: number,
    topic: string
  ): string {
    if (!parentNode) {
      // Root question
      return `${topic}-Q${questionNumber}`;
    }
    
    // Child question - append to parent's path
    return `${parentNode.pathId}-Q${questionNumber}`;
  }

  /**
   * Generate hierarchical path ID for answer nodes
   */
  generateAnswerPathId(
    parentQuestion: NodePathData,
    answerNumber: number
  ): string {
    return `${parentQuestion.pathId}-A${answerNumber}`;
  }

  /**
   * Generate hierarchical path ID for outcome nodes
   */
  generateOutcomePathId(
    parentNode: NodePathData,
    outcomeNumber: number
  ): string {
    return `${parentNode.pathId}-E${outcomeNumber}`;
  }

  /**
   * Generate path ID for a specific variant within an answer node
   */
  generateVariantPathId(
    answerPathId: string,
    variantIndex: number
  ): string {
    return `${answerPathId}-V${variantIndex + 1}`;
  }

  /**
   * Parse variant information from a path
   */
  parseVariantFromPath(pathId: string): { answerPath: string; variantNumber: number } | null {
    const match = pathId.match(/(.*-A\d+)-V(\d+)/);
    if (match) {
      return {
        answerPath: match[1],
        variantNumber: parseInt(match[2])
      };
    }
    return null;
  }

  /**
   * Parse path ID into components
   */
  parsePathId(pathId: string): PathIdComponents {
    const parts = pathId.split('-');
    const topic = parts[0];
    const segments: Array<{ type: 'Q' | 'A'; number: number }> = [];
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('Q')) {
        segments.push({ type: 'Q', number: parseInt(part.substring(1)) });
      } else if (part.startsWith('A')) {
        segments.push({ type: 'A', number: parseInt(part.substring(1)) });
      }
    }
    
    return { topic, segments };
  }

  /**
   * Enhanced parsePathId to include variant segments
   */
  parsePathIdWithVariants(pathId: string): PathIdComponentsWithVariants {
    const parts = pathId.split('-');
    const topic = parts[0];
    const segments: Array<{ type: 'Q' | 'A' | 'V' | 'E' | 'VC'; number?: number; numbers?: number[] }> = [];
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('Q')) {
        segments.push({ type: 'Q', number: parseInt(part.substring(1)) });
      } else if (part.startsWith('A')) {
        segments.push({ type: 'A', number: parseInt(part.substring(1)) });
      } else if (part.startsWith('V') && part.includes('+V')) {
        // Handle combination variants like V0+V1
        const variantNumbers = part.substring(1).split('+V').map(n => parseInt(n));
        segments.push({ type: 'VC', numbers: variantNumbers });
      } else if (part.startsWith('V')) {
        segments.push({ type: 'V', number: parseInt(part.substring(1)) });
      } else if (part.startsWith('E')) {
        segments.push({ type: 'E', number: parseInt(part.substring(1)) });
      }
    }
    
    return { topic, segments };
  }

  /**
   * Get the level of a path ID (depth in hierarchy)
   */
  getPathLevel(pathId: string): number {
    const components = this.parsePathId(pathId);
    return components.segments.filter(s => s.type === 'Q').length;
  }

  /**
   * Get parent path ID
   */
  getParentPathId(pathId: string): string | null {
    const parts = pathId.split('-');
    if (parts.length <= 2) return null; // Root level
    
    // Remove the last segment to get parent
    return parts.slice(0, -1).join('-');
  }

  /**
   * Generate unique edge ID
   */
  generateEdgeId(sourceId: string, targetId: string, handle?: string): string {
    const suffix = handle ? `-${handle}` : '';
    return `edge-${sourceId}-${targetId}${suffix}`;
  }

  /**
   * Register a node with its path ID
   */
  registerNode(nodeId: string, pathId: string): void {
    // Map path to node
    this.pathRegistry.pathToNodeMap.set(pathId, nodeId);
    
    // Map node to paths (a node can have multiple paths leading to it)
    const existingPaths = this.pathRegistry.nodeToPathsMap.get(nodeId) || [];
    if (!existingPaths.includes(pathId)) {
      this.pathRegistry.nodeToPathsMap.set(nodeId, [...existingPaths, pathId]);
    }
  }

  /**
   * Get all paths that lead to a specific node
   */
  getNodePaths(nodeId: string): string[] {
    return this.pathRegistry.nodeToPathsMap.get(nodeId) || [];
  }

  /**
   * Get node ID for a specific path
   */
  getNodeForPath(pathId: string): string | null {
    return this.pathRegistry.pathToNodeMap.get(pathId) || null;
  }

  /**
   * Recalculate all path IDs when topic changes - with variant support
   */
  recalculatePathIds(
    nodes: Node[],
    edges: Edge[],
    newTopic: string
  ): { nodes: Node[], registry: PathRegistry } {
    const newRegistry: PathRegistry = {
      nodeToPathsMap: new Map(),
      pathToNodeMap: new Map(),
    };

    // Build maps for quick access
    const nodeMap = new Map<string, Node>();
    const outgoingEdgeMap = new Map<string, Edge[]>();
    const incomingEdgeMap = new Map<string, Edge[]>();
    
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });
    
    edges.forEach(edge => {
      // Outgoing edges from source
      const sourceEdges = outgoingEdgeMap.get(edge.source) || [];
      sourceEdges.push(edge);
      outgoingEdgeMap.set(edge.source, sourceEdges);
      
      // Incoming edges to target
      const targetEdges = incomingEdgeMap.get(edge.target) || [];
      targetEdges.push(edge);
      incomingEdgeMap.set(edge.target, targetEdges);
    });

    // Find root question nodes (no incoming edges)
    const rootNodes = nodes.filter(node => 
      node.type === 'question' && 
      !edges.some(edge => edge.target === node.id)
    );

    // Reset counters to start fresh
    this.counters.clear();

    // Create a map to store all updated nodes
    const updatedNodeMap = new Map<string, Node>();
    
    // Initialize all nodes with empty paths
    nodes.forEach(node => {
      updatedNodeMap.set(node.id, {
        ...node,
        data: {
          ...node.data,
          pathIds: [],
          topic: newTopic,
        }
      });
    });

    // Process paths using BFS to ensure we process all paths to each node
    const queue: Array<{
      nodeId: string;
      parentPathId: string | null;
      level: number;
      sourceHandle?: string;
      sourceNodeId?: string;
    }> = [];

    // Start with root nodes
    rootNodes.forEach(rootNode => {
      queue.push({
        nodeId: rootNode.id,
        parentPathId: null,
        level: 1,
      });
    });

    // Track processed path combinations to avoid infinite loops
    const processedPaths = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, parentPathId, level } = queue.shift()!;
      
      const node = updatedNodeMap.get(nodeId);
      if (!node) continue;

      // Generate path ID for this specific path
      let pathId: string;
      
      if (node.type === 'question') {
        const questionNumber = this.getQuestionNumberForNode(node.id, parentPathId, nodes);
        if (parentPathId === null) {
          pathId = `${newTopic}-Q${questionNumber}`;
        } else {
          pathId = `${parentPathId}-Q${questionNumber}`;
        }
      } else if (node.type === 'answer') {
        // For answer nodes, we just create the base path - variants will be handled when processing outgoing edges
        const answerNumber = this.getAnswerNumberForNode(node.id, parentPathId || 'STANDALONE', nodes);
        pathId = `${parentPathId || 'STANDALONE'}-A${answerNumber}`;
        
        // IMPORTANT: Don't add the answer path to the node's pathIds for Multiple/Combinations
        // The path will only be used as a base for variant paths
        if (node.data?.answerType === 'single') {
          // Only for Single answer type, we add the direct path
          const pathKey = `${nodeId}:${pathId}`;
          if (!processedPaths.has(pathKey)) {
            processedPaths.add(pathKey);
            
            const currentNode = updatedNodeMap.get(nodeId)!;
            const currentPathIds = currentNode.data.pathIds || [];
            if (!currentPathIds.includes(pathId)) {
              updatedNodeMap.set(nodeId, {
                ...currentNode,
                data: {
                  ...currentNode.data,
                  pathId: pathId,
                  primaryPathId: pathId,
                  pathIds: [...currentPathIds, pathId],
                  isRoot: false,
                  questionLevel: level,
                }
              });
              
              // Register in registry
              newRegistry.pathToNodeMap.set(pathId, nodeId);
              const existingPaths = newRegistry.nodeToPathsMap.get(nodeId) || [];
              if (!existingPaths.includes(pathId)) {
                newRegistry.nodeToPathsMap.set(nodeId, [...existingPaths, pathId]);
              }
            }
          }
        } else {
          // For Multiple/Combinations, generate variant paths and add them to pathIds
          const currentNode = updatedNodeMap.get(nodeId)!;
          const existingPathIds = currentNode.data.pathIds || [];
          const newVariantPaths: string[] = [];
          
          // Generate variant paths based on answer type
          if (node.data?.answerType === 'multiple') {
            // For Multiple, generate paths for each variant
            const variants = node.data?.variants || [];
            variants.forEach((_: any, index: number) => {
              const variantPath = `${pathId}-V${index + 1}`;
              if (!existingPathIds.includes(variantPath)) {
                newVariantPaths.push(variantPath);
              }
            });
          } else if (node.data?.answerType === 'combinations') {
            // For Combinations, generate paths for each combination
            const variants = node.data?.variants || [];
            const n = variants.length;
            
            for (let i = 1; i < Math.pow(2, n); i++) {
              const variantIndices = [];
              for (let j = 0; j < n; j++) {
                if (i & (1 << j)) {
                  variantIndices.push(j + 1); // Use 1-based indexing for display
                }
              }
              const variantPath = `${pathId}-V${variantIndices.join('+V')}`;
              if (!existingPathIds.includes(variantPath)) {
                newVariantPaths.push(variantPath);
              }
            }
          }
          
          // Combine existing and new paths
          const allPathIds = [...existingPathIds, ...newVariantPaths];
          
          updatedNodeMap.set(nodeId, {
            ...currentNode,
            data: {
              ...currentNode.data,
              pathId: pathId, // Store base path for reference
              pathIds: allPathIds, // Include both existing and new variant paths
              isRoot: false,
              questionLevel: level,
            }
          });
          
          // Register new variant paths in registry
          newVariantPaths.forEach(variantPath => {
            newRegistry.pathToNodeMap.set(variantPath, nodeId);
            const existingPaths = newRegistry.nodeToPathsMap.get(nodeId) || [];
            if (!existingPaths.includes(variantPath)) {
              newRegistry.nodeToPathsMap.set(nodeId, [...existingPaths, variantPath]);
            }
          });
        }
        
        // Process outgoing edges based on answer type
        const outgoingEdges = outgoingEdgeMap.get(nodeId) || [];
        
        if (node.data?.answerType === 'single') {
          // For Single type, process all edges with the base path
          outgoingEdges.forEach(edge => {
            queue.push({
              nodeId: edge.target,
              parentPathId: pathId,
              level: level + 1,
              sourceHandle: edge.sourceHandle || undefined,
              sourceNodeId: nodeId,
            });
          });
        } else if (node.data?.answerType === 'multiple') {
          // For Multiple type, only process variant handles
          outgoingEdges.forEach(edge => {
            if (edge.sourceHandle && edge.sourceHandle.startsWith('variant-')) {
              const variantIndex = parseInt(edge.sourceHandle.replace('variant-', ''));
              const variantPath = `${pathId}-V${variantIndex + 1}`;
              
              queue.push({
                nodeId: edge.target,
                parentPathId: variantPath,
                level: level + 1,
                sourceHandle: edge.sourceHandle || undefined,
                sourceNodeId: nodeId,
              });
            }
          });
        } else if (node.data?.answerType === 'combinations') {
          // For Combinations type, only process combination handles
          outgoingEdges.forEach(edge => {
            if (edge.sourceHandle && edge.sourceHandle.startsWith('combination-')) {
              const combinationId = edge.sourceHandle.replace('combination-', '');
              const variants = node.data?.variants || [];
              
              // Generate combinations to find the specific one
              const combinations = [];
              const n = variants.length;
              
              for (let i = 1; i < Math.pow(2, n); i++) {
                const variantIndices = [];
                for (let j = 0; j < n; j++) {
                  if (i & (1 << j)) {
                    variantIndices.push(j + 1); // Use 1-based indexing for consistency
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
                const variantPath = `${pathId}-V${matchingCombination.variantIndices.join('+V')}`;
                
                queue.push({
                  nodeId: edge.target,
                  parentPathId: variantPath,
                  level: level + 1,
                  sourceHandle: edge.sourceHandle || undefined,
                  sourceNodeId: nodeId,
                });
              }
            }
          });
        }
        
        // Skip the normal processing since we handled it above
        continue;
      } else if (node.type === 'outcome') {
        const outcomeNumber = this.getOutcomeNumberForNode(node.id, parentPathId || 'STANDALONE', nodes);
        pathId = `${parentPathId || 'STANDALONE'}-E${outcomeNumber}`;
      } else {
        // Fallback for other node types
        pathId = `${parentPathId || 'STANDALONE'}-NODE`;
      }

      // Check if we've already processed this exact path
      const pathKey = `${nodeId}:${pathId}`;
      if (processedPaths.has(pathKey)) {
        continue;
      }
      processedPaths.add(pathKey);

      // Add this path to the node's pathIds array (for non-answer nodes or single answer nodes)
      const currentNode = updatedNodeMap.get(nodeId)!;
      const currentPathIds = currentNode.data.pathIds || [];
      
      if (!currentPathIds.includes(pathId)) {
        const updatedPathIds = [...currentPathIds, pathId];
        
        // Determine primary path (shortest or first)
        const primaryPathId = currentNode.data.primaryPathId;
        const shouldUpdatePrimary = !primaryPathId || pathId.length < (primaryPathId || '').length;
        
        updatedNodeMap.set(nodeId, {
          ...currentNode,
          data: {
            ...currentNode.data,
            pathId: shouldUpdatePrimary ? pathId : (currentNode.data.pathId || pathId),
            primaryPathId: shouldUpdatePrimary ? pathId : (primaryPathId || pathId),
            pathIds: updatedPathIds,
            isRoot: parentPathId === null && node.type === 'question',
            questionLevel: level,
          }
        });
      }

      // Register in new registry
      newRegistry.pathToNodeMap.set(pathId, nodeId);
      const existingPaths = newRegistry.nodeToPathsMap.get(nodeId) || [];
      if (!existingPaths.includes(pathId)) {
        newRegistry.nodeToPathsMap.set(nodeId, [...existingPaths, pathId]);
      }

      // Add all outgoing edges to the queue (for non-answer nodes)
      if (node.type !== 'answer') {
        const outgoingEdges = outgoingEdgeMap.get(nodeId) || [];
        outgoingEdges.forEach(edge => {
          const targetNode = updatedNodeMap.get(edge.target);
          if (targetNode) {
            const nextLevel = node.type === 'question' ? level : level + 1;
            queue.push({
              nodeId: edge.target,
              parentPathId: pathId,
              level: nextLevel,
              sourceHandle: edge.sourceHandle || undefined,
              sourceNodeId: nodeId,
            });
          }
        });
      }
    }

    // Process any orphaned nodes (not connected to any root)
    nodes.forEach(node => {
      const updatedNode = updatedNodeMap.get(node.id);
      if (updatedNode && (!updatedNode.data.pathIds || updatedNode.data.pathIds.length === 0)) {
        // For answer nodes with no paths, check if they should have paths
        if (node.type === 'answer' && (node.data?.answerType === 'multiple' || node.data?.answerType === 'combinations')) {
          // These answer types don't store direct paths, so skip
          return;
        }
        
        let pathId: string;
        if (node.type === 'question') {
          const questionNumber = this.getQuestionNumberForNode(node.id, 'ORPHAN', nodes);
          pathId = `ORPHAN-Q${questionNumber}`;
        } else if (node.type === 'answer') {
          const answerNumber = this.getAnswerNumberForNode(node.id, 'ORPHAN', nodes);
          pathId = `ORPHAN-A${answerNumber}`;
        } else if (node.type === 'outcome') {
          const outcomeNumber = this.getOutcomeNumberForNode(node.id, 'ORPHAN', nodes);
          pathId = `ORPHAN-E${outcomeNumber}`;
        } else {
          pathId = `ORPHAN-NODE`;
        }

        const pathKey = `${node.id}:${pathId}`;
        if (!processedPaths.has(pathKey)) {
          processedPaths.add(pathKey);
          
          const currentNode = updatedNodeMap.get(node.id)!;
          updatedNodeMap.set(node.id, {
            ...currentNode,
            data: {
              ...currentNode.data,
              pathId: pathId,
              primaryPathId: pathId,
              pathIds: [pathId],
              isRoot: false,
              questionLevel: 1,
            }
          });

          newRegistry.pathToNodeMap.set(pathId, node.id);
          newRegistry.nodeToPathsMap.set(node.id, [pathId]);
        }
      }
    });

    this.pathRegistry = newRegistry;
    const updatedNodes = Array.from(updatedNodeMap.values());
    return { nodes: updatedNodes, registry: newRegistry };
  }

  /**
   * Get sequential question number based on all questions in the flow
   * Each question gets a unique number: Q1, Q2, Q3, etc.
   */
  getQuestionNumberForNode(nodeId: string, _parentPathId: string | null, nodes: Node[]): number {
    // Get all question nodes from the flow
    const questionNodes = nodes.filter((node: Node) => node.type === 'question');
    
    // Find the index of this node in the sorted list (by node ID for consistency)
    const sortedQuestionNodes = questionNodes.sort((a: Node, b: Node) => a.id.localeCompare(b.id));
    const nodeIndex = sortedQuestionNodes.findIndex((node: Node) => node.id === nodeId);
    
    // Return 1-based index
    return nodeIndex + 1;
  }

  /**
   * Get sequential answer number based on all answers in the flow
   * Each answer gets a unique number: A1, A2, A3, etc.
   */
  getAnswerNumberForNode(nodeId: string, _questionPathId: string, nodes: Node[]): number {
    // Get all answer nodes from the flow
    const answerNodes = nodes.filter((node: Node) => node.type === 'answer');
    
    // Find the index of this node in the sorted list (by node ID for consistency)
    const sortedAnswerNodes = answerNodes.sort((a: Node, b: Node) => a.id.localeCompare(b.id));
    const nodeIndex = sortedAnswerNodes.findIndex((node: Node) => node.id === nodeId);
    
    // Return 1-based index
    return nodeIndex + 1;
  }

  /**
   * Get sequential outcome number based on all outcomes in the flow
   * Each outcome gets a unique number: E1, E2, E3, etc.
   */
  getOutcomeNumberForNode(nodeId: string, _parentPathId: string | null, nodes: Node[]): number {
    // Get all outcome nodes from the flow
    const outcomeNodes = nodes.filter((node: Node) => node.type === 'outcome');
    
    // Find the index of this node in the sorted list (by node ID for consistency)
    const sortedOutcomeNodes = outcomeNodes.sort((a: Node, b: Node) => a.id.localeCompare(b.id));
    const nodeIndex = sortedOutcomeNodes.findIndex((node: Node) => node.id === nodeId);
    
    // Return 1-based index
    return nodeIndex + 1;
  }

  /**
   * Get next available question number - for compatibility with existing code
   * This method is used by Toolbar and other components
   */
  getNextQuestionNumber(parentPathId: string | null, topic?: string): number {
    // For root questions, use topic-specific counter
    if (parentPathId === null && topic) {
      const key = `Q-${topic}`;
      const current = this.counters.get(key) || 0;
      this.counters.set(key, current + 1);
      return current + 1;
    }
    
    // For child questions, use a simple counter for backward compatibility
    const key = 'Q-NEXT';
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
    return current + 1;
  }

  /**
   * Get next available answer number - for compatibility with existing code
   * This method is used by Toolbar and other components
   */
  getNextAnswerNumber(_questionPathId: string): number {
    // Use a simple counter for backward compatibility
    const key = 'A-NEXT';
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
    return current + 1;
  }

  /**
   * Get next available outcome number - for compatibility with existing code
   * This method is used by Toolbar and other components
   */
  getNextOutcomeNumber(_parentPathId: string): number {
    // Use a simple counter for backward compatibility
    const key = 'E-NEXT';
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
    return current + 1;
  }

  /**
   * Reset all counters and registry
   */
  reset(): void {
    this.counters.clear();
    this.pathRegistry = {
      nodeToPathsMap: new Map(),
      pathToNodeMap: new Map(),
    };
  }

  /**
   * Get path registry for debugging
   */
  getRegistry(): PathRegistry {
    return this.pathRegistry;
  }
  
  /**
   * Get a user-friendly display label for a node
   * e.g., "Q1.2.1" instead of "TOPIC-Q1-A2-Q3-A1-Q4"
   */
  getDisplayLabel(pathId: string, nodeType: 'question' | 'answer' | 'outcome'): string {
    const components = this.parsePathId(pathId);
    const numbers: number[] = [];
    
    components.segments.forEach((segment) => {
      if (segment.type === 'Q') {
        numbers.push(segment.number);
      }
    });
    
    switch (nodeType) {
      case 'question':
        return `Q${numbers.join('.')}`;
      case 'answer':
        const lastAnswer = components.segments.filter(s => s.type === 'A').pop();
        return `A${lastAnswer?.number || '?'}`;
      case 'outcome':
        return `Outcome ${this.getPathLevel(pathId)}`;
      default:
        return pathId;
    }
  }
  
  /**
   * Calculate cumulative score along a path with variants
   */
  calculatePathScore(pathId: string, nodes: Node[]): number {
    const components = this.parsePathIdWithVariants(pathId);
    let totalScore = 0;
    let currentPath = components.topic;
    
    for (let i = 0; i < components.segments.length; i++) {
      const segment = components.segments[i];
      
      if (segment.type === 'Q') {
        currentPath += `-Q${segment.number}`;
      } else if (segment.type === 'A') {
        currentPath += `-A${segment.number}`;
      } else if (segment.type === 'V' && segment.number !== undefined) {
        currentPath += `-V${segment.number}`;
        // Get the answer path (everything before the variant)
        const answerPath = currentPath.substring(0, currentPath.lastIndexOf('-V'));
        const answerNodeId = this.getNodeForPath(answerPath);
        
        if (answerNodeId) {
          const answerNode = nodes.find(n => n.id === answerNodeId);
          if (answerNode && answerNode.data.variants) {
            const variantIndex = segment.number - 1;
            const variant = answerNode.data.variants[variantIndex];
            if (variant) {
              totalScore += variant.score || 0;
            }
          }
        }
      } else if (segment.type === 'VC' && segment.numbers) {
        // Handle combination variants
        const variantPath = `V${segment.numbers.join('+V')}`;
        currentPath += `-${variantPath}`;
        
        // Get the answer path (everything before the variant combination)
        const answerPath = currentPath.substring(0, currentPath.lastIndexOf('-V'));
        const answerNodeId = this.getNodeForPath(answerPath);
        
        if (answerNodeId) {
          const answerNode = nodes.find(n => n.id === answerNodeId);
          if (answerNode && answerNode.data.variants) {
            // Sum scores for all variants in the combination
            segment.numbers.forEach((variantNum: number) => {
              const variant = answerNode.data.variants[variantNum];
              if (variant) {
                totalScore += variant.score || 0;
              }
            });
          }
        }
      } else if (segment.type === 'E' && segment.number !== undefined) {
        currentPath += `-E${segment.number}`;
      }
    }
    
    return totalScore;
  }
  
  /**
   * Get human-readable path description
   */
  getHumanReadablePath(pathId: string, nodes: Node[]): string {
    const components = this.parsePathIdWithVariants(pathId);
    const parts: string[] = [];
    let currentPath = '';
    
    components.segments.forEach((segment, index) => {
      if (segment.type === 'Q' && segment.number !== undefined) {
        currentPath = index === 0 
          ? `${components.topic}-Q${segment.number}`
          : currentPath + `-Q${segment.number}`;
        
        const nodeId = this.getNodeForPath(currentPath);
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          parts.push(`Q${segment.number}: ${node.data.questionText || 'Question'}`);
        }
      } else if (segment.type === 'A' && segment.number !== undefined) {
        currentPath += `-A${segment.number}`;
        parts.push(`Answer ${segment.number}`);
      } else if (segment.type === 'V' && segment.number !== undefined) {
        const prevPath = currentPath;
        currentPath += `-V${segment.number}`;
        
        // Find the answer node to get variant text
        const answerNodeId = this.getNodeForPath(prevPath);
        const answerNode = nodes.find(n => n.id === answerNodeId);
        if (answerNode && answerNode.data.variants) {
          const variant = answerNode.data.variants[segment.number - 1];
          if (variant) {
            parts.push(`→ "${variant.text}"`);
          }
        }
      } else if (segment.type === 'VC' && segment.numbers) {
        const prevPath = currentPath;
        const variantPath = `V${segment.numbers.join('+V')}`;
        currentPath += `-${variantPath}`;
        
        // Find the answer node to get variant texts
        const answerNodeId = this.getNodeForPath(prevPath);
        const answerNode = nodes.find(n => n.id === answerNodeId);
        if (answerNode && answerNode.data.variants) {
          const variantTexts = segment.numbers
            .map((num: number) => answerNode.data.variants[num]?.text)
            .filter(Boolean);
          if (variantTexts.length > 0) {
            parts.push(`→ [${variantTexts.join(' + ')}]`);
          }
        }
      } else if (segment.type === 'E' && segment.number !== undefined) {
        currentPath += `-E${segment.number}`;
        parts.push(`Outcome ${segment.number}`);
      }
    });
    
    return parts.join(' ');
  }
  
  /**
   * Debug helper: Print path structure for all nodes
   */
  printPathStructure(nodes: Node[]): void {
    console.log('=== Path Structure Debug ===');
    nodes.forEach(node => {
      if (node.data.pathIds) {
        console.log(`Node ${node.id} (${node.type}):`);
        console.log(`  Primary: ${node.data.pathId || node.data.primaryPathId}`);
        console.log(`  All paths: ${node.data.pathIds.join(', ')}`);
      } else if (node.data.pathId) {
        console.log(`Node ${node.id} (${node.type}): ${node.data.pathId}`);
      }
    });
    console.log('=== Counters ===');
    this.counters.forEach((value, key) => {
      console.log(`${key}: ${value}`);
    });
  }
}