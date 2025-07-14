import { useHotkeys } from 'react-hotkeys-hook';
import { useFlowStore } from '../stores/flowStore';

export function useKeyboardShortcuts() {
  const { selectedNodeId, selectedEdgeId, selectedNodeIds, createLinkedQuestion, deleteNode, deleteEdge, undo, redo, copySelectedNodes, pasteNodes } = useFlowStore();
  
  // Tab to create linked question
  useHotkeys('tab', (e: KeyboardEvent) => {
    e.preventDefault();
    if (selectedNodeId) {
      const selectedNode = useFlowStore.getState().nodes.find(n => n.id === selectedNodeId);
      if (selectedNode) {
        const newPosition = {
          x: selectedNode.position.x + 300,
          y: selectedNode.position.y
        };
        createLinkedQuestion(selectedNodeId, newPosition);
      }
    }
  });
  
  // Delete key - handle both nodes and edges
  useHotkeys('delete, backspace', () => {
    if (selectedEdgeId) {
      // Delete selected edge
      deleteEdge(selectedEdgeId);
    } else if (selectedNodeIds.length > 0) {
      // Delete all selected nodes
      selectedNodeIds.forEach(nodeId => deleteNode(nodeId));
    } else if (selectedNodeId) {
      // Delete single selected node
      deleteNode(selectedNodeId);
    }
  });
  
  // Copy: Ctrl+C (Windows) / Cmd+C (Mac)
  useHotkeys('ctrl+c, cmd+c', (e: KeyboardEvent) => {
    e.preventDefault();
    console.log('Copy shortcut pressed, selectedNodeIds:', selectedNodeIds);
    if (selectedNodeIds.length > 0) {
      copySelectedNodes();
    }
  });
  
  // Paste: Ctrl+V (Windows) / Cmd+V (Mac)
  useHotkeys('ctrl+v, cmd+v', (e: KeyboardEvent) => {
    e.preventDefault();
    console.log('Paste shortcut pressed');
    // Paste at a slight offset from the original position
    pasteNodes({ x: 50, y: 50 });
  });
  
  // Undo: Ctrl+Z (Windows) / Cmd+Z (Mac)
  useHotkeys('ctrl+z, cmd+z', (e: KeyboardEvent) => {
    e.preventDefault();
    undo();
  });
  
  // Redo: Ctrl+Y (Windows) / Cmd+Shift+Z (Mac)
  useHotkeys('ctrl+y, cmd+shift+z', (e: KeyboardEvent) => {
    e.preventDefault();
    redo();
  });
  
  // Escape to deselect
  useHotkeys('escape', () => {
    const { setSelectedNodeId, setSelectedEdgeId, clearSelection } = useFlowStore.getState();
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    clearSelection();
  });
} 