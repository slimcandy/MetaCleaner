import express from 'express'
import fileupload from 'express-fileupload'

const PORT = process.env.PORT || 3001

const app = express()

app.use(fileupload())

app.post('/upload', (req, res, next) => {
  try {
    const file = req.files.file
    if (file) {
      res.json(file)
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
