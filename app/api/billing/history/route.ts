import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface BillingHistoryItem {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

// Mock billing history data
const mockBillingHistory: BillingHistoryItem[] = [
  {
    id: 'inv_1',
    date: '2024-01-15',
    amount: 29.99,
    status: 'paid',
    description: 'Pro Plan - Monthly',
  },
  {
    id: 'inv_2',
    date: '2024-02-15',
    amount: 29.99,
    status: 'paid',
    description: 'Pro Plan - Monthly',
  },
  {
    id: 'inv_3',
    date: '2024-03-15',
    amount: 29.99,
    status: 'pending',
    description: 'Pro Plan - Monthly',
  },
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 300));

    return NextResponse.json({
      history: mockBillingHistory,
      total: mockBillingHistory.length,
    });
  } catch (error) {
    console.error('Billing history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing history' },
      { status: 500 }
    );
  }
}
