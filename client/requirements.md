## Packages
framer-motion | Page animations and smooth transitions
recharts | Financial data visualization and charts
lucide-react | Icons for sidebar and UI elements
clsx | Utility for constructing className strings
tailwind-merge | Utility for merging tailwind classes safely

## Notes
Tailwind config assumptions:
- fontFamily needs extension for 'display' and 'sans'
- Extend colors for 'sidebar' specific tokens if not fully defined
API Assumptions:
- Replit Auth is active. Unauthenticated requests to /api/* return 401.
- Numeric fields from PostgreSQL (amounts) may arrive as strings and need parsing.
