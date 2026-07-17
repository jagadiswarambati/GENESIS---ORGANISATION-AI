export type MemoryEntry = {
  content: string;
  department: string;
  memory_id: string;
  summary: string;
  tags: string[];
  task_id: string;
  timestamp: string;
  title: string;
  worker_id: string;
};

export type OrganizationMemory = {
  entries: MemoryEntry[];
};
