# Suites structure

## endpoints

### commands

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

### Translate
- TranslateCommand schema

Same as Delete

