# Multi-Connection and Cross-Topic Test

## Test Scenario
This test verifies that:
1. Question nodes can receive multiple incoming connections from answer nodes in single mode
2. When branches from different topics merge into one node, that node maintains path IDs from both branches
3. The propagate button displays all path IDs correctly

## Test Steps

### 1. Setup Multiple Root Questions with Different Topics
1. Open the application at `http://localhost:5173/qnatool/`
2. Click "Add Question" to create the first root question (topic: `TOPIC-1`)
3. Click "Add Question" to create the second root question (topic: `TOPIC-2`)
4. Verify each root has a different topic displayed in the topic field

### 2. Create Branches from Each Root
1. **For TOPIC-1 root:**
   - Right-click and select "Add Answer" to create an answer node
   - Set the answer to "single" mode
   - Add answer text like "Path A"

2. **For TOPIC-2 root:**
   - Right-click and select "Add Answer" to create an answer node
   - Set the answer to "single" mode
   - Add answer text like "Path B"

### 3. Create a Shared Question Node
1. Click "Add Question" to create a standalone question node
2. Position it below both answer nodes
3. Add question text like "Shared Question"

### 4. Test Multiple Incoming Connections
1. **Connect TOPIC-1 answer to shared question:**
   - Drag from the green exit dot of TOPIC-1 answer node
   - Connect to the gray input dot of the shared question node
   - Verify connection is created successfully

2. **Connect TOPIC-2 answer to shared question:**
   - Drag from the green exit dot of TOPIC-2 answer node
   - Connect to the gray input dot of the shared question node
   - Verify connection is created successfully (this tests the fix for multiple incoming connections)

### 5. Test Path ID Propagation
1. Click the "Propagate" button in the toolbar
2. Check the shared question node:
   - It should display "Paths (2):" indicating multiple path IDs
   - When expanded, it should show both:
     - `TOPIC-1-Q1-A1-Q2` (or similar)
     - `TOPIC-2-Q1-A1-Q2` (or similar)

### 6. Test Cross-Topic Outcome
1. Add an outcome node
2. Connect the shared question's answer to the outcome
3. Click "Propagate" again
4. The outcome should show multiple path IDs from both topics

## Expected Results

### Before Fix
- ❌ Question nodes could only receive one incoming connection in single mode
- ❌ Path IDs from different topics would overwrite each other
- ❌ Propagate would only show one path ID per node

### After Fix
- ✅ Question nodes can receive multiple incoming connections from single mode answers
- ✅ Nodes accumulate path IDs from multiple sources
- ✅ Propagate button displays all path IDs with count (e.g., "Paths (2):")
- ✅ Cross-topic connections preserve path information from both branches

## Success Criteria
1. **Multiple Connections**: A question node successfully accepts connections from multiple answer nodes in single mode
2. **Path Accumulation**: Nodes with multiple incoming connections show multiple path IDs
3. **Cross-Topic Support**: Path IDs from different topics are preserved and displayed
4. **Propagate Function**: The propagate button correctly updates and displays all path IDs

## Technical Implementation Notes
- `FlowCanvas.tsx`: Removed restriction preventing multiple incoming connections to question nodes
- `flowStore.ts`: Updated `propagatePathIdOnConnection` to accumulate path IDs instead of overwriting
- `flowStore.ts`: Enhanced `propagatePathToAll` to handle cross-topic connections
- All node components already support multiple path ID display with fold/unfold functionality 