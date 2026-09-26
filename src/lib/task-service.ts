import { createClient } from "@/lib/supabase/client";
import type { EmployeeTask, AppNotification, TaskStatus, TaskItemDetail } from "@/lib/types";

// Local storage cache keys for offline/fallback persistence
const TASKS_CACHE_KEY_PREFIX = "bishop_tasks_cache_";
const NOTIFS_CACHE_KEY_PREFIX = "bishop_notifs_cache_";

// In-memory fallback stores (for SSR / Node CLI tests)
const inMemoryTasksStore = new Map<string, EmployeeTask[]>();
const inMemoryNotifsStore = new Map<string, AppNotification[]>();

function getTasksCache(shopId: string): EmployeeTask[] {
  if (typeof window === "undefined") {
    return inMemoryTasksStore.get(shopId) || [];
  }
  try {
    const data = localStorage.getItem(`${TASKS_CACHE_KEY_PREFIX}${shopId}`);
    return data ? JSON.parse(data) : (inMemoryTasksStore.get(shopId) || []);
  } catch {
    return inMemoryTasksStore.get(shopId) || [];
  }
}

function setTasksCache(shopId: string, tasks: EmployeeTask[]) {
  inMemoryTasksStore.set(shopId, tasks);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`${TASKS_CACHE_KEY_PREFIX}${shopId}`, JSON.stringify(tasks));
    } catch {}
  }
}

function getNotifsCache(profileId: string): AppNotification[] {
  if (typeof window === "undefined") {
    return inMemoryNotifsStore.get(profileId) || [];
  }
  try {
    const data = localStorage.getItem(`${NOTIFS_CACHE_KEY_PREFIX}${profileId}`);
    return data ? JSON.parse(data) : (inMemoryNotifsStore.get(profileId) || []);
  } catch {
    return inMemoryNotifsStore.get(profileId) || [];
  }
}

function setNotifsCache(profileId: string, notifs: AppNotification[]) {
  inMemoryNotifsStore.set(profileId, notifs);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`${NOTIFS_CACHE_KEY_PREFIX}${profileId}`, JSON.stringify(notifs));
    } catch {}
  }
}

export interface AssignTaskParams {
  shop_id: string;
  employee_id: string;
  employee_profile_id: string;
  employee_name: string;
  employee_mobile?: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  due_date?: string;
  assigned_by_id?: string;
  assigned_by_name?: string;
  shop_name?: string;
  task_items?: TaskItemDetail[];
  items?: TaskItemDetail[];
}

/**
 * Assigns a task to an employee and immediately generates an in-app BISHOP notification.
 * Guaranteed idempotent (prevents duplicates on retries/multiple clicks).
 */
export async function assignTaskWithNotification(params: AssignTaskParams): Promise<{
  task: EmployeeTask;
  notification: AppNotification;
  isDuplicate?: boolean;
}> {
  const nowStr = new Date().toISOString();

  // 1. Try API execution via admin service key
  try {
    const res = await fetch("/api/employee/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        ...params,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.task) {
      const createdTask = data.task as EmployeeTask;
      const createdNotif: AppNotification = {
        id: `notif_${Date.now()}`,
        shop_id: params.shop_id,
        recipient_profile_id: params.employee_profile_id,
        employee_id: params.employee_id,
        task_id: createdTask.id,
        title: "📋 New Task Assigned",
        message: `You have been assigned "${createdTask.title}" by ${params.assigned_by_name || "Shopkeeper"} at ${params.shop_name || "BISHOP Shop"}.`,
        type: "task_assigned",
        metadata: {
          employee_name: params.employee_name,
          employee_mobile: params.employee_mobile || "",
          task_id: createdTask.id,
          task_title: createdTask.title,
          task_details: createdTask.description || "No additional details provided.",
          task_items: createdTask.items || createdTask.task_items || params.task_items || params.items,
          assigned_by_name: params.assigned_by_name || "Shopkeeper",
          shop_name: params.shop_name || "BISHOP Shop",
          date_time: createdTask.created_at || nowStr,
          status: "Pending",
          due_date: createdTask.due_date || "No due date",
          priority: createdTask.priority,
        },
        is_read: false,
        created_at: createdTask.created_at || nowStr,
      };

      // Save/Update in local tasks and notifications cache
      const existingLocalTasks = getTasksCache(params.shop_id);
      setTasksCache(params.shop_id, [createdTask, ...existingLocalTasks.filter((t) => t.id !== createdTask.id)]);

      const existingNotifs = getNotifsCache(params.employee_profile_id);
      setNotifsCache(params.employee_profile_id, [
        createdNotif,
        ...existingNotifs.filter((n) => n.id !== createdNotif.id && n.task_id !== createdTask.id),
      ]);

      return {
        task: createdTask,
        notification: createdNotif,
        isDuplicate: Boolean(data.isDuplicate),
      };
    }
  } catch (err) {
    console.warn("API assignTask error, falling back to direct client:", err);
  }

  // 2. Direct Supabase Client Fallback
  const supabase = createClient();
  const existingLocalTasks = getTasksCache(params.shop_id);
  const newTaskPayload = {
    shop_id: params.shop_id,
    employee_id: params.employee_id,
    title: params.title.trim(),
    description: params.description?.trim() || null,
    priority: params.priority || "medium",
    due_date: params.due_date || null,
    status: "pending" as TaskStatus,
    assigned_by: params.assigned_by_id || null,
  };

  let createdTask: EmployeeTask;

  const { data: dbTask } = await supabase
    .from("employee_tasks")
    .insert(newTaskPayload)
    .select()
    .single();

  if (!dbTask) {
    createdTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      shop_id: params.shop_id,
      employee_id: params.employee_id,
      title: params.title.trim(),
      description: params.description?.trim() || "",
      priority: params.priority || "medium",
      due_date: params.due_date || "",
      status: "pending",
      assigned_by: params.assigned_by_id,
      created_at: nowStr,
      updated_at: nowStr,
    };
  } else {
    createdTask = dbTask as EmployeeTask;
  }

  const updatedTasksCache = [createdTask, ...existingLocalTasks.filter((t) => t.id !== createdTask.id)];
  setTasksCache(params.shop_id, updatedTasksCache);

  const createdNotification: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    shop_id: params.shop_id,
    recipient_profile_id: params.employee_profile_id,
    employee_id: params.employee_id,
    task_id: createdTask.id,
    title: `📋 New Task Assigned`,
    message: `You have been assigned "${createdTask.title}" by ${params.assigned_by_name || "Shopkeeper"}.`,
    type: "task_assigned",
    metadata: {
      employee_name: params.employee_name,
      employee_mobile: params.employee_mobile || "",
      task_id: createdTask.id,
      task_title: createdTask.title,
      task_details: createdTask.description || "No additional details provided.",
      assigned_by_name: params.assigned_by_name || "Shopkeeper",
      shop_name: params.shop_name || "BISHOP Shop",
      date_time: nowStr,
      status: "Pending",
      due_date: createdTask.due_date || "No due date",
      priority: createdTask.priority,
    },
    is_read: false,
    created_at: nowStr,
    updated_at: nowStr,
  };

  try {
    await supabase.from("notifications").insert(createdNotification);
  } catch {}

  const existingNotifs = getNotifsCache(params.employee_profile_id);
  setNotifsCache(params.employee_profile_id, [
    createdNotification,
    ...existingNotifs.filter((n) => n.id !== createdNotification.id && n.task_id !== createdTask.id),
  ]);

  return {
    task: createdTask,
    notification: createdNotification,
  };
}

/**
 * Fetches notifications for a specific recipient profile.
 */
export async function fetchRecipientNotifications(
  profileId: string,
  shopId?: string
): Promise<AppNotification[]> {
  const supabase = createClient();
  let dbNotifs: AppNotification[] = [];

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_profile_id", profileId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      dbNotifs = data as AppNotification[];
    }
  } catch {}

  const cachedNotifs = getNotifsCache(profileId);

  const map = new Map<string, AppNotification>();
  for (const n of cachedNotifs) {
    map.set(n.id, n);
  }
  for (const n of dbNotifs) {
    map.set(n.id, n);
  }

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  setNotifsCache(profileId, merged);
  return merged;
}

/**
 * Fetches shop tasks via API route with local cache fallback.
 */
export async function fetchEmployeeTasksApi(
  shopId: string,
  employeeId?: string
): Promise<EmployeeTask[]> {
  try {
    const url = `/api/employee/tasks?shop_id=${shopId}${
      employeeId ? `&employee_id=${employeeId}` : ""
    }`;
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.tasks)) {
      const apiTasks = data.tasks as EmployeeTask[];
      const cached = getTasksCache(shopId);
      const map = new Map<string, EmployeeTask>();
      for (const t of cached) {
        if (!employeeId || t.employee_id === employeeId) {
          map.set(t.id, t);
        }
      }
      for (const t of apiTasks) {
        map.set(t.id, t);
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setTasksCache(shopId, merged);
      return merged;
    }
  } catch (err) {
    console.warn("fetchEmployeeTasksApi error:", err);
  }

  const cached = getTasksCache(shopId);
  if (employeeId) {
    return cached.filter((t) => t.employee_id === employeeId);
  }
  return cached;
}

/**
 * Updates a task status (Pending -> In Progress -> Completed) across DB & persistent state.
 */
export async function updateTaskStatusAndNotify(
  taskId: string,
  newStatus: TaskStatus,
  shopId: string,
  employeeProfileId?: string,
  taskObj?: EmployeeTask
): Promise<{ success: boolean; message?: string }> {
  const nowStr = new Date().toISOString();

  const taskItemsArray = taskObj?.items || taskObj?.task_items || undefined;

  // 1. Update DB task status & inventory via Backend API
  const res = await fetch("/api/employee/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update_status",
      task_id: taskId,
      status: newStatus,
      shop_id: shopId,
      employee_profile_id: employeeProfileId,
      task_items: taskItemsArray,
      task: taskObj,
    }),
  });

  const data = await res.json();

  if (!res.ok || (data.error && !data.success)) {
    throw new Error(data.error || "Failed to update task status.");
  }

  console.log(`Task ${taskId} status updated to ${newStatus} via API.`);

  // 2. Direct Supabase Client fallback update
  try {
    const supabase = createClient();
    await supabase
      .from("employee_tasks")
      .update({
        status: newStatus,
        updated_at: nowStr,
      })
      .eq("id", taskId);
  } catch {}

  // 3. Update local tasks cache ONLY after API success
  const tasksCache = getTasksCache(shopId);
  const updatedTasks = tasksCache.map((t) =>
    t.id === taskId ? { ...t, status: newStatus, updated_at: nowStr } : t
  );
  setTasksCache(shopId, updatedTasks);

  // 4. Update notification status metadata if employeeProfileId is provided
  if (employeeProfileId) {
    const notifs = getNotifsCache(employeeProfileId);
    const updatedNotifs = notifs.map((n) => {
      if (n.task_id === taskId && n.metadata) {
        const displayStatus =
          newStatus === "in_progress" || newStatus === "accepted"
            ? "In Progress"
            : newStatus === "completed"
            ? "Completed"
            : "Pending";

        return {
          ...n,
          metadata: {
            ...n.metadata,
            status: displayStatus,
          },
        };
      }
      return n;
    });
    setNotifsCache(employeeProfileId, updatedNotifs);
  }

  return { success: true, message: data.message };
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(
  notificationId: string,
  recipientProfileId: string
): Promise<void> {
  const supabase = createClient();
  try {
    await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
  } catch {}

  const cached = getNotifsCache(recipientProfileId);
  const updated = cached.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n));
  setNotifsCache(recipientProfileId, updated);
}
