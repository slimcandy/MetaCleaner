import express from 'express'
import { execFile } from 'child_process'
import exiftool from 'node-exiftool'
import exiftoolBin from 'dist-exiftool'
import multer from 'multer'
import cors from 'cors'

const PORT = process.env.PORT ?? 3001
const app = express()
const upload = multer({ dest: 'temp/' })

// app.use(cors())

app.post('/upload', upload.single('file'), (req, res, next) => {
  try {
    if (req.file) {
      // const exiftoolProcess = new exiftool.ExiftoolProcess(exiftoolBin)
      console.log(req.file)
      // exiftoolProcess
      //   .open()
      //   // display pid
      //   .then((pid) => console.log('Started exiftool process %s', pid))
      //   .then(() => exiftoolProcess.readMetadata(req.file.filename, ['-File:all']))
      //   .then((data, error) => {
      //     if (error && error.length > 0) {
      //       res.json(`error: ${error}`)
      //     }
      //     res.json(data)
      //   })
      //   .catch((error) => {
      //     res.json(`error: ${error}`)
      //   })

      res.send({
        status: true,
        message: 'File Uploaded!',
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
