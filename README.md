# Welcome to mapsearcher

A web application for exploring UK postcodes, districts and towns.

## Project info

**URL**: https://lovable.dev/projects/4cbbd2cc-b23c-4abd-8ff8-3527df150ad4

## Running this project

**Backend**

You will first need to build your `sqlite3` locations db from a file which you need locally.  You build the database as follows:
```
$ cd backend
$ cd python csv_to_sqlite.py -c locations.csv
...
Conversion complete! Database saved as: locations.db
Final row count in database: 1,999,624
```

Now fire up the backend:
```
$ python location_api.py
```

**Frontend**

To run the frontend which was entirely built with lovable.dev, make sure you have everything you need to run Vite, TypeScript, React, shadcn-ui and Tailwind locally:
```
$ cd ..
$ npm i
$ npm run dev

> vite_react_shadcn_ts@0.0.0 dev
> vite

Re-optimizing dependencies because lockfile has changed

  VITE v5.4.10  ready in 594 ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: http://192.168.0.190:8080/
  ➜  press h + enter to show help
```

Now go to http://localhost:8080/ in the browser:

![image](https://github.com/user-attachments/assets/57b52ae7-41c5-412d-a781-0d0788d96c89)

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4cbbd2cc-b23c-4abd-8ff8-3527df150ad4) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone git@github.com:malminhas/mapsearcher.git

# Step 2: Navigate to the project directory.
cd mapsearcher

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

The backend is built with .

- FastAPI
- uvicorn
- sqlite3


## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4cbbd2cc-b23c-4abd-8ff8-3527df150ad4) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
