import { useHotkeys } from 'react-hotkeys-hook';
import { useFlowStore } from '../stores/flowStore';
import { useReactFlow } from 'reactflow';

export function useKeyboardShortcuts() {
  const reactFlow = useReactFlow();
  // Tab to create linked question
  useHotkeys('tab', (e: KeyboardEvent) => {
    e.preventDefault();
    const { selectedNodeId, nodes, createLinkedQuestion } = useFlowStore.getState();
    if (selectedNodeId) {
      const selectedNode = nodes.find(n => n.id === selectedNodeId);
      if (selectedNode) {
        const newPosition = {
          x: selectedNode.position.x + 300,
          y: selectedNode.position.y
        };
        createLinkedQuestion(selectedNodeId, newPosition);
      }
    }
  }, { enableOnFormTags: false });
  
  // Delete key - handle both nodes and edges
  useHotkeys('delete, backspace', () => {
    const { selectedEdgeId, selectedNodeIds, selectedNodeId, deleteNode, deleteNodes, deleteEdge } = useFlowStore.getState();
    if (selectedEdgeId) {
      // Delete selected edge
      deleteEdge(selectedEdgeId);
    } else if (selectedNodeIds.length > 0) {
      // Delete all selected nodes at once (more efficient)
      deleteNodes(selectedNodeIds);
    } else if (selectedNodeId) {
      // Delete single selected node
      deleteNode(selectedNodeId);
    }
  }, { enableOnFormTags: false });
  
  // Copy: Ctrl+C (Windows) / Cmd+C (Mac)
  useHotkeys('ctrl+c, cmd+c', (e: KeyboardEvent) => {
    e.preventDefault();
    const { selectedNodeIds, copySelectedNodes } = useFlowStore.getState();
    console.log('Copy shortcut pressed, selectedNodeIds:', selectedNodeIds);
    if (selectedNodeIds.length > 0) {
      copySelectedNodes();
      console.log(`✅ Copied ${selectedNodeIds.length} node(s) to clipboard`);
    } else {
      console.log('⚠️ No nodes selected for copying');
    }
  }, { enableOnFormTags: false });
  
  // Paste: Ctrl+V (Windows) / Cmd+V (Mac)
  useHotkeys('ctrl+v, cmd+v', (e: KeyboardEvent) => {
    e.preventDefault();
    const { clipboard, pasteNodes } = useFlowStore.getState();
    console.log('Paste shortcut pressed');
    console.log('📋 Clipboard contents:', clipboard);
    console.log('📋 Clipboard nodes count:', clipboard.nodes.length);
    console.log('📋 Clipboard edges count:', clipboard.edges.length);
    
    if (clipboard.nodes.length > 0) {
      // Get viewport center for pasting
      const viewport = reactFlow.getViewport();
      
      // Calculate center of the current viewport
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      
      console.log(`📍 Pasting at viewport center: (${centerX}, ${centerY})`);
      
      pasteNodes({ x: centerX, y: centerY });
      console.log(`✅ Pasted ${clipboard.nodes.length} node(s) from clipboard at viewport center`);
    } else {
      console.log('⚠️ Clipboard is empty - nothing to paste');
      console.log('⚠️ Full clipboard object:', JSON.stringify(clipboard, null, 2));
    }
  }, { enableOnFormTags: false });
  
  // Undo: Ctrl+Z (Windows) / Cmd+Z (Mac)
  useHotkeys('ctrl+z, cmd+z', (e: KeyboardEvent) => {
    e.preventDefault();
    const { undo } = useFlowStore.getState();
    undo();
  }, { enableOnFormTags: false });
  
  // Redo: Ctrl+Y (Windows) / Cmd+Shift+Z (Mac)
  useHotkeys('ctrl+y, cmd+shift+z', (e: KeyboardEvent) => {
    e.preventDefault();
    const { redo } = useFlowStore.getState();
    redo();
  }, { enableOnFormTags: false });
  
  // Escape to deselect
  useHotkeys('escape', () => {
    const { setSelectedNodeId, setSelectedEdgeId, clearSelection } = useFlowStore.getState();
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    clearSelection();
  }, { enableOnFormTags: false });

  // Note: Shift+D is now handled as a selection mode in FlowCanvas.tsx
  // Users can hold Shift+D and drag to select and immediately delete nodes
}