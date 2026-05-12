import { useState, useEffect } from "react";
import { saveLibraryPart, loadGlobalRates } from "../storage";
import PartForm, { EMPTY_PART_FORM } from "./PartForm";
import type { PartFormData } from "./PartForm";
import type { LibraryPart } from "../types/index";

function SaveToInventoryModal({
  initialData,
  onSaved,
  onCancel,
}: {
  initialData: { partNumber?: string; name?: string; price?: string; cost?: string; msrp?: string };
  onSaved: (part: LibraryPart) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PartFormData>({
    ...EMPTY_PART_FORM,
    name: initialData.name || "",
    partNumber: initialData.partNumber || "",
    price: initialData.price || "",
    cost: initialData.cost || "",
    msrp: initialData.msrp || "",
    menuPrice: !!(initialData.price && Number(initialData.price) > 0),
  });
  const [markupMatrix, setMarkupMatrix] = useState<
    { max: number | null; markupPct: number }[] | undefined
  >(undefined);

  useEffect(() => {
    loadGlobalRates().then((r) => setMarkupMatrix(r.partsMarkupMatrix));
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const part = await saveLibraryPart({
      partNumber: form.partNumber,
      name: form.name.trim(),
      cost: Number(form.cost) || 0,
      price: Number(form.price) || 0,
      msrp: Number(form.msrp) || 0,
      description: form.description,
      category: form.category,
      subcategory: form.subcategory,
      menuPrice: form.menuPrice,
    });
    onSaved(part);
  };

  return (
    <div
      className="modal-overlay show"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="modal save-inv-modal">
        <div className="modal-header">
          <h3 className="modal-title">Save Part to Inventory</h3>
          <button type="button" className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="save-inv-modal-body">
          <PartForm
            form={form}
            onChange={setForm}
            onSave={handleSave}
            onCancel={onCancel}
            markupMatrix={markupMatrix}
            saveLabel="Save to Inventory"
          />
        </div>
      </div>
    </div>
  );
}

export default SaveToInventoryModal;
