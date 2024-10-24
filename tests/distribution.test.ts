import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  Client,
  Provider,
  ProviderRegistry,
  Result,
} from '@blockstack/clarity';

describe('ubi-distribution contract test suite', () => {
  let client: Client;
  let provider: Provider;
  
  beforeEach(async () => {
    provider = await ProviderRegistry.createProvider();
    client = new Client('SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB.ubi-distribution', 'ubi-distribution', provider);
    await client.deployContract();
  });
  
  afterEach(async () => {
    await provider.close();
  });
  
  describe('Registration Tests', () => {
    it('should allow a new participant to register', async () => {
      const tx = client.createTransaction({
        method: { name: 'register', args: [] }
      });
      await tx.sign('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      const receipt = await client.submitTransaction(tx);
      
      expect(receipt.success).toBe(true);
      
      // Verify registration status
      const getInfo = client.createTransaction({
        method: { name: 'get-participant-info', args: ['SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7'] }
      });
      const result = await client.submitTransaction(getInfo);
      const participantInfo = Result.unwrap(result);
      
      expect(participantInfo.registered).toBe(true);
      expect(participantInfo.verified).toBe(false);
    });
    
    it('should prevent double registration', async () => {
      // First registration
      const tx1 = client.createTransaction({
        method: { name: 'register', args: [] }
      });
      await tx1.sign('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      await client.submitTransaction(tx1);
      
      // Second registration attempt
      const tx2 = client.createTransaction({
        method: { name: 'register', args: [] }
      });
      await tx2.sign('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      const receipt = await client.submitTransaction(tx2);
      
      expect(receipt.success).toBe(false);
      expect(receipt.error).toContain('ERR_ALREADY_REGISTERED');
    });
  });
  
  describe('Verification Tests', () => {
    it('should allow contract owner to verify participants', async () => {
      // First register a participant
      const registerTx = client.createTransaction({
        method: { name: 'register', args: [] }
      });
      await registerTx.sign('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      await client.submitTransaction(registerTx);
      
      // Verify the participant
      const verifyTx = client.createTransaction({
        method: {
          name: 'verify-participant',
          args: ['SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7']
        }
      });
      await verifyTx.sign('SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB');
      const receipt = await client.submitTransaction(verifyTx);
      
      expect(receipt.success).toBe(true);
      
      // Check verification status
      const getInfo = client.createTransaction({
        method: {
          name: 'get-participant-info',
          args: ['SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7']
        }
      });
      const result = await client.submitTransaction(getInfo);
      const participantInfo = Result.unwrap(result);
      
      expect(participantInfo.verified).toBe(true);
    });
    
    it('should prevent unauthorized users from verifying participants', async () => {
      // Register a participant
      const registerTx = client.createTransaction({
        method: { name: 'register', args: [] }
      });
      await registerTx.sign('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      await client.submitTransaction(registerTx);
      
      // Attempt verification from unauthorized account
      const verifyTx = client.createTransaction({
        method: {
          name: 'verify-participant',
          args: ['SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7']
        }
      });
      await verifyTx.sign('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      const receipt = await client.submitTransaction(verifyTx);
      
      expect(receipt.success).toBe(false);
      expect(receipt.error).toContain('ERR_UNAUTHORIZED');
    });
  });
  
  describe('UBI Claim Tests', () => {
    beforeEach(async () => {
      // Fund the contract
      const fundTx = client.createTransaction({
        method: { name: 'deposit-to-pool', args: ['1000000000'] }
      });
      await fundTx.sign('SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB');
      await client.submitTransaction(fundTx);
    });
    
    it('should allow verified participants to claim UBI after cycle period', async () => {
      // Register and verify participant
      const participant = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
      
      const registerTx = client.createTransaction({
        method: { name: 'register', args: [] }
      });
      await registerTx.sign(participant);
      await client.submitTransaction(registerTx);
      
      const verifyTx = client.createTransaction({
        method: { name: 'verify-participant', args: [participant] }
      });
      await verifyTx.sign('SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB');
      await client.submitTransaction(verifyTx);
      
      // Advance blockchain by distribution cycle
      await provider.mineBlocks(2160);
      
      // Attempt to claim UBI
      const claimTx = client.createTransaction({
        method: { name: 'claim-ubi', args: [] }
      });
      await claimTx.sign(participant);
      const receipt = await client.submitTransaction(claimTx);
      
      expect(receipt.success).toBe(true);
      
      // Verify claim was recorded
      const getInfo = client.createTransaction({
        method: { name: 'get-participant-info', args: [participant] }
      });
      const result = await client.submitTransaction(getInfo);
      const participantInfo = Result.unwrap(result);
      
      expect(participantInfo.total-claimed).toBe('100000000');
    });
    
    it('should prevent unverified participants from claiming', async () => {
      // Register but don't verify participant
      const registerTx = client.createTransaction({
        method: { name: 'register', args: [] }
      });
      await registerTx.sign('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      await client.submitTransaction(registerTx);
      
      // Attempt to claim UBI
      const claimTx = client.createTransaction({
        method: { name: 'claim-ubi', args: [] }
      });
      await claimTx.sign('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
      const receipt = await client.submitTransaction(claimTx);
      
      expect(receipt.success).toBe(false);
      expect(receipt.error).toContain('ERR_NOT_VERIFIED');
    });
    
    it('should prevent claims before cycle period has elapsed', async () => {
      // Register and verify participant
      const participant = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
      
      const registerTx = client.createTransaction({
        method: { name: 'register', args: [] }
      });
      await registerTx.sign(participant);
      await client.submitTransaction(registerTx);
      
      const verifyTx = client.createTransaction({
        method: { name: 'verify-participant', args: [participant] }
      });
      await verifyTx.sign('SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB');
      await client.submitTransaction(verifyTx);
      
      // Attempt to claim UBI immediately
      const claimTx = client.createTransaction({
        method: { name: 'claim-ubi', args: [] }
      });
      await claimTx.sign(participant);
      const receipt = await client.submitTransaction(claimTx);
      
      expect(receipt.success).toBe(false);
      expect(receipt.error).toContain('ERR_TOO_EARLY');
    });
  });
  
  describe('Pool Management Tests', () => {
    it('should allow deposits to the pool', async () => {
      const depositAmount = '1000000000';
      const tx = client.createTransaction({
        method: { name: 'deposit-to-pool', args: [depositAmount] }
      });
      await tx.sign('SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB');
      const receipt = await client.submitTransaction(tx);
      
      expect(receipt.success).toBe(true);
      
      // Verify pool balance
      const balanceTx = client.createTransaction({
        method: { name: 'get-pool-balance', args: [] }
      });
      const result = await client.submitTransaction(balanceTx);
      const balance = Result.unwrap(result);
      
      expect(balance).toBe(depositAmount);
    });
    
    it('should prevent claims when pool balance is insufficient', async () => {
      // Register and verify participant without funding pool
      const participant = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
      
      const registerTx = client.createTransaction({
        method: { name: 'register', args: [] }
      });
      await registerTx.sign(participant);
      await client.submitTransaction(registerTx);
      
      const verifyTx = client.createTransaction({
        method: { name: 'verify-participant', args: [participant] }
      });
      await verifyTx.sign('SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB');
      await client.submitTransaction(verifyTx);
      
      // Advance blockchain
      await provider.mineBlocks(2160);
      
      // Attempt to claim UBI
      const claimTx = client.createTransaction({
        method: { name: 'claim-ubi', args: [] }
      });
      await claimTx.sign(participant);
      const receipt = await client.submitTransaction(claimTx);
      
      expect(receipt.success).toBe(false);
      expect(receipt.error).toContain('ERR_INSUFFICIENT_POOL');
    });
  });
});
