# Language Server

This folder contains experiments of implementing a **language server**.
A language server is a server using the [Language Server Protocol (LSP)](https://microsoft.github.io/language-server-protocol/) (originally developed by Microsoft for VS Code).
This protocol specifies typical actions for interacting with code in an IDE-like setting, including things such as syntax highlighting, jump-to-definition, and quick actions.

Note when researching: Although it's technically incorrect, the language server itself is sometimes called LSP on various websites.

## Building Extensions for Editors

While there are [some](https://neovim.io/) [editors](https://lapce.dev/) that support the LSP directly, the two major ones, [VS Code](https://code.visualstudio.com/) and [IntelliJ](https://www.jetbrains.com/idea/), do *not* directly support LSP.
Instead, you're supposed to write a plugin/extension which then spawns and communicates with the language server over LSP and translates the results for the IDE.
There are libraries for both VSCode and IntelliJ that take care of translating between LSP and IDE API, so there's usually only a small amount of code you have to write to adapt a language server to work with the IDE.
For VS Code, [here's a guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) on how to write an extension talking to a lanuage server.
For IntelliJ, [here's a similar guide](https://www.jetbrains.com/help/mps/building-intellij-idea-language-plugins.html).

## Does the LSP fit our use case?

We specifically do not want to create editor tooling for a new programming language.
Instead, we want to show data in the IDE in a few ways, such as hints on the right side of the code and stuff like that.
Some of those features are possible with features usually used by language server extensions (such as [inlay hints, supported since LSP 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)).
But that doesn't mean we need to use LSP for the communication between our extension and analysis server.

Also, some editors (such as VS Code) also have lower-level features that extensions can use, but which are not standardized in the LSP (yet).
For example, we can show text right in the program using inline type hints, which were originally designed to only show type hints.
VS Code offers the capability to directly show any text with custom formatting, so it makes more sense for us to use that.

## How to use

1. Install npm: `sudo apt install npm`
2. Install TypeScript: `sudo npm i -g typescript`
3. Open the `MPWS2022RH1` folder in VSCode (<kbd>File</kbd> → <kbd>Open Folder…</kbd>).
4. Open the debug panel in VSCode (triangle on the left side).
5. Choose "Run Extension" in the dropdown and launch it by clicking the green triangle.
6. When asked how to build the extension, choose the TypeScript compiler (`tsc build …`).
7. A new VSCode window should open. In this window, you can use the extension.
8. Open any Java file.
9. In any line containing `void `, there should be a message on the right side.
