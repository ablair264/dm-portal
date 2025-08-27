// server/src/routes/signup.js
import express from 'express';
import { sendSignupInquiry } from '../services/emailService.js';

const router = express.Router();

// Handle customer signup inquiry
router.post('/signup-inquiry', async (req, res) => {
  try {
    const {
      companyName,
      companyRegNo,
      address1,
      address2,
      town,
      postcode,
      email,
      phone,
      brandsInterested,
      brandNames
    } = req.body;

    // Validate required fields
    if (!companyName || !address1 || !town || !postcode || !email || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    // Prepare inquiry data
    const inquiryData = {
      companyName,
      companyRegNo: companyRegNo || 'Not provided',
      address: {
        line1: address1,
        line2: address2 || '',
        town,
        postcode
      },
      email,
      phone,
      brandsInterested: brandNames || brandsInterested || [],
      submittedAt: new Date().toISOString()
    };

    // Send email to sales team
    await sendSignupInquiry(inquiryData);

    console.log('📧 Signup inquiry submitted:', {
      company: companyName,
      email,
      brands: brandNames || brandsInterested
    });

    res.json({
      success: true,
      message: 'Thank you for your inquiry! We will be in touch shortly.'
    });

  } catch (error) {
    console.error('❌ Signup inquiry error:', error);
    res.status(500).json({
      success: false,
      error: 'Sorry, there was an error processing your inquiry. Please try again.'
    });
  }
});

export default router;