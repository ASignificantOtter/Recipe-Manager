# Recipe Repository Manager

A modern, multi-user recipe management application built with Next.js, React, TypeScript, and PostgreSQL. Manage your recipes, create meal plans, and generate shopping lists effortlessly.

## Features

- **User Authentication**: Secure email/password authentication with NextAuth.js
- **Recipe Management**: Create, edit, view, and delete recipes with detailed metadata
  - Recipe name, instructions, prep/cook time, servings
  - Ingredient quantities and units with canonical conversions
  - Dietary tags (vegetarian, vegan, gluten-free, etc.)
  - Notes and preparation tips
- **Smart File Upload & Parsing**: Upload recipes from multiple file formats with intelligent extraction
  - Supported formats: .docx, .pdf, .doc, .jpg, .png (up to 10MB)
  - Automatic recipe structure detection (title, ingredients, instructions)
  - Built-in OCR with Tesseract.js for image and PDF text recognition
  - Image preprocessing (resizing, grayscale normalization) for better OCR accuracy
- **Ingredient Intelligence**
  - Smart ingredient parsing: extracts quantity, unit, name, and notes from unstructured text
  - Fraction support: handles mixed fractions (e.g., "1 1/2 cups")
  - Unit normalization: standardizes units to metric (ml, grams) with alias support
  - Density-based conversions: automatically converts volume to mass for known ingredients (sugar, flour, butter, milk, olive oil, etc.)
  - Per-ingredient canonical/original toggle: users can switch between original and normalized quantities
  - Bulk normalization: normalize all ingredients at once with one click
- **Meal Planning**: Create weekly meal plans and assign recipes to specific days
- **Shopping List Generation**: Automatically aggregate ingredients from all recipes in a meal plan with smart quantity combining
- **Multi-User Support**: Each user has their own isolated recipes and meal plans

## Tech Stack

- **Frontend**: React, Next.js 16.1.6, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (with Turbopack), Node.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5.0.0-beta.30 with credentials provider
- **File Processing**:
  - **DOCX**: Mammoth.js
  - **PDF**: pdf-parse
  - **DOC**: UTF-8 fallback parsing
  - **Images (OCR)**: Tesseract.js with singleton worker pooling
  - **Image Preprocessing**: Sharp.js (resizing, grayscale, normalization)
- **Testing**: Vitest with vi.mock() for FFI dependencies
- **Route Protection**: Proxy-based auth wrapper (replaces deprecated middleware)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+ (local installation or Docker)
- Git

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd recipe-repository
npm install
```

### 2. Set Up PostgreSQL Database

You can use Docker Compose for a quick setup:

```bash
docker-compose up -d
```

This will start a PostgreSQL container with:
- Username: `postgres`
- Password: `postgres`
- Database: `recipe_repository`
- Port: `5432`

Or, if you have PostgreSQL installed locally:
```bash
createdb recipe_repository
```

### 3. Configure Environment Variables

Update `.env` file with your database connection details:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/recipe_repository"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 4. Set Up Database Schema

Run Prisma migrations:

```bash
npx prisma migrate dev --name init
```

This will create all necessary tables in your database.

### 5. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or fall back to `http://localhost:3001` if port 3000 is in use). You'll be redirected to `/recipes` and then to sign-in via the authentication proxy.

## Usage

### Creating a User Account

1. Go to `/auth/signup` to create a new account
2. Enter your email, name, and password (minimum 8 characters)
3. After signup, you'll be automatically signed in

### Managing Recipes

1. Go to "Your Recipes" section
2. Click "Create Recipe" to manually add a new recipe, or "Upload Recipe" to extract from files
3. **Uploading from files**:
   - Select a file (.docx, .pdf, .doc, .jpg, or .png)
   - The system automatically extracts recipe title, ingredients, and instructions
   - Preview the extracted data before applying
   - If uploading an image or PDF without embedded text, OCR will extract the text
4. **Ingredient normalization**:
   - After uploading or manually entering ingredients, use "Normalize All Units" to standardize measurements
   - Toggle individual ingredients between original and canonical (normalized) quantities
   - Click per-ingredient "Normalize" buttons for fine-grained control
   - Use "Revert normalization" to restore original values
5. Fill in recipe details and save
6. View, edit, or delete recipes as needed

### Creating a Meal Plan

1. Navigate to "Meal Plans"
2. Click "Create Meal Plan"
3. Enter meal plan name, description, and date range
4. Once created, assign recipes to specific days of the week
5. View assigned recipes and make adjustments

### Generating Shopping List

1. From a meal plan, click "Shopping List"
2. View all ingredients aggregated from assigned recipes
3. Check off items as you shop
4. Export as text file for printing or sharing

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts       # Authentication endpoint
│   │   ├── recipes/                           # Recipe API routes
│   │   │   ├── route.ts                      # GET/POST recipes
│   │   │   ├── [id]/route.ts                 # GET/PUT/DELETE specific recipe
│   │   │   ├── upload/route.ts               # File upload & parsing endpoint
│   │   │   └── upload/route.ts               # Handles .docx, .pdf, .doc, .jpg, .png
│   │   └── meal-plans/                        # Meal plan API routes
│   │       ├── route.ts                      # GET/POST meal plans
│   │       └── [id]/                         # Meal plan routes
│   │           ├── route.ts                  # GET/PUT/DELETE/PATCH meal plan
│   │           └── shopping-list/route.ts    # Generate shopping list
│   ├── auth/
│   │   ├── signin/page.tsx                   # Sign-in page
│   │   └── signup/page.tsx                   # Sign-up page
│   ├── recipes/
│   │   ├── page.tsx                          # List recipes
│   │   ├── new/page.tsx                      # Create recipe form
│   │   ├── [id]/page.tsx                     # View recipe details
│   │   ├── [id]/edit/page.tsx                # Edit recipe form
│   │   ├── upload/page.tsx                   # File upload & preview UI
│   │   └── upload/page.tsx                   # Extract and normalize ingredients
│   ├── meal-plans/
│   │   ├── page.tsx                          # List meal plans
│   │   ├── new/page.tsx                      # Create meal plan form
│   │   └── [id]/
│   │       ├── page.tsx                      # Manage meal plan
│   │       └── shopping-list/page.tsx        # View shopping list
│   ├── layout.tsx                            # Root layout
│   ├── globals.css                           # Global styles
│   └── page.tsx                              # Redirect to /recipes
├── lib/
│   ├── auth.ts                               # NextAuth configuration
│   ├── prisma.ts                             # Prisma client singleton
│   └── uploader/
│   │   ├── parser.ts                         # Recipe text parsing heuristics
│   │   ├── ingredientParser.ts               # Ingredient string parsing & normalization
│   │   └── ocr.ts                            # OCR with singleton worker pooling
│   └── types/
│       └── auth.d.ts                         # TypeScript definitions for auth
├── proxy.ts                                  # Route protection via NextAuth proxy
├── middleware.ts                             # (Deprecated - use proxy.ts)
├── components/
│   └── Navigation.tsx                        # Shared navigation component
├── generated/
│   └── prisma/                               # Generated Prisma types
└── types/
    └── auth.d.ts                             # TypeScript definitions
prisma/
├── schema.prisma                             # Database schema
└── migrations/                               # Database migrations
tests/
├── parser.spec.ts                            # Recipe parser unit tests
├── ingredient.spec.ts                        # Ingredient parser unit tests
├── ingredientNormalization.spec.ts           # Unit normalization tests
├── ocr.spec.ts                               # OCR functionality tests
└── upload.integration.spec.ts                # Integration tests
```

## Database Schema

### User
- `id`: Unique identifier
- `email`: Unique email address
- `name`: User's name
- `password`: Hashed password

### Recipe
- `id`: Unique identifier
- `userId`: Reference to user
- `name`: Recipe name
- `instructions`: Step-by-step instructions
- `prepTime`: Preparation time in minutes
- `cookTime`: Cooking time in minutes
- `servings`: Number of servings
- `notes`: Additional notes
- `dietaryTags`: Array of dietary tags (JSON)
- `ingredients`: Array of ingredient objects
- Relationships: `RecipeIngredient`, `MealPlanRecipe`

### RecipeIngredient
- `id`: Unique identifier
- `recipeId`: Reference to recipe
- `name`: Ingredient name
- `quantity`: Amount needed (original value)
- `unit`: Unit of measurement (original value)
- `canonicalQuantity`: Normalized quantity (metric-based)
- `canonicalUnit`: Normalized unit (ml, grams, etc.)
- `notes`: Optional notes (e.g., "minced", "diced")

### MealPlan
- `id`: Unique identifier
- `userId`: Reference to user
- `name`: Meal plan name
- `description`: Optional description
- `startDate`: Plan start date
- `endDate`: Plan end date
- Relationships: `MealPlanDay`

### MealPlanDay
- `id`: Unique identifier
- `mealPlanId`: Reference to meal plan
- `dayOfWeek`: Day name (Monday-Sunday)
- Relationships: `MealPlanRecipe`

### MealPlanRecipe
- `id`: Unique identifier
- `mealPlanDayId`: Reference to meal plan day
- `recipeId`: Reference to recipe
- `serveCount`: Number of servings to prepare
- `notes`: Optional notes

## Development

### Run Tests

Comprehensive unit and integration tests for parsing, ingredient normalization, and OCR:

```bash
npm test                    # Run all tests in watch mode
npm test -- --run          # Run tests once (CI mode)
```

Test coverage includes:
- Recipe text parsing heuristics
- Ingredient string parsing (quantities, units, fractions, notes)
- Unit normalization and alias resolution
- Density-based volume-to-mass conversions
- OCR preprocessing and recognition
- Upload endpoint integration

### View Database

To inspect or modify the database directly:

```bash
npx prisma studio
```

This opens a UI at [http://localhost:5555](http://localhost:5555)

### Build for Production

```bash
npm run build
npm run start
```

## Security Considerations

- Passwords are hashed using bcryptjs (10 salt rounds)
- Session tokens are securely managed by NextAuth.js
- User data is isolated per account (enforced at API level)
- SQL injection is prevented via Prisma's parameterized queries
- CSRF protection is built-in with NextAuth.js

## Future Enhancements

Completed Features:
- ✅ Advanced file parsing for recipe extraction (.docx, .pdf, .jpg with OCR)
- ✅ Ingredient parsing and normalization with unit standardization
- ✅ Density-based volume-to-mass conversions
- ✅ Per-ingredient canonical/original toggle UI

Planned Features:
- [ ] Expand ingredient density table (onion, carrot, baking powder, yeast, etc.)
- [ ] Recipe scaling (dynamically adjust servings and ingredient quantities)
- [ ] Nutritional information integration (calories, macros, micros per serving)
- [ ] Advanced recipe search and filtering (by ingredients, dietary tags, time)
- [ ] Shared recipes and collaborative meal planning
- [ ] Recipe ratings, reviews, and community library
- [ ] Customizable dietary preference profiles
- [ ] Shopping list export formats (PDF, CSV, email)
- [ ] Mobile app (React Native)
- [ ] Cloud hosting (Vercel, Railway, Supabase)
- [ ] Email reminders for meal plan days
- [ ] Integration with grocery delivery services (Instacart, Amazon Fresh)
- [ ] Recipe version history and edit tracking
- [ ] Bulk ingredient price comparison

## Ingredient Parsing & Normalization

The upload feature includes intelligent ingredient parsing and optional metric standardization:

### Parsing Capabilities

- **Quantity Detection**: Extracts numeric values including fractions (1/2, 1 1/2)
- **Unit Recognition**: Identifies standard cooking units (cups, tablespoons, grams, ml, etc.)
- **Note Extraction**: Separates ingredient notes (e.g., "diced", "minced", "to taste")

### Normalization Features

- **Unit Aliases**: Standardizes variations (tbsp → tablespoon → 15ml, cup → 240ml)
- **Metric Conversion**: Converts imperial to metric (cups → ml, tablespoons → ml)
- **Density-Based Conversion**: For known ingredients, converts volume to mass:
  - Sugar: 0.85 g/ml (1 cup = 204g)
  - Flour: 0.53 g/ml (1 cup = 127g)
  - Butter: 0.96 g/ml (1 cup = 230g)
  - Milk: 1.03 g/ml (1 cup = 247g)
  - Water: 1.0 g/ml (1 cup = 240g)
  - Tomatoes: 1.05 g/ml (1 cup = 252g)
  - Olive Oil: 0.91 g/ml (1 tbsp = 13.65g)

### User Controls

- **Per-Ingredient Toggle**: Switch between original and normalized quantities for individual ingredients
- **Bulk Normalize**: Apply normalization to all ingredients at once
- **Revert**: Restore original values if needed
- **Flexible Display**: UI shows unit labels ("Qty" vs "Canonical Qty") based on currently displayed value

## Troubleshooting

### Database connection errors
- Ensure PostgreSQL is running
- Verify DATABASE_URL is correct
- Check firewall settings

### "Table not found" errors
- Run `npx prisma migrate dev` to apply pending migrations
- Or reset the database: `npx prisma migrate reset`

### NextAuth session issues
- Regenerate NEXTAUTH_SECRET: `openssl rand -base64 32`
- Clear browser cookies and try again

## License

MIT

## Support

For issues or questions, please create a GitHub issue or reach out to the development team.
