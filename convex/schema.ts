import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cheques: defineTable({
    payeeName: v.string(),
    amount: v.number(),
    bankName: v.string(),
    status: v.string(),
  }),
});
