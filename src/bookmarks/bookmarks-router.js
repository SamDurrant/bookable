const express = require('express')
const path = require('path')
const logger = require('../logger')
const xss = require('xss')
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

const serializeBookmark = (bookmark) => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: xss(bookmark.url),
  description: xss(bookmark.description),
  rating: bookmark.rating,
})

bookmarksRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')

    BookmarksService.getAllBookmarks(knexInstance)
      .then((bookmarks) => {
        res.json(bookmarks.map(serializeBookmark))
      })
      .catch(next)
  })
  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body
    const newBookmark = { title, url, description, rating }

    // check values are valid
    for (const [key, value] of Object.entries(newBookmark)) {
      if (value == null) {
        logger.error(`${key} is required`)
        return res.status(400).json({
          error: {
            message: `Missing ${key} in request body`,
          },
        })
      }
    }

    const knexInstance = req.app.get('db')
    BookmarksService.insertBookmark(knexInstance, newBookmark)
      .then((bookmark) => {
        // log bookmark creation and send response
        logger.info(`Bookmark with id ${bookmark.id} created`)
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
          .json(serializeBookmark(bookmark))
      })
      .catch(next)
  })

bookmarksRouter
  .route('/:id')
  .all((req, res, next) => {
    const { id } = req.params
    const knexInstance = req.app.get('db')

    BookmarksService.getById(knexInstance, id)
      .then((bookmark) => {
        if (!bookmark) {
          // if no bookmark, log and return error
          logger.error(`Bookmark with id ${id} does not exist`)
          return res.status(404).json({
            error: {
              message: `Bookmark does not exist`,
            },
          })
        }
        // return bookmark
        res.bookmark = bookmark

        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(serializeBookmark(res.bookmark))
  })
  .patch((req, res, next) => {
    const { title, url, description, rating } = req.body
    const bookmarkToUpdate = { title, url, description, rating }

    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean)
      .length
    if (numberOfValues == 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain either 'title', 'url', 'description' or 'rating'`,
        },
      })
    }

    BookmarksService.updateBookmark(
      req.app.get('db'),
      res.bookmark.id,
      bookmarkToUpdate
    )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })
  .delete((req, res, next) => {
    const { id } = req.params
    const knexInstance = req.app.get('db')

    BookmarksService.deleteBookmark(knexInstance, id)
      .then(() => {
        // return success status with no data
        logger.info(`Bookmark with id ${id} deleted`)
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = bookmarksRouter
