# Node Positioning Fix

## Problem
When adding new question or answer nodes, all existing nodes would float towards the center of the canvas and overlay one another, making the flow builder unusable.

## Root Cause
The issue was caused by two main problems:

1. **`fitView` prop**: The React Flow component had `fitView={true}` which automatically repositioned all nodes to fit within the viewport whenever the component re-rendered.

2. **Aggressive state synchronization**: The `useEffect` hooks were constantly syncing the store state with local React Flow state, causing unnecessary re-renders and position resets.

## Solution Applied

### 1. Removed `fitView` prop
```tsx
// Before (PROBLEMATIC):
<ReactFlow
  // ... other props
  fitView  // This was causing nodes to be repositioned
  // ... other props
/>

// After (FIXED):
<ReactFlow
  // ... other props
  // fitView removed - nodes keep their positions
  // ... other props
/>
```

### 2. Improved State Synchronization
```tsx
// Before (PROBLEMATIC):
React.useEffect(() => {
  setNodes(nodes);  // This ran on every nodes change
}, [nodes, setNodes]);

// After (FIXED):
React.useEffect(() => {
  if (nodes.length !== nodesState.length) {
    setNodes(nodes);  // Only runs when nodes are added/removed
  }
}, [nodes.length, setNodes, nodesState.length]);
```

### 3. Enhanced Node Positioning Logic
```tsx
// Before (PROBLEMATIC):
const position = { x: Math.random() * 500 + 100, y: Math.random() * 300 + 100 };

// After (FIXED):
const getNextPosition = () => {
  // Grid-based positioning to avoid overlaps
  const gridSize = 350;
  const maxCols = 4;
  
  for (let i = 0; i < nodes.length + 1; i++) {
    const col = i % maxCols;
    const row = Math.floor(i / maxCols);
    
    x = 200 + col * gridSize;
    y = 200 + row * gridSize;
    
    // Check if position is far enough from existing nodes
    const tooClose = existingPositions.some(pos => 
      Math.abs(pos.x - x) < 250 && Math.abs(pos.y - y) < 200
    );
    
    if (!tooClose) break;
  }
  
  return { x, y };
};
```

## Result
- ✅ New nodes are positioned in a grid layout without overlapping
- ✅ Existing nodes maintain their positions when new nodes are added
- ✅ Users can drag nodes around without them snapping back to center
- ✅ The flow builder is now fully functional for creating complex questionnaire flows

## Testing
1. Open the application at `http://localhost:3001`
2. Click "Add Question" multiple times - nodes should appear in a grid
3. Click "Add Answer" multiple times - nodes should not overlap
4. Drag existing nodes around - they should stay where you place them
5. Add new nodes - existing nodes should not move

The positioning issue is now completely resolved! 