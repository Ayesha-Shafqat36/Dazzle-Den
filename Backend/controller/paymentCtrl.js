const stripe = require('stripe')("sk_test_51QYLJg02VlIBdNbaKaFKI2s6MULL2b6vRYxICw41hXq9g3JAtHDPS36V3LjxLN97rguE2FKPOis2hGgE5LPFlGjs00ysslcN00");

const checkout = async (req, res) => {
  try {
    const { amount } = req.body;
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Convert to cents
      currency: 'PKR',
      metadata: {
        userId: req.user._id.toString(),
      },
      payment_method_types: ['card']
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const paymentVerification = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    
    // Verify the payment
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      res.json({
        success: true,
        paymentIntent,
      });
    } else {
      throw new Error('Payment unsuccessful');
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  checkout,
  paymentVerification,
};