# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Camels Hump Coders website - a static site for a FIRST® LEGO® League robotics team from Huntington, Vermont. The site is designed to be deployed on GitHub Pages.

## Commands

### Local Development
- Test locally: `python3 -m http.server 8000` (then visit http://localhost:8000)
- Alternative: Open `index.html` directly in a web browser

### GitHub Pages Deployment
1. Push all changes to the main branch
2. Go to Settings > Pages in the GitHub repository
3. Set Source to "Deploy from a branch"
4. Select "main" branch and "/ (root)" folder
5. Save and wait for deployment (usually takes 2-5 minutes)
6. Site will be available at: https://[username].github.io/camels-hump-coders/

## Project Structure

```
camels-hump-coders/
├── index.html       # Homepage
├── about.html       # About Us page
├── coders.html      # Resources for coders
├── styles.css       # Global styles
└── CLAUDE.md        # This file
```

## Development Notes

### Design System
- **Colors**: 
  - Primary brown: rgb(115, 67, 50)
  - Secondary red: rgb(204, 67, 49)
  - Backgrounds: white, #f4f4f4, #f9f9f9
- **Typography**: 
  - Headers: 'Iceberg' font
  - Body: Arial, sans-serif
- **Layout**: Responsive design with mobile-first approach

### Adding New Pages
1. Create new HTML file following existing structure
2. Add navigation link in all HTML files' `<nav>` sections
3. Maintain consistent header and footer across pages

### External Links
Current placeholder links (#) should be replaced with actual URLs:
- Instagram profile
- Vermont Biz article
- WCAX coverage
- NBC article
- Presentation links (Google Slides or PDFs)
- Specific FLL resources and tools