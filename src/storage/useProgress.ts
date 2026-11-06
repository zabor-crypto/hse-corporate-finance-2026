import { useCallback, useRef, useState } from "react";
import {
  blankProgress,
  loadProgress,
  mergeProgress,
  saveProgress,
  type Progress,
} from "./progress";
export function useProgress() {
  const initial = useRef<ReturnType<typeof loadProgress> | null>(null);
  if (!initial.current) {
    try {
      initial.current = loadProgress(localStorage);
    } catch {
      initial.current = {
        data: blankProgress(),
        notice: "Хранилище недоступно. Экспортируйте сессию перед закрытием.",
        blocked: true,
        raw: null,
      };
    }
  }
  const current = useRef(initial.current.data);
  const blocked = useRef(initial.current.blocked);
  const [data, setData] = useState(current.current);
  const [notice, setNotice] = useState(initial.current.notice);
  const update = useCallback((fn: (p: Progress) => Progress) => {
    const next = fn(current.current);
    current.current = next;
    setData(next);
    if (!blocked.current) {
      try {
        if (!saveProgress(localStorage, next))
          setNotice(
            "Не удалось сохранить изменения. Экспортируйте текущую сессию перед закрытием.",
          );
      } catch {
        setNotice("Сохранение недоступно. Экспортируйте текущую сессию.");
      }
    }
  }, []);
  const importData = useCallback((incoming: unknown) => {
    const next = mergeProgress(current.current, incoming);
    if (blocked.current && initial.current?.raw)
      next.archives.push({
        kind: "preserved-storage-bytes",
        raw: initial.current.raw,
      });
    if (!saveProgress(localStorage, next))
      throw Error(
        "Копия прочитана, но сохранить её не удалось. Исходные данные сохранены.",
      );
    blocked.current = false;
    current.current = next;
    setData(next);
    setNotice("");
  }, []);
  return {
    data,
    update,
    notice,
    importData,
    raw: initial.current.blocked ? initial.current.raw : null,
  };
}
