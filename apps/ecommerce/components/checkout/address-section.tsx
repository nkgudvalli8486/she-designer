'use client';

import * as React from 'react';
import { AddressList, type SavedAddress } from './address-list';
import { AddressModal } from './address-modal';
import { AddressForm } from './address-form';

export function AddressSectionWithModal(props: {
  addresses: SavedAddress[];
  saveAction: (formData: FormData) => void | Promise<void>;
  updateAction: (formData: FormData) => void | Promise<void>;
  proceedAction: (formData: FormData) => void | Promise<void>;
}) {
  const [openAdd, setOpenAdd] = React.useState(false);
  const [editing, setEditing] = React.useState<SavedAddress | null>(null);
  const sorted = React.useMemo(() => {
    const arr = [...props.addresses];
    arr.sort((a, b) => {
      const ad = (a.is_default ? 1 : 0);
      const bd = (b.is_default ? 1 : 0);
      if (ad !== bd) return bd - ad; // default first
      const at = new Date(a.created_at || 0).getTime();
      const bt = new Date(b.created_at || 0).getTime();
      return bt - at; // newest next
    });
    return arr;
  }, [props.addresses]);

  function toInitial(addr: SavedAddress) {
    // Extract door number from line1 if it exists (format: "doorNo, address1")
    const line1 = (addr as any).line1 || (addr as any).address_line1 || '';
    const doorNoMatch = line1.match(/^([^,]+),/);
    const doorNo = doorNoMatch ? doorNoMatch[1].trim() : '';
    const address1 = doorNoMatch ? line1.replace(/^[^,]+,/, '').trim() : line1;
    
    return {
      addressId: addr.id,
      name: addr.name || '',
      phone: addr.phone || '',
      pincode: (addr as any).postal_code || (addr as any).pincode || '',
      address1: address1,
      address2: (addr as any).line2 || (addr as any).address_line2 || '',
      area: addr.area || '',
      district: addr.city || (addr as any).district || '',
      state: addr.state || '',
      country: addr.country || 'India',
      landmark: addr.landmark || '',
      addressType: (addr as any).address_type || (addr as any).type || 'HOME',
      doorNo: doorNo || (addr as any).door_no || (addr as any).door_number || ''
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <h2 className="text-lg font-semibold">Select Delivery Address</h2>
        <button
          onClick={() => setOpenAdd(true)}
          className="h-9 w-full sm:w-auto px-3 rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-sm"
        >
          Add New Address
        </button>
      </div>

      <form action={props.proceedAction} className="space-y-6">
        <AddressList addresses={sorted} onEdit={(a) => setEditing(a)} />
        <button className="h-10 w-full sm:w-auto px-4 rounded-md bg-primary text-primary-foreground">Continue</button>
      </form>

      <AddressModal open={openAdd} title="Add New Address" onClose={() => setOpenAdd(false)}>
        <AddressForm action={props.saveAction} showDefaultToggle submitLabel="Save Address" />
      </AddressModal>

      <AddressModal open={!!editing} title="Edit Address" onClose={() => setEditing(null)}>
        {editing ? (
          <AddressForm
            action={props.updateAction}
            initialValues={toInitial(editing)}
            showDefaultToggle
            submitLabel="Update Address"
          />
        ) : null}
      </AddressModal>
    </div>
  );
}


