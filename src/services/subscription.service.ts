export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "expired" | "cancelled";
  startDate: string;
  endDate: string;
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  return null;
}

export async function createSubscription(data: Omit<Subscription, "id">): Promise<Subscription | null> {
  return null;
}

export async function cancelSubscription(id: string): Promise<boolean> {
  return false;
}
