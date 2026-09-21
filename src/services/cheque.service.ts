export interface Cheque {
  id: string;
  userId: string;
  chequeNumber: string;
  bankName: string;
  payeeName: string;
  amount: number;
  amountWords: string;
  chequeDate: string;
  status: "draft" | "printed" | "cancelled";
  createdAt: string;
}

export async function getCheque(id: string): Promise<Cheque | null> {
  return null;
}

export async function listCheques(userId: string): Promise<Cheque[]> {
  return [];
}

export async function createCheque(data: Omit<Cheque, "id" | "createdAt">): Promise<Cheque | null> {
  return null;
}

export async function updateCheque(id: string, data: Partial<Cheque>): Promise<Cheque | null> {
  return null;
}

export async function deleteCheque(id: string): Promise<boolean> {
  return false;
}
