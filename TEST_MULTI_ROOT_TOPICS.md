# Test: Multi-Root Topic Isolation

## Test Scenario
This test verifies that each root question maintains its dedicated topic and that changing one root's topic doesn't affect other roots.

## Steps to Test

### 1. Setup Multiple Root Questions
1. Open the application at `http://localhost:5173/qnatool/`
2. Click "Add Question" to create the first root question (should get topic `TOPIC-1`)
3. Click "Add Question" again to create the second root question (should get topic `TOPIC-2`)
4. Click "Add Question" again to create the third root question (should get topic `TOPIC-3`)

### 2. Add Child Nodes to Each Root
1. For each root question:
   - Right-click and select "Add Answer" to create an answer node
   - Right-click the answer node and select "Add Question" to create a child question
   - Verify each child inherits its parent root's topic

### 3. Test Topic Isolation
1. Select the first root question (TOPIC-1)
2. Change its topic to "CUSTOM-TOPIC-A" in the topic input field
3. **Expected Result**: Only nodes connected to this root should change to "CUSTOM-TOPIC-A"
4. **Verify**: Other root questions and their children should keep their original topics

### 4. Test Path ID Updates
1. After changing the topic, verify path IDs are updated correctly:
   - First root should have paths like `CUSTOM-TOPIC-A-Q1`, `CUSTOM-TOPIC-A-Q1-A1`, etc.
   - Second root should still have paths like `TOPIC-2-Q1`, `TOPIC-2-Q1-A1`, etc.
   - Third root should still have paths like `TOPIC-3-Q1`, `TOPIC-3-Q1-A1`, etc.

### 5. Test Cross-Topic Connections
1. Create an outcome node
2. Connect answer nodes from different roots to the same outcome
3. **Expected Result**: The outcome should preserve its topic (or get marked as "CROSS-CONNECTED")
4. **Verify**: Root questions should maintain their individual topics

## Expected Behavior

✅ **PASS**: Each root question maintains its dedicated topic
✅ **PASS**: Changing one root's topic only affects its connected subgraph
✅ **PASS**: Other roots and their children are unaffected
✅ **PASS**: Path IDs are recalculated correctly for the changed subgraph only
✅ **PASS**: Cross-topic connections work without changing root topics

## Debugging

If the test fails, check the browser console for:
- "Recalculating X nodes for root Y with topic Z" messages
- "Target node X is a root node - preserving its dedicated topic" messages
- Any error messages related to topic propagation

## Implementation Details

The fix involves:
1. `recalculateFlowIds()` - Only recalculates nodes connected to the specific root
2. `propagateTopicOnConnection()` - Never changes topics of root nodes
3. Topic-aware path ID generation for each root's subgraph 