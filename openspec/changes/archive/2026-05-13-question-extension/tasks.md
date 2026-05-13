## 1. Create extension skeleton

- [x] 1.1 Create `dotfiles/pi/agent/extensions/question.ts` with the default export function
- [x] 1.2 Import required types and modules: `ExtensionAPI`, `Type` from typebox, `Editor`, `Key`, `matchesKey`, `Text`, `truncateToWidth` from pi-tui

## 2. Implement tool registration and parameter schema

- [x] 2.1 Define the parameter schema with `question` (string), `options` (array of `{ label, description? }`), and `recommended` (optional string)
- [x] 2.2 Register the tool via `pi.registerTool()` with name `question`, label, description, and the parameter schema
- [x] 2.3 Add early return for non-UI mode (`if (!ctx.hasUI)`) with error content

## 3. Build the options list UI state

- [x] 3.1 Build the `allOptions` array: agent options + auto-appended "Other" option with `isOther: true`
- [x] 3.2 Implement the list rendering function showing all options with navigation, recommended highlight, and "Other" indicator
- [x] 3.3 Implement keyboard navigation (↑/↓ arrows, Escape to cancel)
- [x] 3.4 Implement Enter handler: confirm for normal options, switch to text input for "Other"

## 4. Implement comment and text input states

- [x] 4.1 Create an Editor instance for the comment/text input field
- [x] 4.2 Implement Space handler: select normal option and open comment field
- [x] 4.3 Implement "Other" text input mode (Enter or Space on "Other")
- [x] 4.4 Implement Escape in input mode: return to list without saving
- [x] 4.5 Implement Enter in input mode: confirm with comment or custom answer

## 5. Build the result return

- [x] 5.1 Construct content and details for normal selection (with/without comment)
- [x] 5.2 Construct content and details for "Other" custom answer
- [x] 5.3 Construct content and details for cancelled state

## 6. Implement custom TUI rendering

- [x] 6.1 Implement `renderCall` showing `question` prefix and the question text
- [x] 6.2 Implement `renderResult` with styled output: checkmark + answer, "(wrote)" for custom, "Cancelled" for cancellation
