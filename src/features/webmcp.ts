import { getAppData } from "../state/store";

interface WebMcpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args?: Record<string, unknown>) => Promise<unknown> | unknown;
}

interface NavigatorWithModelContext extends Navigator {
  modelContext?: {
    registerTool: (tool: WebMcpToolDefinition) => void;
    unregisterTool?: (name: string) => void;
  };
}

/**
 * Registers MotoFolio's client-side tools with the browser's WebMCP API
 * (`navigator.modelContext`) when supported by AI-enabled browsers/agents.
 */
export function initWebMcpTools(): void {
  const nav = navigator as NavigatorWithModelContext;
  if (!nav.modelContext || typeof nav.modelContext.registerTool !== "function") {
    return;
  }

  try {
    nav.modelContext.registerTool({
      name: "get_vehicle_maintenance_summary",
      description:
        "Returns the active vehicle profile, current odometer reading, and periodic maintenance status (Good, Due Soon, Overdue, Unset).",
      inputSchema: {
        type: "object",
        properties: {
          statusFilter: {
            type: "string",
            enum: ["all", "Overdue", "Due Soon", "Good", "Unset"],
            description: "Optional status filter for periodic schedule items.",
          },
        },
      },
      execute: (args = {}) => {
        const data = getAppData();
        if (!data) {
          return { error: "No active vehicle profile loaded." };
        }
        const currentKm = data.vehicle.currentMileageKm || 0;
        const filter = typeof args.statusFilter === "string" ? args.statusFilter : "all";

        const schedule = (data.periodicSchedule || [])
          .map((item) => {
            const nextDueKm =
              item.lastServicedKm !== null && item.lastServicedKm !== undefined
                ? item.lastServicedKm + item.intervalKm
                : null;
            const remainingKm = nextDueKm !== null ? nextDueKm - currentKm : null;
            let status: "Unset" | "Overdue" | "Due Soon" | "Good" = "Unset";
            if (remainingKm !== null) {
              if (remainingKm <= 0) status = "Overdue";
              else if (remainingKm <= 1000) status = "Due Soon";
              else status = "Good";
            }
            return {
              id: item.id,
              name: item.name,
              category: item.category || "General",
              intervalKm: item.intervalKm,
              lastServicedKm: item.lastServicedKm,
              nextDueKm,
              remainingKm,
              status,
            };
          })
          .filter((item) => filter === "all" || item.status === filter);

        return {
          vehicle: {
            id: data.vehicle.id,
            make: data.vehicle.make,
            model: data.vehicle.model,
            year: data.vehicle.year,
            currentMileageKm: currentKm,
          },
          schedule,
        };
      },
    });
  } catch {
    // Ignore if browser rejects duplicate or unsupported WebMCP registration
  }
}
