export interface User {
  id: string;
  email: string;
  fullName?: string;
  role: "user" | "admin";
  createdAt: string;
}

export async function getUser(id: string): Promise<User | null> {
  return null;
}

export async function listUsers(): Promise<User[]> {
  return [];
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  return null;
}

export async function deleteUser(id: string): Promise<boolean> {
  return false;
}
