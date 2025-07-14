import { Node, Edge } from 'reactflow';
import { QuestionFlowExport, AnswerVariant } from '../types/flow.types';

export class ExportService {
  /**
   * Generate all possible combinations for a set of variants
   */
  private generateCombinationsForNode(variants: AnswerVariant[]): Array<{
    id: string;
    variantIndices: number[];
    pathId: string;
    label: string;
  }> {
    const combinations = [];
    const n = variants.length;
    
    // Generate all possible combinations (2^n - 1, excluding empty set)
    for (let i = 1; i < Math.pow(2, n); i++) {
      const variantIndices: number[] = [];
      const labels: string[] = [];
      
      for (let j = 0; j < n; j++) {
        if (i & (1 << j)) {
          variantIndices.push(j + 1); // Use 1-based indexing for consistency
          labels.push(variants[j].text || `Variant ${j + 1}`);
        }
      }
      
      // Create combination
      const combination = {
        id: `combo-${i}`,
        variantIndices,
        pathId: `PATH-V${variantIndices.join('+V')}`, // Will be updated during path propagation
        label: labels.join(' + ')
      };
      
      combinations.push(combination);
    }
    
    return combinations;
  }

  /**
   * Export flow data to the new hierarchical JSON format
   */
  exportToJson(nodes: Node[], edges: Edge[]): QuestionFlowExport {
    const questionNodes = nodes.filter(n => n.type === 'question');
    const answerNodes = nodes.filter(n => n.type === 'answer');
    const outcomeNodes = nodes.filter(n => n.type === 'outcome');
    
    // Get all root questions and their topics
    const rootQuestions = questionNodes.filter(n => n.data.isRoot);
    const topics = rootQuestions.map(n => n.data.topic).filter(Boolean);
    const topic = topics.length > 1 ? `Multi-Topic (${topics.join(', ')})` : (topics[0] || 'UNTITLED');
    
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
        pathIds: node.data.pathIds && node.data.pathIds.length > 1 ? node.data.pathIds : undefined,
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
        pathIds: node.data.pathIds && node.data.pathIds.length > 1 ? node.data.pathIds : undefined,
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
          additionalInfo: v.additionalInfo,
        })),
        // Include combination data for proper reconstruction
        combinations: node.data.answerType === 'combinations' ? this.generateCombinationsForNode(node.data.variants || []) : undefined,
        combinationRules: node.data.combinationRules,
      };
    });
    
    // Process outcome nodes
    outcomeNodes.forEach(node => {
      nodesMap[node.id] = {
        id: node.id,
        type: 'outcome',
        pathId: node.data.pathId,
        pathIds: node.data.pathIds && node.data.pathIds.length > 1 ? node.data.pathIds : undefined,
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
      } else if (edge.sourceHandle && edge.sourceHandle.startsWith('combination-')) {
        // Combination-specific navigation
        if (!navigation[edge.source].combinations) {
          navigation[edge.source].combinations = {};
        }
        navigation[edge.source].combinations![edge.sourceHandle] = targetNode.data.pathId;
      } else {
        // Default navigation
        navigation[edge.source].default = targetNode.data.pathId;
      }
    });
    
    // Process multiple choice rules
    answerNodes.forEach(node => {
      if ((node.data.answerType === 'multiple' || node.data.answerType === 'combinations') && node.data.combinationRules) {
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
      'All Path IDs',
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
          node.pathIds ? node.pathIds.join(' | ') : node.pathId,
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
            node.pathIds ? node.pathIds.join(' | ') : node.pathId,
            this.cleanPathId(node.pathId),
            'Answer',
            variant.text,
            '0',
            variant.text,
            variant.score.toString(),
            nextPath
          ]);
        });
        
        // Add combination rows if the answer type is combinations
        if (node.answerType === 'combinations' && node.combinations) {
          node.combinations.forEach((combination) => {
            const nextPath = flowData.navigation[node.id]?.combinations?.[`combination-${combination.id}`] || '';
            rows.push([
              node.pathId,
              node.pathIds ? node.pathIds.join(' | ') : node.pathId,
              this.cleanPathId(node.pathId),
              'Combination',
              combination.label,
              '0',
              combination.label,
              combination.variantIndices.map(idx => node.variants?.[idx]?.score || 0).reduce((a, b) => a + b, 0).toString(),
              nextPath
            ]);
          });
        }
      } else if (node.type === 'outcome') {
        rows.push([
          node.pathId,
          node.pathIds ? node.pathIds.join(' | ') : node.pathId,
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
            pathIds: nodeData.pathIds || [nodeData.pathId],
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
            pathIds: nodeData.pathIds || [nodeData.pathId],
            answerType: nodeData.answerType || 'single',
            variants: nodeData.variants || [],
            combinations: nodeData.combinations, // Restore combination data
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
            pathIds: nodeData.pathIds || [nodeData.pathId],
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
      
      if (nav.combinations) {
        Object.entries(nav.combinations).forEach(([handle, targetPathId]) => {
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

  /**
   * Test method to verify combination export/import functionality
   */
  testCombinationExportImport(): boolean {
    console.log('Testing combination export/import functionality...');
    
    // Create test data with combinations
    const testNodes: Node[] = [
      {
        id: 'test-answer-1',
        type: 'answer',
        position: { x: 100, y: 100 },
        data: {
          pathId: 'Test-A1',
          pathIds: ['Test-A1'],
          answerType: 'combinations',
          variants: [
            { id: 'var1', text: 'Option A', score: 1 },
            { id: 'var2', text: 'Option B', score: 2 }
          ],
          topic: 'Test'
        }
      },
      {
        id: 'test-question-1',
        type: 'question',
        position: { x: 300, y: 100 },
        data: {
          pathId: 'Test-A1-V0+V1-Q1',
          pathIds: ['Test-A1-V0+V1-Q1'],
          questionText: 'Test Question',
          questionLevel: 2,
          topic: 'Test',
          isRoot: false,
          elementId: 'E1',
          subElementId: 'SE1'
        }
      }
    ];
    
    const testEdges: Edge[] = [
      {
        id: 'test-edge-1',
        source: 'test-answer-1',
        target: 'test-question-1',
        sourceHandle: 'combination-combo-3', // Combination of both variants
        animated: true
      }
    ];
    
    try {
      // Export
      const exportData = this.exportToJson(testNodes, testEdges);
      console.log('Export successful:', {
        hasNavigationCombinations: !!exportData.navigation['test-answer-1']?.combinations,
        hasCombinationData: !!exportData.nodes['test-answer-1']?.combinations
      });
      
      // Import
      const { nodes: importedNodes, edges: importedEdges } = this.importFromJson(exportData);
      console.log('Import successful:', {
        nodeCount: importedNodes.length,
        edgeCount: importedEdges.length,
        hasCombinationHandle: importedEdges.some(e => e.sourceHandle?.startsWith('combination-'))
      });
      
      return true;
    } catch (error) {
      console.error('Test failed:', error);
      return false;
    }
  }
} 