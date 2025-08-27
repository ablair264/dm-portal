// server/src/services/customerAuthService.js
import { auth, db } from '../config/firebase.js';

export async function createCustomerAuth(customerId) {
  try {
    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      uid: customerId,
      email: `customer-${customerId}@dmbrands.com`,
      password: generateRandomPassword(),
      displayName: `Customer ${customerId}`,
      disabled: false
    });

    // Update customer record in database
    await db.collection('customers').doc(customerId).update({
      authCreated: true,
      firebaseUid: userRecord.uid,
      createdAt: new Date(),
      email: userRecord.email
    });

    return {
      message: `Auth created for customer ${customerId}`,
      uid: userRecord.uid,
      email: userRecord.email
    };
  } catch (error) {
    if (error.code === 'auth/uid-already-exists') {
      return {
        message: `Auth already exists for customer ${customerId}`,
        uid: customerId
      };
    }
    throw error;
  }
}

export async function bulkCreateCustomerAuth(customerIds) {
  const results = [];
  
  for (const customerId of customerIds) {
    try {
      const result = await createCustomerAuth(customerId);
      results.push({
        customerId,
        success: true,
        ...result
      });
    } catch (error) {
      results.push({
        customerId,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

export async function createAuthForAllCustomers() {
  try {
    // Get all customers without auth
    const customersSnapshot = await db.collection('customers')
      .where('authCreated', '!=', true)
      .get();
    
    const customerIds = customersSnapshot.docs.map(doc => doc.id);
    
    if (customerIds.length === 0) {
      return {
        message: 'No customers found without auth',
        results: []
      };
    }
    
    const results = await bulkCreateCustomerAuth(customerIds);
    
    return {
      message: `Processed ${customerIds.length} customers`,
      results
    };
  } catch (error) {
    throw new Error(`Failed to create auth for all customers: ${error.message}`);
  }
}

function generateRandomPassword() {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}