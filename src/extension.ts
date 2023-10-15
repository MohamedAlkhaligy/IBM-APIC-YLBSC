import * as vscode from 'vscode';
import { parse as parseYAML } from 'yaml';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('ibm-apic-yaml-lbsc.format', () => {
		const editor = vscode.window.activeTextEditor;
		// const outputChannel = vscode.window.createOutputChannel('My Extension');
		if (editor && editor.document.languageId === 'yaml') {
			try {
				parseYAML(editor.document.getText());
			} catch (error) {
				// vscode.window.showErrorMessage('IBM APIC YAML LBSC: Invalid YAML');
				// outputChannel.appendLine('An error occurred: ...');
				console.error("IBM APIC YLBSC: Invalid YAML");
				return;
			}
			return editor.edit(editBuilder => {
				convertToLiteralBlockScalar(editor.document, editBuilder);
			});
		}
		// outputChannel.show();
	});
	context.subscriptions.push(disposable);
}

function convertToLiteralBlockScalar(document: vscode.TextDocument, editBuilder: vscode.TextEditorEdit) {
	const pattern = /^(\s*)(?:(?:"source")|(?:source)|(?:'source'))\s*:\s*['"](.*)['"]\s*$/s;
	const regexp = new RegExp(pattern);
	for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
		const lineText = document.lineAt(lineNumber).text;
		if (regexp.test(lineText)) {
			try {
				convertCurrentStringLineToLBS(document, editBuilder, regexp, lineText, lineNumber);
			} catch (error) {
				// vscode.window.showErrorMessage('IBM APIC YAML LBSC: Formatting Failed');
				console.error("IBM APIC YLBSC: Formatting Failed");
				return;
			}

		}
	}
	// vscode.window.showInformationMessage('IBM APIC YAML LBSC: Formatting Succeded');
}

function convertCurrentStringLineToLBS(document: vscode.TextDocument, editBuilder: vscode.TextEditorEdit,
	regexp: RegExp, lineText: string, lineNumber: number) {
	const groups = regexp.exec(lineText);
	const indentation = groups![1].toString();
	const start = document.lineAt(lineNumber).range.start, end = document.lineAt(lineNumber).range.end;
	editBuilder.replace(new vscode.Range(start, end), indentation + "source: |-");
	const newLinePattern = /(?:\\r\\n)|(?:\r\n)|(?:\\n)|(?:\\r)|(?:\n)|(?:\r)/;
	const codeLines = groups![2].split(newLinePattern);
	var position: vscode.Position = new vscode.Position(lineNumber + 1, 0);
	codeLines.forEach((codeLine, codeLineNumber) => {
		position = new vscode.Position(lineNumber + 1, 0);
		const appendedLine = getAppendedLine(codeLine, codeLineNumber, indentation, codeLines.length);
		editBuilder.insert(position, appendedLine);
	});
}

function getAppendedLine(codeLine: string, codeLineNumber: number, indentation: string,
	codeLinesNumber: number): string {
	var appendedLine = ``;
	if (codeLineNumber !== 0) {
		appendedLine += `\n`;
	}
	if (codeLine.length !== 0) {
		appendedLine += indentation + `  ` + unescape(codeLine);
	}
	if (codeLineNumber === codeLinesNumber - 1) {
		appendedLine += `\n`;
	}
	return appendedLine;
}

function unescape(escapedString: string): string {
	var unescapedString = escapedString;
	unescapedString = unescapedString.replace(/\\"/g, `"`);
	unescapedString = unescapedString.replace(/\\'/g, `'`);
	unescapedString = unescapedString.replace(/\\\\/g, `\\`);
	unescapedString = unescapedString.replace(/\\t/g, `    `);
	return unescapedString;
}

// This method is called when your extension is deactivated
export function deactivate() { }
