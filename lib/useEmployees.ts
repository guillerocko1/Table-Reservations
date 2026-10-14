"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addEmployee as addEmployeeRow,
  fetchEmployees,
  removeEmployee as removeEmployeeRow,
  subscribeToEmployees,
  updateEmployeeName as updateEmployeeNameRow,
} from "./employeeStore";
import type { Employee } from "./employeeRows";

export interface UseEmployeesResult {
  employees: Employee[];
  isConnected: boolean;
  addEmployee: (name: string) => Promise<void>;
  updateEmployee: (id: number, name: string) => Promise<void>;
  removeEmployee: (id: number) => Promise<void>;
}

function byName(a: Employee, b: Employee): number {
  return a.name.localeCompare(b.name);
}

export function useEmployees(): UseEmployeesResult {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchEmployees()
      .then((fetched) => {
        if (!cancelled) setEmployees(fetched);
      })
      .catch(() => {
        // A failed initial fetch just leaves the list empty until a
        // realtime update (or a future successful fetch) populates it -
        // not surfaced as a blocking error, same reasoning as the 86'd
        // items list: this list isn't essential to using the rest of the app.
      });

    const unsubscribe = subscribeToEmployees(
      (fetched) => {
        if (!cancelled) setEmployees(fetched);
      },
      (status) => {
        if (!cancelled) setIsConnected(status === "connected");
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const addEmployee = useCallback(async (name: string) => {
    // A negative, timestamp-based temporary id - guaranteed not to collide
    // with a real database-generated id - shown optimistically until the
    // insert's own realtime echo replaces the whole list with the real row.
    const tempId = -Date.now();
    setEmployees((current) => [...current, { id: tempId, name }].sort(byName));
    try {
      await addEmployeeRow(name);
    } catch (error) {
      setEmployees((current) => current.filter((employee) => employee.id !== tempId));
      throw error;
    }
  }, []);

  const updateEmployee = useCallback(
    async (id: number, name: string) => {
      // Scoped to the one renamed employee (not a whole-list snapshot) so a
      // realtime update for a different employee arriving while this
      // update is in flight isn't discarded by the rollback - same
      // reasoning as useEightySixedItems' per-item rollback.
      const previous = employees.find((employee) => employee.id === id);
      setEmployees((current) =>
        current.map((employee) => (employee.id === id ? { ...employee, name } : employee)).sort(byName),
      );
      try {
        await updateEmployeeNameRow(id, name);
      } catch (error) {
        if (previous) {
          setEmployees((current) => current.map((employee) => (employee.id === id ? previous : employee)).sort(byName));
        }
        throw error;
      }
    },
    [employees],
  );

  const removeEmployee = useCallback(
    async (id: number) => {
      const removed = employees.find((employee) => employee.id === id);
      setEmployees((current) => current.filter((employee) => employee.id !== id));
      try {
        await removeEmployeeRow(id);
      } catch (error) {
        if (removed) {
          setEmployees((current) => [...current, removed].sort(byName));
        }
        throw error;
      }
    },
    [employees],
  );

  return { employees, isConnected, addEmployee, updateEmployee, removeEmployee };
}
