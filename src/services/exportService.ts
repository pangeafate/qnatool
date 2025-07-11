import { Node, Edge } from 'reactflow';
import { QuestionFlowExport, AnswerVariant } from '../types/flow.types';

export class ExportService {
  /**
   * Export flow data to the new hierarchical JSON format
   */
  exportToJson(nodes: Node[], edges: Edge[]): QuestionFlowExport {
    const questionNodes = nodes.filter(n => n.type === 'question');
    const answerNodes = nodes.filter(n => n.type === 'answer');
    const outcomeNodes = nodes.filter(n => n.type === 'outcome');
    
    // Get root topic from first root question
    const rootQuestion = questionNodes.find(n => n.data.isRoot);
    const topic = rootQuestion?.data.topic || 'UNTITLED';
    
    // Build metadata
    const metadata = {
      topic,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      totalQuestions: questionNodes.length,
    };
    
    // Build nodes structure
    const nodesMap: QuestionFlowExport['nodes'] = {};
    
    // Process question nodes
    questionNodes.forEach(node => {
      nodesMap[node.id] = {
        id: node.id,
        type: 'question',
        pathId: node.data.pathId,
        content: node.data.questionText,
        level: node.data.questionLevel,
        position: node.position, // Preserve position
        topic: node.data.topic,
      };
    });
    
    // Process answer nodes
    answerNodes.forEach(node => {
      nodesMap[node.id] = {
        id: node.id,
        type: 'answer',
        pathId: node.data.pathId,
        content: `${node.data.variants?.length || 0} variants`,
        level: 0, // Answers don't have levels
        position: node.position, // Preserve position
        topic: node.data.topic, // Include topic for answer nodes
        answerType: node.data.answerType,
        variants: node.data.variants?.map((v: AnswerVariant) => ({
          id: v.id,
          text: v.text,
          score: v.score,
          allowsInput: v.allowsInput,
          inputValidation: v.inputValidation,
        })),
        combinationRules: node.data.combinationRules,
      };
    });
    
    // Process outcome nodes
    outcomeNodes.forEach(node => {
      nodesMap[node.id] = {
        id: node.id,
        type: 'outcome',
        pathId: node.data.pathId,
        content: node.data.recommendation || 'No recommendation provided',
        level: 0, // Outcomes don't have levels
        position: node.position, // Preserve position
        topic: node.data.topic,
        recommendation: node.data.recommendation,
      };
    });
    
    // Build navigation structure
    const navigation: QuestionFlowExport['navigation'] = {};
    const multipleChoiceRules: QuestionFlowExport['multipleChoiceRules'] = {};
    
    // Process edges to build navigation
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return;
      
      if (!navigation[edge.source]) {
        navigation[edge.source] = {};
      }
      
      if (edge.sourceHandle && edge.sourceHandle.startsWith('variant-')) {
        // Variant-specific navigation
        if (!navigation[edge.source].variants) {
          navigation[edge.source].variants = {};
        }
        navigation[edge.source].variants![edge.sourceHandle] = targetNode.data.pathId;
      } else {
        // Default navigation
        navigation[edge.source].default = targetNode.data.pathId;
      }
    });
    
    // Process multiple choice rules
    answerNodes.forEach(node => {
      if (node.data.answerType === 'multiple' && node.data.combinationRules) {
        multipleChoiceRules[node.id] = node.data.combinationRules.map((rule: any, index: number) => ({
          condition: rule.selectedVariants,
          nextNode: rule.nextNode,
          priority: index + 1,
        }));
      }
    });
    
    return {
      metadata,
      nodes: nodesMap,
      navigation,
      multipleChoiceRules,
    };
  }
  
  /**
   * Export to Excel format (placeholder - would need actual Excel library)
   */
  exportToExcel(flowData: QuestionFlowExport): Blob {
    // Convert to CSV format for now
    const csvData = this.convertToCSV(flowData);
    return new Blob([csvData], { type: 'text/csv' });
  }
  
  /**
   * Convert flow data to CSV format
   */
  private convertToCSV(flowData: QuestionFlowExport): string {
    const headers = [
      'Path ID',
      'Clean Path ID',
      'Type',
      'Content',
      'Level',
      'Variants',
      'Scores',
      'Next Path'
    ];
    
    const rows: string[][] = [headers];
    
    // Add nodes to CSV
    Object.values(flowData.nodes).forEach(node => {
      if (node.type === 'question') {
        rows.push([
          node.pathId,
          this.cleanPathId(node.pathId),
          'Question',
          node.content,
          node.level.toString(),
          '',
          '',
          flowData.navigation[node.id]?.default || ''
        ]);
      } else if (node.type === 'answer') {
        // Add each variant as a separate row
        node.variants?.forEach((variant, index) => {
          const nextPath = flowData.navigation[node.id]?.variants?.[`variant-${index}`] || '';
          rows.push([
            node.pathId,
            this.cleanPathId(node.pathId),
            'Answer',
            variant.text,
            '0',
            variant.text,
            variant.score.toString(),
            nextPath
          ]);
        });
      } else if (node.type === 'outcome') {
        rows.push([
          node.pathId,
          this.cleanPathId(node.pathId),
          'Outcome',
          node.recommendation || 'No recommendation',
          '0',
          '',
          '',
          '' // Outcome nodes don't have next paths
        ]);
      }
    });
    
    // Convert to CSV string
    return rows.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }
  
  /**
   * Clean path ID for display (remove redundant parts)
   */
  private cleanPathId(pathId: string): string {
    // Remove topic prefix and simplify
    const parts = pathId.split('-');
    if (parts.length <= 2) return pathId;
    
    // Keep only the meaningful parts
    return parts.slice(1).join('-');
  }
  
  /**
   * Import from the new JSON format
   */
  importFromJson(jsonData: QuestionFlowExport): { nodes: Node[], edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Convert nodes back to React Flow format
    Object.values(jsonData.nodes).forEach((nodeData, index) => {
      // Use preserved position if available, otherwise fallback to grid layout
      const position = nodeData.position || {
        x: 200 + (index % 3) * 400,
        y: 200 + Math.floor(index / 3) * 300
      };
      
      if (nodeData.type === 'question') {
        nodes.push({
          id: nodeData.id,
          type: 'question',
          position: position,
          data: {
            pathId: nodeData.pathId,
            topic: nodeData.topic || 'IMPORTED',
            isRoot: nodeData.level === 1,
            questionText: nodeData.content,
            questionLevel: nodeData.level,
            elementId: 'IMPORTED',
            subElementId: 'IMPORTED',
          }
        });
      } else if (nodeData.type === 'answer') {
        nodes.push({
          id: nodeData.id,
          type: 'answer',
          position: position,
          data: {
            pathId: nodeData.pathId,
            answerType: nodeData.answerType || 'single',
            variants: nodeData.variants || [],
            combinationRules: nodeData.combinationRules,
            topic: nodeData.topic || 'IMPORTED',
          }
        });
      } else if (nodeData.type === 'outcome') {
        nodes.push({
          id: nodeData.id,
          type: 'outcome',
          position: position,
          data: {
            pathId: nodeData.pathId,
            recommendation: nodeData.recommendation || 'No recommendation provided',
            topic: nodeData.topic || 'IMPORTED',
          }
        });
      }
    });
    
    // Convert navigation back to edges
    Object.entries(jsonData.navigation).forEach(([sourceId, nav]) => {
      if (nav.default) {
        const targetNode = nodes.find(n => n.data.pathId === nav.default);
        if (targetNode) {
          edges.push({
            id: `edge-${sourceId}-${targetNode.id}`,
            source: sourceId,
            target: targetNode.id,
            sourceHandle: 'default', // Add sourceHandle for default connections
            animated: true,
          });
        }
      }
      
      if (nav.variants) {
        Object.entries(nav.variants).forEach(([handle, targetPathId]) => {
          const targetNode = nodes.find(n => n.data.pathId === targetPathId);
          if (targetNode) {
            edges.push({
              id: `edge-${sourceId}-${targetNode.id}-${handle}`,
              source: sourceId,
              target: targetNode.id,
              sourceHandle: handle,
              animated: true,
            });
          }
        });
      }
    });
    
    return { nodes, edges };
  }
} 