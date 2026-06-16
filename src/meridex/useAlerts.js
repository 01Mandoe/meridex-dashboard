import { useCallback, useEffect, useReducer } from "react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.status === 204 ? null : res.json();
}

function alertsReducer(state, action) {
  switch (action.type) {
    case "set":    return { ...state, list: action.list, loading: false };
    case "add":    return { ...state, list: [...state.list, action.item] };
    case "patch":  return { ...state, list: state.list.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)) };
    case "remove": return { ...state, list: state.list.filter((a) => a.id !== action.id) };
    default: return state;
  }
}

/** CRUD hook for persisted alerts. */
export function useAlerts() {
  const [state, dispatch] = useReducer(alertsReducer, { list: [], loading: true });

  const reload = useCallback(() => {
    return jsonFetch(`${API}/alerts`)
      .then((data) => dispatch({ type: "set", list: data }))
      .catch(() => dispatch({ type: "set", list: [] }));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const create = useCallback((body) =>
    jsonFetch(`${API}/alerts`, { method: "POST", body: JSON.stringify(body) }).then((item) => {
      dispatch({ type: "add", item });
      return item;
    }), []);

  const patch = useCallback((id, body) => {
    dispatch({ type: "patch", id, patch: body }); // optimistic
    return jsonFetch(`${API}/alerts/${id}`, { method: "PATCH", body: JSON.stringify(body) })
      .then((updated) => { dispatch({ type: "patch", id, patch: updated }); return updated; })
      .catch((e) => { reload(); throw e; });
  }, [reload]);

  const remove = useCallback((id) => {
    dispatch({ type: "remove", id }); // optimistic
    return jsonFetch(`${API}/alerts/${id}`, { method: "DELETE" })
      .catch((e) => { reload(); throw e; });
  }, [reload]);

  return { alerts: state.list, loading: state.loading, create, patch, remove, reload };
}

function watchlistReducer(state, action) {
  switch (action.type) {
    case "set":    return { ...state, list: action.list, loading: false };
    case "add":    return { ...state, list: state.list.some((i) => i.id === action.item.id) ? state.list : [...state.list, action.item] };
    case "remove": return { ...state, list: state.list.filter((i) => i.id !== action.id) };
    default: return state;
  }
}

/** CRUD hook for persisted watchlist items. */
export function useWatchlist() {
  const [state, dispatch] = useReducer(watchlistReducer, { list: [], loading: true });

  const reload = useCallback(() => {
    return jsonFetch(`${API}/watchlist`)
      .then((data) => dispatch({ type: "set", list: data }))
      .catch(() => dispatch({ type: "set", list: [] }));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const add = useCallback((kind, ref) =>
    jsonFetch(`${API}/watchlist`, { method: "POST", body: JSON.stringify({ kind, ref }) }).then((item) => {
      dispatch({ type: "add", item });
      return item;
    }), []);

  const remove = useCallback((id) => {
    dispatch({ type: "remove", id });
    return jsonFetch(`${API}/watchlist/${id}`, { method: "DELETE" })
      .catch(() => reload());
  }, [reload]);

  const has = useCallback(
    (kind, ref) => state.list.some((i) => i.kind === kind && i.ref === ref),
    [state.list]
  );

  return { items: state.list, loading: state.loading, add, remove, has };
}
