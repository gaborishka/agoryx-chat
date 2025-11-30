
/**
 * Stripe Service (Mock)
 * 
 * This service simulates the backend endpoints required for Milestone 5.1 and 5.2.
 * In a production app, these would be calls to a Python/Node backend using the Stripe SDK.
 */

export interface CheckoutSessionResponse {
    sessionId: string;
    url: string;
}
  
export interface BillingHistoryItem {
    id: string;
    date: string;
    amount: string;
    status: 'paid' | 'pending' | 'failed';
    invoicePdfUrl: string;
}

// Simulated DB for invoices
const MOCK_INVOICES: BillingHistoryItem[] = [
    { id: 'in_1NqX', date: '2024-03-01', amount: '$9.99', status: 'paid', invoicePdfUrl: '#' },
    { id: 'in_1NqW', date: '2024-02-01', amount: '$9.99', status: 'paid', invoicePdfUrl: '#' },
    { id: 'in_1NqV', date: '2024-01-01', amount: '$9.99', status: 'paid', invoicePdfUrl: '#' },
];

export const StripeService = {
    /**
     * POST /api/subscriptions/checkout
     * Creates a Stripe Checkout Session
     */
    async createCheckoutSession(priceId: string, mode: 'subscription' | 'payment' = 'subscription'): Promise<CheckoutSessionResponse> {
      console.log(`[StripeService] Creating checkout session for ${priceId}...`);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const sessionId = `cs_test_${Math.random().toString(36).substring(7)}`;
      
      // In a real app, this URL comes from Stripe
      return {
        sessionId,
        url: `https://checkout.stripe.com/pay/${sessionId}` 
      };
    },
  
    /**
     * POST /api/create-portal-session
     * Creates a billing portal session
     */
    async createPortalSession(): Promise<{ url: string }> {
      console.log(`[StripeService] Creating portal session...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { url: 'https://billing.stripe.com/p/session/test_portal_123' };
    },
    
    /**
     * GET /api/subscriptions/history
     */
    async getBillingHistory(): Promise<BillingHistoryItem[]> {
       console.log(`[StripeService] Fetching billing history...`);
       await new Promise(resolve => setTimeout(resolve, 800));
       return [...MOCK_INVOICES];
    },
    
    /**
     * POST /api/subscriptions/cancel
     */
    async cancelSubscription(subscriptionId: string): Promise<void> {
      console.log(`[StripeService] Cancelling subscription ${subscriptionId}...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Mock success
    },

    /**
     * POST /api/subscriptions/update
     * (Upgrade/Downgrade logic)
     */
    async updateSubscription(priceId: string): Promise<void> {
        console.log(`[StripeService] Updating subscription to ${priceId}...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
};
