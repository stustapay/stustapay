import * as React from "react";

export type SortConfig<T> = {
  field: keyof T | string;
  direction: "asc" | "desc";
};

export type ColumnFilter<T> = {
  field: keyof T | string;
  value: any;
  filterFn?: (item: T, value: any) => boolean;
};

export type UseFilterableTableOptions<T> = {
  data: T[];
  searchFields?: (keyof T | string)[];
  defaultSort?: SortConfig<T>;
  defaultSearchQuery?: string;
  defaultColumnFilters?: ColumnFilter<T>;
};

export type UseFilterableTableReturn<T> = {
  filteredData: T[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortField: keyof T | string | undefined;
  sortDirection: "asc" | "desc";
  setSort: (field: keyof T | string, direction?: "asc" | "desc") => void;
  columnFilters: Map<string, any>;
  setColumnFilter: (field: string, value: any) => void;
  clearColumnFilter: (field: string) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
};

type SortState<T> = {
  field: keyof T | string | undefined;
  direction: "asc" | "desc";
};

export function useFilterableTable<T extends Record<string, any>>(
  options: UseFilterableTableOptions<T>
): UseFilterableTableReturn<T> {
  const { data, searchFields = [], defaultSort, defaultSearchQuery = "", defaultColumnFilters } = options;

  const [searchQuery, setSearchQuery] = React.useState<string>(defaultSearchQuery);
  const [sortState, setSortState] = React.useState<SortState<T>>({
    field: defaultSort?.field,
    direction: defaultSort?.direction || "desc",
  });
  const [columnFilters, setColumnFilters] = React.useState<Map<string, any>>(() => {
    const map = new Map<string, any>();
    if (defaultColumnFilters) {
      Object.entries(defaultColumnFilters).forEach(([field, filter]) => {
        map.set(field, filter.value);
      });
    }
    return map;
  });

  // Derived values for backwards compatibility
  const sortField = sortState.field;
  const sortDirection = sortState.direction;

  const setSort = React.useCallback((field: keyof T | string, direction?: "asc" | "desc") => {
    setSortState((prev) => {
      if (direction) {
        // Explicit direction provided
        return { field, direction };
      } else {
        // Toggle direction if same field, otherwise default to desc for new field
        if (prev.field === field) {
          return { field, direction: prev.direction === "asc" ? "desc" : "asc" };
        } else {
          return { field, direction: "desc" };
        }
      }
    });
  }, []);

  const setColumnFilter = React.useCallback((field: string, value: any) => {
    setColumnFilters((prev) => {
      const next = new Map(prev);
      if (value === null || value === undefined || value === "") {
        next.delete(field);
      } else {
        next.set(field, value);
      }
      return next;
    });
  }, []);

  const clearColumnFilter = React.useCallback((field: string) => {
    setColumnFilters((prev) => {
      const next = new Map(prev);
      next.delete(field);
      return next;
    });
  }, []);

  const clearAllFilters = React.useCallback(() => {
    setSearchQuery("");
    setColumnFilters(new Map());
  }, []);

  const hasActiveFilters = React.useMemo(() => {
    return searchQuery.trim().length > 0 || columnFilters.size > 0;
  }, [searchQuery, columnFilters.size]);

  const filteredData = React.useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchQuery.trim() && searchFields.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        return searchFields.some((field) => {
          const value = item[field];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(query);
        });
      });
    }

    // Apply column filters
    columnFilters.forEach((value, field) => {
      result = result.filter((item) => {
        const itemValue = item[field];
        if (value === null || value === undefined) return true;
        if (typeof value === "string") {
          return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        }
        return itemValue === value;
      });
    });

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        // Handle null/undefined
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        // Compare values
        let comparison = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else if (typeof aVal === "string" && typeof bVal === "string") {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchQuery, searchFields, columnFilters, sortField, sortDirection]);

  return {
    filteredData,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    setSort,
    columnFilters,
    setColumnFilter,
    clearColumnFilter,
    clearAllFilters,
    hasActiveFilters,
  };
}
