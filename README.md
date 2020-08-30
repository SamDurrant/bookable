# Express Boilerplate!

This is a boilerplate project used for starting new projects!

## Set up

Complete the following steps to start a new project (NEW-PROJECT-NAME):

1. Clone this repository to your local machine `git clone BOILERPLATE-URL NEW-PROJECTS-NAME`
2. `cd` into the cloned repository
3. Make a fresh start of the git history for this project with `rm -rf .git && git init`
4. Install the node dependencies `npm install`
5. Move the example Environment file to `.env` that will be ignored by git and read by the express server `mv example.env .env`
6. Edit the contents of the `package.json` to use NEW-PROJECT-NAME instead of `"name": "express-boilerplate",`

## Scripts

Start the application `npm start`

Start nodemon for the application `npm run dev`

Run the tests `npm test`

## Deploying

When your new project is ready for deployment, add a new Heroku application with `heroku create`. This will make a new git remote called "heroku" and you can then `npm run deploy` which will push to this remote's master branch.

## Requirements

1. Make two new databases, bookmarks and bookmarks-test.
   `createdb -U librarian bookmarks`
   `createdb -U librarian bookmarks-test`
2. Write the first migration inside the bookmarks-server project that creates the table for bookmarks. Then use the migration to create the tables in both new databases.

- The table should contain fields for id, title, url, description and rating
- The description is the only optional field
- Choose suitable data types for each column
  `npm i postgrator-cli@3.2.0 -D`
  set up postgrator-config.js file
  `npm i pg`
  add scripts to package.json
  ```
  "migrate": "postgrator --config postgrator-config.js",
  "migrate:test": "env NODE_ENV=test npm run migrate"
  ```

3. Refactor the GET /bookmarks endpoint and tests. The endpoint should use the database tables.

- You'll need to wire up Knex into your server and tests.
  `npm i knex`
- Write a BookmarksService object in the bookmarks-server project that will support CRUD for bookmarks using Knex
- You should use fixtures in your tests for the GET /bookmarks and GET /bookmarks/:bookmark_id
- Write tests for how each endpoint behaves when the database is empty

4. Write seeding scripts to insert dummy bookmarks into the database tables so you can check that the refactored endpoints work when your server is running locally.
   seed the database
   `psql -U librarian -d bookmarks -f ./seeds/seed.bookmarks.sql`

5. Refactor your POST handler to support inserting bookmarks into the database.

- Refactor or implement the integration tests for POSTing bookmarks as well as making sure appropriate responses get sanitized. `npm i xss`
- You should also test that your POST /bookmarks endpoint validates each bookmark to have the required fields in valid formats. For example, rating should be a number between 1 and 5.

  ```
  const requiredFields = ['title', 'url', 'description', 'rating']

    requiredFields.forEach((field) => {
      const newBookmark = {
        title: 'Test new title',
        url: 'www.mytesturl.com',
        description: 'Test tiny description',
        rating: 4,
      }

      it(`responds with 400 and an error message when ${field} is missing`, () => {
        delete newBookmark[field]

        return supertest(app)
          .post('/bookmarks')
          .set(auth)
          .send(newBookmark)
          .expect(400, {
            error: {
              message: `Missing ${field} in request body`,
            },
          })
      })
    })
  ```

- If your POST endpoint responds with the newly created bookmark, make sure that appropriate fields get sanitized.

1. Refactor your DELETE handler to support removing bookmarks from the database.

- Refactor or implement the integration tests for DELETEing bookmarks as well as making sure the DELETE responds with a 404 when the bookmark doesn't exist.

7. Refactor your GET methods and tests to ensure that all bookmarks get sanitized.

#### add patch endpoint

1. Add an endpoint to support updating bookmarks using a PATCH request _DONE_

2. Ensure the Bookmarks API has a uniform RESTful interface. For example, are the endpoints consistently named? _DONE_

3. Update all of the endpoints to use the /api prefix _DONE_

4. Write integration tests for your PATCH request to ensure: _DONE_

- It requires the bookmark's ID to be supplied as a URL param
- It responds with a 204 and no content when successful
- It updates the bookmark in your database table
- It responds with a 400 when no values are supplied for any fields (title, url, description, rating)
- It allows partial updates, for example, only supplying a new title will only update the title for that item

5. Write the appropriate API code to make these tests pass _DONE_
