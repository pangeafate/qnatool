export interface QuestionNode {
  id: string;
  type: 'question';
  data: {
    pathId: string; // Keep for backward compatibility
    pathIds: string[]; // New: support multiple path IDs
    topic: string;
    isRoot: boolean;
    questionText: string;
    questionLevel: number;
    elementId: string;
    subElementId: string;
    metadata?: Record<string, any>;
  };
  position: { x: number; y: number };
}

export interface AnswerNode {
  id: string;
  type: 'answer';
  data: {
    pathId: string; // Keep for backward compatibility
    pathIds: string[]; // New: support multiple path IDs
    answerType: 'single' | 'multiple' | 'combinations';
    variants: AnswerVariant[];
    combinations?: Array<{
      id: string;
      variantIndices: number[];
      pathId: string;
      label: string;
    }>;
    defaultNextPath?: string;
    combinationRules?: Array<{
      selectedVariants: string[];
      nextNode: string;
    }>;
  };
  position: { x: number; y: number };
}

export interface AnswerVariant {
  id: string;
  text: string;
  score: number;
  allowsInput?: boolean;
  inputValidation?: 'number' | 'string' | 'email' | 'date';
  inputPlaceholder?: string;
  nextPathOverride?: string;
  additionalInfo?: string; // New field for additional information
}

export interface OutcomeNode {
  id: string;
  type: 'outcome';
  data: {
    pathId: string; // Keep for backward compatibility
    pathIds: string[]; // New: support multiple path IDs
    outcomeText: string;
    recommendation?: string;
    score?: number;
    metadata?: Record<string, any>;
  };
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  animated?: boolean;
  label?: string;
}

export interface FlowData {
  nodes: (QuestionNode | AnswerNode | OutcomeNode)[];
  edges: FlowEdge[];
}

export type FlowNode = QuestionNode | AnswerNode | OutcomeNode;

// New Path ID System Types
export interface PathIdComponents {
  topic: string;
  segments: Array<{
    type: 'Q' | 'A';
    number: number;
  }>;
}

export interface PathIdComponentsWithVariants {
  topic: string;
  segments: Array<{
    type: 'Q' | 'A' | 'V' | 'E' | 'VC';
    number?: number;
    numbers?: number[];
  }>;
}

export interface NodePathData {
  nodeId: string;
  pathId: string;
  parentPathId: string | null;
  level: number;
  topic: string;
}

export interface PathRegistry {
  nodeToPathsMap: Map<string, string[]>;
  pathToNodeMap: Map<string, string>;
}

// Export Structure
export interface QuestionFlowExport {
  metadata: {
    topic: string;
    version: string;
    createdAt: string;
    totalQuestions: number;
  };
  
  nodes: {
    [nodeId: string]: {
      id: string;
      type: 'question' | 'answer' | 'outcome';
      pathId: string; // Primary path ID for backward compatibility
      pathIds?: string[]; // Multiple path IDs for nodes with multiple paths
      content: string;
      level: number;
      position: { x: number; y: number }; // Add position to preserve layout
      
      // For questions
      topic?: string;
      
      // For answers
      answerType?: 'single' | 'multiple' | 'combinations';
      variants?: Array<{
        id: string;
        text: string;
        score: number;
        allowsInput?: boolean;
        inputValidation?: string;
        additionalInfo?: string;
      }>;
      
      // For combinations
      combinations?: Array<{
        id: string;
        variantIndices: number[];
        pathId: string;
        label: string;
      }>;
      
      // Navigation rules for multiple-choice
      combinationRules?: Array<{
        selectedVariants: string[];
        nextNode: string;
      }>;
      
      // For outcomes
      recommendation?: string;
    };
  };
  
  // Simple navigation for single-choice paths
  navigation: {
    [fromNodeId: string]: {
      default?: string;
      variants?: {
        [variantId: string]: string;
      };
      combinations?: {
        [combinationId: string]: string;
      };
    };
  };
  
  // For complex multiple-choice navigation
  multipleChoiceRules: {
    [answerNodeId: string]: Array<{
      condition: string[];
      nextNode: string;
      priority: number;
    }>;
  };
} 