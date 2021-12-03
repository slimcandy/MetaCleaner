import { useState, useEffect } from 'react'
import { IDownloadBlockProps } from './types'
import { IMetaFileInfo } from '../../appTypes'

const downloadIcon = (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='16'
    height='16'
    fill='currentColor'
    className='bi bi-cloud-arrow-down-fill'
    viewBox='0 0 16 16'
  >
    <path d='M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 3.999 10.69 2 8 2zm2.354 6.854-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5a.5.5 0 0 1 1 0v3.793l1.146-1.147a.5.5 0 0 1 .708.708z' />
  </svg>
)

const shareIcon = (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='16'
    height='16'
    fill='currentColor'
    className='bi bi-share'
    viewBox='0 0 16 16'
  >
    <path d='M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z' />
  </svg>
)

const shareAction = (file: IMetaFileInfo): Promise<void> => {
  const navigatorHack: any = window.navigator
  return fetch(file.link)
    .then((response) => response.blob())
    .then((fileBlob) => {
      const fileToShare = new File([fileBlob], file.name, {
        type: file.mimetype,
      })
      return navigatorHack.share({ files: [fileToShare] })
    })
    .catch(console.error)
}

const DownloadBlock = (props: IDownloadBlockProps): JSX.Element => {
  const [canIShareFile, setCanIShareFile] = useState(false)
  useEffect(() => {
    const navigatorHack: any = window.navigator
    if (navigatorHack && navigatorHack.canShare) {
      setCanIShareFile(true)
    }
  }, [])

  if (!props.data) {
    return (
      <small className='form-text'>
        Error: cannot read the file. Please try again.
      </small>
    )
  }

  const exifNumberBefore = Object.keys(props.data.before).length
  const fileInfo = props.data.file

  if (props.data.file.name === '') {
    return <small className='form-text'>Download link appears here.</small>
  }
  if (exifNumberBefore === 0) {
    return <small className='form-text'>File already has no meta tags.</small>
  }
  return (
    <>
      <div className='d-flex flex-wrap align-content-center align-items-center justify-content-center'>
        {props.loading ? (
          <button
            className={`btn btn-primary btn-lg ${
              canIShareFile ? 'col-12 col-sm-6' : 'col-12'
            }`}
            disabled
          >
            <span
              className='spinner-border spinner-border-sm me-2'
              role='status'
              aria-hidden='true'
            ></span>
            Removing file meta-data…
          </button>
        ) : (
          <a
            href={fileInfo.link}
            title={fileInfo.name}
            className={`btn btn-primary btn-lg ${
              props.loading ? 'disabled' : ''
            } ${canIShareFile ? 'col-12 col-sm-6' : 'col-12'}`}
            type={fileInfo.mimetype}
          >
            {downloadIcon} download
          </a>
        )}
        {canIShareFile && !props.loading && (
          <button
            type='button'
            className='btn btn-light btn-lg mt-2 mt-sm-0 col-12 offset-sm-1 col-sm-5'
            onClick={() => shareAction(fileInfo)}
          >
            {shareIcon} share
          </button>
        )}
      </div>
    </>
  )
}

export default DownloadBlock
