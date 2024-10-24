;; UBI Distribution Contract
;; Implements decentralized Universal Basic Income distribution system

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant DISTRIBUTION_CYCLE u2160) ;; blocks (approximately 15 days)
(define-constant UBI_AMOUNT u100000000) ;; in micro-STX (0.1 STX)
(define-constant MINIMUM_POOL_BALANCE u1000000000) ;; 1 STX minimum required

;; Error codes
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_ALREADY_REGISTERED (err u101))
(define-constant ERR_NOT_REGISTERED (err u102))
(define-constant ERR_INSUFFICIENT_POOL (err u103))
(define-constant ERR_TOO_EARLY (err u104))
(define-constant ERR_NOT_VERIFIED (err u105))

;; Data variables
(define-data-var pool-balance uint u0)
(define-data-var last-distribution-block uint u0)
(define-data-var total-participants uint u0)

;; Data maps
(define-map participants
    principal
    {
        registered: bool,
        verified: bool,
        last-claim: uint,
        total-claimed: uint
    }
)

;; Public functions

;; Register new participant
(define-public (register)
    (let ((sender tx-sender))
        (asserts! (not (default-to false (get registered (map-get? participants sender)))) ERR_ALREADY_REGISTERED)
        (map-set participants
            sender
            {
                registered: true,
                verified: false,
                last-claim: u0,
                total-claimed: u0
            }
        )
        (var-set total-participants (+ (var-get total-participants) u1))
        (ok true)
    )
)

;; Verify a participant (only authorized verifiers)
(define-public (verify-participant (participant principal))
    (let ((sender tx-sender))
        (asserts! (is-authorized-verifier sender) ERR_UNAUTHORIZED)
        (asserts! (default-to false (get registered (map-get? participants participant))) ERR_NOT_REGISTERED)
        (map-set participants
            participant
            (merge (unwrap-panic (map-get? participants participant))
                  { verified: true })
        )
        (map-set verification-status
            participant
            {
                status: true,
                verifier: sender,
                timestamp: block-height
            }
        )
        (ok true)
    )
)

;; Claim UBI distribution
(define-public (claim-ubi)
    (let (
        (sender tx-sender)
        (participant-data (unwrap! (map-get? participants sender) ERR_NOT_REGISTERED))
        (current-block block-height)
    )
        (asserts! (get verified participant-data) ERR_NOT_VERIFIED)
        (asserts! (>= (var-get pool-balance) UBI_AMOUNT) ERR_INSUFFICIENT_POOL)
        (asserts! (can-claim sender current-block) ERR_TOO_EARLY)

        (try! (stx-transfer? UBI_AMOUNT (as-contract tx-sender) sender))
        (var-set pool-balance (- (var-get pool-balance) UBI_AMOUNT))

        (map-set participants
            sender
            (merge participant-data {
                last-claim: current-block,
                total-claimed: (+ (get total-claimed participant-data) UBI_AMOUNT)
            })
        )

        (ok true)
    )
)

;; Deposit funds to UBI pool
(define-public (deposit-to-pool (amount uint))
    (begin
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        (var-set pool-balance (+ (var-get pool-balance) amount))
        (ok true)
    )
)

;; Read-only functions
