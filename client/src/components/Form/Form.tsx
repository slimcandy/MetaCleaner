import { ChangeEvent, useState, useEffect, useCallback, useRef } from 'react'
import { IFormProps } from './types'

const Form = (props: IFormProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = (
    event: ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    if (!fileInputRef?.current?.files) {
      return setError('No file attached')
    }
    return setFile(fileInputRef.current.files[0])
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
    <form
      className='lead mb-4'
      method='POST'
      encType='multipart/form-data'
      onSubmit={uploadFile}
    >
      <div>
        <label htmlFor='formFileLg' className='form-label visually-hidden'>
          File
        </label>
        <input
          className='form-control form-control-lg'
          id='formFileLg'
          type='file'
          name='file'
          ref={fileInputRef}
          onChange={uploadFile}
          title='Choose an image, video or PDF file to automatically remove metadata.'
          required
          autoFocus
        />
        {error && <div className='invalid-feedback'>{error}</div>}
      </div>
      <button type='submit' className='btn btn-primary btn-lg visually-hidden'>
        Upload file
      </button>
    </form>
  )
}

export default Form
