'use client';

import * as React from 'react';

type AddressSuggestion = {
  pincode: string;
  country: string | null;
  state: string | null;
  district: string | null;
  places: Array<{ name: string; branchType: string; block: string | null; region: string | null }>;
};

export function AddressForm(props: {
  action: (formData: FormData) => void | Promise<void>;
  showDefaultToggle?: boolean;
  initialValues?: Partial<{
    addressId: string;
    name: string;
    phone: string;
    pincode: string;
    address1: string;
    address2: string;
    area: string;
    district: string;
    state: string;
    country: string;
    landmark: string;
    addressType: string;
    doorNo?: string;
  }>;
  submitLabel?: string;
}) {
  const [pin, setPin] = React.useState(props.initialValues?.pincode || '');
  const [loading, setLoading] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<AddressSuggestion | null>(null);
  const [areaInput, setAreaInput] = React.useState(props.initialValues?.area || '');
  const [pincodeChanged, setPincodeChanged] = React.useState(false);
  const initialPincodeRef = React.useRef(props.initialValues?.pincode || '');

  const fetchRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    async function lookup(pinCode: string) {
      fetchRef.current?.abort();
      const ctrl = new AbortController();
      fetchRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/public/pincode/${pinCode}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = (await res.json()) as AddressSuggestion;
          setSuggestion(data);
          // Only clear area input if pincode was changed by user (not on initial load)
          if (pincodeChanged && pinCode !== initialPincodeRef.current) {
            setAreaInput('');
          }
        } else {
          setSuggestion(null);
        }
      } catch {
        setSuggestion(null);
      } finally {
        setLoading(false);
      }
    }
    if (/^\d{6}$/.test(pin)) {
      lookup(pin);
    } else if (pin.length < 6) {
      setSuggestion(null);
    }
  }, [pin, pincodeChanged]);

  React.useEffect(() => {
    // When we get suggestions, prefill district/state/country inputs
    if (suggestion) {
      const form = document.getElementById('address-form') as HTMLFormElement | null;
      if (!form) return;
      const fields: Record<string, string | null> = {
        country: suggestion.country ?? 'India',
        state: suggestion.state ?? '',
        district: suggestion.district ?? ''
      };
      (Object.keys(fields) as Array<keyof typeof fields>).forEach((k) => {
        const el = form.elements.namedItem(k) as HTMLInputElement | null;
        if (el) {
          // Always update when pincode was changed by user
          // On initial load, only update if field is empty
          if (pincodeChanged || !el.value) {
            el.value = fields[k] ?? '';
          }
        }
      });
    }
  }, [suggestion, pincodeChanged]);

  const places = suggestion?.places ?? [];

  return (
    <form id="address-form" action={props.action} className="space-y-4">
      {props.initialValues?.addressId ? <input type="hidden" name="addressId" value={props.initialValues.addressId} /> : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">Name</label>
          <input required name="name" defaultValue={props.initialValues?.name || ''} placeholder="Full name" className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">Mobile No</label>
          <input
            required
            name="phone"
            type="tel"
            inputMode="tel"
            pattern="^[0-9]{10}$"
            maxLength={10}
            placeholder="10-digit mobile"
            defaultValue={props.initialValues?.phone || ''}
            className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">Pin Code</label>
          <input
            required
            name="pincode"
            type="text"
            inputMode="numeric"
            pattern="^[0-9]{6}$"
            maxLength={6}
            placeholder="6-digit PIN"
            value={pin}
            onChange={(e) => {
              const newPin = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
              setPin(newPin);
              // Mark that pincode was changed by user (not just initial load)
              if (newPin !== props.initialValues?.pincode) {
                setPincodeChanged(true);
              }
            }}
            className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100"
          />
          {loading && <p className="text-xs text-neutral-400">Detecting location…</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">State</label>
          <input name="state" defaultValue={props.initialValues?.state || ''} placeholder="State" className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">District</label>
          <input name="district" defaultValue={props.initialValues?.district || ''} placeholder="District" className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">Door / Flat No</label>
          <input
            name="doorNo"
            defaultValue={props.initialValues?.doorNo || ''}
            placeholder="Door/Flat Number"
            className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100"
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2 md:col-span-1">
          <label className="text-sm text-neutral-400">Building / Street Name</label>
          <input
            required
            name="address1"
            defaultValue={props.initialValues?.address1 || ''}
            placeholder="Building, Street Name"
            className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">Country</label>
          <input name="country" defaultValue={props.initialValues?.country || 'India'} className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">Area / Locality</label>
          <input
            name="area"
            list="areaOptions"
            value={areaInput}
            onChange={(e) => setAreaInput(e.target.value)}
            placeholder={places.length > 0 ? 'Choose or type your area' : 'Type your area'}
            className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100"
          />
          <datalist id="areaOptions">
            {places.map((p) => (
              <option key={`${p.name}-${p.branchType}`} value={p.name}>
                {p.name} ({p.branchType})
              </option>
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">Landmark (optional)</label>
          <input name="landmark" defaultValue={props.initialValues?.landmark || ''} placeholder="Nearby landmark" className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">Address Type</label>
          <select name="addressType" defaultValue={props.initialValues?.addressType || 'HOME'} className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100">
            <option value="HOME">Home</option>
            <option value="OFFICE">Office</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <button type="submit" className="h-10 px-4 rounded-md bg-primary text-primary-foreground w-full sm:w-auto">
          {props.submitLabel || 'Save & Continue'}
        </button>
        {props.showDefaultToggle ? (
          <label className="text-sm text-neutral-300 inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isDefault" className="align-middle" />
            Set as default
          </label>
        ) : null}
      </div>
    </form>
  );
}


