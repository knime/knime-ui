# Suites structure

## endpoints

### command

- `PUT /workflow/{workflow-id}/commands`
- `POST /workflow/{workflow-id}/commands/redo`
- `POST /workflow/{workflow-id}/commands/undo`

Refers to a `WorkflowCommand` schema

### Delete
- DeleteCommand schema

So, what I have to test is:
- params of the three request:
    - workflow ID (deep)
- DeleteCommand Schema
    - nodeID
    - connectionId
    - annotationId (not yet)
- Triggers:
    - action bar
    - global toolbar
    - shortcut
    - context menu
- Undo/redo
    - in different workflows Id

So, about workflow ID I will just create a simple case, not going to repeat all steps.
( Because that would be testing same schemas over and over. And I want to test the api)

Workflow 0:
- All things listed before.

Workflow 1 & 2:
- Deleting with some method a single unit, undo and redo. (for now).

### Translate
- TranslateCommand schema

Same as Delete

### state

