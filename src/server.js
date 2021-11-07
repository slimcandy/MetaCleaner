const express = require('express')
const serverless = require('serverless-http')
const path = require('path')
const multer = require('multer')
const cors = require('cors')
const { ExiftoolProcess } = require('node-exiftool')

const EXIFTOOL_ARGS_REMOVE_EXIF = [
  'charset filename=UTF8',
  'overwrite_original',
]

const PORT = process.env.PORT ?? 3001
const app = express()
const upload = multer({ dest: 'temp/' })
const EXIFTOOL_PATH = path.resolve('./resources/exiftool')
const router = express.Router()

app.use(cors())
app.use('/download', express.static('temp'))
app.use('/', express.static('../client/build'))

router.post('/upload', upload.single('file'), (req, res, next) => {
  try {
    if (req.file) {
      const exiftoolProcessWriting = new ExiftoolProcess(EXIFTOOL_PATH)
      const exiftoolProcessReading1 = new ExiftoolProcess(EXIFTOOL_PATH)
      const exiftoolProcessReading2 = new ExiftoolProcess(EXIFTOOL_PATH)

      const filename = String(req.file.originalname)
        .trim()
        .replace(/[^\w\.]/gi, '_')
        .toLowerCase()
      const responseData = {
        before: {},
        after: {},
        file: {
          name: filename,
          mimetype: String(req.file.mimetype),
          link: String(
            `${req.protocol}://${req.get('host')}/download/${filename}`
          ),
        },
      }

      EXIFTOOL_ARGS_REMOVE_EXIF.push(`filename=${filename}`)

      /**
       * First reading
       */
      exiftoolProcessReading1
        .open()
        // display pid
        .then((pid) =>
          console.log('Started exiftool first reading process %s', pid)
        )
        .then(() =>
          exiftoolProcessReading1.readMetadata(req.file.path, ['-File:all'])
        )
        .then((value) => {
          ;[responseData.before] = value?.data
        })
        .then(() => exiftoolProcessReading1.close())
        /**
         * Removing data
         */
        .then(() => exiftoolProcessWriting.open())
        // display pid
        .then((pid) => console.log('Started exiftool writing process %s', pid))
        .then(() =>
          exiftoolProcessWriting.writeMetadata(
            req.file.path,
            { all: '' },
            EXIFTOOL_ARGS_REMOVE_EXIF,
            false
          )
        )
        .then(console.log, console.error)
        .then(() => exiftoolProcessWriting.close())
        /**
         * Second reading
         */
        .then(() => exiftoolProcessReading2.open())
        // display pid
        .then((pid) =>
          console.log('Started exiftool second reading process %s', pid)
        )
        .then(() =>
          exiftoolProcessReading2.readMetadata(req.file.path, ['-File:all'])
        )
        .then((value) => {
          if (value?.data) {
            ;[responseData.after] = value?.data
          }
        })
        .then(() => exiftoolProcessReading2.close())
        .then(() =>
          res.send({
            status: true,
            message: 'File Uploaded!',
            data: responseData,
          })
        )
        .catch(console.error)
    } else {
      res.status(400).send({
        status: false,
        data: 'File Not Found :(',
      })
    }
  } catch (err) {
    res.status(500).send(err)
  }
})

router.get('/test', (req, res) => {
  res.json({
    hello: 'test!',
  })
})

// app.listen(PORT, () => {
//   console.log(`Server listening on ${PORT}`)
// })

app.use(`/.netlify/functions/server`, router)

module.exports = app
module.exports.handler = serverless(app)
