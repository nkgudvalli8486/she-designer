import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';
import { autoSyncRefund } from '@/app/(shop)/orders/[id]/sync-refund-action';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authPayload = await verifyAuthToken(token);
    if (!authPayload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the autoSyncRefund function to check for refunds
    const result = await autoSyncRefund(id);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to check refund status',
        refunded: false 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      refunded: result.refunded || false,
      message: result.message
    });
  } catch (error: any) {
    console.error('Error in check-refund endpoint:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      refunded: false 
    }, { status: 500 });
  }
}

