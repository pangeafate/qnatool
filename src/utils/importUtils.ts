import { Node, Edge } from 'reactflow';

export interface ImportResult {
  nodes: Node[];
  edges: Edge[];
  conflicts: Array<{
    originalId: string;
    newId: string;
    type: 'node' | 'edge';
    reason: string;
  }>;
  statistics: {
    imported: {
      nodes: number;
      edges: number;
      topics: string[];
    };
    total: {
      nodes: number;
      edges: number;
      topics: string[];
    };
  };
}

export interface ImportConflictInfo {
  originalId: string;
  newId: string;
  type: 'node' | 'edge';
  reason: string;
}

export class ImportUtils {
  /**
   * Find available space on canvas for imported nodes
   */
  static findAvailableSpace(
    existingNodes: Node[],
    spacing: number = 400
  ): { x: number; y: number } {
    if (existingNodes.length === 0) {
      return { x: 200, y: 200 };
    }

    // Find the rightmost position of existing nodes
    const rightmostX = Math.max(...existingNodes.map(node => node.position.x + 300)); // 300 is approximate node width
    const topY = Math.min(...existingNodes.map(node => node.position.y));
    
    return {
      x: rightmostX + spacing,
      y: topY
    };
  }

  /**
   * Generate unique ID when there's a conflict
   */
  static generateUniqueId(originalId: string, existingIds: Set<string>): string {
    let counter = 1;
    let newId = `${originalId}-imported`;
    
    while (existingIds.has(newId)) {
      newId = `${originalId}-imported-${counter}`;
      counter++;
    }
    
    return newId;
  }

  /**
   * Adjust positions of imported nodes to avoid overlap
   */
  static adjustImportedPositions(
    importedNodes: Node[],
    basePosition: { x: number; y: number }
  ): Node[] {
    if (importedNodes.length === 0) return [];

    // Find the bounds of imported nodes
    const minX = Math.min(...importedNodes.map(node => node.position.x));
    const minY = Math.min(...importedNodes.map(node => node.position.y));
    
    // Calculate offset to move all nodes to the new position
    const offsetX = basePosition.x - minX;
    const offsetY = basePosition.y - minY;

    return importedNodes.map(node => ({
      ...node,
      position: {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY
      }
    }));
  }

  /**
   * Resolve ID conflicts and update references
   */
  static resolveConflicts(
    existingNodes: Node[],
    existingEdges: Edge[],
    importedNodes: Node[],
    importedEdges: Edge[]
  ): {
    resolvedNodes: Node[];
    resolvedEdges: Edge[];
    conflicts: ImportConflictInfo[];
  } {
    const conflicts: ImportConflictInfo[] = [];
    const existingNodeIds = new Set(existingNodes.map(n => n.id));
    const existingEdgeIds = new Set(existingEdges.map(e => e.id));
    const idMapping = new Map<string, string>(); // old ID -> new ID

    // Resolve node ID conflicts
    const resolvedNodes = importedNodes.map(node => {
      if (existingNodeIds.has(node.id)) {
        const newId = this.generateUniqueId(node.id, existingNodeIds);
        idMapping.set(node.id, newId);
        existingNodeIds.add(newId); // Add to set to avoid future conflicts
        
        conflicts.push({
          originalId: node.id,
          newId: newId,
          type: 'node',
          reason: `Node ID "${node.id}" already exists`
        });

        return {
          ...node,
          id: newId
        };
      }
      
      existingNodeIds.add(node.id);
      return node;
    });

    // Resolve edge ID conflicts and update node references
    const resolvedEdges = importedEdges.map(edge => {
      let newEdge = { ...edge };
      
      // Update source and target references if they were remapped
      if (idMapping.has(edge.source)) {
        newEdge.source = idMapping.get(edge.source)!;
      }
      if (idMapping.has(edge.target)) {
        newEdge.target = idMapping.get(edge.target)!;
      }

      // Check for edge ID conflicts
      if (existingEdgeIds.has(edge.id)) {
        const newId = this.generateUniqueId(edge.id, existingEdgeIds);
        existingEdgeIds.add(newId);
        
        conflicts.push({
          originalId: edge.id,
          newId: newId,
          type: 'edge',
          reason: `Edge ID "${edge.id}" already exists`
        });

        newEdge.id = newId;
      } else {
        existingEdgeIds.add(edge.id);
      }

      return newEdge;
    });

    return {
      resolvedNodes,
      resolvedEdges,
      conflicts
    };
  }

  /**
   * Get unique topics from nodes
   */
  static getTopicsFromNodes(nodes: Node[]): string[] {
    const topics = new Set<string>();
    nodes.forEach(node => {
      if (node.data?.topic) {
        topics.add(node.data.topic);
      }
    });
    return Array.from(topics).sort();
  }

  /**
   * Perform additive import with conflict resolution
   */
  static performAdditiveImport(
    existingNodes: Node[],
    existingEdges: Edge[],
    importedNodes: Node[],
    importedEdges: Edge[]
  ): ImportResult {
    // Find available space for imported nodes
    const basePosition = this.findAvailableSpace(existingNodes);
    
    // Adjust positions of imported nodes
    const positionedNodes = this.adjustImportedPositions(importedNodes, basePosition);
    
    // Resolve ID conflicts
    const { resolvedNodes, resolvedEdges, conflicts } = this.resolveConflicts(
      existingNodes,
      existingEdges,
      positionedNodes,
      importedEdges
    );

    // Merge with existing nodes and edges
    const finalNodes = [...existingNodes, ...resolvedNodes];
    const finalEdges = [...existingEdges, ...resolvedEdges];

    // Calculate statistics
    const importedTopics = this.getTopicsFromNodes(resolvedNodes);
    const totalTopics = this.getTopicsFromNodes(finalNodes);

    return {
      nodes: finalNodes,
      edges: finalEdges,
      conflicts,
      statistics: {
        imported: {
          nodes: resolvedNodes.length,
          edges: resolvedEdges.length,
          topics: importedTopics
        },
        total: {
          nodes: finalNodes.length,
          edges: finalEdges.length,
          topics: totalTopics
        }
      }
    };
  }
} 