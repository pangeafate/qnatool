import { Node, Edge } from 'reactflow';

export const demoNodes: Node[] = [
  // First root question - TOPIC-1
  {
    id: 'q1',
    type: 'question',
    position: { x: 100, y: 100 },
    data: {
      pathId: 'TOPIC-1-Q1',
      topic: 'TOPIC-1',
      isRoot: true,
      questionText: 'What is your experience level with React?',
      questionLevel: 1,
      elementId: 'TOPIC-1',
      subElementId: 'REACT',
    }
  },
  {
    id: 'a1',
    type: 'answer',
    position: { x: 100, y: 250 },
    data: {
      pathId: 'TOPIC-1-Q1-A1',
      topic: 'TOPIC-1',
      answerType: 'single',
      variants: [
        { id: 'var1', text: 'Beginner', score: 1 },
        { id: 'var2', text: 'Intermediate', score: 2 },
        { id: 'var3', text: 'Advanced', score: 3 }
      ]
    }
  },
  {
    id: 'q2',
    type: 'question',
    position: { x: 450, y: 100 },
    data: {
      pathId: 'TOPIC-1-Q1-A1-Q2',
      topic: 'TOPIC-1',
      isRoot: false,
      questionText: 'Do you prefer TypeScript over JavaScript?',
      questionLevel: 2,
      elementId: 'TOPIC-1',
      subElementId: 'TYPESCRIPT',
    }
  },
  {
    id: 'a2',
    type: 'answer',
    position: { x: 450, y: 250 },
    data: {
      pathId: 'TOPIC-1-Q1-A1-Q2-A1',
      topic: 'TOPIC-1',
      answerType: 'single',
      variants: [
        { id: 'var1', text: 'Yes', score: 1 },
        { id: 'var2', text: 'No', score: 0 }
      ]
    }
  },
  
  // Second root question - TOPIC-2
  {
    id: 'q3',
    type: 'question',
    position: { x: 100, y: 400 },
    data: {
      pathId: 'TOPIC-2-Q1',
      topic: 'TOPIC-2',
      isRoot: true,
      questionText: 'What is your preferred development environment?',
      questionLevel: 1,
      elementId: 'TOPIC-2',
      subElementId: 'DEVENV',
    }
  },
  {
    id: 'a3',
    type: 'answer',
    position: { x: 100, y: 550 },
    data: {
      pathId: 'TOPIC-2-Q1-A1',
      topic: 'TOPIC-2',
      answerType: 'multiple',
      variants: [
        { id: 'var1', text: 'VS Code', score: 1 },
        { id: 'var2', text: 'WebStorm', score: 2 },
        { id: 'var3', text: 'Vim/Neovim', score: 3 }
      ]
    }
  },
  
  // Cross-topic connection - outcome that connects both topics
  {
    id: 'outcome1',
    type: 'outcome',
    position: { x: 800, y: 300 },
    data: {
      pathId: 'CROSS-CONNECTED-E1',
      topic: 'CROSS-CONNECTED',
      outcomeText: 'Recommended Learning Path',
      outcomeType: 'recommendation',
      score: 0
    }
  }
];

export const demoEdges: Edge[] = [
  // TOPIC-1 edges
  {
    id: 'e1',
    source: 'q1',
    target: 'a1',
    animated: true,
    type: 'smoothstep',
  },
  {
    id: 'e2',
    source: 'a1',
    target: 'q2',
    animated: true,
    type: 'smoothstep',
  },
  {
    id: 'e3',
    source: 'q2',
    target: 'a2',
    animated: true,
    type: 'smoothstep',
  },
  
  // TOPIC-2 edges
  {
    id: 'e4',
    source: 'q3',
    target: 'a3',
    animated: true,
    type: 'smoothstep',
  },
  
  // Cross-topic connections to outcome
  {
    id: 'e5',
    source: 'a2',
    target: 'outcome1',
    animated: true,
    type: 'smoothstep',
  },
  {
    id: 'e6',
    source: 'a3',
    target: 'outcome1',
    sourceHandle: 'variant-0', // Connect via first variant
    animated: true,
    type: 'smoothstep',
  }
];

export const demoData = {
  nodes: demoNodes,
  edges: demoEdges
}; 