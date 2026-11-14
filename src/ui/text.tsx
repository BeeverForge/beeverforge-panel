// A server sentence, drawn as the server wrote it: `backticks` mark a command or a name to copy,
// so they become code rather than reaching the screen as punctuation.
export function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function Said({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/);
  return (
    <>
      {parts.map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}
    </>
  );
}
