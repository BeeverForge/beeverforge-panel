// CI proof: a lint error (no-debugger), which only eslint sees.
export function pause(): void {
  debugger;
}
