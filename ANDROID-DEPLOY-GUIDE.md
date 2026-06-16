# Glyphix — Easiest Android Path

This guide is for a **complete beginner using an Android phone**.

Goal:
- get Glyphix online as a website
- open it from your phone
- optionally add Gemini and Grok later

---

## First: what you are building
Glyphix is a **website app**.

That means the easiest way to use it on Android is:
1. put the code on **GitHub**
2. connect GitHub to **Vercel**
3. Vercel gives you a website link
4. open the link on your Android phone

You do **not** need to run coding commands on your Android if you use this path.

---

## What you need
You need only 3 accounts:
1. **GitHub account**
2. **Vercel account**
3. later, optional:
   - **Google AI / Gemini API key**
   - **xAI / Grok API key**

If you do not add API keys yet, Glyphix still opens and works in demo/local mode.

---

## Very simple overview
### Without API keys
Glyphix will:
- open normally
- let you import files
- let you view ZIP / EPUB contents
- let you edit files
- let you preview HTML
- let you export ZIPs

### With API keys
Glyphix will also:
- chat using Gemini
- chat using Grok
- compare both
- do draft + review mode

---

# PART 1 — Put Glyphix on GitHub

## Step 1: create a GitHub account
Go to:
- https://github.com

Create an account if you do not have one.

---

## Step 2: create a new repository
After login:
1. tap the **+** button
2. choose **New repository**
3. name it:
   - `glyphix`
4. keep it **Private** if you want
5. tap **Create repository**

---

## Step 3: upload the project files
You need the contents of the folder:
- `green-coder-app`

If someone helps you from a laptop, ask them to upload the folder to your GitHub repository.

If you are doing it yourself from Android, the easiest beginner method is:
1. download the project files as a ZIP
2. extract the ZIP on your phone
3. in GitHub repo page, tap **Add file**
4. tap **Upload files**
5. upload the project contents

Important:
- upload the files **inside** `green-coder-app`
- not the parent folder around it

When done, your repo should show files like:
- `package.json`
- `app/`
- `components/`
- `lib/`
- `README.md`

---

# PART 2 — Deploy on Vercel

## Step 4: create a Vercel account
Go to:
- https://vercel.com

Sign up using GitHub.

---

## Step 5: import the GitHub repository
After login:
1. tap **Add New...**
2. tap **Project**
3. choose your GitHub repo: `glyphix`
4. tap **Import**

Vercel usually detects Next.js automatically.

---

## Step 6: deploy without touching anything
On the deploy screen:
- leave the defaults as they are
- tap **Deploy**

Wait a little.

When done, Vercel gives you a website link like:
- `https://glyphix-something.vercel.app`

That is your live app.

Open it on your Android phone.

---

# PART 3 — Add AI later

## Step 7: add Gemini and Grok keys later if you want
In Vercel:
1. open your project
2. go to **Settings**
3. go to **Environment Variables**
4. add any of these:

### Gemini
- `GEMINI_API_KEY` = your key
- `GEMINI_MODEL` = `gemini-3.5-flash`

### Grok
- `XAI_API_KEY` = your key
- `XAI_MODEL` = `grok-4`

Then redeploy.

---

# PART 4 — If you want free AI later
If you want a **free local AI model**, that is easier on a laptop than Android.
For now, skip that part.

Best beginner path:
- deploy first
- test the app first
- add Gemini/Grok later

---

# What “success” looks like
When Glyphix is deployed successfully, you should be able to:
- open the app link on your Android phone
- tap around the interface
- import files
- create files
- preview HTML
- use chat modes
- later connect Gemini and Grok

---

# If deployment fails
Check these 4 things:
1. the repo contains `package.json`
2. the repo contains `app/`, `components/`, and `lib/`
3. Vercel imported the correct repo
4. environment variables were typed correctly

---

# Simplest recommendation
If you are fully new, do this in order:
1. create GitHub account
2. create Vercel account
3. upload Glyphix to GitHub
4. deploy to Vercel
5. open the link on Android
6. add Gemini and Grok later

---

# If you want my next help
After this, the best next request to ask me is:

**“Give me the exact GitHub + Vercel steps like I am a total beginner.”**

Or:

**“Help me connect Gemini and Grok keys safely.”**
