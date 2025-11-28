import { NextResponse } from 'next/server';

type PostalApiResponse = Array<{
  Status: string;
  PostOffice?: Array<{
    Name: string;
    BranchType: string;
    Block: string | null;
    District: string;
    State: string;
    Country?: string;
    Region?: string | null;
    Division?: string | null;
  }> | null;
}>;

export async function GET(_: Request, ctx: { params: Promise<{ pincode: string }> }) {
  const { pincode } = await ctx.params;
  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: 'Invalid pincode' }, { status: 400 });
  }
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Lookup failed' }, { status: 502 });
    }
    const data = (await res.json()) as PostalApiResponse;
    const entry = data?.[0];
    const offices = entry?.PostOffice ?? [];
    if (!offices || offices.length === 0) {
      return NextResponse.json({
        pincode,
        country: 'India',
        state: null,
        district: null,
        places: []
      });
    }
    // At this point we know offices.length > 0
    const first = offices[0]!;
    const uniquePlaces = Array.from(
      new Map(
        offices.map((o) => [
          `${o.Name}|${o.BranchType}`,
          { name: o.Name, branchType: o.BranchType, block: o.Block, region: o.Region ?? null }
        ])
      ).values()
    );
    return NextResponse.json({
      pincode,
      country: first.Country || 'India',
      state: first.State,
      district: first.District,
      places: uniquePlaces
    });
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}


