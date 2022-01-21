const piexif = require('piexifjs')

exports.handler = async (event) => {
  const { imageBase64 } = JSON.parse(event.body)
  const cleanImage = piexif.remove(imageBase64)

  return {
    statusCode: 200,
    body: JSON.stringify({
      imageBase64: cleanImage,
    }),
  }
}
