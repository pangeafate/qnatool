
import { useState, useCallback } from "react";
import { FlowCanvas } from "./components/Canvas/FlowCanvas";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { LandingScreen } from "./components/LandingScreen/LandingScreen";
import { Node } from "reactflow";
import { demoData } from "./utils/demoData";
import { useFlowStore } from "./stores/flowStore";
import { ExportService } from "./services/exportService";
import "./App.css";

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const { nodes, addNode, setNodes, setEdges, clearFlow } = useFlowStore();

  // Auto-load default flow when entering the app
  const handleEnterApp = useCallback(async () => {
    try {
      // Load the default flow file
      const response = await fetch('/qnatool/flow-Topic-1752233651561.json');
      if (response.ok) {
        const jsonData = await response.json();
        
        // Import the default flow
        const exportService = new ExportService();
        const { nodes: importedNodes, edges: importedEdges } = exportService.importFromJson(jsonData);
        
        // Set bulk update flag if available
        if ((window as any).flowCanvasSetBulkUpdate) {
          (window as any).flowCanvasSetBulkUpdate();
        }
        
        setNodes(importedNodes);
        setEdges(importedEdges);
        
        console.log('Default flow loaded successfully');
      } else {
        console.warn('Default flow not found, loading demo data instead');
        // Fallback to demo data
        setNodes(demoData.nodes);
        setEdges(demoData.edges);
      }
    } catch (error) {
      console.error('Error loading default flow:', error);
      // Fallback to demo data
      setNodes(demoData.nodes);
      setEdges(demoData.edges);
    }
    
    setShowLanding(false);
  }, [setNodes, setEdges]);

  const handleAddNode = useCallback((node: Node) => {
    addNode(node);
  }, [addNode]);

  const handleLoadDemo = useCallback(() => {
    setNodes(demoData.nodes);
    setEdges(demoData.edges);
    // Clean up any potential duplicates
    setTimeout(() => {
      const { cleanupDuplicateEdges } = useFlowStore.getState();
      cleanupDuplicateEdges();
    }, 100);
  }, [setNodes, setEdges]);

  const handleClearAll = useCallback(() => {
    clearFlow();
  }, [clearFlow]);

  const handleSetNodes = useCallback((newNodes: Node[]) => {
    setNodes(newNodes);
  }, [setNodes]);

  const handleBackToLanding = useCallback(() => {
    setShowLanding(true);
  }, []);

  if (showLanding) {
    return <LandingScreen onEnterApp={handleEnterApp} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToLanding}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            ← Back to Home
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Question Flow Builder</h1>
        </div>
        <div className="text-sm text-gray-500">
          {nodes.length} nodes • Auto-loaded flow
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar 
        onAddNode={handleAddNode}
        onLoadDemo={handleLoadDemo}
        onClearAll={handleClearAll}
        onSetNodes={handleSetNodes}
        nodes={nodes}
      />
      
      {/* Canvas */}
      <div className="flex-1">
        <FlowCanvas />
      </div>
    </div>
  );
}

export default App; 