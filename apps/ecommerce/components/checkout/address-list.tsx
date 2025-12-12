'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/toast';

export type SavedAddress = {
  id: string;
  name?: string | null;
  phone?: string | null;
  label?: string | null;
  line1?: string | null;
  line2?: string | null;
  area?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default?: boolean | null;
  created_at?: string;
  // Alternative field names for compatibility
  address_line1?: string | null;
  address_line2?: string | null;
  address1?: string | null;
  address2?: string | null;
};

export function AddressList(props: {
  addresses: SavedAddress[];
  onSelect?: (id: string) => void;
  onEdit?: (addr: SavedAddress) => void;
}) {
  const [selected, setSelected] = React.useState<string | null>(() => {
    const def = props.addresses.find((a) => a.is_default);
    return def?.id ?? props.addresses[0]?.id ?? null;
  });
  const router = useRouter();
  const { success, error } = useToast();

  React.useEffect(() => {
    props.onSelect?.(selected ?? '');
  }, [selected]);

  async function setDefault(id: string) {
    try {
      const res = await fetch(`/api/public/addresses/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_default: true })
      });
      if (res.ok) {
        success('Default address updated');
        router.refresh();
      } else {
        error('Failed to update default address');
      }
    } catch {
      error('Failed to update default address');
    }
  }

  async function remove(id: string) {
    if (!confirm('Are you sure you want to remove this address?')) {
      return;
    }
    try {
      const res = await fetch(`/api/public/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        success('Address removed successfully');
        router.refresh();
      } else {
        error('Failed to remove address');
      }
    } catch {
      error('Failed to remove address');
    }
  }

  return (
    <div className="space-y-6">
      {props.addresses.map((a, idx) => {
        const isSelected = selected === a.id;
        return (
          <div key={a.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="addressId"
                value={a.id}
                checked={isSelected}
                onChange={() => setSelected(a.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{a.name || 'Saved Address'}</div>
                  {a.label && <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700">{a.label}</span>}
                  {a.is_default ? <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">DEFAULT</span> : null}
                </div>
                <div className="text-sm text-neutral-300 mt-1 space-y-0.5">
                  {(() => {
                    // Try multiple field name variations
                    const line1 = (a.line1 || a.address_line1 || a.address1 || '').trim();
                    const line2 = (a.line2 || a.address_line2 || a.address2 || '').trim();
                    const area = (a.area || '').trim();
                    
                    // Build address parts array, filtering out empty values
                    const parts: string[] = [];
                    if (line1) parts.push(line1);
                    if (line2) parts.push(line2);
                    if (area) parts.push(area);
                    
                    // If we have address parts, display them
                    if (parts.length > 0) {
                      return <div>{parts.join(', ')}</div>;
                    }
                    // Fallback: show city/state/postal if line1 is missing
                    return null;
                  })()}
                  <div>{a.city}, {a.state} - {a.postal_code}</div>
                  {a.landmark && <div className="text-xs text-neutral-400">Near {a.landmark}</div>}
                </div>
                {a.phone ? <div className="text-sm text-neutral-400 mt-1">Mobile: {a.phone}</div> : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!a.is_default && (
                    <button type="button" onClick={() => setDefault(a.id)} className="h-8 px-2 sm:px-3 rounded-md border border-neutral-700 hover:bg-neutral-800 text-xs sm:text-sm">
                      Set as default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => props.onEdit?.(a)}
                    className="h-8 px-2 sm:px-3 rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs sm:text-sm"
                  >
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(a.id)} className="h-8 px-2 sm:px-3 rounded-md border border-neutral-700 hover:bg-neutral-800 text-xs sm:text-sm">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <input type="hidden" name="selectedAddressId" value={selected ?? ''} />
    </div>
  );
}


