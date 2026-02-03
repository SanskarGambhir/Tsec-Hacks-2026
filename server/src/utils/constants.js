// This is where I will define all the constants used across the server application. 

// This includes enumerations for user roles, task statuses, and any other fixed values.

export const UserRolesEnum = { 
  ADMIN: 'admin',
  PROJECT_ADMIN: 'project_admin',
  MEMBER: 'member',
};

export const AvailableUserRoles = Object.values(UserRolesEnum);

export const TaskStatusEnum = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

export const AvailableTaskStatuses = Object.values(TaskStatusEnum);