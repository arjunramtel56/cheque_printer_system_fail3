export interface Template {
  id: string;
  bankId: string;
  bankName: string;
  label: string;
  widthMm: number;
  heightMm: number;
  orientation: "portrait" | "landscape";
  enabled: boolean;
  createdAt: string;
}

export async function getTemplate(id: string): Promise<Template | null> {
  return null;
}

export async function listTemplates(): Promise<Template[]> {
  return [];
}

export async function createTemplate(data: Omit<Template, "id" | "createdAt">): Promise<Template | null> {
  return null;
}

export async function updateTemplate(id: string, data: Partial<Template>): Promise<Template | null> {
  return null;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  return false;
}
