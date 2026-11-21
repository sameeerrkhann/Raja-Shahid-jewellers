import { Fragment } from "react";
// Small Markdown subset: React escapes text; HTML, images and links never execute.
function inline(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g).map((part, i) => part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part.startsWith("`") && part.endsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part.startsWith("*") && part.endsWith("*") ? <em key={i}>{part.slice(1, -1)}</em> : <Fragment key={i}>{part}</Fragment>);
}
export function SafeMessage({ text }: { text: string }) {
  const urdu = /[\u0600-\u06ff]/.test(text);
  return <div className="auria-message-text" dir="auto" lang={urdu ? "ur" : undefined}>{text.split(/\n{2,}/).map((block, i) => {
    const lines = block.split("\n");
    // Comparison tables: header, |---| separator, rows. Cells are escaped text like every other block.
    if (lines.length >= 3 && lines.every((line) => /^\s*\|.*\|\s*$/.test(line)) && /^[\s|:-]+$/.test(lines[1])) {
      const cells = (line: string) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
      return <div key={i} className="auria-table" role="region" aria-label="Comparison" tabIndex={0}><table><thead><tr>{cells(lines[0]).map((cell, j) => <th key={j} scope="col">{inline(cell)}</th>)}</tr></thead><tbody>{lines.slice(2).map((line, r) => <tr key={r}>{cells(line).map((cell, j) => j === 0 ? <th key={j} scope="row">{inline(cell)}</th> : <td key={j}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>;
    }
    if (lines.every((line) => /^[-*] /.test(line))) return <ul key={i}>{lines.map((line, j) => <li key={j}>{inline(line.slice(2))}</li>)}</ul>;
    if (lines.every((line) => /^\d+\. /.test(line))) return <ol key={i}>{lines.map((line, j) => <li key={j}>{inline(line.replace(/^\d+\. /, ""))}</li>)}</ol>;
    return <p key={i}>{inline(block)}</p>;
  })}</div>;
}
