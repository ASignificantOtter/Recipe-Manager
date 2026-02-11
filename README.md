# Recipe Repository Manager

A modern, multi-user recipe management application built with Next.js, React, TypeScript, and PostgreSQL. Manage your recipes, create meal plans, and generate shopping lists effortlessly.

## Features

- **User Authentication**: Secure email/password authentication with NextAuth.js
- **Recipe Management**: Create, edit, view, and delete recipes with detailed metadata
  - Recipe name, instructions, prep/cook time, servings
  - Ingredient quantities and units
  - Dietary tags (vegetarian, vegan, gluten-free, etc.)
  - Notes and preparation tips
- **File Upload**: Upload recipes from .docx, .pdf, or .jpg files (extract recipe data)
- **Meal Planning**: Create weekly meal plans and assign recipes to specific days
- **Shopping List Generation**: Automatically aggregate ingredients from all recipes in a meal plan with smart quantity combining
- **Multi-User Support**: Each user has their own isolated recipes and meal plans

## Tech Stack

- **Frontend**: React, Next.js 15+, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js with credentials provider

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

Open [http://localhost:3000](http://localhost:3000) in your browser. You'll be redirected to `/recipes` and then to sign-in.

## Usage

### Creating a User Account

1. Go to `/auth/signup` to create a new account
2. Enter your email, name, and password (minimum 8 characters)
3. After signup, you'll be automatically signed in

### Managing Recipes

1. Go to "Your Recipes" section
2. Click "Create Recipe" to manually add a new recipe
3. Or click "Upload Recipe" to upload from files (coming soon)
4. Fill in recipe details:
   - Name and instructions
   - Ingredients with quantities
   - Preparation and cooking times
   - Dietary tags
5. View, edit, or delete recipes as needed

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
│   │   │   ├── upload/route.ts               # File upload endpoint
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
│   │   └── [id]/page.tsx                     # View recipe details
│   ├── meal-plans/
│   │   ├── page.tsx                          # List meal plans
│   │   ├── new/page.tsx                      # Create meal plan form
│   │   └── [id]/
│   │       ├── page.tsx                      # Manage meal plan
│   │       └── shopping-list/page.tsx        # View shopping list
│   ├── layout.tsx                            # Root layout
│   └── page.tsx                              # Redirect to /recipes
├── lib/
│   ├── auth.ts                               # NextAuth configuration
│   └── prisma.ts                             # Prisma client singleton
├── types/
│   └── auth.d.ts                             # TypeScript definitions for auth
└── middleware.ts                             # Route protection middleware
prisma/
├── schema.prisma                             # Database schema
└── migrations/                               # Database migrations
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
- `quantity`: Amount needed
- `unit`: Unit of measurement
- `notes`: Optional notes

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

### Run Tests (To be implemented)

```bash
npm test
```

## Security Considerations

- Passwords are hashed using bcryptjs (10 salt rounds)
- Session tokens are securely managed by NextAuth.js
- User data is isolated per account (enforced at API level)
- SQL injection is prevented via Prisma's parameterized queries
- CSRF protection is built-in with NextAuth.js

## Future Enhancements

- [ ] Advanced file parsing for recipe extraction (.docx, .pdf, .jpg with OCR)
- [ ] Shared recipes and collaborative meal planning
- [ ] Recipe ratings, reviews, and search
- [ ] Customizable dietary preferences
- [ ] Recipe scaling (adjust servings and ingredient quantities)
- [ ] Nutritional information integration
- [ ] Mobile app
- [ ] Cloud hosting (Vercel, Railway, Supabase)
- [ ] Email reminders for meal plan days
- [ ] Integration with grocery delivery services

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
