import { useEffect, useState, useRef } from "react";
/** Autosave status never moves inputs between pointerdown and pointerup.
 * A full persistent message expands only after an explicit user action. */
export function StorageStatus({ notice }: { notice: string }) {
  const statusRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState(""),
    [expanded, setExpanded] = useState("");
  useEffect(() => {
    if (notice && notice !== "Сохранение…") setMessage(notice);
  }, [notice]);
  return (
    <>
      <div
        ref={statusRef}
        tabIndex={-1}
        role="group"
        aria-label="Состояние локального сохранения"
        className="save-status"
        style={{
          height: 44,
          lineHeight: "44px",
          fontSize: 14,
          marginBottom: 8,
          position: "relative",
        }}
      >
        {message ? (
          <button
            type="button"
            className="text-button"
            style={{ padding: 0, maxWidth: "100%", minHeight: 44 }}
            aria-expanded={!!expanded}
            aria-controls="storage-message"
            onClick={() => setExpanded(expanded ? "" : message)}
          >
            Сообщение о сохранении
          </button>
        ) : notice === "Сохранение…" ? (
          <span>{notice}</span>
        ) : null}
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clipPath: "inset(50%)",
            whiteSpace: "nowrap",
          }}
        >
          {notice || message}
        </span>
      </div>
      <div id="storage-message" className="notice" hidden={!expanded}>
        <p>{expanded}</p>
        <button
          type="button"
          onClick={() => {
            setExpanded("");
            setMessage("");
            statusRef.current?.focus({ preventScroll: true });
          }}
        >
          Сообщение прочитано · закрыть
        </button>
      </div>
    </>
  );
}
