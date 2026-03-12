'use client';

import { useMemo } from 'react';
import { allPermissionIds, permissionGroups } from '@/lib/permissions';

export function PermissionEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const isAll = value.includes('*');
  const selected = useMemo(
    () => new Set(isAll ? allPermissionIds : value),
    [isAll, value],
  );
  const allSelected = isAll || (selected.size > 0 && allPermissionIds.every((id) => selected.has(id)));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    if (next.size === allPermissionIds.length) {
      onChange(['*']);
      return;
    }
    onChange(Array.from(next));
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
      return;
    }
    onChange(['*']);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          Selecionar todas as permissoes
        </label>
        {allSelected && !isAll && (
          <button
            type="button"
            className="text-xs font-semibold text-primary underline underline-offset-2"
            onClick={() => onChange(['*'])}
          >
            Converter para *
          </button>
        )}
      </div>
      <div className="space-y-4">
        {permissionGroups.map((group) => (
          <div key={group.id} className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {group.items.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
