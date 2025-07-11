
import { useCallback } from "react";
import { FlowCanvas } from "./components/Canvas/FlowCanvas";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { Node } from "reactflow";
import { demoData } from "./utils/demoData";
import { useFlowStore } from "./stores/flowStore";
import "./App.css";

function App() {
  const { nodes, addNode, setNodes, setEdges, clearFlow } = useFlowStore();

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

  return (
    <div className="relative w-screen h-screen bg-gray-50">
      {/* Header and Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur shadow-lg border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Question Flow Builder
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Create and manage complex questionnaire flows with visual connections
                  </p>
                </div>
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
          </div>
        </div>
      </div>
      
              {/* Main Canvas */}
        <div className="pt-24 w-full h-full">
          <FlowCanvas />
        </div>
    </div>
  );
}

export default App; 