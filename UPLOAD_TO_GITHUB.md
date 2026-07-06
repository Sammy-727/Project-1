# Upload Hyrlo to GitHub (2 minutes)

## Option A — One command (recommended)

1. Create empty repo on GitHub: https://github.com/new  
   - Name: **Hyrlo**  
   - Public  
   - Do NOT add README or .gitignore  

2. Run in terminal:

```bash
cd hyrlo
git remote add origin https://github.com/Sammy-727/Hyrlo.git
git push -u origin main
```

## Option B — GitHub CLI

```bash
cd hyrlo
chmod +x publish.sh
./publish.sh Hyrlo Sammy-727
```

## Option C — From zip (no git history)

```bash
unzip hyrlo.zip
cd hyrlo
git init && git branch -m main
git add -A && git commit -m "Initial commit: Hyrlo"
gh repo create Sammy-727/Hyrlo --public --source=. --push
```

## After upload — Deploy free on Render

1. Go to https://render.com/deploy  
2. Connect **Sammy-727/Hyrlo**  
3. Deploy (uses `render.yaml` automatically)  
4. Live URL in ~2 minutes

## Demo logins

| Role | Phone |
|------|-------|
| Worker | 9876543210 |
| Employer | 9988776655 |
