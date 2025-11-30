import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = await request.json();

    if (!tier || !['basic', 'pro'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Mock checkout session - in production, this would create a real Stripe checkout session
    const checkoutUrl = `/dashboard?checkout=${tier}&status=success`;

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 500));

    return NextResponse.json({
      url: checkoutUrl,
      sessionId: `cs_mock_${Date.now()}`,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
