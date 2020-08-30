const app = require('../src/app')
const knex = require('knex')
const supertest = require('supertest')
const {
  makeBookmarksArray,
  makeMaliciousBookmark,
} = require('./bookmarks.fixtures')
const { get } = require('../src/bookmarks/bookmarks-router')
const { expect } = require('chai')

describe('Bookmarks Endpoints', () => {
  let db
  let auth = { Authorization: `Bearer 910237e9-95fd-4ecf-b17b-4af6605a1f01` }

  before('make knex instance', () => {
    // set up test database
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => db('bookmarks').truncate())

  afterEach('cleanup', () => db('bookmarks').truncate())

  describe(`GET /api/bookmarks`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty array`, () => {
        return supertest(app).get('/api/bookmarks').set(auth).expect(200, [])
      })
    })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db.insert(testBookmarks).into('bookmarks')
      })

      it(`responds with 200 and all of the bookmarks`, () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set(auth)
          .expect(200, testBookmarks)
      })
    })

    context('Given an XSS attack bookmark', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

      beforeEach('insert malicious bookmark', () => {
        return db.insert([maliciousBookmark]).into('bookmarks')
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set(auth)
          .expect(200)
          .expect((res) => {
            expect(res.body[0].title).to.eql(expectedBookmark.title)
            expect(res.body[0].description).to.eql(expectedBookmark.description)
          })
      })
    })
  })

  describe(`POST /api/bookmarks`, () => {
    it(`creates bookmark, responds with 201 and the new bookmark`, () => {
      const bookmark = {
        title: 'title',
        url: 'www.myurl.com',
        description: 'this is a short description',
        rating: 4,
      }

      return supertest(app)
        .post('/api/bookmarks')
        .set(auth)
        .send(bookmark)
        .expect(201)
        .expect((res) => {
          expect(res.body.title).to.eql(bookmark.title)
          expect(res.body.url).to.eql(bookmark.url)
          expect(res.body.description).to.eql(bookmark.description)
          expect(res.body.rating).to.eql(bookmark.rating)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
        })
        .then((postRes) =>
          supertest(app)
            .get(`/api/bookmarks/${postRes.body.id}`)
            .set(auth)
            .expect(postRes.body)
        )
    })

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
          .post('/api/bookmarks')
          .set(auth)
          .send(newBookmark)
          .expect(400, {
            error: {
              message: `Missing ${field} in request body`,
            },
          })
      })
    })

    context('Given an XSS attack bookmark', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

      it('removes XSS attack content', () => {
        return supertest(app)
          .post('/api/bookmarks')
          .set(auth)
          .send(maliciousBookmark)
          .expect(201)
          .expect((res) => {
            expect(res.body.title).to.eql(expectedBookmark.title)
            expect(res.body.description).to.eql(expectedBookmark.description)
          })
      })
    })
  })

  describe(`GET /api/bookmarks/:id`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 404 and an error message`, () => {
        const id = 1
        return supertest(app)
          .get(`/api/bookmarks/${id}`)
          .set(auth)
          .expect(404, {
            error: {
              message: `Bookmark does not exist`,
            },
          })
      })
    })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()
      const id = 1

      beforeEach('insert bookmarks', () => {
        return db.insert(testBookmarks).into('bookmarks')
      })

      it(`responds with 200 and specified bookmark`, () => {
        return supertest(app)
          .get(`/api/bookmarks/${id}`)
          .set(auth)
          .expect(200, testBookmarks[id - 1])
      })
    })

    context('Given an XSS attack bookmark', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

      beforeEach('insert malicious bookmark', () => {
        return db.insert([maliciousBookmark]).into('bookmarks')
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/bookmarks/${maliciousBookmark.id}`)
          .set(auth)
          .expect(200)
          .expect((res) => {
            expect(res.body.title).to.eql(expectedBookmark.title)
            expect(res.body.description).to.eql(expectedBookmark.description)
          })
      })
    })
  })

  describe(`PATCH /api/bookmarks/:id`, () => {
    const id = 1
    const updatedContent = {
      title: 'this is the new title',
      rating: 1,
    }

    context('Given no bookmarks', () => {
      it(`responds with 404 and an error message`, () => {
        return supertest(app)
          .patch(`/api/bookmarks/${id}`)
          .set(auth)
          .send(updatedContent)
          .expect(404, {
            error: {
              message: `Bookmark does not exist`,
            },
          })
      })
    })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()
      const expectedBookmark = {
        ...testBookmarks[id - 1],
        ...updatedContent,
      }

      beforeEach('insert bookmarks', () => {
        return db.insert(testBookmarks).into('bookmarks')
      })

      it(`responds with 400 when no required fields supplied`, () => {
        return supertest(app)
          .patch(`/api/bookmarks/${id}`)
          .set(auth)
          .send({ irrelevantField: 'nothing of importance' })
          .expect(400, {
            error: {
              message: `Request body must contain either 'title', 'url', 'description' or 'rating'`,
            },
          })
      })

      it('responds with a 204 and no content when successful', () => {
        return supertest(app)
          .patch(`/api/bookmarks/${id}`)
          .set(auth)
          .send(updatedContent)
          .expect(204)
          .then((res) =>
            supertest(app)
              .get(`/api/bookmarks/${id}`)
              .set(auth)
              .expect(expectedBookmark)
          )
      })
    })

    context('Given an XSS attack bookmark update', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db.insert(testBookmarks).into('bookmarks')
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .patch(`/api/bookmarks/1`)
          .set(auth)
          .send({
            title: maliciousBookmark.title,
            description: maliciousBookmark.description,
          })
          .expect(204)
          .expect((res) =>
            supertest(app).get(`/api/bookmarks/1`).expect(expectedBookmark)
          )
      })
    })
  })

  describe(`DELETE /bookmarks/:id`, () => {
    const id = 1

    context('Given no bookmarks', () => {
      it(`responds with 404 and an error message`, () => {
        return supertest(app)
          .delete(`/api/bookmarks/${id}`)
          .set(auth)
          .expect(404, {
            error: {
              message: `Bookmark does not exist`,
            },
          })
      })
    })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()
      const expectedBookmarks = testBookmarks.filter(
        (bookmark) => bookmark.id !== id
      )

      beforeEach('insert bookmarks', () => {
        return db.insert(testBookmarks).into('bookmarks')
      })

      it('responds with a 204', () => {
        return supertest(app)
          .delete(`/api/bookmarks/${id}`)
          .set(auth)
          .expect(204)
          .then((res) =>
            supertest(app)
              .get(`/api/bookmarks`)
              .set(auth)
              .expect(expectedBookmarks)
          )
      })
    })
  })
})
