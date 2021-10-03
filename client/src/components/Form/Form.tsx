import { ChangeEvent, useState, useEffect, useCallback } from 'react'

const Form = () => {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<any>()

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
      .then((result) => console.log('result:', result))
      .catch((error) => {
        setError(String(error))
      })
  }, [file])

  useEffect(() => {
    fetchFile()

    return () => {
      setFile(null)
    }
  }, [fetchFile])

  return (
    <form className='lead mb-4'>
      <div>
        <label htmlFor='formFileLg' className='form-label'>
          Upload a file
        </label>
        <input
          className='form-control form-control-lg'
          id='formFileLg'
          type='file'
          onChange={uploadFile}
        />
        {error && <div className='invalid-feedback'>{error}</div>}
      </div>
    </form>
  )
}

export default Form
