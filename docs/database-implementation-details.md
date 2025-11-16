# Database Implementation Details

## Technical Choices

Based on the requirements and decisions made:

1. **ORM**: Sequelize v6 (stable) with sequelize-typescript decorators
2. **Database**: PostgreSQL v15.x
3. **Migration Strategy**: Manual migrations using sequelize-cli
4. **Environments**: Development, Test, and Production
5. **Column Naming**: camelCase
6. **Primary Keys**: Integer with auto-increment
7. **Enums**: String fields with TypeScript validation

## Sequelize-TypeScript Benefits

Using sequelize-typescript decorators provides:

- Cleaner, more readable model definitions
- Better TypeScript integration and type inference
- Reduced boilerplate code
- Decorator-based validation
- Automatic model discovery

## Model Example with Decorators

```typescript
import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  HasMany,
  Unique,
  Default,
  AllowNull,
  Validate
} from 'sequelize-typescript';

@Table({
  tableName: 'users',
  timestamps: true,
})
export class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Unique
  @AllowNull(false)
  @Column(DataType.BIGINT)
  telegramId!: number;

  @Column(DataType.STRING(255))
  username?: string;

  @Column(DataType.STRING(255))
  firstName?: string;

  @Column(DataType.STRING(255))
  lastName?: string;

  @Default('en')
  @Column(DataType.STRING(10))
  languageCode!: string;

  @Default(10)
  @Column(DataType.INTEGER)
  monthlyQuota!: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isPremium!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @HasMany(() => Book)
  books!: Book[];
}
```

## Dependencies to Install

### Production Dependencies
- sequelize: ^6.35.0
- sequelize-typescript: ^2.1.6
- pg: ^8.11.0
- pg-hstore: ^2.3.4
- reflect-metadata: ^0.2.0

### Development Dependencies
- @types/node: ^20.0.0
- @types/validator: ^13.11.0
- sequelize-cli: ^6.6.0
- typescript: ^5.0.0
- ts-node: ^10.9.0
- dotenv: ^16.0.0

## Configuration Structure

```
src/
├── database/
│   ├── config/
│   │   └── database.ts      # Database configuration
│   ├── models/
│   │   ├── index.ts        # Model initialization
│   │   ├── User.ts         # User model with decorators
│   │   ├── Book.ts         # Book model with decorators
│   │   ├── ProcessingJob.ts # ProcessingJob model
│   │   └── UserQuota.ts    # UserQuota model
│   ├── migrations/         # Sequelize migrations
│   ├── types/
│   │   └── index.ts       # TypeScript types and enums
│   └── connection.ts      # Simplified connection module
```

## Environment Variables

```env
# Development
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bookomol_dev
DB_USER=bookomol
DB_PASSWORD=your_password

# Test
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=bookomol_test
TEST_DB_USER=bookomol
TEST_DB_PASSWORD=your_password

# Production
PROD_DB_HOST=your-rds-endpoint
PROD_DB_PORT=5432
PROD_DB_NAME=bookomol_prod
PROD_DB_USER=bookomol
PROD_DB_PASSWORD=your_secure_password