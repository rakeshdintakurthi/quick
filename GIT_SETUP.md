# Git Configuration and GitHub Setup Guide

## 1. Configure Git (First Time Setup)

```bash
# Set your name
git config --global user.name "Your Name"

# Set your email (use the email associated with your GitHub account)
git config --global user.email "your.email@example.com"

# Verify your configuration
git config --global user.name
git config --global user.email

# View all git config
git config --global --list
```

## 2. Initialize Git Repository (if not already initialized)

```bash
# Navigate to your project directory
cd c:\Users\Rakesh\ai-code-editor

# Initialize git (if not already done)
git init

# Check status
git status
```

## 3. Create .gitignore (if not exists)

Make sure you have a `.gitignore` file with:
```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
.vscode/
```

## 4. Add Files and Make Initial Commit

```bash
# Add all files
git add .

# Or add specific files
git add src/
git add package.json

# Commit changes
git commit -m "Initial commit: AI Code Editor with Quick Assist feature"

# Check commit history
git log --oneline
```

## 5. Connect to GitHub Repository

### Option A: Create New Repository on GitHub First

1. Go to GitHub.com
2. Click "+" → "New repository"
3. Name it (e.g., "ai-code-editor")
4. Don't initialize with README
5. Copy the repository URL

Then run:

```bash
# Add remote origin (replace with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/ai-code-editor.git

# Verify remote
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

### Option B: If Repository Already Exists

```bash
# Add remote (if not already added)
git remote add origin https://github.com/YOUR_USERNAME/ai-code-editor.git

# Or update existing remote
git remote set-url origin https://github.com/YOUR_USERNAME/ai-code-editor.git

# Push to GitHub
git push -u origin main
```

## 6. Authentication Methods

### Option A: Personal Access Token (Recommended)

1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Select scopes: `repo` (all)
4. Copy the token

When pushing, use the token as password:
```bash
git push origin main
# Username: your_github_username
# Password: paste_your_token_here
```

### Option B: SSH Key (More Secure)

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Start SSH agent
eval "$(ssh-agent -s)"

# Add SSH key
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard (Windows)
clip < ~/.ssh/id_ed25519.pub

# Add key to GitHub: Settings → SSH and GPG keys → New SSH key
# Paste the key and save

# Test connection
ssh -T git@github.com

# Change remote to SSH
git remote set-url origin git@github.com:YOUR_USERNAME/ai-code-editor.git
```

## 7. Daily Workflow Commands

```bash
# Check status
git status

# Add changes
git add .

# Commit with message
git commit -m "Description of changes"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main

# View commit history
git log --oneline --graph
```

## 8. Common Commands

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard changes to a file
git restore filename.js

# Discard all uncommitted changes
git restore .

# View differences
git diff

# Create and switch to new branch
git checkout -b feature-name

# Switch branches
git checkout main

# Merge branch
git checkout main
git merge feature-name
```

## 9. Push Current Changes

If you already have commits and just want to push:

```bash
# Add all changes
git add .

# Commit
git commit -m "Add Quick Assist feature with remote collaboration"

# Push
git push origin main
```

## Troubleshooting

### If push is rejected:
```bash
# Pull first, then push
git pull origin main --rebase
git push origin main
```

### To check remote URL:
```bash
git remote -v
```

### To remove remote and re-add:
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/ai-code-editor.git
```

