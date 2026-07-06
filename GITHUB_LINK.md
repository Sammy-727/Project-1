# Hyrlo is now on GitHub

Your code is live on a **separate branch** (does not affect your hotel app on `main`):

**https://github.com/Sammy-727/Project-1/tree/hyrlo**

## Download zip from GitHub

1. Open: https://github.com/Sammy-727/Project-1/tree/hyrlo
2. Click green **Code** button
3. Click **Download ZIP**

## Move to its own repo later (optional)

### Method 1 — GitHub website (easiest)

1. Go to https://github.com/new
2. Name: `Hyrlo`, Public, **no** README
3. On your computer run:

```bash
git clone -b hyrlo https://github.com/Sammy-727/Project-1.git hyrlo-temp
cd hyrlo-temp
git remote remove origin
git remote add origin https://github.com/Sammy-727/Hyrlo.git
git push -u origin hyrlo:main
```

### Method 2 — GitHub CLI

```bash
gh repo create Sammy-727/Hyrlo --public
git clone -b hyrlo https://github.com/Sammy-727/Project-1.git
cd Project-1
git remote set-url origin https://github.com/Sammy-727/Hyrlo.git
git push -u origin hyrlo:main
```

## Run locally

```bash
npm install
pip install -r backend/requirements.txt
npm run build && npm run start
```

Open http://localhost:5000

## Demo logins

| Role | Phone |
|------|-------|
| Worker | 9876543210 |
| Employer | 9988776655 |
