import { 
  Play, 
  MousePointer, 
  Keyboard, 
  Download, 
  Upload, 
  Zap,
  HelpCircle,
  MessageSquare,
  Target,
  ArrowRight,
  Sparkles,
  GitBranch,
  Eye,
  MousePointer2,
  Layers,
  Hash
} from 'lucide-react';

interface LandingScreenProps {
  onEnterApp: () => void;
}

export function LandingScreen({ onEnterApp }: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <GitBranch className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Question Flow Builder
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Create interactive questionnaire flows with a powerful visual interface. 
              Design complex decision trees, manage answer variants, and export your work seamlessly.
            </p>
            <button
              onClick={onEnterApp}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Building
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-gray-600">
            Everything you need to create professional questionnaire flows
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Visual Flow Builder */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <MousePointer className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Visual Flow Builder
            </h3>
            <p className="text-gray-600">
              Drag and drop nodes to create complex questionnaire flows. Connect questions, answers, and outcomes with intuitive visual connections.
            </p>
          </div>

          {/* Double-Click Navigation */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
              <MousePointer2 className="w-6 h-6 text-cyan-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Double-Click Navigation
            </h3>
            <p className="text-gray-600">
              Double-click any node, answer variant, or combination to instantly focus on the next connected element. Navigate your flow with ease.
            </p>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Keyboard className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Keyboard Shortcuts
            </h3>
            <p className="text-gray-600">
              Work efficiently with keyboard shortcuts: Tab to create nodes, Delete to remove, Cmd/Ctrl+Z for undo, and more.
            </p>
          </div>

          {/* Import/Export */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <div className="flex items-center space-x-1">
                <Upload className="w-3 h-3 text-purple-600" />
                <Download className="w-3 h-3 text-purple-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Import & Export
            </h3>
            <p className="text-gray-600">
              Import Excel files or JSON flows. Export your work to share or backup. Seamless integration with existing workflows.
            </p>
          </div>

          {/* Real-time Validation */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Eye className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Real-time Validation
            </h3>
            <p className="text-gray-600">
              Instant visual feedback for orphaned nodes, missing connections, and flow integrity issues. Orange highlights show problems.
            </p>
          </div>

          {/* Path ID System */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Hash className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Smart Path IDs
            </h3>
            <p className="text-gray-600">
              Automatic generation of hierarchical path IDs (Q1, Q2, A1, A2, E1, E2) for questions, answers, and outcomes. All paths visible on nodes.
            </p>
          </div>

          {/* Answer Combinations */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center mb-4">
              <Layers className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Answer Combinations
            </h3>
            <p className="text-gray-600">
              Create complex multi-select scenarios with combination logic. Generate paths like V1+V2, V1+V3 for sophisticated questionnaire flows.
            </p>
          </div>

          {/* Smart Path Propagation */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Smart Path Propagation
            </h3>
            <p className="text-gray-600">
              Intelligent path propagation across all answer types. Single, Multiple, and Combinations modes all generate correct variant paths.
            </p>
          </div>

          {/* Undo/Redo */}
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Undo/Redo System
            </h3>
            <p className="text-gray-600">
              50-state history with standard keyboard shortcuts. Never lose your work with comprehensive undo/redo functionality.
            </p>
          </div>
        </div>
      </div>

      {/* Answer Types Section */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Answer Types & Modes
            </h2>
            <p className="text-lg text-gray-600">
              Three powerful modes for different questionnaire scenarios
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Single Mode */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Single Mode
              </h3>
              <p className="text-gray-600 mb-4">
                Traditional single-choice questions where users select one answer from multiple options.
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-700 mb-2">Example Path IDs:</div>
                <div className="text-xs font-mono text-blue-600">Topic-Q1-A1-E1</div>
                <div className="text-xs font-mono text-blue-600">Topic-Q1-A2-E2</div>
              </div>
            </div>

            {/* Multiple Mode */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Multiple Mode
              </h3>
              <p className="text-gray-600 mb-4">
                Multi-choice questions where each answer variant creates its own independent path.
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-700 mb-2">Example Path IDs:</div>
                <div className="text-xs font-mono text-purple-600">Topic-Q1-A1-V1-E1</div>
                <div className="text-xs font-mono text-purple-600">Topic-Q1-A1-V2-E2</div>
              </div>
            </div>

            {/* Combinations Mode */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Combinations Mode
              </h3>
              <p className="text-gray-600 mb-4">
                Advanced multi-select with combination logic. Each possible combination of answers creates unique paths.
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-700 mb-2">Example Path IDs:</div>
                <div className="text-xs font-mono text-rose-600">Topic-Q1-A1-V1+V2-E1</div>
                <div className="text-xs font-mono text-rose-600">Topic-Q1-A1-V1+V3-E2</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Node Types & Colors */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Node Types & Visual Guide
            </h2>
            <p className="text-lg text-gray-600">
              Understanding the visual language of your flows
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Question Nodes */}
            <div className="text-center">
              <div className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-lg mb-4 max-w-sm mx-auto">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-blue-600">Question</span>
                </div>
                <div className="text-sm text-gray-700 mb-3">
                  What is your experience level?
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Topic-Q1
                  </div>
                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Topic-Q2
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                <HelpCircle className="w-5 h-5 inline mr-2 text-blue-500" />
                Question Nodes
              </h3>
              <p className="text-gray-600 text-sm">
                Blue theme • Single outgoing connection • Contains question text and level information • Shows all propagated path IDs
              </p>
            </div>

            {/* Answer Nodes */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6 shadow-lg mb-4 max-w-sm mx-auto">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-purple-600">Answer</span>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="text-xs bg-white rounded px-2 py-1 border">Yes (Score: 1)</div>
                  <div className="text-xs bg-white rounded px-2 py-1 border">No (Score: 0)</div>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                    Topic-Q1-A1
                  </div>
                  <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                    Topic-Q1-A1-V1
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                <MessageSquare className="w-5 h-5 inline mr-2 text-purple-500" />
                Answer Nodes
              </h3>
              <p className="text-gray-600 text-sm">
                Purple theme • Three modes: Single, Multiple, Combinations • Scoring system • Shows all propagated path IDs
              </p>
            </div>

            {/* Outcome Nodes */}
            <div className="text-center">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 shadow-lg mb-4 max-w-sm mx-auto">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-green-600">Outcome</span>
                </div>
                <div className="text-sm text-gray-700 mb-3">
                  You should explore visual tools...
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Topic-Q1-A1-E1
                  </div>
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Topic-Q1-A1-V1-E1
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                <Target className="w-5 h-5 inline mr-2 text-green-500" />
                Outcome Nodes
              </h3>
              <p className="text-gray-600 text-sm">
                Green theme • End points • Contains recommendations • No outgoing connections • Shows all propagated path IDs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation & Interaction */}
      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Navigation & Interaction
            </h2>
            <p className="text-lg text-gray-600">
              Intuitive ways to navigate and interact with your flows
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Double-Click Navigation */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-cyan-100 rounded-lg flex items-center justify-center mb-6 mx-auto">
                <MousePointer2 className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                Double-Click Navigation
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-gray-900">Question Nodes</div>
                    <div className="text-sm text-gray-600">Double-click to focus on the connected answer node</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-gray-900">Answer Nodes (Single)</div>
                    <div className="text-sm text-gray-600">Double-click to focus on the next connected node</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-gray-900">Answer Variants (Multiple)</div>
                    <div className="text-sm text-gray-600">Double-click individual variants to follow their path</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-rose-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-gray-900">Combinations</div>
                    <div className="text-sm text-gray-600">Double-click combination items to navigate their unique paths</div>
                  </div>
                </div>
              </div>
            </div>

            {/* PathID Display */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center mb-6 mx-auto">
                <Hash className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                PathID Display System
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-2">All Nodes Show Multiple Paths</div>
                  <div className="text-sm text-gray-600">Every node displays all propagated path IDs as badges, making it easy to track complex flows</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-2">Automatic Propagation</div>
                  <div className="text-sm text-gray-600">Path IDs automatically propagate through the flow, updating connected nodes when changes occur</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-2">Smart Variant Generation</div>
                  <div className="text-sm text-gray-600">Multiple and Combinations modes generate appropriate variant paths (V1, V2, V1+V2, etc.)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Indicators */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Visual Indicators & Alerts
            </h2>
            <p className="text-lg text-gray-600">
              Understand what the colors and effects mean
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Orange Glow - Orphaned */}
            <div className="bg-white rounded-lg p-4 shadow-md text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-orange-100 rounded-lg border-2 border-orange-300 ring-2 ring-orange-400 flex items-center justify-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Orange Glow</h4>
              <p className="text-sm text-gray-600">Orphaned nodes or variants missing connections</p>
            </div>

            {/* Green Glow - Selected */}
            <div className="bg-white rounded-lg p-4 shadow-md text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-green-100 rounded-lg border-2 border-green-300 ring-2 ring-green-400 flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Green Glow</h4>
              <p className="text-sm text-gray-600">Selected node and its connected parent/child nodes</p>
            </div>

            {/* Blue Edges */}
            <div className="bg-white rounded-lg p-4 shadow-md text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-lg flex items-center justify-center">
                <div className="w-12 h-1 bg-blue-500 rounded shadow-lg" style={{boxShadow: '0 0 8px rgba(37, 99, 235, 0.6)'}}></div>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Blue Edges</h4>
              <p className="text-sm text-gray-600">Connections from selected nodes with blue glow effect</p>
            </div>

            {/* Gray Edges */}
            <div className="bg-white rounded-lg p-4 shadow-md text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="w-12 h-1 bg-gray-400 rounded"></div>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Gray Edges</h4>
              <p className="text-sm text-gray-600">Default connection lines between nodes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Keyboard Shortcuts
            </h2>
            <p className="text-lg text-gray-600">
              Work faster with these essential shortcuts
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Navigation & Selection</h3>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Create linked question</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Tab</kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Delete selected node</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Delete</kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Deselect all</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Escape</kbd>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Undo & Redo</h3>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Undo (Windows)</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + Z</kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Undo (Mac)</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">⌘ + Z</kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Redo (Windows)</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + Y</kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Redo (Mac)</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">⌘ + ⇧ + Z</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Build Your First Flow?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Start with our pre-loaded example or create your own from scratch
          </p>
          <button
            onClick={onEnterApp}
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <Play className="w-5 h-5 mr-2" />
            Launch Flow Builder
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
} 