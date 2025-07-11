import * as XLSX from 'xlsx';
import { Node, Edge } from 'reactflow';
import { PathIdGenerator } from './pathIdGenerator';

export interface ExcelRowData {
  pathId: string;
  questionText: string;
  questionLevel: number;
  elementId: string;
  subElementId: string;
  answerVariants?: string;
  scores?: string;
}

export class ExcelParser {
  private pathGenerator: PathIdGenerator;
  
  constructor() {
    this.pathGenerator = PathIdGenerator.getInstance();
  }

  parseExcelFile(file: File): Promise<{ nodes: Node[], edges: Edge[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData: ExcelRowData[] = XLSX.utils.sheet_to_json(worksheet);
          
          const { nodes, edges } = this.convertToFlowData(jsonData);
          resolve({ nodes, edges });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  }

  private convertToFlowData(data: ExcelRowData[]): { nodes: Node[], edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeMap = new Map<string, Node>();
    
    // Group by pathId to create question-answer pairs
    const groupedData = this.groupByPathId(data);
    
    let yOffset = 0;
    const xSpacing = 350;
    const ySpacing = 200;
    
    Object.entries(groupedData).forEach(([pathId, rows]) => {
      const row = rows[0]; // Use first row for question data
      
      // Create question node
      const questionId = `q-${pathId}`;
      const questionNode: Node = {
        id: questionId,
        type: 'question',
        position: { 
          x: (row.questionLevel - 1) * xSpacing, 
          y: yOffset 
        },
        data: {
          pathId: row.pathId,
          questionText: row.questionText,
          questionLevel: row.questionLevel,
          elementId: row.elementId,
          subElementId: row.subElementId,
        }
      };
      
      nodes.push(questionNode);
      nodeMap.set(pathId, questionNode);
      
      // Create answer node if variants exist
      if (row.answerVariants) {
        const answerId = `a-${pathId}`;
        const variants = this.parseAnswerVariants(row.answerVariants, row.scores);
        
        const answerNode: Node = {
          id: answerId,
          type: 'answer',
          position: { 
            x: (row.questionLevel - 1) * xSpacing, 
            y: yOffset + 120 
          },
          data: {
            answerType: variants.length > 2 ? 'multiple' : 'single',
            variants: variants
          }
        };
        
        nodes.push(answerNode);
        
        // Create edge between question and answer
        const edge: Edge = {
          id: this.pathGenerator.generateEdgeId(questionId, answerId),
          source: questionId,
          target: answerId,
          animated: true,
        };
        
        edges.push(edge);
      }
      
      yOffset += ySpacing;
    });
    
    return { nodes, edges };
  }

  private groupByPathId(data: ExcelRowData[]): Record<string, ExcelRowData[]> {
    return data.reduce((acc, row) => {
      if (!acc[row.pathId]) {
        acc[row.pathId] = [];
      }
      acc[row.pathId].push(row);
      return acc;
    }, {} as Record<string, ExcelRowData[]>);
  }

  private parseAnswerVariants(variants: string, scores?: string) {
    const variantTexts = variants.split(',').map(v => v.trim());
    const scoreValues = scores ? scores.split(',').map(s => parseFloat(s.trim())) : [];
    
    return variantTexts.map((text, index) => ({
      id: `var-${index + 1}`,
      text,
      score: scoreValues[index] || 0,
    }));
  }

  exportToExcel(nodes: Node[], edges: Edge[]): Blob {
    const data: ExcelRowData[] = [];
    
    // Convert nodes back to Excel format
    nodes.forEach(node => {
      if (node.type === 'question') {
        const answerNode = nodes.find(n => 
          n.type === 'answer' && 
          edges.some(e => e.source === node.id && e.target === n.id)
        );
        
        const row: ExcelRowData = {
          pathId: node.data.pathId,
          questionText: node.data.questionText,
          questionLevel: node.data.questionLevel,
          elementId: node.data.elementId,
          subElementId: node.data.subElementId,
        };
        
        if (answerNode) {
          row.answerVariants = answerNode.data.variants.map((v: any) => v.text).join(', ');
          row.scores = answerNode.data.variants.map((v: any) => v.score).join(', ');
        }
        
        data.push(row);
      }
    });
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
} 