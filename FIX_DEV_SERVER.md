# Fix: "vite: command not found" Error

## ✅ Fixed!

I've updated your `package.json` to use `npx vite` instead of just `vite`. This ensures it works even if vite isn't in your PATH.

## 🚀 How to Start the Server

Now run:
```bash
npm run dev
```

This should work now!

## 📍 What You Should See

After running `npm run dev`, you should see:
```
VITE v5.4.21  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## 🎯 Next Steps

1. **Open browser**: Go to `http://localhost:5173/admin`
2. **Login as admin**: Use an email with "admin" in it
3. **Click "Projects" tab**: First tab at the top
4. **Look for "Import CSV" button**: Top right, next to "Create Project"

## 🔧 If Still Having Issues

If `npm run dev` still doesn't work, try:

```bash
# Option 1: Use npx directly
npx vite

# Option 2: Check node version
node --version  # Should be v14+ 

# Option 3: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

The server should start successfully now! 🎉
