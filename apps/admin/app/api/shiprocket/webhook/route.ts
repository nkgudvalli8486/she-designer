import { NextRequest, NextResponse } from 'next/server';
import { verifyShiprocketWebhook } from '@nts/integrations';

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get('x-shiprocket-signature') ?? undefined;
  try {
    verifyShiprocketWebhook(signature, raw);
    const payload = JSON.parse(raw);
    // TODO: Update order status in DB from payload
    return NextResponse.json({ ok: true });
  } catch (err) {
    return new NextResponse((err as Error).message, { status: 400 });
  }
}


