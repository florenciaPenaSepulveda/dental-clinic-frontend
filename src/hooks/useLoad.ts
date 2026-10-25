import { DependencyList, useCallback, useEffect, useRef, useState } from "react";

interface LoadState<T> {
  data: T | undefined;
  loading: boolean;
  error: string;
  reload: () => void;
}

export const useLoad = <T,>(loader: () => Promise<T>, deps: DependencyList): LoadState<T> => {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    loaderRef
      .current()
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setData(undefined);
          setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { data, loading, error, reload };
};
