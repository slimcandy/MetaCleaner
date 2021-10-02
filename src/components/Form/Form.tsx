import { ChangeEvent } from 'react'

const Form = () => {
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
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            console.log('onChange:', event.target.files)
          }
        />
      </div>
    </form>
  )
}

export default Form
