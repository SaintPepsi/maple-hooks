// Pattern 34: Group-By-Key
// Shape: Iterate -> extract key -> accumulate into groups

// === Types ===

interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  type: 'meeting' | 'deadline' | 'reminder';
}

interface LogMessage {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  message: string;
}

// === Variant A: Group employees by department ===

function groupEmployeesByDepartment(
  employees: Employee[]
): Record<string, Employee[]> {
  const groups: Record<string, Employee[]> = {};
  for (const employee of employees) {
    const key = employee.department;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(employee);
  }
  return groups;
}

function groupEmployeesByRole(employees: Employee[]): Record<string, Employee[]> {
  const groups: Record<string, Employee[]> = {};
  for (const employee of employees) {
    const key = employee.role;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(employee);
  }
  return groups;
}

// === Variant B: Group events by date ===

function groupEventsByDate(events: Event[]): Record<string, Event[]> {
  const groups: Record<string, Event[]> = {};
  for (const event of events) {
    const key = event.date;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(event);
  }
  return groups;
}

function groupEventsByType(events: Event[]): Record<Event['type'], Event[]> {
  const groups: Record<string, Event[]> = {};
  for (const event of events) {
    const key = event.type;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(event);
  }
  return groups as Record<Event['type'], Event[]>;
}

// === Variant C: Group logs by service (using Map) ===

function groupLogsByService(logs: LogMessage[]): Map<string, LogMessage[]> {
  const groups = new Map<string, LogMessage[]>();
  for (const log of logs) {
    const key = log.service;
    const existing = groups.get(key);
    if (existing) {
      existing.push(log);
    } else {
      groups.set(key, [log]);
    }
  }
  return groups;
}

function groupLogsByLevel(logs: LogMessage[]): Map<LogMessage['level'], LogMessage[]> {
  const groups = new Map<LogMessage['level'], LogMessage[]>();
  for (const log of logs) {
    const key = log.level;
    const existing = groups.get(key);
    if (existing) {
      existing.push(log);
    } else {
      groups.set(key, [log]);
    }
  }
  return groups;
}

// === Generic groupBy utility ===

function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  const groups = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }
  return groups;
}

// === Exports ===

export {
  groupEmployeesByDepartment,
  groupEmployeesByRole,
  groupEventsByDate,
  groupEventsByType,
  groupLogsByService,
  groupLogsByLevel,
  groupBy,
};

export type { Employee, Event, LogMessage };
