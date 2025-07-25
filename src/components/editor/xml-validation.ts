import type * as MonacoTypes from 'monaco-editor'
import { XMLValidator } from 'fast-xml-parser'

export function setupXMLValidation(monaco: typeof MonacoTypes) {
    const markerId = 'xml-validation'

    function validate(model: MonacoTypes.editor.ITextModel) {
        const markers: MonacoTypes.editor.IMarkerData[] = []
        const text = model.getValue()

        if (text.trim()) {
            const validationResult = XMLValidator.validate(text, {
                allowBooleanAttributes: true,
            })

            if (validationResult !== true) {
                markers.push({
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: validationResult.err.line,
                    startColumn: validationResult.err.col,
                    endLineNumber: validationResult.err.line,
                    endColumn: model.getLineContent(validationResult.err.line).length + 1,
                    message: validationResult.err.msg,
                })
            }
        }

        monaco.editor.setModelMarkers(model, markerId, markers)
    }

    const contentChangeListeners = new Map<MonacoTypes.editor.ITextModel, MonacoTypes.IDisposable>()
    function manageContentChangeListener(model: MonacoTypes.editor.ITextModel) {
        const isXml = model.getModeId() === 'xml'
        const listener = contentChangeListeners.get(model)

        if (isXml && !listener) {
            contentChangeListeners.set(
                model,
                model.onDidChangeContent(() => validate(model))
            )
            validate(model)
        } else if (!isXml && listener) {
            listener.dispose()
            contentChangeListeners.delete(model)
            monaco.editor.setModelMarkers(model, markerId, [])
        }
    }

    monaco.editor.onWillDisposeModel(model => {
        contentChangeListeners.delete(model)
    })
    monaco.editor.onDidChangeModelLanguage(({ model }) => {
        manageContentChangeListener(model)
    })
    monaco.editor.onDidCreateModel(model => {
        manageContentChangeListener(model)
    })
}
