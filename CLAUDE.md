# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Camels Hump Coders website - a static site for a FIRST® LEGO® League robotics team from Huntington, Vermont. The site is designed to be deployed on GitHub Pages.

## Git Version Control

**IMPORTANT**: This project uses Git for version control. You should commit changes regularly:

### When to Commit
- After completing a major feature or section
- After fixing significant bugs
- After adding new pages or major content updates
- When making substantial styling changes
- Before starting a new feature (to save current progress)

### Commit Process
1. Check status: `git status`
2. Add changes: `git add -A`
3. Commit with descriptive message:
```bash
git commit -m "Brief description of changes

- Detail 1
- Detail 2

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Commit Message Guidelines
- Use present tense ("Add feature" not "Added feature")
- First line should be concise (50 chars or less)
- Include bullet points for multiple changes
- Be specific about what changed

## Commands

### Local Development
- Test locally: `python3 -m http.server 8000` (then visit http://localhost:8000)
- Alternative: Open `index.html` directly in a web browser

### GitHub Pages Deployment

#### Automatic Deployment (Recommended)
This repository includes a GitHub Actions workflow that automatically deploys to GitHub Pages:

1. **One-time setup**: Go to Settings > Pages in the GitHub repository
2. Set Source to "GitHub Actions" 
3. Push changes to the main branch - deployment happens automatically!
4. Check the "Actions" tab to monitor deployment status
5. Site will be available at: https://[username].github.io/camels-hump-coders/

The workflow (`.github/workflows/deploy.yml`) will:
- Trigger on every push to main branch
- Build the site using Jekyll
- Deploy automatically to GitHub Pages
- Usually completes in 2-3 minutes

#### Manual Deployment (Alternative)
If you prefer manual deployment:
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