# Question Flow Builder

A React TypeScript application for creating and managing complex questionnaire flows through a visual drag-and-drop interface.

## Features

- **Visual Flow Builder**: Create question flows using an intuitive drag-and-drop canvas
- **Question & Answer Nodes**: Build complex questionnaire logic with question and answer node types
- **Excel Import/Export**: Import existing questionnaires from Excel files and export your flows
- **Automatic Path ID Generation**: Intelligent path ID generation system for questionnaire logic
- **Keyboard Shortcuts**: Efficient workflow with keyboard shortcuts (Tab, Delete, Escape)
- **Modern UI**: Beautiful interface built with Tailwind CSS and Radix UI components

## Technology Stack

- **Frontend**: React 19 with TypeScript
- **Flow Visualization**: React Flow (@xyflow/react)
- **State Management**: Zustand with Immer
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **File Processing**: XLSX for Excel import/export
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Creating Questions and Answers

1. **Add Question Node**: Click "Add Question" in the toolbar to create a new question node
2. **Add Answer Node**: Click "Add Answer" to create answer options
3. **Connect Nodes**: Drag from one node's handle to another to create connections
4. **Edit Content**: Click on nodes to edit question text, answer options, and scores

### Keyboard Shortcuts

- **Tab**: Create a linked question from the selected node
- **Shift + Drag**: Multi-select nodes by dragging a selection box
- **Ctrl/Cmd + C**: Copy selected nodes
- **Ctrl/Cmd + V**: Paste nodes
- **Delete/Backspace**: Delete the selected node(s)
- **Escape**: Deselect all nodes

### Import/Export

- **Load Demo**: Click "Load Demo" to see example questionnaire flow
- **Import**: Upload Excel (.xlsx) or JSON files to import existing questionnaires
- **Export**: Download your flow as JSON format

### Excel Import Format

The application expects Excel files with the following columns:
- `pathId`: Unique identifier for the question path
- `questionText`: The question content
- `questionLevel`: Hierarchy level (1, 2, 3, etc.)
- `elementId`: Element identifier
- `subElementId`: Sub-element identifier
- `answerVariants`: Comma-separated answer options
- `scores`: Comma-separated scores for each answer

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Architecture

### Core Components

- **FlowCanvas**: Main React Flow canvas component
- **QuestionNode**: Interactive question node component
- **AnswerNode**: Multi-variant answer node component
- **Toolbar**: Main toolbar with actions and file operations

### State Management

- **FlowStore**: Zustand store managing flow state, nodes, and edges
- **PathIdGenerator**: Utility for generating consistent path IDs
- **ExcelParser**: Handles Excel file import/export functionality

### Key Features

- **Automatic Layout**: Intelligent node positioning
- **Real-time Updates**: Live editing of node content
- **Variant Management**: Dynamic answer option management
- **Connection Validation**: Smart edge creation and validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License. 