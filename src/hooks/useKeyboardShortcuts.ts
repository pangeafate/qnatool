import { useHotkeys } from 'react-hotkeys-hook';
import { useFlowStore } from '../stores/flowStore';

export function useKeyboardShortcuts() {
  const { selectedNodeId, createLinkedQuestion, deleteNode, undo, redo } = useFlowStore();
  
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
  
  // Delete key
  useHotkeys('delete, backspace', () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    }
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
    useFlowStore.getState().setSelectedNodeId(null);
  });
} 