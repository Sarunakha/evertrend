// Mock eSewa Payment Service
export const processPayment = async (orderId, amount) => {
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Generate mock transaction ID
  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // In production, this would integrate with eSewa API
  // For now, we'll simulate successful payment
  console.log(`Processing payment for order ${orderId}, amount: ${amount}, transaction: ${transactionId}`);

  return transactionId;
};

