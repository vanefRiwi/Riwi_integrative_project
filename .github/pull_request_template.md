## 🚀 Lumora - Pull Request Checklist

### 1. General information
- **Azure DevOps Task ID:** #
- **Change Type:** 
  - [ ] ✨ Feature (New functionality)
  - [ ] 🐛 Bugfix (Bug resolution)
  - [ ] 🛠️ Refactor (Improving existing code structure)
  - [ ] 🤖 AI Module (AI Feature / Research Implementation)
  - [ ] 📦 DevOps / Infrastructure

### 2. Description of changes
<!-- Briefly describe what this code does and its impact on the project -->


### 3. Local testing protocol
#### For backend & AI developers:
- [ ] Docker container spins up with zero errors (`docker-compose up -d`).
- [ ] Local server boots up cleanly in watch mode (`npm run dev`).
- [ ] Endpoints successfully tested and validated via Postman.
- [ ] Required environment variables have been documented in `.env.example`.

#### For frontend developers:
- [ ] UI Components accurately match the original Figma design specs.
- [ ] State management and API service requests are fully optimized (no infinite loops).
- [ ] Code is verified and completely free of browser console errors.

### 4. Technical acceptance criteria (senior review)
- [ ] **Architecture:** Code strictly follows the established layered pattern (Routes -> Controllers -> Services -> Repositories).
- [ ] **Security:** No hardcoded credentials or secrets; JWT tokens validated, and passwords properly hashed.
- [ ] **Code Cleanliness:** Removed all temporary debugging `console.log` statements and dead/commented code.
- [ ] **QA Ready:** Changes are stable and ready for the QA engineer to perform cross-flow verification.