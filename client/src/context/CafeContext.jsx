import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "Brew2Basket-cafes-v1";
const CafeContext = createContext(null);

function readSavedProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

    if (saved && Array.isArray(saved.cafes) && saved.cafes.length > 0) {
      const activeCafeId = saved.cafes.some(
        (cafe) => cafe.id === saved.activeCafeId
      )
        ? saved.activeCafeId
        : saved.cafes[0].id;

      return { cafes: saved.cafes, activeCafeId };
    }
  } catch {
    // The provider will create the demo café if stored data cannot be read.
  }

  return { cafes: [], activeCafeId: null };
}

export function CafeProvider({ children }) {
  const [saved] = useState(readSavedProfiles);
  const [cafes, setCafes] = useState(saved.cafes);
  const [activeCafeId, setActiveCafeId] = useState(saved.activeCafeId);
  const [loading, setLoading] = useState(saved.cafes.length === 0);
  const [error, setError] = useState("");

  const activeCafe = cafes.find((cafe) => cafe.id === activeCafeId) || null;
  const catalog = activeCafe?.catalog || [];
  const inventory = activeCafe?.inventory || [];

  // If there are no saved profiles, load the same demo data endpoints
  // used by the existing app to initialize the demo café.
  useEffect(() => {
    if (cafes.length > 0) return undefined;

    let cancelled = false;

    async function loadDemoCafe() {
      try {
        const [catalogResponse, inventoryResponse] = await Promise.all([
          fetch("/api/catalog"),
          fetch("/api/inventory"),
        ]);

        if (!catalogResponse.ok || !inventoryResponse.ok) {
          throw new Error("Could not load the café demo data.");
        }

        const [defaultCatalog, defaultInventory] = await Promise.all([
          catalogResponse.json(),
          inventoryResponse.json(),
        ]);

        if (cancelled) return;

        const demoCafe = {
          id: "demo-cafe",
          name: "Demo café",
          isDemo: true,
          catalog: defaultCatalog,
          inventory: defaultInventory,
        };

        setCafes([demoCafe]);
        setActiveCafeId(demoCafe.id);
        setError("");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not load café data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDemoCafe();
    return () => {
      cancelled = true;
    };
  }, [cafes.length]);

  // Keep the exact storage key and object shape used by the old app.
  useEffect(() => {
    if (cafes.length === 0) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ cafes, activeCafeId })
      );
    } catch {
      setError("Browser storage is unavailable; café changes may not persist.");
    }
  }, [cafes, activeCafeId]);

  function selectCafe(cafeId) {
    setActiveCafeId(cafeId);
  }

  function updateActiveCafe(updates) {
    setCafes((currentCafes) =>
      currentCafes.map((cafe) =>
        cafe.id === activeCafeId ? { ...cafe, ...updates } : cafe
      )
    );
  }

  function addCafe() {
    const newCafe = {
      id: `cafe-${Date.now().toString(36)}`,
      name: `New café ${cafes.length}`,
      catalog: [],
      inventory: [],
    };

    setCafes((currentCafes) => [...currentCafes, newCafe]);
    setActiveCafeId(newCafe.id);
    return newCafe;
  }

  const loadDemoData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [catalogResponse, inventoryResponse] = await Promise.all([
        fetch("/api/catalog"),
        fetch("/api/inventory"),
      ]);

      if (!catalogResponse.ok || !inventoryResponse.ok) {
        throw new Error("Could not load demo data. Check that the Brew2Basket server is running.");
      }

      const [defaultCatalog, defaultInventory] = await Promise.all([
        catalogResponse.json(),
        inventoryResponse.json(),
      ]);

      const demoCafe = {
        id: "demo-cafe",
        name: "Demo café",
        isDemo: true,
        catalog: defaultCatalog,
        inventory: defaultInventory,
      };

      setCafes((currentCafes) => {
        const hasDemoCafe = currentCafes.some((cafe) => cafe.id === demoCafe.id);
        return hasDemoCafe
          ? currentCafes.map((cafe) => cafe.id === demoCafe.id ? demoCafe : cafe)
          : [demoCafe, ...currentCafes];
      });
      setActiveCafeId(demoCafe.id);
      return true;
    } catch (loadError) {
      setError(loadError.message || "Could not load demo data.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  const value = useMemo(
    () => ({
      cafes,
      activeCafeId,
      activeCafe,
      catalog,
      inventory,
      loading,
      error,
      selectCafe,
      updateActiveCafe,
      addCafe,
      loadDemoData,
    }),
    [cafes, activeCafeId, activeCafe, catalog, inventory, loading, error, loadDemoData]
  );

  return <CafeContext.Provider value={value}>{children}</CafeContext.Provider>;
}

export function useCafe() {
  const context = useContext(CafeContext);

  if (!context) {
    throw new Error("useCafe must be used inside CafeProvider.");
  }

  return context;
}