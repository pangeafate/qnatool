export interface QuestionNode {
  id: string;
  type: 'question';
  data: {
    pathId: string;
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
    pathId: string;
    answerType: 'single' | 'multiple';
    variants: AnswerVariant[];
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
  nodes: (QuestionNode | AnswerNode)[];
  edges: FlowEdge[];
}

export type FlowNode = QuestionNode | AnswerNode;

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
    type: 'Q' | 'A' | 'V' | 'E';
    number: number;
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
      pathId: string;
      content: string;
      level: number;
      
      // For questions
      topic?: string;
      
      // For answers
      answerType?: 'single' | 'multiple';
      variants?: Array<{
        id: string;
        text: string;
        score: number;
        allowsInput?: boolean;
        inputValidation?: string;
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