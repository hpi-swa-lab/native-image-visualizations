import * as vs from 'vscode';

export async function activate(context: vs.ExtensionContext) {
  console.log('Activated GraalVM Space Analyzer!');

  context.subscriptions.push(
    vs.window.onDidChangeActiveTextEditor(() => update())
  );

  if (vs.window.activeTextEditor) {
    update();
  }

  console.log('Registered hints provider.');
}

export function deactivate(): Thenable<void> | undefined {
  // Do nothing. If we spawned a language server, it would have been stopped here.
  return undefined;
}

let decorationType = vs.window.createTextEditorDecorationType({});

function update() {
  console.log('Updating');

  const editor = vs.window.activeTextEditor;
  if (!editor) return;
  const text = editor.document.getText();

  type Item = vs.DecorationOptions & {
    renderOptions: { after: { contentText: string } };
  };
  const hints: Item[] = [];
  text.split('\n').forEach((line, index) => {
    if (!line.includes('void ')) return;

    hints.push({
      range: new vs.Range(
        new vs.Position(index, 0),
        new vs.Position(index, line.length)
      ),
      renderOptions: {
        after: {
          contentText:
            '⠀⠀⠀⠀⠀<- btw, this function results in 20 kB extra in the final binary',
        },
      },
    });

    editor.setDecorations(decorationType, hints);
  });
}
