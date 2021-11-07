import { ChangeEvent, useState, useEffect, useCallback } from 'react'
import { IFormProps } from './types'

const Form = (props: IFormProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = (event: ChangeEvent<HTMLInputElement>) => {
    event.preventDefault()
    if (!event.target.files || !event.target.files[0]) {
      return setError('No file attached')
    }
    return setFile(event.target.files[0])
  }

  const fetchFile = useCallback(async () => {
    if (!file) {
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    fetch('/upload', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then(props.onChange)
      .catch((error) => {
        setError(String(error))
      })
  }, [file, props.onChange])

  useEffect(() => {
    fetchFile()

    return () => setFile(null)
  }, [fetchFile])

  return (
    <form className='lead mb-4' method='POST' encType='multipart/form-data'>
      <div>
        <label htmlFor='formFileLg' className='form-label visually-hidden'>
          File
        </label>
        <input
          className='form-control form-control-lg'
          id='formFileLg'
          type='file'
          onChange={uploadFile}
          required
          autoFocus
        />
        <div className='form-text'>
          Upload image, video or PDF file to automatically remove metadata.
        </div>
        {error && <div className='invalid-feedback'>{error}</div>}
      </div>
    </form>
  )
}

export default Form
