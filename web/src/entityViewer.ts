import { useState } from "react";

export type EntityView =
  | { mode: "list" }
  | { mode: "detail"; id: number; label: string }
  | { mode: "audit"; id: number; label: string };

export function useEntityViewer() {
  const [view, setView] = useState<EntityView>({ mode: "list" });
  return {
    view,
    openList: () => setView({ mode: "list" }),
    openDetail: (id: number, label: string) =>
      setView({ mode: "detail", id, label }),
    openAudit: (id: number, label: string) =>
      setView({ mode: "audit", id, label }),
  };
}
