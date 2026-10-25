import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getCheques = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cheques").order("desc").collect();
  },
});

export const createCheque = mutation({
  args: {
    payeeName: v.string(),
    amount: v.number(),
    bankName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cheques", {
      payeeName: args.payeeName,
      amount: args.amount,
      bankName: args.bankName,
      status: "printed",
    });
  },
});
