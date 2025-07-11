# Toolbar Buttons Fix - Load Demo & Clear All

## Problem
The "Load Demo" and "Clear All" buttons in the Toolbar were not functioning because they were still trying to use the Zustand store methods, but we had moved node management to the App level.

## Root Cause
After implementing the node positioning fix, we moved node state management from the Zustand store to the App component level. However, the Toolbar's `loadDemo` and `clearFlow` functions were still calling:
- `setNodes(demoData.nodes)` - from the store
- `setEdges(demoData.edges)` - from the store  
- `clearFlow()` - from the store

Since nodes are now managed at the App level, these store methods had no effect on the displayed nodes.

## Solution Applied

### 1. **Updated Toolbar Props Interface**
```tsx
interface ToolbarProps {
  onAddNode?: (node: Node) => void;
  onLoadDemo?: () => void;           // NEW
  onClearAll?: () => void;           // NEW  
  onSetNodes?: (nodes: Node[]) => void; // NEW
  nodes?: Node[];
}
```

### 2. **Updated Toolbar Functions**
```tsx
// Before (BROKEN):
const loadDemo = () => {
  setNodes(demoData.nodes);  // Store method - no effect
  setEdges(demoData.edges);
};

// After (WORKING):
const loadDemo = () => {
  onLoadDemo?.();  // Callback to App component
};

// Before (BROKEN):
onClick={clearFlow}  // Store method - no effect

// After (WORKING):
onClick={onClearAll}  // Callback to App component
```

### 3. **Added App-Level Handlers**
```tsx
// App.tsx
function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const { setEdges } = useFlowStore();

  const handleLoadDemo = useCallback(() => {
    setNodes(demoData.nodes);  // Update App state
    setEdges(demoData.edges);  // Update store for edges
  }, [setEdges]);

  const handleClearAll = useCallback(() => {
    setNodes([]);              // Clear App state
    setEdges([]);              // Clear store edges
  }, [setEdges]);

  const handleSetNodes = useCallback((newNodes: Node[]) => {
    setNodes(newNodes);        // For import functionality
  }, []);

  return (
    <Toolbar 
      onAddNode={handleAddNode} 
      onLoadDemo={handleLoadDemo}     // NEW
      onClearAll={handleClearAll}     // NEW
      onSetNodes={handleSetNodes}     // NEW
      nodes={nodes} 
    />
  );
}
```

### 4. **Fixed Import/Export Functions**
```tsx
// Export now uses nodes from props instead of store
const exportFlow = () => {
  const data = {
    nodes: nodes,  // From props, not store
    edges: state.edges,
    timestamp: new Date().toISOString(),
  };
  // ... rest of export logic
};

// Import now uses callback to update App state
const importFlow = () => {
  // ... file reading logic
  if (data.nodes && data.edges) {
    onSetNodes?.(data.nodes);  // Update App state
    setEdges(data.edges);      // Update store for edges
  }
};
```

## Result

### ✅ **Load Demo Button**
- Loads demo nodes and edges correctly
- Displays the sample questionnaire flow
- Nodes appear in their proper positions

### ✅ **Clear All Button**  
- Clears all nodes and edges from the canvas
- Resets the flow to empty state
- Works immediately without page refresh

### ✅ **Import/Export Functions**
- Export includes current nodes from App state
- Import updates App state correctly
- Both functions work with the new architecture

### ✅ **Consistent State Management**
- Nodes managed at App level
- Edges still managed by Zustand store
- Clear separation of concerns

## Testing Instructions

1. Open `http://localhost:3001`
2. Click **"Load Demo"** - should see sample questionnaire flow
3. Click **"Clear All"** - should clear the canvas
4. Add some nodes manually
5. Click **"Clear All"** again - should clear everything
6. Click **"Load Demo"** again - should reload the demo

**All toolbar buttons now work correctly!** 🎉

## Technical Notes

- This maintains our hybrid approach: App-level node management + store-level edge management
- Import/Export functions work seamlessly with the new architecture  
- The fix is consistent with our positioning solution
- No breaking changes to existing functionality 