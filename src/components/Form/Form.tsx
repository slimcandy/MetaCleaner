import { ChangeEvent, useState, useEffect, useRef } from 'react'
import { IFormProps } from './types'

const Form = (props: IFormProps): JSX.Element => {
  const [errors, setErrors] = useState<string[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  const uploadFileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (
    event: ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLFormElement>
  ) => {
    props.setLoadingData(true)
    event.preventDefault()

    if (!formRef?.current) {
      return setErrors([...errors, 'No form found'])
    }
    if (!uploadFileRef?.current) {
      return setErrors([...errors, 'No file field found'])
    }

    return fetch(
      `${document.location.origin}/.netlify/functions/submission-created`,
      {
        body: new FormData(formRef?.current),
        method: 'POST',
        headers: {},
      }
    )
      .then((response) => response.json())
      .then(props.onChange)
      .catch((error) => {
        console.error(error)
        setErrors([...errors, 'Server:' + String(error)])
        uploadFileRef.current?.setCustomValidity(error)
      })
      .finally(() => props.setLoadingData(false))
  }

  useEffect(() => {
    !props.isFileReadyToDownload && uploadFileRef.current?.focus()
  }, [props.isFileReadyToDownload])

  return (
    <form
      className='lead mb-1 mb-sm-2 mb-md-3 mb-lg-4'
      method='POST'
      encType='multipart/form-data'
      onSubmit={handleSubmit}
      action='/'
      ref={formRef}
      name='upload-form'
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
          onChange={handleSubmit}
          title='Choose an image to automatically remove metadata.'
          disabled={props.loading}
          accept='image/jpeg'
          required
          ref={uploadFileRef}
        />
        {errors.map((error) => (
          <small className='form-text' key={error}>
            {error}
          </small>
        ))}
        <div className='invalid-feedback'>test</div>
      </div>
      <button
        type='submit'
        className='btn btn-primary btn-lg visually-hidden'
        disabled={props.loading}
      >
        Upload image
      </button>
    </form>
  )
}

export default Form
