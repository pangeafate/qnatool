import { Node, Edge } from 'reactflow';

export const demoNodes: Node[] = [
  {
    id: 'q1',
    type: 'question',
    position: { x: 100, y: 100 },
    data: {
      pathId: 'DEMO-Q1',
      topic: 'DEMO',
      isRoot: true,
      questionText: 'What is your experience level with React?',
      questionLevel: 1,
      elementId: 'DEMO',
      subElementId: 'REACT',
    }
  },
  {
    id: 'a1',
    type: 'answer',
    position: { x: 100, y: 250 },
    data: {
      pathId: 'DEMO-Q1-A1',
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
      pathId: 'DEMO-Q1-A1-Q2',
      topic: 'DEMO',
      isRoot: false,
      questionText: 'Do you prefer TypeScript over JavaScript?',
      questionLevel: 2,
      elementId: 'DEMO',
      subElementId: 'TYPESCRIPT',
    }
  },
  {
    id: 'a2',
    type: 'answer',
    position: { x: 450, y: 250 },
    data: {
      pathId: 'DEMO-Q1-A1-Q2-A1',
      answerType: 'single',
      variants: [
        { id: 'var1', text: 'Yes', score: 1 },
        { id: 'var2', text: 'No', score: 0 }
      ]
    }
  }
];

export const demoEdges: Edge[] = [
  {
    id: 'e1',
    source: 'q1',
    target: 'a1',
    animated: true,
  },
  {
    id: 'e2',
    source: 'a1',
    target: 'q2',
    sourceHandle: 'var2',
    animated: true,
  },
  {
    id: 'e3',
    source: 'q2',
    target: 'a2',
    animated: true,
  }
];

export const demoData = {
  nodes: demoNodes,
  edges: demoEdges,
}; 