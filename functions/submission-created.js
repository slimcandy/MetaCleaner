const piexif = require('piexifjs')
const parser = require('lambda-multipart-parser')

exports.handler = async (event) => {
  const result = await parser.parse(event)
  if (result.files[0]?.content) {
    const { contentType, content, filename } = result.files[0]
    const base64Code = content.toString('base64')
    console.log(contentType)
    const imageBase64 = `data:${contentType};base64,${base64Code}`
    const cleanImage = piexif.remove(imageBase64)

    return {
      statusCode: 200,
      body: JSON.stringify({
        imageBase64: cleanImage,
        mime: contentType,
        name: filename,
      }),
    }
  } else {
    return {
      statusCode: 501,
      body: 'No image content found. Try another file.',
    }
  }
}
