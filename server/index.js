import express from 'express'
import fileupload from 'express-fileupload'
import { execFile } from 'child_process'
import exiftool from 'node-exiftool'
import exiftoolBin from 'dist-exiftool'

const PORT = process.env.PORT || 3001

const app = express()

app.use(fileupload())

app.post('/upload', (req, res, next) => {
  try {
    const file = req.files.file
    if (file) {
      // res.json(file)
      const exiftoolProcess = new exiftool.ExiftoolProcess(exiftoolBin)

      exiftoolProcess
        .open()
        // display pid
        .then((pid) => console.log('Started exiftool process %s', pid))
        .then(() => exiftoolProcess.readMetadata('image.jpeg', ['-File:all']))
        .then((data, error) => {
          if (error && error.length > 0) {
            res.json(`error: ${error}`)
          }
          res.json(data)
        })
        .catch((error) => {
          res.json(`error: ${error}`)
        })
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

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`)
})
