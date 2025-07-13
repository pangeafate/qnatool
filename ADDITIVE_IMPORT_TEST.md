# Additive Import Functionality Test

## Test Overview
This test verifies that the new additive JSON import functionality works correctly with conflict resolution, positioning, and user feedback.

## Test Steps

### 1. Setup Initial Canvas
1. Open the application at `http://localhost:5173/qnatool/`
2. Create some initial content:
   - Add 2-3 question nodes
   - Add 2-3 answer nodes
   - Connect them with edges
   - Note the current topics and node IDs

### 2. Export Current State
1. Click "Export JSON" to download the current state
2. Save this file as `original-flow.json`

### 3. Test Additive Import
1. Click "Import JSON" button
2. Select the `original-flow.json` file
3. Verify the import feedback modal appears with:
   - **Imported Content**: Shows correct node/edge counts and topics
   - **Total Canvas**: Shows doubled counts (original + imported)
   - **Conflicts Resolved**: Shows ID conflicts and how they were resolved
   - **Summary**: Provides clear overview

### 4. Verify Import Results
1. Click "Accept Import" in the modal
2. Verify the canvas now has:
   - Original nodes in their original positions
   - Imported nodes positioned to the right of originals
   - No overlapping nodes
   - All connections preserved
   - Conflicting node IDs renamed (e.g., `q1` → `q1-imported`)

### 5. Test Revert Functionality
1. Repeat steps 1-3
2. Click "Revert Import" instead of "Accept"
3. Verify the canvas returns to the original state
4. Confirm no imported nodes remain

### 6. Test Cross-Topic Connections
1. Import a file with different topics
2. Verify topics are preserved
3. Manually connect nodes from different topics
4. Verify connections work correctly

### 7. Test Position Management
1. Create nodes in different areas of the canvas
2. Import the same file
3. Verify imported nodes are positioned in available space
4. Verify relative positioning of imported nodes is maintained

## Expected Behavior

### ✅ Positioning
- Imported nodes placed to the right of existing nodes
- No overlap with existing content
- Relative positioning preserved within imported content

### ✅ Conflict Resolution
- Duplicate node IDs renamed with `-imported` suffix
- Duplicate edge IDs renamed appropriately
- All references updated correctly

### ✅ Topic Management
- Original topics preserved
- Imported topics preserved
- No automatic topic changes

### ✅ User Feedback
- Modal shows detailed statistics
- Conflicts clearly explained
- Accept/Revert options work correctly

### ✅ Connections
- Existing connections preserved
- Imported connections preserved
- Manual connections between imported and existing nodes work

## Test Files
- Use any exported JSON file from the application
- Test with both new hierarchical format and legacy format
- Test with files containing different topics

## Success Criteria
- No nodes disappear or get corrupted
- All statistics in modal are accurate
- Conflicts are resolved without breaking functionality
- User can successfully accept or revert imports
- Performance remains smooth even with large imports 