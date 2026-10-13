# Database ERD and EERD

These diagrams are based on the schema defined in `scripts/migrate.mjs` and the payment API behavior in the `app/api/payments` routes.

## ERD

```mermaid
erDiagram
    USER {
        VARCHAR(36) id PK
        VARCHAR(255) name
        VARCHAR(255) email UK
        BOOLEAN emailVerified
        VARCHAR(255) image
        DATETIME createdAt
        DATETIME updatedAt
        VARCHAR(255) username UK
        VARCHAR(255) displayUsername
    }

    SESSION {
        VARCHAR(36) id PK
        DATETIME expiresAt
        VARCHAR(255) token UK
        DATETIME createdAt
        DATETIME updatedAt
        VARCHAR(255) ipAddress
        TEXT userAgent
        VARCHAR(36) userId FK
    }

    ACCOUNT {
        VARCHAR(36) id PK
        VARCHAR(255) accountId
        VARCHAR(255) providerId
        VARCHAR(36) userId FK
        TEXT accessToken
        TEXT refreshToken
        TEXT idToken
        DATETIME accessTokenExpiresAt
        DATETIME refreshTokenExpiresAt
        VARCHAR(255) scope
        TEXT password
        DATETIME createdAt
        DATETIME updatedAt
    }

    VERIFICATION {
        VARCHAR(36) id PK
        VARCHAR(255) identifier
        VARCHAR(255) value
        DATETIME expiresAt
        DATETIME createdAt
        DATETIME updatedAt
    }

    PAYMENTS {
        INT id PK
        DATE or_date
        VARCHAR(50) or_no_start
        VARCHAR(50) or_no_end
        INT pieces
        DECIMAL(12_2) rcd_amount
        VARCHAR(255) collector
        VARCHAR(36) created_by_user_id FK
        VARCHAR(36) updated_by_user_id FK
        DATETIME created_at
        DATETIME updated_at
    }

    USER ||--o{ SESSION : has
    USER ||--o{ ACCOUNT : has
    USER o|--o{ PAYMENTS : creates
    USER o|--o{ PAYMENTS : updates
```

## EERD

This enhanced version emphasizes participation and business roles used by the app:

- A `USER` can own many `SESSION` records.
- A `USER` can own many `ACCOUNT` records.
- A `PAYMENTS` record must have payment details, but its audit links are optional because `created_by_user_id` and `updated_by_user_id` are nullable and use `ON DELETE SET NULL`.
- `VERIFICATION` is currently standalone in the schema.

```mermaid
erDiagram
    USER {
        VARCHAR(36) id PK
        VARCHAR(255) email UK
        VARCHAR(255) username UK
        VARCHAR(255) name
        BOOLEAN emailVerified
    }

    SESSION {
        VARCHAR(36) id PK
        VARCHAR(36) userId FK
        VARCHAR(255) token UK
        DATETIME expiresAt
    }

    ACCOUNT {
        VARCHAR(36) id PK
        VARCHAR(36) userId FK
        VARCHAR(255) providerId
        VARCHAR(255) accountId
    }

    VERIFICATION {
        VARCHAR(36) id PK
        VARCHAR(255) identifier
        VARCHAR(255) value
        DATETIME expiresAt
    }

    PAYMENT {
        INT id PK
        DATE or_date
        VARCHAR(50) or_no_start
        VARCHAR(50) or_no_end
        INT pieces
        DECIMAL(12_2) rcd_amount
        VARCHAR(255) collector
        VARCHAR(36) created_by_user_id FK_NULL
        VARCHAR(36) updated_by_user_id FK_NULL
    }

    USER ||--o{ SESSION : authenticates
    USER ||--o{ ACCOUNT : linked_auth
    USER o|--o{ PAYMENT : created_by
    USER o|--o{ PAYMENT : updated_by
```

## Notes

- `SESSION.userId` and `ACCOUNT.userId` are mandatory foreign keys with `ON DELETE CASCADE`.
- `PAYMENTS.created_by_user_id` and `PAYMENTS.updated_by_user_id` are optional foreign keys with `ON DELETE SET NULL`.
- The app prevents overlapping O.R. ranges at the API layer, but that rule is not enforced by a database constraint.
