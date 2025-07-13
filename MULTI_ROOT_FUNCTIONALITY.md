# Multi-Root Question Functionality

## Overview
The QnA builder now supports multiple root questions with dedicated topics, allowing complex flows that can branch from different starting points and optionally connect across topics.

## Key Features

### 1. Multiple Root Questions
- **Creation**: Click "Add Question" multiple times to create multiple root questions
- **Unique Topics**: Each root question automatically gets a unique topic (TOPIC-1, TOPIC-2, etc.)
- **Independent Paths**: Each root question starts its own path hierarchy
- **Path IDs**: Root questions have path IDs like `TOPIC-1-Q1`, `TOPIC-2-Q1`, etc.

### 2. Dedicated Topics for Each Root
- **Topic Isolation**: Each root question maintains its own topic namespace
- **Topic Propagation**: When you connect nodes within the same topic, the topic propagates down the chain
- **Topic Editing**: You can edit the topic name in the root question node
- **Path Recalculation**: Changing a root topic recalculates all connected path IDs

### 3. Cross-Topic Connections
- **Allowed Connections**: Branches from different root questions can connect to the same outcome node
- **Topic Preservation**: When connecting across topics, the target node preserves its original topic
- **Path ID Generation**: Cross-topic connections generate path IDs that reflect the connection path
- **Outcome Sharing**: Multiple topics can converge on the same outcome node

## Usage Examples

### Example 1: Independent Topics
```
TOPIC-1-Q1 → TOPIC-1-Q1-A1 → TOPIC-1-Q1-A1-Q2 → TOPIC-1-Q1-A1-Q2-A1
TOPIC-2-Q1 → TOPIC-2-Q1-A1 → TOPIC-2-Q1-A1-Q2 → TOPIC-2-Q1-A1-Q2-A1
```

### Example 2: Cross-Topic Convergence
```
TOPIC-1-Q1 → TOPIC-1-Q1-A1 → OUTCOME-1 (topic: CROSS-CONNECTED)
TOPIC-2-Q1 → TOPIC-2-Q1-A1 → OUTCOME-1 (topic: CROSS-CONNECTED)
```

## Technical Implementation

### Path ID Generation
- **Root Questions**: `{TOPIC}-Q{number}` (e.g., `TOPIC-1-Q1`)
- **Child Nodes**: Append to parent path (e.g., `TOPIC-1-Q1-A1-Q2`)
- **Cross-Topic**: Generate new path from source (e.g., `TOPIC-1-Q1-A1-E1`)

### Topic Management
- **Creation**: Auto-generated as `TOPIC-{number}` for new root questions
- **Propagation**: Topics flow down within the same branch
- **Cross-Connection**: Target nodes preserve their original topic
- **Editing**: Root topic changes trigger path ID recalculation

### Propagation Behavior
- **Path Propagation**: Click "Propagate" to recalculate all path IDs for all topics
- **Multi-Root Processing**: Each root's subgraph is processed separately
- **Cross-Connected Nodes**: Preserved with their existing topics or marked as "CROSS-CONNECTED"

## Use Cases

### 1. Multi-Domain Assessment
- Create separate topics for different domains (e.g., "TECHNICAL", "SOFT-SKILLS")
- Allow both to contribute to final recommendations

### 2. Branching Scenarios
- Start with different entry points (e.g., "NEW-USER", "EXISTING-USER")
- Converge on common outcomes based on responses

### 3. Modular Questionnaires
- Build reusable question modules with different topics
- Connect modules as needed for specific assessments

## Testing the Functionality

1. **Load Demo Data**: Use the demo data which includes two root questions with different topics
2. **Add New Root**: Click "Add Question" to create additional root questions
3. **Connect Across Topics**: Create connections between nodes from different topics
4. **Test Propagation**: Click "Propagate" to see path ID recalculation in action
5. **Verify Path IDs**: Check that path IDs correctly reflect the multi-root structure

## Benefits

- **Flexibility**: Support complex, multi-entry questionnaires
- **Modularity**: Build reusable question components
- **Scalability**: Handle large, complex decision trees
- **Maintainability**: Clear topic separation for easier management 