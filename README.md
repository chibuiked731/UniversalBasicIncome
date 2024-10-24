# Universal Basic Income (UBI) Distribution Smart Contract

A decentralized smart contract implementation for managing and distributing Universal Basic Income (UBI) on the Stacks blockchain. This contract enables automated, periodic distribution of STX tokens to verified participants while maintaining transparency and security.

## Features

- **Participant Registration**: Users can register to participate in the UBI program
- **Verification System**: Authorized verifiers can validate participant eligibility
- **Periodic Distribution**: Automated UBI distribution every ~15 days (2160 blocks)
- **Pool Management**: Public pool funding mechanism with minimum balance requirements
- **Security Controls**: Built-in authorization checks and safety mechanisms

## Technical Details

### Constants

- **Distribution Cycle**: 2160 blocks (approximately 15 days)
- **UBI Amount**: 0.1 STX per distribution
- **Minimum Pool Balance**: 1 STX required in the pool

### Error Codes

| Code | Description |
|------|-------------|
| 100 | Unauthorized access |
| 101 | User already registered |
| 102 | User not registered |
| 103 | Insufficient pool balance |
| 104 | Too early to claim |
| 105 | User not verified |

## Public Functions

### `register()`
Allows a user to register as a UBI participant.
```clarity
(define-public (register))
```

### `verify-participant(principal)`
Enables authorized verifiers to validate participants.
```clarity
(define-public (verify-participant (participant principal)))
```

### `claim-ubi()`
Allows verified participants to claim their UBI distribution.
```clarity
(define-public (claim-ubi))
```

### `deposit-to-pool(amount)`
Enables anyone to contribute STX to the UBI pool.
```clarity
(define-public (deposit-to-pool (amount uint)))
```

## Read-Only Functions

### `can-claim(principal, uint)`
Checks if a user is eligible to claim UBI.
```clarity
(define-read-only (can-claim (user principal) (current-block uint)))
```

### `get-participant-info(principal)`
Retrieves participant information.
```clarity
(define-read-only (get-participant-info (user principal)))
```

### `get-pool-balance()`
Returns the current pool balance.
```clarity
(define-read-only (get-pool-balance))
```

### `get-total-participants()`
Returns the total number of registered participants.
```clarity
(define-read-only (get-total-participants))
```

## Usage

1. **Registration**:
    - Call `register()` to join the UBI program
    - Wait for verification from an authorized verifier

2. **Verification**:
    - Authorized verifiers call `verify-participant(principal)` to validate users
    - Only contract owner can verify participants by default

3. **Claiming UBI**:
    - Verified participants can call `claim-ubi()` every 2160 blocks
    - Sufficient pool balance required for successful claims

4. **Contributing**:
    - Anyone can contribute to the pool using `deposit-to-pool(amount)`
    - Minimum pool balance of 1 STX required for distributions

## Security Considerations

- Only verified participants can claim UBI
- Built-in timelock between claims (2160 blocks)
- Authorization checks for administrative functions
- Pool balance requirements prevent overdraw
- Immutable contract owner and distribution parameters

## Development

This contract is written in Clarity, the smart contract language for the Stacks blockchain. To deploy and interact with this contract:

1. Install the Stacks CLI
2. Deploy using your preferred Stacks wallet
3. Interact via contract calls or integration with your dApp

## Testing

It's recommended to test this contract thoroughly on testnet before mainnet deployment. Key test scenarios should include:

- Registration flow
- Verification process
- Claim timing restrictions
- Pool balance management
- Error handling

## License

This smart contract is open source and available under [INSERT LICENSE].

## Contributing

Contributions are welcome! Please submit pull requests or open issues for any improvements.
