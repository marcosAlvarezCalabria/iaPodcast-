"use client";

import type { Tag } from "@/src/lib/tags/types";

interface TagSelectorProps {
  tags: Tag[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

export function TagSelector({ tags, selectedIds, onChange }: TagSelectorProps) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((t) => t !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isSelected = selectedIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? "bg-[#231b0f] text-[#fbb751]"
                : "bg-[#f5e8d0] text-[#231b0f] hover:bg-[#f0d8a8]"
            }`}
          >
            {/* Requires the Material Symbols Outlined font loaded in app/layout.tsx */}
            <span className="material-symbols-outlined text-base leading-none">{tag.icon}</span>
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}
