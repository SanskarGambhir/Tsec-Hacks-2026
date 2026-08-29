import mongoose from "mongoose";
import { ApiError } from "../utils/api-error.js";

/**
 * Small schema-driven request validator.
 *
 * Rules are plain objects so a route reads as a declaration of what it accepts.
 * Validation runs before the controller, and the controller may then assume
 * every declared field is present and of the right type.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PHONE_RE = /^\+?[1-9]\d{7,14}$/;
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/** Escape user input before it is used inside a RegExp. */
export const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const isValidObjectId = (value) =>
  OBJECT_ID_RE.test(String(value)) && mongoose.Types.ObjectId.isValid(value);

const checkers = {
  string: (v) => typeof v === "string",
  number: (v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))),
  boolean: (v) => typeof v === "boolean",
  array: (v) => Array.isArray(v),
  object: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  email: (v) => typeof v === "string" && EMAIL_RE.test(v.trim()),
  phone: (v) => typeof v === "string" && PHONE_RE.test(v.trim().replace(/[\s-]/g, "")),
  pan: (v) => typeof v === "string" && PAN_RE.test(v.trim().toUpperCase()),
  objectId: (v) => isValidObjectId(v),
};

const coerce = (type, value) => {
  if (type === "number") return Number(value);
  if (type === "string") return value.trim();
  if (type === "email") return value.trim().toLowerCase();
  if (type === "pan") return value.trim().toUpperCase();
  if (type === "phone") return value.trim().replace(/[\s-]/g, "");
  return value;
};

const validateField = (name, value, rule, errors) => {
  const present = value !== undefined && value !== null && value !== "";

  if (!present) {
    if (rule.required) errors.push(`${name} is required`);
    return undefined;
  }

  const type = rule.type || "string";
  if (!checkers[type]) throw new Error(`Unknown validator type: ${type}`);

  if (!checkers[type](value)) {
    errors.push(`${name} must be a valid ${type}`);
    return undefined;
  }

  const clean = coerce(type, value);

  if (type === "number") {
    if (rule.min !== undefined && clean < rule.min) {
      errors.push(`${name} must be at least ${rule.min}`);
    }
    if (rule.max !== undefined && clean > rule.max) {
      errors.push(`${name} must be at most ${rule.max}`);
    }
    if (rule.positive && clean <= 0) {
      errors.push(`${name} must be greater than 0`);
    }
  }

  if (type === "string" || type === "email") {
    if (rule.minLength && clean.length < rule.minLength) {
      errors.push(`${name} must be at least ${rule.minLength} characters`);
    }
    if (rule.maxLength && clean.length > rule.maxLength) {
      errors.push(`${name} must be at most ${rule.maxLength} characters`);
    }
  }

  if (type === "array") {
    if (rule.minLength && clean.length < rule.minLength) {
      errors.push(`${name} must contain at least ${rule.minLength} item(s)`);
    }
    if (rule.maxLength && clean.length > rule.maxLength) {
      errors.push(`${name} must contain at most ${rule.maxLength} item(s)`);
    }
  }

  if (rule.enum && !rule.enum.includes(clean)) {
    errors.push(`${name} must be one of: ${rule.enum.join(", ")}`);
  }

  return clean;
};

/**
 * Build a middleware that validates one part of the request.
 *
 * @param {object} schema  Field name -> rule.
 * @param {"body"|"params"|"query"} source
 */
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const input = req[source] || {};
    const errors = [];
    const cleaned = {};

    for (const [name, rule] of Object.entries(schema)) {
      const value = validateField(name, input[name], rule, errors);
      if (value !== undefined) cleaned[name] = value;
    }

    if (errors.length) {
      throw new ApiError(400, "Validation failed", errors);
    }

    // Write coerced values back so controllers get trimmed strings and real
    // numbers rather than whatever arrived on the wire. `req.query` and
    // `req.params` are getters on some Express versions, so assign in place.
    for (const [name, value] of Object.entries(cleaned)) {
      input[name] = value;
    }

    next();
  };
};

/* ------------------------------------------------------------------ */
/* Reusable schemas                                                    */
/* ------------------------------------------------------------------ */

export const registerSchema = {
  email: { type: "email", required: true, maxLength: 254 },
  username: { type: "string", required: true, minLength: 3, maxLength: 30 },
  password: { type: "string", required: true, minLength: 8, maxLength: 128 },
  phone: { type: "phone", required: true },
  panCard: { type: "pan", required: true },
  inviteToken: { type: "string", maxLength: 128 },
};

export const loginSchema = {
  email: { type: "email", required: true },
  password: { type: "string", required: true, maxLength: 128 },
  inviteToken: { type: "string", maxLength: 128 },
};

export const emailOnlySchema = {
  email: { type: "email", required: true },
};

export const otpSchema = {
  email: { type: "email", required: true },
  otp: { type: "string", required: true, minLength: 4, maxLength: 10 },
};

export const passwordResetSchema = {
  newPassword: { type: "string", required: true, minLength: 8, maxLength: 128 },
};

export const changePasswordSchema = {
  oldPassword: { type: "string", required: true, maxLength: 128 },
  newPassword: { type: "string", required: true, minLength: 8, maxLength: 128 },
};

export const groupIdParamSchema = {
  groupId: { type: "objectId", required: true },
};

export const amountSchema = {
  amount: { type: "number", required: true, positive: true },
};

export const memberAmountSchema = {
  memberId: { type: "objectId", required: true },
  amount: { type: "number", required: true, positive: true },
};

export const createGroupSchema = {
  name: { type: "string", required: true, minLength: 1, maxLength: 100 },
  description: { type: "string", maxLength: 500 },
  rules: { type: "array", required: true, minLength: 1, maxLength: 50 },
  ruleType: { type: "string", enum: ["splitwise", "pooling"] },
  releaseType: { type: "string", enum: ["instant", "time_locked", "milestone"] },
  pool: { type: "number", min: 0 },
  milestones: { type: "array", maxLength: 50 },
};

export const expenseSchema = {
  amount: { type: "number", required: true, positive: true },
  description: { type: "string", required: true, minLength: 1, maxLength: 300 },
  category: {
    type: "string",
    enum: ["Accommodation", "Food", "Activities", "Transport", "General"],
  },
  divisionMethod: { type: "string", enum: ["even", "custom", "exclude"] },
  excludedMembers: { type: "array", maxLength: 100 },
  customAmounts: { type: "object" },
};

export const messageSchema = {
  content: { type: "string", required: true, minLength: 1, maxLength: 2000 },
};

export const ruleSchema = {
  ruleType: { type: "string", required: true, maxLength: 50 },
  ruleValue: { type: "string", required: true, maxLength: 500 },
  description: { type: "string", maxLength: 300 },
};

export const searchSchema = {
  query: { type: "string", required: true, minLength: 1, maxLength: 100 },
};

export const paginationSchema = {
  page: { type: "number", min: 1 },
  limit: { type: "number", min: 1, max: 100 },
};
