import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Simple hash function that works in Convex
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Create a new user
export const createUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.union(v.literal("waiter"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password using simple hash function
    const hashedPassword = simpleHash(args.password);

    // Create user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: hashedPassword,
      name: args.name,
      role: args.role,
      isActive: true,
    });

    return userId;
  },
});

// Authenticate user
export const authenticateUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user || !user.isActive) {
      throw new Error("Invalid credentials or user is inactive");
    }

    // Check if password needs to be hashed (for seeded users)
    if (user.password === args.password) {
      // This is a seeded user with plain text password, hash it now
      const hashedPassword = simpleHash(args.password);
      await ctx.db.patch(user._id, { password: hashedPassword });
    } else {
      // Verify hashed password
      const hashedInput = simpleHash(args.password);
      if (hashedInput !== user.password) {
        throw new Error("Invalid credentials");
      }
    }

    // Create session
    const sessionId = await ctx.db.insert("sessions", {
      userId: user._id,
      token: generateToken(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
      sessionId,
    };
  },
});

// Get user by session token
export const getUserByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) {
      return null;
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };
  },
});

// Logout user
export const logoutUser = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

// Generate a simple token (in production, use a proper JWT library)
function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
