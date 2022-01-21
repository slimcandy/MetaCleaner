import { ChangeEvent, useState, useEffect, useCallback, useRef } from 'react'
import { IFormProps } from './types'
import { readFile } from './utils'

const Form = (props: IFormProps): JSX.Element => {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const uploadFileRef = useRef<HTMLInputElement>(null)

  const uploadFile = (
    event: ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLFormElement>
  ) => {
    if (!formRef?.current) {
      return setError('No form found')
    }
    props.setLoadingData(true)
    event.preventDefault()
    const data = new FormData(formRef?.current)
    const file = data.get('file') as File

    if (!file) {
      return setError('No file attached')
    }
    return setFile(file)
  }

  const fetchFileCallback = useCallback(async () => {
    if (!file) {
      return
    }
    const arrayBufferFile = await readFile(file)
    if (!arrayBufferFile) {
      return setError('No file converted')
    }

    return fetch(`${document.location.origin}/.netlify/functions/upload`, {
      method: 'POST',
      body: JSON.stringify({
        imageBase64: arrayBufferFile,
      }),
    })
      .then((response) => response.json())
      .then(props.onChange)
      .catch((error) => {
        setError(String(error))
      })
      .finally(() => props.setLoadingData(false))
  }, [file, props])

  useEffect(() => {
    fetchFileCallback()

    return () => setFile(null)
  }, [fetchFileCallback])

  useEffect(() => {
    !props.isFileReadyToDownload && uploadFileRef.current?.focus()
  }, [props.isFileReadyToDownload])

  return (
    <form
      className='lead mb-1 mb-sm-2 mb-md-3 mb-lg-4'
      method='POST'
      encType='multipart/form-data'
      onSubmit={uploadFile}
      action='/'
      ref={formRef}
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
          onChange={uploadFile}
          title='Choose an image to automatically remove metadata.'
          disabled={props.loading}
          accept='image/jpeg'
          required
          ref={uploadFileRef}
        />
        {error && <div className='invalid-feedback'>{error}</div>}
      </div>
      <button type='submit' className='btn btn-primary btn-lg visually-hidden'>
        Upload image
      </button>
    </form>
  )
}

export default Form
