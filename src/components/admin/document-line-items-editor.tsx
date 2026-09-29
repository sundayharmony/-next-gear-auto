"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  lineItemAmount,
  MAX_DOCUMENT_LINE_ITEMS,
  type DocumentLineItem,
} from "@/lib/documents/document-line-items";

export type DocumentLineItemDraft = DocumentLineItem & { id: string };

export function emptyDocumentLineDraft(): DocumentLineItemDraft {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    unitPrice: 0,
    quantity: 1,
  };
}

export function draftsFromLineItems(items: DocumentLineItem[]): DocumentLineItemDraft[] {
  if (!items.length) return [emptyDocumentLineDraft()];
  return items.map((item) => ({
    id: crypto.randomUUID(),
    title: item.title,
    description: item.description ?? "",
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    isCredit: item.isCredit,
  }));
}

export function draftsToLineItems(drafts: DocumentLineItemDraft[]): DocumentLineItem[] {
  return drafts
    .filter((d) => d.title.trim())
    .map((d) => ({
      title: d.title.trim(),
      description: d.description?.trim() || undefined,
      unitPrice: Number(d.unitPrice) || 0,
      quantity: Number(d.quantity) || 1,
      isCredit: d.isCredit || undefined,
    }));
}

type DocumentLineItemsEditorProps = {
  drafts: DocumentLineItemDraft[];
  onChange: (drafts: DocumentLineItemDraft[]) => void;
  showCreditToggle?: boolean;
};

export function DocumentLineItemsEditor({
  drafts,
  onChange,
  showCreditToggle = false,
}: DocumentLineItemsEditorProps) {
  const addLine = () => {
    if (drafts.length >= MAX_DOCUMENT_LINE_ITEMS) return;
    onChange([...drafts, emptyDocumentLineDraft()]);
  };

  const removeLine = (id: string) => {
    onChange(drafts.length <= 1 ? [emptyDocumentLineDraft()] : drafts.filter((d) => d.id !== id));
  };

  const updateLine = (id: string, patch: Partial<DocumentLineItemDraft>) => {
    onChange(drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Line items</span>
        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          <Plus className="h-3 w-3 mr-1" />
          Add line
        </Button>
      </div>

      {/* QuickBooks-style row layout on laptop+ */}
      <div className="hidden lg:block overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 border-b">
              <th className="px-3 py-2 w-[18%]">Title</th>
              <th className="px-3 py-2 w-[32%]">Description</th>
              <th className="px-3 py-2 w-[12%]">Rate</th>
              <th className="px-3 py-2 w-[8%]">Qty</th>
              <th className="px-3 py-2 w-[12%] text-right">Amount</th>
              {showCreditToggle ? <th className="px-3 py-2 w-[10%]">Credit</th> : null}
              <th className="px-2 py-2 w-10" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => {
              const amount = lineItemAmount({
                title: d.title,
                unitPrice: Number(d.unitPrice) || 0,
                quantity: Number(d.quantity) || 1,
                isCredit: d.isCredit,
              });
              return (
                <tr key={d.id} className="border-b last:border-0 align-top">
                  <td className="px-2 py-2">
                    <Input
                      placeholder="Item name"
                      value={d.title}
                      onChange={(e) => updateLine(d.id, { title: e.target.value })}
                      className="text-sm h-9"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      placeholder="Description"
                      value={d.description ?? ""}
                      onChange={(e) => updateLine(d.id, { description: e.target.value })}
                      className="text-sm h-9"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={d.unitPrice}
                      onChange={(e) => updateLine(d.id, { unitPrice: Number(e.target.value) })}
                      className="text-sm h-9"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={1}
                      step="1"
                      value={d.quantity}
                      onChange={(e) => updateLine(d.id, { quantity: Number(e.target.value) })}
                      className="text-sm h-9"
                    />
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-gray-900 pt-3">
                    ${amount.toFixed(2)}
                  </td>
                  {showCreditToggle ? (
                    <td className="px-2 py-2 text-center pt-3">
                      <input
                        type="checkbox"
                        checked={!!d.isCredit}
                        onChange={(e) => updateLine(d.id, { isCredit: e.target.checked })}
                        aria-label="Credit line"
                      />
                    </td>
                  ) : null}
                  <td className="px-1 py-2">
                    <button
                      type="button"
                      onClick={() => removeLine(d.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stacked layout for phone / tablet */}
      <div className="lg:hidden space-y-3 max-h-96 overflow-y-auto">
        {drafts.map((d) => {
          const lineTotal = lineItemAmount({
            title: d.title,
            unitPrice: Number(d.unitPrice) || 0,
            quantity: Number(d.quantity) || 1,
            isCredit: d.isCredit,
          });
          return (
            <div key={d.id} className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50/50">
              <div className="flex gap-2 items-start">
                <Input
                  placeholder="Title"
                  value={d.title}
                  onChange={(e) => updateLine(d.id, { title: e.target.value })}
                  className="flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeLine(d.id)}
                  className="p-2 text-gray-400 hover:text-red-600 shrink-0"
                  aria-label="Remove line"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Input
                placeholder="Description (optional)"
                value={d.description ?? ""}
                onChange={(e) => updateLine(d.id, { description: e.target.value })}
                className="text-sm"
              />
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className="text-[10px] font-medium text-gray-500 uppercase">Rate</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={d.unitPrice}
                    onChange={(e) => updateLine(d.id, { unitPrice: Number(e.target.value) })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-500 uppercase">Qty</label>
                  <Input
                    type="number"
                    min={1}
                    step="1"
                    value={d.quantity}
                    onChange={(e) => updateLine(d.id, { quantity: Number(e.target.value) })}
                    className="text-sm"
                  />
                </div>
                <p className="text-sm font-medium text-gray-700 pb-2 text-right">${lineTotal.toFixed(2)}</p>
              </div>
              {showCreditToggle ? (
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={!!d.isCredit}
                    onChange={(e) => updateLine(d.id, { isCredit: e.target.checked })}
                  />
                  Credit (subtract from total)
                </label>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
