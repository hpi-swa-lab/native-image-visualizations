import * as vs from 'vscode';

export async function activate(context: vs.ExtensionContext) {
  console.log('Activated GraalVM Space Analyzer!');

  let subscription = vs.languages.registerInlayHintsProvider('java', {
    provideInlayHints: (
      model,
      range,
      token
    ): vs.ProviderResult<vs.InlayHint[]> => {
      // TODO: Only show hints in the given range.
      return new Promise(async (resolve) => {
        const text = model.getText();
        const hints: vs.InlayHint[] = [];
        text.split('\n').forEach((text, index) => {
          if (!text.includes('void ')) return;

          hints.push(
            new vs.InlayHint(
              new vs.Position(index, text.length),
              '⠀⠀⠀⠀⠀<- btw, this function results in 20 kB extra in the final binary',
              vs.InlayHintKind.Type
            )
          );
        });
        resolve(hints);
      });
    },
  });
  console.log('Registered hints provider.');

  context.subscriptions.push(subscription);
}

export function deactivate(): Thenable<void> | undefined {
  // Do nothing. If we spawned a language server, it would have been stopped here.
  return undefined;
}
