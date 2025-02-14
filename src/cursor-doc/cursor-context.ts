import { EditableDocument } from "./model";

const allCursorContexts = ['calva:cursorInString', 'calva:cursorInComment', 'calva:cursorAtStartOfLine', 'calva:cursorAtEndOfLine', 'calva:cursorBeforeComment', 'calva:cursorAfterComment'] as const;

type CursorContext = typeof allCursorContexts[number];

/**
 * Returns true if documentOffset is either at the first char of the token under the cursor, or
 * in the whitespace between the token and the first preceding EOL, otherwise false
 */
function isAtLineStartInclWS(doc: EditableDocument, offset = doc.selection.active) {
    const tokenCursor = doc.getTokenCursor(offset);
    let startOfLine = false;
    //  only at start if we're in ws, or at the 1st char of a non-ws sexp
    if (tokenCursor.getToken().type === 'ws' || tokenCursor.offsetStart >= offset) {
        while (tokenCursor.getPrevToken().type === 'ws') {
            tokenCursor.previous();
        }
        startOfLine = tokenCursor.getPrevToken().type === 'eol';
    }

    return startOfLine;
}

/** 
 * Returns true if position is after the last char of the last lisp token on the line, including
 * any trailing whitespace or EOL, otherwise false
 */
function isAtLineEndInclWS(doc: EditableDocument, offset = doc.selection.active) {
    const tokenCursor = doc.getTokenCursor(offset);
    if (tokenCursor.getToken().type === 'eol') {
        return true;
    }
    if (tokenCursor.getPrevToken().type === 'eol' && tokenCursor.getToken().type !== 'ws') {
        return false;
    }
    if (tokenCursor.getToken().type === 'ws') {
        tokenCursor.next();
        if (tokenCursor.getToken().type !== 'eol') {
            return false;
        }
        tokenCursor.previous();
    }
    tokenCursor.forwardWhitespace();
    const textFromOffset = doc.model.getText(offset, tokenCursor.offsetStart);
    if (textFromOffset.match(/^\s+/)) {
        return true;
    }
    return false;
}

function determineContexts(doc: EditableDocument, offset = doc.selection.active): CursorContext[] {
    const tokenCursor = doc.getTokenCursor(offset);
    const contexts: CursorContext[] = [];

    if (isAtLineStartInclWS(doc)) {
        contexts.push('calva:cursorAtStartOfLine');
    } else if (isAtLineEndInclWS(doc)) {
        contexts.push('calva:cursorAtEndOfLine');
    }

    if (tokenCursor.withinString()) {
        contexts.push('calva:cursorInString');
    } else if (tokenCursor.withinComment()) {
        contexts.push('calva:cursorInComment');
    }

    // Compound contexts 
    if (contexts.includes('calva:cursorInComment')) {
        if (contexts.includes('calva:cursorAtEndOfLine')) {
            tokenCursor.forwardWhitespace(false);
            if (tokenCursor.getToken().type != 'comment') {
                contexts.push('calva:cursorAfterComment');
            }
        } else if (contexts.includes('calva:cursorAtStartOfLine')) {
            tokenCursor.backwardWhitespace(false);
            if (tokenCursor.getPrevToken().type != 'comment') {
                contexts.push('calva:cursorBeforeComment');
            }
        }
    }

    return contexts;
}

export {
    allCursorContexts,
    CursorContext,
    isAtLineStartInclWS,
    isAtLineEndInclWS,
    determineContexts
}