export type InventoryItem = {
  id: string;
  name: string;
  serialNo: number | null;
  code: string;
  series: string;
  searchKey: string;
  opening: number;
  added: number;
  outward: number;
  closing: number;
  rackNo: string | null;
  spec: string | null;
  tag: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItemInsert = {
  name: string;
  serialNo?: number | null;
  code: string;
  series: string;
  searchKey: string;
  opening: number;
  added: number;
  outward: number;
  closing: number;
  rackNo?: string | null;
  spec?: string | null;
  tag?: string | null;
};

export type InventoryItemRow = {
  id: string;
  name: string;
  serial_no: number | null;
  code: string;
  series: string;
  search_key: string;
  opening: number;
  added: number;
  outward: number;
  closing: number;
  rack_no: string | null;
  spec: string | null;
  tag: string | null;
  created_at: string;
  updated_at: string;
};
