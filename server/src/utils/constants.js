// Fixed values shared across the server.

export const UserRolesEnum = {
  OWNER: "owner",
  MEMBER: "member",
};

export const AvailableUserRoles = Object.values(UserRolesEnum);

export const GroupRuleTypeEnum = {
  POOLING: "pooling",
  SPLITWISE: "splitwise",
};

export const GroupReleaseTypeEnum = {
  INSTANT: "instant",
  TIME_LOCKED: "time_locked",
  MILESTONE: "milestone",
};

export const DivisionMethodEnum = {
  EVEN: "even",
  CUSTOM: "custom",
  EXCLUDE: "exclude",
};
