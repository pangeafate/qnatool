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
    const segments: Array<{ type: 'Q' | 'A' | 'V' | 'E'; number: number }> = [];
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('Q')) {
        segments.push({ type: 'Q', number: parseInt(part.substring(1)) });
      } else if (part.startsWith('A')) {
        segments.push({ type: 'A', number: parseInt(part.substring(1)) });
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
    const updatedNodes: Node[] = [];
    const newRegistry: PathRegistry = {
      nodeToPathsMap: new Map(),
      pathToNodeMap: new Map(),
    };

    // First pass: identify root nodes and build hierarchy
    const nodeMap = new Map<string, Node>();
    const edgeMap = new Map<string, Edge[]>();
    
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });
    
    edges.forEach(edge => {
      const sourceEdges = edgeMap.get(edge.source) || [];
      sourceEdges.push(edge);
      edgeMap.set(edge.source, sourceEdges);
    });

    // Find root question nodes (no incoming edges)
    const rootNodes = nodes.filter(node => 
      node.type === 'question' && 
      !edges.some(edge => edge.target === node.id)
    );

    // Reset counters to start fresh
    this.counters.clear();

    // Recursively assign path IDs
    const processedNodes = new Set<string>();
    
    const processNode = (
      node: Node, 
      parentPathId: string | null = null, 
      level: number = 1,
      sourceHandle?: string // Track which variant handle the connection came from
    ): void => {
      if (processedNodes.has(node.id)) return;
      processedNodes.add(node.id);

      let pathId: string;
      
      if (node.type === 'question') {
        // If coming from a variant handle, include variant in path
        if (sourceHandle && sourceHandle.startsWith('variant-')) {
          const variantIndex = parseInt(sourceHandle.replace('variant-', ''));
          const variantPath = `${parentPathId}-V${variantIndex + 1}`;
          const questionNumber = this.getNextQuestionNumber(variantPath);
          pathId = `${variantPath}-Q${questionNumber}`;
        } else {
          // Regular question path
          const questionNumber = this.getNextQuestionNumber(parentPathId);
          if (parentPathId === null) {
            pathId = `${newTopic}-Q${questionNumber}`;
          } else {
            pathId = `${parentPathId}-Q${questionNumber}`;
          }
        }
      } else if (node.type === 'answer') {
        // Use hierarchical counter for answers
        const answerNumber = this.getNextAnswerNumber(parentPathId || 'STANDALONE');
        pathId = `${parentPathId || 'STANDALONE'}-A${answerNumber}`;
      } else if (node.type === 'outcome') {
        // Use hierarchical counter for outcomes
        const outcomeNumber = this.getNextOutcomeNumber(parentPathId || 'STANDALONE');
        pathId = `${parentPathId || 'STANDALONE'}-E${outcomeNumber}`;
      } else {
        // Fallback for other node types
        pathId = `${parentPathId || 'STANDALONE'}-NODE`;
      }

      // Update node data
      const updatedNode: Node = {
        ...node,
        data: {
          ...node.data,
          pathId,
          topic: newTopic,
          isRoot: parentPathId === null && node.type === 'question',
          questionLevel: level,
        }
      };

      updatedNodes.push(updatedNode);
      
      // Register in new registry
      newRegistry.pathToNodeMap.set(pathId, node.id);
      const existingPaths = newRegistry.nodeToPathsMap.get(node.id) || [];
      newRegistry.nodeToPathsMap.set(node.id, [...existingPaths, pathId]);

      // Process connected nodes with source handle information
      const connectedEdges = edgeMap.get(node.id) || [];
      connectedEdges.forEach(edge => {
        const targetNode = nodeMap.get(edge.target);
        if (targetNode && !processedNodes.has(targetNode.id)) {
          const nextLevel = node.type === 'question' ? level : level + 1;
          // Pass the source handle to track variant connections
          processNode(targetNode, pathId, nextLevel, edge.sourceHandle || undefined);
        }
      });
    };

    // Process all root nodes
    rootNodes.forEach(rootNode => {
      processNode(rootNode, null, 1);
    });

    // Process any remaining unprocessed nodes
    nodes.forEach(node => {
      if (!processedNodes.has(node.id)) {
        processNode(node, null, 1);
      }
    });

    this.pathRegistry = newRegistry;
    return { nodes: updatedNodes, registry: newRegistry };
  }

  /**
   * Get next available question number for a given parent path
   * This ensures hierarchical numbering: each parent has its own Q1, Q2, Q3...
   */
  getNextQuestionNumber(parentPathId: string | null): number {
    const key = `Q-${parentPathId || 'ROOT'}`;
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
    return current + 1;
  }

  /**
   * Get next available answer number for a given question path
   * This ensures each question has its own A1, A2, A3...
   */
  getNextAnswerNumber(questionPathId: string): number {
    const key = `A-${questionPathId}`;
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
    return current + 1;
  }

  /**
   * Get next available outcome number for a given parent path
   * This ensures each branch has its own E1, E2, E3...
   */
  getNextOutcomeNumber(parentPathId: string): number {
    const key = `E-${parentPathId}`;
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
      currentPath += `-${segment.type}${segment.number}`;
      
      // If this is a variant segment, find the score
      if (segment.type === 'V' && i > 0) {
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
      if (segment.type === 'Q') {
        currentPath = index === 0 
          ? `${components.topic}-Q${segment.number}`
          : currentPath + `-Q${segment.number}`;
        
        const nodeId = this.getNodeForPath(currentPath);
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          parts.push(`Q${segment.number}: ${node.data.questionText || 'Question'}`);
        }
      } else if (segment.type === 'A') {
        currentPath += `-A${segment.number}`;
        parts.push(`Answer ${segment.number}`);
      } else if (segment.type === 'V') {
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
      if (node.data.pathId) {
        console.log(`Node ${node.id} (${node.type}): ${node.data.pathId}`);
      }
    });
    console.log('=== Counters ===');
    this.counters.forEach((value, key) => {
      console.log(`${key}: ${value}`);
    });
  }
}