// In-memory store for paste-mode analysis results
// (sessionStorage is blocked in sandboxed iframes)

let _pasteResult: any = null;

export function setPasteResult(data: any) {
  _pasteResult = data;
}

export function getPasteResult(): any {
  return _pasteResult;
}

export function clearPasteResult() {
  _pasteResult = null;
}
