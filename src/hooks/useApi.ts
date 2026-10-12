import { useEffect, useState } from "react";

export function useApi<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    loader()
      .then((value) => active && setData(value))
      .catch(() => active && setError("Unable to load analytics data. Please try again."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [loader]);

  return { data, loading, error };
}
