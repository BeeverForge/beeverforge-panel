import { Link } from "@tanstack/react-router";
import { Note } from "../ui/Button";

export function NotFound() {
  return (
    <div style={{ maxWidth: 560, marginTop: 24 }}>
      <Note icon="alert">
        There is no page at this address. <Link to="/">Back to the floor</Link>.
      </Note>
    </div>
  );
}
